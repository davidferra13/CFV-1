'use client'

// Week at a Glance - compact 7-day strip with intelligence overlays
// Shows: event/prep/free days, capacity scoring, grocery windows, rest warnings, revenue toggle

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { todayLocalDateString } from '@/lib/utils/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, AlertTriangle, ShoppingCart } from '@/components/ui/icons'
import { formatCurrency } from '@/lib/utils/currency'
import {
  computeDayCapacity,
  findGroceryWindows,
  checkRestDays,
  CAPACITY_COLORS,
  CAPACITY_BG,
} from '@/lib/scheduling/capacity'
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

interface WeekStripProps {
  schedule: WeekSchedule
  dayRevenueCents?: Record<string, number>
}

export function WeekStrip({ schedule, dayRevenueCents }: WeekStripProps) {
  const [showRevenue, setShowRevenue] = useState(false)
  const today = todayLocalDateString()
  const eventDayCount = schedule.days.filter((d) => d.dayType === 'event').length
  const totalWeekGuests = schedule.days
    .flatMap((d) => d.events)
    .reduce((sum, e) => sum + (e.guestCount || 0), 0)

  // Intelligence: capacity, grocery windows, rest warnings
  const capacities = schedule.days.map((d) => computeDayCapacity(d))
  const eventsNeedingShopping = schedule.days.flatMap((d) =>
    d.events
      .filter((e) => e.prepStatus !== 'ready')
      .map((e) => ({ eventDate: d.date, eventId: e.id }))
  )
  const groceryWindows = findGroceryWindows(schedule.days, eventsNeedingShopping)
  const restWarning = checkRestDays(schedule.days)

  // Revenue totals
  const weekRevenue = dayRevenueCents
    ? Object.values(dayRevenueCents).reduce((s, c) => s + c, 0)
    : 0

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
          <div className="flex items-center gap-2">
            {dayRevenueCents && (
              <button
                type="button"
                onClick={() => setShowRevenue(!showRevenue)}
                className={`text-xxs px-2 py-0.5 rounded transition-colors ${
                  showRevenue
                    ? 'bg-brand-700 text-brand-100'
                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                }`}
              >
                Revenue
              </button>
            )}
            <Link
              href="/schedule"
              className="inline-flex items-center gap-1 text-sm text-brand-500 hover:text-brand-400"
            >
              Full Schedule <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Rest day warning */}
        {restWarning && (
          <div
            className={`flex items-start gap-2 text-xs rounded-lg p-2 mb-3 ${
              restWarning.severity === 'critical'
                ? 'bg-red-950 text-red-300'
                : 'bg-amber-950 text-amber-300'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{restWarning.message}</span>
          </div>
        )}

        <div className="grid grid-cols-7 gap-2">
          {schedule.days.map((day, i) => {
            const isToday = day.date === today
            const event = day.events[0]
            const extraEvents = day.events.length - 1
            const capacity = capacities[i]
            const groceryWindow = groceryWindows.find((w) => w.shopDate === day.date)
            const revenue = dayRevenueCents?.[day.date] ?? 0

            return (
              <div
                key={day.date}
                className={`rounded-lg p-2 text-center min-h-[88px] flex flex-col ${DAY_STYLES[day.dayType]} ${isToday ? 'ring-2 ring-brand-500 ring-offset-1' : ''} ${CAPACITY_BG[capacity.label]}`}
              >
                <div className="text-xs-tight font-medium text-stone-300 uppercase tracking-wide">
                  {day.dayOfWeek.slice(0, 3)}
                </div>
                <div
                  className={`text-sm font-semibold ${isToday ? 'text-brand-400' : 'text-stone-300'}`}
                >
                  {format(new Date(day.date + 'T12:00:00'), 'd')}
                </div>

                {/* Capacity label */}
                {capacity.label !== 'free' && (
                  <div
                    className={`text-3xs font-bold uppercase ${CAPACITY_COLORS[capacity.label]}`}
                  >
                    {capacity.label}
                  </div>
                )}

                {/* Grocery window indicator */}
                {groceryWindow && (
                  <div className="flex justify-center mt-0.5" title={groceryWindow.reason}>
                    <ShoppingCart className="h-3 w-3 text-brand-400" />
                  </div>
                )}

                {/* Event day */}
                {event && (
                  <div className="mt-auto space-y-0.5">
                    <div className="flex items-center justify-center gap-1">
                      <div
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${PREP_DOT[event.prepStatus]}`}
                      />
                      <span className="text-xxs font-medium text-stone-300 truncate">
                        {event.clientName.split(' ')[0]}
                      </span>
                    </div>
                    <div className="text-xxs text-stone-300">
                      {event.guestCount}g &middot; {event.serveTime}
                    </div>
                    {extraEvents > 0 && (
                      <div className="text-2xs text-brand-600 font-medium">+{extraEvents} more</div>
                    )}
                  </div>
                )}

                {/* Prep day */}
                {day.dayType === 'prep' && !event && (
                  <div className="mt-auto">
                    <span className="text-xxs text-amber-600 font-medium">Prep</span>
                  </div>
                )}

                {/* Free day */}
                {day.dayType === 'free' && !event && (
                  <div className="mt-auto">
                    <span className="text-xxs text-stone-300">Free</span>
                  </div>
                )}

                {/* Revenue overlay */}
                {showRevenue && revenue > 0 && (
                  <div className="text-2xs font-semibold text-emerald-400 mt-0.5">
                    {formatCurrency(revenue)}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Revenue total row */}
        {showRevenue && weekRevenue > 0 && (
          <div className="flex justify-end mt-2 text-xs text-stone-300">
            <span>
              Week total:{' '}
              <span className="font-semibold text-emerald-400">{formatCurrency(weekRevenue)}</span>
            </span>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-xxs text-stone-300">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Ready
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Partial
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-stone-300" /> Not started
          </span>
          {groceryWindows.length > 0 && (
            <span className="flex items-center gap-1">
              <ShoppingCart className="h-2.5 w-2.5 text-brand-400" /> Shop day
            </span>
          )}
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
