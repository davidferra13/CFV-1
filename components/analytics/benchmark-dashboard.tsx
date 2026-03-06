'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, DollarSign, Percent, Users, Clock } from '@/components/ui/icons'

// ─── Types ────────────────────────────────────────────────────────────────────

interface KPISnapshot {
  avgEventValueCents: number
  avgFoodCostPct: number
  bookingConversionRate: number
  clientReturnRate: number
  revenuePerHourCents: number
}

interface HistoryPoint extends KPISnapshot {
  date: string
}

interface BenchmarkDashboardProps {
  current: KPISnapshot
  history: HistoryPoint[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const KPI_CONFIG = [
  {
    key: 'avgEventValueCents' as const,
    label: 'Avg Event Value',
    icon: DollarSign,
    iconColor: 'text-emerald-500',
    bgColor: 'bg-emerald-950',
    chartColor: '#10b981',
    format: (v: number) => `$${(v / 100).toFixed(2)}`,
  },
  {
    key: 'avgFoodCostPct' as const,
    label: 'Food Cost %',
    icon: Percent,
    iconColor: 'text-amber-500',
    bgColor: 'bg-amber-950',
    chartColor: '#f59e0b',
    format: (v: number) => `${v.toFixed(1)}%`,
  },
  {
    key: 'bookingConversionRate' as const,
    label: 'Booking Conversion',
    icon: TrendingUp,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-950',
    chartColor: '#3b82f6',
    format: (v: number) => `${(v * 100).toFixed(1)}%`,
  },
  {
    key: 'clientReturnRate' as const,
    label: 'Client Return Rate',
    icon: Users,
    iconColor: 'text-violet-500',
    bgColor: 'bg-violet-950',
    chartColor: '#8b5cf6',
    format: (v: number) => `${(v * 100).toFixed(1)}%`,
  },
  {
    key: 'revenuePerHourCents' as const,
    label: 'Revenue / Hour',
    icon: Clock,
    iconColor: 'text-brand-600',
    bgColor: 'bg-orange-950',
    chartColor: '#d47530',
    format: (v: number) => `$${(v / 100).toFixed(2)}`,
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function BenchmarkDashboard({ current, history }: BenchmarkDashboardProps) {
  // Compute sparkline trend (last value vs first value in history)
  function getTrend(key: keyof KPISnapshot): 'up' | 'down' | 'flat' {
    if (history.length < 2) return 'flat'
    const first = history[0][key]
    const last = history[history.length - 1][key]
    if (last > first * 1.01) return 'up'
    if (last < first * 0.99) return 'down'
    return 'flat'
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {KPI_CONFIG.map((kpi) => {
          const Icon = kpi.icon
          const trend = getTrend(kpi.key)

          return (
            <Card key={kpi.key}>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-8 h-8 rounded-lg ${kpi.bgColor} flex items-center justify-center`}
                  >
                    <Icon className={`h-4 w-4 ${kpi.iconColor}`} />
                  </div>
                  {trend !== 'flat' && (
                    <span
                      className={`text-xs font-medium ${
                        trend === 'up' ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {trend === 'up' ? 'Trending up' : 'Trending down'}
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-stone-900">{kpi.format(current[kpi.key])}</p>
                <p className="text-xs text-stone-500 mt-0.5">{kpi.label}</p>

                {/* Mini sparkline using simple bars */}
                {history.length > 1 && (
                  <div className="flex items-end gap-px h-6 mt-2">
                    {history.slice(-12).map((point, i, arr) => {
                      const values = history.map((h) => h[kpi.key])
                      const max = Math.max(...values, 1)
                      const heightPct = Math.max((point[kpi.key] / max) * 100, 5)
                      return (
                        <div
                          key={i}
                          className="flex-1 rounded-t-sm transition-all"
                          style={{
                            height: `${heightPct}%`,
                            backgroundColor: kpi.chartColor,
                            opacity: i === arr.length - 1 ? 1 : 0.4,
                          }}
                        />
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Historical Trend Chart */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>KPI Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={history} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#78716c' }} />
                <YAxis
                  yAxisId="dollars"
                  tickFormatter={(v: number) => `$${(v / 100).toFixed(0)}`}
                  tick={{ fontSize: 11, fill: '#78716c' }}
                />
                <YAxis
                  yAxisId="percent"
                  orientation="right"
                  tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                  tick={{ fontSize: 11, fill: '#78716c' }}
                />
                <Tooltip
                  formatter={
                    ((value: number | undefined, name: string | undefined) => {
                      const v = value ?? 0
                      if (name === 'Avg Event Value' || name === 'Revenue / Hour') {
                        return [`$${(v / 100).toFixed(2)}`, name]
                      }
                      if (name === 'Food Cost %') {
                        return [`${v.toFixed(1)}%`, name]
                      }
                      return [`${(v * 100).toFixed(1)}%`, name]
                    }) as any
                  }
                />
                <Legend />
                <Line
                  yAxisId="dollars"
                  type="monotone"
                  dataKey="avgEventValueCents"
                  name="Avg Event Value"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 3 }}
                />
                <Line
                  yAxisId="percent"
                  type="monotone"
                  dataKey="bookingConversionRate"
                  name="Booking Conversion"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 3 }}
                />
                <Line
                  yAxisId="percent"
                  type="monotone"
                  dataKey="clientReturnRate"
                  name="Client Return Rate"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', r: 3 }}
                />
                <Line
                  yAxisId="dollars"
                  type="monotone"
                  dataKey="revenuePerHourCents"
                  name="Revenue / Hour"
                  stroke="#d47530"
                  strokeWidth={2}
                  dot={{ fill: '#d47530', r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
