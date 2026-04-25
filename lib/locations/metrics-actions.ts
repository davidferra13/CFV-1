// Location Daily Metrics Server Actions
// Record, query, and aggregate daily operational metrics per location.

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────

export type DailyMetrics = {
  id: string
  locationId: string
  date: string
  coversServed: number
  ordersCount: number
  onlineOrdersCount: number
  deliveryOrdersCount: number
  counterOrdersCount: number
  revenueCents: number
  avgTicketCents: number
  foodCostCents: number
  laborCostCents: number
  wasteCents: number
  otherCostCents: number
  foodCostPct: number | null
  laborCostPct: number | null
  primeCostPct: number | null
  staffHours: number
  staffCount: number
  peakHourOrders: Record<string, number>
  avgTicketTimeMinutes: number | null
}

export type CrossLocationMetrics = {
  totalCovers: number
  totalRevenueCents: number
  totalFoodCostCents: number
  totalLaborCostCents: number
  totalWasteCents: number
  avgFoodCostPct: number
  avgLaborCostPct: number
  avgPrimeCostPct: number
  totalOrders: number
  avgTicketCents: number
  byLocation: Array<{
    locationId: string
    locationName: string
    coversServed: number
    revenueCents: number
    foodCostPct: number
    laborCostPct: number
    ordersCount: number
  }>
}

// ─── Schemas ─────────────────────────────────────────────────────

const RecordMetricsSchema = z.object({
  locationId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  coversServed: z.number().int().min(0).optional(),
  ordersCount: z.number().int().min(0).optional(),
  onlineOrdersCount: z.number().int().min(0).optional(),
  deliveryOrdersCount: z.number().int().min(0).optional(),
  counterOrdersCount: z.number().int().min(0).optional(),
  revenueCents: z.number().int().min(0).optional(),
  avgTicketCents: z.number().int().min(0).optional(),
  foodCostCents: z.number().int().min(0).optional(),
  laborCostCents: z.number().int().min(0).optional(),
  wasteCents: z.number().int().min(0).optional(),
  otherCostCents: z.number().int().min(0).optional(),
  staffHours: z.number().min(0).optional(),
  staffCount: z.number().int().min(0).optional(),
  peakHourOrders: z.record(z.string(), z.number()).optional(),
  avgTicketTimeMinutes: z.number().min(0).optional(),
})

// ─── Helpers ─────────────────────────────────────────────────────

function mapMetrics(row: any): DailyMetrics {
  return {
    id: row.id,
    locationId: row.location_id,
    date: row.date,
    coversServed: row.covers_served ?? 0,
    ordersCount: row.orders_count ?? 0,
    onlineOrdersCount: row.online_orders_count ?? 0,
    deliveryOrdersCount: row.delivery_orders_count ?? 0,
    counterOrdersCount: row.counter_orders_count ?? 0,
    revenueCents: row.revenue_cents ?? 0,
    avgTicketCents: row.avg_ticket_cents ?? 0,
    foodCostCents: row.food_cost_cents ?? 0,
    laborCostCents: row.labor_cost_cents ?? 0,
    wasteCents: row.waste_cents ?? 0,
    otherCostCents: row.other_cost_cents ?? 0,
    foodCostPct: row.food_cost_pct ? Number(row.food_cost_pct) : null,
    laborCostPct: row.labor_cost_pct ? Number(row.labor_cost_pct) : null,
    primeCostPct: row.prime_cost_pct ? Number(row.prime_cost_pct) : null,
    staffHours: Number(row.staff_hours ?? 0),
    staffCount: row.staff_count ?? 0,
    peakHourOrders: row.peak_hour_orders ?? {},
    avgTicketTimeMinutes: row.avg_ticket_time_minutes ? Number(row.avg_ticket_time_minutes) : null,
  }
}

// ─── Actions ─────────────────────────────────────────────────────

export async function recordDailyMetrics(
  input: z.infer<typeof RecordMetricsSchema>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const parsed = RecordMetricsSchema.parse(input)
  const db: any = createServerClient()

  const revenue = parsed.revenueCents ?? 0
  const foodCost = parsed.foodCostCents ?? 0
  const laborCost = parsed.laborCostCents ?? 0

  const foodCostPct = revenue > 0 ? (foodCost / revenue) * 100 : null
  const laborCostPct = revenue > 0 ? (laborCost / revenue) * 100 : null
  const primeCostPct = revenue > 0 ? ((foodCost + laborCost) / revenue) * 100 : null

  const { error } = await db.from('location_daily_metrics').upsert(
    {
      tenant_id: user.tenantId!,
      location_id: parsed.locationId,
      date: parsed.date,
      covers_served: parsed.coversServed ?? 0,
      orders_count: parsed.ordersCount ?? 0,
      online_orders_count: parsed.onlineOrdersCount ?? 0,
      delivery_orders_count: parsed.deliveryOrdersCount ?? 0,
      counter_orders_count: parsed.counterOrdersCount ?? 0,
      revenue_cents: revenue,
      avg_ticket_cents: parsed.avgTicketCents ?? 0,
      food_cost_cents: foodCost,
      labor_cost_cents: laborCost,
      waste_cents: parsed.wasteCents ?? 0,
      other_cost_cents: parsed.otherCostCents ?? 0,
      food_cost_pct: foodCostPct,
      labor_cost_pct: laborCostPct,
      prime_cost_pct: primeCostPct,
      staff_hours: parsed.staffHours ?? 0,
      staff_count: parsed.staffCount ?? 0,
      peak_hour_orders: parsed.peakHourOrders ?? {},
      avg_ticket_time_minutes: parsed.avgTicketTimeMinutes ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'location_id,date' }
  )

  if (error) return { success: false, error: error.message }

  revalidatePath('/locations')
  return { success: true }
}

export async function getLocationMetrics(
  locationId: string,
  startDate: string,
  endDate: string
): Promise<DailyMetrics[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('location_daily_metrics')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('location_id', locationId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  if (error) throw new Error(`Failed to get metrics: ${error.message}`)
  return (data ?? []).map(mapMetrics)
}

export async function getCrossLocationMetrics(date: string): Promise<CrossLocationMetrics> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all location metrics for this date
  const { data: metrics } = await db
    .from('location_daily_metrics')
    .select('*, business_locations!inner(name)')
    .eq('tenant_id', user.tenantId!)
    .eq('date', date)

  if (!metrics?.length) {
    return {
      totalCovers: 0,
      totalRevenueCents: 0,
      totalFoodCostCents: 0,
      totalLaborCostCents: 0,
      totalWasteCents: 0,
      avgFoodCostPct: 0,
      avgLaborCostPct: 0,
      avgPrimeCostPct: 0,
      totalOrders: 0,
      avgTicketCents: 0,
      byLocation: [],
    }
  }

  let totalCovers = 0
  let totalRevenue = 0
  let totalFoodCost = 0
  let totalLaborCost = 0
  let totalWaste = 0
  let totalOrders = 0

  const byLocation = metrics.map((m: any) => {
    const covers = m.covers_served ?? 0
    const revenue = m.revenue_cents ?? 0
    const foodCost = m.food_cost_cents ?? 0
    const laborCost = m.labor_cost_cents ?? 0
    const waste = m.waste_cents ?? 0
    const orders = m.orders_count ?? 0

    totalCovers += covers
    totalRevenue += revenue
    totalFoodCost += foodCost
    totalLaborCost += laborCost
    totalWaste += waste
    totalOrders += orders

    return {
      locationId: m.location_id,
      locationName: m.business_locations?.name ?? 'Unknown',
      coversServed: covers,
      revenueCents: revenue,
      foodCostPct: m.food_cost_pct ? Number(m.food_cost_pct) : 0,
      laborCostPct: m.labor_cost_pct ? Number(m.labor_cost_pct) : 0,
      ordersCount: orders,
    }
  })

  return {
    totalCovers,
    totalRevenueCents: totalRevenue,
    totalFoodCostCents: totalFoodCost,
    totalLaborCostCents: totalLaborCost,
    totalWasteCents: totalWaste,
    avgFoodCostPct: totalRevenue > 0 ? (totalFoodCost / totalRevenue) * 100 : 0,
    avgLaborCostPct: totalRevenue > 0 ? (totalLaborCost / totalRevenue) * 100 : 0,
    avgPrimeCostPct: totalRevenue > 0 ? ((totalFoodCost + totalLaborCost) / totalRevenue) * 100 : 0,
    totalOrders,
    avgTicketCents: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
    byLocation,
  }
}

export async function getMetricsTrend(
  days: number = 30
): Promise<
  Array<{ date: string; totalRevenueCents: number; totalCovers: number; totalOrders: number }>
> {
  const user = await requireChef()
  const db: any = createServerClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data } = await db
    .from('location_daily_metrics')
    .select('date, revenue_cents, covers_served, orders_count')
    .eq('tenant_id', user.tenantId!)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true })

  if (!data?.length) return []

  // Aggregate by date across all locations
  const byDate = new Map<string, { revenue: number; covers: number; orders: number }>()
  for (const row of data) {
    const existing = byDate.get(row.date) ?? { revenue: 0, covers: 0, orders: 0 }
    existing.revenue += row.revenue_cents ?? 0
    existing.covers += row.covers_served ?? 0
    existing.orders += row.orders_count ?? 0
    byDate.set(row.date, existing)
  }

  return Array.from(byDate.entries()).map(([date, vals]) => ({
    date,
    totalRevenueCents: vals.revenue,
    totalCovers: vals.covers,
    totalOrders: vals.orders,
  }))
}
