// Consolidated: delegates to canonical forecast system (lib/finance/revenue-forecast-actions)
'use server'

import { getRevenueForecast as getCanonicalForecast } from '@/lib/finance/revenue-forecast-actions'
import { format, addMonths } from 'date-fns'

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
  const canonical = await getCanonicalForecast(12)

  const now = new Date()
  const currentMonthKey = format(now, 'yyyy-MM')

  // Map monthlyForecast entries to historical (past/current) and forecast (future)
  const historical: MonthlyRevenue[] = []
  const forecast: MonthlyRevenue[] = []

  for (const entry of canonical.monthlyForecast) {
    const entryMonth = entry.month // 'yyyy-MM' format
    const label = format(new Date(entryMonth + '-01'), 'MMM yyyy')

    if (entryMonth <= currentMonthKey) {
      historical.push({
        month: label,
        actual: entry.bookedRevenueCents,
      })
    } else {
      forecast.push({
        month: label,
        actual: 0,
        projected: entry.expectedRevenueCents,
      })
    }
  }

  // Ensure at least 3 forecast months
  if (forecast.length < 3) {
    const needed = 3 - forecast.length
    const startOffset = forecast.length + 1
    for (let i = startOffset; i < startOffset + needed; i++) {
      const d = addMonths(now, i)
      forecast.push({
        month: format(d, 'MMM yyyy'),
        actual: 0,
        projected:
          canonical.windowTotals.expectedCents > 0
            ? Math.round(canonical.windowTotals.expectedCents / 6)
            : 0,
      })
    }
  }

  // Derive trend from historical data
  const last3 = historical.slice(-3)
  const prev3 = historical.slice(-6, -3)
  const last3avg = last3.length > 0 ? last3.reduce((s, m) => s + m.actual, 0) / last3.length : 0
  const prev3avg = prev3.length > 0 ? prev3.reduce((s, m) => s + m.actual, 0) / prev3.length : 0
  const trend: 'up' | 'down' | 'flat' =
    prev3avg === 0
      ? 'flat'
      : last3avg > prev3avg * 1.05
        ? 'up'
        : last3avg < prev3avg * 0.95
          ? 'down'
          : 'flat'

  const last6 = historical.slice(-6)
  const avgMonthlyRevenueCents =
    last6.length > 0 ? Math.round(last6.reduce((s, m) => s + m.actual, 0) / last6.length) : 0

  const projectedAnnualCents =
    historical.reduce((s, m) => s + m.actual, 0) +
    forecast.reduce((s, m) => s + (m.projected || 0), 0)

  return { historical, forecast, trend, avgMonthlyRevenueCents, projectedAnnualCents }
}
