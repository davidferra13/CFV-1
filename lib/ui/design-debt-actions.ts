'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  DebtSeverity,
  DebtCategory,
  DebtStatus,
  DesignDebtItem,
  DesignDebtSummary,
} from './design-debt-types'

const TABLE = 'design_debt_items'

const VALID_SEVERITIES: DebtSeverity[] = ['critical', 'major', 'minor', 'cosmetic']
const VALID_CATEGORIES: DebtCategory[] = [
  'spacing', 'typography', 'color', 'layout',
  'interaction', 'accessibility', 'consistency', 'responsiveness',
]
const VALID_STATUSES: DebtStatus[] = ['open', 'in_progress', 'resolved', 'wont_fix']

function mapRow(row: any): DesignDebtItem {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    route: row.route,
    component: row.component ?? null,
    category: row.category as DebtCategory,
    severity: row.severity as DebtSeverity,
    description: row.description,
    screenshotPath: row.screenshot_path ?? null,
    assignedTo: row.assigned_to ?? null,
    status: row.status as DebtStatus,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? null,
  }
}

/**
 * Record a new design debt item for the current tenant.
 */
export async function recordDesignDebt(
  route: string,
  category: DebtCategory,
  severity: DebtSeverity,
  description: string,
  component?: string,
  screenshotPath?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!route || !description) {
    return { success: false, error: 'Route and description are required' }
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return { success: false, error: 'Invalid category' }
  }
  if (!VALID_SEVERITIES.includes(severity)) {
    return { success: false, error: 'Invalid severity' }
  }

  const { data, error } = await db
    .from(TABLE)
    .insert({
      tenant_id: user.tenantId!,
      route,
      component: component ?? null,
      category,
      severity,
      description,
      screenshot_path: screenshotPath ?? null,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, id: data?.id }
}

/**
 * Get filtered list of design debt items.
 */
export async function getDesignDebtItems(
  status?: DebtStatus,
  severity?: DebtSeverity,
  category?: DebtCategory,
  limit: number = 50
): Promise<DesignDebtItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', user.tenantId!)

  if (status && VALID_STATUSES.includes(status)) {
    query = query.eq('status', status)
  }
  if (severity && VALID_SEVERITIES.includes(severity)) {
    query = query.eq('severity', severity)
  }
  if (category && VALID_CATEGORIES.includes(category)) {
    query = query.eq('category', category)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return (data as any[]).map(mapRow)
}

/**
 * Update the status of a design debt item.
 */
export async function updateDebtStatus(
  itemId: string,
  status: DebtStatus
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!VALID_STATUSES.includes(status)) {
    return { success: false, error: 'Invalid status' }
  }

  const updatePayload: Record<string, unknown> = { status }
  if (status === 'resolved') {
    updatePayload.resolved_at = new Date().toISOString()
  }

  const { error } = await db
    .from(TABLE)
    .update(updatePayload)
    .eq('id', itemId)
    .eq('tenant_id', user.tenantId!)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

/**
 * Aggregate design debt statistics for the current tenant.
 */
export async function getDesignDebtSummary(): Promise<DesignDebtSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', user.tenantId!)

  const items: any[] = error || !data ? [] : data

  const bySeverity: Record<DebtSeverity, number> = { critical: 0, major: 0, minor: 0, cosmetic: 0 }
  const byCategory: Record<DebtCategory, number> = {
    spacing: 0, typography: 0, color: 0, layout: 0,
    interaction: 0, accessibility: 0, consistency: 0, responsiveness: 0,
  }
  const byStatus: Record<DebtStatus, number> = { open: 0, in_progress: 0, resolved: 0, wont_fix: 0 }
  const routeCounts: Record<string, number> = {}

  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  let resolvedThisWeek = 0
  let totalResolutionMs = 0
  let resolvedCount = 0

  for (const row of items) {
    if (row.severity in bySeverity) bySeverity[row.severity as DebtSeverity]++
    if (row.category in byCategory) byCategory[row.category as DebtCategory]++
    if (row.status in byStatus) byStatus[row.status as DebtStatus]++

    routeCounts[row.route] = (routeCounts[row.route] ?? 0) + 1

    if (row.status === 'resolved' && row.resolved_at) {
      const resolvedDate = new Date(row.resolved_at)
      if (resolvedDate >= oneWeekAgo) resolvedThisWeek++
      const createdDate = new Date(row.created_at)
      totalResolutionMs += resolvedDate.getTime() - createdDate.getTime()
      resolvedCount++
    }
  }

  const topRoutes = Object.entries(routeCounts)
    .map(([route, count]) => ({ route, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const avgResolutionDays = resolvedCount > 0
    ? Math.round((totalResolutionMs / resolvedCount / (1000 * 60 * 60 * 24)) * 10) / 10
    : null

  return {
    totalItems: items.length,
    bySeverity,
    byCategory,
    byStatus,
    topRoutes,
    resolvedThisWeek,
    avgResolutionDays,
  }
}

/**
 * Get all design debt items for a specific route.
 */
export async function getDebtByRoute(route: string): Promise<DesignDebtItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('route', route)
    .order('severity', { ascending: true })

  if (error || !data) return []
  return (data as any[]).map(mapRow)
}

/**
 * Get design debt trend: items created vs resolved per week.
 */
export async function getDesignDebtTrend(
  weeks: number = 8
): Promise<Array<{ week: string; created: number; resolved: number }>> {
  const user = await requireChef()
  const db: any = createServerClient()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - weeks * 7)

  const { data, error } = await db
    .from(TABLE)
    .select('created_at, resolved_at, status')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', cutoff.toISOString())

  const items: any[] = error || !data ? [] : data

  // Build weekly buckets
  const buckets: Record<string, { created: number; resolved: number }> = {}
  for (let i = 0; i < weeks; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i * 7)
    const key = getWeekKey(d)
    buckets[key] = { created: 0, resolved: 0 }
  }

  for (const row of items) {
    const createdKey = getWeekKey(new Date(row.created_at))
    if (buckets[createdKey]) buckets[createdKey].created++

    if (row.status === 'resolved' && row.resolved_at) {
      const resolvedKey = getWeekKey(new Date(row.resolved_at))
      if (buckets[resolvedKey]) buckets[resolvedKey].resolved++
    }
  }

  return Object.entries(buckets)
    .map(([week, counts]) => ({ week, ...counts }))
    .sort((a, b) => a.week.localeCompare(b.week))
}

/** ISO week key (YYYY-Www) */
function getWeekKey(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}
