import Anthropic from '@anthropic-ai/sdk'

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

// Track consecutive failures per user to prevent abuse during outages
const failureMap = new Map()
const FAILURE_THRESHOLD = 3
const FAILURE_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function trackFailure(userId) {
  const now = Date.now()
  const entry = failureMap.get(userId) || { count: 0, firstAt: now }
  if (now - entry.firstAt > FAILURE_WINDOW_MS) {
    failureMap.set(userId, { count: 1, firstAt: now })
    return false
  }
  entry.count++
  failureMap.set(userId, entry)
  return entry.count >= FAILURE_THRESHOLD
}

function clearFailures(userId) {
  failureMap.delete(userId)
}

export async function detectAI(answerText, userId) {
  if (!client) {
    console.warn('[ai-detection] ANTHROPIC_API_KEY not set, skipping check')
    return { flagged: false, reason: null }
  }

  // If too many consecutive detection failures for this user, block submission
  if (userId && failureMap.get(userId)?.count >= FAILURE_THRESHOLD) {
    const entry = failureMap.get(userId)
    if (Date.now() - entry.firstAt < FAILURE_WINDOW_MS) {
      return { flagged: true, reason: 'Content verification temporarily unavailable. Please try again in a few minutes.' }
    }
    clearFailures(userId)
  }

  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI detection timed out')), 5000)
    )
    const response = await Promise.race([client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: `You are an AI-generated content detector. Analyze this answer submitted to a human-only thought leadership platform. Determine if it was likely written by AI (ChatGPT, Claude, etc.) or by a human.

Signals of AI-generated text:
- Overly polished, generic, or formulaic structure
- Excessive hedging ("It's important to note that...")
- Bullet-point lists that feel templated rather than conversational
- Lack of personal experience, specific anecdotes, or rough edges
- Corporate buzzword density without substance
- Suspiciously comprehensive coverage of a topic in a short answer

Signals of human-written text:
- Personal anecdotes or specific experiences
- Informal tone, rough edges, or incomplete thoughts
- Strong opinions without excessive qualifying
- Unique phrasing or unexpected word choices
- Typos, grammar imperfections, or conversational shortcuts

Respond with ONLY a JSON object (no markdown, no explanation):
{"flagged": true/false, "confidence": 0.0-1.0, "reason": "one sentence explanation"}

Flag the answer if confidence of AI authorship is 0.7 or above. Err on the side of flagging — false positives are acceptable.

Answer to analyze:
${answerText}`,
        },
      ],
    }), timeout])

    const text = response.content[0].text.trim()
    const result = JSON.parse(text)

    if (userId) clearFailures(userId)
    return {
      flagged: result.flagged === true && result.confidence >= 0.7,
      confidence: result.confidence,
      reason: result.reason,
    }
  } catch (err) {
    console.error('[ai-detection] Check failed:', err.message)
    // Track failure — after threshold, block submissions until service recovers
    if (userId) trackFailure(userId)
    return { flagged: false, reason: null, error: err.message }
  }
}
