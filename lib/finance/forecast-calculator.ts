// Revenue Forecast Calculator - Pure functions for deterministic pipeline math.
// Formula > AI: all calculations are pure math, zero LLM dependency.

// Pipeline probability weights by event status (deterministic, not AI)
export const STAGE_WEIGHTS: Record<string, number> = {
  draft: 0.1,
  proposed: 0.25,
  accepted: 0.5,
  paid: 0.75,
  confirmed: 0.9,
  in_progress: 0.95,
  completed: 1.0,
  cancelled: 0,
}

export const STAGE_LABELS: Record<string, string> = {
  draft: 'Draft',
  proposed: 'Proposed',
  accepted: 'Accepted',
  paid: 'Paid',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export type MonthlyDataPoint = {
  month: string // "YYYY-MM"
  revenueCents: number
}

export type ForecastCalibrationPoint = {
  month: string
  projectedCents: number
  actualCents: number
  absoluteErrorCents: number
  absoluteErrorPercent: number
}

export type ForecastCalibration = {
  sampleSize: number
  meanAbsolutePercentError: number | null
  meanAbsoluteCents: number
  biasPercent: number | null
  backtest: ForecastCalibrationPoint[]
}

export type ForecastConfidenceLevel = 'high' | 'moderate' | 'low' | 'very_limited'

export type ForecastConfidence = {
  level: ForecastConfidenceLevel
  label: string
  scorePercent: number
  dataMonthsAvailable: number
  calibrationMonths: number
  meanAbsoluteErrorPercent: number | null
  biasPercent: number | null
  recentVolatilityPercent: number | null
  visibleRevenueCoveragePercent: number
}

export type ForecastDriver = {
  id: string
  label: string
  value: string
  detail: string
  tone: 'positive' | 'neutral' | 'caution'
}

export type ForecastExplainability = {
  methodology: string[]
  drivers: ForecastDriver[]
}

export type MonthlyForecastCompositionInput = {
  bookedRevenueCents: number
  pipelineRevenueCents: number
  pipelineOpenRevenueCents: number
  historicalBaselineCents: number
  errorRate: number
}

export type MonthlyForecastComposition = {
  historicalFillCents: number
  expectedRevenueCents: number
  lowRevenueCents: number
  highRevenueCents: number
  visibleRevenueCoveragePercent: number
}

/**
 * Apply pipeline probability weight to revenue based on event status.
 */
export function weightByStage(revenueCents: number, status: string): number {
  const weight = STAGE_WEIGHTS[status] ?? 0
  return Math.round(revenueCents * weight)
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function calculateTrailingAverage(
  monthlyData: MonthlyDataPoint[],
  trailingMonths = 6
): number {
  if (monthlyData.length === 0) return 0

  const sorted = [...monthlyData].sort((a, b) => a.month.localeCompare(b.month))
  const trailingWindow = sorted.slice(-Math.max(1, trailingMonths))

  return trailingWindow.reduce((sum, d) => sum + d.revenueCents, 0) / trailingWindow.length
}

/**
 * Calculate seasonal index from historical monthly data.
 * Returns 12-element array (index 0 = January) with multipliers.
 * A multiplier of 1.2 means that month is typically 20% above average.
 */
export function calculateSeasonalIndex(monthlyData: MonthlyDataPoint[]): number[] {
  if (monthlyData.length === 0) return new Array(12).fill(1.0)

  const byMonth: Record<number, number[]> = {}
  for (let i = 1; i <= 12; i++) byMonth[i] = []

  for (const d of monthlyData) {
    const monthNum = parseInt(d.month.split('-')[1], 10)
    if (monthNum >= 1 && monthNum <= 12) {
      byMonth[monthNum].push(d.revenueCents)
    }
  }

  const totalRevenue = monthlyData.reduce((sum, d) => sum + d.revenueCents, 0)
  const avgPerMonth = totalRevenue / monthlyData.length

  if (avgPerMonth === 0) return new Array(12).fill(1.0)

  const indices: number[] = []
  for (let i = 1; i <= 12; i++) {
    const vals = byMonth[i]
    if (vals.length === 0) {
      indices.push(1.0)
    } else {
      const monthAvg = vals.reduce((s, v) => s + v, 0) / vals.length
      indices.push(monthAvg / avgPerMonth)
    }
  }

  return indices
}

/**
 * Project revenue for the next N months using trailing average with seasonal adjustment.
 */
export function projectNextMonths(
  historicalData: MonthlyDataPoint[],
  months: number,
  startMonth?: string // "YYYY-MM", defaults to current month + 1
): Array<{ month: string; projectedCents: number }> {
  if (historicalData.length === 0) return []

  const seasonalIndex = calculateSeasonalIndex(historicalData)
  const trailingAvg = calculateTrailingAverage(historicalData)

  const now = new Date()
  let startYear: number
  let startMonthNum: number

  if (startMonth) {
    const parts = startMonth.split('-')
    startYear = parseInt(parts[0], 10)
    startMonthNum = parseInt(parts[1], 10)
  } else {
    startYear = now.getFullYear()
    startMonthNum = now.getMonth() + 2
    if (startMonthNum > 12) {
      startMonthNum = 1
      startYear++
    }
  }

  const result: Array<{ month: string; projectedCents: number }> = []
  let year = startYear
  let mon = startMonthNum

  for (let i = 0; i < months; i++) {
    const idx = mon - 1
    const projected = Math.round(trailingAvg * seasonalIndex[idx])
    result.push({
      month: `${year}-${String(mon).padStart(2, '0')}`,
      projectedCents: Math.max(0, projected),
    })
    mon++
    if (mon > 12) {
      mon = 1
      year++
    }
  }

  return result
}

/**
 * Coefficient of variation over recent months.
 * Lower values mean the business is more predictable month to month.
 */
export function calculateRevenueVolatility(
  monthlyData: MonthlyDataPoint[],
  trailingMonths = 6
): number | null {
  if (monthlyData.length < 2) return null

  const sorted = [...monthlyData].sort((a, b) => a.month.localeCompare(b.month))
  const window = sorted.slice(-Math.max(2, trailingMonths))
  const mean = window.reduce((sum, d) => sum + d.revenueCents, 0) / window.length

  if (mean <= 0) return null

  const variance = window.reduce((sum, d) => sum + (d.revenueCents - mean) ** 2, 0) / window.length
  const stdDev = Math.sqrt(variance)

  return roundToOneDecimal((stdDev / mean) * 100)
}

function computeRelativeErrorPercent(projectedCents: number, actualCents: number): number {
  const denominator = Math.max(projectedCents, actualCents, 1)
  return roundToOneDecimal((Math.abs(projectedCents - actualCents) / denominator) * 100)
}

function computeSignedErrorPercent(projectedCents: number, actualCents: number): number {
  const denominator = Math.max(projectedCents, actualCents, 1)
  return roundToOneDecimal(((projectedCents - actualCents) / denominator) * 100)
}

/**
 * Backtest the seasonal baseline model against prior closed months.
 * This calibrates range width using the same deterministic formula the live forecast uses.
 */
export function backtestSeasonalForecast(
  historicalData: MonthlyDataPoint[],
  minTrainingMonths = 6,
  maxSamples = 6
): ForecastCalibration {
  const sorted = [...historicalData].sort((a, b) => a.month.localeCompare(b.month))
  const rawBacktest: ForecastCalibrationPoint[] = []

  for (let i = minTrainingMonths; i < sorted.length; i++) {
    const trainingData = sorted.slice(0, i)
    const target = sorted[i]
    const projection = projectNextMonths(trainingData, 1, target.month)[0]
    const projectedCents = projection?.projectedCents ?? 0
    const actualCents = target.revenueCents

    rawBacktest.push({
      month: target.month,
      projectedCents,
      actualCents,
      absoluteErrorCents: Math.abs(projectedCents - actualCents),
      absoluteErrorPercent: computeRelativeErrorPercent(projectedCents, actualCents),
    })
  }

  const backtest = rawBacktest.slice(-Math.max(0, maxSamples))

  if (backtest.length === 0) {
    return {
      sampleSize: 0,
      meanAbsolutePercentError: null,
      meanAbsoluteCents: 0,
      biasPercent: null,
      backtest: [],
    }
  }

  const meanAbsoluteCents = Math.round(
    backtest.reduce((sum, point) => sum + point.absoluteErrorCents, 0) / backtest.length
  )
  const meanAbsolutePercentError = roundToOneDecimal(
    backtest.reduce((sum, point) => sum + point.absoluteErrorPercent, 0) / backtest.length
  )
  const biasPercent = roundToOneDecimal(
    backtest.reduce(
      (sum, point) => sum + computeSignedErrorPercent(point.projectedCents, point.actualCents),
      0
    ) / backtest.length
  )

  return {
    sampleSize: backtest.length,
    meanAbsolutePercentError,
    meanAbsoluteCents,
    biasPercent,
    backtest,
  }
}

export function resolveForecastErrorRate(
  calibration: ForecastCalibration,
  dataMonthsAvailable: number
): number {
  if (calibration.sampleSize >= 3 && calibration.meanAbsolutePercentError != null) {
    return clamp(calibration.meanAbsolutePercentError / 100, 0.12, 0.45)
  }

  if (dataMonthsAvailable >= 12) return 0.22
  if (dataMonthsAvailable >= 6) return 0.28
  if (dataMonthsAvailable >= 3) return 0.35
  return 0.45
}

/**
 * Build a forecast month from visible revenue (booked + weighted pipeline),
 * then fill only the remaining gap to the seasonal historical baseline.
 */
export function buildMonthlyForecastComposition(
  input: MonthlyForecastCompositionInput
): MonthlyForecastComposition {
  const visibleRevenueCents = input.bookedRevenueCents + input.pipelineRevenueCents
  const historicalFillCents = Math.max(0, input.historicalBaselineCents - visibleRevenueCents)
  const expectedRevenueCents = visibleRevenueCents + historicalFillCents
  const lowRevenueCents = Math.max(
    input.bookedRevenueCents,
    Math.round(expectedRevenueCents * (1 - input.errorRate))
  )
  const highRevenueCents = Math.max(
    expectedRevenueCents,
    input.bookedRevenueCents + input.pipelineOpenRevenueCents,
    Math.round(expectedRevenueCents * (1 + input.errorRate))
  )

  return {
    historicalFillCents,
    expectedRevenueCents,
    lowRevenueCents,
    highRevenueCents,
    visibleRevenueCoveragePercent:
      expectedRevenueCents > 0 ? Math.round((visibleRevenueCents / expectedRevenueCents) * 100) : 0,
  }
}

export function buildForecastConfidence(params: {
  dataMonthsAvailable: number
  calibration: ForecastCalibration
  recentVolatilityPercent: number | null
  visibleRevenueCoveragePercent: number
}): ForecastConfidence {
  const {
    dataMonthsAvailable,
    calibration,
    recentVolatilityPercent,
    visibleRevenueCoveragePercent,
  } = params

  const dataScore = clamp(dataMonthsAvailable / 12, 0, 1)
  const calibrationScore =
    calibration.sampleSize === 0 || calibration.meanAbsolutePercentError == null
      ? 0.25
      : clamp(1 - calibration.meanAbsolutePercentError / 50, 0, 1)
  const volatilityScore =
    recentVolatilityPercent == null ? 0.5 : clamp(1 - recentVolatilityPercent / 60, 0, 1)
  const coverageScore = clamp(visibleRevenueCoveragePercent / 100, 0, 1)

  const scorePercent = Math.round(
    (dataScore * 0.25 + calibrationScore * 0.35 + volatilityScore * 0.15 + coverageScore * 0.25) *
      100
  )

  let level: ForecastConfidenceLevel
  if (dataMonthsAvailable < 3) {
    level = 'very_limited'
  } else if (scorePercent >= 75 && calibration.sampleSize >= 3) {
    level = 'high'
  } else if (scorePercent >= 60) {
    level = 'moderate'
  } else if (scorePercent >= 40) {
    level = 'low'
  } else {
    level = 'very_limited'
  }

  return {
    level,
    label:
      level === 'high'
        ? 'High confidence'
        : level === 'moderate'
          ? 'Moderate confidence'
          : level === 'low'
            ? 'Low confidence'
            : 'Very limited data',
    scorePercent,
    dataMonthsAvailable,
    calibrationMonths: calibration.sampleSize,
    meanAbsoluteErrorPercent: calibration.meanAbsolutePercentError,
    biasPercent: calibration.biasPercent,
    recentVolatilityPercent,
    visibleRevenueCoveragePercent,
  }
}

export function buildForecastExplainability(params: {
  confidence: ForecastConfidence
  historicalFillSharePercent: number
}): ForecastExplainability {
  const { confidence, historicalFillSharePercent } = params

  const drivers: ForecastDriver[] = [
    {
      id: 'history',
      label: 'History window',
      value: `${confidence.dataMonthsAvailable} closed months`,
      detail:
        confidence.dataMonthsAvailable >= 12
          ? 'Strong seasonal coverage across the last year of completed-event revenue.'
          : confidence.dataMonthsAvailable >= 6
            ? 'Enough history for a usable seasonal curve, but still thin for edge months.'
            : 'Forecast is relying on a short history window and should be treated cautiously.',
      tone:
        confidence.dataMonthsAvailable >= 12
          ? 'positive'
          : confidence.dataMonthsAvailable >= 6
            ? 'neutral'
            : 'caution',
    },
    {
      id: 'calibration',
      label: 'Backtest error',
      value:
        confidence.meanAbsoluteErrorPercent == null
          ? 'Not calibrated yet'
          : `${confidence.meanAbsoluteErrorPercent}% MAE`,
      detail:
        confidence.meanAbsoluteErrorPercent == null
          ? 'There are not enough closed months yet to backtest the seasonal baseline cleanly.'
          : `Range width is calibrated from ${confidence.calibrationMonths} prior closed months using the same seasonal model.`,
      tone:
        confidence.meanAbsoluteErrorPercent == null
          ? 'caution'
          : confidence.meanAbsoluteErrorPercent <= 15
            ? 'positive'
            : confidence.meanAbsoluteErrorPercent <= 28
              ? 'neutral'
              : 'caution',
    },
    {
      id: 'coverage',
      label: 'Visible coverage',
      value: `${confidence.visibleRevenueCoveragePercent}% on calendar`,
      detail:
        confidence.visibleRevenueCoveragePercent >= 80
          ? 'Most forecasted revenue is already visible in booked or dated pipeline events.'
          : confidence.visibleRevenueCoveragePercent >= 50
            ? 'The forecast blends live pipeline with seasonal fill for the remaining gap.'
            : 'A large share of the forecast is coming from historical seasonal fill, not live bookings yet.',
      tone:
        confidence.visibleRevenueCoveragePercent >= 80
          ? 'positive'
          : confidence.visibleRevenueCoveragePercent >= 50
            ? 'neutral'
            : 'caution',
    },
    {
      id: 'volatility',
      label: 'Recent volatility',
      value:
        confidence.recentVolatilityPercent == null
          ? 'Insufficient data'
          : `${confidence.recentVolatilityPercent}%`,
      detail:
        confidence.recentVolatilityPercent == null
          ? 'Not enough recent completed months to score month-to-month stability.'
          : 'Coefficient of variation across recent closed months. Lower is more predictable.',
      tone:
        confidence.recentVolatilityPercent == null
          ? 'neutral'
          : confidence.recentVolatilityPercent <= 20
            ? 'positive'
            : confidence.recentVolatilityPercent <= 35
              ? 'neutral'
              : 'caution',
    },
    {
      id: 'seasonal-fill',
      label: 'Seasonal fill share',
      value: `${historicalFillSharePercent}%`,
      detail:
        historicalFillSharePercent <= 20
          ? 'Most of the outlook is supported by visible booked and pipeline revenue.'
          : historicalFillSharePercent <= 40
            ? 'Part of the outlook assumes normal booking cadence will fill the remaining gap.'
            : 'A large portion of the outlook depends on historical seasonality repeating.',
      tone:
        historicalFillSharePercent <= 20
          ? 'positive'
          : historicalFillSharePercent <= 40
            ? 'neutral'
            : 'caution',
    },
  ]

  return {
    methodology: [
      'Booked revenue uses completed, paid, confirmed, and in-progress events tied to the month.',
      'Pipeline revenue applies the live event-stage weights already used elsewhere in finance.',
      'If visible revenue is below the seasonal baseline, the model fills only that gap from history.',
      'Confidence ranges are widened or tightened from backtesting prior closed months with the same baseline formula.',
    ],
    drivers,
  }
}
