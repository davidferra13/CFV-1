import type { PriceFreshness, ResolvedPrice, ResolutionTier } from './resolve-price'

export type PieReliabilityBucket =
  | 'direct_observed'
  | 'regional_observed'
  | 'national_observed'
  | 'estimated'
  | 'synthetic'
  | 'stale'
  | 'suspicious'

export interface PieReliabilityInput {
  resolutionTier: ResolutionTier | string
  sourceTier?: string | null
  confidence: number
  effectiveConfidence: number
  freshness: PriceFreshness | string
  confirmedAt?: string | null
  reason?: string | null
}

export interface PieReliabilityClassification {
  bucket: PieReliabilityBucket
  label: string
  isTrustworthyForExactCosting: boolean
  shouldShowEstimateLabel: boolean
  reason: string
}

export interface PricingReliabilitySummary {
  directObservedPct: number
  regionalObservedPct: number
  estimatedPct: number
  syntheticPct: number
  staleCount: number
  lowConfidenceCount: number
  trustGateStatus: 'pass' | 'watch' | 'block'
  trustGateReason: string
}

function isStale(input: PieReliabilityInput): boolean {
  if (input.freshness === 'stale' || input.freshness === 'none') return true
  if (!input.confirmedAt) return false
  return Date.now() - Date.parse(input.confirmedAt) > 90 * 86_400_000
}

export function classifyPieReliability(
  input: PieReliabilityInput | ResolvedPrice
): PieReliabilityClassification {
  if (input.effectiveConfidence < 0.12 || input.confidence < 0.12) {
    return {
      bucket: 'suspicious',
      label: 'Needs review',
      isTrustworthyForExactCosting: false,
      shouldShowEstimateLabel: true,
      reason: 'Confidence is below the trust gate.',
    }
  }

  if (isStale(input)) {
    return {
      bucket: 'stale',
      label: 'Stale estimate',
      isTrustworthyForExactCosting: false,
      shouldShowEstimateLabel: true,
      reason: 'Observed data is stale or missing a confirmation date.',
    }
  }

  switch (input.resolutionTier) {
    case 'chef_override':
    case 'chef_receipt':
    case 'wholesale':
    case 'zip_local':
      return {
        bucket: 'direct_observed',
        label: 'Observed',
        isTrustworthyForExactCosting: input.effectiveConfidence >= 0.55,
        shouldShowEstimateLabel: false,
        reason: 'Price is backed by a direct chef, wholesale, or local observation.',
      }
    case 'regional':
    case 'market_state':
      return {
        bucket: 'regional_observed',
        label: 'Regional',
        isTrustworthyForExactCosting: input.effectiveConfidence >= 0.45,
        shouldShowEstimateLabel: input.effectiveConfidence < 0.55,
        reason: 'Price is backed by regional observations.',
      }
    case 'market_national':
    case 'government':
    case 'historical':
      return {
        bucket: 'national_observed',
        label: 'National estimate',
        isTrustworthyForExactCosting: false,
        shouldShowEstimateLabel: true,
        reason: 'Price is not backed by current local or regional evidence.',
      }
    case 'category_baseline':
      return {
        bucket: 'estimated',
        label: 'Estimate',
        isTrustworthyForExactCosting: false,
        shouldShowEstimateLabel: true,
        reason: 'Price comes from a category baseline.',
      }
    case 'synthetic':
    case 'none':
    default:
      return {
        bucket: 'synthetic',
        label: 'Synthetic estimate',
        isTrustworthyForExactCosting: false,
        shouldShowEstimateLabel: true,
        reason: 'Price is synthetic fallback and must not be presented as observed truth.',
      }
  }
}

export function summarizeReliabilityBuckets(
  classifications: PieReliabilityClassification[]
): PricingReliabilitySummary {
  const total = classifications.length || 1
  const count = (bucket: PieReliabilityBucket) =>
    classifications.filter((classification) => classification.bucket === bucket).length
  const direct = count('direct_observed')
  const regional = count('regional_observed')
  const estimated = count('estimated') + count('national_observed')
  const synthetic = count('synthetic') + count('suspicious')
  const stale = count('stale')
  const lowConfidence = classifications.filter((item) => !item.isTrustworthyForExactCosting).length

  const syntheticPct = Math.round((synthetic / total) * 100)
  const stalePct = Math.round((stale / total) * 100)
  const lowConfidencePct = Math.round((lowConfidence / total) * 100)
  const trustGateStatus =
    syntheticPct >= 20 || stalePct >= 25 || lowConfidencePct >= 65
      ? 'block'
      : syntheticPct >= 8 || stalePct >= 12 || lowConfidencePct >= 40
        ? 'watch'
        : 'pass'

  return {
    directObservedPct: Math.round((direct / total) * 100),
    regionalObservedPct: Math.round((regional / total) * 100),
    estimatedPct: Math.round((estimated / total) * 100),
    syntheticPct,
    staleCount: stale,
    lowConfidenceCount: lowConfidence,
    trustGateStatus,
    trustGateReason:
      trustGateStatus === 'pass'
        ? 'Observed and regional coverage are within the trust gate.'
        : trustGateStatus === 'watch'
          ? 'Reliability is usable with estimate labels and monitoring.'
          : 'Do not present this pricing set as reliable exact costing.',
  }
}

export function summarizeRegionReliability(
  rows: Array<{ coveragePct: number; avgConfidence: number; freshestPrice: string | null }>
): PricingReliabilitySummary {
  return summarizeReliabilityBuckets(
    rows.map((row) =>
      classifyPieReliability({
        resolutionTier:
          row.coveragePct >= 70
            ? 'regional'
            : row.coveragePct >= 25
              ? 'market_national'
              : 'synthetic',
        confidence: row.avgConfidence,
        effectiveConfidence: row.avgConfidence,
        freshness: row.freshestPrice ? 'recent' : 'none',
        confirmedAt: row.freshestPrice,
      })
    )
  )
}
