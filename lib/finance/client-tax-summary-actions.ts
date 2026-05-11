// Client Tax Summary Actions
// Aggregate spending by year for year-end tax documentation.

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export interface TaxSummaryEvent {
  id: string
  occasion: string | null
  event_date: string
  guest_count: number | null
  total_paid_cents: number
}

export interface MonthlyBreakdown {
  month: number
  label: string
  total_cents: number
  event_count: number
}

export interface TaxYearSummary {
  year: number
  total_spent_cents: number
  event_count: number
  average_per_event_cents: number
  monthly_breakdown: MonthlyBreakdown[]
  events: TaxSummaryEvent[]
}

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/**
 * Get tax summary data for the client, optionally filtered to a specific year.
 * If no year provided, returns all years with data.
 */
export async function getClientTaxSummary(year?: number): Promise<TaxYearSummary[]> {
  const user = await requireClient()
  const db: any = createServerClient()

  // Fetch completed events for this client
  const { data: events, error } = await db
    .from('events')
    .select('id, occasion, event_date, guest_count, status')
    .eq('client_id', user.entityId)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .order('event_date', { ascending: false })

  if (error || !events?.length) {
    if (error) console.error('[getClientTaxSummary] Error:', error)
    return []
  }

  // Get financial data
  const eventIds = events.map((e: any) => e.id)
  const { data: financials } = await db
    .from('event_financial_summary')
    .select('event_id, total_paid_cents')
    .in('event_id', eventIds)

  const financialMap = new Map<string, number>()
  for (const f of financials ?? []) {
    if (f.event_id) financialMap.set(f.event_id, f.total_paid_cents ?? 0)
  }

  // Group events by year
  const yearMap = new Map<number, TaxSummaryEvent[]>()
  for (const e of events) {
    const eventYear = new Date(e.event_date).getFullYear()
    if (year && eventYear !== year) continue

    const enriched: TaxSummaryEvent = {
      id: e.id,
      occasion: e.occasion,
      event_date: e.event_date,
      guest_count: e.guest_count,
      total_paid_cents: financialMap.get(e.id) ?? 0,
    }

    const arr = yearMap.get(eventYear) ?? []
    arr.push(enriched)
    yearMap.set(eventYear, arr)
  }

  // Build summaries per year
  const summaries: TaxYearSummary[] = []
  for (const [yr, yearEvents] of Array.from(yearMap.entries())) {
    const totalSpent = yearEvents.reduce((sum, e) => sum + e.total_paid_cents, 0)
    const eventCount = yearEvents.length
    const avgPerEvent = eventCount > 0 ? Math.round(totalSpent / eventCount) : 0

    // Monthly breakdown
    const monthlyMap = new Map<number, { total: number; count: number }>()
    for (const e of yearEvents) {
      const month = new Date(e.event_date).getMonth()
      const existing = monthlyMap.get(month) ?? { total: 0, count: 0 }
      existing.total += e.total_paid_cents
      existing.count += 1
      monthlyMap.set(month, existing)
    }

    const monthly: MonthlyBreakdown[] = []
    for (let m = 0; m < 12; m++) {
      const data = monthlyMap.get(m)
      if (data) {
        monthly.push({
          month: m,
          label: MONTH_LABELS[m],
          total_cents: data.total,
          event_count: data.count,
        })
      }
    }

    summaries.push({
      year: yr,
      total_spent_cents: totalSpent,
      event_count: eventCount,
      average_per_event_cents: avgPerEvent,
      monthly_breakdown: monthly,
      events: yearEvents,
    })
  }

  // Sort by year descending
  summaries.sort((a, b) => b.year - a.year)
  return summaries
}
