// Restaurant Operations Hub - Unified command center for daily restaurant ops.
// Victor's ONE page: prep, stations, tasks, sales, inventory, staff - all at a glance.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getOpsDashboardData } from '@/lib/restaurant/ops-dashboard-actions'
import { formatCurrency } from '@/lib/utils/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { OpsActions } from './_components/ops-actions'

export const metadata: Metadata = { title: 'Operations Hub' }

function StatusDot({ status }: { status: 'good' | 'warn' | 'critical' | 'off' }) {
  const colors = {
    good: 'bg-emerald-400 shadow-emerald-400/50',
    warn: 'bg-amber-400 shadow-amber-400/50',
    critical: 'bg-red-400 shadow-red-400/50 animate-pulse',
    off: 'bg-stone-600',
  }
  return <span className={`inline-block w-2.5 h-2.5 rounded-full shadow-sm ${colors[status]}`} />
}

function MetricCard({
  label,
  value,
  sub,
  status,
  href,
}: {
  label: string
  value: string | number
  sub?: string
  status?: 'good' | 'warn' | 'critical' | 'off'
  href?: string
}) {
  const inner = (
    <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4 hover:border-stone-700 transition-colors">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">{label}</p>
        {status && <StatusDot status={status} />}
      </div>
      <p className="text-2xl font-bold text-stone-100 mt-1.5 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-stone-500 mt-1">{sub}</p>}
    </div>
  )
  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  )
}

function ProgressBar({ pct, color = 'emerald' }: { pct: number; color?: string }) {
  const bg =
    color === 'emerald' ? 'bg-emerald-500' : color === 'amber' ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
      <div
        className={`h-full ${bg} rounded-full transition-all`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  )
}

function formatTime(iso: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default async function OpsHubPage() {
  await requireChef()
  const data = await getOpsDashboardData()

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  const foodCostPct =
    data.sales.revenue_cents > 0
      ? Math.round(((data.today?.total_food_cost_cents || 0) / data.sales.revenue_cents) * 100)
      : null

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Operations Hub</h1>
          <p className="text-sm text-stone-500">
            {dateStr} / {timeStr}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ServiceStatusBadge status={data.todayStatus} />
          <OpsActions serviceDayId={data.today?.id} status={data.todayStatus} />
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <MetricCard
          label="Covers"
          value={data.today?.actual_covers ?? data.today?.expected_covers ?? '-'}
          sub={data.today?.expected_covers ? `${data.today.expected_covers} expected` : undefined}
          status={data.todayStatus === 'active' ? 'good' : 'off'}
        />
        <MetricCard
          label="Revenue"
          value={data.sales.revenue_cents ? formatCurrency(data.sales.revenue_cents) : '$0'}
          sub={`${data.sales.items_sold} items sold`}
          status={data.sales.revenue_cents > 0 ? 'good' : 'off'}
          href="/ops/performance"
        />
        <MetricCard
          label="Food Cost"
          value={foodCostPct != null ? `${foodCostPct}%` : '-'}
          status={
            foodCostPct != null
              ? foodCostPct <= 30
                ? 'good'
                : foodCostPct <= 35
                  ? 'warn'
                  : 'critical'
              : 'off'
          }
        />
        <MetricCard
          label="Prep"
          value={`${data.prep.completion_pct}%`}
          sub={`${data.prep.done + data.prep.verified}/${data.prep.total} done`}
          status={
            data.prep.completion_pct >= 90
              ? 'good'
              : data.prep.completion_pct >= 50
                ? 'warn'
                : 'critical'
          }
          href="/ops/prep"
        />
        <MetricCard
          label="Tasks"
          value={`${data.tasks.completed}/${data.tasks.total}`}
          sub={data.tasks.overdue > 0 ? `${data.tasks.overdue} overdue` : 'On track'}
          status={
            data.tasks.overdue > 0
              ? 'critical'
              : data.tasks.completed === data.tasks.total
                ? 'good'
                : 'warn'
          }
          href="/tasks"
        />
        <MetricCard
          label="Staff"
          value={data.active_staff.length}
          sub="Clocked in"
          status={data.active_staff.length > 0 ? 'good' : 'off'}
          href="/staff/live"
        />
      </div>

      {/* Alerts Row */}
      {(data.eighty_sixed.length > 0 ||
        data.inventory_alerts.length > 0 ||
        data.prep.critical_pending > 0) && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4">
          <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3">
            Active Alerts
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.eighty_sixed.map((item, i) => (
              <Badge key={i} variant="error">
                86'd: {item.component_name} ({item.station_name})
              </Badge>
            ))}
            {data.inventory_alerts.slice(0, 5).map((a, i) => (
              <Badge key={`inv-${i}`} variant="warning">
                Low: {a.ingredient_name} ({a.current_qty}/{a.par_level} {a.unit})
              </Badge>
            ))}
            {data.prep.critical_pending > 0 && (
              <Badge variant="error">
                {data.prep.critical_pending} critical prep items pending
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Stations */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Stations</CardTitle>
              <Link href="/ops/stations" className="text-xs text-stone-500 hover:text-stone-300">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.stations.length === 0 ? (
              <p className="text-sm text-stone-500">
                No stations configured.{' '}
                <Link href="/stations" className="text-amber-400 hover:underline">
                  Set up stations
                </Link>
              </p>
            ) : (
              data.stations.map((s) => (
                <Link key={s.id} href={`/stations/${s.id}`} className="block">
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-stone-900/40 hover:bg-stone-800/60 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-stone-200">{s.name}</p>
                      <p className="text-xs text-stone-500">
                        {s.checked_in_staff.length > 0
                          ? `${s.checked_in_staff.length} staff`
                          : 'No staff'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.items_86d > 0 && <Badge variant="error">{s.items_86d} 86'd</Badge>}
                      <StatusDot status={s.items_86d > 0 ? 'critical' : 'good'} />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Column 2: Prep + Tasks */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Prep Status</CardTitle>
                <Link href="/ops/prep" className="text-xs text-stone-500 hover:text-stone-300">
                  Full board
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {data.prep.total === 0 ? (
                <p className="text-sm text-stone-500">
                  No prep requirements generated. Link menus to today's service to auto-generate.
                </p>
              ) : (
                <div className="space-y-3">
                  <ProgressBar
                    pct={data.prep.completion_pct}
                    color={
                      data.prep.completion_pct >= 90
                        ? 'emerald'
                        : data.prep.completion_pct >= 50
                          ? 'amber'
                          : 'red'
                    }
                  />
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-stone-400">
                      Pending: <span className="text-stone-200">{data.prep.pending}</span>
                    </div>
                    <div className="text-stone-400">
                      In Progress: <span className="text-amber-400">{data.prep.in_progress}</span>
                    </div>
                    <div className="text-stone-400">
                      Done: <span className="text-emerald-400">{data.prep.done}</span>
                    </div>
                    <div className="text-stone-400">
                      Verified: <span className="text-emerald-300">{data.prep.verified}</span>
                    </div>
                  </div>
                  {data.prep.deficit_items > 0 && (
                    <p className="text-xs text-amber-400">
                      {data.prep.deficit_items} items below needed quantity
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Tasks</CardTitle>
                <Link href="/tasks" className="text-xs text-stone-500 hover:text-stone-300">
                  Task board
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {data.tasks.total === 0 ? (
                <p className="text-sm text-stone-500">No tasks for today.</p>
              ) : (
                <div className="space-y-3">
                  <ProgressBar
                    pct={
                      data.tasks.total > 0
                        ? Math.round((data.tasks.completed / data.tasks.total) * 100)
                        : 0
                    }
                    color={data.tasks.overdue > 0 ? 'red' : 'emerald'}
                  />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-400">
                      {data.tasks.completed}/{data.tasks.total} complete
                    </span>
                    {data.tasks.overdue > 0 && (
                      <span className="text-red-400">{data.tasks.overdue} overdue</span>
                    )}
                  </div>
                  {data.tasks.by_station.length > 0 && (
                    <div className="space-y-1">
                      {data.tasks.by_station.map((st) => (
                        <div
                          key={st.station_id}
                          className="flex items-center justify-between text-xs text-stone-500"
                        >
                          <span>{st.station_name}</span>
                          <span>{st.count} tasks</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Column 3: Sales + Staff */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Sales</CardTitle>
                <Link
                  href="/ops/performance"
                  className="text-xs text-stone-500 hover:text-stone-300"
                >
                  Analytics
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {data.sales.items_sold === 0 ? (
                <p className="text-sm text-stone-500">No sales recorded yet today.</p>
              ) : (
                <div className="space-y-3">
                  <div className="text-2xl font-bold text-stone-100 tabular-nums">
                    {formatCurrency(data.sales.revenue_cents)}
                  </div>
                  <p className="text-xs text-stone-500">
                    {data.sales.items_sold} items / {data.sales.unique_items} unique dishes
                  </p>
                  {data.sales.top_sellers.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-stone-800">
                      <p className="text-xs font-medium text-stone-500 uppercase">Top Sellers</p>
                      {data.sales.top_sellers.map((ts, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-stone-300">{ts.name}</span>
                          <span className="text-stone-500 tabular-nums">{ts.qty}x</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Active Staff</CardTitle>
                <Link href="/staff/live" className="text-xs text-stone-500 hover:text-stone-300">
                  Live board
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {data.active_staff.length === 0 ? (
                <p className="text-sm text-stone-500">No staff clocked in.</p>
              ) : (
                <div className="space-y-2">
                  {data.active_staff.map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-stone-200">{s.name}</span>
                      <span className="text-xs text-stone-500">{formatTime(s.clocked_in_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Inventory Alerts</CardTitle>
                <Link href="/ops/inventory" className="text-xs text-stone-500 hover:text-stone-300">
                  Full view
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {data.inventory_alerts.length === 0 ? (
                <p className="text-sm text-stone-500">All inventory at par.</p>
              ) : (
                <div className="space-y-2">
                  {data.inventory_alerts.map((a) => (
                    <div
                      key={a.ingredient_id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-stone-300">{a.ingredient_name}</span>
                      <span className="text-amber-400 tabular-nums">
                        {a.current_qty}/{a.par_level} {a.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Service History */}
      {data.recent_days.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Service Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-800 text-stone-500 text-xs uppercase">
                    <th className="text-left py-2 font-medium">Date</th>
                    <th className="text-left py-2 font-medium">Shift</th>
                    <th className="text-right py-2 font-medium">Covers</th>
                    <th className="text-right py-2 font-medium">Revenue</th>
                    <th className="text-right py-2 font-medium">Food Cost</th>
                    <th className="text-right py-2 font-medium">Items</th>
                    <th className="text-right py-2 font-medium">Prep</th>
                    <th className="text-center py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_days.map((d) => {
                    const fc =
                      d.revenue_cents && d.food_cost_cents
                        ? Math.round((d.food_cost_cents / d.revenue_cents) * 100)
                        : null
                    const prepPct = d.total_prep_items
                      ? Math.round(((d.completed_prep_items || 0) / d.total_prep_items) * 100)
                      : null
                    return (
                      <tr
                        key={d.service_day_id}
                        className="border-b border-stone-900 hover:bg-stone-900/30"
                      >
                        <td className="py-2 text-stone-200">
                          {new Date(d.service_date + 'T12:00:00').toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="py-2 text-stone-400">{d.shift_label}</td>
                        <td className="py-2 text-right text-stone-300 tabular-nums">
                          {d.actual_covers ?? d.expected_covers ?? '-'}
                        </td>
                        <td className="py-2 text-right text-stone-300 tabular-nums">
                          {d.revenue_cents ? formatCurrency(d.revenue_cents) : '-'}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {fc != null ? (
                            <span
                              className={
                                fc <= 30
                                  ? 'text-emerald-400'
                                  : fc <= 35
                                    ? 'text-amber-400'
                                    : 'text-red-400'
                              }
                            >
                              {fc}%
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-2 text-right text-stone-400 tabular-nums">
                          {d.items_sold ?? '-'}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {prepPct != null ? (
                            <span className={prepPct >= 90 ? 'text-emerald-400' : 'text-amber-400'}>
                              {prepPct}%
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-2 text-center">
                          <ServiceStatusBadge status={d.status} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: '/stations/daily-ops', label: 'Station Ops', desc: 'Clipboards, shifts, 86s' },
          { href: '/culinary/prep', label: 'Prep Workspace', desc: 'Recipes, mise en place' },
          { href: '/staff/schedule', label: 'Staff Schedule', desc: 'Assignments, shifts' },
          {
            href: '/ops/performance',
            label: 'Menu Analytics',
            desc: 'Sales, margins, engineering',
          },
        ].map((link) => (
          <Link key={link.href} href={link.href} className="block">
            <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-4 hover:border-stone-700 transition-colors">
              <p className="text-sm font-medium text-stone-200">{link.label}</p>
              <p className="text-xs text-stone-500 mt-1">{link.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function ServiceStatusBadge({ status }: { status: string }) {
  const map: Record<
    string,
    { variant: 'default' | 'success' | 'warning' | 'error' | 'info'; label: string }
  > = {
    no_service: { variant: 'default', label: 'No Service' },
    planning: { variant: 'info', label: 'Planning' },
    prep: { variant: 'warning', label: 'Prep' },
    active: { variant: 'success', label: 'Service Active' },
    closed: { variant: 'default', label: 'Closed' },
  }
  const cfg = map[status] || map.no_service
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}
