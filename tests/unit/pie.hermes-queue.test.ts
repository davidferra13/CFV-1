import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: { execute: vi.fn() },
}))

import { db } from '@/lib/db'
import {
  enqueueHermesEvent,
  getPendingQueueDepth,
  type HermesEventType,
} from '@/lib/pricing/hermes-queue'

const mockExecute = vi.mocked(db.execute)

describe('hermes-queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('enqueueHermesEvent', () => {
    it('inserts event with correct type and payload', async () => {
      mockExecute.mockResolvedValueOnce([] as any)

      await enqueueHermesEvent('menu.created', {
        menuId: 'menu_123',
        tenantId: 'chef_abc',
        ingredientIds: ['ing_1', 'ing_2'],
      })

      expect(mockExecute).toHaveBeenCalledTimes(1)
    })

    it('sets priority 1 for reactive events', async () => {
      mockExecute.mockResolvedValueOnce([] as any)

      await enqueueHermesEvent('price.overridden', {
        ingredientId: 'ing_1',
        oldPrice: 450,
        newPrice: 500,
      })

      expect(mockExecute).toHaveBeenCalledTimes(1)
    })

    it('sets priority 2 for scheduled events', async () => {
      mockExecute.mockResolvedValueOnce([] as any)

      await enqueueHermesEvent('ingredient.added', {
        ingredientId: 'ing_new',
        name: 'Dragon Fruit',
      })

      expect(mockExecute).toHaveBeenCalledTimes(1)
    })
  })

  describe('getPendingQueueDepth', () => {
    it('returns count of pending items', async () => {
      mockExecute.mockResolvedValueOnce([{ count: 7 }] as any)

      const depth = await getPendingQueueDepth()
      expect(depth).toBe(7)
    })

    it('returns 0 when no pending items', async () => {
      mockExecute.mockResolvedValueOnce([{ count: 0 }] as any)

      const depth = await getPendingQueueDepth()
      expect(depth).toBe(0)
    })
  })
})
