import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// Action types for rail engagement tracking
// ---------------------------------------------------------------------------

export type RailActionType = 'click' | 'dismiss' | 'save' | 'expand' | 'hover'

// ---------------------------------------------------------------------------
// Record a single engagement event
// ---------------------------------------------------------------------------

export async function recordEngagement(
  tenantId: string,
  userId: string,
  itemSource: string,
  actionType: RailActionType
): Promise<void> {
  await db.execute(sql`
    INSERT INTO rail_engagement_log (tenant_id, user_id, item_source, action_type)
    VALUES (${tenantId}, ${userId}, ${itemSource}, ${actionType})
  `)
}

// ---------------------------------------------------------------------------
// Fetch raw engagement counts per source within a time window
// ---------------------------------------------------------------------------

export interface SourceEngagementRow {
  itemSource: string
  actionCount: number
  latestAt: Date
}

export async function getEngagementsBySource(
  tenantId: string,
  userId: string,
  windowDays: number = 30
): Promise<SourceEngagementRow[]> {
  const rows = await db.execute(sql`
    SELECT
      item_source AS "itemSource",
      COUNT(*)::int AS "actionCount",
      MAX(created_at) AS "latestAt"
    FROM rail_engagement_log
    WHERE tenant_id = ${tenantId}
      AND user_id = ${userId}
      AND created_at >= NOW() - INTERVAL '1 day' * ${windowDays}
    GROUP BY item_source
    ORDER BY "actionCount" DESC
  `)

  return rows as unknown as SourceEngagementRow[]
}
