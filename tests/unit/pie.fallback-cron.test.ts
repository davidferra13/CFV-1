import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: { execute: vi.fn() },
}))
vi.mock('@/lib/pricing/hermes-heartbeat', () => ({
  isHermesAlive: vi.fn(),
}))
vi.mock('@/lib/pricing/hermes-actions', () => ({
  logHermesAction: vi.fn(),
}))
vi.mock('@/lib/pricing/auto-expansion-engine', () => ({
  runAutoExpansion: vi.fn().mockResolvedValue({ expanded: 5 }),
}))
vi.mock('@/lib/pricing/government-feed', () => ({
  pullBlsPrices: vi.fn().mockResolvedValue({ pulled: 10 }),
}))
vi.mock('@/lib/pricing/fuzzy-match-engine', () => ({
  matchNakedIngredients: vi.fn().mockResolvedValue({ matched: 3 }),
}))
vi.mock('@/lib/pricing/trend-intelligence', () => ({
  runTrendAnalysis: vi.fn().mockResolvedValue({ analyzed: 100 }),
}))

import { isHermesAlive } from '@/lib/pricing/hermes-heartbeat'
import { logHermesAction } from '@/lib/pricing/hermes-actions'
import { runFallbackTask } from '@/lib/pricing/fallback-cron'

const mockIsAlive = vi.mocked(isHermesAlive)
const mockLogAction = vi.mocked(logHermesAction)

describe('fallback-cron', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips execution when Hermes is alive', async () => {
    mockIsAlive.mockResolvedValue(true)

    const result = await runFallbackTask('freshness')
    expect(result).toEqual({ skipped: true, reason: 'hermes_alive' })
    expect(mockLogAction).not.toHaveBeenCalled()
  })

  it('runs freshness task when Hermes is down', async () => {
    mockIsAlive.mockResolvedValue(false)
    const { db } = await import('@/lib/db')
    vi.mocked(db.execute).mockResolvedValue([] as any)

    const result = await runFallbackTask('freshness')
    expect(result.skipped).toBe(false)
    expect(mockLogAction).toHaveBeenCalledWith(
      expect.objectContaining({
        skill: 'pie-acquire',
        source: 'fallback',
      })
    )
  })

  it('runs alert task when Hermes is down', async () => {
    mockIsAlive.mockResolvedValue(false)

    const result = await runFallbackTask('alert')
    expect(result.skipped).toBe(false)
    expect(mockLogAction).toHaveBeenCalledWith(
      expect.objectContaining({
        skill: 'pie-alert',
        source: 'fallback',
      })
    )
  })

  it('runs ratchet task when Hermes is down', async () => {
    mockIsAlive.mockResolvedValue(false)

    const result = await runFallbackTask('ratchet')
    expect(result.skipped).toBe(false)
    expect(mockLogAction).toHaveBeenCalledWith(
      expect.objectContaining({
        skill: 'pie-ratchet',
        source: 'fallback',
      })
    )
  })
})
