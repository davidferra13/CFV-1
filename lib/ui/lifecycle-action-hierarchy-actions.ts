'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  ActionTier,
  CollapseBehavior,
  LifecycleActionRule,
  ActionGroupConfig,
  ActionHierarchySummary,
} from './lifecycle-action-hierarchy-types'

function mapRule(r: any): LifecycleActionRule {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    lifecycleStage: r.lifecycle_stage,
    actionName: r.action_name,
    tier: r.tier as ActionTier,
    visualWeight: r.visual_weight ?? 5,
    sortOrder: r.sort_order ?? 0,
    contextCondition: r.context_condition
      ? typeof r.context_condition === 'string'
        ? JSON.parse(r.context_condition)
        : r.context_condition
      : null,
    createdAt: new Date(r.created_at),
  }
}

function mapGroup(r: any): ActionGroupConfig {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    groupName: r.group_name,
    lifecycleStage: r.lifecycle_stage,
    maxVisible: r.max_visible ?? 3,
    collapseBehavior: r.collapse_behavior as CollapseBehavior,
    createdAt: new Date(r.created_at),
  }
}

export async function getActionRules(lifecycleStage?: string): Promise<LifecycleActionRule[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const params: any[] = [user.tenantId]
  let query = 'SELECT * FROM lifecycle_action_rules WHERE tenant_id = $1'
  if (lifecycleStage) {
    query += ' AND lifecycle_stage = $2'
    params.push(lifecycleStage)
  }
  query += ' ORDER BY lifecycle_stage, sort_order'
  const rows = await db.query(query, params)
  return rows.map(mapRule)
}

export async function upsertActionRule(params: {
  lifecycleStage: string
  actionName: string
  tier: ActionTier
  visualWeight: number
  sortOrder: number
  contextCondition?: Record<string, unknown> | null
}): Promise<LifecycleActionRule> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `INSERT INTO lifecycle_action_rules (tenant_id, lifecycle_stage, action_name, tier, visual_weight, sort_order, context_condition)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (tenant_id, lifecycle_stage, action_name)
     DO UPDATE SET tier = $4, visual_weight = $5, sort_order = $6, context_condition = $7
     RETURNING *`,
    [
      user.tenantId,
      params.lifecycleStage,
      params.actionName,
      params.tier,
      params.visualWeight,
      params.sortOrder,
      params.contextCondition ? JSON.stringify(params.contextCondition) : null,
    ]
  )
  return mapRule(rows[0])
}

export async function deleteActionRule(id: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()
  await db.query('DELETE FROM lifecycle_action_rules WHERE id = $1 AND tenant_id = $2', [
    id,
    user.tenantId,
  ])
}

export async function getActionGroups(lifecycleStage?: string): Promise<ActionGroupConfig[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const params: any[] = [user.tenantId]
  let query = 'SELECT * FROM action_group_configs WHERE tenant_id = $1'
  if (lifecycleStage) {
    query += ' AND lifecycle_stage = $2'
    params.push(lifecycleStage)
  }
  query += ' ORDER BY lifecycle_stage, group_name'
  const rows = await db.query(query, params)
  return rows.map(mapGroup)
}

export async function upsertActionGroup(params: {
  groupName: string
  lifecycleStage: string
  maxVisible: number
  collapseBehavior: CollapseBehavior
}): Promise<ActionGroupConfig> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `INSERT INTO action_group_configs (tenant_id, group_name, lifecycle_stage, max_visible, collapse_behavior)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tenant_id, lifecycle_stage, group_name)
     DO UPDATE SET max_visible = $4, collapse_behavior = $5
     RETURNING *`,
    [
      user.tenantId,
      params.groupName,
      params.lifecycleStage,
      params.maxVisible,
      params.collapseBehavior,
    ]
  )
  return mapGroup(rows[0])
}

export async function getActionHierarchySummary(): Promise<ActionHierarchySummary> {
  const user = await requireChef()
  const db: any = createServerClient()
  const ruleCount = await db.query(
    'SELECT COUNT(*)::int as cnt FROM lifecycle_action_rules WHERE tenant_id = $1',
    [user.tenantId]
  )
  const groupCount = await db.query(
    'SELECT COUNT(*)::int as cnt FROM action_group_configs WHERE tenant_id = $1',
    [user.tenantId]
  )
  const stages = await db.query(
    'SELECT DISTINCT lifecycle_stage FROM lifecycle_action_rules WHERE tenant_id = $1 ORDER BY lifecycle_stage',
    [user.tenantId]
  )
  const groupedStages = await db.query(
    'SELECT DISTINCT lifecycle_stage FROM action_group_configs WHERE tenant_id = $1',
    [user.tenantId]
  )
  const groupedStageSet = new Set(groupedStages.map((r: any) => r.lifecycle_stage))
  const ungroupedCount = await db.query(
    `SELECT COUNT(*)::int as cnt FROM lifecycle_action_rules
     WHERE tenant_id = $1 AND lifecycle_stage NOT IN (
       SELECT DISTINCT lifecycle_stage FROM action_group_configs WHERE tenant_id = $1
     )`,
    [user.tenantId]
  )
  return {
    totalRules: ruleCount[0]?.cnt ?? 0,
    totalGroups: groupCount[0]?.cnt ?? 0,
    stagesCovered: stages.map((r: any) => r.lifecycle_stage),
    ungroupedActions: ungroupedCount[0]?.cnt ?? 0,
  }
}
