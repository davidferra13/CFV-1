// Chef Events List Page
// Displays all events in a filterable table or kanban board.
// Toggle between views with ?view=list (default) and ?view=kanban.
// List view supports bulk selection with archive + delete-drafts actions.

import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'

export const metadata: Metadata = { title: 'Events - ChefFlow' }
import { getEvents } from '@/lib/events/actions'
import { EventsKanban } from '@/components/events/events-kanban'
import { EventsBulkTable } from '@/components/events/events-bulk-table'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { NoEventsIllustration } from '@/components/ui/branded-illustrations'
import { EventsViewFilterBar } from '@/components/events/events-view-filter-bar'
import { getWeatherForEvents } from '@/lib/weather/weather-actions'

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
    events = events.filter((event: any) => event.status === status)
  }

  events = events.sort(
    (a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  )

  // Fetch weather for upcoming events that have coordinates (non-blocking)
  const weatherById = await getWeatherForEvents(
    events.map((e: any) => ({
      id: e.id,
      event_date: e.event_date,
      location_lat: e.location_lat ?? null,
      location_lng: e.location_lng ?? null,
    }))
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

  // Map events to the shape the bulk table expects, including weather data
  const eventsWithWeather = events.map((event: any) => ({
    id: event.id,
    occasion: event.occasion,
    event_date: event.event_date,
    status: event.status,
    quoted_price_cents: event.quoted_price_cents,
    client: event.client ? { full_name: event.client.full_name } : null,
    weather: weatherById[event.id]
      ? {
          emoji: weatherById[event.id].emoji,
          description: weatherById[event.id].description,
          tempMinF: weatherById[event.id].tempMinF,
          tempMaxF: weatherById[event.id].tempMaxF,
        }
      : null,
  }))

  return <EventsBulkTable events={eventsWithWeather} />
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
