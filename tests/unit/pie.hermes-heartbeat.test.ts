import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: { execute: vi.fn() },
}))

import { db } from '@/lib/db'
import { isHermesAlive, getHermesStatus } from '@/lib/pricing/hermes-heartbeat'

const mockExecute = vi.mocked(db.execute)

describe('hermes-heartbeat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isHermesAlive', () => {
    it('returns true when heartbeat within 5 minutes', async () => {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
      mockExecute.mockResolvedValueOnce([
        { timestamp: twoMinutesAgo, status: 'alive', queue_depth: 0 },
      ] as any)

      expect(await isHermesAlive()).toBe(true)
    })

    it('returns false when no heartbeat exists', async () => {
      mockExecute.mockResolvedValueOnce([] as any)
      expect(await isHermesAlive()).toBe(false)
    })

    it('returns false when heartbeat older than 5 minutes', async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      mockExecute.mockResolvedValueOnce([
        { timestamp: tenMinutesAgo, status: 'alive', queue_depth: 0 },
      ] as any)

      expect(await isHermesAlive()).toBe(false)
    })

    it('returns false when heartbeat status is error', async () => {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
      mockExecute.mockResolvedValueOnce([
        { timestamp: oneMinuteAgo, status: 'error', queue_depth: 0 },
      ] as any)

      expect(await isHermesAlive()).toBe(false)
    })
  })

  describe('getHermesStatus', () => {
    it('returns full status object when heartbeat exists', async () => {
      const now = new Date().toISOString()
      mockExecute.mockResolvedValueOnce([
        {
          timestamp: now,
          status: 'alive',
          queue_depth: 3,
          current_skill: 'pie-ratchet',
          last_action: 'Fixed 12 coverage gaps',
          error_count: 0,
        },
      ] as any)

      const status = await getHermesStatus()
      expect(status).toEqual({
        alive: true,
        mode: 'hermes',
        lastHeartbeat: now,
        queueDepth: 3,
        currentSkill: 'pie-ratchet',
        lastAction: 'Fixed 12 coverage gaps',
        errorCount: 0,
      })
    })

    it('returns fallback mode when no heartbeat', async () => {
      mockExecute.mockResolvedValueOnce([] as any)

      const status = await getHermesStatus()
      expect(status).toEqual({
        alive: false,
        mode: 'fallback',
        lastHeartbeat: null,
        queueDepth: 0,
        currentSkill: null,
        lastAction: null,
        errorCount: 0,
      })
    })
  })
})
