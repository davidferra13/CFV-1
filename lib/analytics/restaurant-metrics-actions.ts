'use server'

// Restaurant Metrics - Server Actions
// Fetches data and delegates to pure computation functions.
// Covers: RQ3 (Daily P&L), RQ10 (Actual Food Cost), RQ24 (Prime Cost),
//         RQ27 (Revenue Per Labor Hour)

import { requireChef } from '@/lib/auth/get-user'
import { getProfitAndLossReport } from '@/lib/finance/profit-loss-report-actions'
import { getPayrollReportForPeriod } from '@/lib/staff/staffing-actions'
import { createServerClient } from '@/lib/db/server'
import {
  computeRestaurantSnapshot,
  computeRegisterFoodCost,
  type DailyRestaurantSnapshot,
  type RegisterFoodCostResult,
} from './restaurant-metrics'

// ── Daily Snapshot (RQ3 + RQ24 + RQ27) ────────────────────────────────

/**
 * Get a full restaurant daily snapshot for a given date.
 * Combines P&L, labor, and cover count into one unified view.
 * Works for any archetype but designed for restaurant daily ops.
 */
export async function getDailyRestaurantSnapshot(date: string): Promise<DailyRestaurantSnapshot> {
  await requireChef()

  // Parallel fetch: P&L + labor for the same day
  const [pnl, payroll, coverData] = await Promise.all([
    getProfitAndLossReport(date, date),
    getPayrollReportForPeriod(date, date),
    getDailyCoverCount(date),
  ])

  return computeRestaurantSnapshot(
    date,
    pnl,
    payroll.totalHours,
    payroll.totalLaborCostCents,
    coverData.coverCount
  )
}

/**
 * Get restaurant snapshots for a date range (e.g., last 7 days).
 * Returns array of daily snapshots for trend analysis.
 */
export async function getRestaurantSnapshotRange(
  startDate: string,
  endDate: string
): Promise<DailyRestaurantSnapshot[]> {
  await requireChef()

  const start = new Date(startDate + 'T00:00:00Z')
  const end = new Date(endDate + 'T00:00:00Z')
  const days: string[] = []

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().split('T')[0])
  }

  // Sequential to avoid overwhelming DB (7 days = 21 parallel queries otherwise)
  const snapshots: DailyRestaurantSnapshot[] = []
  for (const day of days) {
    const snapshot = await getDailyRestaurantSnapshot(day)
    snapshots.push(snapshot)
  }

  return snapshots
}

// ── Cover Count (RQ26) ─────────────────────────────────────────────────

/**
 * Get cover count for a given date from register sales.
 * Checks for guest_count on dining checks first, falls back to transaction count.
 */
async function getDailyCoverCount(
  date: string
): Promise<{ coverCount: number | null; transactionCount: number }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Try dining checks first (have explicit guest_count)
  const { data: diningChecks } = await db
    .from('dining_checks')
    .select('guest_count')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', `${date}T00:00:00Z`)
    .lte('created_at', `${date}T23:59:59Z`)
    .in('status', ['closed', 'settled'])

  let coverCount: number | null = null
  if (diningChecks && diningChecks.length > 0) {
    coverCount = diningChecks.reduce((sum: number, dc: any) => sum + (dc.guest_count ?? 1), 0)
  }

  // Always get transaction count
  const { count } = await db
    .from('sales')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', `${date}T00:00:00Z`)
    .lte('created_at', `${date}T23:59:59Z`)
    .in('status', ['captured', 'settled', 'partially_refunded'])

  const transactionCount = count ?? 0

  // If no dining check data, cover count stays null (not zero, per Zero Hallucination rules)
  return { coverCount, transactionCount }
}

// ── Register Food Cost (RQ10) ──────────────────────────────────────────

/**
 * Compute actual food cost from register sale items for a date.
 * Uses unit_cost_cents stored on sale_items (snapshotted from product/recipe cost).
 */
export async function getRegisterFoodCost(date: string): Promise<RegisterFoodCostResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all settled/captured sales for the date
  const { data: sales } = await db
    .from('sales')
    .select('id, total_cents')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', `${date}T00:00:00Z`)
    .lte('created_at', `${date}T23:59:59Z`)
    .in('status', ['captured', 'settled', 'partially_refunded'])

  if (!sales || sales.length === 0) {
    return computeRegisterFoodCost(date, [], 0)
  }

  const saleIds = sales.map((s: any) => s.id)
  const registerRevenueCents = sales.reduce((sum: number, s: any) => sum + (s.total_cents ?? 0), 0)

  // Get all items for these sales with cost data
  const { data: items } = await db
    .from('sale_items')
    .select('name, quantity, line_total_cents, unit_cost_cents')
    .in('sale_id', saleIds)

  const mappedItems = (items || []).map((item: any) => ({
    name: item.name,
    quantity: item.quantity ?? 1,
    lineTotalCents: item.line_total_cents ?? 0,
    unitCostCents: item.unit_cost_cents,
  }))

  return computeRegisterFoodCost(date, mappedItems, registerRevenueCents)
}
