import { db } from '@/lib/db'
import { conversations, events } from '@/lib/db/schema/schema'
import { and, eq } from 'drizzle-orm'

export type RealtimeAccessContext = {
  isAdmin: boolean
  tenantId: string | null
  userId: string | null
}

/**
 * Centralized realtime channel authorization.
 * Keep this shared so GET/typing/presence handlers do not drift.
 */
export async function validateRealtimeChannelAccess(
  channel: string,
  context: RealtimeAccessContext
): Promise<boolean> {
  // chef-{tenantId}: the calling system's tenant feed (supplier call results,
  // inbound call alerts, voicemail, AI call results). It predates the
  // prefix:id convention and is used by every publisher in lib/calling and
  // app/api/calling plus ChefLiveAlerts in the chef layout, so it is matched
  // exactly here rather than renamed across those call sites.
  if (channel.startsWith('chef-')) {
    const tenantId = channel.slice('chef-'.length)
    return Boolean(context.tenantId) && tenantId.length > 0 && tenantId === context.tenantId
  }

  const colonIdx = channel.indexOf(':')

  if (colonIdx === -1) {
    if (channel === 'site') return context.isAdmin
    if (channel === 'rail') return Boolean(context.tenantId)
    return false
  }

  const prefix = channel.slice(0, colonIdx)
  const id = channel.slice(colonIdx + 1)

  if (!id) return false

  switch (prefix) {
    case 'notifications':
      return Boolean(context.userId) && id === context.userId

    case 'activity':
    case 'activity_events':
    case 'conversations':
      return Boolean(context.tenantId) && id === context.tenantId

    case 'events': {
      if (!context.tenantId) return false

      const [event] = await db
        .select({ id: events.id })
        .from(events)
        .where(and(eq(events.id, id), eq(events.tenantId, context.tenantId)))
        .limit(1)

      return Boolean(event)
    }

    case 'chat':
    case 'chat_messages': {
      if (!context.tenantId) return false

      const [conversation] = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(and(eq(conversations.id, id), eq(conversations.tenantId, context.tenantId)))
        .limit(1)

      return Boolean(conversation)
    }

    case 'typing':
    case 'presence':
      return validateRealtimeChannelAccess(id, context)

    default:
      return false
  }
}
