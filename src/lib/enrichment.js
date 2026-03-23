import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'

const MODEL = 'claude-sonnet-4-5-20250514'

let anthropic
function getClient() {
  if (!anthropic) {
    anthropic = new Anthropic()
  }
  return anthropic
}

async function callLLM(prompt, maxTokens = 1200) {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })
  return response.content[0].text
}

function parseJSON(text) {
  const cleaned = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()
  return JSON.parse(cleaned)
}

// Sanitize user content before embedding in LLM prompts
function sanitizeForPrompt(text) {
  if (!text) return ''
  return text
    .replace(/\$\{/g, '$ {')     // prevent template literal injection
    .replace(/```/g, '` ` `')     // prevent code fence injection
}

/**
 * Full knowledge decomposition of an answer.
 * Extracts: summary, sentiment, quality_score, tags, claims, frameworks, evidence.
 * Logs enrichment run and change records.
 * Fire-and-forget — errors are logged, never thrown.
 */
export async function enrichAnswer(answerId) {
  const startedAt = new Date().toISOString()
  const admin = createAdminClient()
  let enrichmentRunId

  try {
    // Skip if enrichment already in progress or completed recently (5 min cooldown)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: existing } = await admin.from('enrichment_runs')
      .select('id, status')
      .eq('target_type', 'answer')
      .eq('target_id', answerId)
      .gte('created_at', fiveMinAgo)
      .in('status', ['started', 'completed'])
      .limit(1)
    if (existing?.length > 0) return

    // Log enrichment run start BEFORE clearing — ensures we have a record even if crash occurs
    const { data: run } = await admin.from('enrichment_runs').insert({
      target_type: 'answer',
      target_id: answerId,
      enrichment_type: 'full',
      model: MODEL,
      status: 'started',
      started_at: startedAt,
    }).select('id').single()
    enrichmentRunId = run?.id

    // Clear old claims/frameworks/evidence before re-extracting
    await admin.from('evidence').delete().eq('source_answer_id', answerId)
    await admin.from('claims').delete().eq('source_answer_id', answerId)
    await admin.from('frameworks').delete().eq('source_answer_id', answerId)

    // Fetch answer with context
    const { data: answer } = await admin
      .from('answers')
      .select('id, body, word_count, like_count, view_count, featured_at, expert_id, question:questions(id, body, category, question_topics(topic:topics(id, name, slug)))')
      .eq('id', answerId)
      .single()

    if (!answer) {
      await markRunFailed(admin, enrichmentRunId, 'Answer not found')
      return
    }

    const topicNames = answer.question.question_topics?.map(qt => qt.topic?.name).filter(Boolean) || []

    // Single LLM call to decompose the answer
    const prompt = `You are decomposing an expert's answer into structured knowledge objects.

Question: ${JSON.stringify(answer.question.body)}
Category: ${answer.question.category || 'General'}
Topics: ${topicNames.join(', ') || 'None'}
Answer (${answer.word_count} words):
${JSON.stringify(answer.body)}

Return ONLY valid JSON with this exact structure:
{
  "summary": "1-2 sentence summary of the core insight",
  "sentiment": "optimistic|cautious|contrarian|neutral|critical",
  "tags": ["tag1", "tag2", "tag3"],
  "claims": [
    {
      "text": "The specific claim being made",
      "claim_type": "causal|predictive|prescriptive|descriptive|evaluative|definitional|comparative|experiential",
      "specificity": "universal|contextual|personal",
      "domain": "lowercase topic area",
      "confidence": 0.85
    }
  ],
  "frameworks": [
    {
      "name": "Short name for the mental model",
      "summary": "One sentence describing the framework",
      "components": ["component1", "component2"],
      "use_case": "When to apply this framework",
      "domain": "lowercase topic area"
    }
  ],
  "evidence": [
    {
      "text": "The evidence statement from the answer",
      "evidence_type": "personal_experience|case_study|data_point|expert_opinion|analogy|counterexample|citation",
      "strength": "anecdotal|observational|systematic|quantitative",
      "supports_claim_text": "The claim text this evidence supports (must match a claim above)"
    }
  ]
}

Rules:
- claims: Extract 2-5 discrete, falsifiable assertions. Each should stand alone.
  - causal: X causes Y. predictive: X predicts Y. prescriptive: you should do X.
  - descriptive: X is the case. evaluative: X is good/bad. comparative: X > Y.
  - experiential: in my experience, X. definitional: X means Y.
  - universal: applies broadly. contextual: applies in certain situations. personal: specific to this expert.
- frameworks: Extract 0-2 reusable mental models or decision processes. Only include if the expert describes a structured approach, not just an opinion. Return empty array if none.
- evidence: Extract 1-4 supporting observations, stories, or data points. Link each to the claim it supports.
- tags: 2-5 lowercase topic labels
- summary: The core takeaway, not a description of the answer
- sentiment: The overall tone toward the topic discussed`

    const text = await callLLM(prompt)
    const result = parseJSON(text)

    // --- Update answer fields ---
    const wordScore = Math.min(answer.word_count / 500, 1) * 0.3
    const likeScore = Math.min(answer.like_count / 20, 1) * 0.5
    const featuredBonus = answer.featured_at ? 0.2 : 0
    const qualityScore = Math.round((wordScore + likeScore + featuredBonus) * 100) / 100

    const keyClaims = (result.claims || []).map(c => c.text)

    await admin.from('answers').update({
      summary: result.summary,
      key_claims: keyClaims,
      sentiment: result.sentiment,
      quality_score: Math.min(qualityScore, 1),
      enrichment_version: 1,
    }).eq('id', answerId)

    // Log field changes
    await logChange(admin, 'answer', answerId, 'summary', null, result.summary)
    await logChange(admin, 'answer', answerId, 'sentiment', null, result.sentiment)

    // --- Upsert tags ---
    if (result.tags?.length) {
      const tagRows = result.tags.slice(0, 5).map(tag => ({
        answer_id: answerId,
        tag: tag.toLowerCase().replace(/\s+/g, '-'),
        source: 'llm',
        confidence: 0.85,
      }))
      await admin.from('answer_tags').upsert(tagRows, { onConflict: 'answer_id,tag' })
    }

    // --- Insert claims ---
    const claimIdMap = {} // claim text → claim UUID, for linking evidence
    let claimsInserted = 0

    for (const claim of (result.claims || [])) {
      const { data: inserted, error } = await admin.from('claims').insert({
        text: claim.text,
        normalized_text: claim.text.toLowerCase().trim(),
        claim_type: claim.claim_type,
        domain: claim.domain || null,
        specificity: claim.specificity || 'contextual',
        source_answer_id: answerId,
        source_expert_id: answer.expert_id,
        extraction_method: 'llm_extracted',
        extraction_model: MODEL,
        confidence: claim.confidence || 0.8,
        tags: result.tags || [],
      }).select('id').single()

      if (!error && inserted) {
        claimIdMap[claim.text] = inserted.id
        claimsInserted++
      }
    }

    // --- Insert frameworks ---
    let frameworksInserted = 0

    for (const fw of (result.frameworks || [])) {
      const { error } = await admin.from('frameworks').insert({
        name: fw.name,
        summary: fw.summary,
        description: null,
        components: fw.components || [],
        use_case: fw.use_case || null,
        domain: fw.domain || null,
        source_answer_id: answerId,
        source_expert_id: answer.expert_id,
        extraction_method: 'llm_extracted',
        extraction_model: MODEL,
        confidence: 0.8,
        tags: result.tags || [],
      })

      if (!error) frameworksInserted++
    }

    // --- Insert evidence ---
    let evidenceInserted = 0

    for (const ev of (result.evidence || [])) {
      // Link to the claim it supports
      const supportedClaimId = ev.supports_claim_text
        ? claimIdMap[ev.supports_claim_text] || null
        : null

      const { error } = await admin.from('evidence').insert({
        text: ev.text,
        evidence_type: ev.evidence_type,
        strength: ev.strength || 'anecdotal',
        supports_claim_id: supportedClaimId,
        source_answer_id: answerId,
        source_expert_id: answer.expert_id,
        extraction_method: 'llm_extracted',
        extraction_model: MODEL,
        confidence: 0.75,
      })

      if (!error) evidenceInserted++
    }

    // --- Update expertise edges ---
    const topics = answer.question.question_topics || []
    for (const qt of topics) {
      if (!qt.topic?.id) continue

      // Upsert: increment evidence count, update quality
      const { data: existing } = await admin
        .from('expertise_edges')
        .select('id, evidence_count, avg_quality_score')
        .eq('expert_id', answer.expert_id)
        .eq('topic_id', qt.topic.id)
        .single()

      if (existing) {
        const newCount = existing.evidence_count + 1
        const newAvg = existing.avg_quality_score
          ? (existing.avg_quality_score * existing.evidence_count + qualityScore) / newCount
          : qualityScore
        const strength = newCount >= 4 ? 'authoritative' : newCount >= 2 ? 'strong' : 'knowledgeable'

        await admin.from('expertise_edges').update({
          evidence_count: newCount,
          avg_quality_score: Math.round(newAvg * 100) / 100,
          strength,
          last_answered_at: answer.created_at || new Date().toISOString(),
        }).eq('id', existing.id)
      } else {
        await admin.from('expertise_edges').insert({
          expert_id: answer.expert_id,
          topic_id: qt.topic.id,
          strength: 'mentioned',
          evidence_count: 1,
          avg_quality_score: qualityScore,
          last_answered_at: answer.created_at || new Date().toISOString(),
        })
      }
    }

    // --- Update expert last_active_at ---
    await admin.from('profiles').update({
      last_active_at: new Date().toISOString(),
    }).eq('id', answer.expert_id)

    // --- Complete enrichment run ---
    await admin.from('enrichment_runs').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      results_summary: {
        claims_extracted: claimsInserted,
        frameworks_found: frameworksInserted,
        evidence_found: evidenceInserted,
        tags_applied: result.tags?.length || 0,
        summary_generated: true,
        sentiment_classified: true,
      },
    }).eq('id', enrichmentRunId)

    console.log(`[enrichment] Answer ${answerId.slice(0, 8)}: ${claimsInserted} claims, ${frameworksInserted} frameworks, ${evidenceInserted} evidence`)

  } catch (err) {
    console.error('[enrichment] Answer enrichment failed:', err.message)
    if (enrichmentRunId) {
      await markRunFailed(admin, enrichmentRunId, err.message)
    }
  }
}

/**
 * Enrich a profile with seniority_level, industry, expertise_areas.
 * Fire-and-forget.
 */
export async function enrichProfile(profileId) {
  const admin = createAdminClient()

  try {
    const { data: profile } = await admin
      .from('profiles')
      .select('id, display_name, handle, headline, organization, bio')
      .eq('id', profileId)
      .single()

    if (!profile || (!profile.bio && !profile.headline)) return

    const prompt = `Analyze this professional's profile.

Name: ${JSON.stringify(profile.display_name || '')}
Headline: ${JSON.stringify(profile.headline || 'None')}
Organization: ${JSON.stringify(profile.organization || 'None')}
Bio: ${JSON.stringify(profile.bio || 'None')}

Return ONLY valid JSON:
{
  "summary": "1 sentence describing who they are and what they focus on",
  "seniority_level": "individual_contributor|manager|director|vp|c_suite|founder|investor|advisor",
  "industry": "technology|finance|healthcare|education|media|consulting|government|nonprofit|other",
  "expertise_areas": ["area1", "area2", "area3"]
}`

    const text = await callLLM(prompt, 300)
    const result = parseJSON(text)

    await admin.from('profiles').update({
      summary: result.summary || null,
      seniority_level: result.seniority_level,
      industry: result.industry,
      expertise_areas: result.expertise_areas || [],
      canonical_name: profile.display_name.toLowerCase(),
      enrichment_version: 1,
    }).eq('id', profileId)

    // Log enrichment run
    await admin.from('enrichment_runs').insert({
      target_type: 'profile',
      target_id: profileId,
      enrichment_type: 'classification',
      model: MODEL,
      status: 'completed',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      results_summary: {
        summary_generated: !!result.summary,
        seniority_classified: true,
        industry_classified: true,
        expertise_areas_count: result.expertise_areas?.length || 0,
      },
    })

  } catch (err) {
    console.error('[enrichment] Profile enrichment failed:', err.message)
  }
}

// --- Helpers ---

async function logChange(admin, targetType, targetId, field, oldValue, newValue) {
  try {
    await admin.from('change_records').insert({
      target_type: targetType,
      target_id: targetId,
      field_path: field,
      change_type: 'enriched',
      old_value: oldValue,
      new_value: typeof newValue === 'string' ? newValue : JSON.stringify(newValue),
      changer_type: 'enrichment_pipeline',
      reason: `Enrichment via ${MODEL}`,
    })
  } catch {
    // Non-critical — don't fail enrichment over audit logging
  }
}

async function markRunFailed(admin, runId, errorMessage) {
  try {
    await admin.from('enrichment_runs').update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: errorMessage,
    }).eq('id', runId)
  } catch {
    // Non-critical
  }
}
