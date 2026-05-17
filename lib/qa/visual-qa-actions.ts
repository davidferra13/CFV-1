'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  QAMatrix,
  QAStatus,
  QAViolation,
  ScreenshotComparison,
  VisualQAEntry,
} from './visual-qa-types'

/**
 * Record a QA check result for a route.
 */
export async function recordQAResult(
  route: string,
  status: QAStatus,
  violations: QAViolation[],
  score: number | null,
  viewport: string,
  theme: string,
  screenshotPath?: string
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db.from('visual_qa_entries').insert({
    tenant_id: user.tenantId!,
    route,
    status,
    violations,
    score,
    viewport,
    theme,
    screenshot_path: screenshotPath ?? null,
    checked_by: user.email ?? null,
  })

  if (error) throw error
}

/**
 * Aggregate QA coverage stats across all routes for the tenant.
 */
export async function getQAMatrix(): Promise<QAMatrix> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('visual_qa_entries')
    .select('route, status, score')
    .eq('tenant_id', user.tenantId!)

  if (error) throw error

  const rows = (data ?? []) as { route: string; status: string; score: number | null }[]
  const uniqueRoutes = new Set(rows.map((r) => r.route))

  const passed = rows.filter((r) => r.status === 'pass').length
  const failed = rows.filter((r) => r.status === 'fail').length
  const needsReview = rows.filter((r) => r.status === 'needs_review').length
  const scores = rows.map((r) => r.score).filter((s): s is number => s != null)
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  return {
    totalRoutes: uniqueRoutes.size,
    checked: rows.length,
    passed,
    failed,
    needsReview,
    coveragePercent: uniqueRoutes.size > 0 ? Math.round((passed / uniqueRoutes.size) * 100) : 0,
    avgScore,
  }
}

/**
 * Get QA results with optional filters.
 */
export async function getQAResults(
  route?: string,
  status?: QAStatus,
  limit = 100
): Promise<VisualQAEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('visual_qa_entries')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('checked_at', { ascending: false })
    .limit(limit)

  if (route) query = query.eq('route', route)
  if (status) query = query.eq('status', status)

  const { data, error } = await query

  if (error) throw error

  return (data ?? []).map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    route: row.route,
    screenshotPath: row.screenshot_path,
    status: row.status,
    violations: row.violations ?? [],
    score: row.score,
    viewport: row.viewport,
    theme: row.theme,
    checkedAt: row.checked_at,
    checkedBy: row.checked_by,
  }))
}

/**
 * Record a screenshot comparison (visual diff between baseline and current).
 */
export async function recordScreenshotComparison(
  route: string,
  baselinePath: string,
  currentPath: string,
  diffPath: string | null,
  pixelDiffPercent: number | null
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const status = pixelDiffPercent != null && pixelDiffPercent > 0 ? 'needs_review' : 'pass'

  const { error } = await db.from('screenshot_comparisons').insert({
    tenant_id: user.tenantId!,
    route,
    baseline_path: baselinePath,
    current_path: currentPath,
    diff_path: diffPath,
    pixel_diff_percent: pixelDiffPercent,
    status,
  })

  if (error) throw error
}

/**
 * Get screenshot comparisons with optional filters.
 */
export async function getScreenshotComparisons(
  route?: string,
  status?: QAStatus,
  limit = 50
): Promise<ScreenshotComparison[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('screenshot_comparisons')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (route) query = query.eq('route', route)
  if (status) query = query.eq('status', status)

  const { data, error } = await query

  if (error) throw error

  return (data ?? []).map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    route: row.route,
    baselinePath: row.baseline_path,
    currentPath: row.current_path,
    diffPath: row.diff_path,
    pixelDiffPercent: row.pixel_diff_percent,
    status: row.status,
    createdAt: row.created_at,
  }))
}

/**
 * Update a QA entry status after manual review.
 */
export async function markQAReviewed(
  entryId: string,
  status: QAStatus
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('visual_qa_entries')
    .update({ status })
    .eq('id', entryId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw error
}

/**
 * Find routes with no QA checks or only failing checks.
 */
export async function getQACoverageGaps(): Promise<
  { route: string; lastStatus: QAStatus | null; lastChecked: string | null }[]
> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('visual_qa_entries')
    .select('route, status, checked_at')
    .eq('tenant_id', user.tenantId!)
    .order('checked_at', { ascending: false })

  if (error) throw error

  const rows = (data ?? []) as { route: string; status: string; checked_at: string }[]

  // Group by route, keep latest entry per route
  const routeMap = new Map<string, { lastStatus: QAStatus; lastChecked: string }>()
  for (const row of rows) {
    if (!routeMap.has(row.route)) {
      routeMap.set(row.route, {
        lastStatus: row.status as QAStatus,
        lastChecked: row.checked_at,
      })
    }
  }

  // Return routes that are not passing
  return Array.from(routeMap.entries())
    .filter(([, info]) => info.lastStatus !== 'pass')
    .map(([route, info]) => ({
      route,
      lastStatus: info.lastStatus,
      lastChecked: info.lastChecked,
    }))
}
