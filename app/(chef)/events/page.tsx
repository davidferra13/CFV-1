// Chef Events List Page
// Displays all events in a filterable table or kanban board.
// Toggle between views with ?view=list (default) and ?view=kanban.

import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'

export const metadata: Metadata = { title: 'Events - ChefFlow' }
import { getEvents } from '@/lib/events/actions'
import { EventStatusBadge } from '@/components/events/event-status-badge'
import { EventsKanban } from '@/components/events/events-kanban'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { NoEventsIllustration } from '@/components/ui/branded-illustrations'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import { EventsViewFilterBar } from '@/components/events/events-view-filter-bar'

type EventStatus =
  | 'all'
  | 'draft'
  | 'proposed'
  | 'accepted'
  | 'paid'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
type ViewMode = 'list' | 'kanban'

async function EventsList({ status }: { status: EventStatus }) {
  await requireChef()

  let events = await getEvents()

  if (status !== 'all') {
    events = events.filter((event) => event.status === status)
  }

  events = events.sort(
    (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  )

  if (events.length === 0) {
    return (
      <Card>
        {status === 'all' ? (
          <EmptyState
            illustration={<NoEventsIllustration />}
            title="No events yet"
            description="Create your first event to start managing proposals, timelines, and financials in one place."
            action={{ label: 'Create Event', href: '/events/new' }}
          />
        ) : (
          <EmptyState
            title={`No ${status.replace(/_/g, ' ')} events`}
            description="There are no events matching this status filter right now."
            secondaryAction={{ label: 'View all events', href: '/events' }}
          />
        )}
      </Card>
    )
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Occasion</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Quoted Price</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/events/${event.id}`}
                  className="text-brand-600 hover:text-brand-300 hover:underline"
                >
                  {event.occasion || 'Untitled Event'}
                </Link>
              </TableCell>
              <TableCell>{format(new Date(event.event_date), 'MMM d, yyyy')}</TableCell>
              <TableCell>{event.client?.full_name || 'Unknown'}</TableCell>
              <TableCell>
                <EventStatusBadge status={event.status} />
              </TableCell>
              <TableCell>{formatCurrency(event.quoted_price_cents ?? 0)}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Link href={`/events/${event.id}`}>
                    <Button size="sm" variant="secondary">
                      View
                    </Button>
                  </Link>
                  {event.status === 'draft' && (
                    <Link href={`/events/${event.id}/edit`}>
                      <Button size="sm" variant="secondary">
                        Edit
                      </Button>
                    </Link>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

async function EventsKanbanView() {
  await requireChef()
  const events = await getEvents()
  return <EventsKanban events={events} />
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { status?: EventStatus; view?: ViewMode }
}) {
  await requireChef()

  const status = (searchParams.status || 'all') as EventStatus
  const view = (searchParams.view || 'list') as ViewMode

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Events</h1>
          <p className="text-stone-400 mt-1">Manage your events and proposals</p>
        </div>
        <div className="flex items-center gap-2">
          <Link data-info="new-event" href="/events/new">
            <Button>+ New Event</Button>
          </Link>
        </div>
      </div>

      <Card className="p-4">
        <EventsViewFilterBar initialStatus={status} initialView={view} />
      </Card>

      {view === 'kanban' ? (
        /* Kanban Board */
        <Suspense
          fallback={
            <div className="py-12 text-center text-stone-500 text-sm">Loading board...</div>
          }
        >
          <EventsKanbanView />
        </Suspense>
      ) : (
        <>
          {/* Events Table */}
          <Suspense
            fallback={
              <Card className="p-8 text-center">
                <p className="text-stone-500">Loading events...</p>
              </Card>
            }
          >
            <EventsList status={status} />
          </Suspense>
        </>
      )}
    </div>
  )
}
