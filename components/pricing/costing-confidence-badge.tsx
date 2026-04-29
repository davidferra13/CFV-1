'use client'

import {
  getCostConfidencePresentation,
  getCostConfidenceStatus,
} from '@/lib/pricing/cost-confidence'

interface CostingConfidenceBadgeProps {
  coveragePct: number | null
  avgConfidence?: number | null
  minConfidence?: number | null
  lowConfidenceCount?: number | null
  missingPriceCount?: number | null
  stalePriceCount?: number | null
  unitMismatchCount?: number | null
  estimatedPriceCount?: number | null
  size?: 'sm' | 'md'
  isPartial?: boolean
}

function confidenceLabel(avg: number): { text: string; color: string; bgColor: string } {
  if (avg >= 0.8)
    return {
      text: 'High trust',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-900/60 border-emerald-700/40',
    }
  if (avg >= 0.5)
    return {
      text: 'Mixed trust',
      color: 'text-amber-400',
      bgColor: 'bg-amber-900/60 border-amber-700/40',
    }
  return { text: 'Low trust', color: 'text-red-400', bgColor: 'bg-red-900/60 border-red-700/40' }
}

function confidenceTooltip(
  coveragePct: number | null,
  avgConfidence: number | null | undefined,
  minConfidence: number | null | undefined,
  lowConfidenceCount: number | null | undefined,
  missingPriceCount: number | null | undefined,
  stalePriceCount: number | null | undefined,
  unitMismatchCount: number | null | undefined,
  estimatedPriceCount: number | null | undefined,
  statusTitle: string
): string {
  const parts: string[] = []
  parts.push(statusTitle)
  if (coveragePct !== null) parts.push(`${coveragePct}% of ingredients priced`)
  if (avgConfidence != null) parts.push(`Avg confidence: ${Math.round(avgConfidence * 100)}%`)
  if (minConfidence != null) parts.push(`Weakest: ${Math.round(minConfidence * 100)}%`)
  if (missingPriceCount != null && missingPriceCount > 0) {
    parts.push(`${missingPriceCount} missing price${missingPriceCount > 1 ? 's' : ''}`)
  }
  if (stalePriceCount != null && stalePriceCount > 0) {
    parts.push(`${stalePriceCount} stale price${stalePriceCount > 1 ? 's' : ''}`)
  }
  if (unitMismatchCount != null && unitMismatchCount > 0) {
    parts.push(`${unitMismatchCount} unit mismatch${unitMismatchCount > 1 ? 'es' : ''}`)
  }
  if (estimatedPriceCount != null && estimatedPriceCount > 0) {
    parts.push(`${estimatedPriceCount} estimated price${estimatedPriceCount > 1 ? 's' : ''}`)
  }
  if (lowConfidenceCount != null && lowConfidenceCount > 0) {
    parts.push(
      `${lowConfidenceCount} ingredient${lowConfidenceCount > 1 ? 's' : ''} below 50% confidence`
    )
  }
  return parts.join(' | ') || 'No pricing data'
}

export function CostingConfidenceBadge({
  coveragePct,
  avgConfidence,
  minConfidence,
  lowConfidenceCount,
  missingPriceCount,
  stalePriceCount,
  unitMismatchCount,
  estimatedPriceCount,
  size = 'sm',
  isPartial = false,
}: CostingConfidenceBadgeProps) {
  const hasExplicitSignals =
    (missingPriceCount ?? 0) > 0 ||
    (stalePriceCount ?? 0) > 0 ||
    (unitMismatchCount ?? 0) > 0 ||
    (estimatedPriceCount ?? 0) > 0 ||
    (lowConfidenceCount ?? 0) > 0 ||
    avgConfidence != null ||
    minConfidence != null

  if (coveragePct === null && !isPartial && !hasExplicitSignals) return null

  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'
  const status = getCostConfidenceStatus({
    coveragePct,
    avgConfidence,
    minConfidence,
    lowConfidenceCount,
    missingPriceCount,
    stalePriceCount,
    unitMismatchCount,
    estimatedPriceCount,
    isPartial,
  })
  const statusPresentation = getCostConfidencePresentation(status)
  const tooltip = confidenceTooltip(
    coveragePct,
    avgConfidence,
    minConfidence,
    lowConfidenceCount,
    missingPriceCount,
    stalePriceCount,
    unitMismatchCount,
    estimatedPriceCount,
    statusPresentation.title
  )

  if (status !== 'complete') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded border ${statusPresentation.bgColor} ${statusPresentation.color} ${sizeClass} font-medium`}
        title={tooltip}
      >
        {statusPresentation.label}
      </span>
    )
  }

  // All priced: preserve the existing confidence quality labels for complete coverage.
  const pct = coveragePct ?? 0

  // Fully priced: color by confidence quality, not just coverage
  if (avgConfidence != null) {
    const conf = confidenceLabel(avgConfidence)
    return (
      <span
        className={`inline-flex items-center gap-1 rounded border ${conf.bgColor} ${conf.color} ${sizeClass} font-medium`}
        title={tooltip}
      >
        {conf.text}
        {lowConfidenceCount != null && lowConfidenceCount > 0 && (
          <span className="opacity-70">({lowConfidenceCount})</span>
        )}
      </span>
    )
  }

  // Fallback: no confidence data yet, show coverage only
  return (
    <span
      className={`inline-flex items-center rounded border bg-emerald-900/60 text-emerald-400 border-emerald-700/40 ${sizeClass} font-medium`}
      title={tooltip}
    >
      {pct}%
    </span>
  )
}
