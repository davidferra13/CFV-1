// Chef Events List Page
// Displays all events in a filterable, sortable table

import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'

export const metadata: Metadata = { title: 'Events - ChefFlow' }
import { getEvents } from '@/lib/events/actions'
import { EventStatusBadge } from '@/components/events/event-status-badge'
import { Badge } from '@/components/ui/badge'
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
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import { isDemoEvent } from '@/lib/onboarding/demo-data'

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

async function EventsList({ status }: { status: EventStatus }) {
  await requireChef()

  let events = await getEvents()

  // Filter by status if not 'all'
  if (status !== 'all') {
    events = events.filter((event) => event.status === status)
  }

  // Sort by date (newest first by default)
  events = events.sort(
    (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  )

  if (events.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-stone-500 mb-4">
          {status === 'all'
            ? 'No events yet. Create your first event!'
            : `No events with status "${status}"`}
        </p>
        {status === 'all' && (
          <Link href="/events/new">
            <Button>Create Event</Button>
          </Link>
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
                  className="text-brand-600 hover:text-brand-800 hover:underline"
                >
                  {event.occasion || 'Untitled Event'}
                </Link>
                {isDemoEvent(event) && (
                  <Badge variant="info" className="ml-2 text-[10px] px-1.5 py-0">
                    Sample
                  </Badge>
                )}
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

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { status?: EventStatus }
}) {
  await requireChef()

  const status = (searchParams.status || 'all') as EventStatus

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Events</h1>
          <p className="text-stone-600 mt-1">Manage your events and proposals</p>
        </div>
        <Link href="/events/new">
          <Button>+ New Event</Button>
        </Link>
      </div>

      {/* Status Filter */}
      <Card className="p-4">
        <div className="flex gap-2 flex-wrap">
          <Link href="/events?status=all">
            <Button size="sm" variant={status === 'all' ? 'primary' : 'secondary'}>
              All
            </Button>
          </Link>
          <Link href="/events?status=draft">
            <Button size="sm" variant={status === 'draft' ? 'primary' : 'secondary'}>
              Draft
            </Button>
          </Link>
          <Link href="/events?status=proposed">
            <Button size="sm" variant={status === 'proposed' ? 'primary' : 'secondary'}>
              Proposed
            </Button>
          </Link>
          <Link href="/events?status=accepted">
            <Button size="sm" variant={status === 'accepted' ? 'primary' : 'secondary'}>
              Accepted
            </Button>
          </Link>
          <Link href="/events?status=paid">
            <Button size="sm" variant={status === 'paid' ? 'primary' : 'secondary'}>
              Paid
            </Button>
          </Link>
          <Link href="/events?status=confirmed">
            <Button size="sm" variant={status === 'confirmed' ? 'primary' : 'secondary'}>
              Confirmed
            </Button>
          </Link>
          <Link href="/events?status=in_progress">
            <Button size="sm" variant={status === 'in_progress' ? 'primary' : 'secondary'}>
              In Progress
            </Button>
          </Link>
          <Link href="/events?status=completed">
            <Button size="sm" variant={status === 'completed' ? 'primary' : 'secondary'}>
              Completed
            </Button>
          </Link>
          <Link href="/events?status=cancelled">
            <Button size="sm" variant={status === 'cancelled' ? 'primary' : 'secondary'}>
              Cancelled
            </Button>
          </Link>
        </div>
      </Card>

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
    </div>
  )
}
