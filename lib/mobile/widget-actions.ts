'use server'

// Widget Actions - Server-side data endpoints for home screen widgets.
// Auth-gated, tenant-scoped. Powers Android/PWA widget surfaces.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  WidgetType,
  WidgetConfig,
  TodayScheduleWidget,
  QuickStatsWidget,
  UpcomingEventsWidget,
  PrepCountdownWidget,
} from './widget-types'

// ── Get Widget Configs ───────────────────────────────────────────────

export async function getWidgetConfigs(): Promise<WidgetConfig[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('widget_configs')
    .select('id, tenant_id, widget_type, position, settings, enabled, created_at')
    .eq('tenant_id', user.tenantId!)
    .order('position', { ascending: true })

  if (error) throw new Error('Failed to load widget configs')

  return (data ?? []).map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    widgetType: r.widget_type,
    position: r.position,
    settings: r.settings ?? {},
    enabled: r.enabled,
    createdAt: r.created_at,
  }))
}

// ── Upsert Widget Config ─────────────────────────────────────────────

export async function updateWidgetConfig(
  widgetType: WidgetType,
  settings: Record<string, unknown>,
  enabled?: boolean
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: existing } = await db
    .from('widget_configs')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('widget_type', widgetType)
    .maybeSingle()

  if (existing) {
    const updatePayload: Record<string, unknown> = { settings }
    if (enabled !== undefined) updatePayload.enabled = enabled
    const { error } = await db
      .from('widget_configs')
      .update(updatePayload)
      .eq('id', existing.id)
      .eq('tenant_id', user.tenantId!)
    if (error) throw new Error('Failed to update widget config')
  } else {
    const { error } = await db
      .from('widget_configs')
      .insert({
        tenant_id: user.tenantId!,
        widget_type: widgetType,
        position: 0,
        settings,
        enabled: enabled ?? true,
      })
    if (error) throw new Error('Failed to create widget config')
  }
}

// ── Today's Schedule ─────────────────────────────────────────────────

export async function getTodayScheduleData(): Promise<TodayScheduleWidget> {
  const user = await requireChef()
  const db: any = createServerClient()

  const today = new Date().toISOString().slice(0, 10)

  // Fetch today's events
  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date, serve_time, guest_count, status')
    .eq('tenant_id', user.tenantId!)
    .eq('event_date', today)
    .order('serve_time', { ascending: true })

  // Fetch incomplete prep tasks (chef_todos, sorted by sort_order)
  const { data: todos } = await db
    .from('chef_todos')
    .select('text, completed, sort_order')
    .eq('chef_id', user.tenantId!)
    .eq('completed', false)
    .order('sort_order', { ascending: true })
    .limit(20)

  return {
    date: today,
    events: (events ?? []).map((e: any) => ({
      id: e.id,
      title: e.occasion ?? 'Untitled Event',
      time: e.serve_time ?? '',
      guests: e.guest_count ?? 0,
      status: e.status ?? 'draft',
    })),
    prepTasks: (todos ?? []).map((t: any) => ({
      title: t.text,
      estimatedMinutes: 0,
      completed: t.completed ?? false,
    })),
  }
}

// ── Quick Stats ──────────────────────────────────────────────────────

export async function getQuickStatsData(): Promise<QuickStatsWidget> {
  const user = await requireChef()
  const db: any = createServerClient()

  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  // Week bounds (Monday to Sunday)
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() + mondayOffset)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const weekStartStr = weekStart.toISOString().slice(0, 10)
  const weekEndStr = weekEnd.toISOString().slice(0, 10)

  // Month bounds
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const monthEnd = new Date(nextMonth.getTime() - 86400000).toISOString().slice(0, 10)

  // Events this week
  const { count: eventsThisWeek } = await db
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', weekStartStr)
    .lte('event_date', weekEndStr)

  // Events this month
  const { count: eventsThisMonth } = await db
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', monthStart)
    .lte('event_date', monthEnd)

  // Pending inquiries
  const { count: pendingInquiries } = await db
    .from('inquiries')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'new')

  // Outstanding invoices (unpaid)
  const { count: outstandingInvoices } = await db
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'sent')

  // Revenue this month (paid invoices)
  const { data: revenueRows } = await db
    .from('invoices')
    .select('total_cents')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'paid')
    .gte('paid_at', monthStart)
    .lte('paid_at', monthEnd + 'T23:59:59Z')

  const revenueThisMonth = (revenueRows ?? []).reduce(
    (sum: number, r: any) => sum + (r.total_cents ?? 0),
    0
  )

  return {
    eventsThisWeek: eventsThisWeek ?? 0,
    eventsThisMonth: eventsThisMonth ?? 0,
    pendingInquiries: pendingInquiries ?? 0,
    outstandingInvoices: outstandingInvoices ?? 0,
    revenueThisMonth,
  }
}

// ── Upcoming Events ──────────────────────────────────────────────────

export async function getUpcomingEventsData(limit?: number): Promise<UpcomingEventsWidget> {
  const user = await requireChef()
  const db: any = createServerClient()

  const today = new Date().toISOString().slice(0, 10)
  const cap = limit ?? 10

  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date, guest_count, client_id')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .limit(cap)

  // Batch-fetch client names
  const clientIds = [...new Set((events ?? []).map((e: any) => e.client_id).filter(Boolean))]
  let clientMap: Record<string, string> = {}
  if (clientIds.length > 0) {
    const { data: clients } = await db
      .from('clients')
      .select('id, full_name')
      .in('id', clientIds)
    for (const c of clients ?? []) {
      clientMap[c.id] = c.full_name ?? 'Unknown'
    }
  }

  const now = new Date()
  return {
    events: (events ?? []).map((e: any) => {
      const eventDate = new Date(e.event_date)
      const diffMs = eventDate.getTime() - now.getTime()
      const daysUntil = Math.max(0, Math.ceil(diffMs / 86400000))
      return {
        id: e.id,
        title: e.occasion ?? 'Untitled Event',
        date: e.event_date,
        clientName: e.client_id ? (clientMap[e.client_id] ?? 'Unknown') : 'No client',
        guests: e.guest_count ?? 0,
        daysUntil,
      }
    }),
  }
}

// ── Prep Countdown ───────────────────────────────────────────────────

export async function getPrepCountdownData(): Promise<PrepCountdownWidget> {
  const user = await requireChef()
  const db: any = createServerClient()

  const today = new Date().toISOString().slice(0, 10)
  const now = new Date()

  // Next upcoming event
  const { data: nextEvents } = await db
    .from('events')
    .select('id, occasion, event_date, serve_time')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .limit(1)

  let nextEvent: PrepCountdownWidget['nextEvent'] = null
  let eventId: string | null = null

  if (nextEvents && nextEvents.length > 0) {
    const ne = nextEvents[0]
    eventId = ne.id
    const eventDateTime = new Date(`${ne.event_date}T${ne.serve_time || '12:00:00'}`)
    const hoursUntil = Math.max(0, Math.round((eventDateTime.getTime() - now.getTime()) / 3600000))
    nextEvent = {
      title: ne.occasion ?? 'Untitled Event',
      date: ne.event_date,
      hoursUntil,
    }
  }

  // Prep items (incomplete todos, ordered by sort_order)
  const { data: todos } = await db
    .from('chef_todos')
    .select('text, sort_order, created_at')
    .eq('chef_id', user.tenantId!)
    .eq('completed', false)
    .order('sort_order', { ascending: true })
    .limit(20)

  const prepItems = (todos ?? []).map((t: any) => {
    return {
      title: t.text,
      dueIn: nextEvent ? `${nextEvent.hoursUntil}h` : 'pending',
      priority: 'normal' as 'high' | 'normal',
    }
  })

  return { nextEvent, prepItems }
}

// ── Reorder Widgets ──────────────────────────────────────────────────

export async function reorderWidgets(
  order: { widgetType: WidgetType; position: number }[]
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  for (const item of order) {
    // Upsert: update position if exists, create if not
    const { data: existing } = await db
      .from('widget_configs')
      .select('id')
      .eq('tenant_id', user.tenantId!)
      .eq('widget_type', item.widgetType)
      .maybeSingle()

    if (existing) {
      await db
        .from('widget_configs')
        .update({ position: item.position })
        .eq('id', existing.id)
        .eq('tenant_id', user.tenantId!)
    } else {
      await db
        .from('widget_configs')
        .insert({
          tenant_id: user.tenantId!,
          widget_type: item.widgetType,
          position: item.position,
          settings: {},
          enabled: true,
        })
    }
  }
}
