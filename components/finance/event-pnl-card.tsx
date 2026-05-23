'use client'

// Per-event Profit & Loss card. Shows revenue vs costs = net profit.
// Color-coded: green if profitable, red if loss.
// Compact enough for event detail pages.

import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import type { EventProfit } from '@/lib/finance/profit-calculator'

type Props = {
  data: EventProfit
  /** Compact mode hides the cost breakdown */
  compact?: boolean
}

export function EventPnLCard({ data, compact }: Props) {
  const isProfitable = data.netProfitCents >= 0
  const hasRevenue = data.revenueCents > 0
  const hasCosts = data.totalCostCents > 0

  // No financial data: show guidance
  if (!hasRevenue && !hasCosts) {
    return (
      <Card>
        <CardContent className="py-4">
          <h3 className="text-sm font-semibold text-stone-400 mb-1">Event P&L</h3>
          <p className="text-sm text-stone-500">
            Record payments and expenses to see this event&apos;s profitability.
          </p>
        </CardContent>
      </Card>
    )
  }

  const profitColor = isProfitable ? 'text-emerald-400' : 'text-red-400'
  const profitBg = isProfitable ? 'bg-emerald-950/30' : 'bg-red-950/30'
  const profitBorder = isProfitable ? 'border-emerald-900/40' : 'border-red-900/40'

  // Cost lines for the breakdown (skip zero values)
  const costLines = [
    { label: 'Food & Ingredients', cents: data.foodCostCents },
    { label: 'Travel', cents: data.travelCostCents },
    { label: 'Supplies & Equipment', cents: data.suppliesCostCents },
    { label: 'Labor', cents: data.laborCostCents },
    { label: 'Other', cents: data.otherCostCents },
  ].filter((l) => l.cents > 0)

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-400">Event P&L</h3>
          {data.marginPercent > 0 && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${profitBg} ${profitColor} border ${profitBorder}`}
            >
              {data.marginPercent}% margin
            </span>
          )}
        </div>

        {/* Revenue and Cost summary */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-stone-500">Revenue</p>
            <p className="text-lg font-bold text-stone-200">
              {hasRevenue ? formatCurrency(data.revenueCents) : 'Pending'}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Costs</p>
            <p className="text-lg font-bold text-stone-200">
              {hasCosts ? formatCurrency(data.totalCostCents) : 'Pending'}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Net Profit</p>
            <p className={`text-lg font-bold ${profitColor}`}>
              {formatCurrency(Math.abs(data.netProfitCents))}
              {data.netProfitCents < 0 && (
                <span className="text-xs font-normal ml-1">loss</span>
              )}
            </p>
          </div>
        </div>

        {/* Cost breakdown (skip in compact mode) */}
        {!compact && costLines.length > 0 && (
          <div className="border-t border-stone-800 pt-3 space-y-1.5">
            <p className="text-xs text-stone-500 uppercase tracking-wide font-medium">Cost Breakdown</p>
            {costLines.map((line) => (
              <div key={line.label} className="flex items-center justify-between text-sm">
                <span className="text-stone-400">{line.label}</span>
                <span className="text-stone-300 font-medium">{formatCurrency(line.cents)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm pt-1 border-t border-stone-800 font-semibold">
              <span className="text-stone-300">Total</span>
              <span className="text-stone-200">{formatCurrency(data.totalCostCents)}</span>
            </div>
          </div>
        )}

        {/* Per-guest info if available */}
        {data.guestCount && data.guestCount > 0 && hasRevenue && (
          <div className="flex items-center gap-4 text-xs text-stone-500 border-t border-stone-800 pt-2">
            <span>{data.guestCount} {data.guestCount === 1 ? 'guest' : 'guests'}</span>
            <span>
              {formatCurrency(Math.round(data.revenueCents / data.guestCount))}/guest revenue
            </span>
            <span className={isProfitable ? 'text-emerald-500' : 'text-red-500'}>
              {formatCurrency(Math.round(Math.abs(data.netProfitCents) / data.guestCount))}/guest {isProfitable ? 'profit' : 'loss'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
