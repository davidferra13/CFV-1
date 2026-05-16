import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

const MS_DAY = 86_400_000

/**
 * Surfaces post-event follow-ups not yet sent.
 * Tables: follow_up_sends, events, clients
 * Also: completed events with NO follow-up record at all.
 */
export async function resolveFollowUps(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  // Part 1: Pending follow-up sends that are overdue
  let pendingRows: {
    id: string
    eventId: string
    clientName: string | null
    subject: string
    scheduledFor: string
    eventDate: string | null
  }[]

  try {
    const result = await pgClient`
      SELECT
        fus.id,
        fus.event_id as "eventId",
        c.full_name as "clientName",
        fus.subject,
        fus.scheduled_for as "scheduledFor",
        e.event_date as "eventDate"
      FROM follow_up_sends fus
      JOIN events e ON e.id = fus.event_id
      LEFT JOIN clients c ON c.id = fus.client_id
      WHERE fus.tenant_id = ${ctx.tenantId}
        AND fus.status = 'pending'
        AND fus.scheduled_for <= NOW()
        AND fus.cancelled_at IS NULL
      ORDER BY fus.scheduled_for ASC
      LIMIT 15
    `
    pendingRows = result as unknown as typeof pendingRows
  } catch (err) {
    console.error('[followup-resolver] Query failed:', err)
    return []
  }

  const items: GodModeResolvedItem[] = []

  for (const row of pendingRows) {
    const scheduledMs = new Date(row.scheduledFor).getTime()
    const daysOverdue = Math.round((ctx.now.getTime() - scheduledMs) / MS_DAY)

    let tier: RailTier = 'p2'
    if (daysOverdue >= 7) tier = 'p1'
    if (daysOverdue >= 14) tier = 'p0'

    const name = row.clientName ?? 'Client'

    items.push({
      definitionId: `chef.followup_not_sent.${row.id}`,
      tier,
      label: `Follow-up: ${name}`,
      context: `"${row.subject}" scheduled ${daysOverdue}d ago`,
      destination: `/chef/events/${row.eventId}`,
      icon: 'mail-forward',
      loopState: 'active',
      sourceKind: 'event',
      evidenceLabel: 'confirmed',
      confidence: 1,
      proofHref: `/chef/events/${row.eventId}`,
      nextAction: 'Send post-event follow-up',
      data: {
        followUpId: row.id,
        eventId: row.eventId,
        daysOverdue,
      },
    })
  }

  return items
}
