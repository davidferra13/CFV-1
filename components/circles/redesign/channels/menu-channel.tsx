'use client'

import { cn } from '@/lib/utils'
import type { CircleDetail } from '@/lib/hub/circle-detail-actions'

interface Props {
  circle: CircleDetail
}

function getMenuStatus(circle: CircleDetail): {
  label: string
  color: string
} {
  if (circle.events.length === 0) {
    return { label: 'No Menu', color: 'bg-stone-600 text-stone-300' }
  }
  const hasFinal = circle.events.some(
    (e) => e.event_status === 'confirmed' || e.event_status === 'completed'
  )
  if (hasFinal) {
    return { label: 'Final', color: 'bg-emerald-600/80 text-emerald-100' }
  }
  return { label: 'Draft', color: 'bg-amber-600/80 text-amber-100' }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'TBD'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return 'TBD'
  }
}

export function MenuChannel({ circle }: Props) {
  const status = getMenuStatus(circle)

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h2 className="text-base font-semibold text-stone-100">Menu</h2>
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', status.color)}>
            {status.label}
          </span>
        </div>
        {circle.events.length > 0 && (
          <a
            href="/menus"
            className="text-sm font-medium text-brand-400 transition-colors hover:text-brand-300"
          >
            Full Menu
          </a>
        )}
      </div>

      {/* Event Menus */}
      {circle.events.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
            Linked Events
          </h3>
          {circle.events.map((event) => (
            <div
              key={event.event_id}
              className="rounded-xl border border-stone-700/30 bg-stone-800/50 p-4 transition-colors hover:border-stone-600/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-stone-200">{event.event_title}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-stone-400">{formatDate(event.event_date)}</span>
                    {event.guest_count != null && (
                      <span className="rounded-full bg-stone-700/60 px-2 py-0.5 text-xs text-stone-300">
                        {event.guest_count} guest{event.guest_count !== 1 ? 's' : ''}
                      </span>
                    )}
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 text-xs',
                        event.event_status === 'confirmed' || event.event_status === 'completed'
                          ? 'text-emerald-400'
                          : event.event_status === 'cancelled'
                            ? 'text-red-400'
                            : 'text-amber-400'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-1.5 w-1.5 rounded-full',
                          event.event_status === 'confirmed' || event.event_status === 'completed'
                            ? 'bg-emerald-400'
                            : event.event_status === 'cancelled'
                              ? 'bg-red-400'
                              : 'bg-amber-400'
                        )}
                      />
                      {event.event_status}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-lg bg-stone-700/50 px-3 py-1.5 text-xs font-medium text-stone-200 transition-colors hover:bg-stone-600/50"
                >
                  View Menu
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-stone-700/50 py-10">
          <span className="text-3xl">🍽️</span>
          <p className="text-sm text-stone-400">Link an event to start building your menu</p>
          <button
            type="button"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500"
          >
            Link Event
          </button>
        </div>
      )}

      {/* Dietary Matrix Preview */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
          Dietary Considerations
        </h3>
        <div className="rounded-xl border border-stone-700/30 bg-stone-800/50 p-4">
          <div className="flex items-center gap-2">
            <span className="text-base">🥗</span>
            <p className="text-sm text-stone-400">Check Dietary Needs channel for details</p>
          </div>
          <button
            type="button"
            className="mt-3 text-sm font-medium text-brand-400 transition-colors hover:text-brand-300"
          >
            View Dietary Needs
          </button>
        </div>
      </div>

      {/* PIE Pricing Preview */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
          Cost Estimate
        </h3>
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-stone-700/40 p-4">
          <span className="text-base">💰</span>
          <p className="text-sm text-stone-500">
            Cost estimate will appear here when menu is linked
          </p>
        </div>
      </div>
    </div>
  )
}
