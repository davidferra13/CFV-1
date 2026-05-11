// Weekly Aggregate Widget
// Shows a cross-event summary of the current week: events, invoices, prep, shopping.
// Designed as a dashboard widget; server component that fetches its own data.

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getWeeklyAggregate, type WeeklyAggregate } from '@/lib/shared/cross-cutting-queries'
import { formatCurrency } from '@/lib/utils/currency'

function formatMinutes(mins: number): string {
  if (mins <= 0) return '0m'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export async function WeeklyAggregateWidget() {
  let data: WeeklyAggregate
  try {
    data = await getWeeklyAggregate()
  } catch (err) {
    console.error('[WeeklyAggregateWidget] Failed to load:', err)
    return (
      <Card className="p-4">
        <p className="text-sm text-stone-500">Could not load weekly summary.</p>
      </Card>
    )
  }

  const hasEvents = data.events.length > 0
  const hasPrep = data.prepSummary.taskCount > 0
  const hasOutstanding = data.invoiceSummary.awaitingPaymentCount > 0
  const hasShopping = data.shoppingSummary.shortageCount > 0

  // Nothing happening this week
  if (!hasEvents && !hasPrep && !hasOutstanding && !hasShopping) {
    return (
      <Card className="p-6">
        <h3 className="font-semibold text-stone-200 mb-1">This Week</h3>
        <p className="text-sm text-stone-500">
          No events, prep, or outstanding invoices this week.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-stone-200">This Week at a Glance</h3>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-2xl font-bold text-stone-100">{data.events.length}</p>
          <p className="text-xs text-stone-500">Events</p>
        </Card>
        <Card className="p-3">
          <p
            className={`text-2xl font-bold ${data.invoiceSummary.overdueCount > 0 ? 'text-red-500' : 'text-stone-100'}`}
          >
            {data.invoiceSummary.awaitingPaymentCount}
          </p>
          <p className="text-xs text-stone-500">Awaiting Payment</p>
        </Card>
        <Card className="p-3">
          <p
            className={`text-2xl font-bold ${data.prepSummary.heavyDayCount > 0 ? 'text-amber-500' : 'text-stone-100'}`}
          >
            {data.prepSummary.taskCount}
          </p>
          <p className="text-xs text-stone-500">Prep Tasks</p>
        </Card>
        <Card className="p-3">
          <p className="text-2xl font-bold text-stone-100">{data.shoppingSummary.shortageCount}</p>
          <p className="text-xs text-stone-500">Items to Buy</p>
        </Card>
      </div>

      {/* Events this week */}
      {hasEvents && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-stone-200">Events This Week</h4>
            <Link href="/events/upcoming" className="text-xs text-brand-600 hover:text-brand-400">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {data.events.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between py-1.5 border-b border-stone-800 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-stone-500 w-16 shrink-0">
                    {formatShortDate(ev.eventDate)}
                  </span>
                  <Link
                    href={`/events/${ev.id}`}
                    className="text-sm font-medium text-stone-200 hover:text-brand-400"
                  >
                    {ev.occasion || 'Event'}
                  </Link>
                  {ev.clientName && <span className="text-xs text-stone-500">{ev.clientName}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400">{ev.guestCount} guests</span>
                  {ev.hasMenu && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-600" title="Has menu" />
                  )}
                  {ev.hasPrepTimeline && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600" title="Has prep" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Invoice alerts */}
      {hasOutstanding && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-stone-200">Outstanding Invoices</h4>
            <Link href="/finance/invoices" className="text-xs text-brand-600 hover:text-brand-400">
              View all
            </Link>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-amber-500 font-medium">
                {formatCurrency(data.invoiceSummary.totalOutstanding)}
              </span>
              <span className="text-stone-500 ml-1">outstanding</span>
            </div>
            {data.invoiceSummary.overdueCount > 0 && (
              <div>
                <span className="text-red-500 font-medium">{data.invoiceSummary.overdueCount}</span>
                <span className="text-stone-500 ml-1">
                  overdue ({formatCurrency(data.invoiceSummary.totalOverdue)})
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Prep pressure by day */}
      {hasPrep && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-stone-200">Prep Load</h4>
            <Link href="/culinary/prep" className="text-xs text-brand-600 hover:text-brand-400">
              Full prep view
            </Link>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {data.prepSummary.days.map((day) => {
              const isHeavy = day.activeMinutes >= 240
              const hasWork = day.taskCount > 0
              return (
                <div
                  key={day.date}
                  className={`rounded p-2 text-center ${
                    isHeavy
                      ? 'bg-amber-900/40 border border-amber-800'
                      : hasWork
                        ? 'bg-stone-800'
                        : 'bg-stone-900'
                  }`}
                >
                  <p className="text-xs text-stone-500">{day.dayOfWeek.slice(0, 3)}</p>
                  <p
                    className={`text-sm font-medium ${
                      isHeavy ? 'text-amber-500' : hasWork ? 'text-stone-200' : 'text-stone-600'
                    }`}
                  >
                    {hasWork ? formatMinutes(day.activeMinutes) : '--'}
                  </p>
                  {hasWork && <p className="text-xs text-stone-500">{day.taskCount} tasks</p>}
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-stone-500">
            <span>Total: {formatMinutes(data.prepSummary.totalActiveMinutes)} active</span>
            {data.prepSummary.heavyDayCount > 0 && (
              <Badge variant="warning">
                {data.prepSummary.heavyDayCount} heavy day
                {data.prepSummary.heavyDayCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </Card>
      )}

      {/* Shopping needs */}
      {hasShopping && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-stone-200">Shopping Needed</h4>
              <p className="text-sm text-stone-400 mt-0.5">
                {data.shoppingSummary.shortageCount} items to buy, estimated{' '}
                {formatCurrency(data.shoppingSummary.totalEstimatedCostCents)}
              </p>
            </div>
            <Link href="/culinary/prep/shopping">
              <span className="text-xs text-brand-600 hover:text-brand-400">
                View shopping list
              </span>
            </Link>
          </div>
        </Card>
      )}
    </div>
  )
}
