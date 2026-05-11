/**
 * Similar Events List
 *
 * Shows comparable past events with their prices for comparison.
 */

import type { SimilarEvent } from '@/lib/intelligence/pricing-confidence'
import { formatCurrency } from '@/lib/utils/currency'

interface SimilarEventsListProps {
  events: SimilarEvent[]
  currentPerGuestCents: number
}

export function SimilarEventsList({ events, currentPerGuestCents }: SimilarEventsListProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 p-3">
        <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1">
          Similar Events
        </h4>
        <p className="text-xs text-stone-500">
          No comparable past events found. Data will improve as you complete more events.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 p-4">
      <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">
        Similar Past Events ({events.length})
      </h4>

      <div className="space-y-2">
        {events.map((evt) => {
          const delta = currentPerGuestCents > 0
            ? Math.round(
                ((currentPerGuestCents - evt.perGuestCents) / evt.perGuestCents) * 100
              )
            : 0
          const deltaLabel = delta > 0 ? `+${delta}%` : `${delta}%`
          const deltaColor =
            Math.abs(delta) <= 5 ? 'text-stone-400' :
            delta > 0 ? 'text-amber-400' : 'text-emerald-400'

          return (
            <div
              key={evt.eventId}
              className="flex items-center justify-between gap-2 py-1.5 border-b border-stone-800 last:border-0"
            >
              <div className="min-w-0">
                <p className="text-sm text-stone-200 truncate">
                  {evt.occasion || 'Event'}
                  <span className="text-stone-500 ml-1">
                    ({evt.guestCount} guests)
                  </span>
                </p>
                <p className="text-xs text-stone-500">
                  {new Date(evt.eventDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-medium text-stone-200">
                  {formatCurrency(evt.perGuestCents)}/guest
                </p>
                <p className={`text-xs ${deltaColor}`}>
                  {deltaLabel} vs yours
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
