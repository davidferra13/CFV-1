'use server'

// Mission Control Passive Dashboard - Server Actions
// Cross-tenant platform health queries for the admin surveillance dashboard.
// All functions require admin access and query across ALL tenants.

import { createAdminClient } from '@/lib/db/admin'
import { requireAdmin } from '@/lib/auth/admin'
import type {
  PlatformOverview,
  TenantHealth,
  SystemAlert,
  ActivityFeedItem,
  GrowthMetrics,
  GrowthPeriod,
  AlertSeverity,
} from './mission-control-types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startOfCurrentMonth(): string {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

// ---------------------------------------------------------------------------
// getMissionControlOverview
// ---------------------------------------------------------------------------

export async function getMissionControlOverview(): Promise<PlatformOverview> {
  await requireAdmin()
  const db: any = createAdminClient()
  const monthStart = startOfCurrentMonth()
  const thirtyDaysAgo = daysAgo(30)

  const [
    chefsAll,
    activeChefs,
    eventsAll,
    activeEvents,
    eventsMonth,
    ledgerAll,
    ledgerMonth,
    clientsAll,
    clientsMonth,
    recipesAll,
    menusAll,
    webhookTotal,
    webhookFailed,
    latestActivity,
  ] = await Promise.all([
    db.from('chefs').select('id', { count: 'exact', head: true }),
    db
      .from('chefs')
      .select('id', { count: 'exact', head: true })
      .neq('account_status', 'suspended'),
    db.from('events').select('id', { count: 'exact', head: true }),
    db
      .from('events')
      .select('id', { count: 'exact', head: true })
      .not('status', 'in', '("completed","cancelled")'),
    db.from('events').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
    db.from('ledger_entries').select('amount_cents').eq('entry_type', 'payment').limit(10000),
    db
      .from('ledger_entries')
      .select('amount_cents')
      .eq('entry_type', 'payment')
      .gte('created_at', monthStart)
      .limit(10000),
    db.from('clients').select('id', { count: 'exact', head: true }),
    db.from('clients').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
    db.from('recipes').select('id', { count: 'exact', head: true }),
    db.from('menus').select('id', { count: 'exact', head: true }),
    db
      .from('webhook_events')
      .select('id', { count: 'exact', head: true })
      .gte('received_at', thirtyDaysAgo),
    db
      .from('webhook_events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('received_at', thirtyDaysAgo),
    db.from('events').select('updated_at').order('updated_at', { ascending: false }).limit(1),
  ])

  const sumCents = (rows: any) =>
    (rows.data ?? []).reduce((s: number, e: any) => s + (e.amount_cents ?? 0), 0)

  const whTotal = webhookTotal.count ?? 0
  const whFailed = webhookFailed.count ?? 0

  return {
    totalTenants: chefsAll.count ?? 0,
    activeTenants: activeChefs.count ?? 0,
    totalEvents: eventsAll.count ?? 0,
    activeEvents: activeEvents.count ?? 0,
    eventsThisMonth: eventsMonth.count ?? 0,
    totalRevenueCents: sumCents(ledgerAll),
    revenueThisMonthCents: sumCents(ledgerMonth),
    totalClients: clientsAll.count ?? 0,
    clientsThisMonth: clientsMonth.count ?? 0,
    totalRecipes: recipesAll.count ?? 0,
    totalMenus: menusAll.count ?? 0,
    webhookFailureRate: whTotal > 0 ? whFailed / whTotal : 0,
    lastActivityAt: latestActivity.data?.[0]?.updated_at ?? null,
  }
}

// ---------------------------------------------------------------------------
// getTenantHealth
// ---------------------------------------------------------------------------

export async function getTenantHealth(): Promise<TenantHealth[]> {
  await requireAdmin()
  const db: any = createAdminClient()
  const thirtyDaysAgo = daysAgo(30)

  // Load all chefs
  const { data: chefs } = await db
    .from('chefs')
    .select('id, business_name, email, created_at, account_status, onboarding_completed_at')
    .order('created_at', { ascending: false })

  if (!chefs?.length) return []

  const chefIds = chefs.map((c: any) => c.id)

  // Fan out aggregation queries
  const [eventsRes, clientsRes, recipesRes, menusRes, ledgerRes, recentEventsRes] =
    await Promise.all([
      db.from('events').select('tenant_id').in('tenant_id', chefIds).limit(10000),
      db.from('clients').select('tenant_id').in('tenant_id', chefIds).limit(10000),
      db
        .from('recipes')
        .select('tenant_id')
        .in('tenant_id', chefIds)
        .eq('archived', false)
        .limit(10000),
      db.from('menus').select('tenant_id').in('tenant_id', chefIds).limit(10000),
      db
        .from('ledger_entries')
        .select('tenant_id, amount_cents')
        .eq('entry_type', 'payment')
        .in('tenant_id', chefIds)
        .limit(10000),
      db
        .from('events')
        .select('tenant_id, event_date')
        .in('tenant_id', chefIds)
        .gte('created_at', thirtyDaysAgo)
        .limit(5000),
    ])

  // Build count maps
  const countByTenant = (rows: any[], key = 'tenant_id') => {
    const map: Record<string, number> = {}
    for (const r of rows) {
      if (r[key]) map[r[key]] = (map[r[key]] ?? 0) + 1
    }
    return map
  }

  const eventCounts = countByTenant(eventsRes.data ?? [])
  const clientCounts = countByTenant(clientsRes.data ?? [])
  const recipeCounts = countByTenant(recipesRes.data ?? [])
  const menuCounts = countByTenant(menusRes.data ?? [])

  const revenueByChef: Record<string, number> = {}
  for (const l of (ledgerRes.data ?? []) as any[]) {
    if (l.tenant_id) {
      revenueByChef[l.tenant_id] = (revenueByChef[l.tenant_id] ?? 0) + (l.amount_cents ?? 0)
    }
  }

  // Last event date per tenant
  const lastEventMap: Record<string, string> = {}
  for (const e of (recentEventsRes.data ?? []) as any[]) {
    if (e.tenant_id && e.event_date) {
      if (!lastEventMap[e.tenant_id] || e.event_date > lastEventMap[e.tenant_id]) {
        lastEventMap[e.tenant_id] = e.event_date
      }
    }
  }

  const recentEventCounts = countByTenant(recentEventsRes.data ?? [])

  return chefs.map((chef: any) => {
    const events = eventCounts[chef.id] ?? 0
    const clients = clientCounts[chef.id] ?? 0
    const recipes = recipeCounts[chef.id] ?? 0
    const menus = menuCounts[chef.id] ?? 0
    const revenue = revenueByChef[chef.id] ?? 0
    const recentEvents = recentEventCounts[chef.id] ?? 0

    // Activity: based on recent event creation (30d)
    const activityScore = clampScore(recentEvents >= 5 ? 100 : recentEvents * 20)

    // Data quality: have they filled out recipes, menus, onboarding?
    const hasOnboarding = !!chef.onboarding_completed_at
    const dataQualityScore = clampScore(
      (hasOnboarding ? 25 : 0) +
        (recipes > 0 ? 25 : 0) +
        (menus > 0 ? 25 : 0) +
        (clients > 0 ? 25 : 0)
    )

    // Engagement: mix of total usage depth
    const engagementScore = clampScore(
      Math.min(events, 10) * 4 + Math.min(clients, 10) * 3 + Math.min(recipes, 20) * 1.5
    )

    const overallHealthScore = clampScore(
      activityScore * 0.4 + dataQualityScore * 0.3 + engagementScore * 0.3
    )

    return {
      id: chef.id,
      businessName: chef.business_name,
      email: chef.email,
      createdAt: chef.created_at,
      accountStatus: chef.account_status ?? null,
      eventCount: events,
      clientCount: clients,
      recipeCount: recipes,
      menuCount: menus,
      revenueCents: revenue,
      lastEventDate: lastEventMap[chef.id] ?? null,
      activityScore,
      dataQualityScore,
      engagementScore,
      overallHealthScore,
    }
  })
}

// ---------------------------------------------------------------------------
// getSystemAlerts
// ---------------------------------------------------------------------------

export async function getSystemAlerts(): Promise<SystemAlert[]> {
  await requireAdmin()
  const db: any = createAdminClient()
  const alerts: SystemAlert[] = []
  const now = new Date()

  // 1. Failed webhooks in the last 24h
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const { count: failedWebhooks } = await db
    .from('webhook_events')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'failed')
    .gte('received_at', twentyFourHoursAgo)

  if ((failedWebhooks ?? 0) > 0) {
    const severity: AlertSeverity = (failedWebhooks ?? 0) > 10 ? 'critical' : 'warning'
    alerts.push({
      id: 'webhook-failures-24h',
      severity,
      title: `${failedWebhooks} failed webhook(s) in the last 24h`,
      detail: 'Check the webhook events log for details on failed deliveries.',
      source: 'webhook_events',
      detectedAt: now.toISOString(),
    })
  }

  // 2. Zombie events (not completed/cancelled but untouched for 30+ days)
  const thirtyDaysAgo = daysAgo(30)
  const { count: zombieEvents } = await db
    .from('events')
    .select('id', { count: 'exact', head: true })
    .not('status', 'in', '("completed","cancelled")')
    .lt('updated_at', thirtyDaysAgo)

  if ((zombieEvents ?? 0) > 0) {
    alerts.push({
      id: 'zombie-events',
      severity: 'warning',
      title: `${zombieEvents} stale event(s) (30+ days without updates)`,
      detail:
        'Events that are neither completed nor cancelled but have not been touched in over 30 days.',
      source: 'events',
      detectedAt: now.toISOString(),
    })
  }

  // 3. Orphaned clients (no tenant)
  const { count: orphanedClients } = await db
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .is('tenant_id', null)

  if ((orphanedClients ?? 0) > 0) {
    alerts.push({
      id: 'orphaned-clients',
      severity: 'info',
      title: `${orphanedClients} client(s) with no assigned tenant`,
      detail: 'Clients without a tenant_id cannot be associated with any chef.',
      source: 'clients',
      detectedAt: now.toISOString(),
    })
  }

  // 4. Unread messages older than 7 days
  const sevenDaysAgo = daysAgo(7)
  const { data: oldUnread } = await db
    .from('chat_messages')
    .select('created_at')
    .is('read_at', null)
    .lt('created_at', sevenDaysAgo)
    .order('created_at', { ascending: true })
    .limit(1)

  if (oldUnread?.length) {
    const oldestDate = oldUnread[0].created_at
    const daysOld = Math.floor(
      (now.getTime() - new Date(oldestDate).getTime()) / (1000 * 60 * 60 * 24)
    )
    alerts.push({
      id: 'old-unread-messages',
      severity: daysOld > 14 ? 'warning' : 'info',
      title: `Unread message(s) from ${daysOld} day(s) ago`,
      detail: `The oldest unread message was sent on ${new Date(oldestDate).toLocaleDateString()}.`,
      source: 'chat_messages',
      detectedAt: now.toISOString(),
    })
  }

  // 5. QoL failures in the last 7 days
  const { data: qolFailures } = await db
    .from('qol_metric_events')
    .select('metric_key')
    .eq('metric_key', 'save_failed')
    .gte('created_at', sevenDaysAgo)

  const failCount = qolFailures?.length ?? 0
  if (failCount > 0) {
    alerts.push({
      id: 'qol-save-failures',
      severity: failCount > 20 ? 'critical' : 'warning',
      title: `${failCount} save failure(s) in the last 7 days`,
      detail: 'Users experienced save failures. Check qol_metric_events for details.',
      source: 'qol_metric_events',
      detectedAt: now.toISOString(),
    })
  }

  // 6. Suspended accounts
  const { count: suspendedChefs } = await db
    .from('chefs')
    .select('id', { count: 'exact', head: true })
    .eq('account_status', 'suspended')

  if ((suspendedChefs ?? 0) > 0) {
    alerts.push({
      id: 'suspended-accounts',
      severity: 'info',
      title: `${suspendedChefs} suspended chef account(s)`,
      detail: 'These accounts are not able to operate on the platform.',
      source: 'chefs',
      detectedAt: now.toISOString(),
    })
  }

  // Sort: critical first, then warning, then info
  const severityOrder: Record<AlertSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  }
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return alerts
}

// ---------------------------------------------------------------------------
// getActivityFeed
// ---------------------------------------------------------------------------

export async function getActivityFeed(limit = 30): Promise<ActivityFeedItem[]> {
  await requireAdmin()
  const db: any = createAdminClient()
  const safeLimit = Math.min(Math.max(limit, 1), 100)

  // Load chef name map
  const { data: chefs } = await db.from('chefs').select('id, display_name, business_name')

  const chefMap = new Map<string, string>()
  for (const c of (chefs ?? []) as any[]) {
    chefMap.set(c.id, c.display_name || c.business_name || 'Unknown')
  }

  // Query multiple sources in parallel, limited per source
  const perSource = Math.ceil(safeLimit / 4)

  const [eventsData, inquiriesData, clientsData, recipesData] = await Promise.all([
    db
      .from('events')
      .select('id, tenant_id, occasion, status, created_at')
      .order('created_at', { ascending: false })
      .limit(perSource),
    db
      .from('inquiries')
      .select('id, tenant_id, channel, status, confirmed_occasion, created_at')
      .order('created_at', { ascending: false })
      .limit(perSource),
    db
      .from('clients')
      .select('id, tenant_id, full_name, created_at')
      .order('created_at', { ascending: false })
      .limit(perSource),
    db
      .from('recipes')
      .select('id, tenant_id, name, created_at')
      .eq('archived', false)
      .order('created_at', { ascending: false })
      .limit(perSource),
  ])

  const items: ActivityFeedItem[] = []

  for (const row of (eventsData.data ?? []) as any[]) {
    items.push({
      id: `event:${row.id}`,
      timestamp: row.created_at,
      source: 'event',
      summary: `Event created: ${row.occasion || 'untitled'} (${row.status})`,
      tenantId: row.tenant_id,
      tenantName: chefMap.get(row.tenant_id) ?? null,
    })
  }

  for (const row of (inquiriesData.data ?? []) as any[]) {
    items.push({
      id: `inquiry:${row.id}`,
      timestamp: row.created_at,
      source: 'inquiry',
      summary: `Inquiry received: ${row.confirmed_occasion || row.channel || 'general'}`,
      tenantId: row.tenant_id,
      tenantName: chefMap.get(row.tenant_id) ?? null,
    })
  }

  for (const row of (clientsData.data ?? []) as any[]) {
    items.push({
      id: `client:${row.id}`,
      timestamp: row.created_at,
      source: 'client',
      summary: `New client: ${row.full_name || 'unnamed'}`,
      tenantId: row.tenant_id,
      tenantName: chefMap.get(row.tenant_id) ?? null,
    })
  }

  for (const row of (recipesData.data ?? []) as any[]) {
    items.push({
      id: `recipe:${row.id}`,
      timestamp: row.created_at,
      source: 'recipe',
      summary: `Recipe created: ${row.name || 'untitled'}`,
      tenantId: row.tenant_id,
      tenantName: chefMap.get(row.tenant_id) ?? null,
    })
  }

  // Sort newest first, slice to limit
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return items.slice(0, safeLimit)
}

// ---------------------------------------------------------------------------
// getGrowthMetrics
// ---------------------------------------------------------------------------

export async function getGrowthMetrics(period: GrowthPeriod = '30d'): Promise<GrowthMetrics> {
  await requireAdmin()
  const db: any = createAdminClient()

  const daysMap: Record<GrowthPeriod, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
  }
  const days = daysMap[period] ?? 30
  const periodStart = daysAgo(days)
  const priorPeriodStart = daysAgo(days * 2)

  // Current period queries
  const [
    newChefs,
    newClients,
    newEvents,
    currentRevenue,
    // Prior period for deltas
    priorChefs,
    priorClients,
    priorEvents,
    priorRevenue,
    // Retention: active tenants (had event in current period)
    activeTenants,
    // Churn: tenants who had events in prior period but not current
    priorActiveTenants,
  ] = await Promise.all([
    db.from('chefs').select('id', { count: 'exact', head: true }).gte('created_at', periodStart),
    db.from('clients').select('id', { count: 'exact', head: true }).gte('created_at', periodStart),
    db.from('events').select('id', { count: 'exact', head: true }).gte('created_at', periodStart),
    db
      .from('ledger_entries')
      .select('amount_cents')
      .eq('entry_type', 'payment')
      .gte('created_at', periodStart)
      .limit(10000),
    // Prior period
    db
      .from('chefs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', priorPeriodStart)
      .lt('created_at', periodStart),
    db
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', priorPeriodStart)
      .lt('created_at', periodStart),
    db
      .from('events')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', priorPeriodStart)
      .lt('created_at', periodStart),
    db
      .from('ledger_entries')
      .select('amount_cents')
      .eq('entry_type', 'payment')
      .gte('created_at', priorPeriodStart)
      .lt('created_at', periodStart)
      .limit(10000),
    // Active tenants current period (distinct tenant_ids with events)
    db.from('events').select('tenant_id').gte('created_at', periodStart).limit(10000),
    // Active tenants prior period
    db
      .from('events')
      .select('tenant_id')
      .gte('created_at', priorPeriodStart)
      .lt('created_at', periodStart)
      .limit(10000),
  ])

  const sumCents = (rows: any) =>
    (rows.data ?? []).reduce((s: number, e: any) => s + (e.amount_cents ?? 0), 0)

  const currentRevCents = sumCents(currentRevenue)
  const priorRevCents = sumCents(priorRevenue)

  const currentSignups = newChefs.count ?? 0
  const priorSignups = priorChefs.count ?? 0
  const currentClientsCount = newClients.count ?? 0
  const priorClientsCount = priorClients.count ?? 0
  const currentEventsCount = newEvents.count ?? 0
  const priorEventsCount = priorEvents.count ?? 0

  // Distinct active tenants
  const currentActiveTenantIds = new Set(
    ((activeTenants.data ?? []) as any[]).map((e: any) => e.tenant_id).filter(Boolean)
  )
  const priorActiveTenantIds = new Set(
    ((priorActiveTenants.data ?? []) as any[]).map((e: any) => e.tenant_id).filter(Boolean)
  )

  // Churned = was active in prior period, not active in current
  let churned = 0
  Array.from(priorActiveTenantIds).forEach((tid) => {
    if (!currentActiveTenantIds.has(tid)) churned++
  })

  const priorActiveCount = priorActiveTenantIds.size
  const retentionRate =
    priorActiveCount > 0 ? ((priorActiveCount - churned) / priorActiveCount) * 100 : null

  // Compute deltas (percentage change, null if prior was 0)
  const delta = (current: number, prior: number) =>
    prior > 0 ? ((current - prior) / prior) * 100 : null

  return {
    period,
    newSignups: currentSignups,
    newClients: currentClientsCount,
    newEvents: currentEventsCount,
    revenueCents: currentRevCents,
    signupDelta: delta(currentSignups, priorSignups),
    clientDelta: delta(currentClientsCount, priorClientsCount),
    eventDelta: delta(currentEventsCount, priorEventsCount),
    revenueDelta: delta(currentRevCents, priorRevCents),
    activeTenantCount: currentActiveTenantIds.size,
    churned,
    retentionRate: retentionRate !== null ? Math.round(retentionRate * 10) / 10 : null,
  }
}
