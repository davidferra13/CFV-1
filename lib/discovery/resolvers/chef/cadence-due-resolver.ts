import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

const MAX_ITEMS = 3
const LOOKAHEAD_HOURS = 48

export async function resolveCadenceDueItems(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  try {
    const { pgClient } = await import('@/lib/db/index')

    const lookaheadMs = LOOKAHEAD_HOURS * 60 * 60 * 1000
    const cutoff = new Date(ctx.now.getTime() + lookaheadMs).toISOString()

    // Find upcoming unsent/unskipped cadence items within lookahead window
    const upcoming = await pgClient<
      {
        id: string
        event_id: string
        cadence_point: string
        channel: string | null
        scheduled_at: string
        event_occasion: string | null
        event_date: string | null
        client_name: string | null
      }[]
    >`
      SELECT
        cs.id,
        cs.event_id,
        cs.cadence_point,
        cs.channel,
        cs.scheduled_at,
        e.occasion AS event_occasion,
        e.event_date,
        c.full_name AS client_name
      FROM cadence_schedule cs
      JOIN events e ON e.id = cs.event_id AND e.tenant_id = cs.tenant_id
      LEFT JOIN clients c ON c.id = e.client_id AND c.tenant_id = cs.tenant_id
      WHERE cs.tenant_id = ${ctx.tenantId}
        AND cs.sent_at IS NULL
        AND cs.skipped_at IS NULL
        AND cs.scheduled_at <= ${cutoff}
      ORDER BY cs.scheduled_at ASC
      LIMIT ${MAX_ITEMS + 2}
    `

    if (!upcoming || upcoming.length === 0) return []

    const items: GodModeResolvedItem[] = []

    for (const row of upcoming.slice(0, MAX_ITEMS)) {
      const scheduledAt = new Date(row.scheduled_at)
      const hoursUntil = (scheduledAt.getTime() - ctx.now.getTime()) / 3_600_000
      const isPast = hoursUntil <= 0

      const tier: RailTier = isPast ? 'p1' : hoursUntil <= 4 ? 'p2' : 'p3'
      const channel = row.channel || 'email'
      const pointLabel = formatCadencePoint(row.cadence_point)
      const clientLabel = row.client_name || row.event_occasion || 'Event'

      items.push({
        definitionId: `cadence-due-${row.id}`,
        tier,
        label: `${channel === 'sms' ? 'SMS' : 'Email'} firing: ${pointLabel}`,
        context: isPast
          ? `Overdue for ${clientLabel}`
          : `Sending to ${clientLabel} in ${formatHours(hoursUntil)}`,
        destination: `/chef/events/${row.event_id}`,
        icon: channel === 'sms' ? 'message-square' : 'mail',
        score: isPast ? 70 : Math.max(20, 60 - Math.round(hoursUntil * 2)),
        sourceKind: 'system',
        evidenceLabel: 'computed',
        confidence: 1,
        nextAction: isPast ? 'Check if manual outreach happened' : 'Review before auto-send',
        data: {
          cadenceItemId: row.id,
          eventId: row.event_id,
          cadencePoint: row.cadence_point,
          channel,
          scheduledAt: row.scheduled_at,
        },
      })
    }

    return items
  } catch (err) {
    console.error('[cadence-due-resolver] Failed:', err)
    return []
  }
}

function formatCadencePoint(point: string): string {
  return point.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`
  if (hours < 24) return `${Math.round(hours)}h`
  const days = Math.round(hours / 24)
  return `${days}d`
}
