'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getRevenueForecastForTenant } from './revenue-forecast-run'

export type {
  ForecastWindowTotals,
  MonthlyForecastEntry,
  PipelineStageBreakdown,
  PipelineValue,
  QuarterlyForecast,
  RevenueForecast,
  RevenueForecastActualsCalibration,
  RevenueForecastActualsReconciliation,
  RevenueForecastPlanningRun,
  SeasonalEntry,
} from './revenue-forecast-run'

export type YoYComparison = {
  year1: number
  year2: number
  months: Array<{
    month: number
    label: string
    year1Cents: number
    year2Cents: number
    growthPercent: number | null
  }>
  year1TotalCents: number
  year2TotalCents: number
  ytdGrowthPercent: number | null
}

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function getMonthKey(dateStr: string): string {
  return dateStr.substring(0, 7)
}

export async function getRevenueForecast(months = 6) {
  const user = await requireChef()
  return getRevenueForecastForTenant(user.tenantId!, months, {
    runSource: 'interactive',
  })
}

export async function getRevenueComparison(year1: number, year2: number): Promise<YoYComparison> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data: events } = await db
    .from('events')
    .select('id, event_date, status, quoted_price_cents')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .gte('event_date', `${Math.min(year1, year2)}-01-01`)
    .lte('event_date', `${Math.max(year1, year2)}-12-31`)

  const eventIds = (events || []).map((event: any) => event.id)
  const finMap = new Map<string, any>()

  if (eventIds.length > 0) {
    const { data: financials } = await db
      .from('event_financial_summary')
      .select('event_id, net_revenue_cents, total_paid_cents')
      .in('event_id', eventIds)

    for (const financial of financials || []) {
      if (financial.event_id) finMap.set(financial.event_id, financial)
    }
  }

  function getRevenue(event: any): number {
    const financial = finMap.get(event.id)
    if (financial?.net_revenue_cents != null && financial.net_revenue_cents > 0) {
      return financial.net_revenue_cents
    }
    if (financial?.total_paid_cents != null && financial.total_paid_cents > 0) {
      return financial.total_paid_cents
    }
    return event.quoted_price_cents || 0
  }

  const byYearMonth: Record<string, number> = {}
  for (const event of events || []) {
    const key = getMonthKey(event.event_date)
    byYearMonth[key] = (byYearMonth[key] || 0) + getRevenue(event)
  }

  const months = []
  let year1Total = 0
  let year2Total = 0

  for (let month = 1; month <= 12; month++) {
    const key1 = `${year1}-${String(month).padStart(2, '0')}`
    const key2 = `${year2}-${String(month).padStart(2, '0')}`
    const year1Cents = byYearMonth[key1] || 0
    const year2Cents = byYearMonth[key2] || 0

    year1Total += year1Cents
    year2Total += year2Cents

    let growthPercent: number | null = null
    if (year1Cents > 0) {
      growthPercent = Math.round(((year2Cents - year1Cents) / year1Cents) * 100)
    } else if (year2Cents > 0) {
      growthPercent = 100
    }

    months.push({
      month,
      label: MONTH_LABELS[month - 1],
      year1Cents,
      year2Cents,
      growthPercent,
    })
  }

  return {
    year1,
    year2,
    months,
    year1TotalCents: year1Total,
    year2TotalCents: year2Total,
    ytdGrowthPercent:
      year1Total > 0
        ? Math.round(((year2Total - year1Total) / year1Total) * 100)
        : year2Total > 0
          ? 100
          : null,
  }
}
