import assert from 'node:assert/strict'
import test from 'node:test'

import { buildBuyablePriceContract } from '@/lib/pricing/buyable-price-contract'
import {
  runWeeklyAccuracyValidation,
  type WeeklyAccuracyConfiguredSample,
  type WeeklyAccuracyGroundTruthSample,
  type WeeklyAccuracyServedPriceSample,
} from '@/lib/pricing/weekly-accuracy-validation'

const configuredSamples: WeeklyAccuracyConfiguredSample[] = [
  { ingredientId: 'apple', ingredientName: 'Apples', category: 'produce', region: 'northeast' },
  {
    ingredientId: 'chicken-breast',
    ingredientName: 'Chicken breast',
    category: 'protein',
    region: 'south',
  },
  {
    ingredientId: 'whole-milk',
    ingredientName: 'Whole milk',
    category: 'dairy',
    region: 'midwest',
  },
  {
    ingredientId: 'cilantro',
    ingredientName: 'Cilantro',
    category: 'produce',
    region: 'pacific',
  },
]

const groundTruthPrices: WeeklyAccuracyGroundTruthSample[] = [
  {
    ingredientId: 'apple',
    region: 'northeast',
    groundTruthPriceCents: 200,
    source: 'receipt_ground_truth',
    observedAt: '2026-05-12T00:00:00.000Z',
  },
  {
    ingredientId: 'chicken-breast',
    region: 'south',
    groundTruthPriceCents: 500,
    source: 'receipt_ground_truth',
    observedAt: '2026-05-12T00:00:00.000Z',
  },
  {
    ingredientId: 'whole-milk',
    region: 'midwest',
    groundTruthPriceCents: 400,
    source: 'vendor_invoice_ground_truth',
    observedAt: '2026-05-12T00:00:00.000Z',
  },
  {
    ingredientId: 'cilantro',
    region: 'pacific',
    groundTruthPriceCents: 100,
    source: 'receipt_ground_truth',
    observedAt: '2026-05-12T00:00:00.000Z',
  },
]

const localProof = buildBuyablePriceContract({
  priceCents: 210,
  confidenceScore: 0.9,
  resolutionTier: 'chef_receipt',
  freshnessDays: 2,
  dataPoints: 3,
  storeName: 'Fixture Market',
  productName: 'Fixture Apples',
  zipRequested: '10003',
  unit: 'lb',
  sourceLabels: ['receipt_ground_truth'],
})

const servedPrices: WeeklyAccuracyServedPriceSample[] = [
  {
    ingredientId: 'apple',
    region: 'northeast',
    servedPriceCents: 210,
    source: 'chef_receipt',
    confidenceTier: 'high',
    confidenceScore: 0.9,
    priceProof: localProof,
  },
  {
    ingredientId: 'chicken-breast',
    region: 'south',
    servedPriceCents: 575,
    source: 'regional_market',
    confidenceTier: 'medium',
    confidenceScore: 0.7,
  },
  {
    ingredientId: 'whole-milk',
    region: 'midwest',
    servedPriceCents: 520,
    source: 'national_median',
    confidenceTier: 'high',
    confidenceScore: 0.88,
  },
  {
    ingredientId: 'cilantro',
    region: 'pacific',
    servedPriceCents: 75,
    source: 'regional_market',
    confidenceTier: 'low',
    confidenceScore: 0.45,
  },
]

test('weekly validation samples configured ingredient and region set without live dependencies', () => {
  const report = runWeeklyAccuracyValidation({
    configuredSamples,
    servedPrices,
    groundTruthPrices,
    generatedAt: '2026-05-15T19:30:00.000Z',
  })

  assert.equal(report.generatedAt, '2026-05-15T19:30:00.000Z')
  assert.equal(report.configuredSampleCount, 4)
  assert.equal(report.comparedSampleCount, 4)
  assert.equal(report.missingSampleCount, 0)
  assert.deepEqual(
    report.comparisons.map((comparison) => `${comparison.ingredientId}:${comparison.region}`),
    ['apple:northeast', 'chicken-breast:south', 'whole-milk:midwest', 'cilantro:pacific']
  )
})

test('weekly validation computes within-15 accuracy, mean error, and worst dimensions', () => {
  const report = runWeeklyAccuracyValidation({
    configuredSamples,
    servedPrices,
    groundTruthPrices,
  })

  assert.equal(report.withinSlaCount, 2)
  assert.equal(report.outsideSlaCount, 2)
  assert.equal(report.withinSlaPct, 50)
  assert.equal(report.meanAbsoluteErrorPct, 18.8)
  assert.equal(report.targetMet, false)

  assert.equal(report.worst.category?.key, 'dairy')
  assert.equal(report.worst.category?.meanAbsoluteErrorPct, 30)
  assert.equal(report.worst.region?.key, 'midwest')
  assert.equal(report.worst.source?.key, 'national_median')
})

test('weekly validation reports confidence tier calibration and proof contract trust', () => {
  const report = runWeeklyAccuracyValidation({
    configuredSamples,
    servedPrices,
    groundTruthPrices,
  })

  const high = report.confidenceCalibration.find((tier) => tier.confidenceTier === 'high')
  const medium = report.confidenceCalibration.find((tier) => tier.confidenceTier === 'medium')

  assert.equal(high?.comparisons, 2)
  assert.equal(high?.withinSlaPct, 50)
  assert.equal(high?.expectedWithinSlaPct, 90)
  assert.equal(high?.calibrated, false)
  assert.equal(medium?.expectedWithinSlaPct, 75)
  assert.equal(medium?.calibrationGapPct, 25)
  assert.equal(medium?.calibrated, false)

  assert.equal(report.comparisons[0]?.trustLevel, 'confirmed_local_buyable')
  assert.equal(report.comparisons[0]?.confidenceTier, 'high')
})

test('weekly validation flags regression threshold from prior baseline', () => {
  const report = runWeeklyAccuracyValidation({
    configuredSamples,
    servedPrices,
    groundTruthPrices,
    priorWithinSlaPct: 62,
    regressionThresholdPct: 10,
  })

  assert.equal(report.priorWithinSlaPct, 62)
  assert.equal(report.regressionDeltaPct, -12)
  assert.equal(report.regressionFlagged, true)
})

test('weekly validation records missing samples instead of inventing comparisons', () => {
  const report = runWeeklyAccuracyValidation({
    configuredSamples,
    servedPrices: servedPrices.filter((sample) => sample.ingredientId !== 'cilantro'),
    groundTruthPrices,
  })

  assert.equal(report.comparedSampleCount, 3)
  assert.equal(report.missingSampleCount, 1)
  assert.equal(report.missingSamples[0]?.ingredientId, 'cilantro')
})
