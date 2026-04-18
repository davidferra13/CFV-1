// Restaurant Metrics - Daily ops KPIs for restaurant/food-truck/bakery archetypes
// Shows: prime cost, food cost %, labor %, revenue per labor hour, net profit
// Covers: RQ3 (Daily P&L), RQ24 (Prime Cost), RQ27 (Rev/Labor Hour), RQ19 (Dashboard)

import { getDailyRestaurantSnapshot } from '@/lib/analytics/restaurant-metrics-actions'
import { formatCurrency } from '@/lib/utils/currency'
import Link from 'next/link'

function StatusDot({ status }: { status: 'healthy' | 'warning' | 'critical' }) {
  const colors = {
    healthy: 'bg-emerald-400',
    warning: 'bg-amber-400',
    critical: 'bg-red-400',
  }
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status]}`} />
}

function MetricCard({
  label,
  value,
  subtitle,
  status,
  href,
}: {
  label: string
  value: string
  subtitle?: string
  status?: 'healthy' | 'warning' | 'critical'
  href?: string
}) {
  const content = (
    <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4 hover:border-stone-700 transition-colors">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">{label}</p>
        {status && <StatusDot status={status} />}
      </div>
      <p className="text-2xl font-semibold text-stone-100 mt-1.5 tabular-nums">{value}</p>
      {subtitle && <p className="text-xs text-stone-500 mt-1">{subtitle}</p>}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block group">
        {content}
      </Link>
    )
  }
  return content
}

export async function RestaurantMetricsSection() {
  const today = new Date().toISOString().split('T')[0]

  let snapshot
  try {
    snapshot = await getDailyRestaurantSnapshot(today)
  } catch (err) {
    console.error('[RestaurantMetrics] Failed to load:', err)
    return null
  }

  const { kpis, benchmarks, revenue, costs } = snapshot

  // Don't render if no activity today
  if (revenue.totalCents === 0 && kpis.laborHours === 0) return null

  return (
    <section>
      <div className="section-label mb-4">Daily Operations</div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Prime Cost - THE restaurant number */}
        <MetricCard
          label="Prime Cost"
          value={`${kpis.primeCostPercent}%`}
          subtitle={`Food ${kpis.foodCostPercent}% + Labor ${kpis.laborCostPercent}% (target: <${benchmarks.primeCostTarget}%)`}
          status={benchmarks.primeCostStatus}
          href="/financials"
        />

        {/* Net Profit Today */}
        <MetricCard
          label="Net Today"
          value={formatCurrency(kpis.netProfitCents)}
          subtitle={`${formatCurrency(revenue.totalCents)} net revenue, ${kpis.profitMarginPercent}% margin`}
          status={kpis.netProfitCents >= 0 ? 'healthy' : 'critical'}
          href="/finance"
        />

        {/* Revenue Per Labor Hour */}
        <MetricCard
          label="Rev / Labor Hr"
          value={formatCurrency(kpis.revenuePerLaborHour)}
          subtitle={`${kpis.laborHours}h logged (target: ${formatCurrency(benchmarks.revPerLaborHourTarget)}/hr)`}
          status={benchmarks.revPerLaborHourStatus}
          href="/staff/live"
        />

        {/* Covers or Transactions */}
        {kpis.coverCount != null ? (
          <MetricCard
            label="Covers"
            value={String(kpis.coverCount)}
            subtitle={
              kpis.revenuePerCover ? `${formatCurrency(kpis.revenuePerCover)} per cover` : undefined
            }
          />
        ) : (
          <MetricCard
            label="COGS"
            value={formatCurrency(costs.cogsCents)}
            subtitle={`${kpis.foodCostPercent}% of revenue (target: <${benchmarks.foodCostTarget}%)`}
            status={benchmarks.foodCostStatus}
          />
        )}
      </div>
    </section>
  )
}

export function RestaurantMetricsSkeleton() {
  return (
    <section>
      <div className="section-label mb-4">Daily Operations</div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
            <div className="h-3 w-16 loading-bone loading-bone-muted rounded" />
            <div className="h-7 w-20 loading-bone loading-bone-muted rounded mt-2" />
            <div className="h-3 w-32 loading-bone loading-bone-muted rounded mt-2" />
          </div>
        ))}
      </div>
    </section>
  )
}
