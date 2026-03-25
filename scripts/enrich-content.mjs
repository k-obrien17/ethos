#!/usr/bin/env node

// LLM enrichment pipeline for Ethos content — Knowledge Graph v2
// Usage: node --env-file=.env.local scripts/enrich-content.mjs [--entity answers|questions|profiles|comments] [--limit 50] [--force]
//
// Requires: ANTHROPIC_API_KEY in .env.local
// Enriches un-processed records (enrichment_version = 0) unless --force re-enriches all.
// Answers are fully decomposed into claims, frameworks, and evidence.

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const anthropic = new Anthropic()

const MODEL = 'claude-sonnet-4-5-20250514'
const args = process.argv.slice(2)
const entity = args.find((_, i) => args[i - 1] === '--entity') || 'all'
const limit = parseInt(args.find((_, i) => args[i - 1] === '--limit') || '50', 10)
const force = args.includes('--force')

// ============================================================
// Helpers
// ============================================================

async function callLLM(prompt, maxTokens = 1200) {
  const response = await anthropic.messages.create({
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function logEnrichmentRun(targetType, targetId, enrichmentType, status, results, errorMsg) {
  await supabase.from('enrichment_runs').insert({
    target_type: targetType,
    target_id: targetId,
    enrichment_type: enrichmentType,
    model: MODEL,
    status,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    results_summary: results || null,
    error_message: errorMsg || null,
  })
}

// ============================================================
// Enrich answers — full knowledge decomposition
// ============================================================

async function enrichAnswers() {
  console.log('\n--- Enriching answers (knowledge decomposition) ---')

  let query = supabase
    .from('answers')
    .select('id, body, word_count, like_count, view_count, featured_at, expert_id, question:questions(id, body, category, question_topics(topic:topics(id, name, slug)))')
    .is('hidden_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!force) {
    query = query.eq('enrichment_version', 0)
  }

  const { data: answers, error } = await query
  if (error) { console.error('Fetch error:', error.message); return }
  if (!answers.length) { console.log('No answers to enrich.'); return }

  console.log(`Processing ${answers.length} answers...`)
  let totalClaims = 0, totalFrameworks = 0, totalEvidence = 0

  for (const answer of answers) {
    try {
      const topicNames = answer.question.question_topics?.map(qt => qt.topic?.name).filter(Boolean) || []

      const prompt = `You are decomposing an expert's answer into structured knowledge objects.

Question: ${answer.question.body}
Category: ${answer.question.category || 'General'}
Topics: ${topicNames.join(', ') || 'None'}
Answer (${answer.word_count} words):
${answer.body}

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
- frameworks: Extract 0-2 reusable mental models. Only if the expert describes a structured approach. Empty array if none.
- evidence: Extract 1-4 supporting observations, stories, or data points. Link each to the claim it supports.
- tags: 2-5 lowercase topic labels
- summary: The core takeaway, not a description
- sentiment: The overall tone toward the topic`

      const text = await callLLM(prompt)
      const result = parseJSON(text)

      // Update answer fields
      const wordScore = Math.min(answer.word_count / 500, 1) * 0.3
      const likeScore = Math.min(answer.like_count / 20, 1) * 0.5
      const featuredBonus = answer.featured_at ? 0.2 : 0
      const qualityScore = Math.round((wordScore + likeScore + featuredBonus) * 100) / 100
      const keyClaims = (result.claims || []).map(c => c.text)

      await supabase.from('answers').update({
        summary: result.summary,
        key_claims: keyClaims,
        sentiment: result.sentiment,
        quality_score: Math.min(qualityScore, 1),
        enrichment_version: 1,
      }).eq('id', answer.id)

      // Upsert tags
      if (result.tags?.length) {
        const tagRows = result.tags.slice(0, 5).map(tag => ({
          answer_id: answer.id,
          tag: tag.toLowerCase().replace(/\s+/g, '-'),
          source: 'llm',
          confidence: 0.85,
        }))
        await supabase.from('answer_tags').upsert(tagRows, { onConflict: 'answer_id,tag' })
      }

      // If force mode, clear old claims/frameworks/evidence before inserting new
      if (force) {
        await supabase.from('evidence').delete().eq('source_answer_id', answer.id)
        await supabase.from('claims').delete().eq('source_answer_id', answer.id)
        await supabase.from('frameworks').delete().eq('source_answer_id', answer.id)
      }

      // Insert claims
      const claimIdMap = {}
      for (const claim of (result.claims || [])) {
        const { data: inserted, error: claimErr } = await supabase.from('claims').insert({
          text: claim.text,
          normalized_text: claim.text.toLowerCase().trim(),
          claim_type: claim.claim_type,
          domain: claim.domain || null,
          specificity: claim.specificity || 'contextual',
          source_answer_id: answer.id,
          source_expert_id: answer.expert_id,
          extraction_method: 'llm_extracted',
          extraction_model: MODEL,
          confidence: claim.confidence || 0.8,
          tags: result.tags || [],
        }).select('id').single()

        if (!claimErr && inserted) {
          claimIdMap[claim.text] = inserted.id
          totalClaims++
        }
      }

      // Insert frameworks
      for (const fw of (result.frameworks || [])) {
        const { error: fwErr } = await supabase.from('frameworks').insert({
          name: fw.name,
          summary: fw.summary,
          components: fw.components || [],
          use_case: fw.use_case || null,
          domain: fw.domain || null,
          source_answer_id: answer.id,
          source_expert_id: answer.expert_id,
          extraction_method: 'llm_extracted',
          extraction_model: MODEL,
          confidence: 0.8,
          tags: result.tags || [],
        })
        if (!fwErr) totalFrameworks++
      }

      // Insert evidence
      for (const ev of (result.evidence || [])) {
        const supportedClaimId = ev.supports_claim_text ? claimIdMap[ev.supports_claim_text] || null : null
        const { error: evErr } = await supabase.from('evidence').insert({
          text: ev.text,
          evidence_type: ev.evidence_type,
          strength: ev.strength || 'anecdotal',
          supports_claim_id: supportedClaimId,
          source_answer_id: answer.id,
          source_expert_id: answer.expert_id,
          extraction_method: 'llm_extracted',
          extraction_model: MODEL,
          confidence: 0.75,
        })
        if (!evErr) totalEvidence++
      }

      // Update expertise edges
      const topics = answer.question.question_topics || []
      for (const qt of topics) {
        if (!qt.topic?.id) continue
        const { data: existing } = await supabase
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
          await supabase.from('expertise_edges').update({
            evidence_count: newCount,
            avg_quality_score: Math.round(newAvg * 100) / 100,
            strength,
            last_answered_at: new Date().toISOString(),
          }).eq('id', existing.id)
        } else {
          await supabase.from('expertise_edges').insert({
            expert_id: answer.expert_id,
            topic_id: qt.topic.id,
            strength: 'mentioned',
            evidence_count: 1,
            avg_quality_score: qualityScore,
            last_answered_at: new Date().toISOString(),
          })
        }
      }

      // Log run
      await logEnrichmentRun('answer', answer.id, 'full', 'completed', {
        claims_extracted: Object.keys(claimIdMap).length,
        frameworks_found: (result.frameworks || []).length,
        evidence_found: (result.evidence || []).length,
        tags_applied: result.tags?.length || 0,
      })

      const c = Object.keys(claimIdMap).length
      const f = (result.frameworks || []).length
      const e = (result.evidence || []).length
      console.log(`  + ${answer.id.slice(0, 8)} — ${c} claims, ${f} frameworks, ${e} evidence`)
      await sleep(500)

    } catch (err) {
      console.error(`  x ${answer.id.slice(0, 8)} — ${err.message}`)
      await logEnrichmentRun('answer', answer.id, 'full', 'failed', null, err.message)
    }
  }

  console.log(`  Totals: ${totalClaims} claims, ${totalFrameworks} frameworks, ${totalEvidence} evidence`)
}

// ============================================================
// Enrich questions
// ============================================================

async function enrichQuestions() {
  console.log('\n--- Enriching questions ---')

  let query = supabase
    .from('questions')
    .select('id, body, category, status')
    .in('status', ['published', 'scheduled'])
    .order('publish_date', { ascending: false })
    .limit(limit)

  if (!force) {
    query = query.eq('enrichment_version', 0)
  }

  const { data: questions, error } = await query
  if (error) { console.error('Fetch error:', error.message); return }
  if (!questions.length) { console.log('No questions to enrich.'); return }

  console.log(`Processing ${questions.length} questions...`)

  for (const question of questions) {
    try {
      const prompt = `Analyze this question from a professional Q&A platform.

Question: ${question.body}
Category: ${question.category || 'General'}

Return ONLY valid JSON:
{
  "summary": "1-2 sentence plain-language description of what this question is really asking",
  "intent_type": "opinion|experience|advice|prediction|reflection|framework|contrarian",
  "difficulty": "accessible|intermediate|expert"
}

- summary: Describe the underlying intent, not just restate the question
- intent_type: opinion (stance), experience (stories), advice (guidance), prediction (future), reflection (introspection), framework (mental model), contrarian (challenges norms)
- difficulty: accessible (anyone), intermediate (domain experience), expert (deep expertise)`

      const text = await callLLM(prompt, 300)
      const result = parseJSON(text)

      await supabase.from('questions').update({
        summary: result.summary,
        intent_type: result.intent_type,
        difficulty: result.difficulty,
        enrichment_version: 1,
      }).eq('id', question.id)

      await logEnrichmentRun('question', question.id, 'classification', 'completed', result)

      console.log(`  + ${question.id.slice(0, 8)} — ${result.intent_type} / ${result.difficulty}`)
      await sleep(500)
    } catch (err) {
      console.error(`  x ${question.id.slice(0, 8)} — ${err.message}`)
    }
  }
}

// ============================================================
// Enrich profiles
// ============================================================

async function enrichProfiles() {
  console.log('\n--- Enriching profiles ---')

  let query = supabase
    .from('profiles')
    .select('id, display_name, handle, headline, organization, bio')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!force) {
    query = query.eq('enrichment_version', 0)
  }

  const { data: profiles, error } = await query
  if (error) { console.error('Fetch error:', error.message); return }
  if (!profiles.length) { console.log('No profiles to enrich.'); return }

  console.log(`Processing ${profiles.length} profiles...`)

  for (const profile of profiles) {
    if (!profile.bio && !profile.headline) {
      console.log(`  ~ ${profile.handle} — skipping (no bio/headline)`)
      continue
    }

    try {
      const prompt = `Analyze this professional's profile.

Name: ${profile.display_name}
Headline: ${profile.headline || 'None'}
Organization: ${profile.organization || 'None'}
Bio: ${profile.bio || 'None'}

Return ONLY valid JSON:
{
  "summary": "1 sentence describing who they are and what they focus on",
  "seniority_level": "individual_contributor|manager|director|vp|c_suite|founder|investor|advisor",
  "industry": "technology|finance|healthcare|education|media|consulting|government|nonprofit|other",
  "expertise_areas": ["area1", "area2", "area3"]
}`

      const text = await callLLM(prompt, 300)
      const result = parseJSON(text)

      await supabase.from('profiles').update({
        summary: result.summary || null,
        seniority_level: result.seniority_level,
        industry: result.industry,
        expertise_areas: result.expertise_areas || [],
        canonical_name: profile.display_name.toLowerCase(),
        enrichment_version: 1,
      }).eq('id', profile.id)

      await logEnrichmentRun('profile', profile.id, 'classification', 'completed', result)

      console.log(`  + ${profile.handle} — ${result.seniority_level} / ${result.industry}`)
      await sleep(500)
    } catch (err) {
      console.error(`  x ${profile.handle} — ${err.message}`)
    }
  }
}

// ============================================================
// Enrich comments
// ============================================================

async function enrichComments() {
  console.log('\n--- Enriching comments ---')

  let query = supabase
    .from('answer_comments')
    .select('id, body, answer:answers(body)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!force) {
    query = query.eq('enrichment_version', 0)
  }

  const { data: comments, error } = await query
  if (error) { console.error('Fetch error:', error.message); return }
  if (!comments.length) { console.log('No comments to enrich.'); return }

  console.log(`Processing ${comments.length} comments...`)

  for (const comment of comments) {
    try {
      const answerSnippet = comment.answer?.body?.slice(0, 200) || 'Unknown answer'

      const prompt = `Classify this comment on an expert's answer.

Answer excerpt: ${answerSnippet}...
Comment: ${comment.body}

Return ONLY valid JSON:
{
  "comment_type": "agreement|disagreement|question|addition|experience|general",
  "sentiment": "positive|negative|neutral|mixed"
}`

      const text = await callLLM(prompt, 100)
      const result = parseJSON(text)

      await supabase.from('answer_comments').update({
        comment_type: result.comment_type,
        sentiment: result.sentiment,
        enrichment_version: 1,
      }).eq('id', comment.id)

      console.log(`  + ${comment.id.slice(0, 8)} — ${result.comment_type} / ${result.sentiment}`)
      await sleep(500)
    } catch (err) {
      console.error(`  x ${comment.id.slice(0, 8)} — ${err.message}`)
    }
  }
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log(`Ethos Knowledge Graph Enrichment Pipeline v2`)
  console.log(`Model: ${MODEL}`)
  console.log(`Entity: ${entity} | Limit: ${limit} | Force: ${force}`)

  const targets = entity === 'all'
    ? ['answers', 'questions', 'profiles', 'comments']
    : [entity]

  for (const target of targets) {
    switch (target) {
      case 'answers': await enrichAnswers(); break
      case 'questions': await enrichQuestions(); break
      case 'profiles': await enrichProfiles(); break
      case 'comments': await enrichComments(); break
      default: console.error(`Unknown entity: ${target}`)
    }
  }

  console.log('\nDone.')
}

main().catch(console.error)
