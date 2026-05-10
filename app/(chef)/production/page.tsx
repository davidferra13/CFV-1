// Production Calendar
// Monthly overview of all events - shows status, guest count, revenue, and client at a glance.
// Navigation via ?month=YYYY-MM query param. Defaults to current month.

import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEvents } from '@/lib/events/actions'
import { formatCurrency } from '@/lib/utils/currency'
import { dateToDateString } from '@/lib/utils/format'
import { Badge } from '@/components/ui/badge'
import { getMonthPrepOverlay } from '@/lib/production/calendar-prep-overlay'
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  getDay,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns'

type SearchParams = { month?: string }

const STATUS_BADGE: Record<string, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  draft: 'default',
  proposed: 'info',
  accepted: 'info',
  paid: 'warning',
  confirmed: 'success',
  in_progress: 'warning',
  completed: 'default',
  cancelled: 'error',
}

const STATUS_DOT: Record<string, string> = {
  draft: 'bg-stone-400',
  proposed: 'bg-brand-500',
  accepted: 'bg-brand-500',
  paid: 'bg-purple-500',
  confirmed: 'bg-emerald-500',
  in_progress: 'bg-amber-500',
  completed: 'bg-stone-8000',
  cancelled: 'bg-red-400',
}

export default async function ProductionCalendarPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await requireChef()

  // Parse ?month=YYYY-MM
  const today = new Date()
  let currentMonth = today
  if (searchParams.month) {
    try {
      currentMonth = parseISO(`${searchParams.month}-01`)
    } catch {
      currentMonth = today
    }
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const prevMonth = format(subMonths(currentMonth, 1), 'yyyy-MM')
  const nextMonth = format(addMonths(currentMonth, 1), 'yyyy-MM')

  // Fetch all events then filter to this month
  const allEvents = await getEvents()
  const monthEvents = allEvents.filter((e: any) => {
    if (!e.event_date) return false
    const d = new Date(dateToDateString(e.event_date as Date | string) + 'T00:00:00')
    return d >= monthStart && d <= monthEnd
  })

  // Fetch prep overlay data
  const prepOverlay = await getMonthPrepOverlay(format(currentMonth, 'yyyy-MM'))

  // Build calendar grid
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  // 0 = Sunday ... 6 = Saturday
  const leadingBlanks = getDay(monthStart)

  // Summary stats
  const activeMonthEvents = monthEvents.filter((e: any) => e.status !== 'cancelled')
  const totalGuests = activeMonthEvents.reduce((sum: any, e: any) => sum + (e.guest_count ?? 0), 0)
  const projectedRevenue = activeMonthEvents.reduce(
    (sum: any, e: any) => sum + (e.quoted_price_cents ?? 0),
    0
  )

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Production Calendar</h1>
          <p className="text-stone-500 text-sm mt-0.5">
            Monthly overview of all events, revenue, and staffing.
          </p>
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-3">
          <Link
            href={`/production?month=${prevMonth}`}
            className="rounded-lg border border-stone-700 px-3 py-1.5 text-sm text-stone-400 hover:bg-stone-800"
          >
            ← Prev
          </Link>
          <span className="text-base font-semibold text-stone-100 min-w-[140px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <Link
            href={`/production?month=${nextMonth}`}
            className="rounded-lg border border-stone-700 px-3 py-1.5 text-sm text-stone-400 hover:bg-stone-800"
          >
            Next →
          </Link>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-stone-700 bg-stone-900 p-4">
          <p className="text-xs text-stone-400 uppercase tracking-wider mb-1">Events</p>
          <p className="text-2xl font-bold text-stone-100">{activeMonthEvents.length}</p>
        </div>
        <div className="rounded-xl border border-stone-700 bg-stone-900 p-4">
          <p className="text-xs text-stone-400 uppercase tracking-wider mb-1">Total Guests</p>
          <p className="text-2xl font-bold text-stone-100">{totalGuests}</p>
        </div>
        <div className="rounded-xl border border-stone-700 bg-stone-900 p-4">
          <p className="text-xs text-stone-400 uppercase tracking-wider mb-1">Projected Revenue</p>
          <p className="text-2xl font-bold text-stone-100">
            {projectedRevenue > 0 ? formatCurrency(projectedRevenue) : '-'}
          </p>
        </div>
      </div>

      {/* Prep phase legend */}
      {prepOverlay.maxPrepMinutes > 0 && (
        <div className="flex gap-4 text-xs text-stone-400">
          <span className="font-medium text-stone-300">Prep phases:</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500" /> Grocery
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Prep
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Cook
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Service
          </span>
        </div>
      )}

      {/* Calendar grid */}
      <div className="rounded-xl border border-stone-700 bg-stone-900 overflow-hidden">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-stone-800">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-stone-400">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {/* Leading blanks */}
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div
              key={`blank-${i}`}
              className="min-h-[90px] border-b border-r border-stone-800 bg-stone-800/30"
            />
          ))}

          {/* Actual days */}
          {days.map((day) => {
            const dayEvents = monthEvents.filter((e: any) => {
              if (!e.event_date) return false
              return isSameDay(
                new Date(dateToDateString(e.event_date as Date | string) + 'T00:00:00'),
                day
              )
            })
            const isToday = isSameDay(day, today)
            const dateKey = format(day, 'yyyy-MM-dd')
            const prepData = prepOverlay.prepDays[dateKey]

            // Phase border class for event chips
            const phaseChipBorder =
              prepData?.phase === 'service'
                ? 'border-l-2 border-l-emerald-500'
                : prepData?.phase === 'cook'
                  ? 'border-l-2 border-l-amber-500'
                  : prepData?.phase === 'grocery'
                    ? 'border-l-2 border-l-purple-500'
                    : prepData?.phase === 'prep'
                      ? 'border-l-2 border-l-blue-500'
                      : ''

            return (
              <div
                key={day.toISOString()}
                className="min-h-[90px] border-b border-r border-stone-800 p-1.5 relative flex flex-col"
              >
                {/* Date number */}
                <div
                  className={`text-xs font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-stone-900 text-white' : 'text-stone-500'
                  }`}
                >
                  {format(day, 'd')}
                </div>

                {/* Event chips */}
                <div className="space-y-0.5 flex-1">
                  {dayEvents.map((e: any) => (
                    <Link
                      key={e.id}
                      href={`/events/${e.id}`}
                      className={`block rounded px-1.5 py-0.5 hover:opacity-80 transition-opacity ${phaseChipBorder}`}
                      style={{
                        backgroundColor:
                          e.status === 'cancelled'
                            ? '#fee2e2'
                            : e.status === 'completed'
                              ? '#f5f5f4'
                              : e.status === 'in_progress'
                                ? '#fef3c7'
                                : e.status === 'confirmed'
                                  ? '#d1fae5'
                                  : e.status === 'paid'
                                    ? '#ede9fe'
                                    : '#dbeafe',
                      }}
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[e.status] ?? 'bg-stone-400'}`}
                        />
                        <span className="text-xs font-medium text-stone-100 truncate">
                          {e.occasion ?? 'Event'}
                        </span>
                      </div>
                      <div className="text-xs text-stone-500 truncate pl-2.5">
                        {(e as any).client?.full_name ?? ''}
                        {e.guest_count ? ` · ${e.guest_count}g` : ''}
                      </div>
                      {e.quoted_price_cents ? (
                        <div className="text-xs text-stone-400 pl-2.5">
                          {formatCurrency(e.quoted_price_cents)}
                        </div>
                      ) : null}
                    </Link>
                  ))}
                </div>

                {/* Prep load bar */}
                {prepData && prepData.totalPrepMinutes > 0 && (
                  <div className="mt-auto pt-1">
                    <div className="h-1 rounded-full bg-stone-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          prepData.phase === 'service'
                            ? 'bg-emerald-500'
                            : prepData.phase === 'cook'
                              ? 'bg-amber-500'
                              : prepData.phase === 'grocery'
                                ? 'bg-purple-500'
                                : 'bg-blue-500'
                        }`}
                        style={{
                          width: `${Math.min(100, (prepData.totalPrepMinutes / prepOverlay.maxPrepMinutes) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-stone-500">
                      {Math.round((prepData.totalPrepMinutes / 60) * 10) / 10}h
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-stone-500">
        <span className="font-medium text-stone-300">Status:</span>
        {Object.entries(STATUS_DOT).map(([status, dotClass]) => (
          <span key={status} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${dotClass}`} />
            <span className="capitalize">{status.replace('_', ' ')}</span>
          </span>
        ))}
      </div>

      {/* Event list below calendar */}
      {monthEvents.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-stone-100">
            {format(currentMonth, 'MMMM')} Events
          </h2>
          <div className="space-y-2">
            {monthEvents
              .sort((a: any, b: any) =>
                dateToDateString(a.event_date as Date | string).localeCompare(
                  dateToDateString(b.event_date as Date | string)
                )
              )
              .map((e: any) => (
                <Link
                  key={e.id}
                  href={`/events/${e.id}`}
                  className="flex items-center justify-between rounded-lg border border-stone-700 bg-stone-900 px-4 py-3 hover:bg-stone-800 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[e.status] ?? 'bg-stone-400'}`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-100 truncate">
                        {e.occasion ?? 'Event'}
                      </p>
                      <p className="text-xs text-stone-500">
                        {e.event_date
                          ? format(
                              new Date(
                                dateToDateString(e.event_date as Date | string) + 'T00:00:00'
                              ),
                              'MMM d'
                            )
                          : '-'}
                        {(e as any).client?.full_name ? ` · ${(e as any).client.full_name}` : ''}
                        {e.guest_count ? ` · ${e.guest_count} guests` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {e.quoted_price_cents ? (
                      <span className="text-sm font-medium text-stone-300">
                        {formatCurrency(e.quoted_price_cents)}
                      </span>
                    ) : null}
                    <Badge variant={STATUS_BADGE[e.status] ?? 'default'}>
                      {e.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      )}

      {monthEvents.length === 0 && (
        <div className="text-center py-12 text-stone-400">
          <p className="text-lg font-medium">No events in {format(currentMonth, 'MMMM yyyy')}</p>
          <p className="text-sm mt-1">
            <Link href="/events/new" className="text-brand-600 hover:underline">
              Create an event →
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}
