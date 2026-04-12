'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// -- Types --

export type BreakEvenStatus = 'profitable' | 'break-even' | 'below-break-even'

export type BreakEvenResult = {
  avgRevenuePerEventCents: number
  avgVariableCostPerEventCents: number
  contributionMarginCents: number
  breakEvenEvents: number
  currentMonthlyEventCount: number
  status: BreakEvenStatus
  monthlyFixedCostsCents: number
  monthlySurplusDeficitCents: number
  completedEventCount: number
}

export type BreakEvenScenario = {
  label: string
  avgRevenuePerEventCents: number
  contributionMarginCents: number
  breakEvenEvents: number
  status: BreakEvenStatus
}

export type FixedCostEstimate = {
  totalCents: number
  breakdown: Array<{
    category: string
    amountCents: number
  }>
} | null

// -- Helpers --

function deriveStatus(breakEvenEvents: number, currentMonthlyCount: number): BreakEvenStatus {
  if (breakEvenEvents === Infinity) return 'below-break-even'
  if (currentMonthlyCount >= breakEvenEvents * 1.05) return 'profitable'
  if (currentMonthlyCount >= breakEvenEvents * 0.95) return 'break-even'
  return 'below-break-even'
}

// -- Server Actions --

/**
 * Calculate break-even point from real event data.
 * Uses completed events from event_financial_summary view.
 * Monthly fixed costs are provided by the chef (rent, insurance, etc.).
 */
export async function calculateBreakEven(monthlyFixedCostsCents: number): Promise<BreakEvenResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Get all completed events with financials
  const { data: events } = await db
    .from('events')
    .select('id, event_date, status')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .order('event_date', { ascending: false })

  const completedEvents = events || []
  const eventIds = completedEvents.map((e: any) => e.id)

  // Fetch financials for completed events
  let totalRevenueCents = 0
  let totalExpensesCents = 0

  if (eventIds.length > 0) {
    const { data: financials } = await db
      .from('event_financial_summary')
      .select('event_id, net_revenue_cents, total_expenses_cents')
      .eq('tenant_id', tenantId)
      .in('event_id', eventIds)

    for (const f of financials || []) {
      totalRevenueCents += f.net_revenue_cents ?? 0
      totalExpensesCents += f.total_expenses_cents ?? 0
    }
  }

  const eventCount = completedEvents.length

  // If no completed events, return zeros (not an error, just no data yet)
  if (eventCount === 0) {
    return {
      avgRevenuePerEventCents: 0,
      avgVariableCostPerEventCents: 0,
      contributionMarginCents: 0,
      breakEvenEvents: Infinity,
      currentMonthlyEventCount: 0,
      status: 'below-break-even',
      monthlyFixedCostsCents,
      monthlySurplusDeficitCents: -monthlyFixedCostsCents,
      completedEventCount: 0,
    }
  }

  const avgRevenue = Math.round(totalRevenueCents / eventCount)
  const avgVariable = Math.round(totalExpensesCents / eventCount)
  const contributionMargin = avgRevenue - avgVariable

  // Break-even calculation
  const breakEvenEvents =
    contributionMargin <= 0 ? Infinity : monthlyFixedCostsCents / contributionMargin

  // Current monthly pace: average events per month over last 3 months
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const recentEvents = completedEvents.filter((e: any) => new Date(e.event_date) >= threeMonthsAgo)
  // Use 3 months as the denominator, or fewer if the chef has less history
  const firstEventDate = completedEvents[completedEvents.length - 1]?.event_date
  const monthsOfHistory = firstEventDate
    ? Math.max(
        1,
        Math.min(
          3,
          (Date.now() - new Date(firstEventDate).getTime()) / (30.44 * 24 * 60 * 60 * 1000)
        )
      )
    : 1
  const currentMonthlyCount =
    recentEvents.length > 0
      ? Math.round((recentEvents.length / Math.min(3, monthsOfHistory)) * 10) / 10
      : 0

  const status = deriveStatus(breakEvenEvents, currentMonthlyCount)

  // Monthly surplus or deficit
  const monthlyContribution = currentMonthlyCount * contributionMargin
  const monthlySurplusDeficit = monthlyContribution - monthlyFixedCostsCents

  return {
    avgRevenuePerEventCents: avgRevenue,
    avgVariableCostPerEventCents: avgVariable,
    contributionMarginCents: contributionMargin,
    breakEvenEvents:
      breakEvenEvents === Infinity ? Infinity : Math.round(breakEvenEvents * 10) / 10,
    currentMonthlyEventCount: currentMonthlyCount,
    status,
    monthlyFixedCostsCents,
    monthlySurplusDeficitCents: Math.round(monthlySurplusDeficit),
    completedEventCount: eventCount,
  }
}

/**
 * Generate "what if" scenarios varying average event price.
 * Shows break-even at -20%, -10%, current, +10%, +20%, +50% price points.
 */
export async function getBreakEvenScenarios(
  monthlyFixedCostsCents: number
): Promise<BreakEvenScenario[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Same data pull as calculateBreakEven
  const { data: events } = await db
    .from('events')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')

  const eventIds = (events || []).map((e: any) => e.id)
  if (eventIds.length === 0) return []

  const { data: financials } = await db
    .from('event_financial_summary')
    .select('net_revenue_cents, total_expenses_cents')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  let totalRevenue = 0
  let totalExpenses = 0
  for (const f of financials || []) {
    totalRevenue += f.net_revenue_cents ?? 0
    totalExpenses += f.total_expenses_cents ?? 0
  }

  const count = eventIds.length
  const avgRevenue = Math.round(totalRevenue / count)
  const avgVariable = Math.round(totalExpenses / count)

  const multipliers = [
    { label: 'Price -20%', factor: 0.8 },
    { label: 'Price -10%', factor: 0.9 },
    { label: 'Current price', factor: 1.0 },
    { label: 'Price +10%', factor: 1.1 },
    { label: 'Price +20%', factor: 1.2 },
    { label: 'Price +50%', factor: 1.5 },
  ]

  return multipliers.map(({ label, factor }) => {
    const adjustedRevenue = Math.round(avgRevenue * factor)
    const margin = adjustedRevenue - avgVariable
    const breakEven = margin <= 0 ? Infinity : monthlyFixedCostsCents / margin

    return {
      label,
      avgRevenuePerEventCents: adjustedRevenue,
      contributionMarginCents: margin,
      breakEvenEvents: breakEven === Infinity ? Infinity : Math.round(breakEven * 10) / 10,
      status: deriveStatus(breakEven, 0), // status relative to 0 pace (scenario only)
    }
  })
}

/**
 * Try to estimate monthly fixed costs from expense records.
 * Returns null if no expense data is available.
 */
export async function getMonthlyFixedCostEstimate(): Promise<FixedCostEstimate> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Look for recurring/fixed expenses in the last 60 days
  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  const { data, error } = await db
    .from('expenses')
    .select('amount_cents, is_recurring, recurrence_interval, category')
    .eq('tenant_id', tenantId)
    .gte('expense_date', sixtyDaysAgo.toISOString().split('T')[0])

  if (error || !data || data.length === 0) return null

  const categoryTotals = new Map<string, number>()

  for (const expense of data) {
    const isFixed = expense.is_recurring === true || !!expense.recurrence_interval
    if (!isFixed) continue

    const cat = expense.category || 'Other'
    categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + (expense.amount_cents ?? 0))
  }

  if (categoryTotals.size === 0) return null

  // If we pulled 60 days, normalize to monthly
  const breakdown = Array.from(categoryTotals.entries()).map(([category, amountCents]) => ({
    category,
    amountCents: Math.round(amountCents / 2), // 60 days -> monthly
  }))

  const totalCents = breakdown.reduce((sum, b) => sum + b.amountCents, 0)

  return { totalCents, breakdown }
}
