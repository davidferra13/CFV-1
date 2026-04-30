import assert from 'node:assert/strict'
import test from 'node:test'
import { assessPricingTrust, pricingResolutionTierFromSource } from '@/lib/pricing/pricing-trust'

test('pricing trust answers whether a menu can be quoted safely', () => {
  const assessment = assessPricingTrust(
    [
      {
        id: 'ing_chicken',
        name: 'Chicken Breast',
        category: 'meat',
        priceCents: 499,
        unit: 'lb',
        lastPriceDate: '2026-04-30',
        lastPriceConfidence: 0.91,
        lastPriceSource: 'vendor_invoice',
        lastPriceStore: 'Market Basket',
        preferredVendor: null,
        dataPoints: 4,
      },
      {
        id: 'ing_saffron',
        name: 'Saffron',
        category: 'spices',
        priceCents: null,
        unit: 'oz',
        lastPriceDate: null,
        lastPriceConfidence: null,
        lastPriceSource: null,
        lastPriceStore: null,
        preferredVendor: null,
        dataPoints: 0,
      },
    ],
    { now: new Date('2026-04-30T12:00:00.000Z'), scope: 'menu' }
  )

  assert.equal(assessment.scope, 'menu')
  assert.equal(assessment.noBlankGate.passed, true)
  assert.equal(assessment.quoteSafetyGate.status, 'blocked')
  assert.equal(assessment.quoteSafetyGate.verdict, 'planning_only')
  assert.equal(assessment.summary.safeToQuoteCount, 1)
  assert.equal(assessment.summary.modeledFallbackCount, 1)
  assert.equal(assessment.topRisks[0]?.name, 'Saffron')
  assert.ok(assessment.missingProof.includes('observed market price'))
})

test('pricing trust keeps no ingredient state separate from quote-safe success', () => {
  const assessment = assessPricingTrust([], {
    now: new Date('2026-04-30T12:00:00.000Z'),
    scope: 'event',
  })

  assert.equal(assessment.noBlankGate.passed, false)
  assert.equal(assessment.quoteSafetyGate.status, 'no_ingredients')
  assert.equal(assessment.quoteSafetyGate.verdict, 'no_ingredients')
  assert.equal(assessment.summary.recognizedIngredients, 0)
  assert.equal(assessment.topRisks.length, 0)
})

test('pricing trust source mapping preserves local and national honesty', () => {
  assert.equal(pricingResolutionTierFromSource('vendor_invoice'), 'zip_local')
  assert.equal(pricingResolutionTierFromSource('openclaw_national_median'), 'market_national')
  assert.equal(pricingResolutionTierFromSource('usda_baseline'), 'government')
  assert.equal(pricingResolutionTierFromSource(null), 'estimated')
})
