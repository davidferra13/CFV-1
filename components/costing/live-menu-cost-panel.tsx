'use client'

/**
 * Live Menu Cost Panel
 *
 * Displays real-time ingredient cost estimates resolved via PIE when
 * the precomputed menu_cost_summary has no data yet.
 * Shows per-dish breakdown, cost-per-plate, and estimated margin.
 *
 * Graceful fallback: if PIE is unavailable, shows "cost unavailable"
 * with a clear explanation. Never shows $0 or fake numbers.
 */

import { useEffect, useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { resolveEventMenuCostLive } from '@/lib/pricing/live-menu-cost-actions'
import type { LiveMenuCostResponse, LiveMenuCostDish } from '@/lib/pricing/live-menu-cost-actions'

interface Props {
  eventId: string
  guestCount: number | null
  quotedPriceCents: number | null
}

function confidenceBadge(confidence: number): 'success' | 'warning' | 'error' {
  if (confidence >= 0.7) return 'success'
  if (confidence >= 0.4) return 'warning'
  return 'error'
}

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.7) return 'High confidence'
  if (confidence >= 0.4) return 'Moderate confidence'
  return 'Low confidence'
}

export function LiveMenuCostPanel({ eventId, guestCount, quotedPriceCents }: Props) {
  const [data, setData] = useState<LiveMenuCostResponse | null>(null)
  const [loading, startTransition] = useTransition()
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    if (hasLoaded) return
    setHasLoaded(true)
    startTransition(async () => {
      try {
        const result = await resolveEventMenuCostLive(eventId)
        setData(result)
      } catch {
        setData({ available: false, reason: 'Cost estimation unavailable' })
      }
    })
  }, [eventId, hasLoaded])

  // Loading state
  if (loading && !data) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-brand-400 animate-pulse" />
            <span className="text-sm text-stone-400">Resolving ingredient costs via PIE...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Unavailable state
  if (!data || !data.available) {
    const reason = data && !data.available ? data.reason : 'Cost estimation unavailable'
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-stone-300">Menu Cost Estimate</h3>
              <Badge variant="warning">Unavailable</Badge>
            </div>
          </div>
          <p className="text-xs text-stone-500 mt-2">{reason}</p>
        </CardContent>
      </Card>
    )
  }

  // Success state
  const { totalFoodCostCents, costPerGuestCents, dishes, coveragePercent, avgConfidence } = data
  const hasPrice = quotedPriceCents != null && quotedPriceCents > 0
  const marginCents = hasPrice ? quotedPriceCents! - totalFoodCostCents : null
  const marginPct = hasPrice
    ? Math.round(((quotedPriceCents! - totalFoodCostCents) / quotedPriceCents!) * 1000) / 10
    : null
  const foodCostPct = hasPrice
    ? Math.round((totalFoodCostCents / quotedPriceCents!) * 1000) / 10
    : null

  return (
    <Card>
      <CardContent className="py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-stone-300">Live Menu Cost (PIE)</h3>
            <Badge variant={confidenceBadge(avgConfidence)}>{confidenceLabel(avgConfidence)}</Badge>
          </div>
          <span className="text-[10px] text-stone-600 uppercase tracking-wide">
            {coveragePercent}% real data
          </span>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total Food Cost */}
          <div className="rounded-lg border border-stone-800 bg-stone-900/30 px-3 py-2">
            <p className="text-[10px] text-stone-500 uppercase tracking-wide">Food Cost</p>
            <p className="text-lg font-bold text-stone-200 mt-0.5">
              {formatCurrency(totalFoodCostCents)}
            </p>
            <p className="text-xs text-stone-500">{formatCurrency(costPerGuestCents)}/guest</p>
          </div>

          {/* Food Cost % */}
          <div className="rounded-lg border border-stone-800 bg-stone-900/30 px-3 py-2">
            <p className="text-[10px] text-stone-500 uppercase tracking-wide">Food Cost %</p>
            {foodCostPct != null ? (
              <p
                className={`text-lg font-bold mt-0.5 ${
                  foodCostPct <= 32
                    ? 'text-emerald-400'
                    : foodCostPct <= 40
                      ? 'text-amber-400'
                      : 'text-red-400'
                }`}
              >
                {foodCostPct}%
              </p>
            ) : (
              <p className="text-sm text-stone-500 mt-1">Set a quoted price</p>
            )}
          </div>

          {/* Gross Margin */}
          <div className="rounded-lg border border-stone-800 bg-stone-900/30 px-3 py-2">
            <p className="text-[10px] text-stone-500 uppercase tracking-wide">Gross Margin</p>
            {marginCents != null ? (
              <>
                <p
                  className={`text-lg font-bold mt-0.5 ${
                    marginCents > 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {formatCurrency(marginCents)}
                </p>
                <p className="text-xs text-stone-500">{marginPct}% of price</p>
              </>
            ) : (
              <p className="text-sm text-stone-500 mt-1">Set a quoted price</p>
            )}
          </div>

          {/* Margin per Guest */}
          <div className="rounded-lg border border-stone-800 bg-stone-900/30 px-3 py-2">
            <p className="text-[10px] text-stone-500 uppercase tracking-wide">Margin / Guest</p>
            {marginCents != null && guestCount ? (
              <>
                <p
                  className={`text-lg font-bold mt-0.5 ${
                    marginCents > 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {formatCurrency(Math.round(marginCents / Math.max(guestCount, 1)))}
                </p>
                <p className="text-xs text-stone-500">{guestCount} guests</p>
              </>
            ) : (
              <p className="text-sm text-stone-500 mt-1">Set a quoted price</p>
            )}
          </div>
        </div>

        {/* Visual bar */}
        {foodCostPct != null && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-stone-500">
              <span>Food Cost</span>
              <span>Margin</span>
            </div>
            <div className="h-3 rounded-full bg-stone-800 overflow-hidden flex">
              <div
                className={`h-full transition-all ${
                  foodCostPct > 40
                    ? 'bg-red-500'
                    : foodCostPct > 32
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(foodCostPct, 100)}%` }}
              />
              <div className="h-full flex-1 bg-stone-700" />
            </div>
            <div className="flex justify-between text-[10px] text-stone-600">
              <span>{foodCostPct}%</span>
              <span>{marginPct}%</span>
            </div>
          </div>
        )}

        {/* Per-dish breakdown */}
        {dishes.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-stone-400 mb-1">Per-dish breakdown</p>
            <div className="divide-y divide-stone-800">
              {dishes
                .filter((d) => d.ingredientCount > 0)
                .map((dish) => (
                  <div key={dish.dishId} className="flex items-center justify-between py-1.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-200 truncate">
                        {dish.dishName}
                        {dish.courseName && (
                          <span className="text-xs text-stone-500 ml-1.5">({dish.courseName})</span>
                        )}
                      </p>
                      <p className="text-[10px] text-stone-500">
                        {dish.resolvedCount}/{dish.ingredientCount} ingredients priced
                      </p>
                    </div>
                    <div className="text-right ml-3">
                      {dish.costCents > 0 ? (
                        <p className="text-sm font-medium text-stone-200">
                          {formatCurrency(dish.costCents)}
                        </p>
                      ) : (
                        <p className="text-xs text-stone-500">Cost unavailable</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Source note */}
        <p className="text-[10px] text-stone-600">
          Live estimate via Pricing Intelligence Engine ({dishes.length} dishes,{' '}
          {data.unresolvedCount > 0
            ? `${data.unresolvedCount} ingredient${data.unresolvedCount > 1 ? 's' : ''} missing price`
            : 'all ingredients priced'}
          ). Costs update with market data.
        </p>
      </CardContent>
    </Card>
  )
}
