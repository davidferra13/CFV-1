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

export async function resolveEvents(ctx: GodModeResolverContext): Promise<GodModeResolvedItem[]> {
  const { getEvents } = await import('@/lib/events/actions')

  let events: EventRow[]
  try {
    const result = await getEvents()
    events = (result ?? []) as unknown as EventRow[]
  } catch (err) {
    console.error('[event-resolver] Query failed:', err)
    return []
  }

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
