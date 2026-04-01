'use client'

interface CostingConfidenceBadgeProps {
  // Pass 100 for fully priced, 0 for no prices, any value in between for partial.
  // Pass null to hide the badge entirely (no data available yet).
  // Do NOT pass 50 as a proxy for "some but not all" - use the actual ratio or
  // let the caller pass isPartial=true to get an honest "Partial" label.
  coveragePct: number | null
  avgConfidence?: number | null
  size?: 'sm' | 'md'
  // When the data source only provides a boolean (has_all_prices: false) and
  // cannot supply the real ratio, set isPartial=true to show "Partial" instead
  // of a fabricated percentage.
  isPartial?: boolean
}

export function CostingConfidenceBadge({
  coveragePct,
  avgConfidence,
  size = 'sm',
  isPartial = false,
}: CostingConfidenceBadgeProps) {
  if (coveragePct === null && !isPartial) return null

  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'

  // Explicit partial state: boolean data source, unknown actual ratio.
  // Show "Partial" in amber rather than a fabricated percentage.
  if (isPartial || (coveragePct !== null && coveragePct > 0 && coveragePct < 100)) {
    const tooltip = 'Some ingredients are missing price data'
    return (
      <span
        className={`inline-flex items-center rounded border bg-amber-900/60 text-amber-400 border-amber-700/40 ${sizeClass} font-medium`}
        title={tooltip}
      >
        Partial
      </span>
    )
  }

  // Fully priced or fully unpriced - show the real number.
  const pct = coveragePct ?? 0
  const color =
    pct >= 90
      ? 'bg-emerald-900/60 text-emerald-400 border-emerald-700/40'
      : 'bg-red-900/60 text-red-400 border-red-700/40'

  const tooltip = avgConfidence
    ? `${pct}% coverage, avg confidence: ${avgConfidence.toFixed(2)}`
    : `${pct}% of ingredients priced`

  return (
    <span
      className={`inline-flex items-center rounded border ${color} ${sizeClass} font-medium`}
      title={tooltip}
    >
      {pct}%
    </span>
  )
}
