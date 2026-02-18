// Source Analytics Dashboard
// Charts and tables showing where inquiries come from and how they convert

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import {
  getSourceDistribution,
  getConversionRatesBySource,
  getRevenueBySource,
  getSourceTrends,
  getPartnerLeaderboard,
} from '@/lib/partners/analytics'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AnalyticsClient } from '@/components/analytics/analytics-client'

export const metadata: Metadata = { title: 'Analytics - ChefFlow' }

const TYPE_LABELS: Record<string, string> = {
  airbnb_host: 'Airbnb',
  business: 'Business',
  platform: 'Platform',
  individual: 'Individual',
  venue: 'Venue',
  other: 'Other',
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export default async function AnalyticsPage() {
  await requireChef()

  const [distribution, conversions, revenue, trends, leaderboard] = await Promise.all([
    getSourceDistribution(),
    getConversionRatesBySource(),
    getRevenueBySource(),
    getSourceTrends(12),
    getPartnerLeaderboard(),
  ])

  // Extract unique source names from trends for the line chart
  const trendSources = new Set<string>()
  for (const point of trends) {
    for (const key of Object.keys(point)) {
      if (key !== 'month') trendSources.add(key)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Source Analytics</h1>
        <p className="text-stone-600 mt-1">
          Understand where your inquiries come from, how they convert, and which sources drive revenue
        </p>
      </div>

      {/* Charts Grid */}
      <AnalyticsClient
        distribution={distribution}
        conversions={conversions}
        revenue={revenue}
        trends={trends}
        trendSources={Array.from(trendSources)}
      />

      {/* Partner Leaderboard */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-stone-900 mb-4">Partner Leaderboard</h2>

        {leaderboard.length === 0 ? (
          <p className="text-stone-400 text-sm py-4">
            No partner data yet. <Link href="/partners/new" className="text-brand-600 hover:underline">Add your first partner</Link> and link inquiries to see them here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left py-2 px-3 text-stone-500 font-medium">Partner</th>
                  <th className="text-left py-2 px-3 text-stone-500 font-medium">Type</th>
                  <th className="text-right py-2 px-3 text-stone-500 font-medium">Referrals</th>
                  <th className="text-right py-2 px-3 text-stone-500 font-medium">Events</th>
                  <th className="text-right py-2 px-3 text-stone-500 font-medium">Completed</th>
                  <th className="text-right py-2 px-3 text-stone-500 font-medium">Revenue</th>
                  <th className="text-right py-2 px-3 text-stone-500 font-medium">Guests</th>
                  <th className="text-right py-2 px-3 text-stone-500 font-medium">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, i) => (
                  <tr key={entry.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="py-2 px-3">
                      <Link href={`/partners/${entry.id}`} className="font-medium text-stone-900 hover:text-brand-600">
                        {entry.name}
                      </Link>
                    </td>
                    <td className="py-2 px-3">
                      <Badge variant="default">
                        {TYPE_LABELS[entry.partner_type] || entry.partner_type}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-right text-stone-700">{entry.inquiry_count}</td>
                    <td className="py-2 px-3 text-right text-stone-700">{entry.event_count}</td>
                    <td className="py-2 px-3 text-right text-stone-700">{entry.completed_count}</td>
                    <td className="py-2 px-3 text-right font-medium text-stone-900">
                      {formatCents(entry.revenue_cents)}
                    </td>
                    <td className="py-2 px-3 text-right text-stone-700">{entry.guest_count}</td>
                    <td className="py-2 px-3 text-right">
                      <span className={entry.conversion_rate >= 50 ? 'text-emerald-600 font-medium' : 'text-stone-600'}>
                        {entry.conversion_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
