'use client'

// Client Value Card - CLV summary shown on client detail page.
// Shows total revenue, event count, avg per event, months as client,
// projected annual revenue, trend indicator, and tier badge.

import { formatCurrency } from '@/lib/utils/currency'
import { TIER_CONFIG, getClientTier } from '@/lib/clients/lifetime-value-constants'
import type { ClientLifetimeValue } from '@/lib/clients/lifetime-value-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from '@/components/ui/icons'

type Props = {
  clv: ClientLifetimeValue
  /** Revenue from the previous period (same duration) for trend comparison */
  previousPeriodRevenueCents?: number
}

export function ClientValueCard({ clv, previousPeriodRevenueCents }: Props) {
  const tier = getClientTier(clv.totalEventCount)
  const tierInfo = TIER_CONFIG[tier]

  // Trend: compare current total vs previous period
  let trendDirection: 'up' | 'down' | 'flat' = 'flat'
  let trendPercent = 0
  if (previousPeriodRevenueCents != null && previousPeriodRevenueCents > 0) {
    const diff = clv.totalRevenueCents - previousPeriodRevenueCents
    trendPercent = Math.round((diff / previousPeriodRevenueCents) * 100)
    if (trendPercent > 5) trendDirection = 'up'
    else if (trendPercent < -5) trendDirection = 'down'
  }

  if (clv.totalEventCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Client Value</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-400 italic">
            No completed events yet. CLV metrics will appear after the first event.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Client Value</CardTitle>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tierInfo.color}`}
          >
            {tierInfo.label}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {/* Primary metric: Total Revenue */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-2xl font-bold text-stone-100">
            {formatCurrency(clv.totalRevenueCents)}
          </span>
          {trendDirection !== 'flat' && (
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                trendDirection === 'up' ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {trendDirection === 'up' ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(trendPercent)}%
            </span>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-stone-500">Events</p>
            <p className="text-sm font-semibold text-stone-200">{clv.totalEventCount}</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Avg / Event</p>
            <p className="text-sm font-semibold text-stone-200">
              {formatCurrency(clv.avgRevenuePerEventCents)}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Client for</p>
            <p className="text-sm font-semibold text-stone-200">
              {clv.monthsAsClient} {clv.monthsAsClient === 1 ? 'month' : 'months'}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Projected Annual</p>
            <p className="text-sm font-semibold text-stone-200">
              {formatCurrency(clv.projectedAnnualRevenueCents)}
            </p>
          </div>
        </div>

        {/* Tips */}
        {clv.totalTipsCents > 0 && (
          <div className="mt-3 pt-3 border-t border-stone-800">
            <div className="flex justify-between text-xs">
              <span className="text-stone-500">Total Tips</span>
              <span className="text-stone-300 font-medium">
                {formatCurrency(clv.totalTipsCents)}
              </span>
            </div>
          </div>
        )}

        {/* Frequency */}
        {clv.avgEventsPerMonth > 0 && (
          <div className="mt-2">
            <div className="flex justify-between text-xs">
              <span className="text-stone-500">Booking Frequency</span>
              <span className="text-stone-300 font-medium">
                {clv.avgEventsPerMonth.toFixed(1)} / month
              </span>
            </div>
          </div>
        )}

        {/* Top occasions */}
        {clv.topCuisines.length > 0 && (
          <div className="mt-3 pt-3 border-t border-stone-800">
            <p className="text-xs text-stone-500 mb-1.5">Top Occasions</p>
            <div className="flex flex-wrap gap-1">
              {clv.topCuisines.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-stone-800 text-stone-300"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
