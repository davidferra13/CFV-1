// Chef Events Hub Page
// Hub page for /events - navigation tiles to all event sub-sections + the events list below.

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEvents } from '@/lib/events/actions'
import {
  EventStatusBadge,
  type EventStatus as BadgeEventStatus,
} from '@/components/events/event-status-badge'
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
import { formatCurrency } from '@/lib/utils/format'
import { getRegionalSettings } from '@/lib/chef/actions'
import { format } from 'date-fns'
import { isDemoEvent } from '@/lib/onboarding/demo-data-utils'
import { createServerClient } from '@/lib/db/server'
import { EmptyState } from '@/components/ui/empty-state'
import { getCachedChefArchetype } from '@/lib/chef/layout-data-cache'
import { getArchetypeCopy } from '@/lib/archetypes/ui-copy'
import { detectEventConflicts } from '@/lib/events/conflict-detection'
import { ConflictBadge } from '@/components/events/conflict-badge'
import { evaluateCompletion } from '@/lib/completion/engine'
import { CompletionBadge } from '@/components/completion/completion-badge'
import type { CompletionStatus } from '@/lib/completion/types'

export const metadata: Metadata = { title: 'Events' }

const hubSections = [
  {
    heading: 'Planning',
    accent: 'border-l-brand-700/40',
    iconTint: 'text-sky-400',
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
      {
        href: '/events/travel',
        label: 'Travel Planning',
        description: 'Upcoming trips across all events, next 90 days',
        icon: '🗺️',
      },
    ],
  },
  {
    heading: 'Specialized',
    accent: 'border-l-emerald-700/40',
    iconTint: 'text-emerald-400',
    items: [
      {
        href: '/events/cannabis',
        label: 'Cannabis Events',
        description: 'Cannabis dining portal with compliance and ledger',
        icon: '🌿',
      },
      {
        href: '/events/charity',
        label: 'Community Impact',
        description: 'Charity events, volunteer hours, and donations',
        icon: '💚',
      },
    ],
  },
  {
    heading: 'Pipeline',
    accent: 'border-l-brand-700/40',
    iconTint: 'text-amber-400',
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
    accent: 'border-l-brand-700/40',
    iconTint: 'text-emerald-400',
    items: [
      {
        href: '/surveys',
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

// --- Event list urgency helpers (deterministic, no DB calls) ---

type NextStepInfo = {
  text: string
  owner: 'chef' | 'client' | 'done'
}

function getEventNextStep(status: string): NextStepInfo {
  switch (status) {
    case 'draft':
      return { text: 'Finalize and send proposal', owner: 'chef' }
    case 'proposed':
      return { text: 'Waiting for client response', owner: 'client' }
    case 'accepted':
      return { text: 'Collect deposit', owner: 'chef' }
    case 'paid':
      return { text: 'Confirm event details', owner: 'chef' }
    case 'confirmed':
      return { text: 'Prepare for event', owner: 'chef' }
    case 'in_progress':
      return { text: 'Complete event', owner: 'chef' }
    case 'completed':
      return { text: 'Done', owner: 'done' }
    case 'cancelled':
      return { text: 'Cancelled', owner: 'done' }
    default:
      return { text: '', owner: 'done' }
  }
}

function getEventStaleness(updatedAt: string | null, status: string): 'ok' | 'warm' | 'hot' {
  if (!updatedAt) return 'ok'
  if (status === 'completed' || status === 'cancelled') return 'ok'
  const hoursStale = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60)
  if (hoursStale >= 72) return 'hot'
  if (hoursStale >= 24) return 'warm'
  return 'ok'
}

// --- End urgency helpers ---

async function EventsList({ status }: { status: EventStatus }) {
  const user = await requireChef()

  const [events_raw, regional] = await Promise.all([getEvents(), getRegionalSettings()])
  let events = events_raw

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

  // Batch completion scores (shallow, capped at 30 for perf)
  const completionMap: Record<string, { score: number; status: CompletionStatus }> = {}
  const activeEventIds = eventIds
    .filter((_id: string, i: number) => {
      const ev = events[i] as any
      return ev.status !== 'completed' && ev.status !== 'cancelled'
    })
    .slice(0, 30)
  if (activeEventIds.length > 0) {
    const completionResults = await Promise.allSettled(
      activeEventIds.map((id: string) =>
        evaluateCompletion('event', id, user.tenantId!, { shallow: true })
      )
    )
    completionResults.forEach((result, i) => {
      if (result.status === 'fulfilled' && result.value) {
        completionMap[activeEventIds[i]] = {
          score: result.value.score,
          status: result.value.status,
        }
      }
    })
  }

  if (events.length === 0) {
    const archetype = await getCachedChefArchetype(user.entityId).catch(() => null)
    const copy = getArchetypeCopy(archetype)
    return (
      <EmptyState
        remy={status === 'all' ? 'idle' : 'straight-face'}
        title={
          status === 'all'
            ? copy.noEventsMessage.split('.')[0]
            : `No ${status.replace('_', ' ')} ${copy.eventsLabel.toLowerCase()}`
        }
        description={
          status === 'all'
            ? copy.noEventsMessage
            : `Try a different filter or create a new ${copy.eventSingular}.`
        }
        action={status === 'all' ? { label: copy.newEventLabel, href: '/events/new' } : undefined}
      />
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
            <TableHead>Next Step</TableHead>
            <TableHead className="text-right">Quoted</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event: any, idx: number) => {
            const _td = new Date()
            const isToday =
              event.event_date ===
              `${_td.getFullYear()}-${String(_td.getMonth() + 1).padStart(2, '0')}-${String(_td.getDate()).padStart(2, '0')}`
            const eventDate = new Date(event.event_date)
            const rowStripe = idx % 2 === 1 ? 'bg-stone-800/20' : ''
            return (
              <TableRow
                key={event.id}
                className={`transition-colors hover:bg-stone-800/40 ${
                  isToday ? 'bg-amber-950/20 border-l-2 border-l-amber-600' : rowStripe
                }`}
              >
                <TableCell className="w-14 p-1">
                  {eventPhotoMap[event.id] ? (
                    <Link href={`/events/${event.id}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={eventPhotoMap[event.id]}
                        alt=""
                        className="h-12 w-12 rounded-lg object-cover ring-1 ring-stone-700/50"
                      />
                    </Link>
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-stone-800/60 flex items-center justify-center text-stone-600 text-lg">
                      🍽️
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/events/${event.id}`}
                    className="text-stone-100 font-semibold hover:text-brand-400 transition-colors"
                  >
                    {event.occasion || 'Untitled Event'}
                  </Link>
                  {isToday && (
                    <Badge variant="warning" className="ml-2 text-xxs px-1.5 py-0">
                      Tonight
                    </Badge>
                  )}
                  {isDemoEvent(event) && (
                    <Badge variant="info" className="ml-2 text-xxs px-1.5 py-0">
                      Sample
                    </Badge>
                  )}
                  {event.guest_count > 0 && (
                    <span className="block text-xs text-stone-500 mt-0.5">
                      {event.guest_count} guest{event.guest_count !== 1 ? 's' : ''}
                    </span>
                  )}
                  {completionMap[event.id] && (
                    <CompletionBadge
                      score={completionMap[event.id].score}
                      status={completionMap[event.id].status}
                      className="mt-0.5"
                    />
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-stone-800/80 border border-stone-700/50 text-center leading-tight">
                      <span className="text-[10px] font-semibold uppercase text-stone-500">
                        {format(eventDate, 'MMM')}
                      </span>
                      <span className="text-sm font-bold text-stone-200 -mt-0.5">
                        {format(eventDate, 'd')}
                      </span>
                    </span>
                    <span className="text-xs text-stone-500">{format(eventDate, 'yyyy')}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-stone-300">{event.client?.full_name || 'Unknown'}</span>
                </TableCell>
                <TableCell>
                  <EventStatusBadge status={event.status} />
                </TableCell>
                <TableCell>
                  {(() => {
                    const next = getEventNextStep(event.status)
                    const staleness = getEventStaleness(event.updated_at, event.status)
                    if (next.owner === 'done') {
                      return <span className="text-xs text-stone-600 italic">{next.text}</span>
                    }
                    const urgencyClasses =
                      staleness === 'hot'
                        ? 'bg-red-950/50 text-red-300 border-red-800/50'
                        : staleness === 'warm'
                          ? 'bg-amber-950/40 text-amber-300 border-amber-800/40'
                          : 'bg-stone-800/60 text-stone-300 border-stone-700/40'
                    return (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${urgencyClasses}`}
                      >
                        {staleness === 'hot' && (
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400" />
                        )}
                        {next.text}
                        {next.owner === 'client' && (
                          <span className="text-stone-500 font-normal ml-0.5">(client)</span>
                        )}
                      </span>
                    )
                  })()}
                </TableCell>
                <TableCell className="text-right font-medium text-stone-200 tabular-nums">
                  {formatCurrency(event.quoted_price_cents ?? 0, {
                    locale: regional.locale,
                    currency: regional.currencyCode,
                  })}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1.5">
                    <Link href={`/events/${event.id}`}>
                      <Button size="sm" variant="ghost">
                        View
                      </Button>
                    </Link>
                    {isToday && !['draft', 'cancelled'].includes(event.status) && (
                      <Link href={`/events/${event.id}/pack`}>
                        <Button size="sm" variant="primary">
                          Pack
                        </Button>
                      </Link>
                    )}
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
            )
          })}
        </TableBody>
      </Table>
    </Card>
  )
}

async function EventConflictsBadge() {
  const events_raw = await getEvents()
  const conflicts = detectEventConflicts(
    events_raw.map((e: any) => ({
      id: e.id,
      occasion: e.occasion,
      event_date: e.event_date,
      serve_time: e.serve_time,
      status: e.status,
    }))
  )
  if (conflicts.length === 0) return null
  return <ConflictBadge conflicts={conflicts} />
}

async function TodayEventsBanner() {
  const _teb = new Date()
  const today = `${_teb.getFullYear()}-${String(_teb.getMonth() + 1).padStart(2, '0')}-${String(_teb.getDate()).padStart(2, '0')}`
  const events = await getEvents()
  const todayEvents = events.filter(
    (e: any) => e.event_date === today && !['draft', 'cancelled'].includes(e.status)
  )
  if (todayEvents.length === 0) return null

  return (
    <div className="space-y-2">
      {todayEvents.map((event: any) => (
        <div
          key={event.id}
          className="rounded-xl border border-amber-800/40 bg-amber-950/30 px-5 py-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide mb-0.5">
                Tonight
              </p>
              <p className="text-stone-100 font-semibold text-lg">{event.occasion || 'Event'}</p>
              <p className="text-stone-400 text-sm">
                {event.client?.full_name || 'Client'}
                {event.serve_time ? ` at ${event.serve_time}` : ''}
                {event.guest_count > 0 ? ` · ${event.guest_count} guests` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/events/${event.id}/pack`}
                className="inline-flex items-center px-3 py-1.5 rounded-md bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium transition-colors"
              >
                Pack List
              </Link>
              <Link
                href={`/events/${event.id}/grocery-quote`}
                className="inline-flex items-center px-3 py-1.5 rounded-md bg-stone-700 hover:bg-stone-600 text-stone-200 text-xs font-medium transition-colors"
              >
                Grocery List
              </Link>
              <Link
                href={`/events/${event.id}`}
                className="inline-flex items-center px-3 py-1.5 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-400 text-xs font-medium transition-colors"
              >
                Full Event
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
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
      {/* Today's events - shown when event is today */}
      <Suspense fallback={null}>
        <TodayEventsBanner />
      </Suspense>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold text-stone-100">Events</h1>
            <p className="text-stone-500 mt-1">Calendar, pipeline, and event management</p>
          </div>
          <Suspense fallback={null}>
            <EventConflictsBadge />
          </Suspense>
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
                <Card interactive className={`h-full border-l-2 ${section.accent}`}>
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-start gap-3">
                      <span className={`text-2xl leading-none mt-0.5 flex-shrink-0`}>
                        {tile.icon}
                      </span>
                      <div>
                        <p className="font-semibold text-stone-100">{tile.label}</p>
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
        <div className="flex gap-2 flex-wrap mb-4 px-1">
          <Link href="/events?status=all">
            <Button
              size="sm"
              variant={status === 'all' ? 'primary' : 'ghost'}
              className="rounded-full"
            >
              All
            </Button>
          </Link>
          {(
            [
              'draft',
              'proposed',
              'accepted',
              'paid',
              'confirmed',
              'in_progress',
              'completed',
              'cancelled',
            ] as BadgeEventStatus[]
          ).map((s) => (
            <Link key={s} href={`/events?status=${s}`}>
              <span
                className={`cursor-pointer transition-all duration-150 ${
                  status === s
                    ? 'ring-2 ring-brand-500/50 ring-offset-1 ring-offset-stone-900 rounded-full'
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                <EventStatusBadge status={s} size="sm" />
              </span>
            </Link>
          ))}
        </div>

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
