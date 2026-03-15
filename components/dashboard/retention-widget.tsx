'use client'

// Client Retention Widget - Dashboard widget showing active/churning/lost breakdown.
// CSS-only donut visualization, no chart library.

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import type { ClientRetentionMetrics } from '@/lib/clients/lifetime-value-actions'

interface Props {
  metrics: ClientRetentionMetrics
}

export function RetentionWidget({ metrics }: Props) {
  if (metrics.totalClients === 0) return null

  const { activeClients, churningClients, lostClients, totalClients } = metrics

  // Percentages for the bar chart
  const activePct = totalClients > 0 ? (activeClients / totalClients) * 100 : 0
  const churningPct = totalClients > 0 ? (churningClients / totalClients) * 100 : 0
  const lostPct = totalClients > 0 ? (lostClients / totalClients) * 100 : 0

  const segments = [
    {
      label: 'Active',
      count: activeClients,
      pct: activePct,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-400',
      desc: 'Event in last 90 days',
    },
    {
      label: 'Churning',
      count: churningClients,
      pct: churningPct,
      color: 'bg-amber-500',
      textColor: 'text-amber-400',
      desc: '90-180 days inactive',
    },
    {
      label: 'Lost',
      count: lostClients,
      pct: lostPct,
      color: 'bg-red-500',
      textColor: 'text-red-400',
      desc: '180+ days inactive',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Retention</CardTitle>
        <p className="text-xs text-stone-500 mt-0.5">{totalClients} total clients</p>
      </CardHeader>
      <CardContent>
        {/* Stacked horizontal bar */}
        <div className="flex h-4 rounded-full overflow-hidden bg-stone-800 mb-4">
          {segments.map(
            (seg) =>
              seg.pct > 0 && (
                <div
                  key={seg.label}
                  className={`${seg.color} transition-all duration-300`}
                  style={{ width: `${Math.max(seg.pct, 2)}%` }}
                  title={`${seg.label}: ${seg.count} (${Math.round(seg.pct)}%)`}
                />
              )
          )}
        </div>

        {/* Legend with counts */}
        <div className="space-y-2">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${seg.color}`} />
                <div>
                  <span className={`text-sm font-medium ${seg.textColor}`}>{seg.label}</span>
                  <span className="text-xs text-stone-500 ml-1.5">({seg.desc})</span>
                </div>
              </div>
              <span className="text-sm font-semibold text-stone-200">{seg.count}</span>
            </div>
          ))}
        </div>

        {/* Alert for churning clients */}
        {churningClients > 0 && (
          <div className="mt-4 p-2.5 rounded-md bg-amber-950/50 border border-amber-800/50">
            <p className="text-xs text-amber-400">
              {churningClients} {churningClients === 1 ? "client hasn't" : "clients haven't"} booked
              in 90+ days. Consider reaching out.
            </p>
          </div>
        )}

        {/* Summary stats */}
        <div className="mt-4 pt-3 border-t border-stone-800 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-stone-500">Avg Lifetime</p>
            <p className="text-sm font-semibold text-stone-200">
              {metrics.avgLifetimeMonths} {metrics.avgLifetimeMonths === 1 ? 'month' : 'months'}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Avg Lifetime Revenue</p>
            <p className="text-sm font-semibold text-stone-200">
              {formatCurrency(metrics.avgLifetimeRevenueCents)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
