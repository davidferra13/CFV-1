import { Card, CardContent } from '@/components/ui/card'
import type { WeeklyOpsMetricDelta } from '@/lib/reports/weekly-ops'

function formatValue(value: number, isCurrency: boolean): string {
  if (isCurrency) {
    return `$${(value / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }
  return value.toLocaleString()
}

export function MetricComparisonCard({
  label,
  delta,
  isCurrency = true,
  invertColors = false,
}: {
  label: string
  delta: WeeklyOpsMetricDelta
  isCurrency?: boolean
  invertColors?: boolean
}) {
  const isUp = delta.direction === 'up'
  const isDown = delta.direction === 'down'

  // For expenses, "up" is bad and "down" is good (inverted)
  const positiveColor = invertColors
    ? isUp
      ? 'text-red-400 print:text-red-600'
      : isDown
        ? 'text-emerald-400 print:text-emerald-600'
        : 'text-stone-400'
    : isUp
      ? 'text-emerald-400 print:text-emerald-600'
      : isDown
        ? 'text-red-400 print:text-red-600'
        : 'text-stone-400'

  const arrow = isUp ? '\u2191' : isDown ? '\u2193' : '\u2192'

  return (
    <Card className="print:shadow-none print:border-stone-300">
      <CardContent className="pt-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">{label}</p>
        <p className="text-2xl font-bold text-stone-100 print:text-stone-900 mt-2">
          {formatValue(delta.current, isCurrency)}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-sm font-medium ${positiveColor}`}>
            {arrow}{' '}
            {delta.deltaPercent !== null
              ? `${Math.abs(delta.deltaPercent)}%`
              : delta.direction === 'flat'
                ? 'No change'
                : 'New'}
          </span>
          <span className="text-xs text-stone-500">
            vs prev week ({formatValue(delta.previous, isCurrency)})
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
