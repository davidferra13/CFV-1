import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

const MS_DAY = 86_400_000

export interface ConversationRow {
  id: string
  unread_count: number
  other_participant_name: string | null
  context_type: string | null
  event_id: string | null
  event_date: string | null
  last_message_at: string | null
  last_message_preview: string | null
}

export function assignMessageTier(row: ConversationRow, now: Date): RailTier | null {
  if (row.unread_count === 0) return null

  if (row.event_date) {
    const eventMs = new Date(row.event_date + 'T00:00:00').getTime()
    const daysUntil = (eventMs - now.getTime()) / MS_DAY
    if (daysUntil >= 0 && daysUntil <= 7) return 'p0'
  }

  return 'p1'
}

export function buildMessageLabel(row: ConversationRow): string {
  const name = row.other_participant_name ?? 'Unknown'
  const parts = [`${row.unread_count} unread ${name}`]

  if (row.last_message_preview) {
    const snippet =
      row.last_message_preview.length > 30
        ? row.last_message_preview.slice(0, 30) + '...'
        : row.last_message_preview
    parts.push(`re: ${snippet}`)
  }

  return parts.join(' ')
}

export async function resolveMessages(ctx: GodModeResolverContext): Promise<GodModeResolvedItem[]> {
  const { getConversationInbox } = await import('@/lib/chat/actions')

  let conversations: ConversationRow[]
  try {
    const result = await getConversationInbox()
    conversations = (result ?? []) as unknown as ConversationRow[]
  } catch (err) {
    console.error('[message-resolver] Query failed:', err)
    return []
  }

  const items: GodModeResolvedItem[] = []

  for (const convo of conversations) {
    const tier = assignMessageTier(convo, ctx.now)
    if (!tier) continue

    items.push({
      definitionId: 'chef.message_new',
      tier,
      label: buildMessageLabel(convo),
      context: convo.last_message_preview ?? 'New message',
      destination: `/chef/messages/${convo.id}`,
      icon: 'chat',
      loopState: 'active',
      sourceKind: 'message',
      evidenceLabel: 'confirmed',
      confidence: 1,
      proofHref: `/chef/messages/${convo.id}`,
      nextAction: 'Read and reply',
      data: {
        conversationId: convo.id,
        eventId: convo.event_id,
        unreadCount: convo.unread_count,
      },
    })
  }

  return items
}
