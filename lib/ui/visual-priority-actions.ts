'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  SurfaceLevel,
  VisualPriority,
  SurfaceConfig,
  PriorityAudit,
  VisualPrioritySummary,
} from './visual-priority-types'

const CONFIGS_TABLE = 'surface_configs'
const AUDITS_TABLE = 'priority_audits'

const VALID_LEVELS: SurfaceLevel[] = ['primary', 'secondary', 'tertiary', 'ambient']
const VALID_PRIORITIES: VisualPriority[] = ['critical', 'high', 'medium', 'low', 'decorative']

function mapConfig(row: any): SurfaceConfig {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    route: row.route,
    component: row.component ?? null,
    surfaceLevel: row.surface_level as SurfaceLevel,
    visualPriority: row.visual_priority as VisualPriority,
    zIndex: row.z_index ?? null,
    elevation: row.elevation ?? null,
    createdAt: row.created_at,
  }
}

function mapAudit(row: any): PriorityAudit {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    route: row.route,
    totalElements: row.total_elements ?? 0,
    byPriority: (row.by_priority as Record<string, number>) ?? {},
    bySurface: (row.by_surface as Record<string, number>) ?? {},
    score: row.score ?? 0,
    auditedAt: row.audited_at,
  }
}

/**
 * Get surface config for a route (optionally filtered by component).
 */
export async function getSurfaceConfig(
  route: string,
  component?: string
): Promise<{ success: boolean; data?: SurfaceConfig[]; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!route) return { success: false, error: 'Route is required' }

  let query = db
    .from(CONFIGS_TABLE)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('route', route)

  if (component) {
    query = query.eq('component', component)
  }

  const { data, error } = await query

  if (error) return { success: false, error: error.message }
  return { success: true, data: (data ?? []).map(mapConfig) }
}

/**
 * Upsert a surface config for a route/component pair.
 */
export async function upsertSurfaceConfig(
  route: string,
  component: string,
  surfaceLevel: SurfaceLevel,
  visualPriority: VisualPriority,
  zIndex?: number,
  elevation?: number
): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!route || !component) return { success: false, error: 'Route and component are required' }
  if (!VALID_LEVELS.includes(surfaceLevel)) return { success: false, error: 'Invalid surface level' }
  if (!VALID_PRIORITIES.includes(visualPriority)) return { success: false, error: 'Invalid visual priority' }

  // Check for existing config
  const { data: existing } = await db
    .from(CONFIGS_TABLE)
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('route', route)
    .eq('component', component)
    .single()

  if (existing) {
    const { error } = await db
      .from(CONFIGS_TABLE)
      .update({
        surface_level: surfaceLevel,
        visual_priority: visualPriority,
        z_index: zIndex ?? null,
        elevation: elevation ?? null,
      })
      .eq('id', existing.id)

    if (error) return { success: false, error: error.message }
    return { success: true, id: existing.id }
  }

  const { data, error } = await db
    .from(CONFIGS_TABLE)
    .insert({
      tenant_id: user.tenantId!,
      route,
      component,
      surface_level: surfaceLevel,
      visual_priority: visualPriority,
      z_index: zIndex ?? null,
      elevation: elevation ?? null,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, id: data?.id }
}

/**
 * Record a priority audit for a route.
 */
export async function auditRoutePriority(
  route: string,
  totalElements: number,
  byPriority: Record<string, number>,
  bySurface: Record<string, number>,
  score: number
): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!route) return { success: false, error: 'Route is required' }

  const { data, error } = await db
    .from(AUDITS_TABLE)
    .insert({
      tenant_id: user.tenantId!,
      route,
      total_elements: totalElements,
      by_priority: byPriority,
      by_surface: bySurface,
      score,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, id: data?.id }
}

/**
 * List priority audits, optionally filtered by route.
 */
export async function getPriorityAudits(
  route?: string,
  limit?: number
): Promise<{ success: boolean; data?: PriorityAudit[]; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from(AUDITS_TABLE)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('audited_at', { ascending: false })
    .limit(limit ?? 50)

  if (route) {
    query = query.eq('route', route)
  }

  const { data, error } = await query

  if (error) return { success: false, error: error.message }
  return { success: true, data: (data ?? []).map(mapAudit) }
}

/**
 * Aggregate visual priority summary across all configs and audits.
 */
export async function getVisualPrioritySummary(): Promise<{
  success: boolean
  data?: VisualPrioritySummary
  error?: string
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: configs, error: cfgErr } = await db
    .from(CONFIGS_TABLE)
    .select('*')
    .eq('tenant_id', user.tenantId!)

  if (cfgErr) return { success: false, error: cfgErr.message }

  const { data: audits, error: audErr } = await db
    .from(AUDITS_TABLE)
    .select('route, score')
    .eq('tenant_id', user.tenantId!)
    .order('audited_at', { ascending: false })

  if (audErr) return { success: false, error: audErr.message }

  const allConfigs = configs ?? []
  const allAudits = audits ?? []

  const byLevel: Record<string, number> = {}
  const byPriority: Record<string, number> = {}

  for (const c of allConfigs) {
    byLevel[c.surface_level] = (byLevel[c.surface_level] ?? 0) + 1
    byPriority[c.visual_priority] = (byPriority[c.visual_priority] ?? 0) + 1
  }

  const scores = allAudits.map((a: any) => a.score ?? 0)
  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((s: number, v: number) => s + v, 0) / scores.length)
    : 0

  // Deduplicate routes, keep worst (lowest) score per route
  const routeScores = new Map<string, number>()
  for (const a of allAudits) {
    const existing = routeScores.get(a.route)
    if (existing === undefined || a.score < existing) {
      routeScores.set(a.route, a.score)
    }
  }

  const worstRoutes = Array.from(routeScores.entries())
    .map(([route, score]) => ({ route, score }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 10)

  return {
    success: true,
    data: {
      totalConfigs: allConfigs.length,
      byLevel,
      byPriority,
      avgScore,
      worstRoutes,
    },
  }
}

/**
 * Find routes with priority imbalance (too many critical elements).
 */
export async function getImbalancedRoutes(): Promise<{
  success: boolean
  data?: Array<{ route: string; criticalCount: number; totalElements: number; ratio: number }>
  error?: string
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: audits, error } = await db
    .from(AUDITS_TABLE)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('audited_at', { ascending: false })

  if (error) return { success: false, error: error.message }

  // Deduplicate: keep latest audit per route
  const latestByRoute = new Map<string, any>()
  for (const a of (audits ?? [])) {
    if (!latestByRoute.has(a.route)) {
      latestByRoute.set(a.route, a)
    }
  }

  const imbalanced: Array<{ route: string; criticalCount: number; totalElements: number; ratio: number }> = []

  latestByRoute.forEach((audit, route) => {
    const bp = (audit.by_priority as Record<string, number>) ?? {}
    const criticalCount = bp['critical'] ?? 0
    const total = audit.total_elements ?? 0
    if (total === 0) return
    const ratio = criticalCount / total
    // Flag if more than 30% of elements are critical
    if (ratio > 0.3) {
      imbalanced.push({ route, criticalCount, totalElements: total, ratio: Math.round(ratio * 100) / 100 })
    }
  })

  imbalanced.sort((a, b) => b.ratio - a.ratio)

  return { success: true, data: imbalanced }
}
