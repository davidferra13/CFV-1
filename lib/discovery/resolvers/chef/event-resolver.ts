import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

const MS_DAY = 86_400_000
const TERMINAL_STATUSES = new Set(['completed', 'cancelled', 'archived'])

export interface EventRow {
  id: string
  status: string
  event_date: string | null
  serve_time: string | null
  guest_count: number | null
  occasion: string | null
  location_city: string | null
  location_state: string | null
  client: { id: string; full_name: string; email: string | null } | null
}

export function assignEventTier(row: EventRow, now: Date): RailTier | null {
  if (TERMINAL_STATUSES.has(row.status)) return null
  if (!row.event_date) return 'p3'

  const eventMs = new Date(row.event_date + 'T00:00:00').getTime()
  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const daysUntil = Math.round((eventMs - nowStart) / MS_DAY)

  if (daysUntil < 0) return null // Past
  if (daysUntil === 0) return 'p0' // Today
  if (daysUntil === 1) return 'p1' // Tomorrow
  if (daysUntil <= 7) return 'p2' // This week
  return 'p3'
}

export function buildEventLabel(row: EventRow, now: Date): string {
  const parts: string[] = []
  parts.push(row.occasion ?? row.client?.full_name ?? 'Event')

  if (row.guest_count) parts.push(`${row.guest_count}g`)

  if (row.event_date) {
    const eventMs = new Date(row.event_date + 'T00:00:00').getTime()
    const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const daysUntil = Math.round((eventMs - nowStart) / MS_DAY)
    if (daysUntil <= 0) parts.push('today')
    else if (daysUntil === 1) parts.push('tomorrow')
    else {
      const d = new Date(row.event_date + 'T00:00:00')
      parts.push(d.toLocaleDateString('en-US', { weekday: 'short' }))
    }
  }

  if (row.serve_time) parts.push(row.serve_time)
  if (row.location_city) parts.push(row.location_city)

  return parts.join(' ')
}

async function resolveEntityScopedEvent(
  ctx: GodModeResolverContext,
  eventId: string
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  try {
    const rows = await pgClient<EventRow[]>`
      SELECT
        e.id,
        e.status,
        e.event_date,
        e.serve_time,
        e.guest_count,
        e.occasion,
        e.location_city,
        e.location_state,
        CASE
          WHEN c.id IS NULL THEN NULL
          ELSE json_build_object('id', c.id, 'full_name', c.full_name, 'email', c.email)
        END AS client
      FROM events e
      LEFT JOIN clients c ON c.id = e.client_id AND c.tenant_id = e.tenant_id
      WHERE e.tenant_id = ${ctx.tenantId}
        AND e.id = ${eventId}
        AND e.deleted_at IS NULL
      LIMIT 1
    `
    const row = rows[0]
    if (!row) return []

    const items: GodModeResolvedItem[] = []

    // Countdown / status item
    const tier = assignEventTier(row, ctx.now) ?? 'p3'
    items.push({
      definitionId: 'chef.event_entity_status',
      tier,
      label: buildEventLabel(row, ctx.now),
      context: `${row.guest_count ?? '?'} guests, ${row.status}`,
      destination: `/chef/events/${row.id}`,
      icon: 'calendar',
      loopState: TERMINAL_STATUSES.has(row.status) ? 'done' : 'active',
      sourceKind: 'event',
      evidenceLabel: 'confirmed',
      confidence: 1,
      proofHref: `/chef/events/${row.id}`,
      nextAction: TERMINAL_STATUSES.has(row.status)
        ? null
        : tier === 'p0'
          ? 'Open event checklist'
          : 'Review event plan',
      data: {
        eventId: row.id,
        eventDate: row.event_date,
        guestCount: row.guest_count,
        clientId: row.client?.id,
      },
    })

    // Guest count intel (only when guests are set)
    if (row.guest_count && row.guest_count > 0) {
      items.push({
        definitionId: 'chef.event_entity_guests',
        tier: 'p3',
        label: `${row.guest_count} guest${row.guest_count === 1 ? '' : 's'} confirmed`,
        context: row.client?.full_name ?? 'No client assigned',
        destination: `/chef/events/${row.id}`,
        icon: 'users',
        loopState: 'active',
        sourceKind: 'event',
        evidenceLabel: 'confirmed',
        confidence: 1,
        proofHref: `/chef/events/${row.id}`,
        nextAction: null,
        data: { eventId: row.id, guestCount: row.guest_count },
      })
    }

    // Countdown intel (only for future events with a date)
    if (row.event_date && !TERMINAL_STATUSES.has(row.status)) {
      const eventMs = new Date(row.event_date + 'T00:00:00').getTime()
      const nowStart = new Date(
        ctx.now.getFullYear(),
        ctx.now.getMonth(),
        ctx.now.getDate()
      ).getTime()
      const daysUntil = Math.round((eventMs - nowStart) / MS_DAY)
      if (daysUntil >= 0) {
        const countdownLabel =
          daysUntil === 0
            ? 'Event is today'
            : daysUntil === 1
              ? '1 day away'
              : `${daysUntil} days away`
        items.push({
          definitionId: 'chef.event_entity_countdown',
          tier: daysUntil <= 1 ? 'p1' : 'p3',
          label: countdownLabel,
          context: row.serve_time ? `Serve at ${row.serve_time}` : 'No serve time set',
          destination: `/chef/events/${row.id}`,
          icon: 'clock',
          loopState: 'active',
          sourceKind: 'event',
          evidenceLabel: 'computed',
          confidence: 1,
          proofHref: `/chef/events/${row.id}`,
          nextAction: daysUntil === 0 ? 'Final prep check' : null,
          data: { eventId: row.id, daysUntil },
        })
      }
    }

    return items
  } catch (err) {
    console.error('[event-resolver] Entity-scoped query failed:', err)
    return []
  }
}

async function resolveClientScopedEvents(
  ctx: GodModeResolverContext,
  clientId: string
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  let events: EventRow[]
  try {
    events = await pgClient<EventRow[]>`
      SELECT
        e.id,
        e.status,
        e.event_date,
        e.serve_time,
        e.guest_count,
        e.occasion,
        e.location_city,
        e.location_state,
        CASE
          WHEN c.id IS NULL THEN NULL
          ELSE json_build_object('id', c.id, 'full_name', c.full_name, 'email', c.email)
        END AS client
      FROM events e
      LEFT JOIN clients c ON c.id = e.client_id AND c.tenant_id = e.tenant_id
      WHERE e.tenant_id = ${ctx.tenantId}
        AND e.client_id = ${clientId}
        AND e.deleted_at IS NULL
      ORDER BY e.event_date ASC NULLS LAST
      LIMIT 8
    `
  } catch (err) {
    console.error('[event-resolver] Client-scoped query failed:', err)
    return []
  }

  return eventsToRailItems(events, ctx)
}

export async function resolveEvents(ctx: GodModeResolverContext): Promise<GodModeResolvedItem[]> {
  if (ctx.entityContext?.type === 'event') {
    return resolveEntityScopedEvent(ctx, ctx.entityContext.id)
  }
  if (ctx.entityContext?.type === 'client') {
    return resolveClientScopedEvents(ctx, ctx.entityContext.id)
  }

  const { getEvents } = await import('@/lib/events/actions')

  let events: EventRow[]
  try {
    const result = await getEvents()
    events = (result ?? []) as unknown as EventRow[]
  } catch (err) {
    console.error('[event-resolver] Query failed:', err)
    return []
  }

  return eventsToRailItems(events, ctx)
}

function eventsToRailItems(events: EventRow[], ctx: GodModeResolverContext): GodModeResolvedItem[] {
  const items: GodModeResolvedItem[] = []

  for (const event of events) {
    const tier = assignEventTier(event, ctx.now)
    if (!tier) continue

    items.push({
      definitionId: `chef.event_${tier === 'p0' ? 'today' : tier === 'p1' ? 'tomorrow' : 'this_week'}`,
      tier,
      label: buildEventLabel(event, ctx.now),
      context: `${event.guest_count ?? '?'} guests, ${event.status}`,
      destination: `/chef/events/${event.id}`,
      icon: 'calendar',
      loopState: 'active',
      sourceKind: 'event',
      evidenceLabel: 'confirmed',
      confidence: 1,
      proofHref: `/chef/events/${event.id}`,
      nextAction: tier === 'p0' ? 'Open event checklist' : 'Review event plan',
      inlineActions:
        tier === 'p0' && event.serve_time
          ? [
              {
                label: 'Checklist',
                action: 'navigate',
                params: { href: `/chef/events/${event.id}/checklist` },
                variant: 'default',
              },
              ...(event.status === 'confirmed'
                ? [
                    {
                      label: 'Complete',
                      action: 'complete_event' as const,
                      params: { entityId: event.id },
                      variant: 'success' as const,
                    },
                  ]
                : []),
            ]
          : event.status === 'pending_confirmation'
            ? [
                {
                  label: 'View',
                  action: 'navigate',
                  params: { href: `/chef/events/${event.id}` },
                  variant: 'default',
                },
                {
                  label: 'Confirm',
                  action: 'confirm_event',
                  params: { entityId: event.id },
                  variant: 'success',
                },
              ]
            : undefined,
      data: {
        eventId: event.id,
        eventDate: event.event_date,
        guestCount: event.guest_count,
        clientId: event.client?.id,
      },
      escalatesAt:
        tier === 'p2' && event.event_date
          ? new Date(new Date(event.event_date + 'T00:00:00').getTime() - MS_DAY)
          : undefined,
    })
  }

  return items
}
