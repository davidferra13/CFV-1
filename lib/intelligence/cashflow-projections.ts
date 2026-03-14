'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { subMonths, addMonths, format, startOfMonth, endOfMonth } from 'date-fns'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MonthlyCashFlow {
  month: string // 'Mar 2026'
  incomeCents: number
  expensesCents: number
  netCents: number
  projected?: boolean
}

export interface CashFlowProjection {
  historical: MonthlyCashFlow[] // last 12 months
  projected: MonthlyCashFlow[] // next 3 months
  currentMonthNet: number
  avgMonthlyIncomeCents: number
  avgMonthlyExpensesCents: number
  avgMonthlyNetCents: number
  grossMarginPercent: number // (income - expenses) / income * 100
  runwayMonths: number | null // months of positive cash flow at current rate (null = infinite/growing)
  trend: 'improving' | 'stable' | 'declining'
  burnRateCents: number // avg monthly expenses
  bestMonth: { month: string; netCents: number }
  worstMonth: { month: string; netCents: number }
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getCashFlowProjection(): Promise<CashFlowProjection | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const twelveMonthsAgo = subMonths(new Date(), 12)

  // Fetch income (ledger entries) and expenses in parallel
  const [incomeResult, expenseResult] = await Promise.all([
    supabase
      .from('ledger_entries')
      .select('amount_cents, created_at, is_refund')
      .eq('tenant_id', tenantId)
      .gte('created_at', twelveMonthsAgo.toISOString()),
    supabase
      .from('expenses')
      .select('amount_cents, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', twelveMonthsAgo.toISOString()),
  ])

  if (incomeResult.error && expenseResult.error) return null

  const incomeEntries = incomeResult.data || []
  const expenseEntries = expenseResult.data || []

  // Build monthly buckets for the last 12 months
  const monthlyMap = new Map<string, { incomeCents: number; expensesCents: number }>()
  for (let i = 11; i >= 0; i--) {
    const d = subMonths(new Date(), i)
    const key = format(d, 'MMM yyyy')
    monthlyMap.set(key, { incomeCents: 0, expensesCents: 0 })
  }

  // Aggregate income
  for (const entry of incomeEntries) {
    const key = format(new Date(entry.created_at), 'MMM yyyy')
    const bucket = monthlyMap.get(key)
    if (!bucket) continue
    if (entry.is_refund) {
      bucket.incomeCents -= Math.abs(entry.amount_cents || 0)
    } else {
      bucket.incomeCents += entry.amount_cents || 0
    }
  }

  // Aggregate expenses
  for (const entry of expenseEntries) {
    const key = format(new Date(entry.created_at), 'MMM yyyy')
    const bucket = monthlyMap.get(key)
    if (!bucket) continue
    bucket.expensesCents += entry.amount_cents || 0
  }

  // Build historical array
  const historical: MonthlyCashFlow[] = Array.from(monthlyMap.entries()).map(([month, data]) => ({
    month,
    incomeCents: data.incomeCents,
    expensesCents: data.expensesCents,
    netCents: data.incomeCents - data.expensesCents,
  }))

  // Calculate averages from last 6 months (more recent = more relevant)
  const last6 = historical.slice(-6)
  const avgIncome =
    last6.length > 0 ? Math.round(last6.reduce((s, m) => s + m.incomeCents, 0) / last6.length) : 0
  const avgExpenses =
    last6.length > 0 ? Math.round(last6.reduce((s, m) => s + m.expensesCents, 0) / last6.length) : 0
  const avgNet = avgIncome - avgExpenses

  // Trend: compare last 3 months net vs prior 3 months net
  const last3net = historical.slice(-3).reduce((s, m) => s + m.netCents, 0) / 3
  const prev3net = historical.slice(-6, -3).reduce((s, m) => s + m.netCents, 0) / 3
  const trend: CashFlowProjection['trend'] =
    last3net > prev3net * 1.1 ? 'improving' : last3net < prev3net * 0.9 ? 'declining' : 'stable'

  // Project next 3 months using trend-adjusted averages
  const trendFactor = trend === 'improving' ? 1.05 : trend === 'declining' ? 0.95 : 1.0
  const projected: MonthlyCashFlow[] = []
  for (let i = 1; i <= 3; i++) {
    const d = addMonths(new Date(), i)
    const projectedIncome = Math.round(avgIncome * Math.pow(trendFactor, i))
    const projectedExpenses = Math.round(
      avgExpenses * Math.pow(trend === 'declining' ? 1.02 : 1.0, i)
    )
    projected.push({
      month: format(d, 'MMM yyyy'),
      incomeCents: projectedIncome,
      expensesCents: projectedExpenses,
      netCents: projectedIncome - projectedExpenses,
      projected: true,
    })
  }

  // Gross margin
  const totalIncome = historical.reduce((s, m) => s + m.incomeCents, 0)
  const totalExpenses = historical.reduce((s, m) => s + m.expensesCents, 0)
  const grossMarginPercent =
    totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 1000) / 10 : 0

  // Runway: if net is negative, how many months until cash runs out? (simplified)
  let runwayMonths: number | null = null
  if (avgNet < 0) {
    // Losing money — estimate months remaining (simplified, assumes no savings data)
    runwayMonths = 0 // can't calculate without cash balance, but flag the warning
  }

  // Best and worst months
  const sorted = [...historical].sort((a, b) => b.netCents - a.netCents)
  const bestMonth = { month: sorted[0].month, netCents: sorted[0].netCents }
  const worstMonth = {
    month: sorted[sorted.length - 1].month,
    netCents: sorted[sorted.length - 1].netCents,
  }

  const currentMonth = historical[historical.length - 1]

  return {
    historical,
    projected,
    currentMonthNet: currentMonth.netCents,
    avgMonthlyIncomeCents: avgIncome,
    avgMonthlyExpensesCents: avgExpenses,
    avgMonthlyNetCents: avgNet,
    grossMarginPercent,
    runwayMonths,
    trend,
    burnRateCents: avgExpenses,
    bestMonth,
    worstMonth,
  }
}
