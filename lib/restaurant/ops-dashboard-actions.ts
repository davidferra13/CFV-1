'use server'

// Restaurant Operations Dashboard - Unified data fetch for the ops hub.
// Single server action to power the entire /ops page.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getPrepSummary } from './prep-generation-actions'
import type { ServiceDay, ServiceDaySummary } from './service-day-actions'

// ── Types ─────────────────────────────────────────────────────────────────

export interface StationStatus {
  id: string
  name: string
  par_pct: number
  items_86d: number
  checked_in_staff: string[]
  last_updated: string | null
}

export interface TaskOverview {
  total: number
  completed: number
  overdue: number
  by_station: Array<{ station_id: string; station_name: string; count: number }>
}

export interface InventoryAlert {
  ingredient_id: string
  ingredient_name: string
  current_qty: number
  par_level: number
  unit: string
  deficit_pct: number
}

export interface OpsDashboardData {
  // Today's service day
  today: ServiceDay | null
  todayStatus: 'no_service' | 'planning' | 'prep' | 'active' | 'closed'

  // Stations
  stations: StationStatus[]

  // Prep
  prep: {
    total: number
    pending: number
    in_progress: number
    done: number
    verified: number
    completion_pct: number
    critical_pending: number
    deficit_items: number
  }

  // Tasks
  tasks: TaskOverview

  // Sales (live if service is active)
  sales: {
    items_sold: number
    revenue_cents: number
    unique_items: number
    top_sellers: Array<{ name: string; qty: number }>
  }

  // Inventory alerts
  inventory_alerts: InventoryAlert[]

  // 86'd items
  eighty_sixed: Array<{ component_name: string; station_name: string; since: string }>

  // Recent service history
  recent_days: ServiceDaySummary[]

  // Active staff
  active_staff: Array<{ id: string; name: string; station: string | null; clocked_in_at: string }>
}

// ── Main Dashboard Fetch ──────────────────────────────────────────────────

export async function getOpsDashboardData(): Promise<OpsDashboardData> {
  const user = await requireChef()
  const db: any = createServerClient()
  const today = new Date().toISOString().split('T')[0]

  // Parallel fetches
  const [
    todayResult,
    stationsResult,
    tasksResult,
    alertsResult,
    eightySixResult,
    recentResult,
    activeStaffResult,
  ] = await Promise.all([
    // Today's service day
    db
      .from('service_days')
      .select('*')
      .eq('chef_id', user.tenantId!)
      .eq('service_date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),

    // All stations with component counts
    db
      .from('stations')
      .select('id, name')
      .eq('chef_id', user.tenantId!)
      .eq('status', 'active')
      .order('display_order'),

    // Today's tasks
    db
      .from('tasks')
      .select('id, status, priority, station_id, due_time')
      .eq('chef_id', user.tenantId!)
      .eq('due_date', today),

    // Inventory below par
    db
      .from('inventory_counts')
      .select('ingredient_id, ingredient_name, current_qty, par_level, unit')
      .eq('chef_id', user.tenantId!)
      .not('par_level', 'is', null),

    // 86'd items from today's clipboard
    db
      .from('clipboard_entries')
      .select('component_name, station_name, eighty_sixed_at')
      .eq('chef_id', user.tenantId!)
      .eq('entry_date', today)
      .eq('is_86d', true),

    // Recent service days (last 7)
    db
      .from('service_day_summary')
      .select('*')
      .eq('chef_id', user.tenantId!)
      .order('service_date', { ascending: false })
      .limit(7),

    // Currently clocked-in staff
    db
      .from('staff_clock_entries')
      .select('staff_member_id, clock_in, staff_members(name)')
      .eq('chef_id', user.tenantId!)
      .is('clock_out', null),
  ])

  const todayService = todayResult.data as ServiceDay | null

  // Get prep summary if we have a service day
  let prepData = {
    total: 0,
    pending: 0,
    in_progress: 0,
    done: 0,
    verified: 0,
    completion_pct: 0,
    critical_pending: 0,
    deficit_items: 0,
  }
  if (todayService) {
    try {
      prepData = await getPrepSummary(todayService.id)
    } catch {}
  }

  // Get sales for today
  let salesData = { items_sold: 0, revenue_cents: 0, unique_items: 0, top_sellers: [] as any[] }
  if (todayService) {
    const { data: sales } = await db
      .from('menu_item_sales')
      .select('menu_item_id, quantity_sold, revenue_cents, menu_items(name)')
      .eq('service_day_id', todayService.id)
      .order('quantity_sold', { ascending: false })

    if (sales?.length) {
      salesData = {
        items_sold: sales.reduce((s: number, r: any) => s + (r.quantity_sold || 0), 0),
        revenue_cents: sales.reduce((s: number, r: any) => s + (r.revenue_cents || 0), 0),
        unique_items: sales.length,
        top_sellers: sales.slice(0, 5).map((s: any) => ({
          name: s.menu_items?.name || 'Unknown',
          qty: s.quantity_sold,
        })),
      }
    }
  }

  // Build station status
  const stations: StationStatus[] = (stationsResult.data || []).map((s: any) => {
    // Simple par % calculation from clipboard entries
    return {
      id: s.id,
      name: s.name,
      par_pct: 100, // Will be computed from clipboard if available
      items_86d: 0,
      checked_in_staff: [],
      last_updated: null,
    }
  })

  // Process 86'd items into station status
  const eightySixed = (eightySixResult.data || []).map((e: any) => ({
    component_name: e.component_name || 'Unknown',
    station_name: e.station_name || 'Unknown',
    since: e.eighty_sixed_at || '',
  }))

  for (const item86 of eightySixed) {
    const station = stations.find((s) => s.name === item86.station_name)
    if (station) station.items_86d++
  }

  // Process tasks
  const allTasks = tasksResult.data || []
  const taskOverview: TaskOverview = {
    total: allTasks.length,
    completed: allTasks.filter((t: any) => t.status === 'done').length,
    overdue: allTasks.filter((t: any) => {
      if (t.status === 'done') return false
      if (!t.due_time) return false
      const now = new Date()
      const [h, m] = t.due_time.split(':').map(Number)
      return now.getHours() > h || (now.getHours() === h && now.getMinutes() > m)
    }).length,
    by_station: [],
  }

  // Station task counts
  const stationTaskMap = new Map<string, number>()
  for (const t of allTasks) {
    if (t.station_id) {
      stationTaskMap.set(t.station_id, (stationTaskMap.get(t.station_id) || 0) + 1)
    }
  }
  for (const s of stations) {
    const count = stationTaskMap.get(s.id) || 0
    if (count > 0) {
      taskOverview.by_station.push({ station_id: s.id, station_name: s.name, count })
    }
  }

  // Inventory alerts (below par)
  const inventoryAlerts: InventoryAlert[] = (alertsResult.data || [])
    .filter((ic: any) => ic.par_level && ic.current_qty < ic.par_level)
    .map((ic: any) => ({
      ingredient_id: ic.ingredient_id || '',
      ingredient_name: ic.ingredient_name || 'Unknown',
      current_qty: ic.current_qty || 0,
      par_level: ic.par_level,
      unit: ic.unit || '',
      deficit_pct: Math.round((1 - (ic.current_qty || 0) / ic.par_level) * 100),
    }))
    .sort((a: any, b: any) => b.deficit_pct - a.deficit_pct)
    .slice(0, 10)

  // Active staff
  const activeStaff = (activeStaffResult.data || []).map((entry: any) => ({
    id: entry.staff_member_id,
    name: entry.staff_members?.name || 'Unknown',
    station: null,
    clocked_in_at: entry.clock_in,
  }))

  return {
    today: todayService,
    todayStatus: todayService ? (todayService.status as any) : 'no_service',
    stations,
    prep: prepData,
    tasks: taskOverview,
    sales: salesData,
    inventory_alerts: inventoryAlerts,
    eighty_sixed: eightySixed,
    recent_days: recentResult.data || [],
    active_staff: activeStaff,
  }
}
