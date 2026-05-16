import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

const MS_DAY = 86_400_000

/**
 * Surfaces unsigned contracts: draft, sent but not signed.
 * Tables: event_contracts, events, clients
 */
export async function resolveContracts(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  let rows: {
    id: string
    eventId: string
    status: string
    sentAt: string | null
    clientName: string | null
    eventDate: string | null
    occasion: string | null
  }[]

  try {
    const result = await pgClient`
      SELECT
        ec.id,
        ec.event_id as "eventId",
        ec.status,
        ec.sent_at as "sentAt",
        c.full_name as "clientName",
        e.event_date as "eventDate",
        e.occasion
      FROM event_contracts ec
      JOIN events e ON e.id = ec.event_id
      LEFT JOIN clients c ON c.id = ec.client_id
      WHERE e.tenant_id = ${ctx.tenantId}
        AND ec.status IN ('draft', 'sent', 'viewed')
        AND ec.signed_at IS NULL
        AND ec.voided_at IS NULL
      ORDER BY e.event_date ASC NULLS LAST
    `
    rows = result as unknown as typeof rows
  } catch (err) {
    console.error('[contract-resolver] Query failed:', err)
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

      if (daysUntil < 0) continue // past event
      if (daysUntil <= 3) tier = 'p0'
      else if (daysUntil <= 7) tier = 'p1'
      else if (daysUntil <= 14) tier = 'p2'
      else tier = 'p3'
    }

    // Sent but unsigned for 5+ days escalates
    if (row.sentAt && row.status !== 'draft') {
      const sentMs = new Date(row.sentAt).getTime()
      const daysSinceSent = Math.round((ctx.now.getTime() - sentMs) / MS_DAY)
      if (daysSinceSent >= 5 && tier === 'p2') tier = 'p1'
      if (daysSinceSent >= 10 && tier === 'p1') tier = 'p0'
    }

    const name = row.clientName ?? row.occasion ?? 'Event'
    const statusLabel = row.status === 'draft' ? 'not sent' : `sent, unsigned`

    items.push({
      definitionId: `chef.contract_unsigned.${row.id}`,
      tier,
      label: `Contract: ${name} (${statusLabel})`,
      context: row.eventDate
        ? `Event ${row.eventDate}, contract ${statusLabel}`
        : `Contract ${statusLabel}`,
      destination: `/chef/events/${row.eventId}/contract`,
      icon: 'file-signature',
      loopState: row.status === 'draft' ? 'active' : 'waiting',
      sourceKind: 'event',
      evidenceLabel: 'confirmed',
      confidence: 1,
      proofHref: `/chef/events/${row.eventId}/contract`,
      nextAction: row.status === 'draft' ? 'Send contract' : 'Follow up on unsigned contract',
      data: {
        contractId: row.id,
        eventId: row.eventId,
        contractStatus: row.status,
      },
    })
  }

  return items
}
