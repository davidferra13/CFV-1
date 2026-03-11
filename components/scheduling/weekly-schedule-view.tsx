// Weekly Schedule View — 7-day overview with events, prep days, and warnings
// Client component for week navigation.

'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { WeekSchedule } from '@/lib/scheduling/types'
import { getWeekSchedule } from '@/lib/scheduling/actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'

const DAY_TYPE_COLORS: Record<string, string> = {
  event: 'bg-brand-950 border-brand-700',
  prep: 'bg-amber-950 border-amber-200',
  admin: 'bg-stone-800 border-stone-700',
  free: 'bg-stone-900 border-stone-800',
}

const DAY_TYPE_LABELS: Record<string, string> = {
  event: 'Event Day',
  prep: 'Prep Day',
  admin: 'Admin Day',
  free: 'Free Day',
}

const PREP_STATUS_COLORS: Record<string, string> = {
  ready: 'bg-green-900 text-green-200',
  partial: 'bg-yellow-900 text-yellow-200',
  not_started: 'bg-red-900 text-red-200',
}

export function WeeklyScheduleView({ initialSchedule }: { initialSchedule: WeekSchedule }) {
  const [schedule, setSchedule] = useState(initialSchedule)
  const [weekOffset, setWeekOffset] = useState(0)
  const [isPending, startTransition] = useTransition()

  const navigateWeek = (direction: number) => {
    const newOffset = weekOffset + direction
    setWeekOffset(newOffset)
    startTransition(async () => {
      try {
        const newSchedule = await getWeekSchedule(newOffset)
        setSchedule(newSchedule)
      } catch (err) {
        toast.error('Failed to load schedule')
      }
    })
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={() => navigateWeek(-1)} disabled={isPending}>
          Previous Week
        </Button>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-stone-100">
            {formatDateRange(schedule.weekStart, schedule.weekEnd)}
          </h2>
          {weekOffset !== 0 && (
            <button
              onClick={() => navigateWeek(-weekOffset)}
              className="text-sm text-brand-600 hover:text-brand-400"
            >
              Back to this week
            </button>
          )}
        </div>
        <Button variant="secondary" onClick={() => navigateWeek(1)} disabled={isPending}>
          Next Week
        </Button>
      </div>

      {/* Warnings */}
      {schedule.warnings.length > 0 && (
        <div className="space-y-2">
          {schedule.warnings.map((warning, i) => (
            <div key={i} className="bg-amber-950 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-200">{warning}</p>
            </div>
          ))}
        </div>
      )}

      {/* Day Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {schedule.days.map((day) => {
          const isToday = day.date === today
          const colorClass = DAY_TYPE_COLORS[day.dayType]

          return (
            <Card
              key={day.date}
              className={`p-3 border ${colorClass} ${isToday ? 'ring-2 ring-brand-500' : ''} ${isPending ? 'opacity-50' : ''}`}
            >
              <div className="space-y-2">
                {/* Day Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <div
                      className={`text-xs font-semibold uppercase tracking-wide ${isToday ? 'text-brand-600' : 'text-stone-500'}`}
                    >
                      {day.dayOfWeek.slice(0, 3)}
                    </div>
                    <div
                      className={`text-lg font-bold ${isToday ? 'text-brand-600' : 'text-stone-100'}`}
                    >
                      {new Date(day.date + 'T12:00:00').getDate()}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      day.dayType === 'event'
                        ? 'bg-brand-900 text-brand-400'
                        : day.dayType === 'prep'
                          ? 'bg-amber-900 text-amber-200'
                          : 'bg-stone-800 text-stone-500'
                    }`}
                  >
                    {DAY_TYPE_LABELS[day.dayType]}
                  </span>
                </div>

                {/* Events */}
                {day.events.map((event) => (
                  <Link key={event.id} href={`/events/${event.id}`} className="block">
                    <div className="bg-stone-900 rounded p-2 border border-stone-700 hover:shadow-sm transition-shadow">
                      <div className="text-sm font-medium text-stone-100 truncate">
                        {event.occasion || 'Event'}
                      </div>
                      <div className="text-xs text-stone-500">{event.clientName}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-stone-400">{event.serveTime}</span>
                        <span
                          className={`text-xs px-1 py-0.5 rounded ${PREP_STATUS_COLORS[event.prepStatus]}`}
                        >
                          {event.prepStatus === 'ready'
                            ? 'Ready'
                            : event.prepStatus === 'partial'
                              ? 'Partial'
                              : 'Not started'}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}

                {/* Prep Day Note */}
                {day.dayType === 'prep' && day.isPrepDayFor && (
                  <div className="text-xs text-amber-200 bg-amber-900 rounded p-1.5">
                    Prep day for tomorrow
                  </div>
                )}

                {/* Free Day */}
                {day.dayType === 'free' && day.events.length === 0 && (
                  <div className="text-xs text-stone-400 py-2 text-center">No events</div>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-stone-500 justify-center">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-brand-900 border border-brand-700" /> Event
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-900 border border-amber-200" /> Prep
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-stone-900 border border-stone-700" /> Free
        </span>
      </div>
    </div>
  )
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]

  if (s.getMonth() === e.getMonth()) {
    return `${months[s.getMonth()]} ${s.getDate()} - ${e.getDate()}, ${s.getFullYear()}`
  }
  return `${months[s.getMonth()]} ${s.getDate()} - ${months[e.getMonth()]} ${e.getDate()}, ${s.getFullYear()}`
}
