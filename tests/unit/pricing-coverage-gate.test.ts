import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPricingCoverageGate } from '@/lib/pricing/pricing-coverage-gate'

test('pricing coverage gate separates no-blank coverage from chef quote reliability', () => {
  const gate = buildPricingCoverageGate(
    [
      {
        id: 'ing_chicken',
        name: 'Chicken Breast',
        category: 'meat',
        priceCents: 499,
        unit: 'lb',
        lastPriceDate: '2026-04-29',
        lastPriceConfidence: 0.92,
        lastPriceSource: 'openclaw_zip_local',
        lastPriceStore: 'Market Basket',
        preferredVendor: null,
        dataPoints: 4,
      },
      {
        id: 'ing_olive_oil',
        name: 'Olive Oil',
        category: 'oils',
        priceCents: 1599,
        unit: 'each',
        lastPriceDate: '2026-04-24',
        lastPriceConfidence: 0.61,
        lastPriceSource: 'openclaw_national_median',
        lastPriceStore: null,
        preferredVendor: null,
        dataPoints: 28,
      },
      {
        id: 'ing_daikon',
        name: 'Purple Daikon',
        category: 'produce',
        priceCents: null,
        unit: 'lb',
        lastPriceDate: null,
        lastPriceConfidence: null,
        lastPriceSource: null,
        lastPriceStore: null,
        preferredVendor: null,
        dataPoints: 0,
      },
    ],
    { now: new Date('2026-04-30T12:00:00.000Z') }
  )

  assert.equal(gate.noBlankGate.passed, true)
  assert.equal(gate.summary.noBlankCoveragePct, 100)
  assert.equal(gate.summary.recognizedIngredients, 3)
  assert.equal(gate.summary.pricedContracts, 3)
  assert.equal(gate.summary.safeToQuoteCount, 1)
  assert.equal(gate.summary.verifyFirstCount, 1)
  assert.equal(gate.summary.planningOnlyCount, 1)
  assert.equal(gate.summary.modeledFallbackCount, 1)
  assert.equal(gate.chefReliabilityGate.status, 'blocked')
  assert.match(gate.chefReliabilityGate.reason, /planning-only/i)
  assert.equal(gate.byCategory.find((row) => row.category === 'produce')?.modeledFallbackCount, 1)
  assert.equal(gate.topRisks[0]?.name, 'Purple Daikon')
})

test('pricing coverage gate marks fully local fresh evidence as quote ready', () => {
  const gate = buildPricingCoverageGate(
    [
      {
        id: 'ing_eggs',
        name: 'Eggs',
        category: 'dairy',
        priceCents: 699,
        unit: 'dozen',
        lastPriceDate: '2026-04-30',
        lastPriceConfidence: 0.88,
        lastPriceSource: 'vendor_invoice',
        lastPriceStore: 'Hannaford',
        preferredVendor: 'Hannaford',
        dataPoints: 3,
      },
    ],
    { now: new Date('2026-04-30T12:00:00.000Z') }
  )

  assert.equal(gate.noBlankGate.passed, true)
  assert.equal(gate.chefReliabilityGate.status, 'ready')
  assert.equal(gate.summary.quoteSafePct, 100)
  assert.equal(gate.summary.observedLocalCount, 1)
  assert.equal(gate.topRisks.length, 0)
})

test('pricing coverage gate reports stale observed prices as verify-first risk', () => {
  const gate = buildPricingCoverageGate(
    [
      {
        id: 'ing_salmon',
        name: 'Salmon',
        category: 'seafood',
        priceCents: 1399,
        unit: 'lb',
        lastPriceDate: '2026-03-01',
        lastPriceConfidence: 0.8,
        lastPriceSource: 'openclaw_zip_local',
        lastPriceStore: 'Whole Foods',
        preferredVendor: null,
        dataPoints: 5,
      },
    ],
    { now: new Date('2026-04-30T12:00:00.000Z') }
  )

  assert.equal(gate.chefReliabilityGate.status, 'needs_verification')
  assert.equal(gate.summary.staleObservedCount, 1)
  assert.equal(gate.topRisks[0]?.quoteSafety, 'verify_first')
  assert.ok(gate.missingProof.includes('fresh timestamp'))
})

test('pricing coverage gate treats chef-owned costs as local evidence with missing proof', () => {
  const gate = buildPricingCoverageGate(
    [
      {
        id: 'ing_flour',
        name: 'Flour',
        category: 'dry_goods',
        priceCents: 249,
        unit: 'lb',
        lastPriceDate: null,
        lastPriceConfidence: 0.65,
        lastPriceSource: 'chef_cost',
        lastPriceStore: null,
        preferredVendor: null,
        dataPoints: 1,
      },
    ],
    { now: new Date('2026-04-30T12:00:00.000Z') }
  )

  assert.equal(gate.summary.observedLocalCount, 1)
  assert.equal(gate.summary.modeledFallbackCount, 0)
  assert.equal(gate.chefReliabilityGate.status, 'needs_verification')
  assert.ok(gate.missingProof.includes('fresh timestamp'))
})
