// Revenue Forecast Dashboard Widget
// Shows projected revenue next 30 days, pipeline value, and YoY trend arrow.
// Data-driven: passes pre-fetched forecast data as props (no client-side fetching).

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from '@/components/ui/icons'
import { formatCurrency } from '@/lib/utils/currency'

export interface ForecastWidgetData {
  projectedNext30DaysCents: number
  pipelineWeightedCents: number
  pipelineTotalCents: number
  pipelineEventCount: number
  currentMonthActualCents: number
  samePeriodLastYearCents: number | null
}

interface Props {
  data: ForecastWidgetData
}

export function ForecastWidget({ data }: Props) {
  const {
    projectedNext30DaysCents,
    pipelineWeightedCents,
    pipelineTotalCents,
    pipelineEventCount,
    currentMonthActualCents,
    samePeriodLastYearCents,
  } = data

  // Trend vs same period last year
  let trendLabel: string | null = null
  let trendColor = 'text-stone-400'

  if (samePeriodLastYearCents != null && samePeriodLastYearCents > 0) {
    const diff = projectedNext30DaysCents - samePeriodLastYearCents
    const pct = Math.round((diff / samePeriodLastYearCents) * 100)
    if (pct > 0) {
      trendLabel = `+${pct}% vs last year`
      trendColor = 'text-emerald-400'
    } else if (pct < 0) {
      trendLabel = `${pct}% vs last year`
      trendColor = 'text-red-400'
    } else {
      trendLabel = 'Same as last year'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Revenue Forecast</CardTitle>
          <Link
            href="/finance/forecast"
            className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-400"
          >
            Details <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Projected next 30 days */}
        <div>
          <p className="text-xs text-stone-500">Projected Next 30 Days</p>
          <p className="text-xl font-bold text-stone-200">
            {formatCurrency(projectedNext30DaysCents)}
          </p>
          {trendLabel && <p className={`text-xs ${trendColor} mt-0.5`}>{trendLabel}</p>}
        </div>

        {/* Pipeline */}
        <div className="flex justify-between items-baseline">
          <div>
            <p className="text-xs text-stone-500">Pipeline Value</p>
            <p className="text-sm font-semibold text-brand-400">
              {formatCurrency(pipelineWeightedCents)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-stone-500">
              {pipelineEventCount} {pipelineEventCount === 1 ? 'event' : 'events'}
            </p>
            <p className="text-xs text-stone-600">{formatCurrency(pipelineTotalCents)} total</p>
          </div>
        </div>

        {/* Earned so far this month */}
        <div className="pt-2 border-t border-stone-700">
          <div className="flex justify-between items-baseline">
            <p className="text-xs text-stone-500">Earned this month</p>
            <p className="text-sm font-medium text-emerald-400">
              {formatCurrency(currentMonthActualCents)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
