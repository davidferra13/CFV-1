import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import Link from 'next/link'
import { Ticket, CalendarDays, MapPin, Users, Store } from '@/components/ui/icons'

export const metadata = {
  title: 'Explore Events',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Date TBD'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return 'Date TBD'
  }
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`
}

type TicketedEvent = {
  eventId: string
  shareToken: string
  eventName: string
  eventDate: string | null
  serveTime: string | null
  locationCity: string | null
  chefName: string | null
  minPriceCents: number | null
  maxPriceCents: number | null
  totalCapacity: number
  ticketsSold: number
}

type PopUpEvent = {
  eventId: string
  shareToken: string
  eventName: string
  eventDate: string | null
  locationCity: string | null
  chefName: string | null
  spotsRemaining: number
  totalCapacity: number
  stage: string
}

type Circle = {
  id: string
  groupToken: string | null
  name: string
  description: string | null
  memberCount: number
  isActive: boolean
}

export default async function ExploreEventsPage() {
  const user = await requireChef()
  const db: any = createServerClient()
  const today = new Date().toISOString().split('T')[0]

  // ── Ticketed Events (from other chefs) ──────────────────────────────
  let ticketedEvents: TicketedEvent[] = []
  try {
    // Find share settings with ticketing enabled, excluding current user's tenant
    const { data: shares } = await db
      .from('event_share_settings')
      .select('event_id, tenant_id, share_token, tickets_enabled')
      .eq('tickets_enabled', true)
      .neq('tenant_id', user.tenantId!)

    if (shares && shares.length > 0) {
      const eventIds = shares.map((s: any) => s.event_id)
      const tokenMap = new Map(shares.map((s: any) => [s.event_id, s.share_token]))
      const tenantMap = new Map(shares.map((s: any) => [s.event_id, s.tenant_id]))

      // Get upcoming events that are not cancelled or draft
      const { data: events } = await db
        .from('events')
        .select(
          'id, event_date, serve_time, occasion, location_city, status, guest_count, tenant_id'
        )
        .in('id', eventIds)
        .gte('event_date', today)
        .not('status', 'in', '("cancelled","draft")')
        .order('event_date', { ascending: true })
        .limit(20)

      if (events && events.length > 0) {
        // Get ticket types for pricing info
        const { data: ticketTypes } = await db
          .from('event_ticket_types')
          .select('event_id, price_cents, capacity, sold_count')
          .in(
            'event_id',
            events.map((e: any) => e.id)
          )
          .eq('is_active', true)

        const pricesByEvent = new Map<
          string,
          { prices: number[]; capacity: number; sold: number }
        >()
        for (const tt of ticketTypes ?? []) {
          const entry = pricesByEvent.get(tt.event_id) ?? { prices: [], capacity: 0, sold: 0 }
          entry.prices.push(tt.price_cents)
          entry.capacity += tt.capacity ?? 0
          entry.sold += tt.sold_count ?? 0
          pricesByEvent.set(tt.event_id, entry)
        }

        // Get chef names
        const tenantIds = [...new Set(events.map((e: any) => e.tenant_id))]
        const { data: chefs } = await db
          .from('chefs')
          .select('id, business_name, full_name')
          .in('id', tenantIds)

        const chefMap = new Map(
          (chefs ?? []).map((c: any) => [c.id, c.business_name || c.full_name || 'Chef'])
        )

        // Filter out events that have popup config (those go in the popup section)
        ticketedEvents = events
          .filter((e: any) => {
            const entry = pricesByEvent.get(e.id)
            return entry && entry.prices.length > 0
          })
          .map((e: any) => {
            const entry = pricesByEvent.get(e.id)!
            return {
              eventId: e.id,
              shareToken: tokenMap.get(e.id) ?? '',
              eventName: e.occasion || 'Event',
              eventDate: e.event_date,
              serveTime: e.serve_time,
              locationCity: e.location_city,
              chefName: chefMap.get(tenantMap.get(e.id)) ?? null,
              minPriceCents: entry.prices.length > 0 ? Math.min(...entry.prices) : null,
              maxPriceCents: entry.prices.length > 0 ? Math.max(...entry.prices) : null,
              totalCapacity: entry.capacity,
              ticketsSold: entry.sold,
            }
          })
      }
    }
  } catch {
    // Graceful degradation if tables are missing
  }

  // ── Pop-Up Events (from other chefs with popup config) ──────────────
  let popUpEvents: PopUpEvent[] = []
  try {
    const { data: shares } = await db
      .from('event_share_settings')
      .select('event_id, tenant_id, share_token, tickets_enabled, circle_config')
      .eq('tickets_enabled', true)
      .neq('tenant_id', user.tenantId!)

    if (shares && shares.length > 0) {
      // Filter to those with popup config
      const popupShares = shares.filter((s: any) => {
        const config = s.circle_config
        return (
          config?.popUp?.stage &&
          config.popUp.stage !== 'closed' &&
          config.popUp.stage !== 'analyzed'
        )
      })

      if (popupShares.length > 0) {
        const eventIds = popupShares.map((s: any) => s.event_id)
        const tokenMap = new Map(popupShares.map((s: any) => [s.event_id, s.share_token]))
        const tenantMap = new Map(popupShares.map((s: any) => [s.event_id, s.tenant_id]))
        const configMap = new Map<string, any>(
          popupShares.map((s: any) => [s.event_id, s.circle_config])
        )

        const { data: events } = await db
          .from('events')
          .select('id, event_date, occasion, location_city, status, guest_count, tenant_id')
          .in('id', eventIds)
          .gte('event_date', today)
          .not('status', 'in', '("cancelled","draft")')
          .order('event_date', { ascending: true })
          .limit(20)

        if (events && events.length > 0) {
          const tenantIds = [...new Set(events.map((e: any) => e.tenant_id))]
          const { data: chefs } = await db
            .from('chefs')
            .select('id, business_name, full_name')
            .in('id', tenantIds)

          const chefMap = new Map(
            (chefs ?? []).map((c: any) => [c.id, c.business_name || c.full_name || 'Chef'])
          )

          // Get ticket capacity for popup events
          const { data: ticketTypes } = await db
            .from('event_ticket_types')
            .select('event_id, capacity, sold_count')
            .in(
              'event_id',
              events.map((e: any) => e.id)
            )
            .eq('is_active', true)

          const capacityByEvent = new Map<string, { total: number; sold: number }>()
          for (const tt of ticketTypes ?? []) {
            const entry = capacityByEvent.get(tt.event_id) ?? { total: 0, sold: 0 }
            entry.total += tt.capacity ?? 0
            entry.sold += tt.sold_count ?? 0
            capacityByEvent.set(tt.event_id, entry)
          }

          popUpEvents = events.map((e: any) => {
            const config = configMap.get(e.id)
            const cap = capacityByEvent.get(e.id) ?? { total: 0, sold: 0 }
            return {
              eventId: e.id,
              shareToken: tokenMap.get(e.id) ?? '',
              eventName: e.occasion || 'Pop-Up',
              eventDate: e.event_date,
              locationCity: e.location_city,
              chefName: chefMap.get(tenantMap.get(e.id)) ?? null,
              spotsRemaining: Math.max(0, cap.total - cap.sold),
              totalCapacity: cap.total,
              stage: config?.popUp?.stage ?? 'concept',
            }
          })
        }
      }
    }
  } catch {
    // Graceful degradation
  }

  // ── Dinner Circles (from other chefs, active and visible) ───────────
  let circles: Circle[] = []
  try {
    const { data: groups } = await db
      .from('hub_groups')
      .select('id, group_token, name, description, visibility, is_active, tenant_id')
      .eq('is_active', true)
      .neq('tenant_id', user.tenantId!)
      .order('created_at', { ascending: false })
      .limit(20)

    if (groups && groups.length > 0) {
      // Get member counts
      const groupIds = groups.map((g: any) => g.id)
      const memberCounts = new Map<string, number>()

      for (const gId of groupIds) {
        const { count } = await db
          .from('hub_group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', gId)

        memberCounts.set(gId, count ?? 0)
      }

      circles = groups.map((g: any) => ({
        id: g.id,
        groupToken: g.group_token ?? null,
        name: g.name || 'Dinner Circle',
        description: g.description ?? null,
        memberCount: memberCounts.get(g.id) ?? 0,
        isActive: g.is_active !== false,
      }))
    }
  } catch {
    // Graceful degradation
  }

  const hasTicketedEvents = ticketedEvents.length > 0
  const hasPopUps = popUpEvents.length > 0
  const hasCircles = circles.length > 0
  const hasAnything = hasTicketedEvents || hasPopUps || hasCircles

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Events</h1>
        <p className="text-stone-400 mt-1">
          Discover dinners, pop-ups, and circles from your network
        </p>
      </div>

      {!hasAnything && (
        <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-12 text-center">
          <CalendarDays className="h-10 w-10 text-stone-600 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-stone-300">No events yet</h2>
          <p className="text-sm text-stone-500 mt-1 max-w-md mx-auto">
            When other chefs in your network host ticketed dinners, pop-ups, or open their dinner
            circles, they will appear here.
          </p>
        </div>
      )}

      {/* ── Ticketed Events ──────────────────────────────────────────── */}
      {hasTicketedEvents && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-stone-100">Ticketed Events</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ticketedEvents.map((event) => {
              const spotsRemaining =
                event.totalCapacity > 0
                  ? Math.max(0, event.totalCapacity - event.ticketsSold)
                  : null

              return (
                <Link
                  key={event.eventId}
                  href={`/e/${event.shareToken}`}
                  className="group rounded-xl border border-stone-800 bg-stone-900/50 p-6 hover:border-stone-600 hover:bg-stone-900 transition-colors"
                >
                  <h3 className="text-base font-semibold text-stone-100 group-hover:text-amber-400 transition-colors">
                    {event.eventName}
                  </h3>

                  <div className="mt-3 space-y-1.5 text-sm text-stone-400">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 shrink-0" />
                      <span>{formatDate(event.eventDate)}</span>
                    </div>

                    {event.locationCity && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span>{event.locationCity}</span>
                      </div>
                    )}

                    {event.chefName && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 shrink-0" />
                        <span>Hosted by {event.chefName}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-amber-400">
                      {event.minPriceCents !== null
                        ? event.minPriceCents === event.maxPriceCents
                          ? formatPrice(event.minPriceCents)
                          : `${formatPrice(event.minPriceCents)} - ${formatPrice(event.maxPriceCents!)}`
                        : 'Free'}
                    </span>
                    {spotsRemaining !== null && (
                      <span
                        className={`text-xs ${spotsRemaining <= 5 ? 'text-red-400' : 'text-stone-500'}`}
                      >
                        {spotsRemaining === 0 ? 'Sold out' : `${spotsRemaining} spots left`}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Pop-Ups ──────────────────────────────────────────────────── */}
      {hasPopUps && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-stone-100">Pop-Ups</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {popUpEvents.map((event) => (
              <Link
                key={event.eventId}
                href={`/e/${event.shareToken}`}
                className="group rounded-xl border border-stone-800 bg-stone-900/50 p-6 hover:border-stone-600 hover:bg-stone-900 transition-colors"
              >
                <h3 className="text-base font-semibold text-stone-100 group-hover:text-amber-400 transition-colors">
                  {event.eventName}
                </h3>

                <div className="mt-3 space-y-1.5 text-sm text-stone-400">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <span>{formatDate(event.eventDate)}</span>
                  </div>

                  {event.locationCity && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span>{event.locationCity}</span>
                    </div>
                  )}

                  {event.chefName && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 shrink-0" />
                      <span>Hosted by {event.chefName}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs rounded-full bg-stone-800 px-2.5 py-0.5 text-stone-300 capitalize">
                    {event.stage.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`text-xs ${event.spotsRemaining <= 5 ? 'text-red-400' : 'text-stone-500'}`}
                  >
                    {event.spotsRemaining === 0
                      ? 'Sold out'
                      : event.totalCapacity > 0
                        ? `${event.spotsRemaining} spots left`
                        : 'Open'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Dinner Circles ───────────────────────────────────────────── */}
      {hasCircles && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-stone-100">Dinner Circles</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {circles.map((circle) => (
              <div
                key={circle.id}
                className="rounded-xl border border-stone-800 bg-stone-900/50 p-6"
              >
                <h3 className="text-base font-semibold text-stone-100">{circle.name}</h3>

                {circle.description && (
                  <p className="mt-2 text-sm text-stone-400 line-clamp-2">{circle.description}</p>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-stone-500 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {circle.memberCount} member{circle.memberCount !== 1 ? 's' : ''}
                  </span>

                  {circle.groupToken && (
                    <Link
                      href={`/hub/${circle.groupToken}`}
                      className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      View circle
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Section-level empty states when partial data ─────────────── */}
      {hasAnything && !hasTicketedEvents && (
        <section className="rounded-xl border border-stone-800/50 bg-stone-900/30 p-6 text-center">
          <Ticket className="h-6 w-6 text-stone-700 mx-auto mb-2" />
          <p className="text-sm text-stone-500">No ticketed events right now</p>
        </section>
      )}

      {hasAnything && !hasPopUps && (
        <section className="rounded-xl border border-stone-800/50 bg-stone-900/30 p-6 text-center">
          <Store className="h-6 w-6 text-stone-700 mx-auto mb-2" />
          <p className="text-sm text-stone-500">No pop-ups right now</p>
        </section>
      )}

      {hasAnything && !hasCircles && (
        <section className="rounded-xl border border-stone-800/50 bg-stone-900/30 p-6 text-center">
          <Users className="h-6 w-6 text-stone-700 mx-auto mb-2" />
          <p className="text-sm text-stone-500">No dinner circles available right now</p>
        </section>
      )}
    </div>
  )
}
