import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// Test the pricing logic that would be in guest count changes
// These are pure function tests for the calculation logic

function calculatePriceImpact(
  quotedPriceCents: number,
  previousCount: number,
  newCount: number,
  pricingModel: string
): number {
  if (pricingModel !== 'per_person' || previousCount === 0) return 0
  const pricePerPerson = Math.round(quotedPriceCents / previousCount)
  return pricePerPerson * (newCount - previousCount)
}

function calculateSurcharge(
  priceImpactCents: number,
  hoursUntilEvent: number,
  newCount: number,
  previousCount: number,
  cutoffHours: number = 72,
  surchargePercentage: number = 20
): number {
  if (hoursUntilEvent > cutoffHours) return 0
  if (hoursUntilEvent <= 0) return 0
  if (newCount <= previousCount) return 0

  return Math.round(Math.abs(priceImpactCents) * (surchargePercentage / 100))
}

describe('calculatePriceImpact', () => {
  it('calculates increase for per-person pricing', () => {
    // $150/person, 10 guests = $1500, increase to 12 = $1800, impact = $300
    const impact = calculatePriceImpact(150000, 10, 12, 'per_person')
    assert.strictEqual(impact, 30000) // $300
  })

  it('calculates decrease for per-person pricing', () => {
    const impact = calculatePriceImpact(150000, 10, 8, 'per_person')
    assert.strictEqual(impact, -30000) // -$300
  })

  it('returns 0 for flat rate pricing', () => {
    const impact = calculatePriceImpact(200000, 10, 15, 'flat_rate')
    assert.strictEqual(impact, 0)
  })

  it('returns 0 when previous count is 0', () => {
    const impact = calculatePriceImpact(150000, 0, 10, 'per_person')
    assert.strictEqual(impact, 0)
  })

  it('handles single guest changes', () => {
    // $120/person, 6 guests = $720, add 1 = $840, impact = $120
    const impact = calculatePriceImpact(72000, 6, 7, 'per_person')
    assert.strictEqual(impact, 12000) // $120
  })

  it('rounds per-person price to avoid floating point issues', () => {
    // $1000 / 3 guests = $333.33... per person
    const impact = calculatePriceImpact(100000, 3, 4, 'per_person')
    // 333 * 1 = 333 (rounded)
    assert.strictEqual(impact, 33333)
  })
})

describe('calculateSurcharge', () => {
  it('applies 20% surcharge within 72 hours for increases', () => {
    const surcharge = calculateSurcharge(30000, 48, 12, 10)
    assert.strictEqual(surcharge, 6000) // 20% of $300
  })

  it('no surcharge beyond cutoff window', () => {
    const surcharge = calculateSurcharge(30000, 100, 12, 10)
    assert.strictEqual(surcharge, 0)
  })

  it('no surcharge for guest count decrease', () => {
    const surcharge = calculateSurcharge(-30000, 48, 8, 10)
    assert.strictEqual(surcharge, 0)
  })

  it('no surcharge for past events', () => {
    const surcharge = calculateSurcharge(30000, -5, 12, 10)
    assert.strictEqual(surcharge, 0)
  })

  it('handles custom surcharge percentage', () => {
    const surcharge = calculateSurcharge(30000, 48, 12, 10, 72, 30)
    assert.strictEqual(surcharge, 9000) // 30% of $300
  })

  it('handles custom cutoff hours', () => {
    const surcharge = calculateSurcharge(30000, 48, 12, 10, 24)
    assert.strictEqual(surcharge, 0) // 48 > 24 cutoff
  })
})
