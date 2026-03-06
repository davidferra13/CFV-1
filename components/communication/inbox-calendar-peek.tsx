'use client'

import { useMemo, useState } from 'react'
import { Calendar, X } from '@/components/ui/icons'
import { MiniCalendar } from '@/components/scheduling/mini-calendar'
import type { CalendarEvent } from '@/lib/scheduling/actions'

export function InboxCalendarPeek({ events }: { events: CalendarEvent[] }) {
  const [open, setOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  const eventsForDay = useMemo(
    () => events.filter((event) => event.start.split('T')[0] === selectedDate),
    [events, selectedDate]
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-stone-700 bg-stone-900 text-stone-100 hover:bg-stone-800"
      >
        <Calendar className="h-4 w-4" />
        Calendar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/45">
          <div className="h-full w-full max-w-md border-l border-stone-700 bg-stone-950 text-stone-100 p-4 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Calendar Peek</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-stone-800"
                aria-label="Close calendar drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl border border-stone-700 bg-stone-900 p-3">
              <MiniCalendar
                events={events}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
              />
            </div>

            <div className="mt-4 space-y-2">
              <div className="text-sm font-medium text-stone-200">{selectedDate}</div>
              {eventsForDay.length === 0 ? (
                <div className="text-sm text-stone-400">No events on this date.</div>
              ) : (
                eventsForDay.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2"
                  >
                    <div className="text-sm font-medium text-stone-100">{event.title}</div>
                    <div className="text-xs text-stone-400">{event.extendedProps.clientName}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
