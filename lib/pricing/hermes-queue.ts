import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export type HermesEventType =
  | 'menu.created'
  | 'price.overridden'
  | 'ingredient.added'
  | 'event.quoted'
  | 'recipe.costed'

const REACTIVE_EVENTS: HermesEventType[] = ['menu.created', 'price.overridden', 'event.quoted']

function priorityForEvent(type: HermesEventType): number {
  if (REACTIVE_EVENTS.includes(type)) return 1
  return 2
}

export async function enqueueHermesEvent(
  type: HermesEventType,
  payload: Record<string, unknown>
): Promise<void> {
  const priority = priorityForEvent(type)

  await db.execute(sql`
    INSERT INTO hermes_queue (event_type, payload, priority, status)
    VALUES (${type}, ${JSON.stringify(payload)}::jsonb, ${priority}, 'pending')
  `)
}

export async function getPendingQueueDepth(): Promise<number> {
  const rows = (await db.execute(sql`
    SELECT COUNT(*)::int AS count FROM hermes_queue WHERE status = 'pending'
  `)) as unknown as Array<{ count: number }>

  return rows[0]?.count ?? 0
}
