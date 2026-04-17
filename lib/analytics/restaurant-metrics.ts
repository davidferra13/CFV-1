// Restaurant Metrics - KPIs for daily restaurant operations
// Formula > AI: all calculations are pure math, zero LLM dependency.
// Works for ANY archetype but designed for restaurant daily service.
//
// Covers: RQ3 (Daily P&L), RQ10 (Actual Food Cost), RQ24 (Prime Cost),
//         RQ27 (Revenue Per Labor Hour), RQ26 (Cover Count)
//
// NOT a 'use server' file - these are pure computation functions.
// Wrap in a server action file to call from client components.

import type { ProfitAndLossReportData } from '@/lib/finance/profit-loss-report-actions'

// ── Types ──────────────────────────────────────────────────────────────

export type DailyRestaurantSnapshot = {
  date: string
  revenue: {
    totalCents: number
    registerCents: number
    eventCents: number
    otherCents: number
  }
  costs: {
    cogsCents: number
    laborCents: number
    expensesCents: number
  }
  kpis: {
    primeCostCents: number
    primeCostPercent: number
    foodCostPercent: number
    laborCostPercent: number
    netProfitCents: number
    profitMarginPercent: number
    revenuePerLaborHour: number
    laborHours: number
    coverCount: number | null
    revenuePerCover: number | null
  }
  benchmarks: {
    primeCostTarget: number // 60% industry standard
    primeCostStatus: 'healthy' | 'warning' | 'critical'
    laborTarget: number // 30% industry standard
    laborStatus: 'healthy' | 'warning' | 'critical'
    foodCostTarget: number // 30% industry standard
    foodCostStatus: 'healthy' | 'warning' | 'critical'
    revPerLaborHourTarget: number // $40 industry standard
    revPerLaborHourStatus: 'healthy' | 'warning' | 'critical'
  }
}

export type RegisterFoodCostResult = {
  date: string
  theoreticalCostCents: number
  registerRevenueCents: number
  theoreticalFoodCostPercent: number
  itemsWithCost: number
  itemsWithoutCost: number
  topCostItems: Array<{
    name: string
    quantity: number
    revenueCents: number
    costCents: number
    marginPercent: number
  }>
}

// ── Industry Benchmarks ────────────────────────────────────────────────

const BENCHMARKS = {
  primeCostPercent: 60, // Food + labor should be under 60%
  laborPercent: 30, // Labor should be under 30%
  foodCostPercent: 30, // Food cost should be under 30%
  revenuePerLaborHour: 4000, // $40/hour in cents
} as const

function benchmarkStatus(
  actual: number,
  target: number,
  warningBuffer: number = 5
): 'healthy' | 'warning' | 'critical' {
  if (actual <= target) return 'healthy'
  if (actual <= target + warningBuffer) return 'warning'
  return 'critical'
}

function revPerHourStatus(actual: number, target: number): 'healthy' | 'warning' | 'critical' {
  // Inverse: higher is better
  if (actual >= target) return 'healthy'
  if (actual >= target * 0.8) return 'warning'
  return 'critical'
}

// ── Core Computation ───────────────────────────────────────────────────

/**
 * Build a restaurant daily snapshot from P&L data + labor data.
 * This is a pure function: give it the data, get the metrics back.
 * The server action layer handles auth, DB queries, and date ranges.
 */
export function computeRestaurantSnapshot(
  date: string,
  pnl: ProfitAndLossReportData,
  laborHours: number,
  laborCostCents: number,
  coverCount: number | null
): DailyRestaurantSnapshot {
  const totalRevenue = pnl.revenue.totalRevenueCents
  const cogsCents = pnl.cogs.purchaseOrdersCents
  const primeCostCents = cogsCents + laborCostCents

  const primeCostPercent =
    totalRevenue > 0 ? Math.round((primeCostCents / totalRevenue) * 10000) / 100 : 0

  const foodCostPercent =
    totalRevenue > 0 ? Math.round((cogsCents / totalRevenue) * 10000) / 100 : 0

  const laborCostPercent =
    totalRevenue > 0 ? Math.round((laborCostCents / totalRevenue) * 10000) / 100 : 0

  const netProfitCents = pnl.totals.netProfitLossCents

  const profitMarginPercent = pnl.totals.profitMarginPercent

  // Revenue per labor hour (in cents)
  const revenuePerLaborHour = laborHours > 0 ? Math.round(totalRevenue / laborHours) : 0

  // Revenue per cover
  const revenuePerCover =
    coverCount != null && coverCount > 0 ? Math.round(totalRevenue / coverCount) : null

  return {
    date,
    revenue: {
      totalCents: totalRevenue,
      registerCents: pnl.revenue.commerceRevenueCents + pnl.revenue.salesRevenueCents,
      eventCents: pnl.revenue.billingRevenueCents,
      otherCents: 0,
    },
    costs: {
      cogsCents,
      laborCents: laborCostCents,
      expensesCents: pnl.operatingExpenses.expenseTableCents,
    },
    kpis: {
      primeCostCents,
      primeCostPercent,
      foodCostPercent,
      laborCostPercent,
      netProfitCents,
      profitMarginPercent,
      revenuePerLaborHour,
      laborHours,
      coverCount,
      revenuePerCover,
    },
    benchmarks: {
      primeCostTarget: BENCHMARKS.primeCostPercent,
      primeCostStatus: benchmarkStatus(primeCostPercent, BENCHMARKS.primeCostPercent),
      laborTarget: BENCHMARKS.laborPercent,
      laborStatus: benchmarkStatus(laborCostPercent, BENCHMARKS.laborPercent),
      foodCostTarget: BENCHMARKS.foodCostPercent,
      foodCostStatus: benchmarkStatus(foodCostPercent, BENCHMARKS.foodCostPercent),
      revPerLaborHourTarget: BENCHMARKS.revenuePerLaborHour,
      revPerLaborHourStatus: revPerHourStatus(revenuePerLaborHour, BENCHMARKS.revenuePerLaborHour),
    },
  }
}

/**
 * Compute actual food cost from register sale items that carry unit_cost_cents.
 * This bridges RQ10: theoretical food cost from product cost data on sold items.
 */
export function computeRegisterFoodCost(
  date: string,
  items: Array<{
    name: string
    quantity: number
    lineTotalCents: number
    unitCostCents: number | null
  }>,
  registerRevenueCents: number
): RegisterFoodCostResult {
  let theoreticalCostCents = 0
  let itemsWithCost = 0
  let itemsWithoutCost = 0

  const itemCosts: RegisterFoodCostResult['topCostItems'] = []

  for (const item of items) {
    if (item.unitCostCents != null && item.unitCostCents > 0) {
      const costTotal = item.unitCostCents * item.quantity
      theoreticalCostCents += costTotal
      itemsWithCost++

      const marginPercent =
        item.lineTotalCents > 0
          ? Math.round(((item.lineTotalCents - costTotal) / item.lineTotalCents) * 10000) / 100
          : 0

      itemCosts.push({
        name: item.name,
        quantity: item.quantity,
        revenueCents: item.lineTotalCents,
        costCents: costTotal,
        marginPercent,
      })
    } else {
      itemsWithoutCost++
    }
  }

  // Sort by cost descending
  itemCosts.sort((a, b) => b.costCents - a.costCents)

  const theoreticalFoodCostPercent =
    registerRevenueCents > 0
      ? Math.round((theoreticalCostCents / registerRevenueCents) * 10000) / 100
      : 0

  return {
    date,
    theoreticalCostCents,
    registerRevenueCents,
    theoreticalFoodCostPercent,
    itemsWithCost,
    itemsWithoutCost,
    topCostItems: itemCosts.slice(0, 10),
  }
}
