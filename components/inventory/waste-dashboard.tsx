'use client'

// WasteDashboard — Waste analytics dashboard with summary cards and charts.
// Shows waste cost by reason (bar chart), monthly trend (line chart), and key metrics.

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trash2, DollarSign, Hash, TrendingUp } from 'lucide-react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export type WasteDashboardData = {
  byReason: { reason: string; count: number; totalCostCents: number }[]
  totalCostCents: number
  totalEntries: number
}

export type WasteTrendData = {
  month: string
  costCents: number
  count: number
}

const REASON_COLORS: Record<string, string> = {
  overcooked: '#ef4444',
  leftover: '#f59e0b',
  spoilage: '#8b5cf6',
  overportioned: '#ec4899',
  trim: '#6366f1',
  mistake: '#dc2626',
  expired: '#9333ea',
  other: '#78716c',
}

const REASON_LABELS: Record<string, string> = {
  overcooked: 'Overcooked',
  leftover: 'Leftover',
  spoilage: 'Spoilage',
  overportioned: 'Over-portioned',
  trim: 'Trim / Prep',
  mistake: 'Mistake',
  expired: 'Expired',
  other: 'Other',
}

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function WasteDashboard({
  dashboard,
  trend,
}: {
  dashboard: WasteDashboardData
  trend: WasteTrendData[]
}) {
  const topReason =
    dashboard.byReason.length > 0
      ? dashboard.byReason.reduce((a, b) => (a.totalCostCents > b.totalCostCents ? a : b))
      : null

  // Prepare bar chart data
  const reasonChartData = dashboard.byReason.map((r) => ({
    reason: REASON_LABELS[r.reason] || r.reason,
    cost: r.totalCostCents / 100,
    count: r.count,
    fill: REASON_COLORS[r.reason] || '#78716c',
  }))

  // Prepare trend chart data
  const trendChartData = trend.map((t) => ({
    month: t.month,
    cost: t.costCents / 100,
    count: t.count,
  }))

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-950">
                <DollarSign className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wide">Total Waste Cost</p>
                <p className="text-xl font-bold text-stone-900">
                  {formatDollars(dashboard.totalCostCents)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-950">
                <Hash className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wide">Total Entries</p>
                <p className="text-xl font-bold text-stone-900">{dashboard.totalEntries}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-stone-100">
                <TrendingUp className="h-5 w-5 text-stone-600" />
              </div>
              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wide">Top Reason</p>
                {topReason ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-lg font-bold text-stone-900">
                      {REASON_LABELS[topReason.reason] || topReason.reason}
                    </span>
                    <Badge variant="error">{formatDollars(topReason.totalCostCents)}</Badge>
                  </div>
                ) : (
                  <p className="text-lg font-bold text-stone-400">None</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Waste by Reason Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-stone-600" />
            Waste Cost by Reason
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reasonChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart
                data={reasonChartData}
                margin={{ top: 10, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis
                  dataKey="reason"
                  tick={{ fontSize: 11, fill: '#78716c' }}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                  tick={{ fontSize: 11, fill: '#78716c' }}
                />
                <Tooltip
                  formatter={
                    ((v: number | undefined) => [`$${(v ?? 0).toFixed(2)}`, 'Cost']) as any
                  }
                  labelStyle={{ color: '#44403c' }}
                />
                <Bar dataKey="cost" name="Waste Cost ($)" radius={[4, 4, 0, 0]} fill="#ef4444" />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-stone-400 py-8 text-sm">No waste data to display.</p>
          )}
        </CardContent>
      </Card>

      {/* Monthly Trend Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-stone-600" />
            Monthly Waste Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trendChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart
                data={trendChartData}
                margin={{ top: 10, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#78716c' }} />
                <YAxis
                  yAxisId="cost"
                  tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                  tick={{ fontSize: 11, fill: '#78716c' }}
                />
                <YAxis
                  yAxisId="count"
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#78716c' }}
                />
                <Tooltip
                  formatter={
                    ((v: number | undefined, name: string) => [
                      name === 'Cost ($)' ? `$${(v ?? 0).toFixed(2)}` : (v ?? 0),
                      name,
                    ]) as any
                  }
                  labelStyle={{ color: '#44403c' }}
                />
                <Legend />
                <Line
                  yAxisId="cost"
                  dataKey="cost"
                  name="Cost ($)"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: '#ef4444', r: 4 }}
                />
                <Bar
                  yAxisId="count"
                  dataKey="count"
                  name="Entries"
                  fill="#fbbf24"
                  radius={[4, 4, 0, 0]}
                  opacity={0.6}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-stone-400 py-8 text-sm">No trend data to display.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
