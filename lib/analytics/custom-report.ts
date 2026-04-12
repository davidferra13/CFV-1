'use server'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { subMonths, format } from 'date-fns'

export type ReportEntity = 'events' | 'clients' | 'expenses'
export type ReportMetric = 'count' | 'revenue' | 'average' | 'margin'
export type ChartType = 'bar' | 'line' | 'pie' | 'table'

export interface ReportConfig {
  entity: ReportEntity
  metric: ReportMetric
  chartType: ChartType
  groupBy: 'month' | 'status' | 'occasion' | 'category'
  dateRange: 'last_3_months' | 'last_6_months' | 'last_12_months' | 'ytd'
}

export interface ReportDataPoint {
  label: string
  value: number
  count?: number
}

export async function runCustomReport(config: ReportConfig): Promise<ReportDataPoint[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const now = new Date()
  let fromDate: Date
  switch (config.dateRange) {
    case 'last_3_months':
      fromDate = subMonths(now, 3)
      break
    case 'last_6_months':
      fromDate = subMonths(now, 6)
      break
    case 'ytd':
      fromDate = new Date(now.getFullYear(), 0, 1)
      break
    default:
      fromDate = subMonths(now, 12)
  }

  if (config.entity === 'events') {
    const { data: events } = await db
      .from('events')
      .select('event_date, quoted_price_cents, status, occasion')
      .eq('tenant_id', user.entityId)
      .eq('is_demo', false)
      .gte('event_date', fromDate.toISOString().split('T')[0])

    const grouped = new Map<string, { value: number; count: number }>()

    for (const event of events || []) {
      let key: string
      if (config.groupBy === 'month') key = format(new Date(event.event_date), 'MMM yyyy')
      else if (config.groupBy === 'status') key = event.status
      else if (config.groupBy === 'occasion') key = (event.occasion as string) || 'Other'
      else key = event.status

      const existing = grouped.get(key) || { value: 0, count: 0 }
      existing.count++
      if (config.metric === 'revenue' || config.metric === 'average') {
        existing.value += event.quoted_price_cents || 0
      } else {
        existing.value = existing.count
      }
      grouped.set(key, existing)
    }

    return Array.from(grouped.entries()).map(([label, data]) => ({
      label,
      value: config.metric === 'average' ? Math.round(data.value / data.count) : data.value,
      count: data.count,
    }))
  }

  if (config.entity === 'expenses') {
    const { data: expenses } = await db
      .from('expenses')
      .select('amount_cents, category, expense_date')
      .eq('tenant_id', user.entityId)
      .gte('expense_date', fromDate.toISOString().split('T')[0])

    const grouped = new Map<string, { value: number; count: number }>()
    for (const expense of expenses || []) {
      const key =
        config.groupBy === 'month'
          ? format(new Date(expense.expense_date), 'MMM yyyy')
          : (expense.category as string) || 'Other'
      const existing = grouped.get(key) || { value: 0, count: 0 }
      existing.count++
      existing.value += expense.amount_cents || 0
      grouped.set(key, existing)
    }
    return Array.from(grouped.entries()).map(([label, data]) => ({
      label,
      value: data.value,
      count: data.count,
    }))
  }

  return []
}
