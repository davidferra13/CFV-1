'use client'

import { useState, useTransition } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Calendar } from '@/components/ui/icons'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getClientCalendarEvents, type CalendarEvent } from '@/lib/calendar/client-calendar-actions'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const COLOR_CLASSES: Record<string, string> = {
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  brand: 'bg-brand-500',
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  stone: 'bg-stone-500',
}

export function CalendarClient({
  initialEvents,
  initialMonth,
  initialYear,
}: {
  initialEvents: CalendarEvent[]
  initialMonth: number
  initialYear: number
}) {
  const [month, setMonth] = useState(initialMonth)
  const [year, setYear] = useState(initialYear)
  const [events, setEvents] = useState(initialEvents)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isPending, startTransition] = useTransition()

  const currentDate = new Date(year, month - 1, 1)
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)

  // Build day cells
  const days: Date[] = []
  let day = calStart
  while (day <= calEnd) {
    days.push(day)
    day = addDays(day, 1)
  }

  function navigateMonth(delta: number) {
    let newMonth = month + delta
    let newYear = year
    if (newMonth > 12) {
      newMonth = 1
      newYear++
    } else if (newMonth < 1) {
      newMonth = 12
      newYear--
    }
    setMonth(newMonth)
    setYear(newYear)
    startTransition(async () => {
      try {
        const data = await getClientCalendarEvents(newMonth, newYear)
        setEvents(data)
      } catch (err) {
        console.error('[calendar] Failed to load:', err)
      }
    })
  }

  function getEventsForDay(d: Date): CalendarEvent[] {
    const dateStr = format(d, 'yyyy-MM-dd')
    return events.filter((e) => e.date?.startsWith(dateStr))
  }

  const selectedEvents = selectedDate ? getEventsForDay(selectedDate) : []

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigateMonth(-1)}
          disabled={isPending}
          className="p-2 rounded-lg text-stone-400 hover:bg-stone-800 hover:text-stone-200 transition-colors disabled:opacity-50"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-stone-100">{format(currentDate, 'MMMM yyyy')}</h2>
        <button
          type="button"
          onClick={() => navigateMonth(1)}
          disabled={isPending}
          className="p-2 rounded-lg text-stone-400 hover:bg-stone-800 hover:text-stone-200 transition-colors disabled:opacity-50"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar grid */}
      <Card>
        <CardContent className="p-2 sm:p-4">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="text-center text-xs font-medium text-stone-500 py-2">
                {wd}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-px bg-stone-800 rounded-lg overflow-hidden">
            {days.map((d, i) => {
              const inMonth = isSameMonth(d, currentDate)
              const today = isToday(d)
              const selected = selectedDate && isSameDay(d, selectedDate)
              const dayEvents = getEventsForDay(d)

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  className={`min-h-[3rem] sm:min-h-[4rem] p-1 text-left transition-colors ${
                    inMonth ? 'bg-stone-900' : 'bg-stone-900/50'
                  } ${selected ? 'ring-2 ring-brand-500 ring-inset' : ''} hover:bg-stone-800`}
                >
                  <span
                    className={`text-xs font-medium ${
                      today
                        ? 'bg-brand-600 text-white rounded-full w-6 h-6 flex items-center justify-center'
                        : inMonth
                          ? 'text-stone-300'
                          : 'text-stone-600'
                    }`}
                  >
                    {format(d, 'd')}
                  </span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-1 flex-wrap">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <div
                          key={ev.id}
                          className={`w-1.5 h-1.5 rounded-full ${COLOR_CLASSES[ev.color] || 'bg-stone-500'}`}
                          title={ev.title}
                        />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected date events */}
      {selectedDate && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-stone-300">
            {format(selectedDate, 'EEEE, MMMM d')}
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-stone-500">No events on this day.</p>
          ) : (
            selectedEvents.map((ev) => (
              <Link key={ev.id} href={`/my-events/${ev.eventId}`}>
                <Card className="hover:bg-stone-800/50 transition-colors cursor-pointer">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full flex-shrink-0 ${COLOR_CLASSES[ev.color] || 'bg-stone-500'}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-100 truncate">{ev.title}</p>
                      <p className="text-xs text-stone-500">
                        {ev.type === 'deadline' ? 'Deadline' : ev.status}
                      </p>
                    </div>
                    <Badge variant={ev.type === 'deadline' ? 'warning' : 'info'}>{ev.type}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-stone-500">
        <span className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" /> Confirmed
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-500" /> Pending / Deadline
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-brand-500" /> In Progress
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-stone-500" /> Completed
        </span>
      </div>
    </div>
  )
}
