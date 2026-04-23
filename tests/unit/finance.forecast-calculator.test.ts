import test from 'node:test'
import assert from 'node:assert/strict'
import {
  backtestSeasonalForecast,
  buildForecastConfidence,
  buildMonthlyForecastComposition,
  calculateRevenueVolatility,
  type MonthlyDataPoint,
} from '@/lib/finance/forecast-calculator'

function buildSeasonalHistory(years: number): MonthlyDataPoint[] {
  const monthValues = [
    900000, 1100000, 1200000, 1500000, 1750000, 1900000, 2100000, 2050000, 1700000, 1450000,
    1250000, 1000000,
  ]

  const rows: MonthlyDataPoint[] = []
  for (let year = 0; year < years; year++) {
    const actualYear = 2024 + year
    monthValues.forEach((revenueCents, index) => {
      rows.push({
        month: `${actualYear}-${String(index + 1).padStart(2, '0')}`,
        revenueCents,
      })
    })
  }

  return rows
}

test('buildMonthlyForecastComposition fills only the historical gap and preserves booked floor', () => {
  const composition = buildMonthlyForecastComposition({
    bookedRevenueCents: 400000,
    pipelineRevenueCents: 200000,
    pipelineOpenRevenueCents: 500000,
    historicalBaselineCents: 900000,
    errorRate: 0.2,
  })

  assert.equal(composition.historicalFillCents, 300000)
  assert.equal(composition.expectedRevenueCents, 900000)
  assert.equal(composition.lowRevenueCents, 720000)
  assert.equal(composition.highRevenueCents, 1080000)
  assert.equal(composition.visibleRevenueCoveragePercent, 67)
})

test('buildMonthlyForecastComposition uses raw pipeline as the optimistic ceiling when it exceeds expected value', () => {
  const composition = buildMonthlyForecastComposition({
    bookedRevenueCents: 300000,
    pipelineRevenueCents: 100000,
    pipelineOpenRevenueCents: 500000,
    historicalBaselineCents: 700000,
    errorRate: 0.05,
  })

  assert.equal(composition.expectedRevenueCents, 700000)
  assert.equal(composition.highRevenueCents, 800000)
})

test('backtestSeasonalForecast calibrates cleanly on repeated seasonal history', () => {
  const calibration = backtestSeasonalForecast(buildSeasonalHistory(2))

  assert.equal(calibration.sampleSize, 6)
  assert.ok(calibration.meanAbsolutePercentError !== null)
  assert.ok(calibration.meanAbsolutePercentError! < 15)
  assert.ok(calibration.meanAbsoluteCents < 250000)
})

test('calculateRevenueVolatility returns a higher value for noisier revenue', () => {
  const stable: MonthlyDataPoint[] = [
    { month: '2026-01', revenueCents: 1000000 },
    { month: '2026-02', revenueCents: 1010000 },
    { month: '2026-03', revenueCents: 990000 },
    { month: '2026-04', revenueCents: 1005000 },
  ]
  const volatile: MonthlyDataPoint[] = [
    { month: '2026-01', revenueCents: 300000 },
    { month: '2026-02', revenueCents: 1700000 },
    { month: '2026-03', revenueCents: 500000 },
    { month: '2026-04', revenueCents: 2100000 },
  ]

  const stableVolatility = calculateRevenueVolatility(stable)
  const volatileVolatility = calculateRevenueVolatility(volatile)

  assert.ok(stableVolatility !== null)
  assert.ok(volatileVolatility !== null)
  assert.ok(volatileVolatility! > stableVolatility!)
})

test('buildForecastConfidence returns high confidence for deep, calibrated, visible revenue', () => {
  const confidence = buildForecastConfidence({
    dataMonthsAvailable: 18,
    calibration: {
      sampleSize: 6,
      meanAbsolutePercentError: 12,
      meanAbsoluteCents: 140000,
      biasPercent: -2,
      backtest: [],
    },
    recentVolatilityPercent: 14,
    visibleRevenueCoveragePercent: 88,
  })

  assert.equal(confidence.level, 'high')
  assert.ok(confidence.scorePercent >= 75)
})

test('buildForecastConfidence degrades to very limited data when history is too thin', () => {
  const confidence = buildForecastConfidence({
    dataMonthsAvailable: 2,
    calibration: {
      sampleSize: 0,
      meanAbsolutePercentError: null,
      meanAbsoluteCents: 0,
      biasPercent: null,
      backtest: [],
    },
    recentVolatilityPercent: null,
    visibleRevenueCoveragePercent: 25,
  })

  assert.equal(confidence.level, 'very_limited')
  assert.equal(confidence.label, 'Very limited data')
})
