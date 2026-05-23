'use client'

import Link from 'next/link'
import { CalendarDays, Users, DollarSign, Clock } from '@/components/ui/icons'
import type { TodayEvent } from '@/lib/command-center/attention-actions'

function formatTime(time: string | null): string {
  if (!time) return ''
  try {
    const [h, m] = time.split(':')
    const hour = parseInt(h, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const h12 = hour % 12 || 12
    return `${h12}:${m} ${ampm}`
  } catch {
    return time
  }
}

function formatCents(cents: number): string {
  if (cents === 0) return '$0'
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function EventRow({ event }: { event: TodayEvent }) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-stone-800/40 transition-colors"
    >
      {event.startTime && (
        <div className="flex items-center gap-1 text-xs text-stone-400 w-16 shrink-0">
          <Clock className="w-3 h-3" />
          {formatTime(event.startTime)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-200 truncate">{event.occasion || 'Event'}</p>
        {event.clientName && (
          <p className="text-[10px] text-stone-500 truncate">{event.clientName}</p>
        )}
      </div>
      {event.guestCount && (
        <div className="flex items-center gap-1 text-[10px] text-stone-500 shrink-0">
          <Users className="w-3 h-3" />
          {event.guestCount}
        </div>
      )}
    </Link>
  )
}

export function TodayGlance({
  events,
  revenueCents,
}: {
  events: TodayEvent[]
  revenueCents: number
}) {
  const hasEvents = events.length > 0

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-800/60">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-brand-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
            Today at a Glance
          </h3>
        </div>
      </div>

      <div className="p-3">
        {hasEvents ? (
          <div className="space-y-1">
            {events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-stone-500 text-center py-4">No events today</p>
        )}
      </div>

      {revenueCents > 0 && (
        <div className="px-4 py-2.5 border-t border-stone-800/60 flex items-center gap-2">
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs text-stone-400">Expected revenue:</span>
          <span className="text-sm font-semibold text-emerald-400 ml-auto">
            {formatCents(revenueCents)}
          </span>
        </div>
      )}
    </div>
  )
}
