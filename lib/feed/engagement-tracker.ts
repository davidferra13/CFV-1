'use server'

export type EngagementActionType = 'act' | 'dismiss' | 'snooze' | 'save' | 'click'

async function db() {
  const { pgClient } = await import('@/lib/db')
  return pgClient
}

export async function recordRailEngagement(
  tenantId: string,
  userId: string,
  itemKey: string,
  source: string,
  category: string,
  actionType: EngagementActionType
): Promise<void> {
  const pgClient = await db()
  await pgClient`
    INSERT INTO rail_engagement_log (tenant_id, user_id, item_source, item_category, action_type, item_key)
    VALUES (${tenantId}, ${userId}, ${source}, ${category}, ${actionType}, ${itemKey})
  `
}
