'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EventsFinancialSummary {
  // Upcoming revenue
  upcomingRevenueCents: number
  upcomingEventCount: number
  // Completed this month
  monthRevenueCents: number
  monthEventCount: number
  monthAvgMarginPercent: number | null
  // Year-over-year comparison
  ytdRevenueCents: number
  priorYtdRevenueCents: number
  ytdGrowthPercent: number | null
  // Capacity hint
  eventsNext30Days: number
  avgPerMonth: number | null
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getEventsFinancialSummary(): Promise<EventsFinancialSummary | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const startOfPriorYear = new Date(now.getFullYear() - 1, 0, 1)
  const sameDayPriorYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 86400000)

  const [upcomingRes, monthRes, ytdRes, priorYtdRes, financialsRes, allEventsRes] =
    await Promise.all([
      // Upcoming confirmed/paid events
      supabase
        .from('events')
        .select('id, quoted_price_cents, event_date')
        .eq('tenant_id', tenantId)
        .in('status', ['confirmed', 'paid', 'accepted'])
        .gte('event_date', now.toISOString())
        .lte('event_date', thirtyDaysFromNow.toISOString()),
      // Completed events this month
      supabase
        .from('events')
        .select('id, quoted_price_cents')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .gte('event_date', startOfMonth.toISOString()),
      // YTD completed
      supabase
        .from('events')
        .select('id, quoted_price_cents')
        .eq('tenant_id', tenantId)
        .in('status', ['completed', 'paid'])
        .gte('event_date', startOfYear.toISOString()),
      // Prior YTD completed (same period last year)
      supabase
        .from('events')
        .select('id, quoted_price_cents')
        .eq('tenant_id', tenantId)
        .in('status', ['completed', 'paid'])
        .gte('event_date', startOfPriorYear.toISOString())
        .lte('event_date', sameDayPriorYear.toISOString()),
      // Financial summaries for this month's events
      supabase
        .from('event_financial_summary')
        .select('event_id, profit_margin')
        .eq('tenant_id', tenantId),
      // All events in last 12 months for avg per month
      supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('status', ['completed', 'confirmed', 'paid'])
        .gte('event_date', new Date(now.getTime() - 365 * 86400000).toISOString()),
    ])

  const upcoming = upcomingRes.data || []
  const month = monthRes.data || []
  const ytd = ytdRes.data || []
  const priorYtd = priorYtdRes.data || []

  if (upcoming.length === 0 && month.length === 0 && ytd.length === 0) return null

  // Upcoming revenue
  const upcomingRevenueCents = upcoming.reduce(
    (s: number, e: any) => s + (e.quoted_price_cents || 0),
    0
  )

  // Month revenue + margin
  const monthRevenueCents = month.reduce((s: number, e: any) => s + (e.quoted_price_cents || 0), 0)
  const financials = (financialsRes.data || []) as Array<{
    event_id: string | null
    profit_margin: number | null
  }>
  const financialMap = new Map(financials.map((f) => [f.event_id, f]))
  const monthMargins = month
    .map((e: any) => {
      const fin = financialMap.get(e.id)
      return fin?.profit_margin != null ? fin.profit_margin : null
    })
    .filter((m: number | null): m is number => m !== null)
  const monthAvgMargin =
    monthMargins.length >= 2
      ? Math.round(monthMargins.reduce((s: number, m: number) => s + m, 0) / monthMargins.length)
      : null

  // YTD
  const ytdRevenueCents = ytd.reduce((s: number, e: any) => s + (e.quoted_price_cents || 0), 0)
  const priorYtdRevenueCents = priorYtd.reduce(
    (s: number, e: any) => s + (e.quoted_price_cents || 0),
    0
  )
  const ytdGrowth =
    priorYtdRevenueCents > 0
      ? Math.round(((ytdRevenueCents - priorYtdRevenueCents) / priorYtdRevenueCents) * 100)
      : null

  // Avg per month
  const totalLast12 = allEventsRes.count || 0
  const avgPerMonth = totalLast12 >= 3 ? Math.round((totalLast12 / 12) * 10) / 10 : null

  return {
    upcomingRevenueCents,
    upcomingEventCount: upcoming.length,
    monthRevenueCents,
    monthEventCount: month.length,
    monthAvgMarginPercent: monthAvgMargin,
    ytdRevenueCents,
    priorYtdRevenueCents,
    ytdGrowthPercent: ytdGrowth,
    eventsNext30Days: upcoming.length,
    avgPerMonth,
  }
}
