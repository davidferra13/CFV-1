'use server'

import type {
  CircleActivityFeed,
  CircleActivityVerb,
  CircleActivityItem,
} from './activity-feed-types'

async function db() {
  const { pgClient } = await import('@/lib/db')
  return pgClient
}

export async function getCircleActivityFeed(
  eventId: string,
  cursor?: string,
  limit: number = 20
): Promise<CircleActivityFeed> {
  const pgClient = await db()

  const rows = cursor
    ? await pgClient`
        SELECT id, tenant_id, event_id, actor_name, actor_role, action_verb,
               object_type, object_label, metadata, created_at
        FROM circle_activity
        WHERE event_id = ${eventId}
          AND created_at < ${cursor}
        ORDER BY created_at DESC
        LIMIT ${limit + 1}
      `
    : await pgClient`
        SELECT id, tenant_id, event_id, actor_name, actor_role, action_verb,
               object_type, object_label, metadata, created_at
        FROM circle_activity
        WHERE event_id = ${eventId}
        ORDER BY created_at DESC
        LIMIT ${limit + 1}
      `

  const hasMore = rows.length > limit
  const items: CircleActivityItem[] = rows.slice(0, limit).map((row) => ({
    id: row.id as string,
    circleId: row.event_id as string,
    eventId: row.event_id as string,
    actorName: row.actor_name as string,
    actorRole: row.actor_role as CircleActivityItem['actorRole'],
    actionVerb: row.action_verb as CircleActivityVerb,
    objectType: row.object_type as string,
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

export async function recordCircleActivity(
  tenantId: string,
  eventId: string,
  actorName: string,
  actorRole: 'chef' | 'client' | 'guest' | 'staff' | 'system',
  verb: CircleActivityVerb,
  objectType: string,
  objectLabel: string,
  metadata?: Record<string, unknown>
): Promise<{ id: string }> {
  const pgClient = await db()
  const id = crypto.randomUUID()

  await pgClient`
    INSERT INTO circle_activity (id, tenant_id, event_id, actor_name, actor_role, action_verb, object_type, object_label, metadata)
    VALUES (${id}, ${tenantId}, ${eventId}, ${actorName}, ${actorRole}, ${verb}, ${objectType}, ${objectLabel}, ${metadata ? JSON.stringify(metadata) : '{}'})
  `

  return { id }
}
