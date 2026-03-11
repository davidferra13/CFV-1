// Referral Source Analytics Dashboard
// Shows referral funnel, client acquisition by source, top referrers, and time series

'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import type { ReferralAnalyticsData } from '@/lib/analytics/referral-analytics'

// ─── Constants ───────────────────────────────────────────────────────────────

const COLORS = [
  '#8b5cf6',
  '#06b6d4',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#ec4899',
  '#6366f1',
  '#14b8a6',
  '#f97316',
  '#64748b',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function formatCurrencyCompact(cents: number): string {
  if (cents >= 100_000_00) {
    return `$${(cents / 100_00 / 100).toFixed(0)}k`
  }
  return formatCurrency(cents)
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ReferralAnalyticsDashboard({ data }: { data: ReferralAnalyticsData }) {
  const { funnel, clientAcquisition, topReferrers, timeSeries, timeSeriesSources } = data

  // Find best source by revenue
  const bestSource = funnel.sources.length > 0 ? funnel.sources[0].source : 'N/A'

  return (
    <div className="space-y-6">
      {/* ─── A. Summary Stats Row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-stone-500">Total Sources</p>
            <p className="text-3xl font-bold text-stone-900">{funnel.sources.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-stone-500">Overall Conversion</p>
            <p className="text-3xl font-bold text-stone-900">
              {funnel.totals.overallConversionRate}%
            </p>
            <p className="text-xs text-stone-400 mt-1">
              {funnel.totals.totalCompleted} of {funnel.totals.totalInquiries} inquiries
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-stone-500">Total Revenue</p>
            <p className="text-3xl font-bold text-stone-900">
              {formatCurrency(funnel.totals.totalRevenueCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-stone-500">Best Source</p>
            <p className="text-2xl font-bold text-stone-900">{bestSource}</p>
            {funnel.sources.length > 0 && (
              <p className="text-xs text-stone-400 mt-1">
                {formatCurrency(funnel.sources[0].totalRevenueCents)} revenue
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── B. Revenue Attribution Table ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Attribution by Source</CardTitle>
        </CardHeader>
        <CardContent>
          {funnel.sources.length === 0 ? (
            <p className="text-sm text-stone-400 italic text-center py-8">
              No inquiry data available yet.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200">
                      <th className="text-left py-2 px-3 font-medium text-stone-600">Source</th>
                      <th className="text-right py-2 px-3 font-medium text-stone-600">Inquiries</th>
                      <th className="text-right py-2 px-3 font-medium text-stone-600">Quoted</th>
                      <th className="text-right py-2 px-3 font-medium text-stone-600">Accepted</th>
                      <th className="text-right py-2 px-3 font-medium text-stone-600">Completed</th>
                      <th className="text-right py-2 px-3 font-medium text-stone-600">Revenue</th>
                      <th className="text-right py-2 px-3 font-medium text-stone-600">Avg Value</th>
                      <th className="text-right py-2 px-3 font-medium text-stone-600">Conv %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {funnel.sources.map((row) => (
                      <tr key={row.source} className="border-b border-stone-100 hover:bg-stone-50">
                        <td className="py-2 px-3 font-medium text-stone-900">{row.source}</td>
                        <td className="py-2 px-3 text-right text-stone-200">{row.inquiryCount}</td>
                        <td className="py-2 px-3 text-right text-stone-200">{row.quoteCount}</td>
                        <td className="py-2 px-3 text-right text-stone-200">{row.acceptedCount}</td>
                        <td className="py-2 px-3 text-right text-stone-200">
                          {row.completedCount}
                        </td>
                        <td className="py-2 px-3 text-right text-stone-200 font-medium">
                          {formatCurrency(row.totalRevenueCents)}
                        </td>
                        <td className="py-2 px-3 text-right text-stone-200">
                          {row.avgEventValueCents > 0
                            ? formatCurrency(row.avgEventValueCents)
                            : '--'}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <Badge
                            variant={
                              row.conversionRate >= 50
                                ? 'success'
                                : row.conversionRate >= 25
                                  ? 'warning'
                                  : 'error'
                            }
                          >
                            {row.conversionRate}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-stone-300 bg-stone-50 font-medium">
                      <td className="py-2 px-3 text-stone-900">Total</td>
                      <td className="py-2 px-3 text-right text-stone-900">
                        {funnel.totals.totalInquiries}
                      </td>
                      <td className="py-2 px-3 text-right text-stone-200">--</td>
                      <td className="py-2 px-3 text-right text-stone-200">--</td>
                      <td className="py-2 px-3 text-right text-stone-900">
                        {funnel.totals.totalCompleted}
                      </td>
                      <td className="py-2 px-3 text-right text-stone-900">
                        {formatCurrency(funnel.totals.totalRevenueCents)}
                      </td>
                      <td className="py-2 px-3 text-right text-stone-200">--</td>
                      <td className="py-2 px-3 text-right">
                        <Badge variant="default">{funnel.totals.overallConversionRate}%</Badge>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Revenue bar chart */}
              <div className="mt-6">
                <p className="text-sm font-medium text-stone-600 mb-3">Revenue by Source</p>
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(200, funnel.sources.length * 40)}
                >
                  <BarChart
                    data={funnel.sources.map((s) => ({
                      name: s.source,
                      revenue: s.totalRevenueCents,
                    }))}
                    layout="vertical"
                    margin={{ left: 20, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12, fill: '#78716c' }}
                      tickFormatter={(v) => formatCurrencyCompact(v)}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 12, fill: '#44403c' }}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }}
                      formatter={(value: number | undefined) => [
                        formatCurrency(value ?? 0),
                        'Revenue',
                      ]}
                    />
                    <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── C. Client Acquisition by Source ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Client Acquisition by Source</CardTitle>
        </CardHeader>
        <CardContent>
          {clientAcquisition.length === 0 ? (
            <p className="text-sm text-stone-400 italic text-center py-8">
              No client data with referral sources yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="text-left py-2 px-3 font-medium text-stone-600">Source</th>
                    <th className="text-right py-2 px-3 font-medium text-stone-600">Clients</th>
                    <th className="text-right py-2 px-3 font-medium text-stone-600">Avg LTV</th>
                    <th className="text-right py-2 px-3 font-medium text-stone-600">Total LTV</th>
                  </tr>
                </thead>
                <tbody>
                  {clientAcquisition.map((row) => (
                    <tr key={row.source} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="py-2 px-3 font-medium text-stone-900">{row.source}</td>
                      <td className="py-2 px-3 text-right text-stone-200">{row.clientCount}</td>
                      <td className="py-2 px-3 text-right text-stone-200">
                        {row.avgLifetimeValueCents > 0
                          ? formatCurrency(row.avgLifetimeValueCents)
                          : '--'}
                      </td>
                      <td className="py-2 px-3 text-right text-stone-200 font-medium">
                        {row.totalLifetimeValueCents > 0
                          ? formatCurrency(row.totalLifetimeValueCents)
                          : '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── D. Top Referrers ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Top Referrers (Named)</CardTitle>
        </CardHeader>
        <CardContent>
          {topReferrers.length === 0 ? (
            <p className="text-sm text-stone-400 italic text-center py-8">
              No named referrers found. Clients with referral_source = &quot;referral&quot; and a
              referral_source_detail will appear here.
            </p>
          ) : (
            <div className="space-y-3">
              {topReferrers.map((ref, idx) => (
                <div
                  key={ref.name}
                  className="flex items-center justify-between py-2 px-3 rounded-lg border border-stone-100 hover:bg-stone-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-50 text-brand-600 text-sm font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-medium text-stone-900">{ref.name}</p>
                      <p className="text-xs text-stone-500">
                        {ref.clientCount} client{ref.clientCount !== 1 ? 's' : ''} |{' '}
                        {ref.eventCount} event{ref.eventCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-stone-900">
                      {ref.totalRevenueCents > 0 ? formatCurrency(ref.totalRevenueCents) : '--'}
                    </p>
                    <p className="text-xs text-stone-500">revenue</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── E. Time Series (Inquiries by Source over Time) ───────────────── */}
      {timeSeries.length > 0 && timeSeriesSources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Inquiry Trends by Source (Last 12 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeries} margin={{ left: 10, right: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: '#78716c' }}
                  angle={-30}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 12, fill: '#78716c' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }} />
                <Legend />
                {timeSeriesSources.slice(0, 6).map((source, i) => (
                  <Line
                    key={source}
                    type="monotone"
                    dataKey={source}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
