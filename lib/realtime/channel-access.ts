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
  const colonIdx = channel.indexOf(':')

  if (colonIdx === -1) {
    return channel === 'site' ? context.isAdmin : false
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
