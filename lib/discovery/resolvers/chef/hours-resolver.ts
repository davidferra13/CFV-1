import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

const MS_DAY = 86_400_000

/**
 * Surfaces completed events where staff hours have not been logged.
 * Tables: events, event_staff_assignments, clients
 */
export async function resolveHoursNotLogged(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  let rows: {
    eventId: string
    eventDate: string
    occasion: string | null
    clientName: string | null
    assignedStaff: number
    loggedStaff: number
  }[]

  try {
    const result = await pgClient`
      SELECT
        e.id as "eventId",
        e.event_date as "eventDate",
        e.occasion,
        c.full_name as "clientName",
        COUNT(esa.id)::int as "assignedStaff",
        COUNT(esa.id) FILTER (WHERE esa.actual_hours IS NOT NULL)::int as "loggedStaff"
      FROM events e
      LEFT JOIN clients c ON c.id = e.client_id
      INNER JOIN event_staff_assignments esa ON esa.event_id = e.id
      WHERE e.tenant_id = ${ctx.tenantId}
        AND e.status = 'completed'
        AND e.event_date IS NOT NULL
        AND e.event_date >= (CURRENT_DATE - INTERVAL '14 days')::date
        AND e.event_date < CURRENT_DATE
      GROUP BY e.id, e.event_date, e.occasion, c.full_name
      HAVING COUNT(esa.id) FILTER (WHERE esa.actual_hours IS NOT NULL) < COUNT(esa.id)
      ORDER BY e.event_date DESC
    `
    rows = result as unknown as typeof rows
  } catch (err) {
    console.error('[hours-resolver] Query failed:', err)
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
    const daysSince = Math.round((nowStart - eventMs) / MS_DAY)

    const tier: RailTier = daysSince >= 7 ? 'p1' : 'p2'
    const name = row.occasion ?? row.clientName ?? 'Event'
    const unlogged = row.assignedStaff - row.loggedStaff

    items.push({
      definitionId: `chef.hours_not_logged.${row.eventId}`,
      tier,
      label: `Log hours: ${name}`,
      context: `${unlogged} of ${row.assignedStaff} staff without logged hours (${daysSince}d ago)`,
      destination: `/chef/events/${row.eventId}/staff`,
      icon: 'clock',
      loopState: 'active',
      sourceKind: 'event',
      evidenceLabel: 'computed',
      confidence: 0.9,
      nextAction: 'Log staff actual hours',
      data: {
        eventId: row.eventId,
        daysSinceEvent: daysSince,
        unloggedStaff: unlogged,
        totalStaff: row.assignedStaff,
      },
    })
  }

  return items
}
