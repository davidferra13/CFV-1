import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

const MS_DAY = 86_400_000
const MAX_ITEMS = 5

const TYPE_LABELS: Record<string, string> = {
  inquiry: 'inquiry follow-up',
  event: 'event message',
  client: 'client message',
}

export async function resolveScheduledMessages(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  let rows: {
    id: string
    subject: string | null
    channel: string
    scheduledFor: string
    contextType: string | null
    contextId: string | null
    recipientName: string | null
  }[]

  try {
    const result = await pgClient`
      SELECT
        sm.id,
        sm.subject,
        sm.channel,
        sm.scheduled_for AS "scheduledFor",
        sm.context_type AS "contextType",
        sm.context_id AS "contextId",
        c.full_name AS "recipientName"
      FROM scheduled_messages sm
      LEFT JOIN clients c ON c.id = sm.recipient_id
      WHERE sm.chef_id = ${ctx.tenantId}
        AND sm.status = 'scheduled'
      ORDER BY sm.scheduled_for ASC
      LIMIT ${MAX_ITEMS}
    `
    rows = result as unknown as typeof rows
  } catch (err) {
    console.error('[scheduled-message-resolver] Query failed:', err)
    return []
  }

  const items: GodModeResolvedItem[] = []

  for (const row of rows) {
    const scheduledMs = new Date(row.scheduledFor).getTime()
    const diffMs = scheduledMs - ctx.now.getTime()
    const diffDays = Math.round(diffMs / MS_DAY)

    let tier: RailTier
    if (diffDays < 0) {
      tier = 'p1'
    } else if (diffDays === 0) {
      tier = 'p2'
    } else {
      tier = 'p3'
    }

    const recipient = row.recipientName ?? 'recipient'
    const typeLabel = row.contextType
      ? (TYPE_LABELS[row.contextType] ?? row.contextType)
      : 'message'
    const label = `Send ${typeLabel} to ${recipient}`

    let context: string
    if (diffDays < 0) {
      context = `Overdue by ${Math.abs(diffDays)}d`
    } else if (diffDays === 0) {
      context = 'Due today'
    } else {
      context = `Due in ${diffDays}d`
    }
    if (row.subject) {
      context += `: "${row.subject}"`
    }

    const destination =
      row.contextType === 'event' && row.contextId
        ? `/chef/events/${row.contextId}`
        : '/communication'

    items.push({
      definitionId: `scheduled-msg-${row.id}`,
      tier,
      label,
      context,
      destination,
      icon: 'send',
      sourceKind: 'reminder',
      loopState: 'active',
      evidenceLabel: 'confirmed',
      confidence: 1,
      nextAction: `Send ${row.channel} ${typeLabel}`,
      data: {
        messageId: row.id,
        channel: row.channel,
        contextType: row.contextType,
        contextId: row.contextId,
      },
    })
  }

  return items
}
