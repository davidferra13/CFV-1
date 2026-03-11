// Multi-Event Day Alert — warns when 2+ events fall on the same day
// Shown on dashboard to help chef plan capacity and logistics.

import Link from 'next/link'
import { AlertTriangle } from '@/components/ui/icons'
import { format } from 'date-fns'
import type { MultiEventDay } from '@/lib/scheduling/multi-event-days'

interface Props {
  days: MultiEventDay[]
}

export function MultiEventDayAlert({ days }: Props) {
  if (days.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
        <h3 className="text-sm font-semibold text-stone-300">Double-Booked Days</h3>
      </div>
      <div className="space-y-2">
        {days.map((day) => (
          <div
            key={day.date}
            className="rounded-md border border-amber-200 bg-amber-950 px-3 py-2.5"
          >
            <p className="text-xs font-semibold text-amber-900 mb-1.5">
              {format(new Date(day.date + 'T12:00:00'), 'EEEE, MMMM d')} — {day.events.length}{' '}
              events
            </p>
            <ul className="space-y-1">
              {day.events.map((ev) => (
                <li key={ev.id} className="flex items-center justify-between gap-2">
                  <Link
                    href={`/events/${ev.id}`}
                    className="text-xs text-amber-200 hover:text-amber-900 hover:underline truncate"
                  >
                    {ev.occasion || 'Untitled Event'}
                    {ev.guest_count ? ` · ${ev.guest_count} guests` : ''}
                  </Link>
                  <span className="text-[10px] text-amber-600 capitalize shrink-0">
                    {ev.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-stone-400">
        Review each event's logistics to ensure you can cover both.
      </p>
    </div>
  )
}
