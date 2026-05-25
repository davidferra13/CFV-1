import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export type HermesSkill =
  | 'pie-measure'
  | 'pie-ratchet'
  | 'pie-census'
  | 'pie-alert'
  | 'pie-accuracy'
  | 'pie-forecast'
  | 'pie-fix'
  | 'pie-acquire'

export interface LogActionParams {
  skill: HermesSkill
  source: 'hermes' | 'fallback'
  action: string
  reason?: string
  itemsAffected?: number
  durationMs?: number
  result?: 'success' | 'partial' | 'failed'
}

export async function logHermesAction(params: LogActionParams): Promise<void> {
  await db.execute(sql`
    INSERT INTO hermes_actions (skill, source, action, reason, items_affected, duration_ms, result)
    VALUES (
      ${params.skill},
      ${params.source},
      ${params.action},
      ${params.reason ?? null},
      ${params.itemsAffected ?? 0},
      ${params.durationMs ?? null},
      ${params.result ?? 'success'}
    )
  `)
}

export async function getRecentActions(limit: number = 20): Promise<
  Array<{
    id: number
    timestamp: string
    skill: string
    source: string
    action: string
    reason: string | null
    items_affected: number
    duration_ms: number | null
    result: string
  }>
> {
  return (await db.execute(sql`
    SELECT id, timestamp::text, skill, source, action, reason, items_affected, duration_ms, result
    FROM hermes_actions
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `)) as any
}
