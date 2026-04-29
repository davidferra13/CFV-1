'use client'

// FoodCostVariance - Theoretical vs actual food cost comparison table.
// Shows per-event variance with color-coded indicators and a summary row.

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calculator, TrendingUp, TrendingDown, Minus } from '@/components/ui/icons'
import type { EventFoodCostTruth } from '@/lib/finance/food-cost-truth-types'

function formatMoney(cents: number | null): string {
  if (cents == null) return '-'
  return `$${(cents / 100).toFixed(2)}`
}

function VarianceBadge({ variancePct }: { variancePct: number | null }) {
  if (variancePct == null) {
    return <Badge variant="warning">Pending</Badge>
  }
  if (variancePct > 5) {
    return (
      <Badge variant="error">
        <TrendingUp className="h-3 w-3 mr-1" />+{variancePct.toFixed(1)}%
      </Badge>
    )
  }
  if (variancePct < -5) {
    return (
      <Badge variant="success">
        <TrendingDown className="h-3 w-3 mr-1" />
        {variancePct.toFixed(1)}%
      </Badge>
    )
  }
  return (
    <Badge variant="default">
      <Minus className="h-3 w-3 mr-1" />
      {variancePct >= 0 ? '+' : ''}
      {variancePct.toFixed(1)}%
    </Badge>
  )
}

function DataStateBadge({ event }: { event: EventFoodCostTruth }) {
  if (event.dataState === 'complete') return <Badge variant="success">Complete</Badge>
  if (event.dataState === 'missing_revenue') return <Badge variant="warning">Missing revenue</Badge>
  if (event.dataState === 'missing_projected_cost') {
    return <Badge variant="warning">Missing projected</Badge>
  }
  if (event.dataState === 'missing_actual_cost')
    return <Badge variant="warning">Missing actual</Badge>
  return <Badge variant="info">Partial</Badge>
}

export function FoodCostVariance({ events }: { events: EventFoodCostTruth[] }) {
  const completeEvents = events.filter(
    (event) => event.projectedFoodCostCents != null && event.actualFoodCostCents != null
  )
  const totalTheoretical = completeEvents.reduce(
    (sum, event) => sum + (event.projectedFoodCostCents ?? 0),
    0
  )
  const totalActual = completeEvents.reduce(
    (sum, event) => sum + (event.actualFoodCostCents ?? 0),
    0
  )
  const totalVarianceCents = totalActual - totalTheoretical
  const totalVariancePct =
    totalTheoretical > 0
      ? Math.round(((totalActual - totalTheoretical) / totalTheoretical) * 1000) / 10
      : null

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calculator className="h-10 w-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 text-sm">No events with food cost data available.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-stone-400" />
            Food Cost Variance
          </CardTitle>
          <VarianceBadge variancePct={totalVariancePct} />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-800 border-y border-stone-800">
                <th className="px-6 py-2.5 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Event
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Theoretical
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Actual
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Variance ($)
                </th>
                <th className="px-6 py-2.5 text-right text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Variance (%)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {events.map((event) => (
                <tr key={event.eventId} className="hover:bg-stone-800/50 transition-colors">
                  <td className="px-6 py-3 font-medium text-stone-100 truncate max-w-[200px]">
                    <div>{event.eventName}</div>
                    {event.missingReasons.length > 0 && (
                      <div className="mt-1 text-xs font-normal text-stone-500">
                        {event.missingReasons.join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <DataStateBadge event={event} />
                  </td>
                  <td className="px-4 py-3 text-right text-stone-400">
                    {formatMoney(event.projectedFoodCostCents)}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-400">
                    {formatMoney(event.actualFoodCostCents)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${
                      (event.varianceCents ?? 0) > 0
                        ? 'text-red-600'
                        : (event.varianceCents ?? 0) < 0
                          ? 'text-emerald-600'
                          : 'text-stone-500'
                    }`}
                  >
                    {(event.varianceCents ?? 0) > 0 ? '+' : ''}
                    {formatMoney(event.varianceCents)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <VarianceBadge variancePct={event.variancePercent} />
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Summary row */}
            <tfoot>
              <tr className="bg-stone-800 border-t-2 border-stone-700">
                <td className="px-6 py-3 font-bold text-stone-100">
                  Total ({completeEvents.length} complete event
                  {completeEvents.length !== 1 ? 's' : ''})
                </td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right font-bold text-stone-100">
                  {formatMoney(totalTheoretical)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-stone-100">
                  {formatMoney(totalActual)}
                </td>
                <td
                  className={`px-4 py-3 text-right font-bold ${
                    totalVarianceCents > 0
                      ? 'text-red-600'
                      : totalVarianceCents < 0
                        ? 'text-emerald-600'
                        : 'text-stone-500'
                  }`}
                >
                  {totalVarianceCents > 0 ? '+' : ''}
                  {formatMoney(totalVarianceCents)}
                </td>
                <td className="px-6 py-3 text-right">
                  <VarianceBadge variancePct={totalVariancePct} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
