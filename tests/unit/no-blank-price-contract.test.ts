import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildNoBlankPriceContract,
  summarizePriceContracts,
  type NoBlankPriceContract,
} from '@/lib/pricing/no-blank-price-contract'

test('returns a quote-safe contract for fresh local observed prices', () => {
  const contract = buildNoBlankPriceContract({
    ingredientId: 'ing_chicken',
    rawName: 'Chicken Breast',
    normalizedName: 'chicken breast',
    recognized: true,
    priceCents: 499,
    unit: 'lb',
    confidence: 0.91,
    freshnessDays: 1,
    resolutionTier: 'zip_local',
    observedAt: '2026-04-30T12:00:00.000Z',
    storeName: 'Market Basket',
    productName: 'Boneless Skinless Chicken Breast',
    dataPoints: 4,
  })

  assert.equal(contract.kind, 'priced')
  assert.equal(contract.sourceClass, 'observed_local')
  assert.equal(contract.quoteSafety, 'safe_to_quote')
  assert.equal(contract.priceCents, 499)
  assert.equal(contract.lowCents, 474)
  assert.equal(contract.highCents, 524)
  assert.equal(contract.missingProof.length, 0)
})

test('returns a regional verify-first contract for regional estimates', () => {
  const contract = buildNoBlankPriceContract({
    ingredientId: 'ing_salmon',
    rawName: 'Salmon',
    normalizedName: 'salmon',
    recognized: true,
    priceCents: 1399,
    unit: 'lb',
    confidence: 0.72,
    freshnessDays: 8,
    resolutionTier: 'regional',
    dataPoints: 9,
  })

  assert.equal(contract.kind, 'priced')
  assert.equal(contract.sourceClass, 'observed_regional')
  assert.equal(contract.quoteSafety, 'verify_first')
  assert.ok(contract.missingProof.includes('fresh local buyable proof'))
  assert.ok(contract.lowCents < contract.priceCents)
  assert.ok(contract.highCents > contract.priceCents)
})

test('uses national fallback data without making it quote-safe', () => {
  const contract = buildNoBlankPriceContract({
    ingredientId: 'ing_olive_oil',
    rawName: 'Olive Oil',
    normalizedName: 'olive oil',
    recognized: true,
    priceCents: 1599,
    unit: 'each',
    confidence: 0.61,
    freshnessDays: 4,
    resolutionTier: 'market_national',
    dataPoints: 28,
  })

  assert.equal(contract.kind, 'priced')
  assert.equal(contract.sourceClass, 'national_median')
  assert.equal(contract.quoteSafety, 'verify_first')
  assert.ok(contract.missingProof.includes('local market proof'))
})

test('creates a modeled planning-only price when no observed or partial price exists', () => {
  const contract = buildNoBlankPriceContract({
    ingredientId: null,
    rawName: 'Purple Daikon',
    normalizedName: 'purple daikon',
    recognized: true,
    unit: 'lb',
    category: 'produce',
  })

  assert.equal(contract.kind, 'priced')
  assert.equal(contract.sourceClass, 'modeled')
  assert.equal(contract.quoteSafety, 'planning_only')
  assert.equal(contract.priceCents, 399)
  assert.equal(contract.unit, 'lb')
  assert.ok(contract.lowCents < contract.priceCents)
  assert.ok(contract.highCents > contract.priceCents)
  assert.ok(contract.missingProof.includes('observed market price'))
})

test('keeps unsupported text out of the no-blank pricing promise', () => {
  const contract = buildNoBlankPriceContract({
    ingredientId: null,
    rawName: 'spring garnish',
    normalizedName: '',
    recognized: false,
  })

  assert.equal(contract.kind, 'unsupported')
  assert.equal(contract.priceCents, null)
  assert.equal(contract.quoteSafety, 'unsupported')
  assert.ok(contract.missingProof.includes('recognized ingredient'))
})

test('penalizes stale observed prices into verify-first', () => {
  const contract = buildNoBlankPriceContract({
    ingredientId: 'ing_eggs',
    rawName: 'Eggs',
    normalizedName: 'eggs',
    recognized: true,
    priceCents: 699,
    unit: 'dozen',
    confidence: 0.88,
    freshnessDays: 45,
    resolutionTier: 'zip_local',
    storeName: 'Hannaford',
    productName: 'Large Eggs',
    dataPoints: 3,
  })

  assert.equal(contract.sourceClass, 'observed_local')
  assert.equal(contract.quoteSafety, 'verify_first')
  assert.ok(contract.missingProof.includes('fresh timestamp'))
})

test('summarizes contracts into a money-decision verdict', () => {
  const contracts: NoBlankPriceContract[] = [
    buildNoBlankPriceContract({
      ingredientId: 'ing_chicken',
      rawName: 'Chicken',
      normalizedName: 'chicken',
      recognized: true,
      priceCents: 499,
      unit: 'lb',
      confidence: 0.9,
      freshnessDays: 1,
      resolutionTier: 'zip_local',
      storeName: 'Market Basket',
      productName: 'Chicken',
      dataPoints: 4,
    }),
    buildNoBlankPriceContract({
      ingredientId: 'ing_saffron',
      rawName: 'Saffron',
      normalizedName: 'saffron',
      recognized: true,
      unit: 'oz',
      category: 'spices',
    }),
  ]

  const summary = summarizePriceContracts(contracts)

  assert.equal(summary.verdict, 'planning_only')
  assert.equal(summary.totalCount, 2)
  assert.equal(summary.planningOnlyCount, 1)
  assert.equal(summary.modeledCount, 1)
  assert.equal(summary.safeToQuoteCount, 1)
})
