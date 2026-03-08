'use client'

// Revenue Per Hour Charts (client component for Recharts)
// Renders the pie chart (hours breakdown) and line chart (monthly trend).

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { HoursBreakdown, MonthlyTrend } from '@/lib/finance/revenue-per-hour-actions'

// ─── Shared color config ────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<keyof HoursBreakdown, string> = {
  cooking: '#16a34a',
  prep: '#2563eb',
  shopping: '#d97706',
  driving: '#9333ea',
  cleanup: '#64748b',
}

const CATEGORY_LABELS: Record<keyof HoursBreakdown, string> = {
  cooking: 'Cooking',
  prep: 'Prep',
  shopping: 'Shopping',
  driving: 'Driving',
  cleanup: 'Cleanup',
}

// ─── Hours Breakdown Pie ────────────────────────────────────────────────────

type PieProps = {
  breakdown: HoursBreakdown
}

export function HoursBreakdownPie({ breakdown }: PieProps) {
  const data = (Object.keys(breakdown) as (keyof HoursBreakdown)[])
    .filter(key => breakdown[key] > 0)
    .map(key => ({
      name: CATEGORY_LABELS[key],
      value: Math.round(breakdown[key] * 10) / 10,
      color: CATEGORY_COLORS[key],
    }))

  if (data.length === 0) {
    return <p className="text-sm text-stone-400 text-center py-8">No time data available</p>
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [`${value}h`, '']}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ─── Monthly Trend Line ─────────────────────────────────────────────────────

type TrendProps = {
  trend: MonthlyTrend[]
}

export function MonthlyTrendChart({ trend }: TrendProps) {
  if (trend.length < 2) {
    return <p className="text-sm text-stone-400 text-center py-8">Need at least 2 months of data for a trend</p>
  }

  const chartData = trend.map(t => ({
    month: t.label,
    rate: Math.round(t.avgPerHourCents / 100),
    events: t.eventCount,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: '#78716c' }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#78716c' }}
          tickFormatter={(v: number) => `$${v}`}
        />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === 'rate') return [`$${value}/hr`, 'Effective Rate']
            return [value, 'Events']
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="rate"
          stroke="#16a34a"
          strokeWidth={2}
          name="Effective Rate"
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
