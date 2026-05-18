import type { GodModeResolvedItem, GodModeResolverContext } from '../../god-mode-types'

export async function resolvePriceAnomalies(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  let events: {
    id: string
    eventDate: string
    quotedPriceCents: number
    guestCount: number | null
    occasion: string | null
  }[]

  try {
    const result = await pgClient`
      SELECT
        id,
        event_date as "eventDate",
        quoted_price_cents as "quotedPriceCents",
        guest_count as "guestCount",
        occasion
      FROM events
      WHERE tenant_id = ${ctx.tenantId}
        AND status = 'completed'
        AND quoted_price_cents IS NOT NULL
        AND quoted_price_cents > 0
      ORDER BY event_date ASC
    `
    events = result as unknown as typeof events
  } catch (err) {
    console.error('[price-anomaly-resolver] Query failed:', err)
    return []
  }

  if (events.length < 5) return []

  const values = events.map((e) => e.quotedPriceCents)
  const avg = values.reduce((s, v) => s + v, 0) / values.length
  const stdDev = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / values.length)

  const items: GodModeResolvedItem[] = []
  const recentEvents = events.slice(-10)
  const avgDisplay = Math.round(avg / 100)

  for (const event of recentEvents) {
    const deviation = event.quotedPriceCents - avg
    const pct = Math.round(Math.abs(deviation / avg) * 100)
    const eventDisplay = Math.round(event.quotedPriceCents / 100)
    const label = event.occasion || event.eventDate

    if (deviation < -stdDev * 1.5 && pct > 25) {
      items.push({
        definitionId: `chef.price_anomaly.under.${event.id}`,
        tier: 'p1',
        label: `Price spike: ${label} underpriced ${pct}%`,
        context: `$${eventDisplay} vs avg $${avgDisplay} on ${event.eventDate}`,
        destination: `/chef/events/${event.id}`,
        icon: 'trending-down',
        sourceKind: 'event',
        evidenceLabel: 'computed',
        confidence: Math.min(1, pct / 50),
        nextAction: 'Review pricing for similar events',
        data: { eventId: event.id, deviationPercent: -pct },
      })
    } else if (deviation > stdDev * 2 && pct > 40) {
      items.push({
        definitionId: `chef.price_anomaly.over.${event.id}`,
        tier: 'p4',
        label: `Price drop: ${label} premium +${pct}%`,
        context: `$${eventDisplay} vs avg $${avgDisplay}, client accepted`,
        destination: `/chef/events/${event.id}`,
        icon: 'trending-up',
        sourceKind: 'event',
        evidenceLabel: 'computed',
        confidence: Math.min(1, pct / 60),
        nextAction: 'Premium pricing validated for this type',
        data: { eventId: event.id, deviationPercent: pct },
      })
    }
  }

  return items
}
