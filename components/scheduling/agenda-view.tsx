// Agenda View — shows only days with booked events
// Excludes empty days. Groups by month. Updates reactively with calendar state.

'use client'

import Link from 'next/link'
import type { CalendarEvent } from '@/lib/scheduling/actions'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  proposed: 'Proposed',
  accepted: 'Accepted',
  paid: 'Paid',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
}

const STATUS_BADGE_COLORS: Record<string, string> = {
  draft: 'bg-stone-800 text-stone-300',
  proposed: 'bg-blue-900 text-blue-700',
  accepted: 'bg-yellow-900 text-yellow-700',
  paid: 'bg-emerald-900 text-emerald-700',
  confirmed: 'bg-brand-900 text-brand-400',
  in_progress: 'bg-brand-950 text-brand-300',
  completed: 'bg-green-900 text-green-700',
}

const PREP_DOT: Record<string, string> = {
  ready: 'bg-green-500',
  partial: 'bg-yellow-500',
  not_started: 'bg-red-500',
}

interface AgendaDay {
  date: string
  label: string
  dayOfWeek: string
  dayNum: number
  isToday: boolean
  events: CalendarEvent[]
}

function groupEventsByDay(events: CalendarEvent[]): AgendaDay[] {
  const today = new Date().toISOString().split('T')[0]
  const dayMap = new Map<string, CalendarEvent[]>()

  for (const event of events) {
    const date = event.start.split('T')[0]
    if (!dayMap.has(date)) {
      dayMap.set(date, [])
    }
    dayMap.get(date)!.push(event)
  }

  // Sort by date
  const sortedDates = [...dayMap.keys()].sort()

  return sortedDates.map((date) => {
    const d = new Date(date + 'T12:00:00')
    return {
      date,
      label: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      dayOfWeek: d.toLocaleDateString('en-US', { weekday: 'long' }),
      dayNum: d.getDate(),
      isToday: date === today,
      events: dayMap.get(date)!.sort((a, b) => a.start.localeCompare(b.start)),
    }
  })
}

function groupByMonth(days: AgendaDay[]): { month: string; days: AgendaDay[] }[] {
  const months = new Map<string, AgendaDay[]>()

  for (const day of days) {
    const d = new Date(day.date + 'T12:00:00')
    const monthKey = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (!months.has(monthKey)) {
      months.set(monthKey, [])
    }
    months.get(monthKey)!.push(day)
  }

  return [...months.entries()].map(([month, days]) => ({ month, days }))
}

export function AgendaView({
  events,
  onEventClick,
}: {
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent, rect: DOMRect) => void
}) {
  const agendaDays = groupEventsByDay(events)
  const monthGroups = groupByMonth(agendaDays)

  if (agendaDays.length === 0) {
    return (
      <div className="bg-stone-900 rounded-xl border border-stone-700 shadow-sm p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-stone-800 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-stone-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-stone-100 mb-1">No events this period</h3>
        <p className="text-sm text-stone-500">
          Your schedule is clear. Navigate to a different month or create a new event.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-stone-900 rounded-xl border border-stone-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 bg-stone-800 border-b border-stone-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-brand-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-stone-300">Agenda</h3>
        </div>
        <span className="text-xs text-stone-500">
          {agendaDays.length} day{agendaDays.length !== 1 ? 's' : ''} booked
        </span>
      </div>

      {/* Month groups */}
      <div className="divide-y divide-stone-800">
        {monthGroups.map(({ month, days }) => (
          <div key={month}>
            {/* Month header */}
            <div className="px-5 py-2 bg-stone-800 sticky top-0 z-10">
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider">{month}</h4>
            </div>

            {/* Day entries */}
            <div className="divide-y divide-stone-50">
              {days.map((day) => (
                <div
                  key={day.date}
                  className={`flex gap-4 px-5 py-3 transition-colors hover:bg-stone-800 ${
                    day.isToday ? 'bg-brand-950/30' : ''
                  }`}
                >
                  {/* Date column */}
                  <div className="flex-shrink-0 w-14 text-center pt-0.5">
                    <div className="text-[10px] font-semibold text-stone-300 uppercase tracking-wider">
                      {day.dayOfWeek.slice(0, 3)}
                    </div>
                    <div
                      className={`text-xl font-bold leading-tight ${
                        day.isToday
                          ? 'text-white bg-brand-500 rounded-full w-9 h-9 flex items-center justify-center mx-auto'
                          : 'text-stone-100'
                      }`}
                    >
                      {day.dayNum}
                    </div>
                  </div>

                  {/* Events column */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {day.events.map((event) => {
                      const props = event.extendedProps
                      const isPrep = props.dayType === 'prep'
                      const time =
                        !isPrep && event.start.includes('T')
                          ? new Date(event.start).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          : null

                      return (
                        <div
                          key={event.id}
                          className={`group rounded-lg border p-3 cursor-pointer transition-all hover:shadow-sm ${
                            isPrep
                              ? 'border-amber-200 bg-amber-950/50 hover:bg-amber-950'
                              : 'border-stone-700 bg-stone-900 hover:bg-stone-800'
                          }`}
                          onClick={(e) => {
                            if (onEventClick) {
                              onEventClick(
                                event,
                                (e.currentTarget as HTMLElement).getBoundingClientRect()
                              )
                            }
                          }}
                        >
                          {/* Top row: title + status */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-2 h-2 rounded-full flex-shrink-0 ${PREP_DOT[props.prepStatus] || 'bg-stone-400'}`}
                                />
                                <span className="font-medium text-sm text-stone-100 truncate">
                                  {event.title}
                                </span>
                              </div>
                              <div className="text-xs text-stone-500 mt-0.5 ml-4">
                                {props.clientName}
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                STATUS_BADGE_COLORS[props.status] || 'bg-stone-800 text-stone-300'
                              }`}
                            >
                              {STATUS_LABELS[props.status] || props.status}
                            </span>
                          </div>

                          {/* Detail row */}
                          <div className="flex items-center gap-3 mt-2 ml-4 text-xs text-stone-500">
                            {time && (
                              <span className="flex items-center gap-1">
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                {time}
                              </span>
                            )}
                            {isPrep && <span className="text-amber-600 font-medium">Prep Day</span>}
                            {props.guestCount > 0 && (
                              <span className="flex items-center gap-1">
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                                  />
                                </svg>
                                {props.guestCount}
                              </span>
                            )}
                            {props.locationCity && (
                              <span className="flex items-center gap-1 truncate">
                                <svg
                                  className="w-3 h-3 flex-shrink-0"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                                  />
                                </svg>
                                {props.locationCity}
                              </span>
                            )}
                          </div>

                          {/* Quick link (appears on hover) */}
                          <div className="mt-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link
                              href={`/events/${props.eventId}`}
                              className="text-xs font-medium text-brand-600 hover:text-brand-400"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View details →
                            </Link>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
