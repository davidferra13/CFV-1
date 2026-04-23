import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { getDateConflictResultWithTimeout } from '@/lib/availability/conflict-check-client'

describe('getDateConflictResultWithTimeout', () => {
  it('returns conflict warnings when the lookup resolves in time', async () => {
    const result = await getDateConflictResultWithTimeout({
      date: '2026-07-04',
      check: async () => ({
        hasManualBlock: false,
        existingEvents: [{ id: 'evt_1', title: 'Dinner', status: 'confirmed' }],
        isHardBlocked: false,
        warnings: ['Existing event(s) on this date: "Dinner" (confirmed).'],
      }),
      timeoutMs: 50,
    })

    assert.deepEqual(result?.warnings, ['Existing event(s) on this date: "Dinner" (confirmed).'])
  })

  it('fails open when the lookup rejects', async () => {
    const result = await getDateConflictResultWithTimeout({
      date: '2026-07-04',
      check: async () => {
        throw new Error('availability lookup failed')
      },
      timeoutMs: 50,
    })

    assert.equal(result, null)
  })

  it('fails open when the lookup exceeds the timeout budget', async () => {
    const result = await getDateConflictResultWithTimeout({
      date: '2026-07-04',
      check: async () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                hasManualBlock: true,
                existingEvents: [],
                isHardBlocked: false,
                warnings: ['late warning'],
              }),
            50
          )
        }),
      timeoutMs: 5,
    })

    assert.equal(result, null)
  })
})
