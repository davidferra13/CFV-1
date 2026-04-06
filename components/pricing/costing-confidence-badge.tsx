'use client'

interface CostingConfidenceBadgeProps {
  coveragePct: number | null
  avgConfidence?: number | null
  minConfidence?: number | null
  lowConfidenceCount?: number | null
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
  lowConfidenceCount: number | null | undefined
): string {
  const parts: string[] = []
  if (coveragePct !== null) parts.push(`${coveragePct}% of ingredients priced`)
  if (avgConfidence != null) parts.push(`Avg confidence: ${Math.round(avgConfidence * 100)}%`)
  if (minConfidence != null) parts.push(`Weakest: ${Math.round(minConfidence * 100)}%`)
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
  size = 'sm',
  isPartial = false,
}: CostingConfidenceBadgeProps) {
  if (coveragePct === null && !isPartial) return null

  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'
  const tooltip = confidenceTooltip(coveragePct, avgConfidence, minConfidence, lowConfidenceCount)

  // Missing prices: show "Partial" in amber
  if (isPartial || (coveragePct !== null && coveragePct > 0 && coveragePct < 100)) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded border bg-amber-900/60 text-amber-400 border-amber-700/40 ${sizeClass} font-medium`}
        title={tooltip}
      >
        Partial
      </span>
    )
  }

  // All priced (or none): show coverage + confidence quality
  const pct = coveragePct ?? 0

  // No prices at all
  if (pct === 0) {
    return (
      <span
        className={`inline-flex items-center rounded border bg-red-900/60 text-red-400 border-red-700/40 ${sizeClass} font-medium`}
        title={tooltip}
      >
        0%
      </span>
    )
  }

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
