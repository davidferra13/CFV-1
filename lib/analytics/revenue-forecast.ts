'use server'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { subMonths, addMonths, format } from 'date-fns'

export interface MonthlyRevenue {
  month: string // 'Jan 2026'
  actual: number // cents
  projected?: number
}

export interface RevenueForecast {
  historical: MonthlyRevenue[]
  forecast: MonthlyRevenue[] // next 3 months
  trend: 'up' | 'down' | 'flat'
  avgMonthlyRevenueCents: number
  projectedAnnualCents: number
}

export async function getRevenueForecast(): Promise<RevenueForecast> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch last 12 months of completed event revenue
  const twelveMonthsAgo = subMonths(new Date(), 12)
  const { data: events } = await db
    .from('events')
    .select('event_date, quoted_price_cents')
    .eq('tenant_id', user.entityId)
    .eq('is_demo', false)
    .eq('status', 'completed')
    .gte('event_date', twelveMonthsAgo.toISOString().split('T')[0])
    .order('event_date', { ascending: true })

  // Group by month
  const monthMap = new Map<string, number>()

  // Pre-populate last 12 months with 0
  for (let i = 11; i >= 0; i--) {
    const d = subMonths(new Date(), i)
    monthMap.set(format(d, 'MMM yyyy'), 0)
  }

  for (const event of events || []) {
    const key = format(new Date(event.event_date), 'MMM yyyy')
    monthMap.set(key, (monthMap.get(key) || 0) + (event.quoted_price_cents || 0))
  }

  const historical: MonthlyRevenue[] = Array.from(monthMap.entries()).map(([month, actual]) => ({
    month,
    actual,
  }))

  // Calculate average of last 6 months
  const last6 = historical.slice(-6)
  const avgMonthlyRevenueCents =
    last6.length > 0 ? Math.round(last6.reduce((sum, m) => sum + m.actual, 0) / last6.length) : 0

  // Simple trend: compare last 3 months vs prior 3 months
  const last3avg = historical.slice(-3).reduce((s, m) => s + m.actual, 0) / 3
  const prev3avg = historical.slice(-6, -3).reduce((s, m) => s + m.actual, 0) / 3
  const trend: 'up' | 'down' | 'flat' =
    last3avg > prev3avg * 1.05 ? 'up' : last3avg < prev3avg * 0.95 ? 'down' : 'flat'

  // Project next 3 months using weighted moving average + trend factor
  const trendFactor = trend === 'up' ? 1.05 : trend === 'down' ? 0.95 : 1.0
  const forecast: MonthlyRevenue[] = []
  for (let i = 1; i <= 3; i++) {
    const d = addMonths(new Date(), i)
    forecast.push({
      month: format(d, 'MMM yyyy'),
      actual: 0,
      projected: Math.round(avgMonthlyRevenueCents * Math.pow(trendFactor, i)),
    })
  }

  const projectedAnnualCents =
    historical.slice(-12).reduce((s, m) => s + m.actual, 0) +
    forecast.reduce((s, m) => s + (m.projected || 0), 0)

  return { historical, forecast, trend, avgMonthlyRevenueCents, projectedAnnualCents }
}
