import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'
import type { ConversationWithDetails } from '@/lib/chat/types'

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

async function resolveClientMessages(
  ctx: GodModeResolverContext,
  clientId: string
): Promise<GodModeResolvedItem[]> {
  const { getConversationInbox } = await import('@/lib/chat/actions')
  const { createServerClient } = await import('@/lib/db/server')

  try {
    // Look up the client's auth_user_id from the client entity ID
    const db: any = createServerClient()
    const { data: client } = await db
      .from('clients')
      .select('auth_user_id')
      .eq('id', clientId)
      .single()

    if (!client?.auth_user_id) return []

    const result = await getConversationInbox()
    const conversations = (result ?? []) as ConversationWithDetails[]

    // Filter to conversations where this client is a participant
    const clientConvos = conversations.filter((c) =>
      c.participants?.some((p) => p.auth_user_id === client.auth_user_id)
    )

    const items: GodModeResolvedItem[] = []

    for (const convo of clientConvos.slice(0, 5)) {
      const row: ConversationRow = {
        id: convo.id,
        unread_count: convo.unread_count ?? 0,
        other_participant_name: convo.other_participant_name ?? null,
        context_type: convo.context_type ?? null,
        event_id: convo.event_id ?? null,
        event_date: null,
        last_message_at: convo.last_message_at ?? null,
        last_message_preview: convo.last_message_preview ?? null,
      }

      const tier = assignMessageTier(row, ctx.now)
      if (!tier) continue

      items.push({
        definitionId: 'chef.message_new',
        tier,
        label: buildMessageLabel(row),
        context: row.last_message_preview ?? 'New message',
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
  } catch (err) {
    console.error('[message-resolver] Client-scoped query failed:', err)
    return []
  }
}

export async function resolveMessages(ctx: GodModeResolverContext): Promise<GodModeResolvedItem[]> {
  if (ctx.entityContext?.type === 'client') {
    return resolveClientMessages(ctx, ctx.entityContext.id)
  }

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
