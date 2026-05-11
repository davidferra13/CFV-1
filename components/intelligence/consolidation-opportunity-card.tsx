'use client'

import type { ConsolidationOpportunity } from '@/lib/intelligence/prep-consolidation'

interface Props {
  opportunity: ConsolidationOpportunity
}

export function ConsolidationOpportunityCard({ opportunity }: Props) {
  const { ingredientName, events, batchQuantity, unit, technique, timeSavedMinutes, eventCount } = opportunity

  return (
    <div className="rounded-lg border border-stone-700/50 bg-stone-900/60 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-stone-100 text-base">{ingredientName}</h3>
          <p className="text-xs text-stone-400 mt-0.5">
            {technique} &middot; {eventCount} events
          </p>
        </div>
        {timeSavedMinutes > 0 && (
          <span className="shrink-0 rounded-full bg-emerald-900/50 border border-emerald-700/50 px-2.5 py-1 text-xs font-medium text-emerald-300">
            Save {timeSavedMinutes}min
          </span>
        )}
      </div>

      {/* Batch total */}
      <div className="rounded-md bg-stone-800/60 px-3 py-2">
        <p className="text-sm text-stone-300">
          <span className="font-bold text-stone-100">
            {batchQuantity} {unit}
          </span>{' '}
          total batch
        </p>
      </div>

      {/* Per-event breakdown */}
      <div className="space-y-1.5">
        {events.map((event) => (
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
              {event.quantity} {event.unit}
            </span>
          </div>
        ))}
      </div>

      {/* Recipe context */}
      <p className="text-xs text-stone-500">
        Used in: {[...new Set(events.map(e => e.recipeName))].join(', ')}
      </p>
    </div>
  )
}
