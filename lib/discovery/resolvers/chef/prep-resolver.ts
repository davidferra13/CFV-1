import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

const MS_DAY = 86_400_000

/**
 * Surfaces events where prep has not started but the event is imminent.
 * Tables: event_prep_steps, events, clients
 */
export async function resolvePrepStatus(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  // Find upcoming events (within 3 days) that have prep steps, but none completed
  let rows: {
    eventId: string
    eventDate: string
    occasion: string | null
    clientName: string | null
    totalSteps: number
    completedSteps: number
  }[]

  try {
    const result = await pgClient`
      SELECT
        e.id as "eventId",
        e.event_date as "eventDate",
        e.occasion,
        c.full_name as "clientName",
        COUNT(eps.id)::int as "totalSteps",
        COUNT(eps.id) FILTER (WHERE eps.status = 'completed')::int as "completedSteps"
      FROM events e
      LEFT JOIN clients c ON c.id = e.client_id
      INNER JOIN event_prep_steps eps ON eps.event_id = e.id
      WHERE e.tenant_id = ${ctx.tenantId}
        AND e.status NOT IN ('completed', 'cancelled', 'archived')
        AND e.event_date IS NOT NULL
        AND e.event_date >= CURRENT_DATE
        AND e.event_date <= (CURRENT_DATE + INTERVAL '3 days')::date
      GROUP BY e.id, e.event_date, e.occasion, c.full_name
      HAVING COUNT(eps.id) FILTER (WHERE eps.status IN ('completed', 'skipped')) < COUNT(eps.id)
      ORDER BY e.event_date ASC
    `
    rows = result as unknown as typeof rows
  } catch (err) {
    console.error('[prep-resolver] Query failed:', err)
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

    const remaining = row.totalSteps - row.completedSteps

    let tier: RailTier = 'p2'
    if (daysUntil === 0) tier = 'p0'
    else if (daysUntil === 1) tier = 'p1'

    // If zero steps completed for a tomorrow/today event, this is critical
    if (row.completedSteps === 0 && daysUntil <= 1) tier = 'p0'

    const name = row.occasion ?? row.clientName ?? 'Event'
    const when = daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil}d`

    items.push({
      definitionId: `chef.prep_not_started.${row.eventId}`,
      tier,
      label: `Prep: ${name} (${when})`,
      context: `${remaining} of ${row.totalSteps} prep steps remaining`,
      destination: `/chef/events/${row.eventId}/prep`,
      icon: 'clipboard-check',
      loopState: row.completedSteps === 0 ? 'blocked' : 'active',
      sourceKind: 'event',
      evidenceLabel: 'confirmed',
      confidence: 1,
      proofHref: `/chef/events/${row.eventId}/prep`,
      nextAction: 'Start prep work',
      inlineActions: [
        {
          label: 'Open Prep',
          action: 'navigate',
          params: { href: `/chef/events/${row.eventId}/prep` },
          variant: 'default',
        },
      ],
      data: {
        eventId: row.eventId,
        daysUntil,
        totalSteps: row.totalSteps,
        completedSteps: row.completedSteps,
      },
    })
  }

  return items
}
