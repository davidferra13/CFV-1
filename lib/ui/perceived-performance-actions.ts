'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  SkeletonConfig,
  PerformanceBudget,
  PerformanceMetric,
  PerformanceSummary,
} from './perceived-performance-types'

// ---- helpers ----

function fromSkeletonConfigs(db: any): any {
  return (db as any).from('skeleton_configs')
}

function fromPerformanceBudgets(db: any): any {
  return (db as any).from('performance_budgets')
}

function fromPerformanceMetrics(db: any): any {
  return (db as any).from('performance_metrics')
}

// ---- actions ----

export async function getSkeletonConfigs(route?: string): Promise<SkeletonConfig[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = fromSkeletonConfigs(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (route) {
    query = query.eq('route', route)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load skeleton configs: ${error.message}`)
  return (data ?? []).map(mapSkeletonConfig)
}

export async function upsertSkeletonConfig(params: {
  route: string
  component: string
  skeletonType: string
  layoutHint?: Record<string, unknown> | null
  animationType?: string
}): Promise<SkeletonConfig> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    route: params.route,
    component: params.component,
    skeleton_type: params.skeletonType,
  }
  if (params.layoutHint !== undefined) payload.layout_hint = params.layoutHint
  if (params.animationType !== undefined) payload.animation_type = params.animationType

  const { data, error } = await fromSkeletonConfigs(db)
    .upsert(payload, { onConflict: 'tenant_id,route,component' })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to upsert skeleton config: ${error.message}`)
  return mapSkeletonConfig(data)
}

export async function getPerformanceBudgets(route?: string): Promise<PerformanceBudget[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = fromPerformanceBudgets(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (route) {
    query = query.eq('route', route)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load performance budgets: ${error.message}`)
  return (data ?? []).map(mapPerformanceBudget)
}

export async function upsertPerformanceBudget(params: {
  route: string
  maxFcp: number
  maxLcp: number
  maxTti: number
  maxCls: number
  maxBundleSize: number
}): Promise<PerformanceBudget> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    route: params.route,
    max_fcp: params.maxFcp,
    max_lcp: params.maxLcp,
    max_tti: params.maxTti,
    max_cls: params.maxCls,
    max_bundle_size: params.maxBundleSize,
  }

  const { data, error } = await fromPerformanceBudgets(db)
    .upsert(payload, { onConflict: 'tenant_id,route' })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to upsert performance budget: ${error.message}`)
  return mapPerformanceBudget(data)
}

export async function getPerformanceMetrics(
  route?: string,
  limit?: number
): Promise<PerformanceMetric[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = fromPerformanceMetrics(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('measured_at', { ascending: false })

  if (route) {
    query = query.eq('route', route)
  }
  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load performance metrics: ${error.message}`)
  return (data ?? []).map(mapPerformanceMetric)
}

export async function getPerformanceSummary(): Promise<PerformanceSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Distinct routes with skeleton configs
  const { data: skeletons, error: skelErr } = await fromSkeletonConfigs(db)
    .select('route')
    .eq('tenant_id', user.tenantId)

  if (skelErr) throw new Error(`Failed to load skeleton summary: ${skelErr.message}`)

  const skeletonRoutes = new Set((skeletons ?? []).map((s: any) => s.route))

  // Budgets
  const { data: budgets, error: budErr } = await fromPerformanceBudgets(db)
    .select('route,max_fcp,max_lcp')
    .eq('tenant_id', user.tenantId)

  if (budErr) throw new Error(`Failed to load budget summary: ${budErr.message}`)

  const budgetRoutes = new Set((budgets ?? []).map((b: any) => b.route))
  const budgetMap: Record<string, { maxFcp: number; maxLcp: number }> = {}
  for (const b of budgets ?? []) {
    budgetMap[b.route] = { maxFcp: b.max_fcp, maxLcp: b.max_lcp }
  }

  // Recent metrics (last 100 per tenant for avg calculation)
  const { data: metrics, error: metErr } = await fromPerformanceMetrics(db)
    .select('route,fcp,lcp')
    .eq('tenant_id', user.tenantId)
    .order('measured_at', { ascending: false })
    .limit(100)

  if (metErr) throw new Error(`Failed to load metrics summary: ${metErr.message}`)

  const allRoutes = new Set([
    ...skeletonRoutes,
    ...budgetRoutes,
    ...(metrics ?? []).map((m: any) => m.route),
  ])

  let fcpSum = 0
  let fcpCount = 0
  let lcpSum = 0
  let lcpCount = 0
  let violations = 0

  for (const m of metrics ?? []) {
    if (m.fcp != null) {
      fcpSum += m.fcp
      fcpCount++
      const budget = budgetMap[m.route]
      if (budget && m.fcp > budget.maxFcp) violations++
    }
    if (m.lcp != null) {
      lcpSum += m.lcp
      lcpCount++
      const budget = budgetMap[m.route]
      if (budget && m.lcp > budget.maxLcp) violations++
    }
  }

  return {
    totalRoutes: allRoutes.size,
    routesWithSkeletons: skeletonRoutes.size,
    routesWithBudgets: budgetRoutes.size,
    avgFcp: fcpCount > 0 ? Math.round(fcpSum / fcpCount) : null,
    avgLcp: lcpCount > 0 ? Math.round(lcpSum / lcpCount) : null,
    budgetViolations: violations,
  }
}

// ---- mappers ----

function mapSkeletonConfig(row: any): SkeletonConfig {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    route: row.route,
    component: row.component,
    skeletonType: row.skeleton_type,
    layoutHint: row.layout_hint ?? null,
    animationType: row.animation_type ?? 'pulse',
    createdAt: new Date(row.created_at),
  }
}

function mapPerformanceBudget(row: any): PerformanceBudget {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    route: row.route,
    maxFcp: row.max_fcp,
    maxLcp: row.max_lcp,
    maxTti: row.max_tti,
    maxCls: row.max_cls,
    maxBundleSize: row.max_bundle_size,
    createdAt: new Date(row.created_at),
  }
}

function mapPerformanceMetric(row: any): PerformanceMetric {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    route: row.route,
    fcp: row.fcp ?? null,
    lcp: row.lcp ?? null,
    tti: row.tti ?? null,
    cls: row.cls ?? null,
    bundleSize: row.bundle_size ?? null,
    viewport: row.viewport ?? null,
    measuredAt: new Date(row.measured_at),
    createdAt: new Date(row.created_at),
  }
}
