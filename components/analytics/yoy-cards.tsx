// Year-Over-Year Cards — three metric cards comparing current vs prior year.
// Used on the dashboard Business Snapshot section.

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import type { YoYData, YoYMetric } from '@/lib/analytics/year-over-year'

interface Props {
  data: YoYData
}

export function YoYCards({ data }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-300">Year over Year</h3>
        <span className="text-xs text-stone-400">
          {data.previousYearLabel} → {data.currentYearLabel}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <YoYCard metric={data.revenueMetric} isCurrency />
        <YoYCard metric={data.eventCountMetric} />
        <YoYCard metric={data.avgEventValueMetric} isCurrency />
      </div>
    </div>
  )
}

function YoYCard({ metric, isCurrency = false }: { metric: YoYMetric; isCurrency?: boolean }) {
  const fmt = (v: number) => (isCurrency ? formatCurrency(v) : String(v))

  const trendColor =
    metric.changeDirection === 'up'
      ? 'text-emerald-600'
      : metric.changeDirection === 'down'
        ? 'text-red-500'
        : 'text-stone-400'

  const TrendIcon =
    metric.changeDirection === 'up'
      ? TrendingUp
      : metric.changeDirection === 'down'
        ? TrendingDown
        : Minus

  return (
    <Card className="p-3">
      <p className="text-[10px] text-stone-500 font-medium uppercase tracking-wide truncate">
        {metric.label}
      </p>
      <p className="text-sm font-bold text-stone-100 mt-1 truncate">{fmt(metric.currentYear)}</p>
      <div className={`flex items-center gap-1 mt-1 ${trendColor}`}>
        <TrendIcon className="h-3 w-3 shrink-0" />
        <span className="text-[10px] font-medium">
          {metric.changePercent !== null ? `${metric.changePercent}%` : '—'}
        </span>
      </div>
      <p className="text-[10px] text-stone-400 mt-0.5 truncate">
        {fmt(metric.previousYear)} prior yr
      </p>
    </Card>
  )
}
