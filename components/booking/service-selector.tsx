'use client'

// ServiceSelector - Step 1 of the booking flow.
// Shows cards for each bookable service type with name, description, duration, price.

import type { PublicEventType } from '@/lib/booking/event-types-actions'

type Props = {
  eventTypes: PublicEventType[]
  onSelect: (eventType: PublicEventType) => void
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (remaining === 0) return `${hours}h`
  return `${hours}h ${remaining}m`
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`
}

export function ServiceSelector({ eventTypes, onSelect }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-stone-100">Select a service</h2>
        <p className="text-sm text-stone-500 mt-1">
          Choose the type of experience you're looking for.
        </p>
      </div>

      <div className="grid gap-3">
        {eventTypes.map((et) => (
          <button
            key={et.id}
            type="button"
            onClick={() => onSelect(et)}
            className="group w-full text-left rounded-xl border border-stone-700 bg-stone-800 p-4 hover:border-brand-500 hover:bg-stone-750 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-stone-100 group-hover:text-brand-400 transition-colors">
                  {et.name}
                </h3>
                {et.description && (
                  <p className="text-sm text-stone-400 mt-1 line-clamp-2">{et.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2.5">
                  <span className="inline-flex items-center gap-1 text-xs text-stone-400">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {formatDuration(et.duration_minutes)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-stone-400">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    {et.guest_count_min === et.guest_count_max
                      ? `${et.guest_count_min} guests`
                      : `${et.guest_count_min}-${et.guest_count_max} guests`}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0">
                {et.price_cents != null && et.price_cents > 0 ? (
                  <span className="text-lg font-bold text-stone-100">
                    {formatPrice(et.price_cents)}
                  </span>
                ) : (
                  <span className="text-sm font-medium text-stone-400">Custom pricing</span>
                )}
                <svg
                  className="w-5 h-5 text-stone-500 group-hover:text-brand-400 mt-1 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
