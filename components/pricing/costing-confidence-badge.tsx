'use client'

interface CostingConfidenceBadgeProps {
  coveragePct: number | null
  avgConfidence?: number | null
  size?: 'sm' | 'md'
}

export function CostingConfidenceBadge({
  coveragePct,
  avgConfidence,
  size = 'sm',
}: CostingConfidenceBadgeProps) {
  if (coveragePct === null) return null

  const color =
    coveragePct >= 90
      ? 'bg-emerald-900/60 text-emerald-400 border-emerald-700/40'
      : coveragePct >= 60
        ? 'bg-amber-900/60 text-amber-400 border-amber-700/40'
        : 'bg-red-900/60 text-red-400 border-red-700/40'

  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'

  const tooltip = avgConfidence
    ? `${coveragePct}% coverage, avg confidence: ${avgConfidence.toFixed(2)}`
    : `${coveragePct}% of ingredients priced`

  return (
    <span
      className={`inline-flex items-center rounded border ${color} ${sizeClass} font-medium`}
      title={tooltip}
    >
      {coveragePct}%
    </span>
  )
}
