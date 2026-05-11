import type { PriceTrend } from '@/lib/reports/vendor-comparison'

export function PriceTrendArrow({ trend }: { trend: PriceTrend | null }) {
  if (!trend) {
    return <span className="text-stone-600 text-xs">-</span>
  }

  if (trend.direction === 'flat') {
    return (
      <span className="text-stone-400 text-xs" title="Stable price">
        {'\u2192'} 0%
      </span>
    )
  }

  if (trend.direction === 'up') {
    return (
      <span
        className="text-red-400 text-xs font-medium"
        title={`Up from ${(trend.previousPriceCents / 100).toFixed(2)}`}
      >
        {'\u2191'} {Math.abs(trend.changePercent).toFixed(1)}%
      </span>
    )
  }

  return (
    <span
      className="text-green-400 text-xs font-medium"
      title={`Down from ${(trend.previousPriceCents / 100).toFixed(2)}`}
    >
      {'\u2193'} {Math.abs(trend.changePercent).toFixed(1)}%
    </span>
  )
}
