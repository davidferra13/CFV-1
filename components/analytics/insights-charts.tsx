// Clientele Intelligence Chart Components
// All charts use Recharts and are client-side rendered
// Data is fetched server-side via insights-actions.ts and passed as props
'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
} from 'recharts'
import type {
  DinnerTimeSlot,
  OccasionStat,
  ServiceStyleStat,
  GuestCountBucket,
  DietaryFrequency,
  MonthlyVolume,
  DayOfWeekStat,
  RevenueTrendPoint,
  LTVBucket,
  AARTrends,
  FinancialIntelligence,
} from '@/lib/analytics/insights-actions'

// ─── Shared Helpers ──────────────────────────────────

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
  '#a855f7',
  '#0ea5e9',
  '#84cc16',
  '#f43f5e',
]

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatMinutes(minutes: number): string {
  if (minutes === 0) return '-'
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function chartNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0) || 0
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-stone-400 text-sm italic">
      {message}
    </div>
  )
}

// ─── Tab 1: Clientele ────────────────────────────────

// Dinner time histogram (11am–11pm)
export function DinnerTimeChart({ data }: { data: DinnerTimeSlot[] }) {
  const hasData = data.some((d) => d.count > 0)
  if (!hasData) return <EmptyChart message="No event time data yet" />

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#78716c' }} />
        <YAxis tick={{ fontSize: 12, fill: '#78716c' }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }}
          formatter={(value: unknown) => [chartNumber(value), 'Events']}
        />
        <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Events">
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={
                // Highlight peak dinner hours 5pm–8pm
                ['5pm', '6pm', '7pm', '8pm'].includes(entry.hour) ? '#7c3aed' : '#c4b5fd'
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// Occasion breakdown (horizontal bar) - count as bar, revenue details in custom tooltip
function OccasionTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { payload: OccasionStat }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900 p-3 shadow-sm text-sm">
      <p className="font-semibold text-stone-100 mb-1">{label}</p>
      <p className="text-stone-400">
        {d.count} event{d.count !== 1 ? 's' : ''}
      </p>
      {d.avg_revenue_cents > 0 && (
        <>
          <p className="text-stone-400">{formatCurrency(d.avg_revenue_cents)} avg</p>
          <p className="text-stone-400 text-xs">{formatCurrency(d.total_revenue_cents)} total</p>
        </>
      )}
    </div>
  )
}

export function OccasionChart({ data }: { data: OccasionStat[] }) {
  if (data.length === 0) return <EmptyChart message="No occasion data yet" />

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#78716c' }} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="occasion"
          tick={{ fontSize: 12, fill: '#44403c' }}
          width={110}
        />
        <Tooltip content={<OccasionTooltip />} />
        <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Events" />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Service style pie chart
export function ServiceStylePieChart({ data }: { data: ServiceStyleStat[] }) {
  if (data.length === 0) return <EmptyChart message="No service style data yet" />

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ name, percent }: { name?: string; percent?: number }) =>
            `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`
          }
          labelLine
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }}
          formatter={(value: unknown) => [chartNumber(value), 'Events']}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

// Guest count histogram
export function GuestCountHistogram({ data }: { data: GuestCountBucket[] }) {
  const hasData = data.some((d) => d.count > 0)
  if (!hasData) return <EmptyChart message="No guest count data yet" />

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#78716c' }} />
        <YAxis tick={{ fontSize: 12, fill: '#78716c' }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }}
          formatter={(value: unknown) => [chartNumber(value), 'Events']}
        />
        <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Events" />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Dietary restriction frequency (horizontal bar)
export function DietaryFrequencyChart({ data }: { data: DietaryFrequency[] }) {
  if (data.length === 0) return <EmptyChart message="No dietary restriction data yet" />

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#78716c' }} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="restriction"
          tick={{ fontSize: 11, fill: '#44403c' }}
          width={120}
        />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }}
          formatter={(value: unknown) => [chartNumber(value), 'Occurrences']}
        />
        <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Occurrences" />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Tab 2: Seasons & Trends ─────────────────────────

// Monthly volume: bars (events) + line (revenue) - dual Y axis
export function MonthlyVolumeChart({ data }: { data: MonthlyVolume[] }) {
  const hasData = data.some((d) => d.events > 0)
  if (!hasData) return <EmptyChart message="No event history yet" />

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ left: 0, right: 24, top: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#78716c' }} />
        <YAxis
          yAxisId="left"
          orientation="left"
          tick={{ fontSize: 11, fill: '#78716c' }}
          allowDecimals={false}
          label={{
            value: 'Events',
            angle: -90,
            position: 'insideLeft',
            offset: 10,
            style: { fontSize: 10, fill: '#a8a29e' },
          }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 11, fill: '#78716c' }}
          tickFormatter={(v) => `$${Math.round(v / 100).toLocaleString()}`}
        />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }}
          formatter={
            ((value: number | undefined, name: string | undefined) => {
              if (name === 'revenue_cents') return [formatCurrency(value ?? 0), 'Revenue']
              if (name === 'events') return [value, 'Total Events']
              return [value, name]
            }) as any
          }
        />
        <Legend
          formatter={(v) => (v === 'revenue_cents' ? 'Revenue' : v === 'events' ? 'Events' : v)}
        />
        <Bar yAxisId="left" dataKey="events" fill="#c4b5fd" radius={[4, 4, 0, 0]} name="events" />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="revenue_cents"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 3, fill: '#10b981' }}
          name="revenue_cents"
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// Day of week distribution
export function DayOfWeekChart({ data }: { data: DayOfWeekStat[] }) {
  const hasData = data.some((d) => d.count > 0)
  if (!hasData) return <EmptyChart message="No event data yet" />

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#78716c' }} />
        <YAxis tick={{ fontSize: 12, fill: '#78716c' }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }}
          formatter={(value: unknown) => [chartNumber(value), 'Events']}
        />
        <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Events">
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={['Fri', 'Sat', 'Sun'].includes(entry.day) ? '#0891b2' : '#a5f3fc'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// 18-month revenue trend (area chart)
export function RevenueTrendChart({ data }: { data: RevenueTrendPoint[] }) {
  const hasData = data.some((d) => d.revenue_cents > 0)
  if (!hasData) return <EmptyChart message="No revenue data yet" />

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 4 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 10, fill: '#78716c' }}
          angle={-35}
          textAnchor="end"
          height={48}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#78716c' }}
          tickFormatter={(v) => `$${Math.round(v / 100).toLocaleString()}`}
        />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }}
          formatter={(value: unknown) => [formatCurrency(chartNumber(value)), 'Net Revenue']}
        />
        <Area
          type="monotone"
          dataKey="revenue_cents"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#revenueGradient)"
          name="Net Revenue"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Tab 3: Client Base ───────────────────────────────

// Acquisition source pie
export function AcquisitionSourcePieChart({ data }: { data: { name: string; count: number }[] }) {
  if (data.length === 0) return <EmptyChart message="No client acquisition data yet" />

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ name, percent }: { name?: string; percent?: number }) =>
            `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`
          }
          labelLine
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }}
          formatter={(value: unknown) => [chartNumber(value), 'Clients']}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

// Client status horizontal bar
export function ClientStatusChart({ data }: { data: { name: string; count: number }[] }) {
  if (data.length === 0) return <EmptyChart message="No client data yet" />

  const STATUS_COLORS: Record<string, string> = {
    Active: '#10b981',
    'Repeat Ready': '#06b6d4',
    VIP: '#8b5cf6',
    Dormant: '#94a3b8',
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 48)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 32, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#78716c' }} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 12, fill: '#44403c' }}
          width={100}
        />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }}
          formatter={(value: unknown) => [chartNumber(value), 'Clients']}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Clients">
          {data.map((entry, i) => (
            <Cell key={i} fill={STATUS_COLORS[entry.name] ?? COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// Loyalty tier pie
export function LoyaltyTierPieChart({ data }: { data: { tier: string; count: number }[] }) {
  if (data.length === 0) return <EmptyChart message="No loyalty data yet" />

  const TIER_COLORS: Record<string, string> = {
    Platinum: '#6366f1',
    Gold: '#f59e0b',
    Silver: '#94a3b8',
    Standard: '#d6d3d1',
    Bronze: '#b45309',
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="tier"
          cx="50%"
          cy="50%"
          outerRadius={95}
          label={({ name, percent }: { name?: string; percent?: number }) =>
            `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`
          }
          labelLine
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={TIER_COLORS[entry.tier] ?? COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }}
          formatter={(value: unknown) => [chartNumber(value), 'Clients']}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

// Events per client histogram
export function EventsPerClientHistogram({
  data,
}: {
  data: { events: string; clients: number }[]
}) {
  const hasData = data.some((d) => d.clients > 0)
  if (!hasData) return <EmptyChart message="No client event data yet" />

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis
          dataKey="events"
          tick={{ fontSize: 12, fill: '#78716c' }}
          label={{
            value: 'Events booked',
            position: 'insideBottom',
            offset: -2,
            style: { fontSize: 10, fill: '#a8a29e' },
          }}
        />
        <YAxis tick={{ fontSize: 12, fill: '#78716c' }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }}
          formatter={(value: unknown) => [chartNumber(value), 'Clients']}
        />
        <Bar dataKey="clients" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Clients" />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Lifetime value distribution
export function LTVDistributionChart({ data }: { data: LTVBucket[] }) {
  const hasData = data.some((d) => d.clients > 0)
  if (!hasData) return <EmptyChart message="No LTV data yet" />

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#78716c' }} />
        <YAxis tick={{ fontSize: 12, fill: '#78716c' }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }}
          formatter={(value: unknown) => [chartNumber(value), 'Clients']}
        />
        <Bar dataKey="clients" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Clients" />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Tab 4: Operations ───────────────────────────────

// Phase time averages (horizontal bar)
export function PhaseTimeChart({ data }: { data: { phase: string; avg_minutes: number }[] }) {
  const hasData = data.some((d) => d.avg_minutes > 0)
  if (!hasData) return <EmptyChart message="No time tracking data yet" />

  const PHASE_COLORS: Record<string, string> = {
    Shopping: '#f59e0b',
    Prep: '#8b5cf6',
    Travel: '#06b6d4',
    Service: '#10b981',
    Reset: '#94a3b8',
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 48, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: '#78716c' }}
          tickFormatter={(v) => formatMinutes(v)}
        />
        <YAxis
          type="category"
          dataKey="phase"
          tick={{ fontSize: 12, fill: '#44403c' }}
          width={70}
        />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }}
          formatter={(value: unknown) => [formatMinutes(chartNumber(value)), 'Avg time']}
        />
        <Bar dataKey="avg_minutes" radius={[0, 4, 4, 0]} name="Avg time">
          {data.map((entry, i) => (
            <Cell key={i} fill={PHASE_COLORS[entry.phase] ?? COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// AAR rating trends (3 lines)
export function AARRatingTrendChart({ data }: { data: AARTrends['trend'] }) {
  const hasData = data.some((d) => d.calm != null || d.preparation != null)
  if (!hasData) return <EmptyChart message="No after-action review data yet" />

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ left: 0, right: 16, top: 8, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 10, fill: '#78716c' }}
          angle={-35}
          textAnchor="end"
          height={48}
        />
        <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 12, fill: '#78716c' }} />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }}
          formatter={
            ((value: number | null | undefined, name: string | undefined) => {
              if (value == null) return ['\u2014', name]
              const labels: Record<string, string> = {
                calm: 'Calm',
                preparation: 'Preparation',
                execution: 'Execution',
              }
              return [value.toFixed(1), labels[name ?? ''] ?? name]
            }) as any
          }
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="calm"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 3, fill: '#10b981' }}
          connectNulls={false}
          name="calm"
        />
        <Line
          type="monotone"
          dataKey="preparation"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={{ r: 3, fill: '#8b5cf6' }}
          connectNulls={false}
          name="preparation"
        />
        <Line
          type="monotone"
          dataKey="execution"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ r: 3, fill: '#f59e0b' }}
          connectNulls={false}
          name="execution"
          strokeDasharray="4 2"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// Top forgotten items (horizontal bar)
export function ForgottenItemsChart({ data }: { data: AARTrends['topForgotten'] }) {
  if (data.length === 0) return <EmptyChart message="No forgotten items recorded" />

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 32, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#78716c' }} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="item"
          tick={{ fontSize: 11, fill: '#44403c' }}
          width={130}
        />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }}
          formatter={(value: unknown) => [chartNumber(value), 'Times forgotten']}
        />
        <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} name="Times forgotten" />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Revenue by occasion (horizontal bar)
export function RevenueByOccasionChart({
  data,
}: {
  data: FinancialIntelligence['revenueByOccasion']
}) {
  if (data.length === 0) return <EmptyChart message="No occasion revenue data yet" />

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: '#78716c' }}
          tickFormatter={(v) => `$${Math.round(v / 100).toLocaleString()}`}
        />
        <YAxis
          type="category"
          dataKey="occasion"
          tick={{ fontSize: 12, fill: '#44403c' }}
          width={110}
        />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }}
          formatter={
            ((value: number | undefined, name: string | undefined) => {
              const labels: Record<string, string> = {
                total_cents: 'Total Revenue',
                avg_cents: 'Avg per Event',
              }
              return [formatCurrency(value ?? 0), labels[name ?? ''] ?? name]
            }) as any
          }
        />
        <Legend
          formatter={(v) =>
            v === 'total_cents' ? 'Total Revenue' : v === 'avg_cents' ? 'Avg per Event' : v
          }
        />
        <Bar dataKey="total_cents" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="total_cents" />
        <Bar dataKey="avg_cents" fill="#c4b5fd" radius={[0, 4, 4, 0]} name="avg_cents" />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Avg event value by service style
export function StyleValueChart({ data }: { data: FinancialIntelligence['avgValueByStyle'] }) {
  if (data.length === 0) return <EmptyChart message="No service style data yet" />

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: 8, right: 16, top: 4, bottom: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis dataKey="style" tick={{ fontSize: 11, fill: '#78716c' }} />
        <YAxis
          tick={{ fontSize: 11, fill: '#78716c' }}
          tickFormatter={(v) => `$${Math.round(v / 100).toLocaleString()}`}
        />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }}
          formatter={(value: unknown) => [formatCurrency(chartNumber(value)), 'Avg Event Value']}
        />
        <Bar dataKey="avg_cents" fill="#10b981" radius={[4, 4, 0, 0]} name="Avg Event Value" />
      </BarChart>
    </ResponsiveContainer>
  )
}
