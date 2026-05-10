'use client'

import type { CircleEventLink } from '@/lib/hub/circle-detail-actions'

interface CirclePreferredDishesProps {
  circleId: string
  events: CircleEventLink[]
}

export function CirclePreferredDishes({ circleId: _circleId, events }: CirclePreferredDishesProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-stone-700 bg-stone-800/50 p-4">
        <h3 className="text-sm font-semibold text-stone-200">This circle&apos;s favorites</h3>
        <p className="mt-2 text-sm text-stone-500">
          No events linked yet. Link events to see dish history.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-800/50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-stone-200">This circle&apos;s favorites</h3>
      <div className="space-y-2">
        {events.slice(0, 8).map((evt) => (
          <div
            key={evt.event_id}
            className="flex items-center justify-between rounded-lg bg-stone-700/30 px-3 py-2"
          >
            <span className="text-sm text-stone-300">{evt.event_title}</span>
            {evt.event_date && (
              <span className="text-xs text-stone-500">
                {new Date(evt.event_date + 'T00:00:00').toLocaleDateString()}
              </span>
            )}
          </div>
        ))}
      </div>
      {events.length > 8 && (
        <p className="mt-2 text-xs text-stone-500">+{events.length - 8} more events</p>
      )}
    </div>
  )
}
