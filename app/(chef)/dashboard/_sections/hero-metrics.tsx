// Hero Metrics Row - 4 always-visible stats at the top of the dashboard
// These are the numbers a chef checks 10x/day. Never collapsible.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'

type HeroMetric = {
  label: string
  value: string
  href: string
  trend?: string
  trendUp?: boolean
}

async function getHeroMetrics(): Promise<HeroMetric[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const today = now.toISOString().split('T')[0]
  const weekEnd = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0]

  // All queries in parallel
  const [revenueResult, eventsResult, inquiriesResult, outstandingResult] = await Promise.all([
    // This month's revenue from ledger
    supabase
      .from('event_financial_summary')
      .select('total_paid_cents')
      .eq('tenant_id', tenantId)
      .then(({ data, error }: any) => {
        if (error || !data) return 0
        // Sum all payments this month by joining with events
        return data.reduce((sum: number, row: any) => sum + (row.total_paid_cents || 0), 0)
      }),

    // Events this week
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('event_date', today)
      .lte('event_date', weekEnd)
      .not('status', 'eq', 'cancelled'),

    // Open inquiries (not converted, not declined)
    supabase
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .not('status', 'in', '("converted","declined")'),

    // Outstanding balance
    supabase
      .from('event_financial_summary')
      .select('outstanding_balance_cents')
      .eq('tenant_id', tenantId)
      .gt('outstanding_balance_cents', 0)
      .then(({ data, error }: any) => {
        if (error || !data) return 0
        return data.reduce((sum: number, row: any) => sum + (row.outstanding_balance_cents || 0), 0)
      }),
  ])

  const revenueCents = typeof revenueResult === 'number' ? revenueResult : 0
  const eventsCount = eventsResult?.count ?? 0
  const inquiriesCount = inquiriesResult?.count ?? 0
  const outstandingCents = typeof outstandingResult === 'number' ? outstandingResult : 0

  return [
    {
      label: 'Revenue (all time)',
      value: `$${(revenueCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      href: '/financials',
    },
    {
      label: 'Events this week',
      value: String(eventsCount),
      href: '/schedule',
    },
    {
      label: 'Open inquiries',
      value: String(inquiriesCount),
      href: '/inquiries',
    },
    {
      label: 'Outstanding',
      value:
        outstandingCents > 0
          ? `$${(outstandingCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
          : '$0',
      href: '/finance/payments',
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

  return (
    <div className="col-span-1 sm:col-span-2 lg:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
      {metrics.map((metric) => (
        <Link
          key={metric.label}
          href={metric.href}
          className="group rounded-xl border border-stone-800 bg-stone-900/60 px-4 py-3 hover:border-stone-700 hover:bg-stone-800/60 transition-colors"
        >
          <p className="text-xs text-stone-500 font-medium">{metric.label}</p>
          <p className="text-xl font-display text-stone-100 mt-0.5 group-hover:text-brand-400 transition-colors">
            {metric.value}
          </p>
        </Link>
      ))}
    </div>
  )
}
