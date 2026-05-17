'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  OverlayConfig,
  OverlayType,
  SizePreset,
  OverlayPosition,
  OverlayAnimation,
  OverlayUsageRule,
  OverlaySummary,
} from './modal-drawer-sheet-types'

export async function getOverlayConfigs(overlayType?: OverlayType): Promise<OverlayConfig[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const params: any[] = [user.tenantId]
  let query = 'SELECT * FROM overlay_configs WHERE tenant_id = $1'
  if (overlayType) {
    query += ' AND overlay_type = $2'
    params.push(overlayType)
  }
  query += ' ORDER BY name'
  const rows = await db.query(query, params)
  return rows.map((r: any) => mapConfig(r))
}

export async function upsertOverlayConfig(params: {
  name: string
  overlayType: OverlayType
  sizePreset: SizePreset
  position: OverlayPosition
  animation: OverlayAnimation
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  mobileOverride?: OverlayType | null
  stackable?: boolean
  maxStackDepth?: number
}): Promise<OverlayConfig> {
  const user = await requireChef()
  const db: any = createServerClient()
  const closeOnBackdrop = params.closeOnBackdrop ?? true
  const closeOnEscape = params.closeOnEscape ?? true
  const mobileOverride = params.mobileOverride ?? null
  const stackable = params.stackable ?? false
  const maxStackDepth = params.maxStackDepth ?? 1

  const rows = await db.query(
    `INSERT INTO overlay_configs
       (tenant_id, name, overlay_type, size_preset, position, animation,
        close_on_backdrop, close_on_escape, mobile_override, stackable, max_stack_depth)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (tenant_id, name)
     DO UPDATE SET overlay_type = $3, size_preset = $4, position = $5, animation = $6,
       close_on_backdrop = $7, close_on_escape = $8, mobile_override = $9,
       stackable = $10, max_stack_depth = $11
     RETURNING *`,
    [
      user.tenantId,
      params.name,
      params.overlayType,
      params.sizePreset,
      params.position,
      params.animation,
      closeOnBackdrop,
      closeOnEscape,
      mobileOverride,
      stackable,
      maxStackDepth,
    ]
  )
  return mapConfig(rows[0])
}

export async function getOverlayUsageRules(route?: string): Promise<OverlayUsageRule[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const params: any[] = [user.tenantId]
  let query = 'SELECT * FROM overlay_usage_rules WHERE tenant_id = $1'
  if (route) {
    query += ' AND route = $2'
    params.push(route)
  }
  query += ' ORDER BY route, component'
  const rows = await db.query(query, params)
  return rows.map((r: any) => mapUsageRule(r))
}

export async function upsertOverlayUsageRule(params: {
  route: string
  component: string
  overlayConfigId: string
  purpose?: string | null
}): Promise<OverlayUsageRule> {
  const user = await requireChef()
  const db: any = createServerClient()
  const purpose = params.purpose ?? null

  const rows = await db.query(
    `INSERT INTO overlay_usage_rules (tenant_id, route, component, overlay_config_id, purpose)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tenant_id, route, component)
     DO UPDATE SET overlay_config_id = $4, purpose = $5
     RETURNING *`,
    [user.tenantId, params.route, params.component, params.overlayConfigId, purpose]
  )
  return mapUsageRule(rows[0])
}

export async function deleteOverlayConfig(id: string): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    'DELETE FROM overlay_configs WHERE id = $1 AND tenant_id = $2 RETURNING id',
    [id, user.tenantId]
  )
  if (!rows.length) {
    throw new Error('Overlay config not found or not owned by tenant')
  }
  return { success: true }
}

export async function getOverlaySummary(): Promise<OverlaySummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const configRows = await db.query(
    'SELECT overlay_type, COUNT(*)::int as cnt FROM overlay_configs WHERE tenant_id = $1 GROUP BY overlay_type',
    [user.tenantId]
  )
  const typeDistribution: Record<string, number> = {}
  let totalConfigs = 0
  for (const r of configRows) {
    typeDistribution[r.overlay_type] = r.cnt
    totalConfigs += r.cnt
  }

  const usageRows = await db.query(
    'SELECT COUNT(*)::int as total, COUNT(DISTINCT route)::int as routes FROM overlay_usage_rules WHERE tenant_id = $1',
    [user.tenantId]
  )

  return {
    totalConfigs,
    totalUsageRules: usageRows[0]?.total ?? 0,
    typeDistribution: typeDistribution as OverlaySummary['typeDistribution'],
    routesCovered: usageRows[0]?.routes ?? 0,
  }
}

function mapConfig(r: any): OverlayConfig {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    name: r.name,
    overlayType: r.overlay_type as OverlayType,
    sizePreset: r.size_preset as SizePreset,
    position: r.position as OverlayPosition,
    animation: r.animation as OverlayAnimation,
    closeOnBackdrop: r.close_on_backdrop ?? true,
    closeOnEscape: r.close_on_escape ?? true,
    mobileOverride: r.mobile_override as OverlayType | null,
    stackable: r.stackable ?? false,
    maxStackDepth: r.max_stack_depth ?? 1,
    createdAt: new Date(r.created_at),
  }
}

function mapUsageRule(r: any): OverlayUsageRule {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    route: r.route,
    component: r.component,
    overlayConfigId: r.overlay_config_id,
    purpose: r.purpose,
    createdAt: new Date(r.created_at),
  }
}
