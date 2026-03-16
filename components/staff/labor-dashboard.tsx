'use client'

// Labor Dashboard - labor cost analytics with chart and detail table.
// Shows labor cost vs revenue by month with a ratio target indicator.

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingDown, TrendingUp, Target } from '@/components/ui/icons'
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

// ─── Types ────────────────────────────────────────────────────────────────────

type LaborByMonth = {
  month: string
  laborCents: number
  revenueCents: number
  ratio: number
}

type CurrentMonthDetail = {
  eventName: string
  laborCents: number
  revenueCents: number
  staffCount: number
}

interface LaborDashboardProps {
  laborByMonth: LaborByMonth[]
  currentMonthDetail: CurrentMonthDetail[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatMoneyShort(cents: number): string {
  if (cents >= 100000) {
    return `$${(cents / 100000).toFixed(1)}k`
  }
  return `$${(cents / 100).toFixed(0)}`
}

function getRatioVariant(ratio: number): 'success' | 'warning' | 'error' {
  if (ratio >= 20 && ratio <= 30) return 'success'
  if (ratio < 20 || (ratio > 30 && ratio <= 40)) return 'warning'
  return 'error'
}

function getRatioLabel(ratio: number): string {
  if (ratio >= 20 && ratio <= 30) return 'On Target'
  if (ratio < 20) return 'Below Target'
  return 'Above Target'
}

const TARGET_MIN = 20
const TARGET_MAX = 30

// ─── Component ────────────────────────────────────────────────────────────────

export function LaborDashboard({ laborByMonth, currentMonthDetail }: LaborDashboardProps) {
  // Compute current month totals from detail
  const currentTotalLabor = currentMonthDetail.reduce((sum, e) => sum + e.laborCents, 0)
  const currentTotalRevenue = currentMonthDetail.reduce((sum, e) => sum + e.revenueCents, 0)
  const currentRatio =
    currentTotalRevenue > 0
      ? Math.round((currentTotalLabor / currentTotalRevenue) * 10000) / 100
      : 0

  // Chart data: transform cents to dollars for readability
  const chartData = laborByMonth.map((m) => ({
    month: m.month,
    labor: m.laborCents / 100,
    revenue: m.revenueCents / 100,
    ratio: m.ratio,
  }))

  // Averages across all months
  const avgRatio =
    laborByMonth.length > 0
      ? Math.round(
          (laborByMonth.reduce((sum, m) => sum + m.ratio, 0) / laborByMonth.length) * 100
        ) / 100
      : 0

  const formatDollars = (v: number) => (v ? `$${v.toFixed(0)}` : '')

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-stone-400" />
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                Current Month Labor
              </span>
            </div>
            <p className="text-2xl font-semibold text-stone-900">
              {formatMoney(currentTotalLabor)}
            </p>
            <p className="text-xs text-stone-500 mt-1">
              across {currentMonthDetail.length} event{currentMonthDetail.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-stone-400" />
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                Labor Ratio
              </span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-semibold text-stone-900">{currentRatio.toFixed(1)}%</p>
              <Badge variant={getRatioVariant(currentRatio)}>{getRatioLabel(currentRatio)}</Badge>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Target: {TARGET_MIN}\u2013{TARGET_MAX}% of revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              {avgRatio > 30 ? (
                <TrendingUp className="h-4 w-4 text-red-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-emerald-400" />
              )}
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                Avg Ratio (All Time)
              </span>
            </div>
            <p className="text-2xl font-semibold text-stone-900">{avgRatio.toFixed(1)}%</p>
            <p className="text-xs text-stone-500 mt-1">
              {laborByMonth.length} month{laborByMonth.length !== 1 ? 's' : ''} of data
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Labor vs Revenue by Month</CardTitle>
        </CardHeader>
        <CardContent>
          {laborByMonth.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-8 w-8 text-stone-300 mx-auto mb-2" />
              <p className="text-sm text-stone-500">No labor data available yet.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#78716c' }} />
                <YAxis
                  yAxisId="left"
                  tickFormatter={formatDollars}
                  tick={{ fontSize: 11, fill: '#78716c' }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{ fontSize: 11, fill: '#78716c' }}
                  domain={[0, 60]}
                />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={
                    ((value: number | undefined, name: string) => {
                      if (value == null) return ['', '']
                      if (name === 'ratio') return [`${value.toFixed(1)}%`, 'Labor Ratio']
                      return [
                        `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                        name === 'labor' ? 'Labor Cost' : 'Revenue',
                      ]
                    }) as any
                  }
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="revenue"
                  name="Revenue"
                  fill="#d47530"
                  radius={[4, 4, 0, 0]}
                  opacity={0.8}
                />
                <Bar
                  yAxisId="left"
                  dataKey="labor"
                  name="Labor Cost"
                  fill="#78716c"
                  radius={[4, 4, 0, 0]}
                  opacity={0.8}
                />
                <Line
                  yAxisId="right"
                  dataKey="ratio"
                  name="Labor Ratio %"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}

          {/* Target Range Indicator */}
          {laborByMonth.length > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-stone-500">
              <Target className="h-3.5 w-3.5" />
              <span>
                Target labor ratio: {TARGET_MIN}\u2013{TARGET_MAX}% of revenue
              </span>
              <span className="inline-block w-3 h-0.5 bg-blue-500" />
              <span>Blue line = actual ratio</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Month Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Month Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {currentMonthDetail.length === 0 ? (
            <p className="text-sm text-stone-500 text-center py-6">
              No events with labor data this month.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-3 py-3">
                      Event
                    </th>
                    <th className="text-right text-xs font-medium text-stone-500 uppercase tracking-wider px-3 py-3">
                      Staff
                    </th>
                    <th className="text-right text-xs font-medium text-stone-500 uppercase tracking-wider px-3 py-3">
                      Labor Cost
                    </th>
                    <th className="text-right text-xs font-medium text-stone-500 uppercase tracking-wider px-3 py-3">
                      Revenue
                    </th>
                    <th className="text-right text-xs font-medium text-stone-500 uppercase tracking-wider px-3 py-3">
                      Ratio
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentMonthDetail.map((event, idx) => {
                    const eventRatio =
                      event.revenueCents > 0
                        ? Math.round((event.laborCents / event.revenueCents) * 10000) / 100
                        : 0
                    return (
                      <tr
                        key={idx}
                        className={`border-b border-stone-100 ${idx % 2 === 0 ? '' : 'bg-stone-50/50'}`}
                      >
                        <td className="px-3 py-3">
                          <span className="text-sm font-medium text-stone-900">
                            {event.eventName}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="text-sm text-stone-600">{event.staffCount}</span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="text-sm font-medium text-stone-700">
                            {formatMoney(event.laborCents)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="text-sm text-stone-600">
                            {formatMoney(event.revenueCents)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Badge variant={getRatioVariant(eventRatio)}>
                            {eventRatio.toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-stone-200 bg-stone-50/50">
                    <td className="px-3 py-3 text-sm font-semibold text-stone-900">Total</td>
                    <td className="px-3 py-3 text-right text-sm font-medium text-stone-700">
                      {currentMonthDetail.reduce((sum, e) => sum + e.staffCount, 0)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-stone-900">
                      {formatMoney(currentTotalLabor)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-medium text-stone-700">
                      {formatMoney(currentTotalRevenue)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Badge variant={getRatioVariant(currentRatio)}>
                        {currentRatio.toFixed(1)}%
                      </Badge>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
