'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { subDays, format } from 'date-fns'

export interface UnusualExpense {
  category: string
  amountCents: number
  avgCents: number
  ratio: number
}

export interface FinanceAlerts {
  overdueCount: number
  overdueTotalCents: number
  unusualExpenses: UnusualExpense[]
}

export async function getFinanceAlerts(): Promise<FinanceAlerts> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const now = new Date()
  const todayStr = format(now, 'yyyy-MM-dd')

  // Query overdue events (past date, not completed/cancelled)
  const { data: overdueEvents } = await db
    .from('events')
    .select('id, quoted_price_cents, status, event_date')
    .eq('tenant_id', tenantId)
    .lt('event_date', todayStr)
    .not('status', 'in', '("completed","cancelled")')

  const overdueCount = overdueEvents?.length ?? 0
  const overdueTotalCents =
    overdueEvents?.reduce((sum: number, e: any) => sum + (e.quoted_price_cents ?? 0), 0) ?? 0

  // Query recent expenses (last 30 days) grouped by category
  const thirtyDaysAgo = format(subDays(now, 30), 'yyyy-MM-dd')
  const ninetyDaysAgo = format(subDays(now, 90), 'yyyy-MM-dd')

  const { data: recentExpenses } = await db
    .from('expenses')
    .select('id, category, amount_cents, expense_date')
    .eq('tenant_id', tenantId)
    .gte('expense_date', thirtyDaysAgo)

  const { data: historicalExpenses } = await db
    .from('expenses')
    .select('id, category, amount_cents, expense_date')
    .eq('tenant_id', tenantId)
    .gte('expense_date', ninetyDaysAgo)
    .lt('expense_date', thirtyDaysAgo)

  // Compute 30-day totals per category
  const recentByCategory = new Map<string, number>()
  for (const exp of recentExpenses ?? []) {
    recentByCategory.set(
      exp.category,
      (recentByCategory.get(exp.category) ?? 0) + (exp.amount_cents ?? 0)
    )
  }

  // Compute 60-day historical average per category (monthly average)
  const histByCategory = new Map<string, number>()
  for (const exp of historicalExpenses ?? []) {
    histByCategory.set(
      exp.category,
      (histByCategory.get(exp.category) ?? 0) + (exp.amount_cents ?? 0)
    )
  }

  // Flag any category where last 30 days > 2x the monthly average from prior 60 days
  const unusualExpenses: UnusualExpense[] = []
  for (const [category, recentTotal] of recentByCategory.entries()) {
    const histTotal = histByCategory.get(category) ?? 0
    // Historical covers 60 days, so monthly average = histTotal / 2
    const avgMonthly = histTotal / 2
    if (avgMonthly > 0 && recentTotal > avgMonthly * 2) {
      const ratio = Math.round((recentTotal / avgMonthly) * 10) / 10
      unusualExpenses.push({
        category,
        amountCents: recentTotal,
        avgCents: Math.round(avgMonthly),
        ratio,
      })
    }
  }

  // Sort by ratio descending
  unusualExpenses.sort((a, b) => b.ratio - a.ratio)

  return {
    overdueCount,
    overdueTotalCents,
    unusualExpenses,
  }
}
