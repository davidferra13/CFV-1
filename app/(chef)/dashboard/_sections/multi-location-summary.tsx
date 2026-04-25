// Multi-Location Summary Widget for Dashboard
// Shows a compact overview of all locations when the chef has multiple active locations.

import { getMultiLocationSnapshot } from '@/lib/locations/actions'
import { getActiveAlerts } from '@/lib/locations/alert-actions'
import { formatCurrency } from '@/lib/utils/format'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

function StatusDot({ status }: { status: 'good' | 'warning' | 'critical' }) {
  const colors = {
    good: 'bg-emerald-500',
    warning: 'bg-amber-500',
    critical: 'bg-red-500',
  }
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[status]}`} />
}

export async function MultiLocationSummary() {
  const [snapshots, alerts] = await Promise.all([getMultiLocationSnapshot(), getActiveAlerts()])

  // Only show if there are 2+ locations
  if (snapshots.length < 2) return null

  const criticalAlerts = alerts.filter((a) => a.severity === 'critical')
  const totalRevenue = snapshots.reduce((sum, s) => sum + (s.todayMetrics?.revenue ?? 0), 0)
  const totalCovers = snapshots.reduce((sum, s) => sum + (s.todayMetrics?.covers ?? 0), 0)

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="section-label">Locations</div>
        <Link
          href="/locations"
          className="text-xs text-amber-500 hover:text-amber-400 transition-colors"
        >
          View Command Center
        </Link>
      </div>

      {/* Critical alerts banner */}
      {criticalAlerts.length > 0 && (
        <div className="mb-3 rounded-lg bg-red-900/30 border border-red-700/50 p-3">
          <div className="flex items-center gap-2 text-sm text-red-300">
            <Badge variant="error">{criticalAlerts.length} critical</Badge>
            <span>{criticalAlerts[0].title}</span>
            {criticalAlerts.length > 1 && (
              <span className="text-red-400 text-xs">+{criticalAlerts.length - 1} more</span>
            )}
          </div>
        </div>
      )}

      {/* Aggregate row */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-stone-500">Total Covers</p>
            <p className="text-lg font-bold text-stone-100">{totalCovers.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-stone-500">Total Revenue</p>
            <p className="text-lg font-bold text-stone-100">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-stone-500">Active Alerts</p>
            <p
              className={`text-lg font-bold ${alerts.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}
            >
              {alerts.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Per-location compact cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {snapshots.map(
          ({ location, todayMetrics: m, activeAlerts: locAlerts, inventoryHealth }) => (
            <Link key={location.id} href={`/locations/${location.id}`} className="block group">
              <div className="rounded-lg bg-stone-800/50 border border-stone-700/50 p-3 hover:border-stone-600 transition-colors">
                <div className="flex items-center gap-1.5 mb-2">
                  <StatusDot
                    status={locAlerts > 0 ? (locAlerts > 2 ? 'critical' : 'warning') : 'good'}
                  />
                  <span className="text-sm font-medium text-stone-200 truncate group-hover:text-amber-400 transition-colors">
                    {location.name}
                  </span>
                </div>
                {m ? (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div>
                      <span className="text-stone-500">Covers</span>
                      <span className="ml-1 text-stone-300">{m.covers}</span>
                    </div>
                    <div>
                      <span className="text-stone-500">Rev</span>
                      <span className="ml-1 text-stone-300">{formatCurrency(m.revenue)}</span>
                    </div>
                    <div>
                      <span className="text-stone-500">Food</span>
                      <span
                        className={`ml-1 ${m.foodCostPct > 35 ? 'text-red-400' : m.foodCostPct > 30 ? 'text-amber-400' : 'text-emerald-400'}`}
                      >
                        {m.foodCostPct.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500">Inv</span>
                      <span
                        className={`ml-1 ${inventoryHealth === 'critical' ? 'text-red-400' : inventoryHealth === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`}
                      >
                        {inventoryHealth}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-stone-600">No data today</p>
                )}
              </div>
            </Link>
          )
        )}
      </div>
    </section>
  )
}

export function MultiLocationSummarySkeleton() {
  return (
    <section>
      <div className="section-label mb-4">Locations</div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-stone-800/30 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-stone-800/30 animate-pulse" />
        ))}
      </div>
    </section>
  )
}
