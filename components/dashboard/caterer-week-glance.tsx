// Caterer Week at a Glance - dashboard widget for caterer/restaurant archetypes
// Shows this week's events, revenue, labor cost, and staff utilization.

import Link from 'next/link'
import { WidgetCardShell } from './widget-cards/widget-card-shell'
import { formatCurrency } from '@/lib/utils/currency'
import type { CatererWeekAtAGlance } from '@/lib/dashboard/caterer-dashboard-actions'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-stone-500',
  proposed: 'bg-blue-400',
  accepted: 'bg-amber-400',
  paid: 'bg-green-400',
  confirmed: 'bg-green-500',
  in_progress: 'bg-brand-400',
  completed: 'bg-green-600',
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return `${days[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`
}

export function CatererWeekGlance({ data }: { data: CatererWeekAtAGlance }) {
  const profitEstimateCents = data.totalRevenueCents - data.totalLaborEstimateCents
  const utilizationPercent =
    data.eventCount > 0 ? Math.min(100, Math.round((data.eventCount / 7) * 100)) : 0

  return (
    <WidgetCardShell widgetId="caterer_week_glance" title="This Week" size="md" href="/schedule">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <p className="text-xs text-stone-500">Revenue</p>
          <p className="text-lg font-bold text-stone-100">
            {formatCurrency(data.totalRevenueCents)}
          </p>
        </div>
        <div>
          <p className="text-xs text-stone-500">Labor Est.</p>
          <p className="text-lg font-bold text-stone-100">
            {formatCurrency(data.totalLaborEstimateCents)}
          </p>
        </div>
        <div>
          <p className="text-xs text-stone-500">Profit Est.</p>
          <p
            className={`text-lg font-bold ${profitEstimateCents >= 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {formatCurrency(profitEstimateCents)}
          </p>
        </div>
      </div>

      {/* Utilization bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-stone-500">
            {data.eventCount} events, {data.totalGuests} guests
          </span>
          <span className="text-stone-400">{utilizationPercent}% week utilized</span>
        </div>
        <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${utilizationPercent}%`,
              backgroundColor: utilizationPercent > 80 ? '#f59e0b' : '#22c55e',
            }}
          />
        </div>
      </div>

      {/* Event list */}
      {data.events.length === 0 ? (
        <p className="text-xs text-stone-500 py-2 text-center">No events this week</p>
      ) : (
        <div className="space-y-1.5">
          {data.events.slice(0, 5).map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="flex items-center gap-2 py-1.5 px-2 -mx-2 rounded-lg hover:bg-white/5 transition-colors group"
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[event.status] ?? 'bg-stone-500'}`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-stone-200 truncate group-hover:text-stone-100">
                  {formatDate(event.event_date)} {event.serve_time ? `at ${event.serve_time}` : ''}
                  {event.occasion ? ` - ${event.occasion}` : ''}
                </p>
                <p className="text-xs text-stone-500 truncate">
                  {event.client_name ?? 'No client'} / {event.guest_count} guests /{' '}
                  {event.staff_count} staff
                  {event.location_city ? ` / ${event.location_city}` : ''}
                </p>
              </div>
              {event.quoted_price_cents != null && event.quoted_price_cents > 0 && (
                <span className="text-xs text-stone-400 shrink-0">
                  {formatCurrency(event.quoted_price_cents)}
                </span>
              )}
            </Link>
          ))}
          {data.events.length > 5 && (
            <Link
              href="/schedule"
              className="block text-xs text-stone-500 hover:text-stone-300 font-medium mt-1 transition-colors"
            >
              +{data.events.length - 5} more
            </Link>
          )}
        </div>
      )}
    </WidgetCardShell>
  )
}
