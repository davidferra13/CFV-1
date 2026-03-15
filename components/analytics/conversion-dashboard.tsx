'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, DollarSign, TrendingDown, TrendingUp, XCircle } from '@/components/ui/icons'
import { BookingConversionFunnel } from './booking-conversion-funnel'
import {
  getConversionBySource,
  getAverageTimeInStage,
  getConversionTrend,
  getLeadQualityBySource,
  getLostDealsAnalysis,
  type SourceConversionRow,
  type StageTimingRow,
  type MonthlyConversionRow,
  type SourceQualityRow,
  type LostDealsAnalysis,
} from '@/lib/analytics/conversion-tracking'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatSourceLabel(source: string): string {
  return source.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SourceBreakdownTable({ data }: { data: SourceConversionRow[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversion by Source</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-400 italic text-center py-6">
            No source data available.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion by Source</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700">
                <th className="text-left py-2 px-3 font-medium text-stone-400">Source</th>
                <th className="text-right py-2 px-3 font-medium text-stone-400">Total</th>
                <th className="text-right py-2 px-3 font-medium text-stone-400">Proposed</th>
                <th className="text-right py-2 px-3 font-medium text-stone-400">Accepted</th>
                <th className="text-right py-2 px-3 font-medium text-stone-400">Paid</th>
                <th className="text-right py-2 px-3 font-medium text-stone-400">Completed</th>
                <th className="text-right py-2 px-3 font-medium text-stone-400">Cancelled</th>
                <th className="text-right py-2 px-3 font-medium text-stone-400">Conv. Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.source} className="border-b border-stone-800 hover:bg-stone-800/50">
                  <td className="py-2 px-3 text-stone-100 font-medium">
                    {formatSourceLabel(row.source)}
                  </td>
                  <td className="py-2 px-3 text-right text-stone-300">{row.totalEvents}</td>
                  <td className="py-2 px-3 text-right text-stone-300">{row.proposed}</td>
                  <td className="py-2 px-3 text-right text-stone-300">{row.accepted}</td>
                  <td className="py-2 px-3 text-right text-stone-300">{row.paid}</td>
                  <td className="py-2 px-3 text-right text-stone-300">{row.completed}</td>
                  <td className="py-2 px-3 text-right text-stone-300">{row.cancelled}</td>
                  <td className="py-2 px-3 text-right">
                    {row.conversionRate !== null ? (
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
                    ) : (
                      <span className="text-stone-500">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function StageTimingTable({ data }: { data: StageTimingRow[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-stone-400" />
            Average Time per Stage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-400 italic text-center py-6">
            Not enough transitions to calculate timing.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Find the slowest stage for highlighting
  const maxAvg = Math.max(...data.map((d) => d.avgDays))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-stone-400" />
          Average Time per Stage
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((row) => {
            const isBottleneck = row.avgDays === maxAvg && data.length > 1
            return (
              <div key={`${row.fromStage}-${row.toStage}`} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-300">
                    {row.fromStage} to {row.toStage}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${isBottleneck ? 'text-amber-400' : 'text-stone-100'}`}
                    >
                      {row.avgDays} days avg
                    </span>
                    {isBottleneck && <Badge variant="warning">Bottleneck</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-stone-500">
                  <span>Median: {row.medianDays !== null ? `${row.medianDays}d` : 'N/A'}</span>
                  <span>Min: {row.minDays}d</span>
                  <span>Max: {row.maxDays}d</span>
                  <span>{row.transitionCount} transitions</span>
                </div>
                <div className="bg-stone-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isBottleneck ? 'bg-amber-500' : 'bg-brand-500'}`}
                    style={{ width: `${maxAvg > 0 ? (row.avgDays / maxAvg) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function MonthlyTrendTable({ data }: { data: MonthlyConversionRow[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Conversion Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-400 italic text-center py-6">
            No monthly data available.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Conversion Trend (Last 6 Months)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700">
                <th className="text-left py-2 px-3 font-medium text-stone-400">Month</th>
                <th className="text-right py-2 px-3 font-medium text-stone-400">Created</th>
                <th className="text-right py-2 px-3 font-medium text-stone-400">Completed</th>
                <th className="text-right py-2 px-3 font-medium text-stone-400">Cancelled</th>
                <th className="text-right py-2 px-3 font-medium text-stone-400">Conv. Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => {
                const prevRate = i > 0 ? data[i - 1].conversionRate : null
                const trendUp =
                  prevRate !== null && row.conversionRate !== null && row.conversionRate > prevRate
                const trendDown =
                  prevRate !== null && row.conversionRate !== null && row.conversionRate < prevRate

                return (
                  <tr key={row.month} className="border-b border-stone-800 hover:bg-stone-800/50">
                    <td className="py-2 px-3 text-stone-100 font-medium">{row.month}</td>
                    <td className="py-2 px-3 text-right text-stone-300">{row.created}</td>
                    <td className="py-2 px-3 text-right text-stone-300">{row.completed}</td>
                    <td className="py-2 px-3 text-right text-stone-300">{row.cancelled}</td>
                    <td className="py-2 px-3 text-right">
                      <span className="flex items-center justify-end gap-1">
                        {trendUp && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                        {trendDown && <TrendingDown className="h-3 w-3 text-red-500" />}
                        {row.conversionRate !== null ? (
                          <span
                            className={`font-medium ${
                              row.conversionRate >= 50
                                ? 'text-emerald-400'
                                : row.conversionRate >= 25
                                  ? 'text-amber-400'
                                  : 'text-red-400'
                            }`}
                          >
                            {row.conversionRate}%
                          </span>
                        ) : (
                          <span className="text-stone-500">N/A</span>
                        )}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function LeadQualityTable({ data }: { data: SourceQualityRow[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-stone-400" />
            Lead Quality by Source
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-400 italic text-center py-6">
            No revenue data available.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-stone-400" />
          Lead Quality by Source
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700">
                <th className="text-left py-2 px-3 font-medium text-stone-400">Source</th>
                <th className="text-right py-2 px-3 font-medium text-stone-400">Events</th>
                <th className="text-right py-2 px-3 font-medium text-stone-400">Completed</th>
                <th className="text-right py-2 px-3 font-medium text-stone-400">Total Revenue</th>
                <th className="text-right py-2 px-3 font-medium text-stone-400">Avg Revenue</th>
                <th className="text-right py-2 px-3 font-medium text-stone-400">Conv. Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.source} className="border-b border-stone-800 hover:bg-stone-800/50">
                  <td className="py-2 px-3 text-stone-100 font-medium">
                    {formatSourceLabel(row.source)}
                  </td>
                  <td className="py-2 px-3 text-right text-stone-300">{row.totalEvents}</td>
                  <td className="py-2 px-3 text-right text-stone-300">{row.completedEvents}</td>
                  <td className="py-2 px-3 text-right text-stone-100 font-medium">
                    {formatCents(row.totalRevenueCents)}
                  </td>
                  <td className="py-2 px-3 text-right text-stone-300">
                    {row.completedEvents > 0 ? formatCents(row.avgRevenueCents) : '-'}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {row.conversionRate !== null ? (
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
                    ) : (
                      <span className="text-stone-500">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function LostDealsSummary({ data }: { data: LostDealsAnalysis }) {
  if (data.totalLost === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Lost Deals Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-400 italic text-center py-6">
            No cancelled events. Great job!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <XCircle className="h-5 w-5 text-red-500" />
          Lost Deals Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-stone-800 rounded-lg p-4">
            <p className="text-xs text-stone-500">Total Lost</p>
            <p className="text-2xl font-bold text-red-400">{data.totalLost}</p>
          </div>
          <div className="bg-stone-800 rounded-lg p-4">
            <p className="text-xs text-stone-500">Lost Revenue</p>
            <p className="text-2xl font-bold text-red-400">
              {formatCents(data.totalLostRevenueCents)}
            </p>
          </div>
        </div>

        {/* By stage */}
        {data.lostByStage.length > 0 && (
          <div>
            <p className="text-sm font-medium text-stone-300 mb-3">Lost by Stage</p>
            <div className="space-y-2">
              {data.lostByStage.map(({ stage, count, revenueCents }) => (
                <div key={stage} className="flex items-center justify-between text-sm">
                  <span className="text-stone-300">{stage}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-stone-400">{count} events</span>
                    <span className="text-red-400 font-medium">{formatCents(revenueCents)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top reasons */}
        {data.topReasons.length > 0 && (
          <div>
            <p className="text-sm font-medium text-stone-300 mb-3">Top Cancellation Reasons</p>
            <div className="space-y-2">
              {data.topReasons.slice(0, 5).map(({ reason, count }) => (
                <div key={reason} className="flex items-center justify-between text-sm">
                  <span className="text-stone-300 truncate max-w-[70%]">{reason}</span>
                  <Badge variant="error">{count}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main Dashboard ───────────────────────────────────────────────────────────

export function ConversionDashboard() {
  const [sourceData, setSourceData] = useState<SourceConversionRow[]>([])
  const [timingData, setTimingData] = useState<StageTimingRow[]>([])
  const [trendData, setTrendData] = useState<MonthlyConversionRow[]>([])
  const [qualityData, setQualityData] = useState<SourceQualityRow[]>([])
  const [lostDeals, setLostDeals] = useState<LostDealsAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadAll() {
      setLoading(true)
      setError(null)
      try {
        const [sources, timing, trend, quality, lost] = await Promise.all([
          getConversionBySource(),
          getAverageTimeInStage(),
          getConversionTrend(6),
          getLeadQualityBySource(),
          getLostDealsAnalysis(),
        ])
        if (cancelled) return
        setSourceData(sources)
        setTimingData(timing)
        setTrendData(trend)
        setQualityData(quality)
        setLostDeals(lost)
      } catch (err) {
        if (cancelled) return
        setError('Failed to load conversion analytics')
        console.error('[ConversionDashboard]', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadAll()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-stone-100 mb-1">Booking Conversion Tracking</h2>
        <p className="text-sm text-stone-400">
          Track your inquiry-to-completion pipeline, identify bottlenecks, and see which sources
          convert best.
        </p>
      </div>

      {/* Funnel (self-loading with its own date range selector) */}
      <BookingConversionFunnel />

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-stone-400">Loading analytics...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center">
            <XCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-400">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Source breakdown */}
          <SourceBreakdownTable data={sourceData} />

          {/* Stage timing */}
          <StageTimingTable data={timingData} />

          {/* Lead quality */}
          <LeadQualityTable data={qualityData} />

          {/* Monthly trend */}
          <MonthlyTrendTable data={trendData} />

          {/* Lost deals */}
          {lostDeals && <LostDealsSummary data={lostDeals} />}
        </>
      )}
    </div>
  )
}
