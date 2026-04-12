// Hero Metrics Row - 2 primary metrics plus 2 supporting stats
// Keep the hero tier decision-focused while preserving useful context below it.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { HeroMetricsClient } from './hero-metrics-client'

type HeroMetric = {
  label: string
  value: string
  href: string
  trend?: string
  trendUp?: boolean
  tier: 'hero' | 'supporting'
  sparkData?: number[]
  isSurge?: boolean
  surgeCount?: number
}

async function getHeroMetrics(): Promise<HeroMetric[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const weekEnd = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0]

  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

  // Build date strings for per-day sparkline bucketing
  const dayStrings: string[] = []
  for (let d = 6; d >= 0; d--) {
    dayStrings.push(new Date(now.getTime() - d * 86400000).toISOString().split('T')[0])
  }
  const weekFutureStrings: string[] = []
  for (let d = 0; d < 7; d++) {
    weekFutureStrings.push(new Date(now.getTime() + d * 86400000).toISOString().split('T')[0])
  }

  // All queries in parallel
  const [
    revenueResult,
    eventsResult,
    inquiriesResult,
    outstandingResult,
    newInquiriesThisWeek,
    recentInquiryDates,
    upcomingEventDates,
  ] = await Promise.all([
    // This month's revenue from ledger
    db
      .from('event_financial_summary')
      .select('total_paid_cents')
      .eq('tenant_id', tenantId)
      .then(({ data, error }: any) => {
        if (error || !data) return 0
        // Sum all payments this month by joining with events
        return data.reduce((sum: number, row: any) => sum + (row.total_paid_cents || 0), 0)
      }),

    // Events this week
    db
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('event_date', today)
      .lte('event_date', weekEnd)
      .not('status', 'eq', 'cancelled'),

    // Open inquiries (not converted, not declined)
    db
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .not('status', 'in', '("converted","declined")'),

    // Outstanding balance
    db
      .from('event_financial_summary')
      .select('outstanding_balance_cents')
      .eq('tenant_id', tenantId)
      .gt('outstanding_balance_cents', 0)
      .then(({ data, error }: any) => {
        if (error || !data) return 0
        return data.reduce((sum: number, row: any) => sum + (row.outstanding_balance_cents || 0), 0)
      }),

    // New inquiries in last 7 days (for surge detection)
    db
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', sevenDaysAgo),

    // Per-day inquiry dates for sparkline (last 7 days)
    db
      .from('inquiries')
      .select('created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', sevenDaysAgo)
      .then(({ data }: any) => data ?? []),

    // Per-day event dates for sparkline (next 7 days)
    db
      .from('events')
      .select('event_date')
      .eq('tenant_id', tenantId)
      .gte('event_date', today)
      .lte('event_date', weekEnd)
      .not('status', 'eq', 'cancelled')
      .then(({ data }: any) => data ?? []),
  ])

  // Bucket inquiry dates into per-day counts
  const inquirySparkData = dayStrings.map(
    (day) =>
      (recentInquiryDates as any[]).filter((r: any) => r.created_at?.split('T')[0] === day).length
  )

  // Bucket event dates into per-day counts
  const eventSparkData = weekFutureStrings.map(
    (day) =>
      (upcomingEventDates as any[]).filter((r: any) => r.event_date?.split('T')[0] === day).length
  )

  const revenueCents = typeof revenueResult === 'number' ? revenueResult : 0
  const eventsCount = eventsResult?.count ?? 0
  const inquiriesCount = inquiriesResult?.count ?? 0
  const outstandingCents = typeof outstandingResult === 'number' ? outstandingResult : 0
  const newThisWeek = newInquiriesThisWeek?.count ?? 0

  // Surge detection: 5+ new inquiries in 7 days
  const isSurge = newThisWeek >= 5
  const inquiryTrend = newThisWeek > 0 ? `${newThisWeek} new this week` : undefined

  return [
    {
      label: 'Events this week',
      value: String(eventsCount),
      href: '/schedule',
      tier: 'hero',
      sparkData: eventSparkData,
    },
    {
      label: 'Open inquiries',
      value: String(inquiriesCount),
      href: '/inquiries',
      trend: inquiryTrend,
      trendUp: newThisWeek > 0,
      tier: 'hero',
      sparkData: inquirySparkData,
      isSurge,
      surgeCount: isSurge ? newThisWeek : undefined,
    },
    {
      label: 'Revenue (all time)',
      value: `$${(revenueCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      href: '/finance',
      tier: 'supporting',
    },
    {
      label: 'Outstanding',
      value:
        outstandingCents > 0
          ? `$${(outstandingCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
          : '$0',
      href: '/finance/payments',
      tier: 'supporting',
    },
  ]
}

export async function HeroMetrics() {
  let metrics: HeroMetric[]
  try {
    metrics = await getHeroMetrics()
  } catch (err) {
    console.error('[HeroMetrics] Failed to load:', err)
    return null
  }

  return <HeroMetricsClient metrics={metrics} />
}
