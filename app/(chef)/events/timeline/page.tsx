// Event Timeline Page - Gantt-style horizontal timeline of all events
// Server component: fetches data, hands off to client timeline component.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEvents } from '@/lib/events/actions'
import { EventTimelineView } from '@/components/events/event-timeline-view'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Event Timeline' }

export default async function EventTimelinePage() {
  await requireChef()
  const events = await getEvents()

  // Filter out cancelled events and map to lean timeline shape
  const timelineEvents = events
    .filter((e: any) => e.status !== 'cancelled')
    .map((e: any) => ({
      id: e.id,
      occasion: e.occasion ?? 'Untitled Event',
      event_date: e.event_date,
      serve_time: e.serve_time ?? null,
      guest_count: e.guest_count ?? null,
      status: e.status,
      client_name: (e.client as { full_name?: string } | null)?.full_name ?? 'Unknown',
    }))

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Event Timeline</h1>
          <p className="text-stone-400 mt-1 text-sm">Visual overview of your events across time</p>
        </div>
        <div className="flex gap-2">
          <Link href="/events">
            <Button variant="secondary">List View</Button>
          </Link>
          <Link href="/events/board">
            <Button variant="secondary">Board View</Button>
          </Link>
          <Link href="/events/new">
            <Button>+ New Event</Button>
          </Link>
        </div>
      </div>

      {/* Timeline (client component) */}
      <EventTimelineView events={timelineEvents} />
    </div>
  )
}
