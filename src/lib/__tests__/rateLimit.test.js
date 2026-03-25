import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the admin client so the DB path throws, forcing in-memory fallback
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => { throw new Error('No DB in tests') },
}))

const { rateLimit } = await import('@/lib/rateLimit')

describe('rateLimit (in-memory fallback)', () => {
  beforeEach(() => {
    // Reset module state between tests by clearing the memStore
    // Since memStore is module-level, we test behavior across calls
  })

  it('allows requests within the limit', async () => {
    const key = `test-allow-${Date.now()}`
    const result = await rateLimit({ key, limit: 3, windowMs: 60000 })
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(2)
  })

  it('tracks count across multiple requests', async () => {
    const key = `test-count-${Date.now()}`
    const opts = { key, limit: 3, windowMs: 60000 }

    const r1 = await rateLimit(opts)
    const r2 = await rateLimit(opts)
    const r3 = await rateLimit(opts)
    const r4 = await rateLimit(opts)

    expect(r1.success).toBe(true)
    expect(r2.success).toBe(true)
    expect(r3.success).toBe(true)
    expect(r4.success).toBe(false)
    expect(r4.remaining).toBe(0)
    expect(r4.retryAfter).toBeGreaterThan(0)
  })

  it('resets after window expires', async () => {
    const key = `test-expire-${Date.now()}`
    // Use a 1ms window so it expires immediately
    const opts = { key, limit: 1, windowMs: 1 }

    const r1 = await rateLimit(opts)
    expect(r1.success).toBe(true)

    // Wait for window to expire
    await new Promise(r => setTimeout(r, 5))

    const r2 = await rateLimit(opts)
    expect(r2.success).toBe(true)
  })

  it('uses different counters for different keys', async () => {
    const keyA = `test-keyA-${Date.now()}`
    const keyB = `test-keyB-${Date.now()}`

    await rateLimit({ key: keyA, limit: 1, windowMs: 60000 })
    const rA = await rateLimit({ key: keyA, limit: 1, windowMs: 60000 })
    const rB = await rateLimit({ key: keyB, limit: 1, windowMs: 60000 })

    expect(rA.success).toBe(false)
    expect(rB.success).toBe(true)
  })
})
