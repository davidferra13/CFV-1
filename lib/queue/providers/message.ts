// Priority Queue - Message Provider
// Surfaces: outbound draft messages needing approval, approved messages needing send

import type { QueueItem, ScoreInputs } from '../types'
import { computeScore, urgencyFromScore } from '../score'

export async function getMessageQueueItems(supabase: any, tenantId: string): Promise<QueueItem[]> {
  const items: QueueItem[] = []
  const now = new Date()

  const { data: messages } = await supabase
    .from('messages')
    .select(
      `
      id, status, direction, channel, created_at,
      inquiry_id, event_id, client_id,
      client:clients(full_name)
    `
    )
    .eq('tenant_id', tenantId)
    .in('status', ['draft', 'approved'])
    .eq('direction', 'outbound')

  if (!messages) return items

  for (const msg of messages) {
    const clientName = (msg.client as any)?.full_name ?? 'Unknown'
    const hoursSinceCreated = (now.getTime() - new Date(msg.created_at).getTime()) / 3600000
    const isDraft = msg.status === 'draft'

    const inputs: ScoreInputs = {
      hoursUntilDue: isDraft ? null : Math.max(0, 4 - hoursSinceCreated),
      impactWeight: isDraft ? 0.3 : 0.5,
      isBlocking: false,
      hoursSinceCreated,
      revenueCents: 0,
      isExpiring: false,
    }
    const score = computeScore(inputs)
    const href = msg.inquiry_id
      ? `/inquiries/${msg.inquiry_id}`
      : msg.event_id
        ? `/events/${msg.event_id}`
        : `/clients/${msg.client_id}`

    items.push({
      id: `message:message:${msg.id}:${isDraft ? 'finalize' : 'send'}`,
      domain: 'message',
      urgency: urgencyFromScore(score),
      score,
      title: isDraft ? 'Finalize draft message' : 'Send approved message',
      description: isDraft
        ? `Draft message to ${clientName} needs review and approval.`
        : `Approved message to ${clientName} is ready to send.`,
      href,
      icon: isDraft ? 'PenLine' : 'Send',
      context: { primaryLabel: clientName, secondaryLabel: msg.channel },
      createdAt: msg.created_at,
      dueAt: null,
      entityId: msg.id,
      entityType: 'message',
    })
  }

  return items
}
