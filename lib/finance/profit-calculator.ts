'use server'

// Profit calculation engine for Financial Clarity Dashboard.
// Computes event-level and monthly profit using existing ledger,
// invoice, and expense data. No new tables required.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ── Types ──────────────────────────────────────────────────────────────

export type EventProfit = {
  eventId: string
  revenueCents: number
  foodCostCents: number
  travelCostCents: number
  suppliesCostCents: number
  laborCostCents: number
  otherCostCents: number
  totalCostCents: number
  netProfitCents: number
  marginPercent: number
  eventDate: string | null
  occasion: string | null
  clientName: string | null
  guestCount: number | null
}

export type MonthlyProfitSummary = {
  month: string // YYYY-MM
  label: string // "May 2026"
  revenueCents: number
  totalCostCents: number
  netProfitCents: number
  eventCount: number
  avgProfitPerEventCents: number
  marginPercent: number
}

export type ProfitTrend = {
  currentMonthProfitCents: number
  lastMonthProfitCents: number
  changePercent: number | null
  direction: 'up' | 'down' | 'flat'
}

export type ProfitAtAGlanceData = {
  /** Net profit this calendar month */
  monthlyProfitCents: number
  /** Total revenue this calendar month */
  monthlyRevenueCents: number
  /** Total costs this calendar month */
  monthlyCostCents: number
  /** Events completed this month */
  eventCount: number
  /** Average profit per event this month */
  avgProfitPerEventCents: number
  /** Trend compared to last month */
  trend: ProfitTrend
  /** Year-to-date net profit */
  ytdProfitCents: number
  /** Year-to-date revenue */
  ytdRevenueCents: number
  /** Year-to-date total costs */
  ytdCostCents: number
  /** Year-to-date event count */
  ytdEventCount: number
  /** Whether there is any financial data at all */
  hasData: boolean
}

// ── Constants ──────────────────────────────────────────────────────────

const FOOD_CATEGORIES = ['groceries', 'alcohol', 'specialty_items', 'food']
const TRAVEL_CATEGORIES = ['gas_mileage', 'vehicle', 'mileage', 'travel']
const SUPPLY_CATEGORIES = ['supplies', 'equipment', 'rentals']
const LABOR_CATEGORIES = ['labor']

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function monthLabel(yyyymm: string): string {
  const [year, month] = yyyymm.split('-')
  return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`
}

function calcMargin(revenue: number, cost: number): number {
  if (revenue <= 0) return 0
  return Math.round(((revenue - cost) / revenue) * 1000) / 10
}

// ── Core Calculations ─────────────────────────────────────────────────

/**
 * Calculate profit for a single event. Pulls revenue from event_financial_summary
 * and cost breakdown from expenses table.
 */
export async function calculateEventProfit(eventId: string): Promise<EventProfit | null> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const [financialRes, eventRes, expensesRes, laborRes] = await Promise.all([
    db
      .from('event_financial_summary')
      .select('net_revenue_cents, total_paid_cents, tip_amount_cents, total_expenses_cents')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .single()
      .catch(() => ({ data: null })),
    db
      .from('events')
      .select('id, event_date, occasion, guest_count, client_id, clients(full_name)')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single()
      .catch(() => ({ data: null })),
    db
      .from('expenses')
      .select('category, amount_cents, is_business')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .catch(() => ({ data: [] })),
    db
      .from('event_staff_assignments')
      .select('pay_amount_cents')
      .eq('event_id', eventId)
      .eq('chef_id', tenantId)
      .catch(() => ({ data: [] })),
  ])

  const event = eventRes?.data
  if (!event) return null

  const fin = financialRes?.data
  const expenses = expensesRes?.data || []
  const laborRows = laborRes?.data || []

  // Revenue: from financial summary, fallback to 0
  const revenueCents = (fin?.total_paid_cents ?? 0) + (fin?.tip_amount_cents ?? 0)

  // Cost breakdown from expenses
  const catTotals: Record<string, number> = {}
  for (const exp of expenses) {
    if (!exp.is_business) continue
    const cat = exp.category || 'other'
    catTotals[cat] = (catTotals[cat] || 0) + (exp.amount_cents ?? 0)
  }

  const foodCostCents = FOOD_CATEGORIES.reduce((s, c) => s + (catTotals[c] || 0), 0)
  const travelCostCents = TRAVEL_CATEGORIES.reduce((s, c) => s + (catTotals[c] || 0), 0)
  const suppliesCostCents = SUPPLY_CATEGORIES.reduce((s, c) => s + (catTotals[c] || 0), 0)
  const laborExpenseCents = LABOR_CATEGORIES.reduce((s, c) => s + (catTotals[c] || 0), 0)
  const staffLaborCents = laborRows.reduce(
    (s: number, r: any) => s + (r.pay_amount_cents ?? 0),
    0
  )
  const laborCostCents = laborExpenseCents + staffLaborCents

  const knownCats = [
    ...FOOD_CATEGORIES,
    ...TRAVEL_CATEGORIES,
    ...SUPPLY_CATEGORIES,
    ...LABOR_CATEGORIES,
  ]
  const otherCostCents = Object.entries(catTotals)
    .filter(([cat]) => !knownCats.includes(cat))
    .reduce((s, [, v]) => s + v, 0)

  const totalCostCents = foodCostCents + travelCostCents + suppliesCostCents + laborCostCents + otherCostCents
  const netProfitCents = revenueCents - totalCostCents

  return {
    eventId,
    revenueCents,
    foodCostCents,
    travelCostCents,
    suppliesCostCents,
    laborCostCents,
    otherCostCents,
    totalCostCents,
    netProfitCents,
    marginPercent: calcMargin(revenueCents, totalCostCents),
    eventDate: event.event_date ?? null,
    occasion: event.occasion ?? null,
    clientName: event.clients?.full_name ?? null,
    guestCount: event.guest_count ?? null,
  }
}

/**
 * Calculate monthly profit across all events for a given month (YYYY-MM format).
 */
export async function calculateMonthlyProfit(
  month: string
): Promise<MonthlyProfitSummary> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const startDate = `${month}-01`
  const endDate = `${month}-31`

  const { data: events } = await db
    .from('events')
    .select('id')
    .eq('tenant_id', tenantId)
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .limit(500)

  const eventIds = (events || []).map((e: any) => e.id)
  const eventCount = eventIds.length

  if (eventCount === 0) {
    return {
      month,
      label: monthLabel(month),
      revenueCents: 0,
      totalCostCents: 0,
      netProfitCents: 0,
      eventCount: 0,
      avgProfitPerEventCents: 0,
      marginPercent: 0,
    }
  }

  const [finRes, expRes, laborRes] = await Promise.all([
    db
      .from('event_financial_summary')
      .select('event_id, total_paid_cents, tip_amount_cents')
      .eq('tenant_id', tenantId)
      .in('event_id', eventIds),
    db
      .from('expenses')
      .select('amount_cents, is_business')
      .eq('tenant_id', tenantId)
      .eq('is_business', true)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate),
    db
      .from('event_staff_assignments')
      .select('pay_amount_cents')
      .eq('chef_id', tenantId)
      .in('event_id', eventIds),
  ])

  let revenueCents = 0
  for (const f of finRes?.data || []) {
    revenueCents += (f.total_paid_cents ?? 0) + (f.tip_amount_cents ?? 0)
  }

  let expenseCents = 0
  for (const exp of expRes?.data || []) {
    expenseCents += exp.amount_cents ?? 0
  }

  let laborCents = 0
  for (const l of laborRes?.data || []) {
    laborCents += l.pay_amount_cents ?? 0
  }

  const totalCostCents = expenseCents + laborCents
  const netProfitCents = revenueCents - totalCostCents

  return {
    month,
    label: monthLabel(month),
    revenueCents,
    totalCostCents,
    netProfitCents,
    eventCount,
    avgProfitPerEventCents: eventCount > 0 ? Math.round(netProfitCents / eventCount) : 0,
    marginPercent: calcMargin(revenueCents, totalCostCents),
  }
}

/**
 * Calculate profit trend: this month vs last month.
 */
export async function calculateProfitTrend(): Promise<ProfitTrend> {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`

  const [current, previous] = await Promise.all([
    calculateMonthlyProfit(currentMonth),
    calculateMonthlyProfit(lastMonth),
  ])

  let changePercent: number | null = null
  let direction: 'up' | 'down' | 'flat' = 'flat'

  if (previous.netProfitCents !== 0) {
    changePercent = Math.round(
      ((current.netProfitCents - previous.netProfitCents) / Math.abs(previous.netProfitCents)) * 1000
    ) / 10
    if (changePercent > 1) direction = 'up'
    else if (changePercent < -1) direction = 'down'
    else direction = 'flat'
  } else if (current.netProfitCents > 0) {
    direction = 'up'
  }

  return {
    currentMonthProfitCents: current.netProfitCents,
    lastMonthProfitCents: previous.netProfitCents,
    changePercent,
    direction,
  }
}
