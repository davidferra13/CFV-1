// Staff Portal - My Events
// Shows upcoming and past event assignments for the current staff member.

import type { Metadata } from 'next'
import { requireStaff } from '@/lib/auth/get-user'
import { getMyUpcomingEvents, getMyEventHistory } from '@/lib/staff/my-events-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export const metadata: Metadata = { title: 'My Events' }

export default async function StaffEventsPage({
  searchParams,
}: {
  searchParams: { tab?: string }
}) {
  await requireStaff()

  const showPast = searchParams.tab === 'past'
  const [upcoming, history] = await Promise.all([
    getMyUpcomingEvents(),
    showPast ? getMyEventHistory() : Promise.resolve([]),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">My Events</h1>
        <p className="text-stone-400 mt-1 text-sm">Your upcoming and past event assignments.</p>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-2">
        <Link
          href="/staff-events"
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            !showPast
              ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
              : 'bg-stone-800 text-stone-400 hover:text-stone-200'
          }`}
        >
          Upcoming ({upcoming.length})
        </Link>
        <Link
          href="/staff-events?tab=past"
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            showPast
              ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
              : 'bg-stone-800 text-stone-400 hover:text-stone-200'
          }`}
        >
          Past Events
        </Link>
      </div>

      {!showPast ? (
        /* Upcoming Events */
        upcoming.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-stone-500">No upcoming event assignments.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map((event) => (
              <Link key={event.id} href={`/staff-events/${event.event_id}`}>
                <Card className="hover:border-stone-600 transition-colors cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-stone-200">
                            {event.event_title}
                          </span>
                          {event.occasion && <Badge variant="default">{event.occasion}</Badge>}
                          <StatusBadge status={event.assignment_status} />
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-stone-400">
                          <span>{formatEventDate(event.event_date)}</span>
                          {event.serve_time && <span>Serve: {event.serve_time}</span>}
                          {event.start_time && <span>Start: {event.start_time}</span>}
                          {event.guest_count && <span>{event.guest_count} guests</span>}
                        </div>

                        {event.location_address && (
                          <div className="text-xs text-stone-500 mt-1 truncate">
                            {event.location_address}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-medium text-stone-300">{event.role}</div>
                        {event.scheduled_hours && (
                          <div className="text-xs text-stone-500">{event.scheduled_hours}h</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )
      ) : /* Past Events */
      history.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-stone-500">No past event assignments.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {history.map((event, idx) => (
            <Card key={`${event.event_id}-${idx}`}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-stone-300">
                        {event.event_title}
                      </span>
                      {event.occasion && <Badge variant="default">{event.occasion}</Badge>}
                    </div>
                    <div className="text-xs text-stone-500 mt-1">
                      {formatEventDate(event.event_date)} - {event.role}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {event.actual_hours ? (
                      <div className="text-sm text-stone-300">{event.actual_hours}h worked</div>
                    ) : event.scheduled_hours ? (
                      <div className="text-sm text-stone-400">
                        {event.scheduled_hours}h scheduled
                      </div>
                    ) : null}
                    <StatusBadge status={event.assignment_status} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    scheduled: 'info',
    confirmed: 'success',
    completed: 'default',
    no_show: 'error',
  }
  return <Badge variant={variants[status] ?? 'default'}>{status.replace('_', ' ')}</Badge>
}

function formatEventDate(date: string): string {
  try {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return date
  }
}
