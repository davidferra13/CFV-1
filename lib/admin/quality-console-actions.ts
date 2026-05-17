'use server'

import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/db/admin'
import type {
  TenantHealthScore,
  WorkflowHealth,
  QualityAlert,
  PlatformOverview,
} from './quality-console-types'

// --- Helpers ---

function computeStatus(score: number): TenantHealthScore['status'] {
  if (score >= 80) return 'thriving'
  if (score >= 60) return 'active'
  if (score >= 40) return 'stale'
  if (score >= 20) return 'at_risk'
  return 'dormant'
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 999
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function computeHealthScore(metrics: TenantHealthScore['metrics']): number {
  // Weighted scoring: profile 20, events 20, clients 15, login recency 20, response 10, menus 10, recipes 5
  let score = 0
  score += Math.min(metrics.profileCompleteness, 100) * 0.2
  score += Math.min(metrics.activeEvents * 10, 100) * 0.2
  score += Math.min(metrics.clientCount * 5, 100) * 0.15
  score += Math.max(0, 100 - metrics.lastLoginDaysAgo * 3) * 0.2
  score += metrics.responseRate * 0.1
  score += Math.min(metrics.menuCount * 10, 100) * 0.1
  score += Math.min(metrics.recipeCount * 5, 100) * 0.05
  return Math.round(Math.max(0, Math.min(100, score)))
}

function computeProfileCompleteness(chef: Record<string, unknown>): number {
  const fields = [
    'business_name',
    'email',
    'phone',
    'bio',
    'cuisine_types',
    'service_area',
    'profile_image_url',
    'hourly_rate_cents',
  ]
  const filled = fields.filter((f) => {
    const val = chef[f]
    return val !== null && val !== undefined && val !== ''
  }).length
  return Math.round((filled / fields.length) * 100)
}

// --- Actions ---

export async function getTenantHealthScores(
  sortBy?: string,
  limit?: number
): Promise<TenantHealthScore[]> {
  await requireAdmin()
  const db: any = createAdminClient()

  const { data: chefs } = await db
    .from('chefs')
    .select(
      'id, business_name, email, phone, bio, cuisine_types, service_area, profile_image_url, hourly_rate_cents, last_sign_in_at, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(limit ?? 500)

  if (!chefs?.length) return []

  const chefIds = chefs.map((c: any) => c.id)

  const [eventsRes, clientsRes, menusRes, recipesRes, inquiriesRes, inquiriesAnsweredRes] =
    await Promise.all([
      db.from('events').select('tenant_id, status').in('tenant_id', chefIds).limit(10000),
      db.from('clients').select('tenant_id').in('tenant_id', chefIds).limit(10000),
      db.from('menus').select('tenant_id').in('tenant_id', chefIds).limit(10000),
      db.from('recipes').select('tenant_id').in('tenant_id', chefIds).limit(10000),
      db.from('inquiries').select('tenant_id').in('tenant_id', chefIds).limit(10000),
      db
        .from('inquiries')
        .select('tenant_id')
        .in('tenant_id', chefIds)
        .not('status', 'eq', 'new')
        .limit(10000),
    ])

  const countByTenant = (rows: any[], field = 'tenant_id') => {
    const map: Record<string, number> = {}
    for (const r of rows ?? []) {
      if (r[field]) map[r[field]] = (map[r[field]] ?? 0) + 1
    }
    return map
  }

  const activeEventMap: Record<string, number> = {}
  for (const e of eventsRes.data ?? []) {
    if (e.tenant_id && e.status !== 'completed' && e.status !== 'cancelled') {
      activeEventMap[e.tenant_id] = (activeEventMap[e.tenant_id] ?? 0) + 1
    }
  }

  const clientMap = countByTenant(clientsRes.data ?? [])
  const menuMap = countByTenant(menusRes.data ?? [])
  const recipeMap = countByTenant(recipesRes.data ?? [])
  const inquiryMap = countByTenant(inquiriesRes.data ?? [])
  const answeredMap = countByTenant(inquiriesAnsweredRes.data ?? [])

  const results: TenantHealthScore[] = chefs.map((chef: any) => {
    const tid = chef.id
    const totalInq = inquiryMap[tid] ?? 0
    const answeredInq = answeredMap[tid] ?? 0
    const responseRate = totalInq > 0 ? Math.round((answeredInq / totalInq) * 100) : 0

    const metrics: TenantHealthScore['metrics'] = {
      profileCompleteness: computeProfileCompleteness(chef),
      activeEvents: activeEventMap[tid] ?? 0,
      clientCount: clientMap[tid] ?? 0,
      lastLoginDaysAgo: daysSince(chef.last_sign_in_at),
      responseRate,
      menuCount: menuMap[tid] ?? 0,
      recipeCount: recipeMap[tid] ?? 0,
    }

    const overallScore = computeHealthScore(metrics)

    return {
      tenantId: tid,
      chefName: chef.business_name ?? chef.email ?? 'Unknown',
      overallScore,
      metrics,
      status: computeStatus(overallScore),
    }
  })

  const sortField = sortBy ?? 'overallScore'
  results.sort((a, b) => {
    if (sortField === 'chefName') return a.chefName.localeCompare(b.chefName)
    if (sortField === 'status') return a.status.localeCompare(b.status)
    return (b as any)[sortField] - (a as any)[sortField]
  })

  return results
}

export async function getTenantDetail(tenantId: string): Promise<TenantHealthScore | null> {
  await requireAdmin()
  if (!tenantId) return null
  const db: any = createAdminClient()

  const { data: chef } = await db
    .from('chefs')
    .select(
      'id, business_name, email, phone, bio, cuisine_types, service_area, profile_image_url, hourly_rate_cents, last_sign_in_at'
    )
    .eq('id', tenantId)
    .single()

  if (!chef) return null

  const [eventsRes, clientsRes, menusRes, recipesRes, inquiriesRes, answeredRes] =
    await Promise.all([
      db.from('events').select('status').eq('tenant_id', tenantId).limit(5000),
      db.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      db.from('menus').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      db.from('recipes').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      db.from('inquiries').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      db
        .from('inquiries')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .not('status', 'eq', 'new'),
    ])

  const activeEvents = (eventsRes.data ?? []).filter(
    (e: any) => e.status !== 'completed' && e.status !== 'cancelled'
  ).length
  const totalInq = inquiriesRes.count ?? 0
  const answeredInq = answeredRes.count ?? 0

  const metrics: TenantHealthScore['metrics'] = {
    profileCompleteness: computeProfileCompleteness(chef),
    activeEvents,
    clientCount: clientsRes.count ?? 0,
    lastLoginDaysAgo: daysSince(chef.last_sign_in_at),
    responseRate: totalInq > 0 ? Math.round((answeredInq / totalInq) * 100) : 0,
    menuCount: menusRes.count ?? 0,
    recipeCount: recipesRes.count ?? 0,
  }

  const overallScore = computeHealthScore(metrics)

  return {
    tenantId: chef.id,
    chefName: chef.business_name ?? chef.email ?? 'Unknown',
    overallScore,
    metrics,
    status: computeStatus(overallScore),
  }
}

export async function getWorkflowHealth(): Promise<WorkflowHealth[]> {
  await requireAdmin()
  const db: any = createAdminClient()

  // Measure key workflow funnel: inquiry -> quote -> contract -> event -> closeout
  const [inquiries, quotes, contracts, events, completedEvents] = await Promise.all([
    db.from('inquiries').select('id, created_at', { count: 'exact' }).limit(1),
    db.from('quotes').select('id, created_at', { count: 'exact' }).limit(1),
    db.from('contracts').select('id, created_at', { count: 'exact' }).limit(1),
    db.from('events').select('id, created_at, status', { count: 'exact' }).limit(1),
    db.from('events').select('id, created_at, updated_at').eq('status', 'completed').limit(5000),
  ])

  const inquiryCount = inquiries.count ?? 0
  const quoteCount = quotes.count ?? 0
  const contractCount = contracts.count ?? 0
  const eventCount = events.count ?? 0
  const completedCount = (completedEvents.data ?? []).length

  // Compute avg duration for completed events (created_at to updated_at as proxy)
  let avgCompletionDays = 0
  const completed = completedEvents.data ?? []
  if (completed.length > 0) {
    const totalDays = completed.reduce((sum: number, e: any) => {
      const created = new Date(e.created_at).getTime()
      const updated = new Date(e.updated_at).getTime()
      return sum + (updated - created) / (1000 * 60 * 60 * 24)
    }, 0)
    avgCompletionDays = Math.round(totalDays / completed.length)
  }

  // Determine drop-off step
  const funnelSteps = [
    { name: 'inquiry', count: inquiryCount },
    { name: 'quote', count: quoteCount },
    { name: 'contract', count: contractCount },
    { name: 'event', count: eventCount },
    { name: 'closeout', count: completedCount },
  ]

  let biggestDropStep: string | null = null
  let biggestDropPct = 0
  for (let i = 1; i < funnelSteps.length; i++) {
    const prev = funnelSteps[i - 1].count
    const curr = funnelSteps[i].count
    if (prev > 0) {
      const dropPct = 1 - curr / prev
      if (dropPct > biggestDropPct) {
        biggestDropPct = dropPct
        biggestDropStep = funnelSteps[i].name
      }
    }
  }

  const workflows: WorkflowHealth[] = [
    {
      workflow: 'inquiry_to_quote',
      completionRate: inquiryCount > 0 ? Math.round((quoteCount / inquiryCount) * 100) : 0,
      avgDuration: 0,
      dropOffStep: quoteCount < inquiryCount ? 'quote' : null,
      totalStarted: inquiryCount,
      totalCompleted: quoteCount,
    },
    {
      workflow: 'quote_to_contract',
      completionRate: quoteCount > 0 ? Math.round((contractCount / quoteCount) * 100) : 0,
      avgDuration: 0,
      dropOffStep: contractCount < quoteCount ? 'contract' : null,
      totalStarted: quoteCount,
      totalCompleted: contractCount,
    },
    {
      workflow: 'contract_to_event',
      completionRate: contractCount > 0 ? Math.round((eventCount / contractCount) * 100) : 0,
      avgDuration: 0,
      dropOffStep: eventCount < contractCount ? 'event' : null,
      totalStarted: contractCount,
      totalCompleted: eventCount,
    },
    {
      workflow: 'event_to_closeout',
      completionRate: eventCount > 0 ? Math.round((completedCount / eventCount) * 100) : 0,
      avgDuration: avgCompletionDays,
      dropOffStep: completedCount < eventCount ? 'closeout' : null,
      totalStarted: eventCount,
      totalCompleted: completedCount,
    },
    {
      workflow: 'full_funnel',
      completionRate: inquiryCount > 0 ? Math.round((completedCount / inquiryCount) * 100) : 0,
      avgDuration: avgCompletionDays,
      dropOffStep: biggestDropStep,
      totalStarted: inquiryCount,
      totalCompleted: completedCount,
    },
  ]

  return workflows
}

export async function getQualityAlerts(resolved?: boolean): Promise<QualityAlert[]> {
  await requireAdmin()
  const db: any = createAdminClient()

  let query = db
    .from('quality_alerts')
    .select('id, tenant_id, alert_type, severity, message, resolved, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (resolved !== undefined) {
    query = query.eq('resolved', resolved)
  }

  const { data } = await query

  return (data ?? []).map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id ?? '',
    alertType: row.alert_type,
    severity: row.severity,
    message: row.message,
    resolved: row.resolved,
    createdAt: row.created_at,
  }))
}

export async function resolveAlert(alertId: string): Promise<{ success: boolean }> {
  await requireAdmin()
  if (!alertId) return { success: false }
  const db: any = createAdminClient()

  const { error } = await db
    .from('quality_alerts')
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq('id', alertId)

  if (error) throw new Error(`Failed to resolve alert: ${error.message}`)
  return { success: true }
}

export async function getPlatformOverview(): Promise<PlatformOverview> {
  await requireAdmin()
  const db: any = createAdminClient()

  const [chefsRes, eventsRes, alertsRes] = await Promise.all([
    db.from('chefs').select('id, last_sign_in_at', { count: 'exact' }).limit(10000),
    db.from('events').select('id', { count: 'exact', head: true }),
    db
      .from('quality_alerts')
      .select('id, tenant_id, alert_type, severity, message, resolved, created_at')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const totalTenants = chefsRes.count ?? 0
  const chefs = chefsRes.data ?? []

  // Active = logged in within 30 days
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  const activeTenants = chefs.filter(
    (c: any) => c.last_sign_in_at && new Date(c.last_sign_in_at).getTime() > thirtyDaysAgo
  ).length

  // Compute avg health from login recency (lightweight proxy without full scoring)
  let avgHealth = 0
  if (chefs.length > 0) {
    const totalScore = chefs.reduce((sum: number, c: any) => {
      const loginDays = daysSince(c.last_sign_in_at)
      return sum + Math.max(0, 100 - loginDays * 3)
    }, 0)
    avgHealth = Math.round(totalScore / chefs.length)
  }

  const alerts: QualityAlert[] = (alertsRes.data ?? []).map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id ?? '',
    alertType: row.alert_type,
    severity: row.severity,
    message: row.message,
    resolved: row.resolved,
    createdAt: row.created_at,
  }))

  return {
    totalTenants,
    activeTenants,
    totalEvents: eventsRes.count ?? 0,
    avgHealthScore: avgHealth,
    alerts,
  }
}
