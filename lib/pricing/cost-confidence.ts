export type CostConfidenceStatus =
  | 'complete'
  | 'stale_prices'
  | 'missing_prices'
  | 'unit_mismatch'
  | 'estimated'
  | 'unknown'

export interface CostConfidenceSignals {
  coveragePct?: number | null
  avgConfidence?: number | null
  minConfidence?: number | null
  lowConfidenceCount?: number | null
  missingPriceCount?: number | null
  stalePriceCount?: number | null
  unitMismatchCount?: number | null
  estimatedPriceCount?: number | null
  isPartial?: boolean
}

function hasPositiveCount(value: number | null | undefined): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function hasCoverageGap(coveragePct: number | null | undefined): boolean {
  return typeof coveragePct === 'number' && Number.isFinite(coveragePct) && coveragePct < 100
}

export function getCostConfidenceStatus(signals: CostConfidenceSignals): CostConfidenceStatus {
  const {
    coveragePct,
    avgConfidence,
    minConfidence,
    lowConfidenceCount,
    missingPriceCount,
    stalePriceCount,
    unitMismatchCount,
    estimatedPriceCount,
    isPartial,
  } = signals

  if (hasPositiveCount(unitMismatchCount)) return 'unit_mismatch'
  if (hasPositiveCount(missingPriceCount) || isPartial || hasCoverageGap(coveragePct)) {
    return 'missing_prices'
  }
  if (hasPositiveCount(stalePriceCount)) return 'stale_prices'
  if (
    hasPositiveCount(estimatedPriceCount) ||
    hasPositiveCount(lowConfidenceCount) ||
    (typeof avgConfidence === 'number' && Number.isFinite(avgConfidence) && avgConfidence < 0.8) ||
    (typeof minConfidence === 'number' && Number.isFinite(minConfidence) && minConfidence < 0.5)
  ) {
    return 'estimated'
  }
  if (coveragePct === null || coveragePct === undefined) return 'unknown'
  if (coveragePct === 100) return 'complete'
  return 'unknown'
}

export function getCostConfidencePresentation(status: CostConfidenceStatus): {
  label: string
  title: string
  color: string
  bgColor: string
} {
  switch (status) {
    case 'complete':
      return {
        label: 'Complete',
        title: 'All ingredients have current usable prices.',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-900/60 border-emerald-700/40',
      }
    case 'stale_prices':
      return {
        label: 'Stale prices',
        title: 'Some ingredient prices may need refreshing.',
        color: 'text-amber-400',
        bgColor: 'bg-amber-900/60 border-amber-700/40',
      }
    case 'missing_prices':
      return {
        label: 'Missing prices',
        title: 'Some ingredients are missing usable prices.',
        color: 'text-amber-400',
        bgColor: 'bg-amber-900/60 border-amber-700/40',
      }
    case 'unit_mismatch':
      return {
        label: 'Unit mismatch',
        title: 'Some ingredient units do not match priced units.',
        color: 'text-red-400',
        bgColor: 'bg-red-900/60 border-red-700/40',
      }
    case 'estimated':
      return {
        label: 'Estimated',
        title: 'Some prices are estimates or have low confidence.',
        color: 'text-amber-400',
        bgColor: 'bg-amber-900/60 border-amber-700/40',
      }
    case 'unknown':
      return {
        label: 'Unknown',
        title: 'Pricing confidence is not available.',
        color: 'text-red-400',
        bgColor: 'bg-red-900/60 border-red-700/40',
      }
  }
}
