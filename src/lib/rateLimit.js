// Simple in-memory rate limiter for serverless (per-instance)
// Good enough for beta scale. For production scale, use Redis/Upstash.

const store = new Map()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now - entry.resetAt > 0) store.delete(key)
  }
}, 5 * 60 * 1000)

export function rateLimit({ key, limit, windowMs }) {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: limit - 1 }
  }

  if (entry.count >= limit) {
    return {
      success: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    }
  }

  entry.count++
  return { success: true, remaining: limit - entry.count }
}
