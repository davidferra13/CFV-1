// Daily Ops Command Center — Server Actions
// Fetches all data needed for the morning ops overview in one call.
// Uses Promise.allSettled for resilience — a single query failure won't crash the page.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ============================================
// TYPES
// ============================================

export type StationSnapshot = {
  id: string
  name: string
  totalComponents: number
  atParCount: number
  parPercent: number
  eightySixCount: number
  checkedInStaff: string | null
  lastUpdated: string | null
}

export type TaskSummary = {
  total: number
  completed: number
  pending: number
  inProgress: number
  completionPercent: number
  overdueTasks: Array<{
    id: string
    title: string
    status: string
    priority: string
    dueTime: string | null
    assignedTo: string | null
  }>
}

export type OrderSummary = {
  totalPending: number
  topItems: Array<{
    componentName: string
    stationName: string
    quantity: number
    unit: string
  }>
}

export type AlertItem = {
  type: 'expiring' | '86d' | 'low_stock'
  stationName: string
  componentName: string
  detail: string
}

export type DailyOpsData = {
  stations: StationSnapshot[]
  tasks: TaskSummary
  orders: OrderSummary
  alerts: AlertItem[]
  openingTemplateId: string | null
}

// ============================================
// MAIN DATA FETCH
// ============================================

export async function getDailyOpsData(): Promise<DailyOpsData> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const today = new Date().toISOString().split('T')[0]
  const chefId = user.tenantId!

  const [
    stationsResult,
    clipboardResult,
    shiftsResult,
    tasksResult,
    ordersResult,
    templatesResult,
  ] = await Promise.allSettled([
    // All active stations
    supabase
      .from('stations')
      .select('id, name, status')
      .eq('chef_id', chefId)
      .eq('status', 'active')
      .order('display_order'),

    // Today's clipboard entries with component data
    supabase
      .from('clipboard_entries')
      .select('*, station_components(id, name, par_level, shelf_life_days, unit)')
      .eq('chef_id', chefId)
      .eq('entry_date', today),

    // Active shifts (not checked out) with staff member names
    supabase
      .from('shift_logs')
      .select('*, staff_members(name)')
      .eq('chef_id', chefId)
      .is('check_out_at', null),

    // Today's tasks with staff assignment
    supabase
      .from('tasks')
      .select('id, title, status, priority, due_date, due_time, assigned_to, staff_members(name)')
      .eq('chef_id', chefId)
      .eq('due_date', today),

    // Pending orders with component and station info
    supabase
      .from('order_requests')
      .select('*, station_components(name, unit), stations(name)')
      .eq('chef_id', chefId)
      .eq('status', 'pending')
      .order('quantity', { ascending: false }),

    // First opening template (for Generate Tasks button)
    supabase
      .from('task_templates')
      .select('id, name, category')
      .eq('chef_id', chefId)
      .eq('category', 'opening')
      .limit(1),
  ])

  // Extract data safely from Promise.allSettled results
  const stations: any[] =
    stationsResult.status === 'fulfilled' ? (stationsResult.value.data ?? []) : []
  const clipboardEntries: any[] =
    clipboardResult.status === 'fulfilled' ? (clipboardResult.value.data ?? []) : []
  const activeShifts: any[] =
    shiftsResult.status === 'fulfilled' ? (shiftsResult.value.data ?? []) : []
  const allTasks: any[] = tasksResult.status === 'fulfilled' ? (tasksResult.value.data ?? []) : []
  const pendingOrders: any[] =
    ordersResult.status === 'fulfilled' ? (ordersResult.value.data ?? []) : []
  const templates: any[] =
    templatesResult.status === 'fulfilled' ? (templatesResult.value.data ?? []) : []

  // ============================================
  // STATION SNAPSHOTS
  // ============================================

  const stationSnapshots: StationSnapshot[] = stations.map((station: any) => {
    // Filter clipboard entries for this station
    const stationEntries = clipboardEntries.filter((e: any) => e.station_id === station.id)
    const totalComponents = stationEntries.length
    const atParCount = stationEntries.filter((e: any) => {
      const parLevel = e.station_components?.par_level ?? 0
      if (parLevel === 0) return true // No par level set = considered "at par"
      const onHand = Number(e.on_hand ?? 0) + Number(e.made ?? 0)
      return onHand >= parLevel * 0.8 // Within 80% of par = "at par"
    }).length
    const parPercent = totalComponents > 0 ? Math.round((atParCount / totalComponents) * 100) : 100
    const eightySixCount = stationEntries.filter((e: any) => e.is_86d).length

    // Find who's checked in at this station
    const activeShift = activeShifts.find((s: any) => s.station_id === station.id)
    const checkedInStaff = activeShift?.staff_members?.name ?? null

    // Find most recent update across all entries for this station
    const updatedTimes = stationEntries
      .map((e: any) => e.updated_at)
      .filter(Boolean)
      .sort()
      .reverse()
    const lastUpdated = updatedTimes.length > 0 ? updatedTimes[0] : null

    return {
      id: station.id,
      name: station.name,
      totalComponents,
      atParCount,
      parPercent,
      eightySixCount,
      checkedInStaff,
      lastUpdated,
    }
  })

  // ============================================
  // TASK SUMMARY
  // ============================================

  const completed = allTasks.filter((t: any) => t.status === 'done').length
  const pending = allTasks.filter((t: any) => t.status === 'pending').length
  const inProgress = allTasks.filter((t: any) => t.status === 'in_progress').length
  const total = allTasks.length
  const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0

  // Find overdue tasks: due_time has passed and status is not done
  const now = new Date()
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`

  const overdueTasks = allTasks
    .filter((t: any) => {
      if (t.status === 'done') return false
      if (!t.due_time) return false
      return t.due_time < currentTimeStr
    })
    .map((t: any) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueTime: t.due_time,
      assignedTo: t.staff_members?.name ?? null,
    }))

  const taskSummary: TaskSummary = {
    total,
    completed,
    pending,
    inProgress,
    completionPercent,
    overdueTasks,
  }

  // ============================================
  // ORDER SUMMARY
  // ============================================

  const topItems = pendingOrders.slice(0, 5).map((o: any) => ({
    componentName: o.station_components?.name ?? 'Unknown',
    stationName: o.stations?.name ?? 'Unknown',
    quantity: Number(o.quantity),
    unit: o.station_components?.unit ?? o.unit ?? 'each',
  }))

  const orderSummary: OrderSummary = {
    totalPending: pendingOrders.length,
    topItems,
  }

  // ============================================
  // ALERTS
  // ============================================

  const alerts: AlertItem[] = []

  for (const entry of clipboardEntries) {
    const comp = entry.station_components
    const stationName = stations.find((s: any) => s.id === entry.station_id)?.name ?? 'Unknown'
    const componentName = comp?.name ?? 'Unknown'

    // 86'd items
    if (entry.is_86d) {
      alerts.push({
        type: '86d',
        stationName,
        componentName,
        detail: `86'd at ${entry.eighty_sixed_at ? new Date(entry.eighty_sixed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'unknown time'}`,
      })
    }

    // Low stock: on_hand < 50% of par
    const parLevel = Number(comp?.par_level ?? 0)
    const onHand = Number(entry.on_hand ?? 0) + Number(entry.made ?? 0)
    if (parLevel > 0 && onHand < parLevel * 0.5 && !entry.is_86d) {
      alerts.push({
        type: 'low_stock',
        stationName,
        componentName,
        detail: `${onHand} on hand / ${parLevel} par (${Math.round((onHand / parLevel) * 100)}%)`,
      })
    }

    // Expiring today: made_at + shelf_life_days = today
    const shelfLifeDays = comp?.shelf_life_days
    if (shelfLifeDays && entry.made_at) {
      const madeDate = new Date(entry.made_at)
      const expiresDate = new Date(madeDate)
      expiresDate.setDate(expiresDate.getDate() + shelfLifeDays)
      const expiresDateStr = expiresDate.toISOString().split('T')[0]
      if (expiresDateStr <= today) {
        alerts.push({
          type: 'expiring',
          stationName,
          componentName,
          detail: `Shelf life: ${shelfLifeDays}d — ${expiresDateStr === today ? 'expires today' : 'expired'}`,
        })
      }
    }
  }

  // Sort alerts: 86'd first, then expiring, then low stock
  const alertOrder = { '86d': 0, expiring: 1, low_stock: 2 }
  alerts.sort((a, b) => alertOrder[a.type] - alertOrder[b.type])

  // ============================================
  // OPENING TEMPLATE
  // ============================================

  const openingTemplateId = templates.length > 0 ? templates[0].id : null

  return {
    stations: stationSnapshots,
    tasks: taskSummary,
    orders: orderSummary,
    alerts,
    openingTemplateId,
  }
}
