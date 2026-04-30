import assert from 'node:assert/strict'
import test from 'node:test'
import { buildBuyablePriceContract } from '@/lib/pricing/buyable-price-contract'

test('marks fresh local store proof as shopping-safe', () => {
  const contract = buildBuyablePriceContract({
    priceCents: 1299,
    confidenceScore: 0.9,
    resolutionTier: 'zip_local',
    freshnessDays: 1,
    dataPoints: 3,
    storeName: 'Market Basket',
    productName: 'Chicken Breast',
    zipRequested: '01830',
    distanceMiles: 2.4,
    observedAt: new Date().toISOString(),
    unit: 'lb',
    packageSize: '1 lb',
    sourceLabels: ['openclaw_scrape'],
  })

  assert.equal(contract.trustLevel, 'confirmed_local_buyable')
  assert.equal(contract.safeForShopping, true)
  assert.equal(contract.requiredProof.length, 0)
})

test('blocks national medians from shopping-safe claims', () => {
  const contract = buildBuyablePriceContract({
    priceCents: 899,
    confidenceScore: 0.6,
    resolutionTier: 'national_median',
    freshnessDays: 1,
    dataPoints: 20,
    productName: 'Olive Oil',
    observedAt: new Date().toISOString(),
    unit: 'oz',
    sourceLabels: ['national catalog'],
  })

  assert.equal(contract.trustLevel, 'national_median')
  assert.equal(contract.safeForShopping, false)
  assert.ok(contract.reasons.some((reason) => reason.includes('not backed by local')))
})

test('requires product proof before a local price is shopping-safe', () => {
  const contract = buildBuyablePriceContract({
    priceCents: 499,
    confidenceScore: 0.8,
    resolutionTier: 'zip_local',
    freshnessDays: 1,
    dataPoints: 1,
    storeName: 'Whole Foods',
    unit: 'each',
    sourceLabels: ['openclaw_scrape'],
  })

  assert.equal(contract.safeForShopping, false)
  assert.ok(contract.requiredProof.includes('exact product or ingredient match'))
})
