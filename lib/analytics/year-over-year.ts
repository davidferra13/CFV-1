'use server'

// Year-Over-Year Comparison
// Compares the current calendar year vs. the previous calendar year for
// the three most business-critical metrics: revenue, event count, and
// average event value.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export interface YoYMetric {
  label: string
  currentYear: number
  previousYear: number
  changePercent: number | null // null if previous was 0
  changeDirection: 'up' | 'down' | 'flat'
}

export interface YoYData {
  revenueMetric: YoYMetric
  eventCountMetric: YoYMetric
  avgEventValueMetric: YoYMetric
  currentYearLabel: string
  previousYearLabel: string
}

function calcChange(
  current: number,
  previous: number
): Pick<YoYMetric, 'changePercent' | 'changeDirection'> {
  if (previous === 0 && current === 0) return { changePercent: null, changeDirection: 'flat' }
  if (previous === 0) return { changePercent: null, changeDirection: 'up' }
  const pct = Math.round(((current - previous) / previous) * 100)
  return {
    changePercent: Math.abs(pct),
    changeDirection: pct > 1 ? 'up' : pct < -1 ? 'down' : 'flat',
  }
}

export async function getYoYData(): Promise<YoYData> {
  const user = await requireChef()
  const db: any = createServerClient()

  const now = new Date()
  const currentYear = now.getFullYear()
  const previousYear = currentYear - 1

  const [ledgerRes, eventsRes] = await Promise.all([
    db
      .from('ledger_entries')
      .select('amount_cents, entry_type, created_at')
      .eq('tenant_id', user.tenantId!)
      .in('entry_type', ['payment', 'deposit', 'installment', 'final_payment'])
      .gte('created_at', `${previousYear}-01-01`)
      .lt('created_at', `${currentYear + 1}-01-01`),

    db
      .from('events')
      .select('event_date, quoted_price_cents, status')
      .eq('tenant_id', user.tenantId!)
      .in('status', ['completed', 'in_progress', 'confirmed', 'paid'])
      .gte('event_date', `${previousYear}-01-01`)
      .lt('event_date', `${currentYear + 1}-01-01`),
  ])

  // Aggregate revenue by year
  let revenueCurrentYear = 0
  let revenuePreviousYear = 0
  for (const entry of ledgerRes.data ?? []) {
    const year = new Date(entry.created_at).getFullYear()
    if (year === currentYear) revenueCurrentYear += entry.amount_cents
    else if (year === previousYear) revenuePreviousYear += entry.amount_cents
  }

  // Aggregate event counts and quoted values by year
  let eventsCurrentYear = 0
  let eventsPreviousYear = 0
  let quotedCurrentYear = 0
  let quotedPreviousYear = 0
  for (const event of eventsRes.data ?? []) {
    const year = new Date(event.event_date).getFullYear()
    if (year === currentYear) {
      eventsCurrentYear++
      quotedCurrentYear += event.quoted_price_cents ?? 0
    } else if (year === previousYear) {
      eventsPreviousYear++
      quotedPreviousYear += event.quoted_price_cents ?? 0
    }
  }

  const avgCurrentYear =
    eventsCurrentYear > 0 ? Math.round(quotedCurrentYear / eventsCurrentYear) : 0
  const avgPreviousYear =
    eventsPreviousYear > 0 ? Math.round(quotedPreviousYear / eventsPreviousYear) : 0

  return {
    revenueMetric: {
      label: 'Total Revenue',
      currentYear: revenueCurrentYear,
      previousYear: revenuePreviousYear,
      ...calcChange(revenueCurrentYear, revenuePreviousYear),
    },
    eventCountMetric: {
      label: 'Events',
      currentYear: eventsCurrentYear,
      previousYear: eventsPreviousYear,
      ...calcChange(eventsCurrentYear, eventsPreviousYear),
    },
    avgEventValueMetric: {
      label: 'Avg Event Value',
      currentYear: avgCurrentYear,
      previousYear: avgPreviousYear,
      ...calcChange(avgCurrentYear, avgPreviousYear),
    },
    currentYearLabel: String(currentYear),
    previousYearLabel: String(previousYear),
  }
}
