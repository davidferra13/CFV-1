'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { ViewportAudit, ViewportRule, ViewportSize, ViewportSummary } from './viewport-discipline-types'

const db: any = createServerClient()

export async function auditViewport(
  route: string,
  viewport: ViewportSize,
  aboveFoldElements: number,
  criticalContentVisible: boolean,
  scrollRequired: boolean,
  loadTime?: number,
  score?: number
): Promise<ViewportAudit> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const rows = await db
    .insert('viewport_audits')
    .values({
      tenant_id: tenantId,
      route,
      viewport,
      above_fold_elements: aboveFoldElements,
      critical_content_visible: criticalContentVisible,
      scroll_required: scrollRequired,
      load_time: loadTime ?? null,
      score: score ?? 0,
    })
    .returning()

  const r = rows[0]
  return {
    id: r.id,
    tenantId: r.tenant_id,
    route: r.route,
    viewport: r.viewport as ViewportSize,
    aboveFoldElements: r.above_fold_elements,
    criticalContentVisible: r.critical_content_visible,
    scrollRequired: r.scroll_required,
    loadTime: r.load_time ?? undefined,
    score: r.score,
    auditedAt: r.audited_at,
  }
}

export async function getViewportAudits(
  route?: string,
  viewport?: ViewportSize,
  limit?: number
): Promise<ViewportAudit[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  let query = db
    .select()
    .from('viewport_audits')
    .where('tenant_id', tenantId)

  if (route) query = query.where('route', route)
  if (viewport) query = query.where('viewport', viewport)

  query = query.orderBy('audited_at', 'desc')
  if (limit) query = query.limit(limit)

  const rows = await query

  return rows.map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    route: r.route,
    viewport: r.viewport as ViewportSize,
    aboveFoldElements: r.above_fold_elements,
    criticalContentVisible: r.critical_content_visible,
    scrollRequired: r.scroll_required,
    loadTime: r.load_time ?? undefined,
    score: r.score,
    auditedAt: r.audited_at,
  }))
}

export async function getViewportRules(
  viewport?: ViewportSize
): Promise<ViewportRule[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  let query = db
    .select()
    .from('viewport_rules')
    .where('tenant_id', tenantId)

  if (viewport) query = query.where('viewport', viewport)

  query = query.orderBy('created_at', 'desc')

  const rows = await query

  return rows.map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    viewport: r.viewport as ViewportSize,
    maxAboveFoldElements: r.max_above_fold_elements,
    requiredElements: r.required_elements ?? [],
    maxLoadTimeMs: r.max_load_time_ms,
    createdAt: r.created_at,
  }))
}

export async function upsertViewportRule(
  viewport: ViewportSize,
  maxAboveFoldElements: number,
  requiredElements: string[],
  maxLoadTimeMs: number
): Promise<ViewportRule> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const rows = await db
    .insert('viewport_rules')
    .values({
      tenant_id: tenantId,
      viewport,
      max_above_fold_elements: maxAboveFoldElements,
      required_elements: JSON.stringify(requiredElements),
      max_load_time_ms: maxLoadTimeMs,
    })
    .onConflict('tenant_id, viewport')
    .merge({
      max_above_fold_elements: maxAboveFoldElements,
      required_elements: JSON.stringify(requiredElements),
      max_load_time_ms: maxLoadTimeMs,
    })
    .returning()

  const r = rows[0]
  return {
    id: r.id,
    tenantId: r.tenant_id,
    viewport: r.viewport as ViewportSize,
    maxAboveFoldElements: r.max_above_fold_elements,
    requiredElements: r.required_elements ?? [],
    maxLoadTimeMs: r.max_load_time_ms,
    createdAt: r.created_at,
  }
}

export async function getViewportSummary(): Promise<ViewportSummary> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const audits = await db
    .select()
    .from('viewport_audits')
    .where('tenant_id', tenantId)

  const rules = await db
    .select()
    .from('viewport_rules')
    .where('tenant_id', tenantId)

  const byViewport: Record<ViewportSize, number> = { mobile: 0, tablet: 0, desktop: 0, wide: 0 }
  let totalScore = 0
  const routeResults: Record<string, boolean> = {}

  for (const a of audits) {
    const vp = a.viewport as ViewportSize
    if (vp in byViewport) byViewport[vp]++
    totalScore += a.score ?? 0

    const rule = rules.find((r: any) => r.viewport === a.viewport)
    const passing = rule
      ? (a.above_fold_elements <= rule.max_above_fold_elements) &&
        a.critical_content_visible &&
        (!a.load_time || a.load_time <= rule.max_load_time_ms)
      : a.critical_content_visible

    const key = `${a.route}::${a.viewport}`
    if (routeResults[key] === undefined || !passing) {
      routeResults[key] = passing
    }
  }

  const passingRoutes: string[] = []
  const failingRoutes: string[] = []
  for (const [key, pass] of Object.entries(routeResults)) {
    const route = key.split('::')[0]
    if (pass && !passingRoutes.includes(route)) passingRoutes.push(route)
    if (!pass && !failingRoutes.includes(route)) failingRoutes.push(route)
  }

  return {
    totalAudits: audits.length,
    byViewport,
    avgScore: audits.length > 0 ? Math.round(totalScore / audits.length) : 0,
    passingRoutes: passingRoutes.filter(r => !failingRoutes.includes(r)),
    failingRoutes,
  }
}

export async function getViewportFailures(
  viewport?: ViewportSize
): Promise<ViewportAudit[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const rules = await db
    .select()
    .from('viewport_rules')
    .where('tenant_id', tenantId)

  let query = db
    .select()
    .from('viewport_audits')
    .where('tenant_id', tenantId)

  if (viewport) query = query.where('viewport', viewport)

  query = query.orderBy('audited_at', 'desc')

  const audits = await query

  return audits
    .filter((a: any) => {
      const rule = rules.find((r: any) => r.viewport === a.viewport)
      if (!rule) return !a.critical_content_visible
      return (
        a.above_fold_elements > rule.max_above_fold_elements ||
        !a.critical_content_visible ||
        (a.load_time && a.load_time > rule.max_load_time_ms)
      )
    })
    .map((r: any) => ({
      id: r.id,
      tenantId: r.tenant_id,
      route: r.route,
      viewport: r.viewport as ViewportSize,
      aboveFoldElements: r.above_fold_elements,
      criticalContentVisible: r.critical_content_visible,
      scrollRequired: r.scroll_required,
      loadTime: r.load_time ?? undefined,
      score: r.score,
      auditedAt: r.audited_at,
    }))
}
