import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { classifyGeographicProofCandidate } from '@/lib/pricing/geographic-proof-classifier'

const now = new Date('2026-04-30T12:00:00.000Z')

describe('geographic pricing proof classifier', () => {
  it('marks fresh local observed store proof as safe to quote', () => {
    const result = classifyGeographicProofCandidate(
      {
        kind: 'store_observed',
        priceCents: 899,
        normalizedPriceCents: 899,
        normalizedUnit: 'lb',
        geographyCode: 'CA',
        storeId: 'store-1',
        storeName: 'Local Market',
        storeCity: 'Los Angeles',
        storeState: 'CA',
        storeZip: '90001',
        productId: 'product-1',
        productName: 'Chicken Breast',
        observedAt: '2026-04-27T12:00:00.000Z',
        confidence: 0.86,
        matchConfidence: 0.9,
        unitConfidence: 0.91,
        dataPoints: 4,
      },
      { geographyCode: 'CA', now, hasLocalStores: true }
    )

    assert.equal(result.sourceClass, 'local_observed')
    assert.equal(result.quoteSafety, 'safe_to_quote')
    assert.equal(result.failureReason, null)
    assert.deepEqual(result.missingProof, [])
  })

  it('never treats MA 00000 regional rows as local Massachusetts proof', () => {
    const result = classifyGeographicProofCandidate(
      {
        kind: 'store_observed',
        priceCents: 699,
        normalizedPriceCents: 699,
        normalizedUnit: 'lb',
        storeId: 'store-regional',
        storeName: 'Regional Market Average',
        storeCity: 'Regional',
        storeState: 'MA',
        storeZip: '00000',
        productId: 'product-2',
        productName: 'Rice',
        observedAt: '2026-04-29T12:00:00.000Z',
        confidence: 0.9,
        matchConfidence: 0.9,
        unitConfidence: 0.9,
        dataPoints: 10,
      },
      { geographyCode: 'MA', now, hasLocalStores: true }
    )

    assert.equal(result.sourceClass, 'regional_observed')
    assert.notEqual(result.quoteSafety, 'safe_to_quote')
    assert.match(result.missingProof.join(' '), /local store proof/)
  })

  it('downgrades stale local observed proof to planning only', () => {
    const result = classifyGeographicProofCandidate(
      {
        kind: 'store_observed',
        priceCents: 499,
        normalizedPriceCents: 499,
        normalizedUnit: 'lb',
        storeId: 'store-3',
        storeState: 'NY',
        storeZip: '10001',
        productId: 'product-3',
        observedAt: '2026-03-01T12:00:00.000Z',
        confidence: 0.9,
        matchConfidence: 0.9,
        unitConfidence: 0.9,
        dataPoints: 5,
      },
      { geographyCode: 'NY', now, hasLocalStores: true }
    )

    assert.equal(result.sourceClass, 'local_observed')
    assert.equal(result.quoteSafety, 'planning_only')
    assert.equal(result.failureReason, 'stale prices')
  })

  it('keeps modeled fallback planning-only even with a price', () => {
    const result = classifyGeographicProofCandidate(
      {
        kind: 'modeled_fallback',
        priceCents: 399,
        normalizedPriceCents: 399,
        normalizedUnit: 'lb',
        confidence: 0.4,
        matchConfidence: 0.8,
        unitConfidence: 0.8,
      },
      { geographyCode: 'TX', now, hasLocalStores: true }
    )

    assert.equal(result.sourceClass, 'modeled_fallback')
    assert.equal(result.quoteSafety, 'planning_only')
    assert.equal(result.failureReason, 'modeled-only pricing')
  })

  it('reports weak ingredient matching before unit conversion gaps', () => {
    const result = classifyGeographicProofCandidate(
      {
        kind: 'store_observed',
        priceCents: 928,
        normalizedPriceCents: 928,
        normalizedUnit: 'lb',
        storeId: 'store-weak',
        storeState: 'CA',
        storeZip: '90001',
        productId: 'product-weak',
        productName: 'Peanut Butter Protein Bar',
        observedAt: '2026-04-30T12:00:00.000Z',
        confidence: 0.9,
        matchConfidence: 0.62,
        unitConfidence: 0.35,
      },
      { geographyCode: 'CA', now, hasLocalStores: true }
    )

    assert.equal(result.quoteSafety, 'verify_first')
    assert.equal(result.failureReason, 'weak ingredient matching')
  })

  it('reports missing ZIP/store coverage for nonlocal observed data when stores exist', () => {
    const result = classifyGeographicProofCandidate(
      {
        kind: 'market_national',
        priceCents: 500,
        normalizedPriceCents: 500,
        normalizedUnit: 'lb',
        observedAt: '2026-04-30T12:00:00.000Z',
        confidence: 0.9,
        matchConfidence: 0.9,
        unitConfidence: 0.9,
        dataPoints: 20,
      },
      { geographyCode: 'CA', now, hasLocalStores: true }
    )

    assert.equal(result.quoteSafety, 'verify_first')
    assert.equal(result.failureReason, 'missing ZIP/store coverage')
  })

  it('rejects zero-dollar prices as not usable', () => {
    const result = classifyGeographicProofCandidate(
      {
        kind: 'store_observed',
        priceCents: 0,
        normalizedPriceCents: 0,
        normalizedUnit: 'lb',
        storeId: 'store-4',
        storeState: 'FL',
        storeZip: '33101',
        productId: 'product-4',
        observedAt: '2026-04-30T12:00:00.000Z',
        confidence: 1,
        matchConfidence: 1,
        unitConfidence: 1,
      },
      { geographyCode: 'FL', now, hasLocalStores: true }
    )

    assert.equal(result.sourceClass, 'local_observed')
    assert.equal(result.quoteSafety, 'not_usable')
    assert.match(result.missingProof.join(' '), /positive normalized price/)
  })
})
