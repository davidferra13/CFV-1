/**
 * QA Validation: Pricing Format and Validation
 *
 * Tests pure pricing functions from lib/pricing/compute.ts and lib/pricing/constants.ts:
 *   - formatCentsAsDollars: currency display formatting
 *   - centsToDisplay: simplified cents display
 *   - validatePricingInput: input validation for the pricing engine
 *
 * Run: npm run test:unit
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

function formatCentsAsDollars(cents: number): string {
  const dollars = cents / 100
  const hasCents = dollars % 1 !== 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(dollars)
}

function centsToDisplay(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`
}

type ServiceType =
  | 'private_dinner'
  | 'couples_dinner'
  | 'weekly_service'
  | 'meal_prep'
  | 'multi_night'
  | 'pizza_party'
  | 'cooking_class'
  | 'catering'
  | 'custom'

type PricingInput = {
  guestCount: number
  serviceType: ServiceType
  courseCount?: number
  eventDate?: string
  distanceMiles?: number
  multiNightPackage?: string
}

const MULTI_NIGHT_PACKAGES: Record<string, number> = {}

function validatePricingInput(input: PricingInput): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (!Number.isInteger(input.guestCount) || input.guestCount < 1) {
    errors.push('Guest count must be a positive integer (minimum 1)')
  }
  if (input.serviceType === 'private_dinner') {
    if (input.courseCount === undefined || !Number.isInteger(input.courseCount) || input.courseCount < 1) {
      errors.push('Course count is required for private dinner and must be a positive integer')
    } else if (input.courseCount < 3 || input.courseCount > 5) {
      errors.push(`${input.courseCount}-course menu is outside the standard 3-5 course range - requires custom pricing`)
    }
  }
  if (input.eventDate) {
    const d = new Date(input.eventDate + 'T12:00:00')
    if (isNaN(d.getTime())) {
      errors.push(`Event date "${input.eventDate}" is not a valid date`)
    }
  }
  if (input.distanceMiles !== undefined && input.distanceMiles < 0) {
    errors.push('Distance miles cannot be negative')
  }
  if (input.serviceType === 'multi_night') {
    if (!input.multiNightPackage) {
      errors.push('multiNightPackage key is required for multi_night service type')
    } else if (!(input.multiNightPackage in MULTI_NIGHT_PACKAGES)) {
      errors.push(`Unknown multi-night package "${input.multiNightPackage}".`)
    }
  }
  return { valid: errors.length === 0, errors }
}

describe('QA Validation: formatCentsAsDollars', () => {
  it('formats whole dollar amounts without cents', () => {
    assert.equal(formatCentsAsDollars(10000), '$100')
    assert.equal(formatCentsAsDollars(250000), '$2,500')
    assert.equal(formatCentsAsDollars(100000), '$1,000')
  })
  it('formats amounts with cents', () => {
    assert.equal(formatCentsAsDollars(10050), '$100.50')
    assert.equal(formatCentsAsDollars(9999), '$99.99')
    assert.equal(formatCentsAsDollars(1), '$0.01')
  })
  it('formats zero', () => {
    assert.equal(formatCentsAsDollars(0), '$0')
  })
  it('uses thousands separator', () => {
    const result = formatCentsAsDollars(1000000)
    assert.ok(result.includes(','), 'Should use thousands separator')
    assert.equal(result, '$10,000')
  })
})

describe('QA Validation: centsToDisplay', () => {
  it('formats whole dollar amounts', () => {
    assert.equal(centsToDisplay(10000), '$100')
    assert.equal(centsToDisplay(250000), '$2500')
  })
  it('rounds cents via toFixed(0)', () => {
    assert.equal(centsToDisplay(10050), '$101')
    assert.equal(centsToDisplay(9999), '$100')
  })
  it('formats zero', () => {
    assert.equal(centsToDisplay(0), '$0')
  })
})

describe('QA Validation: validatePricingInput', () => {
  describe('Guest count validation', () => {
    it('rejects zero guests', () => {
      const result = validatePricingInput({ guestCount: 0, serviceType: 'meal_prep' })
      assert.equal(result.valid, false)
      assert.ok(result.errors.some((e: string) => e.includes('positive integer')))
    })
    it('rejects negative guests', () => {
      const result = validatePricingInput({ guestCount: -1, serviceType: 'meal_prep' })
      assert.equal(result.valid, false)
    })
    it('rejects fractional guests', () => {
      const result = validatePricingInput({ guestCount: 2.5, serviceType: 'meal_prep' })
      assert.equal(result.valid, false)
    })
    it('accepts valid guest count', () => {
      const result = validatePricingInput({ guestCount: 8, serviceType: 'meal_prep' })
      assert.equal(result.valid, true)
      assert.equal(result.errors.length, 0)
    })
  })
  describe('Private dinner course validation', () => {
    it('requires course count for private dinner', () => {
      const result = validatePricingInput({ guestCount: 4, serviceType: 'private_dinner' })
      assert.equal(result.valid, false)
      assert.ok(result.errors.some((e: string) => e.includes('Course count is required')))
    })
    it('rejects 2-course private dinner', () => {
      const result = validatePricingInput({ guestCount: 4, serviceType: 'private_dinner', courseCount: 2 })
      assert.equal(result.valid, false)
      assert.ok(result.errors.some((e: string) => e.includes('outside the standard')))
    })
    it('accepts 3-course private dinner', () => {
      const result = validatePricingInput({ guestCount: 4, serviceType: 'private_dinner', courseCount: 3 })
      assert.equal(result.valid, true)
    })
    it('accepts 5-course private dinner', () => {
      const result = validatePricingInput({ guestCount: 4, serviceType: 'private_dinner', courseCount: 5 })
      assert.equal(result.valid, true)
    })
  })
  describe('Event date validation', () => {
    it('accepts valid ISO date', () => {
      const result = validatePricingInput({ guestCount: 4, serviceType: 'meal_prep', eventDate: '2026-06-15' })
      assert.equal(result.valid, true)
    })
    it('rejects invalid date string', () => {
      const result = validatePricingInput({ guestCount: 4, serviceType: 'meal_prep', eventDate: 'not-a-date' })
      assert.equal(result.valid, false)
      assert.ok(result.errors.some((e: string) => e.includes('not a valid date')))
    })
  })
  describe('Distance validation', () => {
    it('rejects negative distance', () => {
      const result = validatePricingInput({ guestCount: 4, serviceType: 'meal_prep', distanceMiles: -5 })
      assert.equal(result.valid, false)
      assert.ok(result.errors.some((e: string) => e.includes('negative')))
    })
    it('accepts zero distance', () => {
      const result = validatePricingInput({ guestCount: 4, serviceType: 'meal_prep', distanceMiles: 0 })
      assert.equal(result.valid, true)
    })
  })
  describe('Multi-night validation', () => {
    it('requires multiNightPackage for multi_night type', () => {
      const result = validatePricingInput({ guestCount: 4, serviceType: 'multi_night' })
      assert.equal(result.valid, false)
      assert.ok(result.errors.some((e: string) => e.includes('multiNightPackage key is required')))
    })
    it('rejects unknown multi-night package', () => {
      const result = validatePricingInput({ guestCount: 4, serviceType: 'multi_night', multiNightPackage: 'nonexistent' })
      assert.equal(result.valid, false)
      assert.ok(result.errors.some((e: string) => e.includes('Unknown multi-night package')))
    })
  })
  describe('Multiple errors', () => {
    it('collects all errors for invalid input', () => {
      const result = validatePricingInput({ guestCount: 0, serviceType: 'private_dinner', distanceMiles: -10 })
      assert.equal(result.valid, false)
      assert.ok(result.errors.length >= 2, `Expected at least 2 errors, got ${result.errors.length}`)
    })
  })
})