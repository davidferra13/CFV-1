import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

const MS_DAY = 86_400_000

/**
 * Surfaces menus awaiting client approval.
 * Tables: menu_approval_requests, events, clients
 */
export async function resolveMenuApprovals(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  let rows: {
    id: string
    eventId: string
    sentAt: string
    clientName: string | null
    eventDate: string | null
    occasion: string | null
  }[]

  try {
    const result = await pgClient`
      SELECT
        mar.id,
        mar.event_id as "eventId",
        mar.sent_at as "sentAt",
        c.full_name as "clientName",
        e.event_date as "eventDate",
        e.occasion
      FROM menu_approval_requests mar
      JOIN events e ON e.id = mar.event_id
      LEFT JOIN clients c ON c.id = mar.client_id
      WHERE mar.chef_id = ${ctx.tenantId}
        AND mar.status = 'sent'
        AND mar.responded_at IS NULL
      ORDER BY e.event_date ASC NULLS LAST
    `
    rows = result as unknown as typeof rows
  } catch (err) {
    console.error('[menu-approval-resolver] Query failed:', err)
    return []
  }

  const items: GodModeResolvedItem[] = []

  for (const row of rows) {
    let tier: RailTier = 'p2'

    if (row.eventDate) {
      const eventMs = new Date(row.eventDate + 'T00:00:00').getTime()
      const nowStart = new Date(
        ctx.now.getFullYear(),
        ctx.now.getMonth(),
        ctx.now.getDate()
      ).getTime()
      const daysUntil = Math.round((eventMs - nowStart) / MS_DAY)

      if (daysUntil < 0) continue
      if (daysUntil <= 3) tier = 'p0'
      else if (daysUntil <= 7) tier = 'p1'
      else tier = 'p2'
    }

    // Waiting 7+ days without response escalates
    const sentMs = new Date(row.sentAt).getTime()
    const daysSinceSent = Math.round((ctx.now.getTime() - sentMs) / MS_DAY)
    if (daysSinceSent >= 7 && tier === 'p2') tier = 'p1'

    const name = row.clientName ?? row.occasion ?? 'Event'

    items.push({
      definitionId: `chef.menu_awaiting_approval.${row.id}`,
      tier,
      label: `Menu approval: ${name}`,
      context: `Sent ${daysSinceSent}d ago, awaiting client response`,
      destination: `/chef/events/${row.eventId}/menu`,
      icon: 'utensils',
      loopState: 'waiting',
      sourceKind: 'menu',
      evidenceLabel: 'confirmed',
      confidence: 1,
      proofHref: `/chef/events/${row.eventId}/menu`,
      nextAction: daysSinceSent >= 5 ? 'Nudge client about menu' : 'Awaiting menu feedback',
      waitingOn: {
        kind: 'reply',
        label: 'Client menu approval',
        followUpAt: null,
      },
      data: {
        approvalId: row.id,
        eventId: row.eventId,
        daysSinceSent,
      },
    })
  }

  return items
}
