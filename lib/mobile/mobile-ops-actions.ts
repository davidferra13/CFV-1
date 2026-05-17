'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  MobileDashboard,
  MobileEventCard,
  MobileAction,
  MobilePreferences,
  MobileQuickAccess,
  MobileQuickAccessItem,
  MobileView,
} from './mobile-ops-types'

// ---------------------------------------------------------------------------
// 1. getMobileDashboard
// ---------------------------------------------------------------------------

export async function getMobileDashboard(): Promise<MobileDashboard> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.id

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  // Today's events
  const todayEvents = await getTodayEvents(db, tenantId, todayStart, todayEnd)

  // Urgent actions
  const urgentActions = await getUrgentActionsForTenant(db, tenantId)

  // Quick stats
  const quickStats = await getQuickStats(db, tenantId, todayStart, todayEnd)

  // Notification count (unread inquiries + pending confirmations)
  const notifResult = await db
    .from('inquiries')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'new')
  const notifications = notifResult?.data?.length ?? 0

  return {
    todayEvents,
    urgentActions,
    quickStats,
    notifications,
  }
}

// ---------------------------------------------------------------------------
// 2. getMobileEventList
// ---------------------------------------------------------------------------

export async function getMobileEventList(
  view: 'today' | 'week' | 'upcoming'
): Promise<MobileEventCard[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.id

  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  let startDate: string
  let endDate: string | null = null

  if (view === 'today') {
    startDate = todayStart.toISOString()
    const todayEnd = new Date(now)
    todayEnd.setHours(23, 59, 59, 999)
    endDate = todayEnd.toISOString()
  } else if (view === 'week') {
    startDate = todayStart.toISOString()
    const weekEnd = new Date(todayStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    endDate = weekEnd.toISOString()
  } else {
    startDate = todayStart.toISOString()
  }

  let query = db
    .from('events')
    .select('id, title, guest_count, event_date, location, status, tenant_id, client_id')
    .eq('tenant_id', tenantId)
    .gte('event_date', startDate)
    .order('event_date', { ascending: true })
    .limit(50)

  if (endDate) {
    query = query.lte('event_date', endDate)
  }

  const { data: events } = await query

  if (!events || events.length === 0) return []

  const clientIds = Array.from(
    new Set((events as any[]).map((e: any) => e.client_id).filter(Boolean))
  )
  let clientMap: Record<string, string> = {}
  if (clientIds.length > 0) {
    const { data: clients } = await db.from('clients').select('id, name').in('id', clientIds)
    if (clients) {
      clientMap = Object.fromEntries((clients as any[]).map((c: any) => [c.id, c.name]))
    }
  }

  return (events as any[]).map((e: any) => ({
    eventId: e.id,
    title: e.title || 'Untitled Event',
    clientName: clientMap[e.client_id] || 'Unknown Client',
    guestCount: e.guest_count ?? 0,
    startTime: e.event_date,
    location: e.location ?? null,
    status: e.status ?? 'draft',
    menuName: null,
  }))
}

// ---------------------------------------------------------------------------
// 3. getMobileUrgentActions
// ---------------------------------------------------------------------------

export async function getMobileUrgentActions(): Promise<MobileAction[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  return getUrgentActionsForTenant(db, user.id)
}

// ---------------------------------------------------------------------------
// 4. getMobilePreferences
// ---------------------------------------------------------------------------

export async function getMobilePreferences(): Promise<MobilePreferences> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.id

  const { data } = await db
    .from('mobile_preferences')
    .select('*')
    .eq('tenant_id', tenantId)
    .limit(1)
    .maybeSingle()

  if (data) {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      defaultView: data.default_view as MobileView,
      quickActions: Array.isArray(data.quick_actions)
        ? data.quick_actions
        : ['respond', 'confirm', 'prep'],
      showRevenue: data.show_revenue ?? true,
      compactMode: data.compact_mode ?? false,
    }
  }

  // Return defaults (no row yet)
  return {
    id: '',
    tenantId,
    defaultView: 'today',
    quickActions: ['respond', 'confirm', 'prep'],
    showRevenue: true,
    compactMode: false,
  }
}

// ---------------------------------------------------------------------------
// 5. updateMobilePreferences
// ---------------------------------------------------------------------------

export async function updateMobilePreferences(
  updates: Partial<MobilePreferences>
): Promise<MobilePreferences> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.id

  // Check existing
  const { data: existing } = await db
    .from('mobile_preferences')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1)
    .maybeSingle()

  const payload: Record<string, unknown> = {}
  if (updates.defaultView !== undefined) payload.default_view = updates.defaultView
  if (updates.quickActions !== undefined) payload.quick_actions = updates.quickActions
  if (updates.showRevenue !== undefined) payload.show_revenue = updates.showRevenue
  if (updates.compactMode !== undefined) payload.compact_mode = updates.compactMode
  payload.updated_at = new Date().toISOString()

  if (existing) {
    const { data } = await db
      .from('mobile_preferences')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single()

    return mapPrefsRow(data)
  }

  // Insert
  const { data } = await db
    .from('mobile_preferences')
    .insert({ tenant_id: tenantId, ...payload })
    .select('*')
    .single()

  return mapPrefsRow(data)
}

// ---------------------------------------------------------------------------
// 6. getMobileQuickAccess
// ---------------------------------------------------------------------------

export async function getMobileQuickAccess(): Promise<MobileQuickAccess> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.id

  // Recent events (last 5 updated)
  const { data: events } = await db
    .from('events')
    .select('id, title, event_date, status, updated_at')
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false })
    .limit(5)

  const recentEvents: MobileQuickAccessItem[] = ((events as any[]) ?? []).map((e: any) => ({
    id: e.id,
    type: 'event' as const,
    label: e.title || 'Untitled Event',
    subtitle: e.event_date ? new Date(e.event_date).toLocaleDateString() : null,
    updatedAt: e.updated_at ?? e.event_date ?? '',
  }))

  // Recent clients (last 5 updated)
  const { data: clients } = await db
    .from('clients')
    .select('id, name, email, updated_at')
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false })
    .limit(5)

  const recentClients: MobileQuickAccessItem[] = ((clients as any[]) ?? []).map((c: any) => ({
    id: c.id,
    type: 'client' as const,
    label: c.name || c.email || 'Unknown',
    subtitle: c.email ?? null,
    updatedAt: c.updated_at ?? '',
  }))

  // Recent menus (last 5 updated)
  const { data: menus } = await db
    .from('menus')
    .select('id, name, status, updated_at')
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false })
    .limit(5)

  const recentMenus: MobileQuickAccessItem[] = ((menus as any[]) ?? []).map((m: any) => ({
    id: m.id,
    type: 'menu' as const,
    label: m.name || 'Untitled Menu',
    subtitle: m.status ?? null,
    updatedAt: m.updated_at ?? '',
  }))

  return { recentEvents, recentClients, recentMenus }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function getTodayEvents(
  db: any,
  tenantId: string,
  todayStart: Date,
  todayEnd: Date
): Promise<MobileEventCard[]> {
  const { data: events } = await db
    .from('events')
    .select('id, title, guest_count, event_date, location, status, client_id')
    .eq('tenant_id', tenantId)
    .gte('event_date', todayStart.toISOString())
    .lte('event_date', todayEnd.toISOString())
    .order('event_date', { ascending: true })

  if (!events || events.length === 0) return []

  const clientIds = Array.from(
    new Set((events as any[]).map((e: any) => e.client_id).filter(Boolean))
  )
  let clientMap: Record<string, string> = {}
  if (clientIds.length > 0) {
    const { data: clients } = await db.from('clients').select('id, name').in('id', clientIds)
    if (clients) {
      clientMap = Object.fromEntries((clients as any[]).map((c: any) => [c.id, c.name]))
    }
  }

  return (events as any[]).map((e: any) => ({
    eventId: e.id,
    title: e.title || 'Untitled Event',
    clientName: clientMap[e.client_id] || 'Unknown Client',
    guestCount: e.guest_count ?? 0,
    startTime: e.event_date,
    location: e.location ?? null,
    status: e.status ?? 'draft',
    menuName: null,
  }))
}

async function getUrgentActionsForTenant(db: any, tenantId: string): Promise<MobileAction[]> {
  const actions: MobileAction[] = []
  const now = new Date()

  // Unanswered inquiries (immediate urgency)
  const { data: inquiries } = await db
    .from('inquiries')
    .select('id, created_at, client_name')
    .eq('tenant_id', tenantId)
    .eq('status', 'new')
    .order('created_at', { ascending: true })
    .limit(10)

  if (inquiries) {
    for (const inq of inquiries as any[]) {
      actions.push({
        id: `inq-${inq.id}`,
        type: 'respond',
        label: `Respond to ${inq.client_name || 'inquiry'}`,
        entityType: 'inquiry',
        entityId: inq.id,
        urgency: 'immediate',
        createdAt: inq.created_at,
      })
    }
  }

  // Events needing confirmation (today urgency)
  const { data: pendingEvents } = await db
    .from('events')
    .select('id, title, event_date')
    .eq('tenant_id', tenantId)
    .eq('status', 'pending')
    .order('event_date', { ascending: true })
    .limit(10)

  if (pendingEvents) {
    for (const evt of pendingEvents as any[]) {
      const eventDate = new Date(evt.event_date)
      const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      actions.push({
        id: `evt-${evt.id}`,
        type: 'confirm',
        label: `Confirm: ${evt.title || 'event'}`,
        entityType: 'event',
        entityId: evt.id,
        urgency: daysUntil <= 1 ? 'immediate' : daysUntil <= 7 ? 'today' : 'this_week',
        createdAt: evt.event_date,
      })
    }
  }

  // Overdue invoices (payment urgency)
  const { data: overdueInvoices } = await db
    .from('invoices')
    .select('id, invoice_number, due_date, client_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'sent')
    .lt('due_date', now.toISOString())
    .order('due_date', { ascending: true })
    .limit(10)

  if (overdueInvoices) {
    for (const inv of overdueInvoices as any[]) {
      actions.push({
        id: `inv-${inv.id}`,
        type: 'payment',
        label: `Overdue: Invoice #${inv.invoice_number || inv.id.slice(0, 8)}`,
        entityType: 'invoice',
        entityId: inv.id,
        urgency: 'immediate',
        createdAt: inv.due_date,
      })
    }
  }

  // Sort: immediate first, then today, then this_week
  const urgencyOrder = { immediate: 0, today: 1, this_week: 2 }
  actions.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])

  return actions
}

async function getQuickStats(
  db: any,
  tenantId: string,
  todayStart: Date,
  todayEnd: Date
): Promise<{ label: string; value: string | number; trend?: 'up' | 'down' | 'flat' }[]> {
  const stats: { label: string; value: string | number; trend?: 'up' | 'down' | 'flat' }[] = []

  // Today's event count
  const { data: todayEvts } = await db
    .from('events')
    .select('id')
    .eq('tenant_id', tenantId)
    .gte('event_date', todayStart.toISOString())
    .lte('event_date', todayEnd.toISOString())
  stats.push({ label: "Today's Events", value: todayEvts?.length ?? 0 })

  // This week's event count
  const weekEnd = new Date(todayStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  const { data: weekEvts } = await db
    .from('events')
    .select('id')
    .eq('tenant_id', tenantId)
    .gte('event_date', todayStart.toISOString())
    .lte('event_date', weekEnd.toISOString())
  stats.push({ label: 'This Week', value: weekEvts?.length ?? 0 })

  // Active clients
  const { data: activeClients } = await db
    .from('clients')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
  stats.push({ label: 'Active Clients', value: activeClients?.length ?? 0 })

  // Pending inquiries
  const { data: pendingInq } = await db
    .from('inquiries')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'new')
  stats.push({ label: 'Pending Inquiries', value: pendingInq?.length ?? 0 })

  return stats
}

function mapPrefsRow(row: any): MobilePreferences {
  return {
    id: row?.id ?? '',
    tenantId: row?.tenant_id ?? '',
    defaultView: (row?.default_view as MobileView) ?? 'today',
    quickActions: Array.isArray(row?.quick_actions)
      ? row.quick_actions
      : ['respond', 'confirm', 'prep'],
    showRevenue: row?.show_revenue ?? true,
    compactMode: row?.compact_mode ?? false,
  }
}
