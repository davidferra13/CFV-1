import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  GEOGRAPHIC_PRICING_BASKET,
  GEOGRAPHIC_PRICING_EXPECTED_RESULT_ROWS,
  GEOGRAPHIC_PRICING_GEOGRAPHIES,
} from '@/lib/pricing/geography-basket'
import { classifyGeographicProofCandidate } from '@/lib/pricing/geographic-proof-classifier'

describe('geographic pricing proof coverage contract', () => {
  it('requires 56 geographies and 16 basket items', () => {
    assert.equal(GEOGRAPHIC_PRICING_GEOGRAPHIES.length, 56)
    assert.equal(GEOGRAPHIC_PRICING_BASKET.length, 16)
    assert.equal(GEOGRAPHIC_PRICING_EXPECTED_RESULT_ROWS, 896)
  })

  it('has unique geography codes and basket keys', () => {
    assert.equal(
      new Set(GEOGRAPHIC_PRICING_GEOGRAPHIES.map((geography) => geography.code)).size,
      GEOGRAPHIC_PRICING_GEOGRAPHIES.length
    )
    assert.equal(
      new Set(GEOGRAPHIC_PRICING_BASKET.map((item) => item.ingredientKey)).size,
      GEOGRAPHIC_PRICING_BASKET.length
    )
  })

  it('forbids safe-to-quote without local observed or chef-owned proof', () => {
    const now = new Date('2026-04-30T12:00:00.000Z')
    const candidateKinds = [
      'market_state',
      'market_national',
      'public_baseline',
      'category_baseline',
      'modeled_fallback',
    ] as const

    for (const kind of candidateKinds) {
      const result = classifyGeographicProofCandidate(
        {
          kind,
          priceCents: 500,
          normalizedPriceCents: 500,
          normalizedUnit: 'lb',
          observedAt: '2026-04-30T12:00:00.000Z',
          confidence: 1,
          matchConfidence: 1,
          unitConfidence: 1,
          dataPoints: 10,
        },
        { geographyCode: 'CA', now, hasLocalStores: true }
      )

      assert.notEqual(result.quoteSafety, 'safe_to_quote')
    }
  })
})
