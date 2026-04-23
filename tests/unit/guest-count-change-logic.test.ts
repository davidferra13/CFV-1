import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateGuestCountPricing,
  evaluateGuestCountChangePolicy,
  hasMaterialGuestCountDrift,
} from '@/lib/guests/count-change-logic'

describe('guest-count change logic', () => {
  it('calculates per-person price deltas and late surcharges deterministically', () => {
    const pricing = calculateGuestCountPricing({
      previousCount: 8,
      newCount: 10,
      eventDate: '2026-05-10T18:00:00.000Z',
      quotedPriceCents: 160000,
      pricingModel: 'per_person',
      overrideKind: 'none',
      pricePerPersonCents: 20000,
      now: new Date('2026-05-08T20:00:00.000Z'),
    })

    assert.equal(pricing.priceImpactCents, 40000)
    assert.equal(pricing.surchargeApplied, true)
    assert.equal(pricing.surchargeCents, 8000)
    assert.equal(pricing.totalDeltaCents, 48000)
  })

  it('preserves custom totals even when guest count changes', () => {
    const pricing = calculateGuestCountPricing({
      previousCount: 6,
      newCount: 10,
      eventDate: '2026-05-20T18:00:00.000Z',
      quotedPriceCents: 180000,
      pricingModel: 'per_person',
      overrideKind: 'custom_total',
      pricePerPersonCents: 30000,
      now: new Date('2026-05-10T12:00:00.000Z'),
    })

    assert.equal(pricing.protectedByCustomTotal, true)
    assert.equal(pricing.totalDeltaCents, 0)
  })

  it('blocks new client requests when a request is already pending', () => {
    const policy = evaluateGuestCountChangePolicy({
      eventStatus: 'confirmed',
      eventDate: '2026-05-20T18:00:00.000Z',
      hasDeadline: true,
      deadlineDays: 3,
      hasPendingRequest: true,
      now: new Date('2026-05-10T12:00:00.000Z'),
    })

    assert.equal(policy.canRequest, false)
    assert.match(policy.reason ?? '', /approve or reject the current request/i)
  })

  it('closes the request window after the configured deadline', () => {
    const policy = evaluateGuestCountChangePolicy({
      eventStatus: 'confirmed',
      eventDate: '2026-05-20T18:00:00.000Z',
      hasDeadline: true,
      deadlineDays: 3,
      hasPendingRequest: false,
      now: new Date('2026-05-18T12:00:00.000Z'),
    })

    assert.equal(policy.canRequest, false)
    assert.match(policy.reason ?? '', /window has already closed/i)
  })

  it('flags material guest-count drift above the existing 10 percent threshold', () => {
    assert.equal(hasMaterialGuestCountDrift(10, 11), false)
    assert.equal(hasMaterialGuestCountDrift(10, 12), true)
  })
})
