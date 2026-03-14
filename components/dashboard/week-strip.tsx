// Week at a Glance — compact 7-day strip for the dashboard
// Shows event/prep/free days with event details and burnout warnings

import Link from 'next/link'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, AlertTriangle } from 'lucide-react'
import type { WeekSchedule, DayType } from '@/lib/scheduling/types'

const DAY_STYLES: Record<DayType, string> = {
  event: 'bg-brand-950 border-brand-700 border',
  prep: 'bg-amber-950 border-amber-200 border border-dashed',
  admin: 'bg-stone-800 border-stone-700 border',
  free: 'bg-stone-900 border-stone-700 border',
}

const PREP_DOT: Record<string, string> = {
  ready: 'bg-green-500',
  partial: 'bg-amber-500',
  not_started: 'bg-stone-300',
}

export function WeekStrip({ schedule }: { schedule: WeekSchedule }) {
  const today = new Date().toISOString().split('T')[0]
  const eventDayCount = schedule.days.filter((d) => d.dayType === 'event').length
  const totalWeekGuests = schedule.days
    .flatMap((d) => d.events)
    .reduce((sum, e) => sum + (e.guestCount || 0), 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <CardTitle>This Week</CardTitle>
            {eventDayCount > 0 && (
              <span className="text-sm text-stone-500">
                {eventDayCount} {eventDayCount === 1 ? 'event' : 'events'}
                {totalWeekGuests > 0 && ` \u00B7 ${totalWeekGuests} guests`}
              </span>
            )}
          </div>
          <Link
            href="/schedule"
            className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-400"
          >
            Full Schedule <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {schedule.days.map((day) => {
            const isToday = day.date === today
            const event = day.events[0]
            const extraEvents = day.events.length - 1

            return (
              <div
                key={day.date}
                className={`rounded-lg p-2 text-center min-h-[88px] flex flex-col ${DAY_STYLES[day.dayType]} ${isToday ? 'ring-2 ring-brand-500 ring-offset-1' : ''}`}
              >
                <div className="text-[11px] font-medium text-stone-300 uppercase tracking-wide">
                  {day.dayOfWeek.slice(0, 3)}
                </div>
                <div
                  className={`text-sm font-semibold ${isToday ? 'text-brand-400' : 'text-stone-300'}`}
                >
                  {format(new Date(day.date + 'T12:00:00'), 'd')}
                </div>

                {/* Event day */}
                {event && (
                  <div className="mt-auto space-y-0.5">
                    <div className="flex items-center justify-center gap-1">
                      <div
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${PREP_DOT[event.prepStatus]}`}
                      />
                      <span className="text-[10px] font-medium text-stone-300 truncate">
                        {event.clientName.split(' ')[0]}
                      </span>
                    </div>
                    <div className="text-[10px] text-stone-300">
                      {event.guestCount}g &middot; {event.serveTime}
                    </div>
                    {extraEvents > 0 && (
                      <div className="text-[9px] text-brand-600 font-medium">
                        +{extraEvents} more
                      </div>
                    )}
                  </div>
                )}

                {/* Prep day */}
                {day.dayType === 'prep' && !event && (
                  <div className="mt-auto">
                    <span className="text-[10px] text-amber-600 font-medium">Prep</span>
                  </div>
                )}

                {/* Free day */}
                {day.dayType === 'free' && !event && (
                  <div className="mt-auto">
                    <span className="text-[10px] text-stone-300">Free</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-[10px] text-stone-300">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Ready
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Partial
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-stone-300" /> Not started
          </span>
        </div>

        {/* Burnout warnings */}
        {schedule.warnings.length > 0 && (
          <div className="mt-3 space-y-1">
            {schedule.warnings.map((warning, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-xs text-amber-700 bg-amber-950 rounded-lg p-2"
              >
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
