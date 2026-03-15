'use client'

// Food Cost Widget - dashboard widget showing average food cost % and trend.
// Used on the chef dashboard for at-a-glance food cost health.

import { formatCurrency } from '@/lib/utils/currency'
import { getFoodCostBadgeColor } from '@/lib/finance/food-cost-calculator'
import type { FoodCostRatingResult } from '@/lib/finance/food-cost-calculator'
import { TrendingUp, TrendingDown, DollarSign } from '@/components/ui/icons'

interface Props {
  avgFoodCostPercent: number
  avgFoodCostRating: FoodCostRatingResult
  recentEventCount: number
  trendDirection: 'improving' | 'worsening' | 'stable' | 'insufficient_data'
  currentMonthAvg: number
  previousMonthAvg: number
}

export function FoodCostWidget({
  avgFoodCostPercent,
  avgFoodCostRating,
  recentEventCount,
  trendDirection,
  currentMonthAvg,
  previousMonthAvg,
}: Props) {
  const badgeColor = getFoodCostBadgeColor(avgFoodCostPercent)

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-stone-300 flex items-center gap-1.5">
          <DollarSign className="h-4 w-4 text-stone-400" />
          Food Cost
        </h3>
        {recentEventCount > 0 && (
          <span className="text-xs text-stone-500">
            {recentEventCount} event{recentEventCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {recentEventCount === 0 ? (
        <p className="text-sm text-stone-500 py-2">
          No food cost data yet. Add recipes with ingredient costs or log grocery spend on events.
        </p>
      ) : (
        <>
          {/* Main percentage */}
          <div className="flex items-end gap-2 mb-2">
            <span className="text-2xl font-bold text-stone-100">{avgFoodCostPercent}%</span>
            <span
              className={`text-xs font-medium px-1.5 py-0.5 rounded border mb-0.5 ${badgeColor}`}
            >
              {avgFoodCostRating.label}
            </span>
          </div>

          {/* Trend */}
          <div className="flex items-center gap-1.5 text-xs">
            {trendDirection === 'improving' && (
              <>
                <TrendingDown className="h-3.5 w-3.5 text-green-500" />
                <span className="text-green-500">
                  Improving ({previousMonthAvg}% to {currentMonthAvg}%)
                </span>
              </>
            )}
            {trendDirection === 'worsening' && (
              <>
                <TrendingUp className="h-3.5 w-3.5 text-red-500" />
                <span className="text-red-500">
                  Rising ({previousMonthAvg}% to {currentMonthAvg}%)
                </span>
              </>
            )}
            {trendDirection === 'stable' && (
              <span className="text-stone-400">Stable (~{avgFoodCostPercent}% avg)</span>
            )}
            {trendDirection === 'insufficient_data' && (
              <span className="text-stone-500">Need more data for trend</span>
            )}
          </div>

          {/* Benchmark line */}
          <p className="text-xs text-stone-500 mt-2">Target: 25-30%</p>
        </>
      )}
    </div>
  )
}
