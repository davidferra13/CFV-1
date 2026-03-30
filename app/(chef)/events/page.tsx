// Chef Events Hub Page
// Hub page for /events - navigation tiles to all event sub-sections + the events list below.

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
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
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import { isDemoEvent } from '@/lib/onboarding/demo-data-utils'
import { createServerClient } from '@/lib/db/server'

export const metadata: Metadata = { title: 'Events - ChefFlow' }

const hubSections = [
  {
    heading: 'Planning',
    items: [
      {
        href: '/events/new',
        label: 'New Event',
        description: 'Create a new event from scratch',
        icon: '➕',
      },
      {
        href: '/calendar',
        label: 'Calendar',
        description: 'Day, week, and year views of your schedule',
        icon: '📅',
      },
      {
        href: '/events/board',
        label: 'Kanban Board',
        description: 'Visual board of all events by status',
        icon: '🗂️',
      },
    ],
  },
  {
    heading: 'Pipeline',
    items: [
      {
        href: '/inquiries',
        label: 'Inquiries',
        description: 'Incoming requests and new leads',
        icon: '📥',
      },
      {
        href: '/quotes',
        label: 'Quotes',
        description: 'Draft, sent, accepted, and expired quotes',
        icon: '📄',
      },
      {
        href: '/proposals',
        label: 'Proposals',
        description: 'Detailed proposals with packages and add-ons',
        icon: '📋',
      },
    ],
  },
  {
    heading: 'Review',
    items: [
      {
        href: '/feedback',
        label: 'Client Feedback',
        description: 'Request and view post-event feedback',
        icon: '⭐',
      },
      {
        href: '/aar',
        label: 'Event Reviews',
        description: 'After-action reviews and lessons learned',
        icon: '📝',
      },
    ],
  },
]

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
  const user = await requireChef()

  let events = await getEvents()

  if (status !== 'all') {
    events = events.filter((event: any) => event.status === status)
  }

  events = events.sort(
    (a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  )

  // Fetch first dish photo per event (via menus -> dishes, public bucket)
  let eventPhotoMap: Record<string, string> = {}
  const eventIds = events.map((e: any) => e.id)
  if (eventIds.length > 0) {
    try {
      const db: any = createServerClient()
      const { data: menus } = await db
        .from('menus')
        .select('id, event_id')
        .in('event_id', eventIds)
        .eq('tenant_id', user.tenantId!)
      if (menus && menus.length > 0) {
        const menuIds = menus.map((m: any) => m.id)
        const menuToEvent: Record<string, string> = {}
        for (const m of menus) menuToEvent[m.id] = m.event_id
        const { data: dishes } = await db
          .from('dishes')
          .select('menu_id, photo_url')
          .in('menu_id', menuIds)
          .not('photo_url', 'is', null)
          .order('course_number', { ascending: true })
        if (dishes) {
          for (const dish of dishes) {
            const eid = menuToEvent[dish.menu_id]
            if (eid && dish.photo_url && !eventPhotoMap[eid]) {
              eventPhotoMap[eid] = dish.photo_url
            }
          }
        }
      }
    } catch (err: any) {
      console.error('[events-list] Dish photos fetch failed (non-blocking):', err.message)
    }
  }

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
            <TableHead className="w-14"></TableHead>
            <TableHead>Occasion</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Quoted Price</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event: any) => (
            <TableRow key={event.id}>
              <TableCell className="w-14 p-1">
                {eventPhotoMap[event.id] && (
                  <Link href={`/events/${event.id}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={eventPhotoMap[event.id]}
                      alt=""
                      className="h-12 w-12 rounded object-cover"
                    />
                  </Link>
                )}
              </TableCell>
              <TableCell className="font-medium">
                <Link
                  href={`/events/${event.id}`}
                  className="text-brand-600 hover:text-brand-800 hover:underline"
                >
                  {event.occasion || 'Untitled Event'}
                </Link>
                {isDemoEvent(event) && (
                  <Badge variant="info" className="ml-2 text-xxs px-1.5 py-0">
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
    <div className="space-y-10">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Events</h1>
          <p className="text-stone-500 mt-1">Calendar, pipeline, and event management</p>
        </div>
        <Link href="/events/new">
          <Button data-tour="create-event">+ New Event</Button>
        </Link>
      </div>

      {/* Hub tiles */}
      {hubSections.map((section) => (
        <div key={section.heading}>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">
            {section.heading}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {section.items.map((tile) => (
              <Link key={tile.href} href={tile.href} className="group block">
                <Card className="h-full transition-colors group-hover:border-brand-700/60 group-hover:bg-stone-800/60">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl leading-none mt-0.5 flex-shrink-0">
                        {tile.icon}
                      </span>
                      <div>
                        <p className="font-semibold text-stone-100 group-hover:text-brand-400 transition-colors">
                          {tile.label}
                        </p>
                        <p className="text-sm text-stone-500 mt-0.5">{tile.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* Events list */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">
          All Events
        </h2>

        {/* Status Filter */}
        <Card className="p-4 mb-4">
          <div className="flex gap-2 flex-wrap">
            {(
              [
                'all',
                'draft',
                'proposed',
                'accepted',
                'paid',
                'confirmed',
                'in_progress',
                'completed',
                'cancelled',
              ] as EventStatus[]
            ).map((s) => (
              <Link key={s} href={`/events?status=${s}`}>
                <Button size="sm" variant={status === s ? 'primary' : 'secondary'}>
                  {s === 'all'
                    ? 'All'
                    : s === 'in_progress'
                      ? 'In Progress'
                      : s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              </Link>
            ))}
          </div>
        </Card>

        <WidgetErrorBoundary name="Events List">
          <Suspense
            fallback={
              <Card className="p-8 text-center">
                <p className="text-stone-500">Loading events...</p>
              </Card>
            }
          >
            <EventsList status={status} />
          </Suspense>
        </WidgetErrorBoundary>
      </div>
    </div>
  )
}
