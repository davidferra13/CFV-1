'use client'
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
import type { MonthlyRevenue } from '@/lib/analytics/revenue-forecast'

interface ForecastChartProps {
  historical: MonthlyRevenue[]
  forecast: MonthlyRevenue[]
}

export function ForecastChart({ historical, forecast }: ForecastChartProps) {
  const chartData = [
    ...historical.map((m) => ({ ...m, type: 'actual' })),
    ...forecast.map((m) => ({
      month: m.month,
      actual: null,
      projected: m.projected,
      type: 'forecast',
    })),
  ]

  const formatDollars = (v: number) => (v ? `$${(v / 100).toFixed(0)}` : '')

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#78716c' }} />
        <YAxis tickFormatter={formatDollars} tick={{ fontSize: 11, fill: '#78716c' }} />
        <Tooltip
          formatter={(v: number | undefined) =>
            v != null && v > 0 ? [`$${(v / 100).toLocaleString()}`, ''] : ['', '']
          }
        />
        <Legend />
        <Bar dataKey="actual" name="Actual Revenue" fill="#d47530" radius={[4, 4, 0, 0]} />
        <Line
          dataKey="projected"
          name="Projected"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={{ fill: '#3b82f6', r: 4 }}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
