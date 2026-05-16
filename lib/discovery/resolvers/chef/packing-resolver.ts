import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

const MS_DAY = 86_400_000

/**
 * Surfaces events where gear/car is not packed (day-before or day-of).
 * Tables: packing_confirmations, events, clients
 * If no packing_confirmations exist for a tomorrow/today event, surface it.
 */
export async function resolvePackingStatus(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  let rows: {
    eventId: string
    eventDate: string
    occasion: string | null
    clientName: string | null
    confirmedCount: number
  }[]

  try {
    const result = await pgClient`
      SELECT
        e.id as "eventId",
        e.event_date as "eventDate",
        e.occasion,
        c.full_name as "clientName",
        COUNT(pc.id)::int as "confirmedCount"
      FROM events e
      LEFT JOIN clients c ON c.id = e.client_id
      LEFT JOIN packing_confirmations pc ON pc.event_id = e.id
      WHERE e.tenant_id = ${ctx.tenantId}
        AND e.status NOT IN ('completed', 'cancelled', 'archived')
        AND e.event_date IS NOT NULL
        AND e.event_date >= CURRENT_DATE
        AND e.event_date <= (CURRENT_DATE + INTERVAL '1 day')::date
      GROUP BY e.id, e.event_date, e.occasion, c.full_name
      HAVING COUNT(pc.id) = 0
      ORDER BY e.event_date ASC
    `
    rows = result as unknown as typeof rows
  } catch (err) {
    console.error('[packing-resolver] Query failed:', err)
    return []
  }

  const items: GodModeResolvedItem[] = []

  for (const row of rows) {
    const eventMs = new Date(row.eventDate + 'T00:00:00').getTime()
    const nowStart = new Date(
      ctx.now.getFullYear(),
      ctx.now.getMonth(),
      ctx.now.getDate()
    ).getTime()
    const daysUntil = Math.round((eventMs - nowStart) / MS_DAY)

    const tier: RailTier = daysUntil === 0 ? 'p0' : 'p1'
    const name = row.occasion ?? row.clientName ?? 'Event'
    const when = daysUntil === 0 ? 'today' : 'tomorrow'

    items.push({
      definitionId: `chef.packing_not_done.${row.eventId}`,
      tier,
      label: `Pack gear: ${name} (${when})`,
      context: 'No packing items confirmed yet',
      destination: `/chef/events/${row.eventId}/packing`,
      icon: 'package',
      loopState: 'active',
      sourceKind: 'event',
      evidenceLabel: 'computed',
      confidence: 0.8,
      nextAction: 'Confirm packing checklist',
      data: {
        eventId: row.eventId,
        daysUntil,
      },
    })
  }

  return items
}
