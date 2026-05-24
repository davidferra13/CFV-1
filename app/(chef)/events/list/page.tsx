import type { Metadata } from 'next'
import Image from 'next/image'
import { Suspense } from 'react'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEvents, getEventsPaginated } from '@/lib/events/actions'
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
import { Card } from '@/components/ui/card'
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
import { getEventIndexPaymentState } from '@/lib/events/payment-state'

export const metadata: Metadata = { title: 'Events List' }

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

const PAGE_SIZE = 50

function buildEventsUrl({
  status = 'all',
  search = '',
  page = 1,
}: {
  status?: EventStatus
  search?: string
  page?: number
}) {
  const params = new URLSearchParams()
  if (status !== 'all') params.set('status', status)
  if (search) params.set('q', search)
  if (page > 1) params.set('page', String(page))
  const qs = params.toString()
  return `/events/list${qs ? `?${qs}` : ''}`
}

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

async function EventsList({
  status,
  search,
  page,
}: {
  status: EventStatus
  search: string
  page: number
}) {
  const user = await requireChef()

  const [eventsResult, regional] = await Promise.all([
    getEventsPaginated({
      statusFilter: status !== 'all' ? status : undefined,
      search: search || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    getRegionalSettings(),
  ])

  let events = eventsResult.items.sort(
    (a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  )
  const pagination = eventsResult.pagination

  let eventPhotoMap: Record<string, string> = {}
  const eventPaymentMap: Record<
    string,
    {
      payment_status: string | null
      quoted_price_cents: number | null
      total_paid_cents: number | null
      outstanding_balance_cents: number | null
    }
  > = {}
  const eventIds = events.map((e: any) => e.id)
  for (const event of events) {
    eventPaymentMap[event.id] = {
      payment_status: event.payment_status ?? null,
      quoted_price_cents: event.quoted_price_cents ?? null,
      total_paid_cents: null,
      outstanding_balance_cents: null,
    }
  }
  if (eventIds.length > 0) {
    try {
      const db: any = createServerClient()
      const { data: ledgerRows, error: ledgerError } = await db
        .from('ledger_entries')
        .select('event_id, entry_type, amount_cents, is_refund')
        .eq('tenant_id', user.tenantId!)
        .in('event_id', eventIds)
        .limit(5000)

      if (ledgerError) {
        console.error('[events-list] Ledger payment fetch failed:', ledgerError.message)
      } else {
        const totals: Record<string, { paid: number; refunded: number }> = {}
        for (const row of ledgerRows ?? []) {
          if (!row.event_id) continue
          totals[row.event_id] = totals[row.event_id] ?? { paid: 0, refunded: 0 }
          if (row.is_refund || row.entry_type === 'refund') {
            totals[row.event_id].refunded += Math.abs(Number(row.amount_cents ?? 0))
          } else if (row.entry_type !== 'tip') {
            totals[row.event_id].paid += Number(row.amount_cents ?? 0)
          }
        }
        for (const event of events) {
          const total = totals[event.id] ?? { paid: 0, refunded: 0 }
          const quoted = Number(event.quoted_price_cents ?? 0)
          eventPaymentMap[event.id] = {
            payment_status: event.payment_status ?? null,
            quoted_price_cents: event.quoted_price_cents ?? null,
            total_paid_cents: total.paid,
            outstanding_balance_cents: Math.max(0, quoted - total.paid + total.refunded),
          }
        }
      }

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
          search
            ? `No events matching "${search}"`
            : status === 'all'
              ? copy.noEventsMessage.split('.')[0]
              : `No ${status.replace('_', ' ')} ${copy.eventsLabel.toLowerCase()}`
        }
        description={
          search
            ? 'Try a different search or clear the search filter.'
            : status === 'all'
              ? copy.noEventsMessage
              : `Try a different filter or create a new ${copy.eventSingular}.`
        }
        action={
          status === 'all' && !search
            ? { label: copy.newEventLabel, href: '/events/new' }
            : undefined
        }
        secondaryAction={
          status === 'all' && !search
            ? { label: 'Try the setup wizard', href: '/onboarding/first-event' }
            : undefined
        }
      />
    )
  }

  return (
    <div className="space-y-3">
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
              <TableHead>Payment</TableHead>
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
              const financial = eventPaymentMap[event.id]
              const paymentState = getEventIndexPaymentState({
                eventDate: event.event_date,
                paymentStatus: financial?.payment_status ?? null,
                quotedPriceCents: financial?.quoted_price_cents ?? null,
                totalPaidCents: financial?.total_paid_cents ?? null,
                outstandingBalanceCents: financial?.outstanding_balance_cents ?? null,
              })
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
                        <Image
                          src={eventPhotoMap[event.id]}
                          alt=""
                          width={48}
                          height={48}
                          sizes="48px"
                          unoptimized
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
                  <TableCell>
                    <Link
                      href={`/events/${event.id}/billing`}
                      className="inline-flex min-w-[8rem] flex-col items-start gap-1 rounded-md px-1 py-1 transition-colors hover:bg-stone-800/60"
                    >
                      <Badge
                        variant={paymentState.badgeVariant}
                        className="whitespace-nowrap px-2 py-0.5 text-[11px]"
                      >
                        {paymentState.label}
                      </Badge>
                      {paymentState.showOutstanding ? (
                        <span className="text-xs font-medium tabular-nums text-stone-300">
                          {formatCurrency(paymentState.outstandingBalanceCents, {
                            locale: regional.locale,
                            currency: regional.currencyCode,
                          })}{' '}
                          due
                        </span>
                      ) : (
                        <span className="text-xs tabular-nums text-stone-500">
                          {paymentState.quotedPriceCents !== null
                            ? formatCurrency(paymentState.quotedPriceCents, {
                                locale: regional.locale,
                                currency: regional.currencyCode,
                              })
                            : 'No price set'}
                        </span>
                      )}
                    </Link>
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

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-stone-800 pt-3">
          <p className="text-xs text-stone-500">
            Showing {(pagination.page - 1) * pagination.pageSize + 1}-
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total}
          </p>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <Link
                href={buildEventsUrl({ status, search, page: pagination.page - 1 })}
                className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-700"
              >
                Previous
              </Link>
            )}
            {pagination.hasMore && (
              <Link
                href={buildEventsUrl({ status, search, page: pagination.page + 1 })}
                className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-700"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
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

export default async function EventsListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireChef()

  const params = await searchParams
  const requestedStatus = typeof params.status === 'string' ? params.status : 'all'
  const validStatuses: EventStatus[] = [
    'all',
    'draft',
    'proposed',
    'accepted',
    'paid',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
  ]
  const status = validStatuses.includes(requestedStatus as EventStatus)
    ? (requestedStatus as EventStatus)
    : 'all'
  const search = typeof params.q === 'string' ? params.q.trim() : ''
  const page = Math.max(1, parseInt(typeof params.page === 'string' ? params.page : '1', 10) || 1)

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <TodayEventsBanner />
      </Suspense>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-stone-100">Events</h1>
            <p className="text-sm text-stone-500 mt-1">
              All events with search, filter, and pagination
            </p>
          </div>
          <Suspense fallback={null}>
            <EventConflictsBadge />
          </Suspense>
        </div>
        <Link href="/events/new">
          <Button data-tour="create-event">+ New Event</Button>
        </Link>
      </div>

      <div className="space-y-3 px-1">
        <form action="/events/list" method="get" className="flex flex-wrap items-center gap-2">
          {status !== 'all' && <input type="hidden" name="status" value={status} />}
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Search events by occasion or location..."
            className="w-full max-w-sm rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-200 hover:bg-stone-700"
          >
            Search
          </button>
          {search && (
            <Link
              href={buildEventsUrl({ status })}
              className="text-sm text-stone-500 hover:text-stone-300"
            >
              Clear
            </Link>
          )}
        </form>

        <div className="flex gap-2 flex-wrap">
          <Link href={buildEventsUrl({ status: 'all', search })}>
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
            <Link key={s} href={buildEventsUrl({ status: s, search })}>
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
      </div>

      <WidgetErrorBoundary name="Events List">
        <Suspense
          fallback={
            <Card className="p-8 text-center">
              <p className="text-stone-500">Loading events...</p>
            </Card>
          }
        >
          <EventsList status={status} search={search} page={page} />
        </Suspense>
      </WidgetErrorBoundary>
    </div>
  )
}
