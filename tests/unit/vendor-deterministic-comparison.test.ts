import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const { buildVendorRecommendation } = require('../../lib/vendors/deterministic-comparison.ts')

test('buildVendorRecommendation returns lowest-price vendor as best value', () => {
  const recommendation = buildVendorRecommendation([
    { vendorName: 'Vendor A', priceCents: 1200, unit: 'ea' },
    { vendorName: 'Vendor B', priceCents: 950, unit: 'ea' },
    { vendorName: 'Vendor C', priceCents: 1400, unit: 'ea' },
  ])

  assert.ok(recommendation)
  assert.equal(recommendation.bestValueVendor, 'Vendor B')
  assert.equal(recommendation.vendorRankings[0].vendorName, 'Vendor B')
  assert.ok(recommendation.vendorRankings[0].valueScore >= recommendation.vendorRankings[1].valueScore)
})

test('buildVendorRecommendation returns null when fewer than 2 options', () => {
  const recommendation = buildVendorRecommendation([
    { vendorName: 'Only Vendor', priceCents: 1200, unit: 'ea' },
  ])

  assert.equal(recommendation, null)
})
