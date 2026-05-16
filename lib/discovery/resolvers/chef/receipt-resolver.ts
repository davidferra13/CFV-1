import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

const MS_DAY = 86_400_000

/**
 * Surfaces completed events that have no receipt photo captured.
 * Tables: events, receipt_photos, clients
 */
export async function resolveReceiptCapture(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  let rows: {
    eventId: string
    eventDate: string
    occasion: string | null
    clientName: string | null
  }[]

  try {
    const result = await pgClient`
      SELECT
        e.id as "eventId",
        e.event_date as "eventDate",
        e.occasion,
        c.full_name as "clientName"
      FROM events e
      LEFT JOIN clients c ON c.id = e.client_id
      WHERE e.tenant_id = ${ctx.tenantId}
        AND e.status = 'completed'
        AND e.event_date IS NOT NULL
        AND e.event_date >= (CURRENT_DATE - INTERVAL '14 days')::date
        AND e.event_date < CURRENT_DATE
        AND NOT EXISTS (
          SELECT 1 FROM receipt_photos rp
          WHERE rp.event_id = e.id
        )
      ORDER BY e.event_date DESC
      LIMIT 10
    `
    rows = result as unknown as typeof rows
  } catch (err) {
    console.error('[receipt-resolver] Query failed:', err)
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

    const tier: RailTier = daysSince >= 7 ? 'p2' : 'p3'
    const name = row.occasion ?? row.clientName ?? 'Event'

    items.push({
      definitionId: `chef.receipt_not_captured.${row.eventId}`,
      tier,
      label: `Receipts: ${name}`,
      context: `Event was ${daysSince}d ago, no receipts uploaded`,
      destination: `/chef/events/${row.eventId}/receipts`,
      icon: 'camera',
      loopState: 'active',
      sourceKind: 'event',
      evidenceLabel: 'computed',
      confidence: 0.7,
      nextAction: 'Upload event receipts',
      data: {
        eventId: row.eventId,
        daysSinceEvent: daysSince,
      },
    })
  }

  return items
}
