// Peak Hour Analytics - Dedicated server actions for the Peak Hour Dashboard
// All computations are deterministic (Formula > AI).

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'

// ============================================
// TYPES
// ============================================

export type HourlyBreakdownRow = {
  hour: number // 0-23
  salesCount: number
  revenueCents: number
  avgTicketCents: number
  covers: number
}

export type WeeklyHourlyAverage = {
  hour: number // 0-23
  avgSalesCount: number
  avgRevenueCents: number
  daysWithData: number
}

export type PeakHourInfo = {
  hour: number
  salesCount: number
  revenueCents: number
  avgTicketCents: number
  isPeak: boolean
}

export type HourlyCoverRow = {
  hour: number
  covers: number
}

export type StaffingVsVolumeRow = {
  hour: number
  orderCount: number
  staffCount: number
  ordersPerStaff: number
}

export type WeeklyHeatmapCell = {
  dayOfWeek: number // 0=Sun, 6=Sat
  dayLabel: string
  hour: number
  salesCount: number
  isPeak: boolean
}

export type StaffingRecommendation = {
  hour: number
  orderCount: number
  staffCount: number
  ordersPerStaff: number
  recommendation: string
}

// ============================================
// HOURLY BREAKDOWN (single date)
// ============================================

export async function getHourlyBreakdown(date: string): Promise<HourlyBreakdownRow[]> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const { data: sales, error } = await (supabase
    .from('sales')
    .select('created_at, total_cents, guest_count')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', `${date}T00:00:00.000Z`)
    .lte('created_at', `${date}T23:59:59.999Z`)
    .neq('status', 'voided')
    .neq('status', 'draft') as any)

  if (error) throw new Error(`Failed to load hourly breakdown: ${error.message}`)

  const hourMap = new Map<number, { count: number; revenue: number; covers: number }>()

  for (const s of (sales ?? []) as any[]) {
    const hour = new Date(s.created_at).getHours()
    const existing = hourMap.get(hour) ?? { count: 0, revenue: 0, covers: 0 }
    existing.count++
    existing.revenue += s.total_cents ?? 0
    existing.covers += s.guest_count ?? 1
    hourMap.set(hour, existing)
  }

  const result: HourlyBreakdownRow[] = []
  for (let h = 0; h < 24; h++) {
    const data = hourMap.get(h) ?? { count: 0, revenue: 0, covers: 0 }
    result.push({
      hour: h,
      salesCount: data.count,
      revenueCents: data.revenue,
      avgTicketCents: data.count > 0 ? Math.round(data.revenue / data.count) : 0,
      covers: data.covers,
    })
  }

  return result
}

// ============================================
// WEEKLY HOURLY AVERAGE (last 7 days)
// ============================================

export async function getWeeklyHourlyAverage(): Promise<WeeklyHourlyAverage[]> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const endDate = new Date()
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - 6)

  const startStr = startDate.toISOString().split('T')[0]
  const endStr = endDate.toISOString().split('T')[0]

  const { data: sales, error } = await (supabase
    .from('sales')
    .select('created_at, total_cents')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', `${startStr}T00:00:00.000Z`)
    .lte('created_at', `${endStr}T23:59:59.999Z`)
    .neq('status', 'voided')
    .neq('status', 'draft') as any)

  if (error) throw new Error(`Failed to load weekly averages: ${error.message}`)

  // Track per-hour: total count, total revenue, and which dates had data
  const hourMap = new Map<
    number,
    { totalCount: number; totalRevenue: number; dates: Set<string> }
  >()

  for (const s of (sales ?? []) as any[]) {
    const dt = new Date(s.created_at)
    const hour = dt.getHours()
    const dateKey = s.created_at.substring(0, 10)
    const existing = hourMap.get(hour) ?? {
      totalCount: 0,
      totalRevenue: 0,
      dates: new Set<string>(),
    }
    existing.totalCount++
    existing.totalRevenue += s.total_cents ?? 0
    existing.dates.add(dateKey)
    hourMap.set(hour, existing)
  }

  const result: WeeklyHourlyAverage[] = []
  for (let h = 0; h < 24; h++) {
    const data = hourMap.get(h)
    if (data) {
      const daysWithData = data.dates.size
      result.push({
        hour: h,
        avgSalesCount: Math.round((data.totalCount / daysWithData) * 10) / 10,
        avgRevenueCents: Math.round(data.totalRevenue / daysWithData),
        daysWithData,
      })
    } else {
      result.push({
        hour: h,
        avgSalesCount: 0,
        avgRevenueCents: 0,
        daysWithData: 0,
      })
    }
  }

  return result
}

// ============================================
// PEAK HOURS (configurable lookback)
// ============================================

export async function getPeakHours(days: number = 30): Promise<PeakHourInfo[]> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const endDate = new Date()
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - days)

  const startStr = startDate.toISOString().split('T')[0]
  const endStr = endDate.toISOString().split('T')[0]

  const { data: sales, error } = await (supabase
    .from('sales')
    .select('created_at, total_cents')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', `${startStr}T00:00:00.000Z`)
    .lte('created_at', `${endStr}T23:59:59.999Z`)
    .neq('status', 'voided')
    .neq('status', 'draft') as any)

  if (error) throw new Error(`Failed to load peak hours: ${error.message}`)

  const hourMap = new Map<number, { count: number; revenue: number }>()

  for (const s of (sales ?? []) as any[]) {
    const hour = new Date(s.created_at).getHours()
    const existing = hourMap.get(hour) ?? { count: 0, revenue: 0 }
    existing.count++
    existing.revenue += s.total_cents ?? 0
    hourMap.set(hour, existing)
  }

  // Peak threshold: hours with sales count > 1.5x the average across active hours
  const activeHours = Array.from(hourMap.values()).filter((v) => v.count > 0)
  const avgCount =
    activeHours.length > 0 ? activeHours.reduce((a, b) => a + b.count, 0) / activeHours.length : 0
  const peakThreshold = avgCount * 1.5

  const result: PeakHourInfo[] = []
  for (let h = 0; h < 24; h++) {
    const data = hourMap.get(h) ?? { count: 0, revenue: 0 }
    result.push({
      hour: h,
      salesCount: data.count,
      revenueCents: data.revenue,
      avgTicketCents: data.count > 0 ? Math.round(data.revenue / data.count) : 0,
      isPeak: data.count >= peakThreshold && data.count > 0,
    })
  }

  return result
}

// ============================================
// HOURLY COVER COUNT (single date)
// ============================================

export async function getHourlyCoverCount(date: string): Promise<HourlyCoverRow[]> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const { data: sales, error } = await (supabase
    .from('sales')
    .select('created_at, guest_count')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', `${date}T00:00:00.000Z`)
    .lte('created_at', `${date}T23:59:59.999Z`)
    .neq('status', 'voided')
    .neq('status', 'draft') as any)

  if (error) throw new Error(`Failed to load cover count: ${error.message}`)

  const hourMap = new Map<number, number>()

  for (const s of (sales ?? []) as any[]) {
    const hour = new Date(s.created_at).getHours()
    hourMap.set(hour, (hourMap.get(hour) ?? 0) + (s.guest_count ?? 1))
  }

  const result: HourlyCoverRow[] = []
  for (let h = 0; h < 24; h++) {
    result.push({ hour: h, covers: hourMap.get(h) ?? 0 })
  }

  return result
}

// ============================================
// STAFFING VS VOLUME (single date)
// ============================================

export async function getStaffingVsVolume(date: string): Promise<{
  rows: StaffingVsVolumeRow[]
  recommendations: StaffingRecommendation[]
}> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  // Fetch sales for the day
  const { data: sales, error: salesErr } = await (supabase
    .from('sales')
    .select('created_at')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', `${date}T00:00:00.000Z`)
    .lte('created_at', `${date}T23:59:59.999Z`)
    .neq('status', 'voided')
    .neq('status', 'draft') as any)

  if (salesErr) throw new Error(`Failed to load sales: ${salesErr.message}`)

  // Fetch staff clock entries for the day
  const { data: shifts, error: shiftErr } = await (supabase
    .from('staff_clock_entries')
    .select('clock_in_at, clock_out_at')
    .eq('tenant_id', user.tenantId!)
    .gte('clock_in_at', `${date}T00:00:00.000Z`)
    .lte('clock_in_at', `${date}T23:59:59.999Z`) as any)

  if (shiftErr) throw new Error(`Failed to load staff shifts: ${shiftErr.message}`)

  // Count orders per hour
  const ordersByHour = new Map<number, number>()
  for (const s of (sales ?? []) as any[]) {
    const hour = new Date(s.created_at).getHours()
    ordersByHour.set(hour, (ordersByHour.get(hour) ?? 0) + 1)
  }

  // Count staff present per hour
  // A staff member is "present" in an hour if their shift overlaps that hour
  const staffByHour = new Map<number, number>()
  for (const shift of (shifts ?? []) as any[]) {
    const clockIn = new Date(shift.clock_in_at)
    const clockOut = shift.clock_out_at
      ? new Date(shift.clock_out_at)
      : new Date(`${date}T23:59:59.999Z`)
    const startHour = clockIn.getHours()
    const endHour = clockOut.getHours()

    // Mark each hour the staff member was present
    for (let h = startHour; h <= Math.min(endHour, 23); h++) {
      staffByHour.set(h, (staffByHour.get(h) ?? 0) + 1)
    }
  }

  const rows: StaffingVsVolumeRow[] = []
  const recommendations: StaffingRecommendation[] = []

  for (let h = 0; h < 24; h++) {
    const orderCount = ordersByHour.get(h) ?? 0
    const staffCount = staffByHour.get(h) ?? 0
    const ordersPerStaff = staffCount > 0 ? Math.round((orderCount / staffCount) * 10) / 10 : 0

    rows.push({ hour: h, orderCount, staffCount, ordersPerStaff })

    // Generate recommendations for hours with high volume
    if (orderCount > 0 && staffCount > 0 && ordersPerStaff > 15) {
      const suggestedExtra = Math.ceil(orderCount / 12) - staffCount
      if (suggestedExtra > 0) {
        recommendations.push({
          hour: h,
          orderCount,
          staffCount,
          ordersPerStaff,
          recommendation:
            `You averaged ${orderCount} orders/hr at ${formatHourLabel(h)} ` +
            `but only had ${staffCount} staff. Consider adding ${suggestedExtra} more.`,
        })
      }
    } else if (orderCount > 0 && staffCount === 0) {
      recommendations.push({
        hour: h,
        orderCount,
        staffCount,
        ordersPerStaff: 0,
        recommendation:
          `${orderCount} orders at ${formatHourLabel(h)} with no staff clocked in. ` +
          `Make sure shifts are logged for accurate analysis.`,
      })
    }
  }

  return { rows, recommendations }
}

// ============================================
// WEEKLY HEATMAP (last 7 days by hour)
// ============================================

export async function getWeeklyHeatmap(): Promise<WeeklyHeatmapCell[]> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const endDate = new Date()
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - 6)

  const startStr = startDate.toISOString().split('T')[0]
  const endStr = endDate.toISOString().split('T')[0]

  const { data: sales, error } = await (supabase
    .from('sales')
    .select('created_at')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', `${startStr}T00:00:00.000Z`)
    .lte('created_at', `${endStr}T23:59:59.999Z`)
    .neq('status', 'voided')
    .neq('status', 'draft') as any)

  if (error) throw new Error(`Failed to load heatmap data: ${error.message}`)

  // Build a [dayOfWeek][hour] -> count map
  const grid = new Map<string, number>()

  for (const s of (sales ?? []) as any[]) {
    const dt = new Date(s.created_at)
    const key = `${dt.getDay()}-${dt.getHours()}`
    grid.set(key, (grid.get(key) ?? 0) + 1)
  }

  // Calculate peak threshold across all cells
  const allCounts = Array.from(grid.values())
  const avgCount =
    allCounts.length > 0 ? allCounts.reduce((a, b) => a + b, 0) / allCounts.length : 0
  const peakThreshold = avgCount * 1.5

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const result: WeeklyHeatmapCell[] = []

  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const count = grid.get(`${d}-${h}`) ?? 0
      result.push({
        dayOfWeek: d,
        dayLabel: dayLabels[d],
        hour: h,
        salesCount: count,
        isPeak: count >= peakThreshold && count > 0,
      })
    }
  }

  return result
}

// ============================================
// HELPERS
// ============================================

function formatHourLabel(h: number): string {
  if (h === 0) return '12am'
  if (h < 12) return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}
