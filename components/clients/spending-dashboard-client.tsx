'use client'

// Client Spending Dashboard — lifetime spend, this year, average event cost, history

import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import type { SpendingSummary } from '@/lib/clients/spending-actions'

interface SpendingDashboardClientProps {
  summary: SpendingSummary
}

const STATUS_BADGE: Record<
  string,
  { variant: 'default' | 'success' | 'warning' | 'error' | 'info'; label: string }
> = {
  proposed: { variant: 'warning', label: 'Pending' },
  accepted: { variant: 'warning', label: 'Payment Due' },
  paid: { variant: 'info', label: 'Paid' },
  confirmed: { variant: 'success', label: 'Confirmed' },
  in_progress: { variant: 'info', label: 'In Progress' },
  completed: { variant: 'default', label: 'Completed' },
  cancelled: { variant: 'error', label: 'Cancelled' },
}

export function SpendingDashboardClient({ summary }: SpendingDashboardClientProps) {
  const {
    lifetimeSpendCents,
    thisYearSpendCents,
    eventsAttended,
    averageEventCents,
    upcomingCommittedCents,
    events,
  } = summary

  const currentYear = new Date().getFullYear()
  const upcomingEvents = events.filter((e) =>
    ['proposed', 'accepted', 'paid', 'confirmed', 'in_progress'].includes(e.status)
  )
  const pastEvents = events.filter((e) => e.status === 'completed')
  const cancelledEvents = events.filter((e) => e.status === 'cancelled')

  if (events.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-100">My Spending</h1>
          <p className="text-stone-400 mt-1">Your financial history with your chef</p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-stone-400 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <p className="text-stone-400">
              No events yet. Book your first private chef experience!
            </p>
            <Link href="/book-now" className="inline-block mt-4">
              <button
                type="button"
                className="bg-brand-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-brand-700 transition text-sm"
              >
                Book Now
              </button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-100">My Spending</h1>
        <p className="text-stone-400 mt-1">Your financial history with your chef</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xs text-stone-500 mb-1">Lifetime Spend</div>
            <div className="text-xl font-bold text-stone-100">
              {formatCurrency(lifetimeSpendCents)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xs text-stone-500 mb-1">{currentYear} Spend</div>
            <div className="text-xl font-bold text-brand-400">
              {formatCurrency(thisYearSpendCents)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xs text-stone-500 mb-1">Events Attended</div>
            <div className="text-xl font-bold text-stone-100">{eventsAttended}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xs text-stone-500 mb-1">Avg. Per Event</div>
            <div className="text-xl font-bold text-stone-100">
              {eventsAttended > 0 ? formatCurrency(averageEventCents) : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Committed */}
      {upcomingCommittedCents > 0 && (
        <Card className="mb-6 border-brand-700 bg-brand-950">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-brand-200">Upcoming Committed Spend</p>
                <p className="text-xs text-brand-400 mt-0.5">Already paid toward future events</p>
              </div>
              <div className="text-xl font-bold text-brand-200">
                {formatCurrency(upcomingCommittedCents)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-stone-100 mb-3">Upcoming</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-stone-800">
                {upcomingEvents.map((event) => {
                  const statusConfig = STATUS_BADGE[event.status] ?? {
                    variant: 'default' as const,
                    label: event.status,
                  }
                  return (
                    <Link
                      key={event.id}
                      href={`/my-events/${event.id}`}
                      className="flex items-center justify-between p-4 hover:bg-stone-800 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-stone-100">
                          {event.occasion || 'Untitled Event'}
                        </p>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {format(new Date(event.event_date), 'MMM d, yyyy')}
                          {event.guest_count ? ` · ${event.guest_count} guests` : ''}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                        {event.quoted_price_cents > 0 && (
                          <span className="text-sm font-semibold text-stone-100">
                            {formatCurrency(event.quoted_price_cents)}
                          </span>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-stone-100 mb-3">Past Events</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-stone-800">
                {pastEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/my-events/${event.id}/event-summary`}
                    className="flex items-center justify-between p-4 hover:bg-stone-800 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-stone-100">
                        {event.occasion || 'Untitled Event'}
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {format(new Date(event.event_date), 'MMM d, yyyy')}
                        {event.guest_count ? ` · ${event.guest_count} guests` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-semibold text-stone-100">
                        {formatCurrency(event.total_paid_cents)}
                      </span>
                      {event.outstanding_balance_cents > 0 && (
                        <Badge variant="error">Balance Due</Badge>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
          {/* Total row */}
          <div className="mt-2 flex justify-between items-center px-4 text-sm text-stone-400">
            <span>{pastEvents.length} events</span>
            <span className="font-semibold text-stone-100">
              Total: {formatCurrency(lifetimeSpendCents)}
            </span>
          </div>
        </section>
      )}

      {/* Cancelled Events */}
      {cancelledEvents.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-stone-100 mb-3 text-stone-400">Cancelled</h2>
          <Card className="opacity-60">
            <CardContent className="p-0">
              <div className="divide-y divide-stone-800">
                {cancelledEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium text-stone-500">
                        {event.occasion || 'Untitled Event'}
                      </p>
                      <p className="text-xs text-stone-400">
                        {format(new Date(event.event_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Badge variant="error">Cancelled</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  )
}
