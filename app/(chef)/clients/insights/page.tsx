import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getClientsWithStats } from '@/lib/clients/actions'
import { getEngagementStats } from '@/lib/activity/actions'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata: Metadata = { title: 'Client Insights' }

const VIEWS = [
  {
    href: '/clients/insights/top-clients',
    label: 'Top Clients',
    description: 'Clients ranked by total lifetime spend',
    icon: '🏆',
  },
  {
    href: '/clients/insights/most-frequent',
    label: 'Most Frequent',
    description: 'Clients who book the most often',
    icon: '🔁',
  },
  {
    href: '/clients/insights/at-risk',
    label: 'At-Risk Clients',
    description: "Clients who haven't booked in 90+ days",
    icon: '⚡',
  },
  {
    href: '/clients/presence',
    label: "Who's Online",
    description: "Real-time view of who's on your portal right now",
    icon: '👁',
  },
]

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

export default async function ClientInsightsPage() {
  await requireChef()
  const [clients, engagementStats] = await Promise.all([
    getClientsWithStats(),
    getEngagementStats().catch(() => null),
  ])

  const sortedBySpend = [...clients].sort(
    (a, b) => (b.totalSpentCents ?? 0) - (a.totalSpentCents ?? 0)
  )
  const topClient = sortedBySpend[0]

  const sortedByEvents = [...clients].sort((a, b) => (b.totalEvents ?? 0) - (a.totalEvents ?? 0))
  const mostFrequent = sortedByEvents[0]

  const now = Date.now()
  const atRiskCount = clients.filter((c: any) => {
    if (!c.lastEventDate) return false
    return now - new Date(c.lastEventDate).getTime() > NINETY_DAYS_MS
  }).length

  const avgSpend =
    clients.length > 0
      ? clients.reduce((sum: any, c: any) => sum + (c.totalSpentCents ?? 0), 0) / clients.length
      : 0

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients" className="text-sm text-stone-500 hover:text-stone-300">
          ← Clients
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Client Insights</h1>
        <p className="text-stone-500 mt-1">
          Intelligence on your clientele - who&apos;s valuable, who&apos;s frequent, who needs
          attention
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">
            Top Client by Revenue
          </p>
          {topClient ? (
            <>
              <Link
                href={`/clients/${topClient.id}`}
                className="text-lg font-bold text-stone-100 hover:text-brand-600"
              >
                {topClient.full_name}
              </Link>
              <p className="text-sm text-green-700 mt-0.5">
                {formatCurrency(topClient.totalSpentCents ?? 0)} lifetime
              </p>
            </>
          ) : (
            <p className="text-stone-400 text-sm">No data yet</p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">
            Most Frequent Client
          </p>
          {mostFrequent && (mostFrequent.totalEvents ?? 0) > 0 ? (
            <>
              <Link
                href={`/clients/${mostFrequent.id}`}
                className="text-lg font-bold text-stone-100 hover:text-brand-600"
              >
                {mostFrequent.full_name}
              </Link>
              <p className="text-sm text-amber-700 mt-0.5">{mostFrequent.totalEvents} events</p>
            </>
          ) : (
            <p className="text-stone-400 text-sm">No data yet</p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">
            Average Lifetime Spend
          </p>
          <p className="text-2xl font-bold text-stone-100">
            {formatCurrency(Math.round(avgSpend))}
          </p>
          <p className="text-sm text-stone-500 mt-0.5">per client</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">At-Risk Clients</p>
          <p className="text-2xl font-bold text-red-600">{atRiskCount}</p>
          <p className="text-sm text-stone-500 mt-0.5">no booking in 90+ days</p>
        </Card>
        <Link href="/clients/presence" className="col-span-2">
          <Card className="p-4 hover:bg-stone-800 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">
                  Active on Portal Today
                </p>
                <p className="text-2xl font-bold text-stone-100">
                  {engagementStats != null ? engagementStats.activeToday : '—'}
                </p>
                <p className="text-sm text-stone-500 mt-0.5">
                  {engagementStats != null
                    ? `${engagementStats.activeThisWeek} this week · ${engagementStats.totalEventsThisWeek} actions`
                    : 'Activity data unavailable'}
                </p>
              </div>
              <span className="text-sm text-brand-600 font-medium">View live monitor →</span>
            </div>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {VIEWS.map((view) => (
          <Link key={view.href} href={view.href}>
            <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className="text-2xl mb-2">{view.icon}</div>
              <h2 className="font-semibold text-stone-100">{view.label}</h2>
              <p className="text-sm text-stone-500 mt-1">{view.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
