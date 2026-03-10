// Food Cost Tracker - Server Actions
// Deterministic math only (Formula > AI). Food cost % = (food spend / revenue) * 100.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// Food-related expense categories from the canonical list
const FOOD_CATEGORIES = ['groceries', 'alcohol', 'specialty_items'] as const

// Map expense categories to food cost groupings for breakdown
const FOOD_COST_GROUPS: Record<string, string> = {
  groceries: 'Produce & Groceries',
  alcohol: 'Beverages',
  specialty_items: 'Specialty Items',
}

type FoodCostResult = {
  spendCents: number
  revenueCents: number
  foodCostPercent: number
  targetPercent: number
}

type DailyFoodCost = {
  date: string
  foodCostPercent: number
  spendCents: number
  revenueCents: number
}

type CategoryBreakdown = {
  category: string
  label: string
  spendCents: number
  percentageOfTotal: number
}

/**
 * Get food cost for today
 */
export async function getFoodCostToday(): Promise<FoodCostResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const today = new Date().toISOString().slice(0, 10)

  const [expenseResult, revenueResult, prefResult] = await Promise.all([
    supabase
      .from('expenses')
      .select('amount_cents, category')
      .eq('tenant_id', user.tenantId!)
      .in('category', FOOD_CATEGORIES)
      .gte('expense_date', today)
      .lte('expense_date', today),
    supabase
      .from('ledger_entries')
      .select('amount_cents, entry_type, is_refund')
      .eq('tenant_id', user.tenantId!)
      .gte('created_at', today + 'T00:00:00')
      .lte('created_at', today + 'T23:59:59'),
    supabase
      .from('chef_preferences')
      .select('food_cost_target_percent')
      .eq('chef_id', user.tenantId!)
      .single(),
  ])

  const spendCents = (expenseResult.data || []).reduce(
    (sum: number, e: any) => sum + e.amount_cents,
    0
  )
  const revenueCents = computeRevenue(revenueResult.data || [])
  const targetPercent = prefResult.data?.food_cost_target_percent ?? 30

  return {
    spendCents,
    revenueCents,
    foodCostPercent: revenueCents > 0 ? Math.round((spendCents / revenueCents) * 1000) / 10 : 0,
    targetPercent,
  }
}

/**
 * Get food cost for a date range with daily breakdown
 */
export async function getFoodCostForPeriod(
  startDate: string,
  endDate: string
): Promise<{ daily: DailyFoodCost[]; totals: FoodCostResult }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const [expenseResult, revenueResult, prefResult] = await Promise.all([
    supabase
      .from('expenses')
      .select('amount_cents, category, expense_date')
      .eq('tenant_id', user.tenantId!)
      .in('category', FOOD_CATEGORIES)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .limit(10_000),
    supabase
      .from('ledger_entries')
      .select('amount_cents, entry_type, is_refund, created_at')
      .eq('tenant_id', user.tenantId!)
      .gte('created_at', startDate + 'T00:00:00')
      .lte('created_at', endDate + 'T23:59:59')
      .limit(50_000),
    supabase
      .from('chef_preferences')
      .select('food_cost_target_percent')
      .eq('chef_id', user.tenantId!)
      .single(),
  ])

  const expenses = expenseResult.data || []
  const ledger = revenueResult.data || []
  const targetPercent = prefResult.data?.food_cost_target_percent ?? 30

  // Group by date
  const dailySpend = new Map<string, number>()
  const dailyRevenue = new Map<string, number>()

  for (const exp of expenses) {
    const d = exp.expense_date
    dailySpend.set(d, (dailySpend.get(d) || 0) + exp.amount_cents)
  }

  for (const entry of ledger) {
    const d = (entry.created_at as string).slice(0, 10)
    const rev = entryRevenue(entry)
    dailyRevenue.set(d, (dailyRevenue.get(d) || 0) + rev)
  }

  // Collect all dates
  const allDates = new Set([...dailySpend.keys(), ...dailyRevenue.keys()])
  const sortedDates = Array.from(allDates).sort()

  let totalSpend = 0
  let totalRevenue = 0

  const daily: DailyFoodCost[] = sortedDates.map((date) => {
    const spend = dailySpend.get(date) || 0
    const revenue = dailyRevenue.get(date) || 0
    totalSpend += spend
    totalRevenue += revenue
    return {
      date,
      spendCents: spend,
      revenueCents: revenue,
      foodCostPercent: revenue > 0 ? Math.round((spend / revenue) * 1000) / 10 : 0,
    }
  })

  return {
    daily,
    totals: {
      spendCents: totalSpend,
      revenueCents: totalRevenue,
      foodCostPercent: totalRevenue > 0 ? Math.round((totalSpend / totalRevenue) * 1000) / 10 : 0,
      targetPercent,
    },
  }
}

/**
 * Break down food costs by category
 */
export async function getFoodCostByCategory(): Promise<CategoryBreakdown[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Current month
  const now = new Date()
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const endDate = now.toISOString().slice(0, 10)

  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount_cents, category')
    .eq('tenant_id', user.tenantId!)
    .in('category', FOOD_CATEGORIES)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .limit(10_000)

  const byCategory = new Map<string, number>()
  let totalSpend = 0

  for (const exp of expenses || []) {
    const cat = exp.category || 'other'
    byCategory.set(cat, (byCategory.get(cat) || 0) + exp.amount_cents)
    totalSpend += exp.amount_cents
  }

  return Array.from(byCategory.entries()).map(([category, spendCents]) => ({
    category,
    label: FOOD_COST_GROUPS[category] || category,
    spendCents,
    percentageOfTotal: totalSpend > 0 ? Math.round((spendCents / totalSpend) * 1000) / 10 : 0,
  }))
}

/**
 * Daily food cost trend for the last N days (default 30)
 */
export async function getFoodCostTrend(
  days = 30
): Promise<{ date: string; foodCostPercent: number }[]> {
  const now = new Date()
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - days)
  const start = startDate.toISOString().slice(0, 10)
  const end = now.toISOString().slice(0, 10)

  const result = await getFoodCostForPeriod(start, end)
  return result.daily.map((d) => ({
    date: d.date,
    foodCostPercent: d.foodCostPercent,
  }))
}

/**
 * Save food cost target percentage
 */
export async function setFoodCostTarget(
  targetPercent: number
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  if (targetPercent < 1 || targetPercent > 100) {
    return { success: false, error: 'Target must be between 1 and 100' }
  }

  const { error } = await supabase
    .from('chef_preferences')
    .update({ food_cost_target_percent: Math.round(targetPercent) })
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[setFoodCostTarget] Error:', error)
    return { success: false, error: 'Failed to save target' }
  }

  return { success: true }
}

/**
 * Per-event food cost breakdown using event_financial_summary view
 */
export async function getFoodCostByEvent(eventId?: string): Promise<
  {
    eventId: string
    occasion: string
    eventDate: string
    foodCostPercentage: number
    totalExpensesCents: number
    netRevenueCents: number
  }[]
> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('event_financial_summary')
    .select(
      'event_id, quoted_price_cents, total_expenses_cents, net_revenue_cents, food_cost_percentage'
    )
    .eq('tenant_id', user.tenantId!)
    .order('event_id', { ascending: false })
    .limit(100)

  if (eventId) {
    query = query.eq('event_id', eventId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getFoodCostByEvent] Error:', error)
    return []
  }

  // Get event details for display
  const eventIds = (data || []).map((d: any) => d.event_id)
  if (eventIds.length === 0) return []

  const { data: events } = await supabase
    .from('events')
    .select('id, occasion, event_date')
    .in('id', eventIds)

  const eventMap = new Map(
    (events || []).map((e: any) => [e.id, { occasion: e.occasion, eventDate: e.event_date }])
  )

  return (data || []).map((d: any) => {
    const evt = eventMap.get(d.event_id) || { occasion: 'Unknown', eventDate: '' }
    return {
      eventId: d.event_id,
      occasion: evt.occasion,
      eventDate: evt.eventDate,
      foodCostPercentage: d.food_cost_percentage ?? 0,
      totalExpensesCents: d.total_expenses_cents ?? 0,
      netRevenueCents: d.net_revenue_cents ?? 0,
    }
  })
}

// --- Helpers ---

function computeRevenue(entries: any[]): number {
  let total = 0
  for (const entry of entries) {
    total += entryRevenue(entry)
  }
  return total
}

function entryRevenue(entry: any): number {
  if (entry.is_refund || entry.entry_type === 'refund') {
    return -Math.abs(entry.amount_cents)
  }
  if (entry.entry_type === 'tip') {
    return 0 // Tips excluded from food cost calculation
  }
  return entry.amount_cents
}
