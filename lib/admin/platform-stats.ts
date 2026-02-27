'use server'

// Cross-tenant platform analytics — uses service role key to bypass RLS
// All functions query across ALL chef tenants (admin-only)

import { createAdminClient } from '@/lib/supabase/admin'

export type PlatformOverviewStats = {
  totalChefs: number
  totalClients: number
  totalEvents: number
  totalGMV: number
  chefsThisMonth: number
  clientsThisMonth: number
  eventsThisMonth: number
  gmvThisMonth: number
  avgEventsPerChef: number
  avgGMVPerChef: number
}

export type PlatformChefRow = {
  id: string
  business_name: string | null
  email: string | null
  created_at: string
  eventCount: number
  clientCount: number
  gmvCents: number
}

export type PlatformClientRow = {
  id: string
  name: string | null
  email: string | null
  tenant_id: string | null
  chefBusinessName: string | null
  created_at: string
  eventCount: number
  ltvCents: number
}

export type PlatformEventRow = {
  id: string
  occasion: string | null
  status: string
  event_date: string | null
  guest_count: number | null
  quoted_price_cents: number | null
  created_at: string
  chefId: string
  chefBusinessName: string | null
}

export type GrowthDataPoint = {
  month: string
  newChefs: number
  newClients: number
}

export type RevenueDataPoint = {
  month: string
  gmvCents: number
}

export type SystemHealthStats = {
  tableRowCounts: Record<string, number>
  oldestUnreadMessage: string | null
  zombieEventCount: number
  orphanedClientCount: number
}

export type QolMetricsSummary = {
  since: string
  draftRestoreCount: number
  saveFailureCount: number
  conflictCount: number
  offlineReplaySuccessCount: number
  offlineReplayFailureCount: number
  offlineReplaySuccessRate: number
  duplicateCreatePreventedCount: number
}

function startOfCurrentMonth(): string {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export async function getPlatformOverviewStats(): Promise<PlatformOverviewStats> {
  const supabase = createAdminClient()
  const monthStart = startOfCurrentMonth()

  // Fetch counts (head:true = no rows returned, just count) and ledger sums
  // Ledger queries use .limit(10000) as a safety cap for admin stats
  const [
    chefsAll,
    clientsAll,
    eventsAll,
    ledgerAll,
    chefsMonth,
    clientsMonth,
    eventsMonth,
    ledgerMonth,
  ] = await Promise.all([
    supabase.from('chefs').select('id', { count: 'exact', head: true }),
    supabase.from('clients').select('id', { count: 'exact', head: true }),
    supabase.from('events').select('id', { count: 'exact', head: true }),
    supabase.from('ledger_entries').select('amount_cents').eq('entry_type', 'payment').limit(10000),
    supabase
      .from('chefs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', monthStart),
    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', monthStart),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', monthStart),
    supabase
      .from('ledger_entries')
      .select('amount_cents')
      .eq('entry_type', 'payment')
      .gte('created_at', monthStart)
      .limit(10000),
  ])

  const totalGMV = (ledgerAll.data ?? []).reduce((s, e) => s + (e.amount_cents ?? 0), 0)
  const gmvThisMonth = (ledgerMonth.data ?? []).reduce((s, e) => s + (e.amount_cents ?? 0), 0)
  const totalChefs = chefsAll.count ?? 0
  const totalEvents = eventsAll.count ?? 0

  return {
    totalChefs,
    totalClients: clientsAll.count ?? 0,
    totalEvents,
    totalGMV,
    chefsThisMonth: chefsMonth.count ?? 0,
    clientsThisMonth: clientsMonth.count ?? 0,
    eventsThisMonth: eventsMonth.count ?? 0,
    gmvThisMonth,
    avgEventsPerChef: totalChefs > 0 ? Math.round(totalEvents / totalChefs) : 0,
    avgGMVPerChef: totalChefs > 0 ? Math.round(totalGMV / totalChefs) : 0,
  }
}

export async function getPlatformChefList(): Promise<PlatformChefRow[]> {
  const supabase = createAdminClient()

  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, business_name, email, created_at')
    .order('created_at', { ascending: false })

  if (!chefs?.length) return []

  const chefIds = chefs.map((c) => c.id)

  const [eventsRes, clientsRes, ledgerRes] = await Promise.all([
    supabase.from('events').select('tenant_id').in('tenant_id', chefIds).limit(5000),
    supabase.from('clients').select('tenant_id').in('tenant_id', chefIds).limit(5000),
    supabase
      .from('ledger_entries')
      .select('tenant_id, amount_cents')
      .eq('entry_type', 'payment')
      .in('tenant_id', chefIds)
      .limit(10000),
  ])

  const eventCountMap: Record<string, number> = {}
  ;(eventsRes.data ?? []).forEach((e) => {
    if (e.tenant_id) eventCountMap[e.tenant_id] = (eventCountMap[e.tenant_id] ?? 0) + 1
  })

  const clientCountMap: Record<string, number> = {}
  ;(clientsRes.data ?? []).forEach((c) => {
    if (c.tenant_id) clientCountMap[c.tenant_id] = (clientCountMap[c.tenant_id] ?? 0) + 1
  })

  const gmvMap: Record<string, number> = {}
  ;(ledgerRes.data ?? []).forEach((l) => {
    if (l.tenant_id) gmvMap[l.tenant_id] = (gmvMap[l.tenant_id] ?? 0) + (l.amount_cents ?? 0)
  })

  return chefs.map((chef) => ({
    id: chef.id,
    business_name: chef.business_name,
    email: chef.email,
    created_at: chef.created_at,
    eventCount: eventCountMap[chef.id] ?? 0,
    clientCount: clientCountMap[chef.id] ?? 0,
    gmvCents: gmvMap[chef.id] ?? 0,
  }))
}

export async function getPlatformClientList(): Promise<PlatformClientRow[]> {
  const supabase = createAdminClient()

  const { data: rawClients } = await supabase
    .from('clients')
    .select('id, full_name, email, tenant_id, created_at')
    .order('created_at', { ascending: false })

  const clients = rawClients as any[] | null

  if (!clients?.length) return []

  const tenantIds = [...new Set(clients.map((c) => c.tenant_id).filter(Boolean))] as string[]
  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, business_name')
    .in('id', tenantIds)

  const chefMap = Object.fromEntries((chefs ?? []).map((c) => [c.id, c.business_name]))

  const clientIds = clients.map((c) => c.id)

  // Single events query — used for both count and event-to-client mapping
  const { data: allClientEvents } = await supabase
    .from('events')
    .select('id, client_id')
    .in('client_id', clientIds)
    .limit(5000)

  const eventCountMap: Record<string, number> = {}
  const eventToClient: Record<string, string> = {}
  const eventIds: string[] = []
  ;(allClientEvents ?? []).forEach((e) => {
    if (e.client_id) {
      eventCountMap[e.client_id] = (eventCountMap[e.client_id] ?? 0) + 1
      eventToClient[e.id] = e.client_id
      eventIds.push(e.id)
    }
  })

  // Scope ledger query to only these clients' events (not all ledger entries)
  const { data: ledger } =
    eventIds.length > 0
      ? await supabase
          .from('ledger_entries')
          .select('event_id, amount_cents')
          .eq('entry_type', 'payment')
          .in('event_id', eventIds)
          .limit(10000)
      : { data: [] as { event_id: string | null; amount_cents: number | null }[] }

  const ltvMap: Record<string, number> = {}
  ;(ledger ?? []).forEach((l) => {
    const clientId = l.event_id ? eventToClient[l.event_id] : null
    if (clientId) ltvMap[clientId] = (ltvMap[clientId] ?? 0) + (l.amount_cents ?? 0)
  })

  return clients.map((client) => ({
    id: client.id,
    name: client.full_name,
    email: client.email,
    tenant_id: client.tenant_id,
    chefBusinessName: client.tenant_id ? (chefMap[client.tenant_id] ?? null) : null,
    created_at: client.created_at,
    eventCount: eventCountMap[client.id] ?? 0,
    ltvCents: ltvMap[client.id] ?? 0,
  }))
}

export async function getAllPlatformEvents(): Promise<PlatformEventRow[]> {
  const supabase = createAdminClient()

  const { data: events } = await supabase
    .from('events')
    .select(
      'id, occasion, status, event_date, guest_count, quoted_price_cents, created_at, tenant_id'
    )
    .order('created_at', { ascending: false })
    .limit(500)

  if (!events?.length) return []

  const tenantIds = [...new Set(events.map((e) => e.tenant_id).filter(Boolean))] as string[]
  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, business_name')
    .in('id', tenantIds)

  const chefMap = Object.fromEntries((chefs ?? []).map((c) => [c.id, c.business_name]))

  return events.map((e) => ({
    id: e.id,
    occasion: e.occasion,
    status: e.status,
    event_date: e.event_date,
    guest_count: e.guest_count,
    quoted_price_cents: e.quoted_price_cents,
    created_at: e.created_at,
    chefId: e.tenant_id ?? '',
    chefBusinessName: e.tenant_id ? (chefMap[e.tenant_id] ?? null) : null,
  }))
}

export async function getPlatformGrowthStats(): Promise<GrowthDataPoint[]> {
  const supabase = createAdminClient()

  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

  const [chefsData, clientsData] = await Promise.all([
    supabase
      .from('chefs')
      .select('created_at')
      .gte('created_at', twelveMonthsAgo.toISOString())
      .limit(10000),
    supabase
      .from('clients')
      .select('created_at')
      .gte('created_at', twelveMonthsAgo.toISOString())
      .limit(50000),
  ])

  const monthMap: Record<string, { newChefs: number; newClients: number }> = {}
  const getMonth = (iso: string) => iso.slice(0, 7)

  ;(chefsData.data ?? []).forEach((c) => {
    const m = getMonth(c.created_at)
    if (!monthMap[m]) monthMap[m] = { newChefs: 0, newClients: 0 }
    monthMap[m].newChefs++
  })
  ;(clientsData.data ?? []).forEach((c) => {
    const m = getMonth(c.created_at)
    if (!monthMap[m]) monthMap[m] = { newChefs: 0, newClients: 0 }
    monthMap[m].newClients++
  })

  return Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }))
}

export async function getPlatformRevenueByMonth(): Promise<RevenueDataPoint[]> {
  const supabase = createAdminClient()

  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

  const { data: ledger } = await supabase
    .from('ledger_entries')
    .select('amount_cents, created_at')
    .eq('entry_type', 'payment')
    .gte('created_at', twelveMonthsAgo.toISOString())
    .limit(10000)

  const monthMap: Record<string, number> = {}
  ;(ledger ?? []).forEach((l) => {
    const m = l.created_at.slice(0, 7)
    monthMap[m] = (monthMap[m] ?? 0) + (l.amount_cents ?? 0)
  })

  return Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, gmvCents]) => ({ month, gmvCents }))
}

export async function getPlatformFinancialOverview() {
  const supabase = createAdminClient()
  const monthStart = startOfCurrentMonth()

  const [allPayments, monthPayments, allExpenses, monthExpenses] = await Promise.all([
    supabase.from('ledger_entries').select('amount_cents').eq('entry_type', 'payment').limit(10000),
    supabase
      .from('ledger_entries')
      .select('amount_cents')
      .eq('entry_type', 'payment')
      .gte('created_at', monthStart)
      .limit(10000),
    supabase
      .from('ledger_entries')
      .select('amount_cents')
      .eq('entry_type', 'expense' as never)
      .limit(10000),
    supabase
      .from('ledger_entries')
      .select('amount_cents')
      .eq('entry_type', 'expense' as never)
      .gte('created_at', monthStart)
      .limit(10000),
  ])

  const sum = (rows: { amount_cents: number | null }[] | null) =>
    (rows ?? []).reduce((s, r) => s + (r.amount_cents ?? 0), 0)

  return {
    totalGMV: sum(allPayments.data),
    gmvThisMonth: sum(monthPayments.data),
    totalExpenses: sum(allExpenses.data),
    expensesThisMonth: sum(monthExpenses.data),
  }
}

export async function getPlatformLedgerEntries(limit = 100) {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('ledger_entries')
    .select('id, tenant_id, event_id, entry_type, amount_cents, description, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  return data ?? []
}

export async function getSystemHealthStats(): Promise<SystemHealthStats> {
  const supabase = createAdminClient()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [
    chefCount,
    clientCount,
    eventCount,
    ledgerCount,
    msgCount,
    inquiryCount,
    zombieEvents,
    orphanedClients,
  ] = await Promise.all([
    supabase.from('chefs').select('id', { count: 'exact', head: true }),
    supabase.from('clients').select('id', { count: 'exact', head: true }),
    supabase.from('events').select('id', { count: 'exact', head: true }),
    supabase.from('ledger_entries').select('id', { count: 'exact', head: true }),
    supabase.from('chat_messages').select('id', { count: 'exact', head: true }),
    supabase.from('inquiries').select('id', { count: 'exact', head: true }),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .not('status', 'in', '("completed","cancelled")')
      .lt('updated_at', thirtyDaysAgo.toISOString()),
    supabase.from('clients').select('id', { count: 'exact', head: true }).is('tenant_id', null),
  ])

  const { data: oldestMsg } = await supabase
    .from('chat_messages')
    .select('created_at')
    .is('read_at', null)
    .order('created_at', { ascending: true })
    .limit(1)

  return {
    tableRowCounts: {
      chefs: chefCount.count ?? 0,
      clients: clientCount.count ?? 0,
      events: eventCount.count ?? 0,
      ledger_entries: ledgerCount.count ?? 0,
      chat_messages: msgCount.count ?? 0,
      inquiries: inquiryCount.count ?? 0,
    },
    oldestUnreadMessage: oldestMsg?.[0]?.created_at ?? null,
    zombieEventCount: zombieEvents.count ?? 0,
    orphanedClientCount: orphanedClients.count ?? 0,
  }
}

export async function getQolMetricsSummary(days = 30): Promise<QolMetricsSummary> {
  const supabase = createAdminClient()
  const sinceDate = new Date()
  sinceDate.setDate(sinceDate.getDate() - Math.max(1, days))
  const since = sinceDate.toISOString()

  const { data } = await (supabase
    .from('qol_metric_events' as any)
    .select('metric_key')
    .gte('created_at', since) as any)

  const counts: Record<string, number> = {}
  for (const row of (data ?? []) as Array<{ metric_key?: string }>) {
    if (!row.metric_key) continue
    counts[row.metric_key] = (counts[row.metric_key] ?? 0) + 1
  }

  const offlineSuccess = counts.offline_replay_succeeded ?? 0
  const offlineFailure = counts.offline_replay_failed ?? 0
  const offlineTotal = offlineSuccess + offlineFailure

  return {
    since,
    draftRestoreCount: counts.draft_restored ?? 0,
    saveFailureCount: counts.save_failed ?? 0,
    conflictCount: counts.conflict_detected ?? 0,
    offlineReplaySuccessCount: offlineSuccess,
    offlineReplayFailureCount: offlineFailure,
    offlineReplaySuccessRate: offlineTotal > 0 ? offlineSuccess / offlineTotal : 0,
    duplicateCreatePreventedCount: counts.duplicate_create_prevented ?? 0,
  }
}

export async function getPlatformAuditLog(limit = 100): Promise<Record<string, unknown>[]> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('admin_audit_log')
    .select('*')
    .order('ts', { ascending: false })
    .limit(limit)

  return (data ?? []) as Record<string, unknown>[]
}

export async function getChefFeatureFlags(chefId: string): Promise<Record<string, boolean>> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('chef_feature_flags')
    .select('flag_name, enabled')
    .eq('chef_id', chefId)

  return Object.fromEntries((data ?? []).map((f) => [f.flag_name, f.enabled]))
}

export async function getAllChefFlags(): Promise<{
  chefs: { id: string; business_name: string | null }[]
  flagsByChef: Record<string, Record<string, boolean>>
}> {
  const supabase = createAdminClient()

  const [chefsResult, flagsResult] = await Promise.all([
    supabase.from('chefs').select('id, business_name').order('business_name').limit(10000),
    supabase.from('chef_feature_flags').select('chef_id, flag_name, enabled').limit(50000),
  ])

  const flagsByChef: Record<string, Record<string, boolean>> = {}
  const flags = flagsResult.data ?? []
  flags.forEach((f) => {
    if (!flagsByChef[f.chef_id]) flagsByChef[f.chef_id] = {}
    flagsByChef[f.chef_id][f.flag_name] = f.enabled
  })

  return {
    chefs: chefsResult.data ?? [],
    flagsByChef,
  }
}
