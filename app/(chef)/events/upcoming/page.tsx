import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEvents } from '@/lib/events/actions'
import { EventStatusBadge } from '@/components/events/event-status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'

export const metadata: Metadata = { title: 'Upcoming Events - ChefFlow' }

const UPCOMING_STATUSES = ['proposed', 'accepted', 'paid', 'confirmed', 'in_progress']

export default async function UpcomingEventsPage() {
  await requireChef()

  const allEvents = await getEvents()
  const events = allEvents
    .filter(e => UPCOMING_STATUSES.includes(e.status))
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())

  return (
    <div className="space-y-6">
      <div>
        <Link href="/events" className="text-sm text-stone-500 hover:text-stone-700">
          ← All Events
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-900">Upcoming Events</h1>
          <span className="bg-stone-100 text-stone-600 text-sm px-2 py-0.5 rounded-full">
            {events.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">Proposed, accepted, paid, confirmed, and in-progress events</p>
      </div>

      {events.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-600 font-medium mb-1">No upcoming events</p>
          <p className="text-stone-400 text-sm mb-4">Events with active bookings will appear here</p>
          <Link href="/events">
            <Button variant="secondary" size="sm">View All Events</Button>
          </Link>
        </Card>
      ) : (
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
                  </TableCell>
                  <TableCell>
                    {format(new Date(event.event_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    {event.client?.full_name || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <EventStatusBadge status={event.status} />
                  </TableCell>
                  <TableCell>
                    {formatCurrency(event.quoted_price_cents ?? 0)}
                  </TableCell>
                  <TableCell>
                    <Link href={`/events/${event.id}`}>
                      <Button size="sm" variant="secondary">View</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
