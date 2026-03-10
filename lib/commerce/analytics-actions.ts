// Commerce Engine V1 - Peak Hour Analytics
// Covers-per-hour, average check trending, daily/weekly performance metrics.
// All computations are deterministic (Formula > AI).

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'

// ============================================
// TYPES
// ============================================

export type HourlySalesRow = {
  hour: number // 0-23
  salesCount: number
  revenueCents: number
  avgCheckCents: number
  guestCount: number
}

export type PeakHourResult = {
  hour: number
  salesCount: number
  revenueCents: number
  avgCheckCents: number
  isPeak: boolean
}

export type AvgCheckTrendPoint = {
  period: string // date string or week label
  avgCheckCents: number
  salesCount: number
  revenueCents: number
}

export type DailyPerformanceMetrics = {
  date: string
  totalRevenueCents: number
  covers: number
  avgCheckCents: number
  revenuePerCover: number
  salesCount: number
  tipsCents: number
  refundsCents: number
}

export type WeekOverWeekComparison = {
  metric: string
  thisWeek: number
  lastWeek: number
  changePercent: number
  direction: 'up' | 'down' | 'flat'
}

export type TopSellingItem = {
  name: string
  productId: string | null
  category: string | null
  quantitySold: number
  revenueCents: number
}

// ============================================
// HOURLY SALES BREAKDOWN
// ============================================

export async function getHourlySalesBreakdown(date: string): Promise<HourlySalesRow[]> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const { data: sales } = await (supabase
    .from('sales')
    .select('created_at, total_cents, guest_count')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', `${date}T00:00:00.000Z`)
    .lte('created_at', `${date}T23:59:59.999Z`)
    .neq('status', 'voided')
    .neq('status', 'draft') as any)

  const hourMap = new Map<number, { count: number; revenue: number; guests: number }>()

  for (const s of (sales ?? []) as any[]) {
    const hour = new Date(s.created_at).getHours()
    const existing = hourMap.get(hour) ?? { count: 0, revenue: 0, guests: 0 }
    existing.count++
    existing.revenue += s.total_cents ?? 0
    existing.guests += s.guest_count ?? 1
    hourMap.set(hour, existing)
  }

  const result: HourlySalesRow[] = []
  for (let h = 0; h < 24; h++) {
    const data = hourMap.get(h)
    if (data) {
      result.push({
        hour: h,
        salesCount: data.count,
        revenueCents: data.revenue,
        avgCheckCents: data.count > 0 ? Math.round(data.revenue / data.count) : 0,
        guestCount: data.guests,
      })
    }
  }

  return result
}

// ============================================
// DAILY COVER COUNT
// ============================================

export async function getDailyCoverCount(date: string): Promise<number> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const { data: sales } = await (supabase
    .from('sales')
    .select('guest_count')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', `${date}T00:00:00.000Z`)
    .lte('created_at', `${date}T23:59:59.999Z`)
    .neq('status', 'voided')
    .neq('status', 'draft') as any)

  return (sales ?? []).reduce((sum: number, s: any) => sum + (s.guest_count ?? 1), 0)
}

// ============================================
// AVERAGE CHECK TREND
// ============================================

export async function getAverageCheckTrend(
  startDate: string,
  endDate: string,
  granularity: 'daily' | 'weekly' | 'monthly' = 'daily'
): Promise<AvgCheckTrendPoint[]> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const { data: sales } = await (supabase
    .from('sales')
    .select('created_at, total_cents')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', `${startDate}T00:00:00.000Z`)
    .lte('created_at', `${endDate}T23:59:59.999Z`)
    .neq('status', 'voided')
    .neq('status', 'draft') as any)

  const periodMap = new Map<string, { count: number; revenue: number }>()

  for (const s of (sales ?? []) as any[]) {
    const d = new Date(s.created_at)
    let key: string

    switch (granularity) {
      case 'daily':
        key = s.created_at.substring(0, 10)
        break
      case 'weekly': {
        // ISO week start (Monday)
        const day = d.getDay()
        const diff = d.getDate() - day + (day === 0 ? -6 : 1)
        const weekStart = new Date(d)
        weekStart.setDate(diff)
        key = `W${weekStart.toISOString().substring(0, 10)}`
        break
      }
      case 'monthly':
        key = s.created_at.substring(0, 7) // YYYY-MM
        break
    }

    const existing = periodMap.get(key) ?? { count: 0, revenue: 0 }
    existing.count++
    existing.revenue += s.total_cents ?? 0
    periodMap.set(key, existing)
  }

  return Array.from(periodMap.entries())
    .map(([period, data]) => ({
      period,
      avgCheckCents: data.count > 0 ? Math.round(data.revenue / data.count) : 0,
      salesCount: data.count,
      revenueCents: data.revenue,
    }))
    .sort((a, b) => a.period.localeCompare(b.period))
}

// ============================================
// PEAK HOURS
// ============================================

export async function getPeakHours(startDate: string, endDate: string): Promise<PeakHourResult[]> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const { data: sales } = await (supabase
    .from('sales')
    .select('created_at, total_cents')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', `${startDate}T00:00:00.000Z`)
    .lte('created_at', `${endDate}T23:59:59.999Z`)
    .neq('status', 'voided')
    .neq('status', 'draft') as any)

  const hourMap = new Map<number, { count: number; revenue: number }>()

  for (const s of (sales ?? []) as any[]) {
    const hour = new Date(s.created_at).getHours()
    const existing = hourMap.get(hour) ?? { count: 0, revenue: 0 }
    existing.count++
    existing.revenue += s.total_cents ?? 0
    hourMap.set(hour, existing)
  }

  // Determine peak threshold: hours with sales count > 1.5x the average
  const counts = Array.from(hourMap.values()).map((v) => v.count)
  const avgCount = counts.length > 0 ? counts.reduce((a, b) => a + b, 0) / counts.length : 0
  const peakThreshold = avgCount * 1.5

  const result: PeakHourResult[] = []
  for (let h = 0; h < 24; h++) {
    const data = hourMap.get(h)
    if (data) {
      result.push({
        hour: h,
        salesCount: data.count,
        revenueCents: data.revenue,
        avgCheckCents: data.count > 0 ? Math.round(data.revenue / data.count) : 0,
        isPeak: data.count >= peakThreshold,
      })
    }
  }

  return result
}

// ============================================
// DAILY PERFORMANCE METRICS
// ============================================

export async function getDailyPerformanceMetrics(date: string): Promise<DailyPerformanceMetrics> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const [salesRes, refundsRes] = await Promise.all([
    supabase
      .from('sales')
      .select('total_cents, tip_cents, guest_count')
      .eq('tenant_id', user.tenantId!)
      .gte('created_at', `${date}T00:00:00.000Z`)
      .lte('created_at', `${date}T23:59:59.999Z`)
      .neq('status', 'voided')
      .neq('status', 'draft'),
    supabase
      .from('commerce_refunds')
      .select('amount_cents')
      .eq('tenant_id', user.tenantId!)
      .eq('status', 'processed')
      .gte('created_at', `${date}T00:00:00.000Z`)
      .lte('created_at', `${date}T23:59:59.999Z`),
  ])

  const allSales = (salesRes.data ?? []) as any[]
  const allRefunds = (refundsRes.data ?? []) as any[]

  const totalRevenueCents = allSales.reduce((sum: number, s: any) => sum + (s.total_cents ?? 0), 0)
  const tipsCents = allSales.reduce((sum: number, s: any) => sum + (s.tip_cents ?? 0), 0)
  const covers = allSales.reduce((sum: number, s: any) => sum + (s.guest_count ?? 1), 0)
  const refundsCents = allRefunds.reduce((sum: number, r: any) => sum + (r.amount_cents ?? 0), 0)
  const salesCount = allSales.length

  return {
    date,
    totalRevenueCents,
    covers,
    avgCheckCents: salesCount > 0 ? Math.round(totalRevenueCents / salesCount) : 0,
    revenuePerCover: covers > 0 ? Math.round(totalRevenueCents / covers) : 0,
    salesCount,
    tipsCents,
    refundsCents,
  }
}

// ============================================
// WEEK OVER WEEK COMPARISON
// ============================================

export async function getWeekOverWeekComparison(date: string): Promise<WeekOverWeekComparison[]> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const current = new Date(date + 'T12:00:00Z')
  const dayOfWeek = current.getDay()

  // This week: Monday to Sunday containing `date`
  const thisWeekStart = new Date(current)
  thisWeekStart.setDate(current.getDate() - ((dayOfWeek + 6) % 7))
  const thisWeekEnd = new Date(thisWeekStart)
  thisWeekEnd.setDate(thisWeekStart.getDate() + 6)

  // Last week
  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(thisWeekStart.getDate() - 7)
  const lastWeekEnd = new Date(thisWeekEnd)
  lastWeekEnd.setDate(thisWeekEnd.getDate() - 7)

  const fmt = (d: Date) => d.toISOString().substring(0, 10)

  const [thisWeekRes, lastWeekRes] = await Promise.all([
    supabase
      .from('sales')
      .select('total_cents, guest_count')
      .eq('tenant_id', user.tenantId!)
      .gte('created_at', `${fmt(thisWeekStart)}T00:00:00.000Z`)
      .lte('created_at', `${fmt(thisWeekEnd)}T23:59:59.999Z`)
      .neq('status', 'voided')
      .neq('status', 'draft'),
    supabase
      .from('sales')
      .select('total_cents, guest_count')
      .eq('tenant_id', user.tenantId!)
      .gte('created_at', `${fmt(lastWeekStart)}T00:00:00.000Z`)
      .lte('created_at', `${fmt(lastWeekEnd)}T23:59:59.999Z`)
      .neq('status', 'voided')
      .neq('status', 'draft'),
  ])

  const thisWeekSales = (thisWeekRes.data ?? []) as any[]
  const lastWeekSales = (lastWeekRes.data ?? []) as any[]

  function summarize(sales: any[]) {
    const revenue = sales.reduce((s: number, r: any) => s + (r.total_cents ?? 0), 0)
    const covers = sales.reduce((s: number, r: any) => s + (r.guest_count ?? 1), 0)
    const avgCheck = sales.length > 0 ? Math.round(revenue / sales.length) : 0
    return { revenue, covers, avgCheck, count: sales.length }
  }

  const tw = summarize(thisWeekSales)
  const lw = summarize(lastWeekSales)

  function pctChange(
    current: number,
    previous: number
  ): { changePercent: number; direction: 'up' | 'down' | 'flat' } {
    if (previous === 0 && current === 0) return { changePercent: 0, direction: 'flat' }
    if (previous === 0) return { changePercent: 100, direction: 'up' }
    const pct = Math.round(((current - previous) / previous) * 1000) / 10
    return {
      changePercent: Math.abs(pct),
      direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat',
    }
  }

  return [
    {
      metric: 'Revenue',
      thisWeek: tw.revenue,
      lastWeek: lw.revenue,
      ...pctChange(tw.revenue, lw.revenue),
    },
    {
      metric: 'Covers',
      thisWeek: tw.covers,
      lastWeek: lw.covers,
      ...pctChange(tw.covers, lw.covers),
    },
    {
      metric: 'Avg Check',
      thisWeek: tw.avgCheck,
      lastWeek: lw.avgCheck,
      ...pctChange(tw.avgCheck, lw.avgCheck),
    },
    {
      metric: 'Sales Count',
      thisWeek: tw.count,
      lastWeek: lw.count,
      ...pctChange(tw.count, lw.count),
    },
  ]
}

// ============================================
// TOP SELLING ITEMS
// ============================================

export async function getTopSellingItems(
  startDate: string,
  endDate: string,
  limit: number = 10
): Promise<TopSellingItem[]> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const { data: items } = await (supabase
    .from('sale_items')
    .select('name, product_projection_id, category, quantity, line_total_cents, sale_id')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', `${startDate}T00:00:00.000Z`)
    .lte('created_at', `${endDate}T23:59:59.999Z`) as any)

  // Filter out voided/draft sales
  const saleIds = [...new Set((items ?? []).map((i: any) => i.sale_id))]
  let validSaleIds = new Set<string>()

  if (saleIds.length > 0) {
    const { data: sales } = await (supabase
      .from('sales')
      .select('id, status')
      .eq('tenant_id', user.tenantId!)
      .in('id', saleIds)
      .neq('status', 'voided')
      .neq('status', 'draft') as any)
    validSaleIds = new Set((sales ?? []).map((s: any) => s.id))
  }

  const productMap = new Map<
    string,
    { productId: string | null; category: string | null; quantity: number; revenue: number }
  >()

  for (const item of (items ?? []) as any[]) {
    if (!validSaleIds.has(item.sale_id)) continue
    const key = item.name
    const existing = productMap.get(key) ?? {
      productId: item.product_projection_id,
      category: item.category,
      quantity: 0,
      revenue: 0,
    }
    existing.quantity += item.quantity
    existing.revenue += item.line_total_cents ?? 0
    productMap.set(key, existing)
  }

  return Array.from(productMap.entries())
    .map(([name, d]) => ({
      name,
      productId: d.productId,
      category: d.category,
      quantitySold: d.quantity,
      revenueCents: d.revenue,
    }))
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, limit)
}
