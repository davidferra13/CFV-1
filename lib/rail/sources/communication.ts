import type { RailItem, RailTier } from '@/lib/rail/types'

const MS_DAY = 86_400_000
const MAX_ITEMS = 5

const TYPE_LABELS: Record<string, string> = {
  inquiry: 'inquiry follow-up',
  event: 'event message',
  client: 'client message',
}

export async function getCommunicationRailItems(tenantId: string): Promise<RailItem[]> {
  try {
    const { pgClient } = await import('@/lib/db')

    const rows = await pgClient`
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
      WHERE sm.chef_id = ${tenantId}
        AND sm.status = 'scheduled'
      ORDER BY sm.scheduled_for ASC
      LIMIT ${MAX_ITEMS}
    `

    const now = new Date()
    const items: RailItem[] = []

    for (const row of rows) {
      const r = row as {
        id: string
        subject: string | null
        channel: string
        scheduledFor: string
        contextType: string | null
        contextId: string | null
        recipientName: string | null
      }

      const scheduledMs = new Date(r.scheduledFor).getTime()
      const diffMs = scheduledMs - now.getTime()
      const diffDays = Math.round(diffMs / MS_DAY)

      let tier: RailTier
      let score: number
      if (diffDays < 0) {
        tier = 'action'
        score = 75
      } else if (diffDays === 0) {
        tier = 'awareness'
        score = 50
      } else {
        tier = 'opportunity'
        score = 25
      }

      const recipient = r.recipientName ?? 'recipient'
      const typeLabel = r.contextType ? (TYPE_LABELS[r.contextType] ?? r.contextType) : 'message'
      const title = `Send ${typeLabel} to ${recipient}`

      let subtitle: string
      if (diffDays < 0) {
        subtitle = `Overdue by ${Math.abs(diffDays)}d`
      } else if (diffDays === 0) {
        subtitle = 'Due today'
      } else {
        subtitle = `Due in ${diffDays}d`
      }
      if (r.subject) {
        subtitle += `: "${r.subject}"`
      }

      const actionUrl =
        r.contextType === 'event' && r.contextId ? `/chef/events/${r.contextId}` : '/communication'

      items.push({
        id: `scheduled-msg-${r.id}`,
        tenantId,
        source: 'communication',
        tier,
        state: 'surfaced',
        score,
        title,
        subtitle,
        actionUrl,
        createdAt: now,
        surfacedAt: now,
        ttlMinutes: 1440,
        metadata: {
          messageId: r.id,
          channel: r.channel,
          contextType: r.contextType,
          contextId: r.contextId,
          scheduledFor: r.scheduledFor,
        },
      })
    }

    return items
  } catch (err) {
    console.error('[rail/sources/communication] Query failed:', err)
    return []
  }
}
