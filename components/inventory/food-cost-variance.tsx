'use client'

// FoodCostVariance - Theoretical vs actual food cost comparison table.
// Shows per-event variance with color-coded indicators and a summary row.

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calculator, TrendingUp, TrendingDown, Minus } from '@/components/ui/icons'

type EventVariance = {
  eventId: string
  eventName: string
  theoreticalCostCents: number
  actualCostCents: number
  varianceCents: number
  variancePct: number
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function VarianceBadge({ variancePct }: { variancePct: number }) {
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

export function FoodCostVariance({ events }: { events: EventVariance[] }) {
  // Compute totals
  const totalTheoretical = events.reduce((sum, e) => sum + e.theoreticalCostCents, 0)
  const totalActual = events.reduce((sum, e) => sum + e.actualCostCents, 0)
  const totalVarianceCents = totalActual - totalTheoretical
  const totalVariancePct =
    totalTheoretical > 0 ? ((totalActual - totalTheoretical) / totalTheoretical) * 100 : 0

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
                    {event.eventName}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-400">
                    {formatMoney(event.theoreticalCostCents)}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-400">
                    {formatMoney(event.actualCostCents)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${
                      event.varianceCents > 0
                        ? 'text-red-600'
                        : event.varianceCents < 0
                          ? 'text-emerald-600'
                          : 'text-stone-500'
                    }`}
                  >
                    {event.varianceCents > 0 ? '+' : ''}
                    {formatMoney(event.varianceCents)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <VarianceBadge variancePct={event.variancePct} />
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Summary row */}
            <tfoot>
              <tr className="bg-stone-800 border-t-2 border-stone-700">
                <td className="px-6 py-3 font-bold text-stone-100">
                  Total ({events.length} event{events.length !== 1 ? 's' : ''})
                </td>
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
