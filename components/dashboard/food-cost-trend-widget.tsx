// Food Cost Trend Widget - rich visualization of food cost trends

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from '@/components/ui/icons'

interface FoodCostTrendMonth {
  month: string
  label: string
  avgFoodCostPercent: number
  eventCount: number
}

interface FoodCostTrend {
  months: FoodCostTrendMonth[]
  isRising: boolean
  risingMonthCount: number
  overallAvgFoodCostPercent: number | null
}

interface Props {
  trend: FoodCostTrend
}

export function FoodCostTrendWidget({ trend }: Props) {
  const hasData = trend.months.some((m) => m.eventCount > 0)
  if (!hasData) return null

  const maxPercent = Math.max(...trend.months.map((m) => m.avgFoodCostPercent), 1)

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Food Cost Trend</CardTitle>
          <Link
            href="/food-cost"
            className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-400"
          >
            Details <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="flex items-center gap-3 mt-1">
          {trend.overallAvgFoodCostPercent != null && (
            <span className="text-xs text-stone-500">
              Avg: {trend.overallAvgFoodCostPercent.toFixed(1)}%
            </span>
          )}
          {trend.isRising && (
            <span className="text-xs text-amber-400">
              Rising for {trend.risingMonthCount} month{trend.risingMonthCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Simple bar chart */}
        <div className="flex items-end justify-between gap-1 h-20">
          {trend.months.map((month) => {
            const heightPercent =
              month.eventCount > 0 ? (month.avgFoodCostPercent / maxPercent) * 100 : 0
            const color =
              month.avgFoodCostPercent > 35
                ? 'bg-red-500'
                : month.avgFoodCostPercent > 25
                  ? 'bg-amber-500'
                  : 'bg-green-500'

            return (
              <div key={month.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-stone-500">
                  {month.eventCount > 0 ? `${month.avgFoodCostPercent.toFixed(0)}%` : ''}
                </span>
                <div className="w-full relative" style={{ height: '48px' }}>
                  <div
                    className={`absolute bottom-0 w-full rounded-t ${month.eventCount > 0 ? color : 'bg-stone-800'}`}
                    style={{ height: `${Math.max(heightPercent, 4)}%` }}
                  />
                </div>
                <span className="text-[10px] text-stone-600">{month.label}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
