// Persistent rate limiter using Supabase
// Falls back to in-memory for non-DB contexts (e.g., API routes without user)

import { createAdminClient } from '@/lib/supabase/admin'

const memStore = new Map()

// In-memory fallback (used when DB is unavailable or for non-user keys)
function memoryRateLimit({ key, limit, windowMs }) {
  const now = Date.now()
  const entry = memStore.get(key)

  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + windowMs })
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

export async function rateLimit({ key, limit, windowMs }) {
  try {
    const admin = createAdminClient()
    const windowStart = new Date(Date.now() - windowMs).toISOString()

    // Count recent entries in the rate_limits table
    const { count, error: countError } = await admin
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('key', key)
      .gte('created_at', windowStart)

    if (countError) {
      // Fall back to memory if DB query fails
      return memoryRateLimit({ key, limit, windowMs })
    }

    if ((count ?? 0) >= limit) {
      return {
        success: false,
        remaining: 0,
        retryAfter: Math.ceil(windowMs / 1000),
      }
    }

    // Record this request
    await admin.from('rate_limits').insert({ key })

    return { success: true, remaining: limit - (count ?? 0) - 1 }
  } catch {
    // Fall back to memory on any error
    return memoryRateLimit({ key, limit, windowMs })
  }
}
