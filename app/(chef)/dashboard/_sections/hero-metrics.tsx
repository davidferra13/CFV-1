// Hero Metrics Row - 2 primary metrics plus 2 supporting stats
// Keep the hero tier decision-focused while preserving useful context below it.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { HeroMetricsClient } from './hero-metrics-client'
import { dateToDateString } from '@/lib/utils/format'
import type { ArchetypeId } from '@/lib/archetypes/presets'

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
  const _liso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const today = _liso(now)
  const weekEnd = _liso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7))

  const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString()

  // Build date strings for per-day sparkline bucketing
  const dayStrings: string[] = []
  for (let d = 6; d >= 0; d--) {
    dayStrings.push(_liso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - d)))
  }
  const weekFutureStrings: string[] = []
  for (let d = 0; d < 7; d++) {
    weekFutureStrings.push(_liso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + d)))
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
    // All-time revenue from ledger (aligned with getTenantFinancialSummary)
    db
      .from('ledger_entries')
      .select('amount_cents')
      .eq('tenant_id', tenantId)
      .eq('is_refund', false)
      .not('entry_type', 'eq', 'tip')
      .then(({ data, error }: any) => {
        if (error) throw new Error(`Revenue query failed: ${error.message ?? error}`)
        if (!data) return 0
        return data.reduce((sum: number, row: any) => sum + (row.amount_cents || 0), 0)
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
        if (error) throw new Error(`Outstanding query failed: ${error.message ?? error}`)
        if (!data) return 0
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
      (recentInquiryDates as any[]).filter(
        (r: any) => (r.created_at ? dateToDateString(r.created_at as Date | string) : null) === day
      ).length
  )

  // Bucket event dates into per-day counts
  const eventSparkData = weekFutureStrings.map(
    (day) =>
      (upcomingEventDates as any[]).filter(
        (r: any) => (r.event_date ? dateToDateString(r.event_date as Date | string) : null) === day
      ).length
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

const RESTAURANT_ARCHETYPES = new Set<ArchetypeId>(['restaurant', 'food-truck', 'bakery'])

async function getRestaurantHeroMetrics(): Promise<HeroMetric[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const [salesToday, salesMonth, clockedIn, openChecks] = await Promise.all([
    // Today's sales revenue
    db
      .from('sales')
      .select('total_cents')
      .eq('tenant_id', tenantId)
      .in('status', ['captured', 'settled'])
      .gte('created_at', `${today}T00:00:00Z`)
      .lte('created_at', `${today}T23:59:59Z`)
      .then(({ data }: any) =>
        (data ?? []).reduce((sum: number, r: any) => sum + (r.total_cents ?? 0), 0)
      ),

    // Month-to-date sales
    db
      .from('sales')
      .select('total_cents')
      .eq('tenant_id', tenantId)
      .in('status', ['captured', 'settled'])
      .gte('created_at', `${monthStart}T00:00:00Z`)
      .then(({ data }: any) =>
        (data ?? []).reduce((sum: number, r: any) => sum + (r.total_cents ?? 0), 0)
      ),

    // Staff currently clocked in
    db
      .from('staff_clock_entries')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', tenantId)
      .eq('status', 'clocked_in'),

    // Open dining checks (if table service active)
    db
      .from('commerce_dining_checks' as any)
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'open')
      .then((r: any) => r)
      .catch(() => ({ count: 0 })),
  ])

  const fmtDollars = (cents: number) =>
    `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

  return [
    {
      label: "Today's revenue",
      value: fmtDollars(salesToday),
      href: '/commerce',
      tier: 'hero',
    },
    {
      label: 'Staff on clock',
      value: String(clockedIn?.count ?? 0),
      href: '/staff',
      tier: 'hero',
    },
    {
      label: 'Month-to-date',
      value: fmtDollars(salesMonth),
      href: '/finance',
      tier: 'supporting',
    },
    {
      label: 'Open checks',
      value: String(openChecks?.count ?? 0),
      href: '/commerce/table-service',
      tier: 'supporting',
    },
  ]
}

export async function HeroMetrics({ archetype }: { archetype?: ArchetypeId | null } = {}) {
  let metrics: HeroMetric[]
  try {
    if (archetype && RESTAURANT_ARCHETYPES.has(archetype)) {
      metrics = await getRestaurantHeroMetrics()
    } else {
      metrics = await getHeroMetrics()
    }
  } catch (err) {
    console.error('[HeroMetrics] Failed to load:', err)
    return (
      <div className="rounded-xl border border-red-800/50 bg-red-950/30 p-4 text-center">
        <p className="text-sm text-red-400">
          Could not load dashboard metrics. Please refresh the page.
        </p>
      </div>
    )
  }

  return <HeroMetricsClient metrics={metrics} />
}
