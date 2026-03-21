'use client'

import { useEffect, useState, useTransition } from 'react'
import { getTruePlateCost, type PlateCostResult } from '@/lib/pricing/plate-cost-actions'

interface TrueCostBreakdownProps {
  menuId?: string
  eventId?: string
}

function centsToDisplay(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-8 bg-stone-700/50 rounded w-32" />
      <div className="h-4 bg-stone-700/50 rounded w-full" />
      <div className="h-4 bg-stone-700/50 rounded w-3/4" />
      <div className="h-4 bg-stone-700/50 rounded w-1/2" />
    </div>
  )
}

export function TrueCostBreakdown({ menuId, eventId }: TrueCostBreakdownProps) {
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<PlateCostResult['data'] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!menuId && !eventId) return

    startTransition(async () => {
      try {
        const result = await getTruePlateCost({ menuId, eventId })
        if (result.success) {
          setData(result.data)
          setError(null)
        } else {
          setData(null)
          setError(result.error)
        }
      } catch (err: any) {
        setData(null)
        setError(err.message || 'Could not calculate plate cost')
      }
    })
  }, [menuId, eventId])

  // No menu or event linked
  if (!menuId && !eventId) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
        <h3 className="text-sm font-semibold text-stone-300">True Plate Cost</h3>
        <p className="mt-2 text-sm text-stone-500">Link a menu to see plate cost breakdown</p>
      </div>
    )
  }

  // Loading
  if (isPending) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
        <h3 className="text-sm font-semibold text-stone-300 mb-3">True Plate Cost</h3>
        <Skeleton />
      </div>
    )
  }

  // Error
  if (error) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
        <h3 className="text-sm font-semibold text-stone-300">True Plate Cost</h3>
        <p className="mt-2 text-sm text-red-400">{error}</p>
      </div>
    )
  }

  // No data (shouldn't happen if no error, but handle gracefully)
  if (!data) return null

  const {
    ingredientPerPlateCents,
    laborPerPlateCents,
    travelPerPlateCents,
    overheadPerPlateCents,
    totalPerPlateCents,
    totalCostCents,
    marginPercent,
    guestCount,
    quotedPriceCents,
    quotedPerPlateCents,
  } = data

  // Calculate percentages for the stacked bar
  const total = totalPerPlateCents || 1 // avoid division by zero
  const ingredientPct = Math.round((ingredientPerPlateCents / total) * 100)
  const laborPct = Math.round((laborPerPlateCents / total) * 100)
  const travelPct = Math.round((travelPerPlateCents / total) * 100)
  const overheadPct = 100 - ingredientPct - laborPct - travelPct // remainder to avoid rounding gaps

  const segments = [
    {
      label: 'Ingredients',
      cents: ingredientPerPlateCents,
      pct: ingredientPct,
      color: 'bg-emerald-500',
    },
    { label: 'Labor', cents: laborPerPlateCents, pct: laborPct, color: 'bg-brand-500' },
    { label: 'Travel', cents: travelPerPlateCents, pct: travelPct, color: 'bg-purple-500' },
    { label: 'Overhead', cents: overheadPerPlateCents, pct: overheadPct, color: 'bg-stone-500' },
  ]

  // Margin color
  let marginColor = 'text-red-400'
  if (marginPercent !== null) {
    if (marginPercent >= 40) marginColor = 'text-emerald-400'
    else if (marginPercent >= 20) marginColor = 'text-amber-400'
  }

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4 space-y-4">
      {/* Header + Total */}
      <div>
        <h3 className="text-sm font-semibold text-stone-300">True Plate Cost</h3>
        <p className="text-2xl font-bold text-white mt-1">
          {centsToDisplay(totalPerPlateCents)}
          <span className="text-sm font-normal text-stone-400 ml-1">/ plate</span>
        </p>
      </div>

      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-stone-700/50">
        {segments.map((seg) =>
          seg.pct > 0 ? (
            <div
              key={seg.label}
              className={`${seg.color} transition-all`}
              style={{ width: `${seg.pct}%` }}
              title={`${seg.label}: ${seg.pct}%`}
            />
          ) : null
        )}
      </div>

      {/* Breakdown list */}
      <div className="space-y-1.5">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${seg.color}`} />
              <span className="text-stone-400">{seg.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-stone-200 font-medium">{centsToDisplay(seg.cents)}</span>
              <span className="text-stone-500 text-xs w-8 text-right">{seg.pct}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quoted price and margin */}
      {quotedPriceCents && quotedPerPlateCents ? (
        <div className="border-t border-stone-700 pt-3 space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-stone-400">Quoted</span>
            <span className="text-stone-200 font-medium">
              {centsToDisplay(quotedPerPlateCents)} / plate
            </span>
          </div>
          {marginPercent !== null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-400">True Margin</span>
              <span className={`font-semibold ${marginColor}`}>{marginPercent.toFixed(1)}%</span>
            </div>
          )}
        </div>
      ) : null}

      {/* Total for all guests */}
      <div className="border-t border-stone-700 pt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-stone-400">Total cost</span>
          <span className="text-stone-200 font-medium">
            {centsToDisplay(totalCostCents)} for {guestCount} guest{guestCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  )
}
