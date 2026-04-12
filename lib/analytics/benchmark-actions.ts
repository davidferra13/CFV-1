// Benchmark & Performance Snapshot Actions
// Computes and stores periodic performance metrics for trend analysis.
// Uses benchmark_snapshots table (chef_id FK, new table).

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// --- Types ---

export type BenchmarkSnapshot = {
  id: string
  chefId: string
  snapshotDate: string
  avgEventValueCents: number
  avgFoodCostPct: number
  bookingConversionRate: number
  clientReturnRate: number
  revenuePerHourCents: number
  createdAt: string
}

export type ConversionFunnel = {
  inquiries: number
  quotes: number
  accepted: number
  paid: number
  completed: number
  periodStart: string
  periodEnd: string
}

// --- Zod Schemas ---

const GetBenchmarkHistorySchema = z.object({
  months: z.number().int().min(1).max(24).optional(),
})

// --- Actions ---

/**
 * Compute all benchmark metrics from events/expenses/inquiries for today
 * and upsert into benchmark_snapshots.
 */
export async function computeBenchmarkSnapshot(): Promise<{
  success: boolean
  snapshot: BenchmarkSnapshot
}> {
  const user = await requireChef()
  const db: any = createServerClient()
  const _td = new Date()
  const today = `${_td.getFullYear()}-${String(_td.getMonth() + 1).padStart(2, '0')}-${String(_td.getDate()).padStart(2, '0')}`

  // 1. Average event value: mean total_amount_cents of completed events
  const { data: completedEvents } = await db
    .from('events')
    .select('id, quoted_price_cents, event_date, serve_time, departure_time')
    .eq('tenant_id', user.tenantId!)
    .eq('is_demo', false)
    .eq('status', 'completed')

  const events = completedEvents || []
  const avgEventValueCents =
    events.length > 0
      ? Math.round(
          events.reduce((sum: any, e: any) => sum + (e.quoted_price_cents || 0), 0) / events.length
        )
      : 0

  // 2. Average food cost %: total food expenses / total revenue * 100
  const totalRevenueCents = events.reduce(
    (sum: any, e: any) => sum + (e.quoted_price_cents || 0),
    0
  )

  const eventIds = events.map((e: any) => e.id)
  let totalFoodExpenseCents = 0
  if (eventIds.length > 0) {
    const { data: foodExpenses } = await db
      .from('expenses')
      .select('amount_cents')
      .eq('tenant_id', user.tenantId!)
      .eq('is_business', true)
      .in('category', ['groceries', 'alcohol', 'specialty_items'])
      .in('event_id', eventIds)

    totalFoodExpenseCents = (foodExpenses || []).reduce(
      (sum: any, e: any) => sum + e.amount_cents,
      0
    )
  }

  const avgFoodCostPct =
    totalRevenueCents > 0
      ? parseFloat(((totalFoodExpenseCents / totalRevenueCents) * 100).toFixed(2))
      : 0

  // 3. Booking conversion rate: completed events / total inquiries * 100
  const { count: inquiryCount } = await db
    .from('inquiries')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId!)
    .eq('is_demo', false)

  const bookingConversionRate =
    (inquiryCount ?? 0) > 0
      ? parseFloat(((events.length / (inquiryCount ?? 1)) * 100).toFixed(2))
      : 0

  // 4. Client return rate: clients with 2+ events / total clients * 100
  const { data: allClients } = await db.from('clients').select('id').eq('tenant_id', user.tenantId!)

  const totalClients = allClients?.length ?? 0

  // Count events per client
  const { data: clientEvents } = await db
    .from('events')
    .select('client_id')
    .eq('tenant_id', user.tenantId!)
    .eq('is_demo', false)
    .eq('status', 'completed')

  const clientEventCounts = new Map<string, number>()
  for (const ce of clientEvents || []) {
    if (ce.client_id) {
      clientEventCounts.set(ce.client_id, (clientEventCounts.get(ce.client_id) || 0) + 1)
    }
  }
  const returningClients = Array.from(clientEventCounts.values()).filter((c) => c >= 2).length
  const clientReturnRate =
    totalClients > 0 ? parseFloat(((returningClients / totalClients) * 100).toFixed(2)) : 0

  // 5. Revenue per hour: total revenue / total event hours
  // Use time tracking fields if available, otherwise estimate from serve_time/departure_time
  const { data: eventTimeData } = await db
    .from('events')
    .select(
      'time_service_minutes, time_prep_minutes, time_shopping_minutes, time_travel_minutes, time_reset_minutes'
    )
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')

  let totalHours = 0
  for (const e of eventTimeData || []) {
    const totalMinutes =
      (e.time_service_minutes ?? 0) +
      (e.time_prep_minutes ?? 0) +
      (e.time_shopping_minutes ?? 0) +
      (e.time_travel_minutes ?? 0) +
      (e.time_reset_minutes ?? 0)
    totalHours += totalMinutes / 60
  }

  // If no time data, estimate 4 hours per event as fallback
  if (totalHours === 0 && events.length > 0) {
    totalHours = events.length * 4
  }

  const revenuePerHourCents = totalHours > 0 ? Math.round(totalRevenueCents / totalHours) : 0

  // Upsert into benchmark_snapshots
  const { data: snapshot, error } = await db
    .from('benchmark_snapshots')
    .upsert(
      {
        chef_id: user.tenantId!,
        snapshot_date: today,
        avg_event_value_cents: avgEventValueCents,
        avg_food_cost_pct: avgFoodCostPct,
        booking_conversion_rate: bookingConversionRate,
        client_return_rate: clientReturnRate,
        revenue_per_hour_cents: revenuePerHourCents,
      },
      { onConflict: 'chef_id,snapshot_date' }
    )
    .select()
    .single()

  if (error) {
    console.error('[computeBenchmarkSnapshot] Error:', error)
    throw new Error('Failed to compute benchmark snapshot')
  }

  revalidatePath('/analytics')

  return {
    success: true,
    snapshot: {
      id: snapshot.id,
      chefId: snapshot.chef_id,
      snapshotDate: snapshot.snapshot_date,
      avgEventValueCents: snapshot.avg_event_value_cents,
      avgFoodCostPct: parseFloat(snapshot.avg_food_cost_pct),
      bookingConversionRate: parseFloat(snapshot.booking_conversion_rate),
      clientReturnRate: parseFloat(snapshot.client_return_rate),
      revenuePerHourCents: snapshot.revenue_per_hour_cents,
      createdAt: snapshot.created_at,
    },
  }
}

/**
 * Get benchmark snapshots for the last N months (default 6).
 */
export async function getBenchmarkHistory(months?: number): Promise<BenchmarkSnapshot[]> {
  const validated = GetBenchmarkHistorySchema.parse({ months })
  const monthCount = validated.months ?? 6

  const user = await requireChef()
  const db: any = createServerClient()

  const _now = new Date()
  const cutoffDate = new Date(_now.getFullYear(), _now.getMonth() - monthCount, _now.getDate())
  const cutoffStr = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}-${String(cutoffDate.getDate()).padStart(2, '0')}`

  const { data: snapshots, error } = await db
    .from('benchmark_snapshots')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .gte('snapshot_date', cutoffStr)
    .order('snapshot_date', { ascending: true })

  if (error) {
    console.error('[getBenchmarkHistory] Error:', error)
    return []
  }

  return (snapshots || []).map((s: any) => ({
    id: s.id,
    chefId: s.chef_id,
    snapshotDate: s.snapshot_date,
    avgEventValueCents: s.avg_event_value_cents,
    avgFoodCostPct: parseFloat(s.avg_food_cost_pct),
    bookingConversionRate: parseFloat(s.booking_conversion_rate),
    clientReturnRate: parseFloat(s.client_return_rate),
    revenuePerHourCents: s.revenue_per_hour_cents,
    createdAt: s.created_at,
  }))
}

/**
 * Get conversion funnel: inquiries -> quotes -> accepted -> paid -> completed
 * for the current calendar month.
 */
export async function getConversionFunnel(): Promise<ConversionFunnel> {
  const user = await requireChef()
  const db: any = createServerClient()

  const now = new Date()
  const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const nextMonth = now.getMonth() === 11 ? 1 : now.getMonth() + 2
  const nextYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear()
  const periodEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

  // Count inquiries created in the period
  const { count: inquiryCount } = await db
    .from('inquiries')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId!)
    .eq('is_demo', false)
    .gte('created_at', periodStart)
    .lt('created_at', periodEnd)

  // Count quotes sent (events with status >= proposed) in the period
  const { count: quoteCount } = await db
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId!)
    .eq('is_demo', false)
    .gte('created_at', periodStart)
    .lt('created_at', periodEnd)
    .not('status', 'eq', 'draft')

  // Count accepted events in the period
  const { count: acceptedCount } = await db
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId!)
    .eq('is_demo', false)
    .gte('created_at', periodStart)
    .lt('created_at', periodEnd)
    .in('status', ['accepted', 'paid', 'confirmed', 'in_progress', 'completed'])

  // Count paid events in the period
  const { count: paidCount } = await db
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId!)
    .eq('is_demo', false)
    .gte('created_at', periodStart)
    .lt('created_at', periodEnd)
    .in('status', ['paid', 'confirmed', 'in_progress', 'completed'])

  // Count completed events in the period
  const { count: completedCount } = await db
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId!)
    .eq('is_demo', false)
    .gte('created_at', periodStart)
    .lt('created_at', periodEnd)
    .eq('status', 'completed')

  return {
    inquiries: inquiryCount ?? 0,
    quotes: quoteCount ?? 0,
    accepted: acceptedCount ?? 0,
    paid: paidCount ?? 0,
    completed: completedCount ?? 0,
    periodStart,
    periodEnd,
  }
}
