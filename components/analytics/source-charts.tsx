// Analytics Chart Components
// All charts use Recharts and are client-side rendered
// Data is fetched server-side and passed as props
'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line,
} from 'recharts'

const COLORS = [
  '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444',
  '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#64748b',
]

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100)
}

// ─── Source Distribution (Horizontal Bar) ─────────────

export function SourceDistributionChart({
  data,
}: {
  data: { name: string; count: number }[]
}) {
  if (data.length === 0) return <EmptyChart message="No inquiry data yet" />

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis type="number" tick={{ fontSize: 12, fill: '#78716c' }} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#44403c' }} width={100} />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }}
          formatter={(value: number) => [value, 'Inquiries']}
        />
        <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Conversion Funnel (Stacked Bar) ──────────────────

export function ConversionFunnelChart({
  data,
}: {
  data: { name: string; inquiries: number; confirmed: number; completed: number }[]
}) {
  if (data.length === 0) return <EmptyChart message="No conversion data yet" />

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data.slice(0, 8)} margin={{ left: 10, right: 10, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#78716c' }} angle={-30} textAnchor="end" />
        <YAxis tick={{ fontSize: 12, fill: '#78716c' }} />
        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }} />
        <Legend />
        <Bar dataKey="inquiries" fill="#94a3b8" name="Inquiries" radius={[4, 4, 0, 0]} />
        <Bar dataKey="confirmed" fill="#06b6d4" name="Confirmed" radius={[4, 4, 0, 0]} />
        <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Revenue by Source (Bar) ──────────────────────────

export function RevenueBySourceChart({
  data,
}: {
  data: { name: string; revenue_cents: number }[]
}) {
  if (data.length === 0) return <EmptyChart message="No revenue data yet" />

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ left: 10, right: 10, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#78716c' }} angle={-30} textAnchor="end" />
        <YAxis
          tick={{ fontSize: 12, fill: '#78716c' }}
          tickFormatter={(v) => formatCurrency(v)}
        />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }}
          formatter={(value: number) => [formatCurrency(value), 'Revenue']}
        />
        <Bar dataKey="revenue_cents" fill="#10b981" name="Revenue" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Source Trends (Multi-line) ───────────────────────

export function SourceTrendsChart({
  data,
  sources,
}: {
  data: { month: string; [key: string]: string | number }[]
  sources: string[]
}) {
  if (data.length === 0 || sources.length === 0) return <EmptyChart message="No trend data yet" />

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ left: 10, right: 10, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#78716c' }} angle={-30} textAnchor="end" />
        <YAxis tick={{ fontSize: 12, fill: '#78716c' }} />
        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }} />
        <Legend />
        {sources.slice(0, 6).map((source, i) => (
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
  )
}

// ─── Source Distribution Pie ──────────────────────────

export function SourcePieChart({
  data,
}: {
  data: { name: string; count: number }[]
}) {
  if (data.length === 0) return <EmptyChart message="No data yet" />

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          labelLine={true}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }}
          formatter={(value: number) => [value, 'Inquiries']}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ─── Empty State ──────────────────────────────────────

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-stone-400 text-sm">
      {message}
    </div>
  )
}
