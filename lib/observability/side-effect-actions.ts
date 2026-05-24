'use server'

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { requireChef } from '@/lib/auth/get-user'
import type { SideEffectCategory, SideEffectEntry, SideEffectSummary } from './side-effect-types'

const ALL_CATEGORIES: SideEffectCategory[] = [
  'email',
  'notification',
  'webhook',
  'file',
  'external_api',
  'state_change',
  'scheduled_job',
]

function rowToEntry(row: Record<string, unknown>): SideEffectEntry {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    category: row.category as SideEffectCategory,
    action: row.action as string,
    entityType: (row.entity_type as string) ?? undefined,
    entityId: (row.entity_id as string) ?? undefined,
    metadata: (row.metadata as Record<string, unknown>) ?? undefined,
    triggeredBy: row.triggered_by as string,
    createdAt: row.created_at ? new Date(row.created_at as string) : undefined,
  }
}

/**
 * Aggregate summary of side effects for the last N days.
 */
export async function getSideEffectSummary(days = 1): Promise<SideEffectSummary> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const countRows = await db.execute(sql`
    SELECT category, COUNT(*)::int AS cnt
    FROM side_effects
    WHERE tenant_id = ${tenantId}::uuid
      AND created_at >= now() - ${`${days} days`}::interval
    GROUP BY category
  `)

  const byCategory = {} as Record<SideEffectCategory, number>
  let totalToday = 0
  for (const cat of ALL_CATEGORIES) {
    byCategory[cat] = 0
  }
  for (const row of countRows) {
    const cat = (row as Record<string, unknown>).category as SideEffectCategory
    const cnt = (row as Record<string, unknown>).cnt as number
    byCategory[cat] = cnt
    totalToday += cnt
  }

  const recentRows = await db.execute(sql`
    SELECT *
    FROM side_effects
    WHERE tenant_id = ${tenantId}::uuid
      AND created_at >= now() - ${`${days} days`}::interval
    ORDER BY created_at DESC
    LIMIT 25
  `)

  return {
    totalToday,
    byCategory,
    recentEffects: Array.from(recentRows).map((r) => rowToEntry(r as Record<string, unknown>)),
  }
}

/**
 * Filtered list of side effects.
 */
export async function getSideEffects(filter?: {
  category?: SideEffectCategory
  entityType?: string
  limit?: number
}): Promise<SideEffectEntry[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const limit = filter?.limit ?? 50

  const conditions = [sql`tenant_id = ${tenantId}::uuid`]
  if (filter?.category) {
    conditions.push(sql`category = ${filter.category}`)
  }
  if (filter?.entityType) {
    conditions.push(sql`entity_type = ${filter.entityType}`)
  }

  const where = sql.join(conditions, sql` AND `)

  const rows = await db.execute(sql`
    SELECT *
    FROM side_effects
    WHERE ${where}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `)

  return Array.from(rows).map((r) => rowToEntry(r as Record<string, unknown>))
}

/**
 * All side effects for a specific entity.
 */
export async function getSideEffectsByEntity(
  entityType: string,
  entityId: string
): Promise<SideEffectEntry[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const resultRows = await db.execute(sql`
    SELECT *
    FROM side_effects
    WHERE tenant_id = ${tenantId}::uuid
      AND entity_type = ${entityType}
      AND entity_id = ${entityId}
    ORDER BY created_at DESC
  `)

  return Array.from(resultRows).map((r) => rowToEntry(r as Record<string, unknown>))
}
