import { db } from '@/lib/db'
import { conversations, events } from '@/lib/db/schema/schema'
import { and, eq, sql } from 'drizzle-orm'

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
  if (channel.startsWith('chef-')) {
    const tenantId = channel.slice('chef-'.length)
    return Boolean(context.tenantId) && tenantId === context.tenantId
  }

  const colonIdx = channel.indexOf(':')

  if (colonIdx === -1) {
    return channel === 'site' ? context.isAdmin : false
  }

  const prefix = channel.slice(0, colonIdx)
  const id = channel.slice(colonIdx + 1)

  if (!id) return false

  switch (prefix) {
    case 'tenant':
      return Boolean(context.tenantId) && id === context.tenantId

    case 'user':
      return Boolean(context.userId) && id === context.userId

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

    case 'client-event': {
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

    case 'collab-space': {
      if (!context.tenantId) return false

      const memberRows = await db.execute(
        sql`SELECT 1 FROM chef_collab_space_members WHERE space_id = ${id}::uuid AND chef_id = ${context.tenantId}::uuid LIMIT 1`
      )

      return memberRows.length > 0
    }

    case 'typing':
    case 'presence':
      return validateRealtimeChannelAccess(id, context)

    default:
      return false
  }
}
