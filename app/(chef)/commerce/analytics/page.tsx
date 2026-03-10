// Peak Hour Analytics - covers-per-hour, avg check trending, daily/weekly performance
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import {
  getPeakHours,
  getDailyPerformanceMetrics,
  getWeekOverWeekComparison,
  getAverageCheckTrend,
  getTopSellingItems,
} from '@/lib/commerce/analytics-actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PeakHourChart } from '@/components/commerce/peak-hour-chart'
import { DailyMetricsCards } from '@/components/commerce/daily-metrics-cards'
import { AnalyticsDatePicker } from './analytics-client'

export const metadata: Metadata = { title: 'Peak Hour Analytics - ChefFlow' }

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; from?: string; to?: string }>
}) {
  await requireChef()
  await requirePro('commerce')

  const params = await searchParams
  const today = new Date().toISOString().split('T')[0]
  const date = params.date || today
  const from =
    params.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const to = params.to || today

  const [peakHours, dailyMetrics, weekComparison, avgCheckTrend, topItems] = await Promise.all([
    getPeakHours(from, to),
    getDailyPerformanceMetrics(date),
    getWeekOverWeekComparison(date),
    getAverageCheckTrend(from, to, 'daily'),
    getTopSellingItems(from, to, 10),
  ])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Peak Hour Analytics</h1>
          <p className="text-stone-400 mt-1">Covers, average check, and performance trends</p>
        </div>
      </div>

      <AnalyticsDatePicker defaultDate={date} defaultFrom={from} defaultTo={to} />

      {/* Daily metrics cards */}
      <DailyMetricsCards metrics={dailyMetrics} weekComparison={weekComparison} />

      {/* Peak hour chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sales by Hour</CardTitle>
        </CardHeader>
        <CardContent>
          <PeakHourChart data={peakHours} />
        </CardContent>
      </Card>

      {/* Week over week comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Week Over Week</CardTitle>
        </CardHeader>
        <CardContent>
          {weekComparison.length === 0 ? (
            <p className="text-stone-500 text-sm">No comparison data</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {weekComparison.map((row) => (
                <div
                  key={row.metric}
                  className="text-center p-3 rounded-lg bg-stone-900/40 border border-stone-800"
                >
                  <p className="text-xs text-stone-500">{row.metric}</p>
                  <p className="text-lg font-bold text-stone-100 mt-1">
                    {row.metric.includes('Revenue') || row.metric.includes('Check')
                      ? `$${(row.thisWeek / 100).toFixed(2)}`
                      : row.thisWeek}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    vs{' '}
                    {row.metric.includes('Revenue') || row.metric.includes('Check')
                      ? `$${(row.lastWeek / 100).toFixed(2)}`
                      : row.lastWeek}
                  </p>
                  <Badge
                    variant={
                      row.direction === 'up'
                        ? 'success'
                        : row.direction === 'down'
                          ? 'error'
                          : 'default'
                    }
                  >
                    {row.direction === 'up' ? '+' : row.direction === 'down' ? '-' : ''}
                    {row.changePercent}%
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Average check trend */}
      <Card>
        <CardHeader>
          <CardTitle>Average Check Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {avgCheckTrend.length === 0 ? (
            <p className="text-stone-500 text-sm">No trend data</p>
          ) : (
            <div className="space-y-2">
              {avgCheckTrend.map((point) => (
                <div
                  key={point.period}
                  className="flex items-center justify-between py-2 border-b border-stone-800 last:border-0"
                >
                  <div>
                    <span className="text-stone-200 font-medium">{point.period}</span>
                    <span className="text-stone-500 text-sm ml-3">
                      {point.salesCount} sale{point.salesCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="text-stone-200 font-medium">
                    ${(point.avgCheckCents / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top selling items */}
      <Card>
        <CardHeader>
          <CardTitle>Top Selling Items</CardTitle>
        </CardHeader>
        <CardContent>
          {topItems.length === 0 ? (
            <p className="text-stone-500 text-sm">No item data for this period</p>
          ) : (
            <div className="space-y-2">
              {topItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 border-b border-stone-800 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-stone-500 text-sm w-6">{idx + 1}.</span>
                    <div>
                      <span className="text-stone-200">{item.name}</span>
                      {item.category && (
                        <span className="text-stone-500 text-sm ml-2">{item.category}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-stone-200 font-medium">{item.quantitySold} sold</span>
                    <span className="text-stone-500 text-sm ml-3">
                      ${(item.revenueCents / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
