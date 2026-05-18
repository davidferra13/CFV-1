'use server'

// Profitability Cockpit: aggregates event-level financial data into a unified
// cost breakdown, margin analysis, per-guest economics, food cost %, and labor
// allocation payload. Wires into closeout data, costing, and expense domains.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getTargetsForArchetype, type OperatorTargets } from '@/lib/costing/knowledge'

// ── Types ──────────────────────────────────────────────────────────────

export interface CostBreakdownLine {
  category: string
  label: string
  totalCents: number
  perGuestCents: number | null
  percentOfRevenue: number | null
}

export interface MarginAnalysis {
  revenueCents: number
  totalCostCents: number
  grossProfitCents: number
  grossMarginPercent: number
  /** Food + labor as % of revenue */
  primeCostPercent: number | null
  effectiveHourlyRateCents: number | null
  totalMinutesWorked: number | null
}

export interface PerGuestEconomics {
  guestCount: number
  revenuePerGuestCents: number
  costPerGuestCents: number
  foodCostPerGuestCents: number
  laborCostPerGuestCents: number
  overheadPerGuestCents: number
  profitPerGuestCents: number
}

export interface FoodCostAnalysis {
  foodCostCents: number
  foodCostPercent: number | null
  chefAvgFoodCostPercent: number | null
  targets: { low: number; high: number }
  rating: 'excellent' | 'good' | 'fair' | 'high'
  /** From recipe costing (menu_cost_summary), if available */
  recipeCostCents: number | null
  recipeCostComplete: boolean
}

export interface LaborAllocationEntry {
  staffName: string
  role: string
  hours: number | null
  payCents: number
}

export interface LaborAllocation {
  entries: LaborAllocationEntry[]
  totalLaborCents: number
  totalHours: number
  laborPercentOfRevenue: number | null
}

export interface ProfitabilityCockpitData {
  eventId: string
  hasFinancialData: boolean
  /** Quoted price in cents */
  quotedPriceCents: number | null
  costBreakdown: CostBreakdownLine[]
  margin: MarginAnalysis
  perGuest: PerGuestEconomics | null
  foodCost: FoodCostAnalysis
  labor: LaborAllocation
  operatorTargets: OperatorTargets
  /** Time breakdown if chef logged time */
  timeBreakdown: {
    shoppingMinutes: number
    prepMinutes: number
    travelMinutes: number
    serviceMinutes: number
    resetMinutes: number
    totalMinutes: number
  } | null
  /** Cashback estimate from credit card rewards */
  estimatedCashbackCents: number
}

// ── Server Action ──────────────────────────────────────────────────────

export async function getEventProfitabilityCockpit(
  eventId: string
): Promise<ProfitabilityCockpitData | null> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Parallel fetch: financial summary, expenses, event data, labor, menu cost, archetype
  const [financialRes, expensesRes, eventRes, laborRes, menuCostRes, prefsRes] = await Promise.all([
    db
      .from('event_financial_summary')
      .select('*')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .single()
      .catch(() => ({ data: null })),
    db
      .from('expenses')
      .select('category, amount_cents, is_business, payment_card_used, card_cashback_percent')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .catch(() => ({ data: [] })),
    db
      .from('events')
      .select(
        'id, quoted_price_cents, guest_count, event_date, occasion, time_shopping_minutes, time_prep_minutes, time_travel_minutes, time_service_minutes, time_reset_minutes, estimated_food_cost_cents, menu_id'
      )
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single()
      .catch(() => ({ data: null })),
    db
      .from('event_staff_assignments')
      .select(
        'id, scheduled_hours, actual_hours, pay_amount_cents, role_override, staff_members (name, role)'
      )
      .eq('event_id', eventId)
      .eq('chef_id', tenantId)
      .order('created_at')
      .catch(() => ({ data: [] })),
    db
      .from('menu_cost_summary')
      .select(
        'total_recipe_cost_cents, cost_per_guest_cents, food_cost_percentage, has_all_recipe_costs'
      )
      .eq('event_id', eventId)
      .single()
      .catch(() => ({ data: null })),
    db
      .from('chef_preferences')
      .select('archetype')
      .eq('tenant_id', tenantId)
      .single()
      .catch(() => ({ data: null })),
  ])

  const summary = financialRes?.data
  const expenses = expensesRes?.data || []
  const event = eventRes?.data
  const laborRows = laborRes?.data || []
  const menuCost = menuCostRes?.data
  const archetype = prefsRes?.data?.archetype ?? 'private-chef'
  const operatorTargets = getTargetsForArchetype(archetype)

  if (!event) return null

  // ── Expense aggregation ──
  const categoryTotals: Record<string, number> = {}
  let totalBusinessCents = 0
  let estimatedCashbackCents = 0

  for (const exp of expenses) {
    if (!exp.is_business) continue
    totalBusinessCents += exp.amount_cents
    const cat = exp.category || 'other'
    categoryTotals[cat] = (categoryTotals[cat] || 0) + exp.amount_cents

    if (exp.card_cashback_percent && exp.card_cashback_percent > 0) {
      estimatedCashbackCents += Math.round((exp.amount_cents * exp.card_cashback_percent) / 100)
    }
  }

  // ── Revenue ──
  const totalPaidCents = summary?.total_paid_cents ?? 0
  const tipCents = summary?.tip_amount_cents ?? 0
  const revenueCents = totalPaidCents + tipCents
  const quotedPriceCents = event.quoted_price_cents ?? null

  // ── Labor from staff assignments ──
  let totalLaborCents = 0
  let totalLaborHours = 0
  const laborEntries: LaborAllocationEntry[] = []

  for (const row of laborRows) {
    const hours = row.actual_hours ?? row.scheduled_hours ?? null
    const pay = row.pay_amount_cents ?? 0
    totalLaborCents += pay
    totalLaborHours += hours ?? 0
    laborEntries.push({
      staffName: row.staff_members?.name ?? 'Unknown',
      role: row.role_override || row.staff_members?.role || 'Staff',
      hours,
      payCents: pay,
    })
  }

  // ── Food cost (from expenses) ──
  const foodCategories = ['groceries', 'alcohol', 'specialty_items', 'food']
  const foodCostFromExpenses = foodCategories.reduce(
    (sum, cat) => sum + (categoryTotals[cat] || 0),
    0
  )

  const travelCategories = ['gas_mileage', 'vehicle', 'mileage']
  const laborExpenseCategories = ['labor']
  const travelCents = travelCategories.reduce((s, c) => s + (categoryTotals[c] || 0), 0)
  const laborExpenseCents = laborExpenseCategories.reduce((s, c) => s + (categoryTotals[c] || 0), 0)
  const overheadCents = totalBusinessCents - foodCostFromExpenses - travelCents - laborExpenseCents

  // Total cost = expenses + staff labor
  const totalCostCents = totalBusinessCents + totalLaborCents

  // ── Cost breakdown lines ──
  const guestCount = event.guest_count ?? null
  const costBreakdown: CostBreakdownLine[] = []

  const groups = [
    { category: 'food', label: 'Ingredients', cents: foodCostFromExpenses },
    { category: 'labor', label: 'Staff Labor', cents: totalLaborCents },
    { category: 'labor_expense', label: 'Labor (Expenses)', cents: laborExpenseCents },
    { category: 'travel', label: 'Travel', cents: travelCents },
    { category: 'overhead', label: 'Overhead', cents: overheadCents > 0 ? overheadCents : 0 },
  ]

  for (const g of groups) {
    if (g.cents <= 0) continue
    costBreakdown.push({
      category: g.category,
      label: g.label,
      totalCents: g.cents,
      perGuestCents: guestCount && guestCount > 0 ? Math.round(g.cents / guestCount) : null,
      percentOfRevenue: revenueCents > 0 ? Math.round((g.cents / revenueCents) * 1000) / 10 : null,
    })
  }

  costBreakdown.sort((a, b) => b.totalCents - a.totalCents)

  // ── Margin analysis ──
  const grossProfitCents = revenueCents - totalCostCents
  const grossMarginPercent =
    revenueCents > 0 ? Math.round(((revenueCents - totalCostCents) / revenueCents) * 1000) / 10 : 0

  const totalLaborAll = totalLaborCents + laborExpenseCents
  const primeCostCents = foodCostFromExpenses + totalLaborAll
  const primeCostPercent =
    revenueCents > 0 ? Math.round((primeCostCents / revenueCents) * 1000) / 10 : null

  const totalMinutes =
    (event.time_shopping_minutes ?? 0) +
    (event.time_prep_minutes ?? 0) +
    (event.time_travel_minutes ?? 0) +
    (event.time_service_minutes ?? 0) +
    (event.time_reset_minutes ?? 0)
  const hasTimeData = totalMinutes > 0
  const effectiveHourlyRateCents =
    hasTimeData && grossProfitCents > 0 ? Math.round((grossProfitCents / totalMinutes) * 60) : null

  // ── Food cost analysis ──
  const foodCostPercent =
    revenueCents > 0 ? Math.round((foodCostFromExpenses / revenueCents) * 1000) / 10 : null

  let chefAvgFoodCostPercent: number | null = null
  try {
    const { data: historicalRows } = await db
      .from('event_financial_summary')
      .select('food_cost_percentage')
      .eq('tenant_id', tenantId)
      .neq('event_id', eventId)
      .not('food_cost_percentage', 'is', null)
      .limit(20)

    if (historicalRows && historicalRows.length >= 3) {
      const values = historicalRows
        .map((r: any) => parseFloat(String(r.food_cost_percentage)))
        .filter((v: number) => !isNaN(v) && v > 0)
      if (values.length >= 3) {
        chefAvgFoodCostPercent = parseFloat(
          (values.reduce((s: number, v: number) => s + v, 0) / values.length).toFixed(1)
        )
      }
    }
  } catch {
    // Non-blocking
  }

  const fcPct = foodCostPercent ?? 0
  const targets = operatorTargets
  let foodCostRating: 'excellent' | 'good' | 'fair' | 'high' = 'good'
  if (fcPct > 0) {
    const midpoint = (targets.foodCostPctLow + targets.foodCostPctHigh) / 2
    if (fcPct < targets.foodCostPctLow) foodCostRating = 'excellent'
    else if (fcPct <= midpoint) foodCostRating = 'good'
    else if (fcPct <= targets.foodCostPctHigh) foodCostRating = 'fair'
    else foodCostRating = 'high'
  }

  // ── Per-guest economics ──
  let perGuest: PerGuestEconomics | null = null
  if (guestCount && guestCount > 0 && revenueCents > 0) {
    perGuest = {
      guestCount,
      revenuePerGuestCents: Math.round(revenueCents / guestCount),
      costPerGuestCents: Math.round(totalCostCents / guestCount),
      foodCostPerGuestCents: Math.round(foodCostFromExpenses / guestCount),
      laborCostPerGuestCents: Math.round(totalLaborAll / guestCount),
      overheadPerGuestCents: Math.round(
        (travelCents + (overheadCents > 0 ? overheadCents : 0)) / guestCount
      ),
      profitPerGuestCents: Math.round(grossProfitCents / guestCount),
    }
  }

  const hasFinancialData = revenueCents > 0 || totalBusinessCents > 0

  return {
    eventId,
    hasFinancialData,
    quotedPriceCents,
    costBreakdown,
    margin: {
      revenueCents,
      totalCostCents,
      grossProfitCents,
      grossMarginPercent,
      primeCostPercent,
      effectiveHourlyRateCents,
      totalMinutesWorked: hasTimeData ? totalMinutes : null,
    },
    perGuest,
    foodCost: {
      foodCostCents: foodCostFromExpenses,
      foodCostPercent,
      chefAvgFoodCostPercent,
      targets: { low: targets.foodCostPctLow, high: targets.foodCostPctHigh },
      rating: foodCostRating,
      recipeCostCents: menuCost?.total_recipe_cost_cents ?? null,
      recipeCostComplete: menuCost?.has_all_recipe_costs ?? false,
    },
    labor: {
      entries: laborEntries,
      totalLaborCents,
      totalHours: totalLaborHours,
      laborPercentOfRevenue:
        revenueCents > 0 ? Math.round((totalLaborAll / revenueCents) * 1000) / 10 : null,
    },
    operatorTargets: targets,
    timeBreakdown: hasTimeData
      ? {
          shoppingMinutes: event.time_shopping_minutes ?? 0,
          prepMinutes: event.time_prep_minutes ?? 0,
          travelMinutes: event.time_travel_minutes ?? 0,
          serviceMinutes: event.time_service_minutes ?? 0,
          resetMinutes: event.time_reset_minutes ?? 0,
          totalMinutes,
        }
      : null,
    estimatedCashbackCents,
  }
}
