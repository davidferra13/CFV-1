'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { collectStatisticsSnapshot } from './stat-collector'
import type {
  StatisticsClientRow,
  StatisticsDishRow,
  StatisticsEventRow,
  StatisticsExpenseRow,
  StatisticsFinancialRow,
  StatisticsMenuRow,
  StatisticsSnapshot,
  StatisticsSourceRows,
} from './stat-types'

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function pastDateKey(yearsBack: number): string {
  const date = new Date()
  date.setUTCFullYear(date.getUTCFullYear() - yearsBack)
  return date.toISOString().slice(0, 10)
}

function validateDateKey(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Statistics asOfDate must use YYYY-MM-DD format')
  }

  return value
}

function assertNoQueryError(error: { message?: string } | null | undefined, label: string): void {
  if (error) {
    throw new Error(`Failed to load statistics ${label}: ${error.message ?? 'unknown error'}`)
  }
}

async function getTenantStatisticsRows(
  tenantId: string,
  asOfDate = todayKey()
): Promise<StatisticsSourceRows> {
  const db: any = createServerClient()
  const startDate = pastDateKey(5)

  const [eventsResult, financialsResult, clientsResult, menusResult, dishesResult, expensesResult] =
    await Promise.all([
      db
        .from('events')
        .select(
          'id, tenant_id, client_id, event_date, status, quoted_price_cents, guest_count, menu_id'
        )
        .eq('tenant_id', tenantId)
        .eq('is_demo', false)
        .is('deleted_at', null)
        .gte('event_date', startDate)
        .lte('event_date', asOfDate),
      db
        .from('event_financial_summary')
        .select(
          'event_id, tenant_id, total_paid_cents, net_revenue_cents, total_expenses_cents, profit_cents'
        )
        .eq('tenant_id', tenantId),
      db
        .from('clients')
        .select('id, full_name, email')
        .eq('tenant_id', tenantId)
        .eq('is_demo', false),
      db
        .from('menus')
        .select('id, event_id, name')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null),
      db
        .from('dishes')
        .select('id, menu_id, name, course_name, description')
        .eq('tenant_id', tenantId),
      db
        .from('expenses')
        .select('event_id, amount_cents')
        .eq('tenant_id', tenantId)
        .eq('is_business', true),
    ])

  assertNoQueryError(eventsResult.error, 'events')
  assertNoQueryError(financialsResult.error, 'financial summaries')
  assertNoQueryError(clientsResult.error, 'clients')
  assertNoQueryError(menusResult.error, 'menus')
  assertNoQueryError(dishesResult.error, 'dishes')
  assertNoQueryError(expensesResult.error, 'expenses')

  return {
    tenantId,
    asOfDate,
    events: (eventsResult.data ?? []) as StatisticsEventRow[],
    financials: (financialsResult.data ?? []) as StatisticsFinancialRow[],
    clients: (clientsResult.data ?? []) as StatisticsClientRow[],
    menus: (menusResult.data ?? []) as StatisticsMenuRow[],
    dishes: (dishesResult.data ?? []) as StatisticsDishRow[],
    expenses: (expensesResult.data ?? []) as StatisticsExpenseRow[],
  }
}

export async function getStatisticsSnapshot(asOfDate = todayKey()): Promise<StatisticsSnapshot> {
  const user = await requireChef()
  const rows = await getTenantStatisticsRows(user.tenantId!, validateDateKey(asOfDate))
  return collectStatisticsSnapshot(rows)
}

export async function getStatisticsRevenueSummary(
  asOfDate = todayKey()
): Promise<StatisticsSnapshot['revenue']> {
  const snapshot = await getStatisticsSnapshot(asOfDate)
  return snapshot.revenue
}

export async function getStatisticsDishRankings(
  asOfDate = todayKey()
): Promise<Pick<StatisticsSnapshot, 'mostRequestedDishes' | 'mostProfitableDishes'>> {
  const snapshot = await getStatisticsSnapshot(asOfDate)
  return {
    mostRequestedDishes: snapshot.mostRequestedDishes,
    mostProfitableDishes: snapshot.mostProfitableDishes,
  }
}

export async function getStatisticsGrowthTrajectory(
  asOfDate = todayKey()
): Promise<StatisticsSnapshot['growthTrajectory']> {
  const snapshot = await getStatisticsSnapshot(asOfDate)
  return snapshot.growthTrajectory
}
