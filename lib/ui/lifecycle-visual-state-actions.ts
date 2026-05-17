'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  VisualState,
  AnimationType,
  VisualStateStyle,
  LifecycleStateMapping,
  VisualStateSummary,
} from './lifecycle-visual-state-types'

function rowToStyle(r: any): VisualStateStyle {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    state: r.state as VisualState,
    bgColor: r.bg_color,
    textColor: r.text_color,
    borderColor: r.border_color,
    borderWidth: r.border_width ?? 0,
    opacity: r.opacity ?? 1,
    animation: (r.animation ?? 'none') as AnimationType,
    icon: r.icon,
    createdAt: new Date(r.created_at),
  }
}

function rowToMapping(r: any): LifecycleStateMapping {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    lifecycleStage: r.lifecycle_stage,
    visualState: r.visual_state as VisualState,
    label: r.label,
    description: r.description,
    createdAt: new Date(r.created_at),
  }
}

export async function getVisualStateStyles(state?: VisualState): Promise<VisualStateStyle[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const params: any[] = [user.tenantId]
  let query = 'SELECT * FROM visual_state_styles WHERE tenant_id = $1'
  if (state) {
    query += ' AND state = $2'
    params.push(state)
  }
  query += ' ORDER BY state'
  const rows = await db.query(query, params)
  return rows.map(rowToStyle)
}

export async function upsertVisualStateStyle(
  state: VisualState,
  bgColor: string,
  textColor: string,
  borderColor: string | null,
  borderWidth: number,
  opacity: number,
  animation: AnimationType,
  icon: string | null
): Promise<VisualStateStyle> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `INSERT INTO visual_state_styles (tenant_id, state, bg_color, text_color, border_color, border_width, opacity, animation, icon)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (tenant_id, state)
     DO UPDATE SET bg_color = $3, text_color = $4, border_color = $5, border_width = $6, opacity = $7, animation = $8, icon = $9
     RETURNING *`,
    [
      user.tenantId,
      state,
      bgColor,
      textColor,
      borderColor,
      borderWidth,
      opacity,
      animation,
      icon ?? null,
    ]
  )
  return rowToStyle(rows[0])
}

export async function deleteVisualStateStyle(id: string): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    'DELETE FROM visual_state_styles WHERE id = $1 AND tenant_id = $2 RETURNING id',
    [id, user.tenantId]
  )
  return { success: rows.length > 0 }
}

export async function getLifecycleStateMappings(
  lifecycleStage?: string
): Promise<LifecycleStateMapping[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const params: any[] = [user.tenantId]
  let query = 'SELECT * FROM lifecycle_state_mappings WHERE tenant_id = $1'
  if (lifecycleStage) {
    query += ' AND lifecycle_stage = $2'
    params.push(lifecycleStage)
  }
  query += ' ORDER BY lifecycle_stage'
  const rows = await db.query(query, params)
  return rows.map(rowToMapping)
}

export async function upsertLifecycleStateMapping(
  lifecycleStage: string,
  visualState: VisualState,
  label: string,
  description?: string
): Promise<LifecycleStateMapping> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `INSERT INTO lifecycle_state_mappings (tenant_id, lifecycle_stage, visual_state, label, description)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tenant_id, lifecycle_stage)
     DO UPDATE SET visual_state = $3, label = $4, description = $5
     RETURNING *`,
    [user.tenantId, lifecycleStage, visualState, label, description ?? null]
  )
  return rowToMapping(rows[0])
}

export async function getVisualStateSummary(): Promise<VisualStateSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const styleRows = await db.query(
    'SELECT state, COUNT(*)::int as cnt FROM visual_state_styles WHERE tenant_id = $1 GROUP BY state',
    [user.tenantId]
  )
  const totalStyles = styleRows.reduce((sum: number, r: any) => sum + r.cnt, 0)
  const stateDistribution: Record<string, number> = {}
  for (const r of styleRows) {
    stateDistribution[r.state] = r.cnt
  }

  const mappingRows = await db.query(
    'SELECT COUNT(*)::int as cnt FROM lifecycle_state_mappings WHERE tenant_id = $1',
    [user.tenantId]
  )
  const totalMappings = mappingRows[0]?.cnt ?? 0

  const unmappedRows = await db.query(
    `SELECT DISTINCT lifecycle_stage FROM lifecycle_state_mappings WHERE tenant_id = $1
     AND visual_state NOT IN (SELECT state FROM visual_state_styles WHERE tenant_id = $1)`,
    [user.tenantId]
  )
  const unmappedStages = unmappedRows.map((r: any) => r.lifecycle_stage)

  return {
    totalStyles,
    totalMappings,
    unmappedStages,
    stateDistribution: stateDistribution as Record<VisualState, number>,
  }
}
