// Production Calendar
// Monthly overview of all events — shows status, guest count, revenue, and client at a glance.
// Navigation via ?month=YYYY-MM query param. Defaults to current month.

import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEvents } from '@/lib/events/actions'
import { formatCurrency } from '@/lib/utils/currency'
import { Badge } from '@/components/ui/badge'
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
  proposed: 'bg-blue-500',
  accepted: 'bg-indigo-500',
  paid: 'bg-purple-500',
  confirmed: 'bg-emerald-500',
  in_progress: 'bg-amber-500',
  completed: 'bg-stone-500',
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
  const monthEvents = allEvents.filter((e) => {
    if (!e.event_date) return false
    try {
      const d = parseISO(e.event_date)
      return d >= monthStart && d <= monthEnd
    } catch {
      return false
    }
  })

  // Build calendar grid
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  // 0 = Sunday ... 6 = Saturday
  const leadingBlanks = getDay(monthStart)

  // Summary stats
  const activeMonthEvents = monthEvents.filter((e) => e.status !== 'cancelled')
  const totalGuests = activeMonthEvents.reduce((sum, e) => sum + (e.guest_count ?? 0), 0)
  const projectedRevenue = activeMonthEvents.reduce(
    (sum, e) => sum + (e.quoted_price_cents ?? 0),
    0
  )

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Production Calendar</h1>
          <p className="text-stone-500 text-sm mt-0.5">
            Monthly overview of all events, revenue, and staffing.
          </p>
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-3">
          <Link
            href={`/production?month=${prevMonth}`}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
          >
            ← Prev
          </Link>
          <span className="text-base font-semibold text-stone-900 min-w-[140px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <Link
            href={`/production?month=${nextMonth}`}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
          >
            Next →
          </Link>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-400 uppercase tracking-wider mb-1">Events</p>
          <p className="text-2xl font-bold text-stone-900">{activeMonthEvents.length}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-400 uppercase tracking-wider mb-1">Total Guests</p>
          <p className="text-2xl font-bold text-stone-900">{totalGuests}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-400 uppercase tracking-wider mb-1">Projected Revenue</p>
          <p className="text-2xl font-bold text-stone-900">
            {projectedRevenue > 0 ? formatCurrency(projectedRevenue) : '—'}
          </p>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-stone-100">
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
              className="min-h-[90px] border-b border-r border-stone-100 bg-stone-50/30"
            />
          ))}

          {/* Actual days */}
          {days.map((day) => {
            const dayEvents = monthEvents.filter((e) => {
              if (!e.event_date) return false
              try {
                return isSameDay(parseISO(e.event_date), day)
              } catch {
                return false
              }
            })
            const isToday = isSameDay(day, today)

            return (
              <div
                key={day.toISOString()}
                className="min-h-[90px] border-b border-r border-stone-100 p-1.5 relative"
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
                <div className="space-y-0.5">
                  {dayEvents.map((e) => (
                    <Link
                      key={e.id}
                      href={`/events/${e.id}`}
                      className="block rounded px-1.5 py-0.5 hover:opacity-80 transition-opacity"
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
                        <span className="text-xs font-medium text-stone-900 truncate">
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
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-stone-500">
        <span className="font-medium text-stone-700">Status:</span>
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
          <h2 className="text-base font-semibold text-stone-900">
            {format(currentMonth, 'MMMM')} Events
          </h2>
          <div className="space-y-2">
            {monthEvents
              .sort((a, b) => (a.event_date ?? '').localeCompare(b.event_date ?? ''))
              .map((e) => (
                <Link
                  key={e.id}
                  href={`/events/${e.id}`}
                  className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-4 py-3 hover:bg-stone-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[e.status] ?? 'bg-stone-400'}`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">
                        {e.occasion ?? 'Event'}
                      </p>
                      <p className="text-xs text-stone-500">
                        {e.event_date ? format(parseISO(e.event_date), 'MMM d') : '—'}
                        {(e as any).client?.full_name ? ` · ${(e as any).client.full_name}` : ''}
                        {e.guest_count ? ` · ${e.guest_count} guests` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {e.quoted_price_cents ? (
                      <span className="text-sm font-medium text-stone-700">
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
