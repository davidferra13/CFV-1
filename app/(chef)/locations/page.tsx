// Multi-Location Command Center
// Real-time overview of all locations with KPIs, alerts, and quick actions.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getMultiLocationSnapshot } from '@/lib/locations/actions'
import { getActiveAlerts } from '@/lib/locations/alert-actions'
import { getCrossLocationMetrics } from '@/lib/locations/metrics-actions'
import { formatCurrency } from '@/lib/utils/format'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Locations' }

function StatusDot({ status }: { status: 'good' | 'warning' | 'critical' }) {
  const colors = {
    good: 'bg-emerald-500',
    warning: 'bg-amber-500',
    critical: 'bg-red-500',
  }
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${colors[status]}`} />
}

function MetricCard({
  label,
  value,
  subtitle,
  trend,
}: {
  label: string
  value: string
  subtitle?: string
  trend?: 'up' | 'down' | 'flat'
}) {
  const trendColors = { up: 'text-emerald-400', down: 'text-red-400', flat: 'text-stone-500' }
  const trendIcons = { up: '\u2191', down: '\u2193', flat: '\u2192' }

  return (
    <div className="rounded-lg bg-stone-800/50 border border-stone-700/50 p-4">
      <p className="text-xs text-stone-500 uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-2xl font-bold text-stone-100">{value}</p>
      {subtitle && (
        <p className="mt-0.5 text-xs text-stone-400">
          {trend && <span className={trendColors[trend]}>{trendIcons[trend]} </span>}
          {subtitle}
        </p>
      )}
    </div>
  )
}

export default async function LocationsCommandCenter() {
  const user = await requireChef()
  const [snapshots, alerts, todayMetrics] = await Promise.all([
    getMultiLocationSnapshot(),
    getActiveAlerts(),
    getCrossLocationMetrics(new Date().toISOString().split('T')[0]),
  ])

  const totalAlerts = alerts.length
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical').length

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Locations</h1>
          <p className="mt-1 text-sm text-stone-500">
            {snapshots.length} active location{snapshots.length !== 1 ? 's' : ''}
            {totalAlerts > 0 && (
              <span className="ml-2">
                {criticalAlerts > 0 ? (
                  <Badge variant="error">{criticalAlerts} critical</Badge>
                ) : (
                  <Badge variant="warning">
                    {totalAlerts} alert{totalAlerts !== 1 ? 's' : ''}
                  </Badge>
                )}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/locations/purchasing"
            className="inline-flex items-center gap-2 rounded-lg bg-stone-800 border border-stone-700 px-3 py-1.5 text-sm text-stone-300 hover:bg-stone-700 transition-colors"
          >
            Purchasing
          </Link>
          <Link
            href="/locations/compliance"
            className="inline-flex items-center gap-2 rounded-lg bg-stone-800 border border-stone-700 px-3 py-1.5 text-sm text-stone-300 hover:bg-stone-700 transition-colors"
          >
            Compliance
          </Link>
        </div>
      </div>

      {/* Aggregate KPIs */}
      {snapshots.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <MetricCard
            label="Total Covers"
            value={todayMetrics.totalCovers.toLocaleString()}
            subtitle="today"
          />
          <MetricCard
            label="Total Revenue"
            value={formatCurrency(todayMetrics.totalRevenueCents)}
            subtitle="today"
          />
          <MetricCard
            label="Food Cost"
            value={`${todayMetrics.avgFoodCostPct.toFixed(1)}%`}
            subtitle="avg across locations"
          />
          <MetricCard
            label="Labor Cost"
            value={`${todayMetrics.avgLaborCostPct.toFixed(1)}%`}
            subtitle="avg across locations"
          />
          <MetricCard
            label="Prime Cost"
            value={`${todayMetrics.avgPrimeCostPct.toFixed(1)}%`}
            subtitle="food + labor"
          />
          <MetricCard
            label="Avg Ticket"
            value={formatCurrency(todayMetrics.avgTicketCents)}
            subtitle={`${todayMetrics.totalOrders} orders`}
          />
        </div>
      )}

      {/* Active Alerts Banner */}
      {criticalAlerts > 0 && (
        <div className="rounded-lg bg-red-900/30 border border-red-700/50 p-4">
          <h3 className="text-sm font-semibold text-red-300">Critical Alerts</h3>
          <div className="mt-2 space-y-2">
            {alerts
              .filter((a) => a.severity === 'critical')
              .slice(0, 5)
              .map((alert) => (
                <div key={alert.id} className="flex items-center justify-between text-sm">
                  <span className="text-red-200">{alert.title}</span>
                  <Link
                    href={`/locations/${alert.locationId}`}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    View
                  </Link>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Location Cards */}
      {snapshots.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold text-stone-200">No locations yet</h3>
            <p className="mt-2 text-sm text-stone-400">
              Add your first location in Settings to start tracking multi-location operations.
            </p>
            <Link
              href="/settings/restaurants"
              className="mt-4 inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 transition-colors"
            >
              Add Location
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {snapshots.map(
            ({
              location,
              todayMetrics: locMetrics,
              activeAlerts: locAlerts,
              staffOnDuty,
              inventoryHealth,
            }) => (
              <Link key={location.id} href={`/locations/${location.id}`} className="block group">
                <Card className="hover:border-stone-600 transition-colors h-full">
                  <CardContent className="p-5">
                    {/* Location Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <StatusDot
                          status={locAlerts > 0 ? (locAlerts > 2 ? 'critical' : 'warning') : 'good'}
                        />
                        <div>
                          <h3 className="font-semibold text-stone-100 group-hover:text-amber-400 transition-colors">
                            {location.name}
                          </h3>
                          <p className="text-xs text-stone-500">
                            {location.locationType}{' '}
                            {location.city && `\u00b7 ${location.city}, ${location.state}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {locAlerts > 0 && (
                          <Badge variant={locAlerts > 2 ? 'error' : 'warning'}>
                            {locAlerts} alert{locAlerts !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        <Badge variant="default">{staffOnDuty} staff</Badge>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    {locMetrics ? (
                      <div className="mt-4 grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-xs text-stone-500">Covers</p>
                          <p className="text-lg font-bold text-stone-100">{locMetrics.covers}</p>
                          {location.dailyCoverTarget && (
                            <p className="text-xs text-stone-500">
                              / {location.dailyCoverTarget} target
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-stone-500">Revenue</p>
                          <p className="text-lg font-bold text-stone-100">
                            {formatCurrency(locMetrics.revenue)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-stone-500">Food Cost</p>
                          <p
                            className={`text-lg font-bold ${
                              locMetrics.foodCostPct > 35
                                ? 'text-red-400'
                                : locMetrics.foodCostPct > 30
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                            }`}
                          >
                            {locMetrics.foodCostPct.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 text-center py-4">
                        <p className="text-xs text-stone-500">No metrics recorded today</p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="mt-3 pt-3 border-t border-stone-700/50 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <StatusDot status={inventoryHealth} />
                        <span className="text-xs text-stone-500 capitalize">
                          Inventory: {inventoryHealth}
                        </span>
                      </div>
                      {location.managerName && (
                        <span className="text-xs text-stone-500">Mgr: {location.managerName}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          )}
        </div>
      )}

      {/* Cross-Location Comparison Table */}
      {todayMetrics.byLocation.length > 1 && (
        <div>
          <h2 className="text-lg font-semibold text-stone-200 mb-3">Location Comparison</h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-700">
                      <th className="text-left p-3 text-stone-400 font-medium">Location</th>
                      <th className="text-right p-3 text-stone-400 font-medium">Covers</th>
                      <th className="text-right p-3 text-stone-400 font-medium">Revenue</th>
                      <th className="text-right p-3 text-stone-400 font-medium">Food Cost %</th>
                      <th className="text-right p-3 text-stone-400 font-medium">Labor Cost %</th>
                      <th className="text-right p-3 text-stone-400 font-medium">Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayMetrics.byLocation.map((loc) => (
                      <tr
                        key={loc.locationId}
                        className="border-b border-stone-800 hover:bg-stone-800/50"
                      >
                        <td className="p-3 text-stone-200 font-medium">{loc.locationName}</td>
                        <td className="p-3 text-right text-stone-300">{loc.coversServed}</td>
                        <td className="p-3 text-right text-stone-300">
                          {formatCurrency(loc.revenueCents)}
                        </td>
                        <td
                          className={`p-3 text-right ${loc.foodCostPct > 35 ? 'text-red-400' : loc.foodCostPct > 30 ? 'text-amber-400' : 'text-emerald-400'}`}
                        >
                          {loc.foodCostPct.toFixed(1)}%
                        </td>
                        <td
                          className={`p-3 text-right ${loc.laborCostPct > 35 ? 'text-red-400' : loc.laborCostPct > 30 ? 'text-amber-400' : 'text-emerald-400'}`}
                        >
                          {loc.laborCostPct.toFixed(1)}%
                        </td>
                        <td className="p-3 text-right text-stone-300">{loc.ordersCount}</td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="bg-stone-800/30 font-semibold">
                      <td className="p-3 text-stone-200">Total</td>
                      <td className="p-3 text-right text-stone-200">{todayMetrics.totalCovers}</td>
                      <td className="p-3 text-right text-stone-200">
                        {formatCurrency(todayMetrics.totalRevenueCents)}
                      </td>
                      <td className="p-3 text-right text-stone-200">
                        {todayMetrics.avgFoodCostPct.toFixed(1)}%
                      </td>
                      <td className="p-3 text-right text-stone-200">
                        {todayMetrics.avgLaborCostPct.toFixed(1)}%
                      </td>
                      <td className="p-3 text-right text-stone-200">{todayMetrics.totalOrders}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
