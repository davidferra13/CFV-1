// My Dashboard - Server actions for the customizable personal dashboard tab.
// Loads widget data in bulk for the chef's selected widgets.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { getChefPreferences, updateChefPreferences } from '@/lib/chef/actions'
import { getCachedChefArchetype } from '@/lib/chef/layout-data-cache'
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
  chefArchetype: string | null
}

export async function getMyDashboardConfig(): Promise<MyDashboardConfig> {
  const user = await requireChef()
  const [prefs, archetype] = await Promise.all([
    getChefPreferences(),
    getCachedChefArchetype(user.entityId).catch(() => null),
  ])

  let pinnedMenuName: string | null = null
  if (prefs.my_dashboard_pinned_menu_id) {
    const supabase: any = createServerClient()
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
    chefArchetype: archetype ?? null,
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

    // Today's schedule
    safe(
      'todays_schedule',
      async () => {
        const today = new Date().toISOString().split('T')[0]
        const { data } = await supabase
          .from('events')
          .select(
            'id, occasion, event_date, serve_time, arrival_time, guest_count, status, client:clients(full_name)'
          )
          .eq('tenant_id', tenantId)
          .eq('event_date', today)
          .not('status', 'eq', 'cancelled')
          .order('serve_time', { ascending: true })
          .limit(10)
        return data || []
      },
      []
    ),

    // DOP tasks (overdue + due today counts)
    safe(
      'dop_tasks',
      async () => {
        const today = new Date().toISOString().split('T')[0]
        const fourteenDaysOut = new Date()
        fourteenDaysOut.setDate(fourteenDaysOut.getDate() + 14)
        const { data: events } = await supabase
          .from('events')
          .select('id, occasion, event_date, status')
          .eq('tenant_id', tenantId)
          .not('status', 'in', '("cancelled","completed")')
          .gte('event_date', today)
          .lte('event_date', fourteenDaysOut.toISOString().split('T')[0])
          .order('event_date', { ascending: true })
        const { data: todos } = await supabase
          .from('chef_todos')
          .select('id, status, due_date')
          .eq('chef_id', tenantId)
          .eq('status', 'pending')
        const overdue = (todos || []).filter((t: any) => t.due_date && t.due_date < today).length
        const dueToday = (todos || []).filter((t: any) => t.due_date === today).length
        return {
          upcomingEvents: (events || []).length,
          pendingTasks: (todos || []).length,
          overdue,
          dueToday,
        }
      },
      { upcomingEvents: 0, pendingTasks: 0, overdue: 0, dueToday: 0 }
    ),

    // Prep prompts (upcoming event prep needs)
    safe(
      'prep_prompts',
      async () => {
        const today = new Date().toISOString().split('T')[0]
        const sevenDaysOut = new Date()
        sevenDaysOut.setDate(sevenDaysOut.getDate() + 7)
        const { data: events } = await supabase
          .from('events')
          .select('id, occasion, event_date, status, guest_count, client:clients(full_name)')
          .eq('tenant_id', tenantId)
          .in('status', ['accepted', 'paid', 'confirmed'])
          .gte('event_date', today)
          .lte('event_date', sevenDaysOut.toISOString().split('T')[0])
          .order('event_date', { ascending: true })
          .limit(8)
        return (events || []).map((e: any) => ({
          eventId: e.id,
          occasion: e.occasion || 'Untitled',
          eventDate: e.event_date,
          guestCount: e.guest_count ?? 0,
          clientName: e.client?.full_name ?? 'Unknown',
          status: e.status,
        }))
      },
      []
    ),

    // Active shopping list
    safe(
      'active_shopping_list',
      async () => {
        const { data } = await supabase
          .from('shopping_lists')
          .select('id, name, status, created_at')
          .eq('chef_id', tenantId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(5)
        return data || []
      },
      []
    ),

    // Quick expense (recent expenses)
    safe(
      'quick_expense',
      async () => {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const { data } = await supabase
          .from('ledger_entries')
          .select('id, amount_cents, description, category, created_at')
          .eq('tenant_id', tenantId)
          .eq('type', 'expense')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(5)
        const totalCents = (data || []).reduce(
          (s: number, e: any) => s + Math.abs(e.amount_cents || 0),
          0
        )
        return { recentExpenses: data || [], totalCents, count: (data || []).length }
      },
      { recentExpenses: [], totalCents: 0, count: 0 }
    ),

    // Dietary / allergy alerts (upcoming events with dietary needs)
    safe(
      'dietary_allergy_alerts',
      async () => {
        const today = new Date().toISOString().split('T')[0]
        const fourteenDaysOut = new Date()
        fourteenDaysOut.setDate(fourteenDaysOut.getDate() + 14)
        const { data: events } = await supabase
          .from('events')
          .select(
            'id, occasion, event_date, client:clients(id, full_name, dietary_restrictions, allergies)'
          )
          .eq('tenant_id', tenantId)
          .not('status', 'in', '("cancelled","completed","draft")')
          .gte('event_date', today)
          .lte('event_date', fourteenDaysOut.toISOString().split('T')[0])
          .order('event_date', { ascending: true })
          .limit(20)
        // Filter to only events where client has dietary info
        const withDietary = (events || []).filter((e: any) => {
          const c = e.client
          return c && (c.dietary_restrictions || c.allergies)
        })
        return withDietary.map((e: any) => ({
          eventId: e.id,
          occasion: e.occasion || 'Event',
          eventDate: e.event_date,
          clientName: e.client?.full_name ?? 'Unknown',
          dietary: e.client?.dietary_restrictions || null,
          allergies: e.client?.allergies || null,
        }))
      },
      []
    ),

    // Food cost trend (avg food cost % from recent events)
    safe(
      'food_cost_trend',
      async () => {
        const { data: financials } = await supabase
          .from('event_financial_summary')
          .select('total_revenue_cents, total_expense_cents, event:events(event_date)')
          .eq('tenant_id', tenantId)
          .gt('total_revenue_cents', 0)
          .order('created_at', { ascending: false })
          .limit(20)
        if (!financials?.length) return { avgFoodCostPercent: 0, eventCount: 0 }
        let totalRev = 0
        let totalExp = 0
        for (const f of financials) {
          totalRev += f.total_revenue_cents || 0
          totalExp += f.total_expense_cents || 0
        }
        return {
          avgFoodCostPercent: totalRev > 0 ? Math.round((totalExp / totalRev) * 100) : 0,
          eventCount: financials.length,
        }
      },
      { avgFoodCostPercent: 0, eventCount: 0 }
    ),

    // Revenue goal (monthly target progress)
    safe(
      'revenue_goal',
      async () => {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split('T')[0]
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString()
          .split('T')[0]
        // Get chef's revenue goal from preferences
        const prefs = await getChefPreferences()
        const monthlyTarget = (prefs as any).revenue_goal_monthly_cents || 0
        // Get actual revenue this month
        const { data: events } = await supabase
          .from('events')
          .select('id')
          .eq('tenant_id', tenantId)
          .gte('event_date', startOfMonth)
          .lte('event_date', endOfMonth)
          .not('status', 'eq', 'cancelled')
        const eventIds = (events || []).map((e: any) => e.id)
        let realizedCents = 0
        if (eventIds.length > 0) {
          const { data: fin } = await supabase
            .from('event_financial_summary')
            .select('total_revenue_cents')
            .in('event_id', eventIds)
          realizedCents = (fin || []).reduce(
            (s: number, f: any) => s + (f.total_revenue_cents || 0),
            0
          )
        }
        return {
          targetCents: monthlyTarget,
          realizedCents,
          progressPercent:
            monthlyTarget > 0
              ? Math.min(100, Math.round((realizedCents / monthlyTarget) * 100))
              : 0,
        }
      },
      { targetCents: 0, realizedCents: 0, progressPercent: 0 }
    ),

    // Staff operations
    safe(
      'staff_operations',
      async () => {
        const { data: staff } = await supabase
          .from('staff_members')
          .select('id, full_name, role, status')
          .eq('chef_id', tenantId)
          .eq('status', 'active')
          .limit(20)
        // Upcoming assignments (next 14 days)
        const today = new Date().toISOString().split('T')[0]
        const twoWeeks = new Date()
        twoWeeks.setDate(twoWeeks.getDate() + 14)
        const { data: assignments } = await supabase
          .from('event_staff')
          .select('id, staff_member_id, event:events(id, occasion, event_date)')
          .eq('tenant_id', tenantId)
          .limit(30)
        const upcomingAssignments = (assignments || []).filter(
          (a: any) =>
            a.event?.event_date >= today &&
            a.event?.event_date <= twoWeeks.toISOString().split('T')[0]
        )
        return {
          activeStaff: (staff || []).length,
          staffList: (staff || [])
            .slice(0, 5)
            .map((s: any) => ({ id: s.id, name: s.full_name, role: s.role })),
          upcomingAssignments: upcomingAssignments.length,
        }
      },
      { activeStaff: 0, staffList: [], upcomingAssignments: 0 }
    ),

    // Multi-event days (days with 2+ events in next 14 days)
    safe(
      'multi_event_days',
      async () => {
        const today = new Date().toISOString().split('T')[0]
        const fourteenDaysOut = new Date()
        fourteenDaysOut.setDate(fourteenDaysOut.getDate() + 14)
        const { data: events } = await supabase
          .from('events')
          .select('id, occasion, event_date, serve_time, guest_count, client:clients(full_name)')
          .eq('tenant_id', tenantId)
          .not('status', 'in', '("cancelled","completed")')
          .gte('event_date', today)
          .lte('event_date', fourteenDaysOut.toISOString().split('T')[0])
          .order('event_date', { ascending: true })
        // Group by date
        const byDate: Record<string, any[]> = {}
        for (const e of events || []) {
          if (!byDate[e.event_date]) byDate[e.event_date] = []
          byDate[e.event_date].push(e)
        }
        // Only keep days with 2+ events
        const multiDays = Object.entries(byDate)
          .filter(([, evts]) => evts.length >= 2)
          .map(([date, evts]) => ({
            date,
            eventCount: evts.length,
            events: evts.slice(0, 4).map((e: any) => ({
              id: e.id,
              occasion: e.occasion || 'Event',
              serveTime: e.serve_time,
              guestCount: e.guest_count ?? 0,
              clientName: e.client?.full_name ?? '',
            })),
          }))
          .slice(0, 5)
        return multiDays
      },
      []
    ),

    // Pipeline forecast (value of proposed + accepted events)
    safe(
      'pipeline_forecast',
      async () => {
        const { data: events } = await supabase
          .from('events')
          .select('id, status')
          .eq('tenant_id', tenantId)
          .in('status', ['proposed', 'accepted', 'paid'])
        if (!events?.length) return { proposedCents: 0, acceptedCents: 0, totalCents: 0, count: 0 }
        const eventIds = events.map((e: any) => e.id)
        const { data: fin } = await supabase
          .from('event_financial_summary')
          .select('event_id, total_revenue_cents')
          .in('event_id', eventIds)
        let proposedCents = 0
        let acceptedCents = 0
        for (const f of fin || []) {
          const evt = events.find((e: any) => e.id === f.event_id)
          const rev = f.total_revenue_cents || 0
          if (evt?.status === 'proposed') proposedCents += rev
          else acceptedCents += rev
        }
        return {
          proposedCents,
          acceptedCents,
          totalCents: proposedCents + acceptedCents,
          count: events.length,
        }
      },
      { proposedCents: 0, acceptedCents: 0, totalCents: 0, count: 0 }
    ),

    // Client birthdays (next 30 days)
    safe(
      'client_birthdays',
      async () => {
        const { data: clients } = await supabase
          .from('clients')
          .select('id, full_name, birthday')
          .eq('tenant_id', tenantId)
          .not('birthday', 'is', null)
        if (!clients?.length) return []
        const now = new Date()
        const upcoming = clients
          .map((c: any) => {
            const bday = new Date(c.birthday)
            const thisYear = new Date(now.getFullYear(), bday.getMonth(), bday.getDate())
            if (thisYear < now) thisYear.setFullYear(thisYear.getFullYear() + 1)
            const daysUntil = Math.ceil((thisYear.getTime() - now.getTime()) / 86400000)
            return { id: c.id, name: c.full_name, birthday: c.birthday, daysUntil }
          })
          .filter((c: any) => c.daysUntil <= 30)
          .sort((a: any, b: any) => a.daysUntil - b.daysUntil)
          .slice(0, 5)
        return upcoming
      },
      []
    ),

    // Dormant clients (no events in 90+ days)
    safe(
      'dormant_clients_list',
      async () => {
        const ninetyDaysAgo = new Date()
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
        const { data } = await supabase
          .from('clients')
          .select('id, full_name, last_event_date')
          .eq('tenant_id', tenantId)
          .not('last_event_date', 'is', null)
          .lt('last_event_date', ninetyDaysAgo.toISOString().split('T')[0])
          .order('last_event_date', { ascending: true })
          .limit(5)
        return data || []
      },
      []
    ),

    // Unread hub messages
    safe(
      'unread_hub_messages',
      async () => {
        const { count } = await supabase
          .from('hub_messages')
          .select('id', { count: 'exact', head: true })
          .eq('chef_id', tenantId)
          .eq('is_read', false)
        return { unreadCount: count ?? 0 }
      },
      { unreadCount: 0 }
    ),

    // Overdue installments
    safe(
      'overdue_installments',
      async () => {
        const today = new Date().toISOString().split('T')[0]
        const { data } = await supabase
          .from('payment_schedules')
          .select(
            'id, amount_cents, due_date, status, event:events(id, occasion, client:clients(full_name))'
          )
          .eq('tenant_id', tenantId)
          .eq('status', 'pending')
          .lt('due_date', today)
          .order('due_date', { ascending: true })
          .limit(5)
        return data || []
      },
      []
    ),

    // Loyalty approaching (clients close to next tier)
    safe(
      'loyalty_approaching',
      async () => {
        const { data: clients } = await supabase
          .from('clients')
          .select('id, full_name, loyalty_points, loyalty_tier')
          .eq('tenant_id', tenantId)
          .not('loyalty_points', 'is', null)
          .gt('loyalty_points', 0)
          .order('loyalty_points', { ascending: false })
          .limit(20)
        if (!clients?.length) return []
        // Tier thresholds (standard: Silver=500, Gold=1500, Platinum=3000)
        const tiers = [
          { name: 'Silver', threshold: 500 },
          { name: 'Gold', threshold: 1500 },
          { name: 'Platinum', threshold: 3000 },
        ]
        const approaching = clients
          .map((c: any) => {
            const pts = c.loyalty_points || 0
            const nextTier = tiers.find((t) => pts < t.threshold)
            if (!nextTier) return null
            const remaining = nextTier.threshold - pts
            const progress = Math.round((pts / nextTier.threshold) * 100)
            if (progress < 60) return null // Only show clients 60%+ to next tier
            return {
              id: c.id,
              name: c.full_name,
              currentPoints: pts,
              currentTier: c.loyalty_tier || 'Bronze',
              nextTier: nextTier.name,
              remaining,
              progress,
            }
          })
          .filter(Boolean)
          .slice(0, 5)
        return approaching
      },
      []
    ),

    // Scheduling gaps (events missing prep time)
    safe(
      'scheduling_gaps',
      async () => {
        const today = new Date().toISOString().split('T')[0]
        const fourteenDaysOut = new Date()
        fourteenDaysOut.setDate(fourteenDaysOut.getDate() + 14)
        const { data: events } = await supabase
          .from('events')
          .select('id, occasion, event_date, status, time_prep_minutes, client:clients(full_name)')
          .eq('tenant_id', tenantId)
          .in('status', ['accepted', 'paid', 'confirmed'])
          .gte('event_date', today)
          .lte('event_date', fourteenDaysOut.toISOString().split('T')[0])
          .order('event_date', { ascending: true })
        // Events with no prep time set are potential gaps
        const gaps = (events || [])
          .filter((e: any) => !e.time_prep_minutes || e.time_prep_minutes === 0)
          .map((e: any) => ({
            eventId: e.id,
            occasion: e.occasion || 'Event',
            eventDate: e.event_date,
            clientName: e.client?.full_name ?? 'Unknown',
          }))
          .slice(0, 5)
        return gaps
      },
      []
    ),

    // Revenue comparison (this month vs last month)
    safe(
      'revenue_comparison',
      async () => {
        const now = new Date()
        const thisStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        const thisEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString()
          .split('T')[0]
        const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          .toISOString()
          .split('T')[0]
        const lastEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

        async function monthRevenue(start: string, end: string) {
          const { data: events } = await supabase
            .from('events')
            .select('id')
            .eq('tenant_id', tenantId)
            .gte('event_date', start)
            .lte('event_date', end)
            .not('status', 'eq', 'cancelled')
          if (!events?.length) return 0
          const { data: fin } = await supabase
            .from('event_financial_summary')
            .select('total_revenue_cents')
            .in(
              'event_id',
              events.map((e: any) => e.id)
            )
          return (fin || []).reduce((s: number, f: any) => s + (f.total_revenue_cents || 0), 0)
        }

        const [thisCents, lastCents] = await Promise.all([
          monthRevenue(thisStart, thisEnd),
          monthRevenue(lastStart, lastEnd),
        ])
        const changePercent =
          lastCents > 0 ? Math.round(((thisCents - lastCents) / lastCents) * 100) : 0
        return { thisMonthCents: thisCents, lastMonthCents: lastCents, changePercent }
      },
      { thisMonthCents: 0, lastMonthCents: 0, changePercent: 0 }
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
