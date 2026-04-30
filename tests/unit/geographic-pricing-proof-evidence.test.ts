import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { GEOGRAPHIC_PRICING_BASKET } from '@/lib/pricing/geography-basket'
import {
  scoreLocalProductMatch,
  scoreLocalUnitConversion,
} from '@/lib/pricing/geographic-proof-evidence'

function basketItem(key: string) {
  const item = GEOGRAPHIC_PRICING_BASKET.find((entry) => entry.ingredientKey === key)
  assert.ok(item, `Missing basket item ${key}`)
  return item
}

describe('geographic pricing proof evidence scoring', () => {
  it('scores clear local grocery product aliases above the safe match threshold', () => {
    const score = scoreLocalProductMatch(
      'Boneless Skinless Chicken Breast Family Pack',
      basketItem('chicken_breast')
    )

    assert.ok(score.confidence >= 0.75)
    assert.equal(score.matchedAlias, 'chicken breast')
  })

  it('caps package-noise matches below the safe match threshold', () => {
    const score = scoreLocalProductMatch('Garlic Powder', basketItem('garlic'))

    assert.ok(score.confidence < 0.75)
    assert.match(score.reason, /package noise/)
  })

  it('trusts observed standard-unit prices enough for quote-safe unit proof', () => {
    const score = scoreLocalUnitConversion({
      hasStandardUnitPrice: true,
      targetUnit: 'lb',
      productSizeValue: null,
      productSizeUnit: null,
    })

    assert.ok(score.confidence >= 0.8)
  })

  it('does not treat a multi-count package as quote-safe unit proof without a standard-unit price', () => {
    const score = scoreLocalUnitConversion({
      hasStandardUnitPrice: false,
      targetUnit: 'each',
      productSizeValue: 12,
      productSizeUnit: 'ct',
    })

    assert.ok(score.confidence < 0.8)
    assert.match(score.reason, /standard-unit price is missing/)
  })
})
