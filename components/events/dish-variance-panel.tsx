'use client'

// Dish Variance Panel
// Shows planned-vs-served comparison for an event on the AAR page.
// Green for matches, yellow for substitutions, red for removals, brand for additions.

import { useEffect, useState, useTransition } from 'react'
import {
  getServedDishVariance,
  type ServedDishVarianceResult,
  type DishItem,
} from '@/lib/events/served-dish-variance'

interface Props {
  eventId: string
  tenantId: string
}

function DishRow({ dish, color }: { dish: DishItem; color: 'green' | 'red' | 'brand' | 'yellow' }) {
  const colorClasses = {
    green: 'bg-emerald-950/40 border-emerald-800 text-emerald-300',
    red: 'bg-red-950/40 border-red-800 text-red-300',
    brand: 'bg-brand-950/40 border-brand-800 text-brand-300',
    yellow: 'bg-amber-950/40 border-amber-800 text-amber-300',
  }

  const labels = {
    green: 'Matched',
    red: 'Removed',
    brand: 'Added',
    yellow: 'Substituted',
  }

  return (
    <div
      className={`flex items-center gap-2 rounded border px-3 py-1.5 text-sm ${colorClasses[color]}`}
    >
      <span className="flex-1 font-medium">{dish.name}</span>
      <span className="text-xs opacity-70">{labels[color]}</span>
      {dish.notes && (
        <span className="text-xs opacity-60 truncate max-w-[150px]">{dish.notes}</span>
      )}
    </div>
  )
}

export function DishVariancePanel({ eventId, tenantId }: Props) {
  const [data, setData] = useState<ServedDishVarianceResult | null>(null)
  const [error, setError] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      try {
        const result = await getServedDishVariance(eventId, tenantId)
        setData(result)
        setError(false)
      } catch {
        setData(null)
        setError(true)
      }
    })
  }, [eventId, tenantId])

  if (isPending) {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
        <p className="text-sm text-zinc-500">Loading dish variance...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950/30 p-4">
        <p className="text-sm text-red-400">Could not load dish variance data.</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
        <p className="text-sm text-zinc-500">
          No planned or served dish data available for comparison.
        </p>
      </div>
    )
  }

  const { planned, served, additions, removals, substitutions, matchCount } = data
  const totalPlanned = planned.length
  const matchRate = totalPlanned > 0 ? Math.round((matchCount / totalPlanned) * 100) : 0

  // Build the matched items list (planned items that were also served)
  const servedNamesNorm = new Set(served.map((s) => s.name.toLowerCase().trim()))
  const matchedItems = planned.filter((p) => servedNamesNorm.has(p.name.toLowerCase().trim()))

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-100">Planned vs. Served</h3>
        {totalPlanned > 0 && (
          <span className="text-xs text-zinc-400">
            {matchRate}% match ({matchCount}/{totalPlanned} dishes)
          </span>
        )}
      </div>

      {/* Matches */}
      {matchedItems.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-emerald-400 uppercase tracking-wide">
            Served as planned
          </p>
          {matchedItems.map((d, i) => (
            <DishRow key={`match-${i}`} dish={d} color="green" />
          ))}
        </div>
      )}

      {/* Substitutions */}
      {substitutions.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-amber-400 uppercase tracking-wide">
            Substitutions
          </p>
          {substitutions.map((sub, i) => (
            <div key={`sub-${i}`} className="flex items-center gap-2 text-sm">
              <div className="flex-1 rounded border bg-red-950/30 border-red-800 text-red-300 px-3 py-1.5 line-through opacity-70">
                {sub.planned.name}
              </div>
              <span className="text-zinc-500 text-xs">replaced with</span>
              <div className="flex-1 rounded border bg-amber-950/40 border-amber-800 text-amber-300 px-3 py-1.5">
                {sub.served.name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Removals */}
      {removals.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-red-400 uppercase tracking-wide">
            Removed from plan
          </p>
          {removals.map((d, i) => (
            <DishRow key={`rem-${i}`} dish={d} color="red" />
          ))}
        </div>
      )}

      {/* Additions */}
      {additions.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-brand-400 uppercase tracking-wide">
            Unplanned additions
          </p>
          {additions.map((d, i) => (
            <DishRow key={`add-${i}`} dish={d} color="brand" />
          ))}
        </div>
      )}

      {/* Summary when everything matched perfectly */}
      {matchedItems.length === totalPlanned && additions.length === 0 && totalPlanned > 0 && (
        <p className="text-xs text-emerald-500">
          All {totalPlanned} dishes served exactly as planned.
        </p>
      )}
    </div>
  )
}
