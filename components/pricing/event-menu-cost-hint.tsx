'use client'

/**
 * EventMenuCostHint - Compact PIE-powered cost estimate for event overview.
 *
 * Shows a small, non-intrusive hint with the estimated total ingredient cost
 * for an event's menu, resolved live via the PIE pricing chain.
 * Graceful: if data is unavailable, renders nothing.
 */

import { useEffect, useState, useTransition } from 'react'
import { resolveEventMenuCostLive } from '@/lib/pricing/live-menu-cost-actions'
import type { LiveMenuCostResponse } from '@/lib/pricing/live-menu-cost-actions'

interface Props {
  eventId: string
  guestCount: number | null
  quotedPriceCents: number | null
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function coverageColor(pct: number): string {
  if (pct >= 70) return 'text-emerald-400'
  if (pct >= 40) return 'text-amber-400'
  return 'text-red-400'
}

function confidenceLabel(avgConf: number): string {
  if (avgConf >= 0.7) return 'high'
  if (avgConf >= 0.4) return 'moderate'
  return 'low'
}

export function EventMenuCostHint({ eventId, guestCount, quotedPriceCents }: Props) {
  const [data, setData] = useState<LiveMenuCostResponse | null>(null)
  const [isPending, startTransition] = useTransition()
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    if (hasLoaded) return
    setHasLoaded(true)
    startTransition(async () => {
      try {
        const result = await resolveEventMenuCostLive(eventId)
        setData(result)
      } catch {
        // Graceful: show nothing on failure
      }
    })
  }, [eventId, hasLoaded])

  // Loading state: tiny spinner
  if (isPending && !data) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-stone-800/30">
        <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-stone-600 border-t-brand-500" />
        <span className="text-xs text-stone-500">Estimating ingredient costs...</span>
      </div>
    )
  }

  // No data or unavailable: render nothing
  if (!data || !data.available) return null

  const foodCostPct =
    quotedPriceCents && quotedPriceCents > 0
      ? Math.round((data.totalFoodCostCents / quotedPriceCents) * 100)
      : null

  const marginLabel =
    foodCostPct !== null
      ? foodCostPct <= 30
        ? 'healthy'
        : foodCostPct <= 45
          ? 'tight'
          : 'over target'
      : null

  const marginColor =
    marginLabel === 'healthy'
      ? 'text-emerald-400'
      : marginLabel === 'tight'
        ? 'text-amber-400'
        : marginLabel === 'over target'
          ? 'text-red-400'
          : ''

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 rounded-md bg-stone-800/30 border border-stone-700/40">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-stone-400">Est. ingredient cost:</span>
        <span className="text-sm font-semibold text-stone-200">
          {formatCents(data.totalFoodCostCents)}
        </span>
        {guestCount && guestCount > 1 && (
          <span className="text-xs text-stone-500">
            ({formatCents(data.costPerGuestCents)}/guest)
          </span>
        )}
      </div>

      {foodCostPct !== null && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-stone-500">Food cost:</span>
          <span className={`text-xs font-medium ${marginColor}`}>
            {foodCostPct}% {marginLabel && `(${marginLabel})`}
          </span>
        </div>
      )}

      <div className="flex items-center gap-1">
        <span className="text-xs text-stone-500">Coverage:</span>
        <span className={`text-xs font-medium ${coverageColor(data.coveragePercent)}`}>
          {data.coveragePercent}%
        </span>
        <span className="text-xs text-stone-600">
          ({confidenceLabel(data.avgConfidence)} confidence)
        </span>
      </div>
    </div>
  )
}
