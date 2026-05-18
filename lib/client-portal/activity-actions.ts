'use server'

import { requireClient } from '@/lib/auth/get-user'
import {
  CLIENT_VISIBLE_VERBS,
  type ClientActivityFeed,
  type ClientActivityItem,
} from './activity-types'

async function db() {
  const { pgClient } = await import('@/lib/db')
  return pgClient
}

export async function getClientActivityFeed(
  cursor?: string,
  limit: number = 20
): Promise<ClientActivityFeed> {
  const user = await requireClient()
  const tenantId = user.tenantId
  const pgClient = await db()

  const rows = cursor
    ? await pgClient`
        SELECT id, event_id, actor_name, actor_role, action_verb,
               object_label, metadata, created_at
        FROM circle_activity
        WHERE tenant_id = ${tenantId}
          AND action_verb = ANY(${CLIENT_VISIBLE_VERBS})
          AND created_at < ${cursor}
        ORDER BY created_at DESC
        LIMIT ${limit + 1}
      `
    : await pgClient`
        SELECT id, event_id, actor_name, actor_role, action_verb,
               object_label, metadata, created_at
        FROM circle_activity
        WHERE tenant_id = ${tenantId}
          AND action_verb = ANY(${CLIENT_VISIBLE_VERBS})
        ORDER BY created_at DESC
        LIMIT ${limit + 1}
      `

  const hasMore = rows.length > limit
  const items: ClientActivityItem[] = rows.slice(0, limit).map((row) => ({
    id: row.id as string,
    eventId: row.event_id as string,
    actorName: row.actor_name as string,
    actorRole: row.actor_role as ClientActivityItem['actorRole'],
    verb: row.action_verb as ClientActivityItem['verb'],
    objectLabel: row.object_label as string,
    timestamp: new Date(row.created_at as string).toISOString(),
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  }))

  const lastItem = items[items.length - 1]

  return {
    items,
    cursor: lastItem?.timestamp ?? null,
    hasMore,
  }
}
