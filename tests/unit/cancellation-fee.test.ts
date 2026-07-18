/**
 * Unit tests for cancellation / reschedule fee resolution.
 *
 * Guards the real shipped helper (lib/events/cancellation-fee), not a mirror.
 * The load-bearing case is the last group: a failure to read the paid total
 * must propagate, never resolve to a silent $0 fee.
 *
 * Run: npm run test:unit
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveFeeCents, daysBetween, type FeeTier } from '../../lib/events/cancellation-fee'

const flatTier: FeeTier = {
  days_before_min: 0,
  days_before_max: 7,
  fee_type: 'flat',
  fee_value: 25000,
}
// 5000 basis points = 50%
const percentTier: FeeTier = {
  days_before_min: 0,
  days_before_max: 7,
  fee_type: 'percent',
  fee_value: 5000,
}

const neverCalled = async (): Promise<number> => {
  throw new Error('getPaidCents must not be called for this tier')
}

describe('resolveFeeCents: genuine-zero paths (never read payments)', () => {
  it('no tiers returns 0', async () => {
    assert.equal(await resolveFeeCents([], 3, neverCalled), 0)
    assert.equal(await resolveFeeCents(null, 3, neverCalled), 0)
    assert.equal(await resolveFeeCents(undefined, 3, neverCalled), 0)
  })

  it('no matching tier returns 0', async () => {
    assert.equal(await resolveFeeCents([flatTier], 30, neverCalled), 0)
  })

  it('flat tier returns fee_value', async () => {
    assert.equal(await resolveFeeCents([flatTier], 3, neverCalled), 25000)
  })
})

describe('resolveFeeCents: percent path', () => {
  it('50% of $3,000 paid = $1,500', async () => {
    assert.equal(await resolveFeeCents([percentTier], 3, async () => 300000), 150000)
  })

  it('no payments yet is a legitimate $0, not an error', async () => {
    assert.equal(await resolveFeeCents([percentTier], 3, async () => 0), 0)
  })

  it('rounds to integer cents', async () => {
    const fee = await resolveFeeCents([{ ...percentTier, fee_value: 3333 }], 3, async () => 12345)
    assert.equal(fee, Math.round(12345 * 0.3333))
    assert.equal(Number.isInteger(fee), true)
  })
})

describe('resolveFeeCents: the bug fix (failure must not read as $0)', () => {
  it('propagates a payment-read error instead of returning 0', async () => {
    await assert.rejects(
      () =>
        resolveFeeCents([percentTier], 3, async () => {
          throw new Error('ledger unavailable')
        }),
      /ledger unavailable/
    )
  })
})

describe('daysBetween', () => {
  it('counts whole days from now to a future date', () => {
    assert.equal(daysBetween(new Date('2026-01-01T00:00:00Z'), new Date('2026-01-08T00:00:00Z')), 7)
  })
})
