/**
 * Unit tests for Pricing Input Validation
 *
 * Tests the validatePricingInput() pure function from lib/pricing/compute.ts.
 * This is P2 — wrong pricing = quoting clients incorrectly.
 *
 * We import the actual function since it's a pure function with no
 * database or server action dependencies. Only its async sibling
 * computePricing() needs the holiday cache (which we don't test here).
 *
 * Run: npm run test:unit
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { validatePricingInput } from '../../lib/pricing/compute.js'

// ─────────────────────────────────────────────────────────────────────────────
// TESTS — GUEST COUNT VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

describe('Pricing Validation — guest count', () => {
  it('accepts 1 guest (solo)', () => {
    const result = validatePricingInput({
      serviceType: 'private_dinner',
      guestCount: 1,
      courseCount: 4,
    })
    assert.equal(result.valid, true)
  })

  it('accepts 2 guests (couple)', () => {
    const result = validatePricingInput({
      serviceType: 'private_dinner',
      guestCount: 2,
      courseCount: 4,
    })
    assert.equal(result.valid, true)
  })

  it('accepts 7 guests (group)', () => {
    const result = validatePricingInput({
      serviceType: 'private_dinner',
      guestCount: 7,
      courseCount: 4,
    })
    assert.equal(result.valid, true)
  })

  it('accepts 14 guests (large group — still computable)', () => {
    const result = validatePricingInput({
      serviceType: 'private_dinner',
      guestCount: 14,
      courseCount: 4,
    })
    assert.equal(result.valid, true)
  })

  it('rejects 0 guests', () => {
    const result = validatePricingInput({
      serviceType: 'private_dinner',
      guestCount: 0,
      courseCount: 4,
    })
    assert.equal(result.valid, false)
    assert.ok(result.errors.some((e) => e.includes('Guest count')))
  })

  it('rejects negative guests', () => {
    const result = validatePricingInput({
      serviceType: 'private_dinner',
      guestCount: -1,
      courseCount: 4,
    })
    assert.equal(result.valid, false)
  })

  it('rejects fractional guests', () => {
    const result = validatePricingInput({
      serviceType: 'private_dinner',
      guestCount: 3.5,
      courseCount: 4,
    })
    assert.equal(result.valid, false)
  })

  it('rejects 15+ guests (requires custom buyout quote)', () => {
    const result = validatePricingInput({
      serviceType: 'private_dinner',
      guestCount: 15,
      courseCount: 4,
    })
    assert.equal(result.valid, false)
    assert.ok(result.errors.some((e) => e.includes('custom') || e.includes('buyout')))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// COURSE COUNT VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

describe('Pricing Validation — course count (private dinner)', () => {
  it('accepts 3-course dinner', () => {
    const result = validatePricingInput({
      serviceType: 'private_dinner',
      guestCount: 2,
      courseCount: 3,
    })
    assert.equal(result.valid, true)
  })

  it('accepts 4-course dinner', () => {
    const result = validatePricingInput({
      serviceType: 'private_dinner',
      guestCount: 2,
      courseCount: 4,
    })
    assert.equal(result.valid, true)
  })

  it('accepts 5-course dinner', () => {
    const result = validatePricingInput({
      serviceType: 'private_dinner',
      guestCount: 2,
      courseCount: 5,
    })
    assert.equal(result.valid, true)
  })

  it('rejects missing courseCount for private dinner', () => {
    const result = validatePricingInput({
      serviceType: 'private_dinner',
      guestCount: 2,
    })
    assert.equal(result.valid, false)
    assert.ok(result.errors.some((e) => e.includes('Course count')))
  })

  it('rejects 2-course dinner (below standard range)', () => {
    const result = validatePricingInput({
      serviceType: 'private_dinner',
      guestCount: 2,
      courseCount: 2,
    })
    assert.equal(result.valid, false)
    assert.ok(result.errors.some((e) => e.includes('custom pricing')))
  })

  it('rejects 6-course dinner (above standard range)', () => {
    const result = validatePricingInput({
      serviceType: 'private_dinner',
      guestCount: 2,
      courseCount: 6,
    })
    assert.equal(result.valid, false)
  })

  it('courseCount is ignored for non-private-dinner types', () => {
    // pizza_experience doesn't need courseCount
    const result = validatePricingInput({
      serviceType: 'pizza_experience',
      guestCount: 4,
    })
    assert.equal(result.valid, true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE TYPE VARIATIONS
// ─────────────────────────────────────────────────────────────────────────────

describe('Pricing Validation — service types', () => {
  it('pizza_experience is valid without courseCount', () => {
    const result = validatePricingInput({
      serviceType: 'pizza_experience',
      guestCount: 6,
    })
    assert.equal(result.valid, true)
  })

  it('weekly_standard is valid with 1 day', () => {
    const result = validatePricingInput({
      serviceType: 'weekly_standard',
      guestCount: 4,
      numberOfDays: 1,
    })
    assert.equal(result.valid, true)
  })

  it('weekly_commitment requires minimum 5 days', () => {
    const result = validatePricingInput({
      serviceType: 'weekly_commitment',
      guestCount: 4,
      numberOfDays: 3,
    })
    assert.equal(result.valid, false)
    assert.ok(result.errors.some((e) => e.includes('Commitment rate') || e.includes('5')))
  })

  it('weekly_commitment with 5 days is valid', () => {
    const result = validatePricingInput({
      serviceType: 'weekly_commitment',
      guestCount: 4,
      numberOfDays: 5,
    })
    assert.equal(result.valid, true)
  })

  it('multi_night requires multiNightPackage key', () => {
    const result = validatePricingInput({
      serviceType: 'multi_night',
      guestCount: 2,
    })
    assert.equal(result.valid, false)
    assert.ok(result.errors.some((e) => e.includes('multiNightPackage')))
  })

  it('multi_night with valid package is valid', () => {
    const result = validatePricingInput({
      serviceType: 'multi_night',
      guestCount: 2,
      multiNightPackage: 'two_night_4_course',
    })
    assert.equal(result.valid, true)
  })

  it('multi_night with unknown package is invalid', () => {
    const result = validatePricingInput({
      serviceType: 'multi_night',
      guestCount: 2,
      multiNightPackage: 'five_night_10_course',
    })
    assert.equal(result.valid, false)
    assert.ok(result.errors.some((e) => e.includes('Unknown')))
  })

  it('multi_night with placeholder (0-value) package requires custom pricing', () => {
    const result = validatePricingInput({
      serviceType: 'multi_night',
      guestCount: 2,
      multiNightPackage: 'three_night_3_course', // $0 placeholder
    })
    assert.equal(result.valid, false)
    assert.ok(result.errors.some((e) => e.includes('placeholder') || e.includes('custom')))
  })

  it('cook_and_leave is valid', () => {
    const result = validatePricingInput({
      serviceType: 'cook_and_leave',
      guestCount: 4,
      numberOfDays: 2,
    })
    assert.equal(result.valid, true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EVENT DATE AND DISTANCE
// ─────────────────────────────────────────────────────────────────────────────

describe('Pricing Validation — event date', () => {
  it('accepts valid ISO date', () => {
    const result = validatePricingInput({
      serviceType: 'private_dinner',
      guestCount: 2,
      courseCount: 4,
      eventDate: '2026-06-15',
    })
    assert.equal(result.valid, true)
  })

  it('accepts no event date (optional)', () => {
    const result = validatePricingInput({
      serviceType: 'private_dinner',
      guestCount: 2,
      courseCount: 4,
    })
    assert.equal(result.valid, true)
  })

  it('rejects invalid date string', () => {
    const result = validatePricingInput({
      serviceType: 'private_dinner',
      guestCount: 2,
      courseCount: 4,
      eventDate: 'not-a-date',
    })
    assert.equal(result.valid, false)
    assert.ok(result.errors.some((e) => e.includes('not a valid date')))
  })
})

describe('Pricing Validation — distance', () => {
  it('accepts 0 miles', () => {
    const result = validatePricingInput({
      serviceType: 'private_dinner',
      guestCount: 2,
      courseCount: 4,
      distanceMiles: 0,
    })
    assert.equal(result.valid, true)
  })

  it('accepts positive distance', () => {
    const result = validatePricingInput({
      serviceType: 'private_dinner',
      guestCount: 2,
      courseCount: 4,
      distanceMiles: 25.5,
    })
    assert.equal(result.valid, true)
  })

  it('rejects negative distance', () => {
    const result = validatePricingInput({
      serviceType: 'private_dinner',
      guestCount: 2,
      courseCount: 4,
      distanceMiles: -10,
    })
    assert.equal(result.valid, false)
    assert.ok(result.errors.some((e) => e.includes('negative')))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MULTIPLE ERRORS
// ─────────────────────────────────────────────────────────────────────────────

describe('Pricing Validation — multiple errors', () => {
  it('reports all errors at once (never throws)', () => {
    const result = validatePricingInput({
      serviceType: 'private_dinner',
      guestCount: 0,
      courseCount: 2,
      distanceMiles: -5,
    })
    assert.equal(result.valid, false)
    // Should have at least 3 errors: guest count, course count, distance
    assert.ok(result.errors.length >= 3, `Expected 3+ errors, got ${result.errors.length}`)
  })
})
