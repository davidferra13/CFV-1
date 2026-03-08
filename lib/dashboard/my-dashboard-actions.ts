// My Dashboard - Server actions for the customizable personal dashboard tab.
// Loads widget data in bulk for the chef's selected widgets.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { getChefPreferences, updateChefPreferences } from '@/lib/chef/actions'
import type { DashboardWidgetId } from '@/lib/scheduling/types'
import { DASHBOARD_WIDGET_IDS } from '@/lib/scheduling/types'

// ============================================
// CONFIG
// ============================================

export interface MyDashboardConfig {
  widgetIds: string[]
  notes: string
  pinnedMenuId: string | null
  pinnedMenuName: string | null
}

export async function getMyDashboardConfig(): Promise<MyDashboardConfig> {
  const prefs = await getChefPreferences()

  let pinnedMenuName: string | null = null
  if (prefs.my_dashboard_pinned_menu_id) {
    const supabase: any = createServerClient()
    const user = await requireChef()
    const { data } = await supabase
      .from('menus')
      .select('name')
      .eq('id', prefs.my_dashboard_pinned_menu_id)
      .eq('tenant_id', user.tenantId!)
      .single()
    pinnedMenuName = data?.name ?? null
  }

  return {
    widgetIds: prefs.my_dashboard_widgets,
    notes: prefs.my_dashboard_notes,
    pinnedMenuId: prefs.my_dashboard_pinned_menu_id,
    pinnedMenuName,
  }
}

export async function saveMyDashboardWidgets(widgetIds: string[]) {
  return updateChefPreferences({ my_dashboard_widgets: widgetIds })
}

export async function saveMyDashboardNotes(notes: string) {
  return updateChefPreferences({ my_dashboard_notes: notes })
}

export async function saveMyDashboardPinnedMenu(menuId: string | null) {
  return updateChefPreferences({ my_dashboard_pinned_menu_id: menuId })
}

// ============================================
// BULK WIDGET DATA LOADER
// ============================================

// Returns a map of widgetId -> data for all requested widgets.
// Each widget's data shape varies. The renderer knows what to expect.
export async function loadWidgetData(widgetIds: string[]): Promise<Record<string, unknown>> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!
  const results: Record<string, unknown> = {}

  // Only load data for widgets the chef actually selected
  const requested = new Set(widgetIds)

  async function safe<T>(key: string, fn: () => Promise<T>, fallback: T): Promise<void> {
    if (!requested.has(key)) return
    try {
      results[key] = await fn()
    } catch (err) {
      console.error(`[MyDashboard] ${key} data failed:`, err)
      results[key] = fallback
    }
  }

  // Load data in parallel batches
  await Promise.all([
    // Payments due
    safe(
      'payments_due',
      async () => {
        const { data: summaries } = await supabase
          .from('event_financial_summary')
          .select('event_id, outstanding_balance_cents')
          .eq('tenant_id', tenantId)
          .gt('outstanding_balance_cents', 0)
        if (!summaries?.length) return []
        const eventIds = summaries.map((s: any) => s.event_id).filter(Boolean)
        const { data: events } = await supabase
          .from('events')
          .select('id, occasion, event_date, status, client:clients(id, full_name)')
          .eq('tenant_id', tenantId)
          .in('id', eventIds)
          .not('status', 'in', '("draft","cancelled")')
          .order('event_date', { ascending: true })
          .limit(5)
        return (events || []).map((e: any) => {
          const fin = summaries.find((s: any) => s.event_id === e.id)
          return {
            eventId: e.id,
            occasion: e.occasion || 'Untitled Event',
            eventDate: e.event_date,
            clientName: e.client?.full_name ?? 'Unknown',
            clientId: e.client?.id ?? '',
            outstandingCents: fin?.outstanding_balance_cents ?? 0,
            status: e.status,
          }
        })
      },
      []
    ),

    // Expiring quotes
    safe(
      'expiring_quotes',
      async () => {
        const sevenDaysFromNow = new Date()
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
        const { data } = await supabase
          .from('quotes')
          .select(
            'id, total_cents, valid_until, event:events(id, occasion, client:clients(full_name))'
          )
          .eq('tenant_id', tenantId)
          .eq('status', 'sent')
          .lte('valid_until', sevenDaysFromNow.toISOString().split('T')[0])
          .order('valid_until', { ascending: true })
          .limit(5)
        return data || []
      },
      []
    ),

    // Business snapshot (revenue this month)
    safe(
      'business_snapshot',
      async () => {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split('T')[0]
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString()
          .split('T')[0]
        const { data: events } = await supabase
          .from('events')
          .select('id')
          .eq('tenant_id', tenantId)
          .gte('event_date', startOfMonth)
          .lte('event_date', endOfMonth)
          .not('status', 'eq', 'cancelled')
        if (!events?.length) return { revenueCents: 0, expenseCents: 0, eventCount: 0 }
        const eventIds = events.map((e: any) => e.id)
        const { data: financials } = await supabase
          .from('event_financial_summary')
          .select('total_revenue_cents, total_expense_cents')
          .in('event_id', eventIds)
        const revenueCents = (financials || []).reduce(
          (s: number, f: any) => s + (f.total_revenue_cents || 0),
          0
        )
        const expenseCents = (financials || []).reduce(
          (s: number, f: any) => s + (f.total_expense_cents || 0),
          0
        )
        return { revenueCents, expenseCents, eventCount: events.length }
      },
      { revenueCents: 0, expenseCents: 0, eventCount: 0 }
    ),

    // Stuck events
    safe(
      'stuck_events',
      async () => {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const { data } = await supabase
          .from('events')
          .select('id, occasion, status, event_date, updated_at, client:clients(full_name)')
          .eq('tenant_id', tenantId)
          .in('status', ['draft', 'proposed'])
          .lt('updated_at', sevenDaysAgo.toISOString())
          .order('updated_at', { ascending: true })
          .limit(5)
        return data || []
      },
      []
    ),

    // Cooling alerts (clients with no events in 60+ days)
    safe(
      'cooling_alerts',
      async () => {
        const sixtyDaysAgo = new Date()
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
        const { data } = await supabase
          .from('clients')
          .select('id, full_name, last_event_date')
          .eq('tenant_id', tenantId)
          .not('last_event_date', 'is', null)
          .lt('last_event_date', sixtyDaysAgo.toISOString().split('T')[0])
          .order('last_event_date', { ascending: true })
          .limit(5)
        return data || []
      },
      []
    ),

    // Response time (avg hours to respond to inquiries)
    safe(
      'response_time',
      async () => {
        const { data } = await supabase
          .from('inquiries')
          .select('created_at, first_responded_at')
          .eq('chef_id', tenantId)
          .not('first_responded_at', 'is', null)
          .order('created_at', { ascending: false })
          .limit(20)
        if (!data?.length) return { avgHours: 0, count: 0 }
        let totalMs = 0
        let count = 0
        for (const inq of data) {
          const created = new Date(inq.created_at).getTime()
          const responded = new Date(inq.first_responded_at).getTime()
          if (responded > created) {
            totalMs += responded - created
            count++
          }
        }
        return {
          avgHours: count > 0 ? Math.round((totalMs / count / 3600000) * 10) / 10 : 0,
          count,
        }
      },
      { avgHours: 0, count: 0 }
    ),

    // Pending follow-ups
    safe(
      'pending_followups',
      async () => {
        const { data } = await supabase
          .from('inquiries')
          .select('id, client_name, occasion, follow_up_due_at, created_at')
          .eq('chef_id', tenantId)
          .eq('status', 'new')
          .not('follow_up_due_at', 'is', null)
          .lte('follow_up_due_at', new Date().toISOString())
          .order('follow_up_due_at', { ascending: true })
          .limit(5)
        return data || []
      },
      []
    ),

    // Invoice pulse (collection rate)
    safe(
      'invoice_pulse',
      async () => {
        const { data } = await supabase
          .from('invoices')
          .select('id, total_cents, paid_cents, status')
          .eq('tenant_id', tenantId)
        if (!data?.length) return { collectionRate: 0, totalInvoices: 0 }
        const totalCents = data.reduce((s: number, i: any) => s + (i.total_cents || 0), 0)
        const paidCents = data.reduce((s: number, i: any) => s + (i.paid_cents || 0), 0)
        return {
          collectionRate: totalCents > 0 ? Math.round((paidCents / totalCents) * 100) : 0,
          totalInvoices: data.length,
        }
      },
      { collectionRate: 0, totalInvoices: 0 }
    ),
  ])

  return results
}

// ============================================
// MENU LIST (for pinned menu picker)
// ============================================

export async function getChefMenusForPicker(): Promise<{ id: string; name: string }[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('menus')
    .select('id, name')
    .eq('tenant_id', user.tenantId!)
    .order('updated_at', { ascending: false })
    .limit(20)

  return (data || []).map((m: any) => ({ id: m.id, name: m.name || 'Untitled Menu' }))
}
