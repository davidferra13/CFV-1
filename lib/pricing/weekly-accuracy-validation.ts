import type {
  BuyablePriceContract,
  BuyablePriceTrustLevel,
} from '@/lib/pricing/buyable-price-contract'

export const WEEKLY_ACCURACY_SLA_THRESHOLD_PCT = 15
export const DEFAULT_WEEKLY_ACCURACY_TARGET_PCT = 90
export const DEFAULT_WEEKLY_ACCURACY_REGRESSION_THRESHOLD_PCT = 5

export type WeeklyAccuracyConfidenceTier = BuyablePriceContract['confidenceLabel']

export interface WeeklyAccuracyConfiguredSample {
  ingredientId: string
  ingredientName: string
  category: string
  region: string
}

export interface WeeklyAccuracyServedPriceSample {
  ingredientId: string
  region: string
  servedPriceCents: number | null
  source: string
  confidenceTier: WeeklyAccuracyConfidenceTier
  confidenceScore?: number
  priceProof?: Pick<BuyablePriceContract, 'confidenceLabel' | 'trustLevel' | 'proof'>
}

export interface WeeklyAccuracyGroundTruthSample {
  ingredientId: string
  region: string
  groundTruthPriceCents: number
  source: string
  observedAt: string
}

export interface WeeklyAccuracyValidationInput {
  configuredSamples: WeeklyAccuracyConfiguredSample[]
  servedPrices: WeeklyAccuracyServedPriceSample[]
  groundTruthPrices: WeeklyAccuracyGroundTruthSample[]
  priorWithinSlaPct?: number | null
  targetWithinSlaPct?: number
  regressionThresholdPct?: number
  generatedAt?: string
}

export interface WeeklyAccuracyValidationComparison {
  ingredientId: string
  ingredientName: string
  category: string
  region: string
  servedPriceCents: number
  groundTruthPriceCents: number
  servedSource: string
  groundTruthSource: string
  confidenceTier: WeeklyAccuracyConfidenceTier
  confidenceScore: number | null
  trustLevel: BuyablePriceTrustLevel | null
  absoluteErrorPct: number
  withinSla: boolean
}

export interface WeeklyAccuracyGroupSummary {
  key: string
  comparisons: number
  withinSlaPct: number
  meanAbsoluteErrorPct: number
}

export interface WeeklyAccuracyWorstSummary extends WeeklyAccuracyGroupSummary {
  dimension: 'category' | 'region' | 'source'
}

export interface WeeklyAccuracyConfidenceCalibration extends WeeklyAccuracyGroupSummary {
  confidenceTier: WeeklyAccuracyConfidenceTier
  expectedWithinSlaPct: number
  calibrationGapPct: number
  calibrated: boolean
}

export interface WeeklyAccuracyValidationReport {
  generatedAt: string
  configuredSampleCount: number
  comparedSampleCount: number
  missingSampleCount: number
  withinSlaCount: number
  outsideSlaCount: number
  withinSlaPct: number
  meanAbsoluteErrorPct: number
  targetWithinSlaPct: number
  targetMet: boolean
  priorWithinSlaPct: number | null
  regressionThresholdPct: number
  regressionFlagged: boolean
  regressionDeltaPct: number | null
  worst: {
    category: WeeklyAccuracyWorstSummary | null
    region: WeeklyAccuracyWorstSummary | null
    source: WeeklyAccuracyWorstSummary | null
  }
  confidenceCalibration: WeeklyAccuracyConfidenceCalibration[]
  comparisons: WeeklyAccuracyValidationComparison[]
  missingSamples: WeeklyAccuracyConfiguredSample[]
}

type SampleKey = `${string}::${string}`

const CONFIDENCE_EXPECTED_WITHIN_SLA: Record<WeeklyAccuracyConfidenceTier, number> = {
  high: 90,
  medium: 75,
  low: 55,
  none: 0,
}

function sampleKey(sample: { ingredientId: string; region: string }): SampleKey {
  return `${sample.ingredientId}::${sample.region}`
}

function roundPct(value: number): number {
  return Math.round(value * 10) / 10
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function summarizeGroup(key: string, comparisons: WeeklyAccuracyValidationComparison[]) {
  const withinCount = comparisons.filter((comparison) => comparison.withinSla).length

  return {
    key,
    comparisons: comparisons.length,
    withinSlaPct: roundPct((withinCount / comparisons.length) * 100),
    meanAbsoluteErrorPct: roundPct(
      mean(comparisons.map((comparison) => comparison.absoluteErrorPct))
    ),
  }
}

function groupBy(
  comparisons: WeeklyAccuracyValidationComparison[],
  keyFor: (comparison: WeeklyAccuracyValidationComparison) => string
): WeeklyAccuracyGroupSummary[] {
  const groups = new Map<string, WeeklyAccuracyValidationComparison[]>()

  for (const comparison of comparisons) {
    const key = keyFor(comparison)
    groups.set(key, [...(groups.get(key) ?? []), comparison])
  }

  return Array.from(groups.entries()).map(([key, group]) => summarizeGroup(key, group))
}

function worstGroup(
  dimension: WeeklyAccuracyWorstSummary['dimension'],
  groups: WeeklyAccuracyGroupSummary[]
): WeeklyAccuracyWorstSummary | null {
  const [worst] = [...groups].sort((left, right) => {
    if (right.meanAbsoluteErrorPct !== left.meanAbsoluteErrorPct) {
      return right.meanAbsoluteErrorPct - left.meanAbsoluteErrorPct
    }

    return left.withinSlaPct - right.withinSlaPct
  })

  return worst ? { ...worst, dimension } : null
}

export function runWeeklyAccuracyValidation(
  input: WeeklyAccuracyValidationInput
): WeeklyAccuracyValidationReport {
  const servedByKey = new Map(input.servedPrices.map((sample) => [sampleKey(sample), sample]))
  const groundTruthByKey = new Map(
    input.groundTruthPrices.map((sample) => [sampleKey(sample), sample])
  )
  const comparisons: WeeklyAccuracyValidationComparison[] = []
  const missingSamples: WeeklyAccuracyConfiguredSample[] = []

  for (const configured of input.configuredSamples) {
    const served = servedByKey.get(sampleKey(configured))
    const groundTruth = groundTruthByKey.get(sampleKey(configured))

    if (
      !served ||
      !groundTruth ||
      served.servedPriceCents === null ||
      served.servedPriceCents <= 0 ||
      groundTruth.groundTruthPriceCents <= 0
    ) {
      missingSamples.push(configured)
      continue
    }

    const absoluteErrorPct = roundPct(
      (Math.abs(served.servedPriceCents - groundTruth.groundTruthPriceCents) /
        groundTruth.groundTruthPriceCents) *
        100
    )

    comparisons.push({
      ingredientId: configured.ingredientId,
      ingredientName: configured.ingredientName,
      category: configured.category,
      region: configured.region,
      servedPriceCents: served.servedPriceCents,
      groundTruthPriceCents: groundTruth.groundTruthPriceCents,
      servedSource: served.source,
      groundTruthSource: groundTruth.source,
      confidenceTier: served.priceProof?.confidenceLabel ?? served.confidenceTier,
      confidenceScore: served.confidenceScore ?? null,
      trustLevel: served.priceProof?.trustLevel ?? null,
      absoluteErrorPct,
      withinSla: absoluteErrorPct <= WEEKLY_ACCURACY_SLA_THRESHOLD_PCT,
    })
  }

  const withinSlaCount = comparisons.filter((comparison) => comparison.withinSla).length
  const outsideSlaCount = comparisons.length - withinSlaCount
  const withinSlaPct =
    comparisons.length > 0 ? roundPct((withinSlaCount / comparisons.length) * 100) : 0
  const meanAbsoluteErrorPct = roundPct(
    mean(comparisons.map((comparison) => comparison.absoluteErrorPct))
  )
  const targetWithinSlaPct = input.targetWithinSlaPct ?? DEFAULT_WEEKLY_ACCURACY_TARGET_PCT
  const regressionThresholdPct =
    input.regressionThresholdPct ?? DEFAULT_WEEKLY_ACCURACY_REGRESSION_THRESHOLD_PCT
  const priorWithinSlaPct = input.priorWithinSlaPct ?? null
  const regressionDeltaPct =
    priorWithinSlaPct === null ? null : roundPct(withinSlaPct - priorWithinSlaPct)

  const categoryGroups = groupBy(comparisons, (comparison) => comparison.category)
  const regionGroups = groupBy(comparisons, (comparison) => comparison.region)
  const sourceGroups = groupBy(comparisons, (comparison) => comparison.servedSource)

  const confidenceCalibration = groupBy(comparisons, (comparison) => comparison.confidenceTier).map(
    (group) => {
      const confidenceTier = group.key as WeeklyAccuracyConfidenceTier
      const expectedWithinSlaPct = CONFIDENCE_EXPECTED_WITHIN_SLA[confidenceTier]
      const calibrationGapPct = roundPct(group.withinSlaPct - expectedWithinSlaPct)

      return {
        ...group,
        confidenceTier,
        expectedWithinSlaPct,
        calibrationGapPct,
        calibrated: Math.abs(calibrationGapPct) <= WEEKLY_ACCURACY_SLA_THRESHOLD_PCT,
      }
    }
  )

  return {
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    configuredSampleCount: input.configuredSamples.length,
    comparedSampleCount: comparisons.length,
    missingSampleCount: missingSamples.length,
    withinSlaCount,
    outsideSlaCount,
    withinSlaPct,
    meanAbsoluteErrorPct,
    targetWithinSlaPct,
    targetMet: withinSlaPct >= targetWithinSlaPct,
    priorWithinSlaPct,
    regressionThresholdPct,
    regressionFlagged:
      regressionDeltaPct !== null && regressionDeltaPct <= -Math.abs(regressionThresholdPct),
    regressionDeltaPct,
    worst: {
      category: worstGroup('category', categoryGroups),
      region: worstGroup('region', regionGroups),
      source: worstGroup('source', sourceGroups),
    },
    confidenceCalibration,
    comparisons,
    missingSamples,
  }
}
