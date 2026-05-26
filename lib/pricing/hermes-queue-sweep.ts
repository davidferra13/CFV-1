import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { logHermesAction } from './hermes-actions'

interface SweepResult {
  archived: number
}

interface QueueHealth {
  depth: number
  warning: boolean
}

export async function sweepStaleQueueEvents(): Promise<SweepResult> {
  const start = Date.now()

  const result = (await db.execute(sql`
    WITH archived AS (
      DELETE FROM hermes_queue
      WHERE status = 'pending' AND timestamp < NOW() - INTERVAL '7 days'
      RETURNING *
    )
    INSERT INTO hermes_queue_archive (id, timestamp, event_type, payload, priority, status, processed_at, tenant_id)
    SELECT id, timestamp, event_type, payload, priority, status, processed_at, tenant_id
    FROM archived
  `)) as unknown as Array<unknown>

  const archived = Array.isArray(result) ? result.length : 0

  await logHermesAction({
    skill: 'pie-measure',
    source: 'fallback',
    action: `Queue sweep: archived ${archived} stale events (>7 days)`,
    itemsAffected: archived,
    durationMs: Date.now() - start,
  })

  return { archived }
}

export async function getQueueHealthWarning(): Promise<QueueHealth> {
  const rows = (await db.execute(sql`
    SELECT COUNT(*)::int AS count FROM hermes_queue WHERE status = 'pending'
  `)) as unknown as Array<{ count: number }>

  const depth = rows[0]?.count ?? 0
  return { depth, warning: depth > 50 }
}
