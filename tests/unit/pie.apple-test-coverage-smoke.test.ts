import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildBuyablePriceContract } from '@/lib/pricing/buyable-price-contract'
import {
  DEFAULT_APPLE_TEST_MATRIX,
  assertAppleTestSmokeSuite,
  runAppleTestSmokeSuite,
  type AppleTestLookup,
  type AppleTestLookupResult,
} from '@/lib/pricing/apple-test-smoke'

const fixtureRows: Record<string, AppleTestLookupResult> = Object.fromEntries(
  DEFAULT_APPLE_TEST_MATRIX.map((smokeCase, index) => {
    const local = index % 2 === 0
    const observedAt = `2026-05-${String(12 - index).padStart(2, '0')}T12:00:00.000Z`
    const fallbackTier = local ? 'zip_local' : 'regional'
    const sourceLabels = local ? ['fixture_store_scan'] : ['fixture_regional_average']
    const buyablePrice = buildBuyablePriceContract({
      priceCents: 129 + index * 37,
      confidenceScore: local ? 0.91 : 0.68,
      resolutionTier: fallbackTier,
      freshnessDays: local ? 1 : 6,
      dataPoints: local ? 3 : 8,
      storeName: local ? `Fixture Market ${smokeCase.region}` : null,
      productName: smokeCase.ingredient,
      zipRequested: smokeCase.zipCode,
      distanceMiles: local ? 2.4 : null,
      observedAt,
      unit: smokeCase.ingredient === 'cilantro' ? 'bunch' : 'lb',
      packageSize: smokeCase.ingredient === 'cilantro' ? '1 bunch' : '1 lb',
      sourceLabels,
    })

    return [
      lookupKey(smokeCase.ingredient, smokeCase.zipCode),
      {
        price_cents: 129 + index * 37,
        unit: smokeCase.ingredient === 'cilantro' ? 'bunch' : 'lb',
        confidence_score: local ? 0.91 : 0.68,
        resolution_tier: fallbackTier,
        sources: sourceLabels,
        last_updated: observedAt,
        data_points: local ? 3 : 8,
        buyable_price: buyablePrice,
      },
    ]
  })
)

const fixtureLookup: AppleTestLookup = ({ ingredient, zipCode }) => {
  const result = fixtureRows[lookupKey(ingredient, zipCode)]
  if (!result) throw new Error(`missing fixture for ${ingredient} in ${zipCode}`)
  return result
}

describe('PIE Apple Test coverage smoke', () => {
  it('proves representative common ingredients return usable price contracts across US regions', async () => {
    const report = await assertAppleTestSmokeSuite({ lookup: fixtureLookup })

    assert.equal(report.ok, true)
    assert.equal(report.checked, DEFAULT_APPLE_TEST_MATRIX.length)
    assert.equal(report.failed, 0)

    for (const result of report.results) {
      assert.equal(result.ok, true)
      assert.ok(result.diagnostics.priceCents && result.diagnostics.priceCents > 0)
      assert.ok(result.diagnostics.sources.length > 0 || result.diagnostics.proofSources.length > 0)
      assert.notEqual(result.diagnostics.confidenceLabel, 'none')
      assert.notEqual(result.diagnostics.fallbackTier, 'none')
      assert.notEqual(result.diagnostics.freshnessLabel, 'unknown')
      assert.ok(result.diagnostics.observedAt !== null || result.diagnostics.freshnessDays !== null)
    }
  })

  it('emits actionable diagnostics when a price contract is blank or unusable', async () => {
    const brokenLookup: AppleTestLookup = ({ ingredient, zipCode }) => ({
      price_cents: 0,
      unit: null,
      confidence_score: 0,
      resolution_tier: 'none',
      sources: [],
      last_updated: null,
      data_points: 0,
      buyable_price: buildBuyablePriceContract({
        priceCents: 0,
        confidenceScore: 0,
        resolutionTier: 'none',
        freshnessDays: null,
        dataPoints: 0,
        sourceLabels: [],
      }),
    })

    const report = await runAppleTestSmokeSuite({
      lookup: brokenLookup,
      matrix: [{ ingredient: 'apples', zipCode: '10003', region: 'northeast' }],
    })

    assert.equal(report.ok, false)
    assert.equal(report.failed, 1)

    const result = report.results[0]
    assert.equal(result.ok, false)
    assert.deepEqual(result.case, {
      ingredient: 'apples',
      zipCode: '10003',
      region: 'northeast',
    })
    assert.match(result.failures.join('\n'), /positive price_cents/)
    assert.match(result.failures.join('\n'), /source or proof source/)
    assert.match(result.failures.join('\n'), /freshness label/)
    assert.equal(result.diagnostics.priceCents, 0)
    assert.equal(result.diagnostics.fallbackTier, 'none')
    assert.equal(result.diagnostics.trustLevel, 'no_trusted_price')
    assert.deepEqual(result.diagnostics.sources, [])
  })

  it('allows modeled estimates when the fallback state is explicit instead of faking freshness', async () => {
    const modeledLookup: AppleTestLookup = ({ ingredient }) => {
      const buyablePrice = buildBuyablePriceContract({
        priceCents: 275,
        confidenceScore: 0.35,
        resolutionTier: 'estimated',
        freshnessDays: null,
        dataPoints: 1,
        unit: 'lb',
        sourceLabels: ['category_baseline'],
        sourceAvailable: true,
      })

      return {
        price_cents: 275,
        unit: 'lb',
        confidence_score: 0.35,
        resolution_tier: 'estimated',
        sources: ['category_baseline'],
        last_updated: null,
        data_points: 1,
        buyable_price: {
          ...buyablePrice,
          proof: {
            ...buyablePrice.proof,
            productName: ingredient,
          },
        },
      }
    }

    const report = await runAppleTestSmokeSuite({
      lookup: modeledLookup,
      matrix: [{ ingredient: 'apples', zipCode: '10003', region: 'northeast' }],
    })

    assert.equal(report.ok, true)
    assert.equal(report.results[0].ok, true)
    assert.equal(report.diagnostics[0].freshnessLabel, 'unknown')
    assert.equal(report.diagnostics[0].priceState, 'synthetic_or_modeled')
    assert.equal(report.diagnostics[0].fallbackTier, 'estimated')
  })
})

function lookupKey(ingredient: string, zipCode: string): string {
  return `${ingredient.toLowerCase()}::${zipCode}`
}
