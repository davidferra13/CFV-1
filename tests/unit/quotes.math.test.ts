/**
 * Unit tests for Quote Math
 *
 * Tests the calculation logic used in quote creation and pricing.
 * Pure math — no DB required.
 *
 * Run: npm run test:unit
 * Run critical only: npm run test:critical
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// ─── Pure computation helpers (mirroring quote logic) ──────────────────────

type PricingModel = 'per_person' | 'flat_rate' | 'custom'

function computeQuoteTotal(
  pricingModel: PricingModel,
  pricePerPersonCents: number | null,
  guestCount: number | null,
  flatTotalCents: number | null
): number {
  if (pricingModel === 'per_person' && pricePerPersonCents && guestCount) {
    return pricePerPersonCents * guestCount
  }
  if (pricingModel === 'flat_rate' && flatTotalCents) {
    return flatTotalCents
  }
  return flatTotalCents ?? 0
}

function computeDepositAmount(
  totalCents: number,
  depositPercentage: number | null,
  depositAmountCents: number | null
): number {
  // Explicit amount takes priority over percentage
  if (depositAmountCents != null && depositAmountCents > 0) {
    return depositAmountCents
  }
  if (depositPercentage != null && depositPercentage > 0) {
    return Math.round(totalCents * (depositPercentage / 100))
  }
  return 0
}

// ─── Test Group C: Quote Math ──────────────────────────────────────────────

describe('C1: Per-person pricing = price_per_person × guest_count', () => {
  it('computes correctly for 8 guests at $75/person', () => {
    const total = computeQuoteTotal('per_person', 7500, 8, null)
    assert.equal(total, 60000) // 7500 × 8
  })

  it('computes correctly for 1 guest', () => {
    const total = computeQuoteTotal('per_person', 15000, 1, null)
    assert.equal(total, 15000)
  })

  it('computes correctly for large party', () => {
    const total = computeQuoteTotal('per_person', 5000, 50, null)
    assert.equal(total, 250000) // $2,500
  })
})

describe('C2: Deposit amount from percentage', () => {
  it('25% of $600 = $150', () => {
    const deposit = computeDepositAmount(60000, 25, null)
    assert.equal(deposit, 15000)
  })

  it('50% of $1000 = $500', () => {
    const deposit = computeDepositAmount(100000, 50, null)
    assert.equal(deposit, 50000)
  })

  it('explicit amount overrides percentage', () => {
    const deposit = computeDepositAmount(60000, 25, 20000)
    assert.equal(deposit, 20000) // Uses explicit $200, not 25% ($150)
  })

  it('handles rounding for odd percentages', () => {
    const deposit = computeDepositAmount(33333, 33, null)
    // 33333 * 0.33 = 10999.89 → rounds to 10999
    assert.equal(deposit, Math.round(33333 * 0.33))
    assert.equal(Number.isInteger(deposit), true)
  })
})

describe('C3: Flat rate pricing uses total directly', () => {
  it('ignores guest count for flat rate', () => {
    const total = computeQuoteTotal('flat_rate', null, 8, 50000)
    assert.equal(total, 50000)
  })

  it('flat rate with per_person fields still uses flat total', () => {
    const total = computeQuoteTotal('flat_rate', 7500, 8, 50000)
    assert.equal(total, 50000)
  })
})

describe('C4: Custom pricing falls back to flat total', () => {
  it('uses provided total for custom pricing', () => {
    const total = computeQuoteTotal('custom', null, null, 75000)
    assert.equal(total, 75000)
  })

  it('returns 0 when no total provided', () => {
    const total = computeQuoteTotal('custom', null, null, null)
    assert.equal(total, 0)
  })
})

describe('C5: Deposit edge cases', () => {
  it('0% deposit returns 0', () => {
    const deposit = computeDepositAmount(50000, 0, null)
    assert.equal(deposit, 0)
  })

  it('100% deposit = full amount', () => {
    const deposit = computeDepositAmount(50000, 100, null)
    assert.equal(deposit, 50000)
  })

  it('no deposit requirement returns 0', () => {
    const deposit = computeDepositAmount(50000, null, null)
    assert.equal(deposit, 0)
  })
})
