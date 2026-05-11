'use client'

import type { BulkBuyOpportunity } from '@/lib/intelligence/bulk-buy'

interface Props {
  opportunity: BulkBuyOpportunity
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

const RECOMMENDATION_STYLES = {
  recommended: {
    border: 'border-emerald-700/50',
    bg: 'bg-emerald-900/20',
    badge: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50',
    label: 'Recommended',
  },
  caution: {
    border: 'border-amber-700/50',
    bg: 'bg-amber-900/10',
    badge: 'bg-amber-900/50 text-amber-300 border-amber-700/50',
    label: 'Caution',
  },
  skip: {
    border: 'border-red-800/40',
    bg: 'bg-red-900/10',
    badge: 'bg-red-900/40 text-red-300 border-red-800/40',
    label: 'Not Recommended',
  },
}

export function BulkBuyCard({ opportunity }: Props) {
  const style = RECOMMENDATION_STYLES[opportunity.recommendation]

  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} p-4 space-y-3`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-stone-100 text-base">{opportunity.ingredientName}</h3>
          <p className="text-xs text-stone-400 mt-0.5">
            {opportunity.category} &middot; {opportunity.eventCount} events &middot; shelf life: {opportunity.shelfLifeDays}d
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${style.badge}`}>
          {style.label}
        </span>
      </div>

      {/* Quantity comparison */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md bg-stone-800/60 px-3 py-2">
          <p className="text-xs text-stone-500">Need</p>
          <p className="text-sm font-bold text-stone-100">
            {opportunity.individualTotal} {opportunity.unit}
          </p>
        </div>
        <div className="rounded-md bg-stone-800/60 px-3 py-2">
          <p className="text-xs text-stone-500">Bulk Size</p>
          <p className="text-sm font-bold text-stone-100">
            {opportunity.bulkSize} {opportunity.unit}
          </p>
        </div>
      </div>

      {/* Savings */}
      {opportunity.savingsCents > 0 && (
        <div className="rounded-md bg-emerald-950/30 border border-emerald-800/30 px-3 py-2 flex items-center justify-between">
          <span className="text-sm text-emerald-300">Estimated savings</span>
          <span className="text-sm font-bold text-emerald-300">
            {formatCents(opportunity.savingsCents)}
          </span>
        </div>
      )}

      {/* Price comparison */}
      {opportunity.individualPriceCents && opportunity.bulkPriceCents && (
        <div className="flex items-center gap-4 text-xs text-stone-400">
          <span>Regular: {formatCents(opportunity.individualPriceCents)}/unit</span>
          <span>Bulk: {formatCents(opportunity.bulkPriceCents)}/unit</span>
        </div>
      )}

      {/* Per-event breakdown */}
      <div className="space-y-1.5">
        {opportunity.events.map((event) => (
          <div
            key={event.eventId}
            className="flex items-center justify-between text-xs text-stone-400"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span className="truncate">{event.eventName}</span>
              <span className="text-stone-500 shrink-0">{event.eventDate}</span>
            </div>
            <span className="text-stone-300 shrink-0 ml-2">
              {event.quantity} {opportunity.unit}
            </span>
          </div>
        ))}
      </div>

      {/* Reason */}
      <p className="text-xs text-stone-500 italic">{opportunity.reason}</p>
    </div>
  )
}
