import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Anthropic SDK — no API key in tests
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    constructor() {
      this.messages = {
        create: vi.fn(),
      }
    }
  },
}))

// Set API key so the client initializes (with mock)
vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')

const { detectAI } = await import('@/lib/aiDetection')

describe('detectAI', () => {
  it('returns unflagged when API call fails (fails open)', async () => {
    // The mock client's create will reject by default
    const result = await detectAI('Some human-written text about leadership', 'user-123')
    expect(result.flagged).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('returns result structure with expected fields', async () => {
    const result = await detectAI('Test text', 'user-456')
    expect(result).toHaveProperty('flagged')
    expect(result).toHaveProperty('reason')
  })
})

describe('detectAI failure tracking', () => {
  it('blocks after threshold consecutive failures', async () => {
    const userId = `threshold-test-${Date.now()}`

    // Trigger 3 failures (threshold)
    await detectAI('text1', userId)
    await detectAI('text2', userId)
    await detectAI('text3', userId)

    // 4th call should be blocked due to failure tracking
    const result = await detectAI('text4', userId)
    expect(result.flagged).toBe(true)
    expect(result.reason).toContain('temporarily unavailable')
  })
})
