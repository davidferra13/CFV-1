import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

const MS_DAY = 86_400_000

/**
 * Surfaces staff not confirmed for upcoming events and staff conflicts.
 * Tables: event_staff_assignments, events, staff_members, clients
 */
export async function resolveStaffIssues(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  // Part 1: Staff not confirmed (status = 'scheduled', not 'confirmed') for upcoming events
  let unconfirmedRows: {
    eventId: string
    eventDate: string
    occasion: string | null
    clientName: string | null
    staffName: string | null
    assignmentId: string
    status: string
  }[]

  try {
    const result = await pgClient`
      SELECT
        e.id as "eventId",
        e.event_date as "eventDate",
        e.occasion,
        c.full_name as "clientName",
        sm.name as "staffName",
        esa.id as "assignmentId",
        esa.status
      FROM event_staff_assignments esa
      JOIN events e ON e.id = esa.event_id
      JOIN staff_members sm ON sm.id = esa.staff_member_id
      LEFT JOIN clients c ON c.id = e.client_id
      WHERE esa.chef_id = ${ctx.tenantId}
        AND esa.status = 'scheduled'
        AND e.status NOT IN ('completed', 'cancelled', 'archived')
        AND e.event_date IS NOT NULL
        AND e.event_date >= CURRENT_DATE
        AND e.event_date <= (CURRENT_DATE + INTERVAL '7 days')::date
      ORDER BY e.event_date ASC
      LIMIT 15
    `
    unconfirmedRows = result as unknown as typeof unconfirmedRows
  } catch (err) {
    console.error('[staff-resolver] Unconfirmed query failed:', err)
    return []
  }

  const items: GodModeResolvedItem[] = []

  // Group by event to avoid flooding the rail
  const byEvent = new Map<string, typeof unconfirmedRows>()
  for (const row of unconfirmedRows) {
    const existing = byEvent.get(row.eventId) ?? []
    existing.push(row)
    byEvent.set(row.eventId, existing)
  }

  for (const [eventId, staff] of byEvent.entries()) {
    const first = staff[0]
    const eventMs = new Date(first.eventDate + 'T00:00:00').getTime()
    const nowStart = new Date(
      ctx.now.getFullYear(),
      ctx.now.getMonth(),
      ctx.now.getDate()
    ).getTime()
    const daysUntil = Math.round((eventMs - nowStart) / MS_DAY)

    let tier: RailTier = 'p2'
    if (daysUntil <= 1) tier = 'p0'
    else if (daysUntil <= 3) tier = 'p1'

    const name = first.occasion ?? first.clientName ?? 'Event'
    const staffNames = staff.map((s) => s.staffName).filter(Boolean)
    const staffLabel =
      staffNames.length <= 2 ? staffNames.join(', ') : `${staffNames[0]} +${staffNames.length - 1}`

    items.push({
      definitionId: `chef.staff_not_confirmed.${eventId}`,
      tier,
      label: `Staff unconfirmed: ${name}`,
      context: `${staff.length} staff not confirmed: ${staffLabel}`,
      destination: `/chef/events/${eventId}/staff`,
      icon: 'users',
      loopState: 'waiting',
      sourceKind: 'event',
      evidenceLabel: 'confirmed',
      confidence: 1,
      nextAction: 'Confirm staff for event',
      waitingOn: {
        kind: 'person',
        label: 'Staff confirmation',
        followUpAt: null,
      },
      data: {
        eventId,
        daysUntil,
        unconfirmedCount: staff.length,
        staffNames,
      },
    })
  }

  return items
}
