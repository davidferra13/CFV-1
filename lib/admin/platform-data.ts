'use server'

// Cross-tenant admin data queries for the Admin Super View.
// Uses service role key to bypass RLS. All functions require admin auth.

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/admin'

// ─── Recipes ─────────────────────────────────────────────

export type AdminRecipeRow = {
  id: string
  name: string
  category: string | null
  cuisine_type: string | null
  servings: number | null
  prep_time_minutes: number | null
  cook_time_minutes: number | null
  created_at: string
  tenant_id: string
  chefBusinessName: string | null
}

export async function getAdminRecipes(): Promise<AdminRecipeRow[]> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: recipes } = await supabase
    .from('recipes')
    .select(
      'id, name, category, cuisine_type, servings, prep_time_minutes, cook_time_minutes, created_at, tenant_id'
    )
    .order('created_at', { ascending: false })
    .limit(500)

  if (!recipes || recipes.length === 0) return []

  // Get chef names for all unique tenant_ids
  const tenantIds = [...new Set(recipes.map((r) => r.tenant_id))]
  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, business_name')
    .in('id', tenantIds)

  const chefMap = new Map((chefs ?? []).map((c) => [c.id, c.business_name]))

  return recipes.map((r) => ({
    ...r,
    chefBusinessName: chefMap.get(r.tenant_id) ?? null,
  }))
}

// ─── Menus ───────────────────────────────────────────────

export type AdminMenuRow = {
  id: string
  name: string | null
  description: string | null
  created_at: string
  tenant_id: string
  chefBusinessName: string | null
}

export async function getAdminMenus(): Promise<AdminMenuRow[]> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: menus } = await supabase
    .from('menus')
    .select('id, name, description, created_at, tenant_id')
    .order('created_at', { ascending: false })
    .limit(500)

  if (!menus || menus.length === 0) return []

  const tenantIds = [...new Set(menus.map((m) => m.tenant_id))]
  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, business_name')
    .in('id', tenantIds)

  const chefMap = new Map((chefs ?? []).map((c) => [c.id, c.business_name]))

  return menus.map((m) => ({
    ...m,
    chefBusinessName: chefMap.get(m.tenant_id) ?? null,
  }))
}

// ─── Quotes ──────────────────────────────────────────────

export type AdminQuoteRow = {
  id: string
  status: string | null
  total_cents: number | null
  created_at: string
  event_id: string | null
  tenant_id: string
  chefBusinessName: string | null
  eventOccasion: string | null
}

export async function getAdminQuotes(): Promise<AdminQuoteRow[]> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, status, total_cents, created_at, event_id, tenant_id')
    .order('created_at', { ascending: false })
    .limit(500)

  if (!quotes || quotes.length === 0) return []

  const tenantIds = [...new Set(quotes.map((q) => q.tenant_id))]
  const eventIds = quotes.map((q) => q.event_id).filter(Boolean) as string[]

  const [chefsResult, eventsResult] = await Promise.all([
    supabase.from('chefs').select('id, business_name').in('id', tenantIds),
    eventIds.length > 0
      ? supabase.from('events').select('id, occasion').in('id', eventIds)
      : { data: [] },
  ])

  const chefMap = new Map((chefsResult.data ?? []).map((c) => [c.id, c.business_name]))
  const eventMap = new Map((eventsResult.data ?? []).map((e) => [e.id, e.occasion]))

  return quotes.map((q) => ({
    ...q,
    chefBusinessName: chefMap.get(q.tenant_id) ?? null,
    eventOccasion: q.event_id ? (eventMap.get(q.event_id) ?? null) : null,
  }))
}

// ─── Inquiries ───────────────────────────────────────────

export type AdminInquiryRow = {
  id: string
  client_name: string | null
  client_email: string | null
  occasion: string | null
  status: string | null
  event_date: string | null
  guest_count: number | null
  created_at: string
  tenant_id: string
  chefBusinessName: string | null
  leadScore: number | null
}

export async function getAdminInquiries(): Promise<AdminInquiryRow[]> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: inquiries } = await supabase
    .from('inquiries')
    .select(
      'id, client_name, client_email, occasion, status, event_date, guest_count, created_at, tenant_id, chef_likelihood, unknown_fields'
    )
    .order('created_at', { ascending: false })
    .limit(500)

  if (!inquiries || inquiries.length === 0) return []

  const tenantIds = [...new Set(inquiries.map((i) => i.tenant_id))]
  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, business_name')
    .in('id', tenantIds)

  const chefMap = new Map((chefs ?? []).map((c) => [c.id, c.business_name]))

  return inquiries.map((i) => {
    // Lead score: prefer chef_likelihood, fall back to GOLDMINE score in unknown_fields
    let leadScore: number | null = (i as any).chef_likelihood ?? null
    if (leadScore === null && i.unknown_fields) {
      const uf = typeof i.unknown_fields === 'object' ? (i.unknown_fields as any) : {}
      leadScore = uf.goldmine_score ?? uf.lead_score ?? null
    }
    return {
      id: i.id,
      client_name: i.client_name,
      client_email: i.client_email,
      occasion: i.occasion,
      status: i.status,
      event_date: i.event_date,
      guest_count: i.guest_count,
      created_at: i.created_at,
      tenant_id: i.tenant_id,
      chefBusinessName: chefMap.get(i.tenant_id) ?? null,
      leadScore,
    }
  })
}

// ─── Staff ───────────────────────────────────────────────

export type AdminStaffRow = {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
  status: string | null
  created_at: string
  chef_id: string
  chefBusinessName: string | null
}

export async function getAdminStaff(): Promise<AdminStaffRow[]> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: staff } = await supabase
    .from('staff_members')
    .select('id, full_name, email, role, status, created_at, chef_id')
    .order('created_at', { ascending: false })
    .limit(500)

  if (!staff || staff.length === 0) return []

  const chefIds = [...new Set(staff.map((s) => s.chef_id))]
  const { data: chefs } = await supabase.from('chefs').select('id, business_name').in('id', chefIds)

  const chefMap = new Map((chefs ?? []).map((c) => [c.id, c.business_name]))

  return staff.map((s) => ({
    ...s,
    chefBusinessName: chefMap.get(s.chef_id) ?? null,
  }))
}

// ─── Documents ───────────────────────────────────────────

export type AdminDocumentRow = {
  id: string
  title: string | null
  doc_type: string | null
  created_at: string
  tenant_id: string
  chefBusinessName: string | null
}

export async function getAdminDocuments(): Promise<AdminDocumentRow[]> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: docs } = await supabase
    .from('chef_documents')
    .select('id, title, doc_type, created_at, tenant_id')
    .order('created_at', { ascending: false })
    .limit(500)

  if (!docs || docs.length === 0) return []

  const tenantIds = [...new Set(docs.map((d) => d.tenant_id))]
  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, business_name')
    .in('id', tenantIds)

  const chefMap = new Map((chefs ?? []).map((c) => [c.id, c.business_name]))

  return docs.map((d) => ({
    ...d,
    chefBusinessName: chefMap.get(d.tenant_id) ?? null,
  }))
}

// ─── Equipment ───────────────────────────────────────────

export type AdminEquipmentRow = {
  id: string
  name: string
  category: string
  status: string
  purchase_price_cents: number | null
  current_value_cents: number | null
  created_at: string
  chef_id: string
  chefBusinessName: string | null
}

export async function getAdminEquipment(): Promise<AdminEquipmentRow[]> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: items } = await supabase
    .from('equipment_items')
    .select(
      'id, name, category, status, purchase_price_cents, current_value_cents, created_at, chef_id'
    )
    .order('created_at', { ascending: false })
    .limit(500)

  if (!items || items.length === 0) return []

  const chefIds = [...new Set(items.map((i) => i.chef_id))]
  const { data: chefs } = await supabase.from('chefs').select('id, business_name').in('id', chefIds)
  const chefMap = new Map((chefs ?? []).map((c) => [c.id, c.business_name]))

  return items.map((i) => ({
    ...i,
    chefBusinessName: chefMap.get(i.chef_id) ?? null,
  }))
}

// ─── Allergens / Dietary ─────────────────────────────────

export type AdminAllergenRow = {
  clientName: string | null
  clientEmail: string | null
  dietaryRestrictions: string | null
  allergies: string | null
  tenant_id: string
  chefBusinessName: string | null
}

export async function getAdminAllergens(): Promise<AdminAllergenRow[]> {
  await requireAdmin()
  const supabase = createAdminClient()

  // Clients with dietary data
  const { data: clients } = await supabase
    .from('clients')
    .select('full_name, email, dietary_restrictions, allergies, tenant_id')
    .or('dietary_restrictions.neq.,allergies.neq.')
    .order('full_name', { ascending: true })
    .limit(500)

  if (!clients || clients.length === 0) return []

  const tenantIds = [...new Set(clients.map((c) => c.tenant_id))]
  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, business_name')
    .in('id', tenantIds)
  const chefMap = new Map((chefs ?? []).map((c) => [c.id, c.business_name]))

  return clients
    .filter((c) => c.dietary_restrictions || c.allergies)
    .map((c) => ({
      clientName: c.full_name,
      clientEmail: c.email,
      dietaryRestrictions: c.dietary_restrictions,
      allergies: c.allergies,
      tenant_id: c.tenant_id,
      chefBusinessName: chefMap.get(c.tenant_id) ?? null,
    }))
}

// ─── Loyalty ─────────────────────────────────────────────

export type AdminLoyaltyRow = {
  chefId: string
  chefBusinessName: string | null
  totalClients: number
  totalPointsIssued: number
  totalRedemptions: number
}

export async function getAdminLoyalty(): Promise<AdminLoyaltyRow[]> {
  await requireAdmin()
  const supabase = createAdminClient()

  // Get all loyalty transactions grouped by tenant
  const { data: transactions } = await supabase
    .from('loyalty_transactions')
    .select('tenant_id, points, transaction_type')

  if (!transactions || transactions.length === 0) return []

  // Aggregate by tenant
  const byTenant = new Map<string, { issued: number; redeemed: number; clients: Set<string> }>()
  for (const tx of transactions) {
    if (!byTenant.has(tx.tenant_id)) {
      byTenant.set(tx.tenant_id, { issued: 0, redeemed: 0, clients: new Set() })
    }
    const agg = byTenant.get(tx.tenant_id)!
    if (tx.transaction_type === 'earn') agg.issued += tx.points
    if (tx.transaction_type === 'redeem') agg.redeemed += Math.abs(tx.points)
  }

  const tenantIds = [...byTenant.keys()]
  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, business_name')
    .in('id', tenantIds)
  const chefMap = new Map((chefs ?? []).map((c) => [c.id, c.business_name]))

  return tenantIds.map((tid) => {
    const agg = byTenant.get(tid)!
    return {
      chefId: tid,
      chefBusinessName: chefMap.get(tid) ?? null,
      totalClients: agg.clients.size,
      totalPointsIssued: agg.issued,
      totalRedemptions: agg.redeemed,
    }
  })
}

// ─── Calendar (cross-tenant events) ─────────────────────

export type AdminCalendarEvent = {
  id: string
  occasion: string | null
  status: string
  event_date: string | null
  guest_count: number | null
  tenant_id: string
  chefBusinessName: string | null
}

export async function getAdminCalendarEvents(): Promise<AdminCalendarEvent[]> {
  await requireAdmin()
  const supabase = createAdminClient()

  // Get upcoming + recent events (last 30 days to next 90 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const ninetyDaysOut = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)

  const { data: events } = await supabase
    .from('events')
    .select('id, occasion, status, event_date, guest_count, tenant_id')
    .gte('event_date', thirtyDaysAgo)
    .lte('event_date', ninetyDaysOut)
    .order('event_date', { ascending: true })
    .limit(500)

  if (!events || events.length === 0) return []

  const tenantIds = [...new Set(events.map((e) => e.tenant_id))]
  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, business_name')
    .in('id', tenantIds)
  const chefMap = new Map((chefs ?? []).map((c) => [c.id, c.business_name]))

  return events.map((e) => ({
    ...e,
    chefBusinessName: chefMap.get(e.tenant_id) ?? null,
  }))
}

// ─── Gmail Sync Health ───────────────────────────────────

export type AdminGmailSyncRow = {
  chefId: string
  chefBusinessName: string | null
  chefEmail: string | null
  totalSynced: number
  lastSyncedAt: string | null
  errorCount: number
}

export async function getAdminGmailSync(): Promise<AdminGmailSyncRow[]> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: logs } = await supabase
    .from('gmail_sync_log')
    .select('tenant_id, synced_at, error')
    .order('synced_at', { ascending: false })

  if (!logs || logs.length === 0) return []

  const byTenant = new Map<string, { total: number; errors: number; lastSync: string | null }>()
  for (const log of logs) {
    if (!byTenant.has(log.tenant_id)) {
      byTenant.set(log.tenant_id, { total: 0, errors: 0, lastSync: log.synced_at })
    }
    const agg = byTenant.get(log.tenant_id)!
    agg.total++
    if (log.error) agg.errors++
  }

  const tenantIds = [...byTenant.keys()]
  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, business_name, email')
    .in('id', tenantIds)
  const chefMap = new Map(
    (chefs ?? []).map((c) => [c.id, { name: c.business_name, email: c.email }])
  )

  return tenantIds.map((tid) => {
    const agg = byTenant.get(tid)!
    const chef = chefMap.get(tid)
    return {
      chefId: tid,
      chefBusinessName: chef?.name ?? null,
      chefEmail: chef?.email ?? null,
      totalSynced: agg.total,
      lastSyncedAt: agg.lastSync,
      errorCount: agg.errors,
    }
  })
}

// ─── Remy Activity ───────────────────────────────────────

export type AdminRemyActivityRow = {
  chefId: string
  chefBusinessName: string | null
  totalActions: number
  successCount: number
  errorCount: number
  lastActionAt: string | null
  topTaskTypes: string[]
}

export async function getAdminRemyActivity(): Promise<AdminRemyActivityRow[]> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: logs } = await supabase
    .from('remy_action_audit_log')
    .select('tenant_id, task_type, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5000)

  if (!logs || logs.length === 0) return []

  const byTenant = new Map<
    string,
    {
      total: number
      success: number
      errors: number
      lastAt: string | null
      taskTypes: Map<string, number>
    }
  >()
  for (const log of logs) {
    if (!byTenant.has(log.tenant_id)) {
      byTenant.set(log.tenant_id, {
        total: 0,
        success: 0,
        errors: 0,
        lastAt: log.created_at,
        taskTypes: new Map(),
      })
    }
    const agg = byTenant.get(log.tenant_id)!
    agg.total++
    if (log.status === 'success') agg.success++
    if (log.status === 'error') agg.errors++
    agg.taskTypes.set(log.task_type, (agg.taskTypes.get(log.task_type) ?? 0) + 1)
  }

  const tenantIds = [...byTenant.keys()]
  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, business_name')
    .in('id', tenantIds)
  const chefMap = new Map((chefs ?? []).map((c) => [c.id, c.business_name]))

  return tenantIds.map((tid) => {
    const agg = byTenant.get(tid)!
    const topTypes = [...agg.taskTypes.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t]) => t)
    return {
      chefId: tid,
      chefBusinessName: chefMap.get(tid) ?? null,
      totalActions: agg.total,
      successCount: agg.success,
      errorCount: agg.errors,
      lastActionAt: agg.lastAt,
      topTaskTypes: topTypes,
    }
  })
}

// ─── Activity Feed ───────────────────────────────────────

export type AdminActivityRow = {
  id: string
  event_type: string
  description: string | null
  created_at: string
  user_id: string | null
  tenant_id: string | null
  chefBusinessName: string | null
}

export async function getAdminActivityFeed(): Promise<AdminActivityRow[]> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: events } = await supabase
    .from('activity_events')
    .select('id, event_type, description, created_at, user_id, tenant_id')
    .order('created_at', { ascending: false })
    .limit(200)

  if (!events || events.length === 0) return []

  const tenantIds = [...new Set(events.map((e) => e.tenant_id).filter(Boolean))] as string[]
  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, business_name')
    .in('id', tenantIds)
  const chefMap = new Map((chefs ?? []).map((c) => [c.id, c.business_name]))

  return events.map((e) => ({
    ...e,
    chefBusinessName: e.tenant_id ? (chefMap.get(e.tenant_id) ?? null) : null,
  }))
}

// ─── Prospects ───────────────────────────────────────────

export type AdminProspectRow = {
  id: string
  business_name: string | null
  contact_name: string | null
  stage: string | null
  score: number | null
  created_at: string
  chef_id: string
  chefBusinessName: string | null
}

export async function getAdminProspects(): Promise<AdminProspectRow[]> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: prospects } = await supabase
    .from('prospects')
    .select('id, business_name, contact_name, stage, score, created_at, chef_id')
    .order('created_at', { ascending: false })
    .limit(500)

  if (!prospects || prospects.length === 0) return []

  const chefIds = [...new Set(prospects.map((p) => p.chef_id))]
  const { data: chefs } = await supabase.from('chefs').select('id, business_name').in('id', chefIds)
  const chefMap = new Map((chefs ?? []).map((c) => [c.id, c.business_name]))

  return prospects.map((p) => ({
    ...p,
    chefBusinessName: chefMap.get(p.chef_id) ?? null,
  }))
}

// ─── Notifications Audit ─────────────────────────────────

export type AdminNotificationRow = {
  id: string
  category: string | null
  action: string | null
  title: string | null
  body: string | null
  read_at: string | null
  archived_at: string | null
  created_at: string
  tenant_id: string
  chefBusinessName: string | null
}

export async function getAdminNotifications(): Promise<AdminNotificationRow[]> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: notifs } = await supabase
    .from('notifications')
    .select('id, category, action, title, body, read_at, archived_at, created_at, tenant_id')
    .order('created_at', { ascending: false })
    .limit(500)

  if (!notifs || notifs.length === 0) return []

  const tenantIds = [...new Set(notifs.map((n) => n.tenant_id))]
  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, business_name')
    .in('id', tenantIds)
  const chefMap = new Map((chefs ?? []).map((c) => [c.id, c.business_name]))

  return notifs.map((n) => ({
    ...n,
    chefBusinessName: chefMap.get(n.tenant_id) ?? null,
  }))
}

export type AdminDeliveryLogRow = {
  id: string
  channel: string
  status: string
  error_message: string | null
  sent_at: string
  tenant_id: string
  chefBusinessName: string | null
}

export async function getAdminDeliveryLog(): Promise<AdminDeliveryLogRow[]> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: logs } = await supabase
    .from('notification_delivery_log')
    .select('id, channel, status, error_message, sent_at, tenant_id')
    .order('sent_at', { ascending: false })
    .limit(500)

  if (!logs || logs.length === 0) return []

  const tenantIds = [...new Set(logs.map((l) => l.tenant_id))]
  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, business_name')
    .in('id', tenantIds)
  const chefMap = new Map((chefs ?? []).map((c) => [c.id, c.business_name]))

  return logs.map((l) => ({
    ...l,
    chefBusinessName: chefMap.get(l.tenant_id) ?? null,
  }))
}
