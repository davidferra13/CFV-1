import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { calculateStandardUnitPriceCents } from '@/lib/pricing/standard-unit-normalization'

describe('standard unit normalization', () => {
  it('normalizes ounces to cents per pound', () => {
    const result = calculateStandardUnitPriceCents({
      priceCents: 800,
      sizeValue: 16,
      sizeUnit: 'oz',
    })

    assert.deepEqual(result, { priceCents: 800, unit: 'lb' })
  })

  it('normalizes kilograms to cents per pound without inflating the price', () => {
    const result = calculateStandardUnitPriceCents({
      priceCents: 1000,
      sizeValue: 1,
      sizeUnit: 'kg',
    })

    assert.deepEqual(result, { priceCents: 454, unit: 'lb' })
  })

  it('normalizes gallons to cents per fluid ounce', () => {
    const result = calculateStandardUnitPriceCents({
      priceCents: 1280,
      sizeValue: 1,
      sizeUnit: 'gal',
    })

    assert.deepEqual(result, { priceCents: 10, unit: 'fl oz' })
  })

  it('normalizes count packages to cents per each', () => {
    const result = calculateStandardUnitPriceCents({
      priceCents: 600,
      sizeValue: 12,
      sizeUnit: 'ct',
    })

    assert.deepEqual(result, { priceCents: 50, unit: 'each' })
  })

  it('rejects unsupported or missing size data', () => {
    const result = calculateStandardUnitPriceCents({
      priceCents: 600,
      sizeValue: null,
      sizeUnit: 'bag',
    })

    assert.equal(result, null)
  })
})
