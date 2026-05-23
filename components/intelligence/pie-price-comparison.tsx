'use client'

/**
 * PIE Price Comparison - Inline price comparison bar.
 *
 * Shows when editing a quote or viewing pricing:
 *   "Your price: $X | Market average: $Y | Food cost: $Z"
 *
 * Color coding:
 *   - Green: competitive (at or above market)
 *   - Yellow: slightly low (5-15% below)
 *   - Red: well below market (15%+ below)
 *
 * Data comes from PIE resolve-price and pricing-confidence.
 * Compact inline bar, not a full card.
 */

import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'

export interface PriceComparisonData {
  /** Chef's price in cents */
  yourPriceCents: number
  /** Market average in cents (null if no market data) */
  marketAverageCents: number | null
  /** Estimated food cost percentage (0-100) */
  foodCostPct: number | null
  /** Unit label (e.g. "per guest", "per lb") */
  unitLabel: string
  /** Source tier for market data */
  marketSource: string | null
}

type PricePosition = 'competitive' | 'low' | 'very_low' | 'no_data'

function classifyPosition(yourCents: number, marketCents: number | null): PricePosition {
  if (!marketCents || marketCents <= 0) return 'no_data'
  const delta = (yourCents - marketCents) / marketCents
  if (delta >= -0.05) return 'competitive'
  if (delta >= -0.15) return 'low'
  return 'very_low'
}

const positionConfig: Record<
  PricePosition,
  { color: string; bgColor: string; borderColor: string; label: string; Icon: typeof TrendingUp }
> = {
  competitive: {
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    label: 'Competitive',
    Icon: TrendingUp,
  },
  low: {
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    label: 'Below Market',
    Icon: TrendingDown,
  },
  very_low: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    label: 'Well Below Market',
    Icon: AlertTriangle,
  },
  no_data: {
    color: 'text-stone-400',
    bgColor: 'bg-stone-500/10',
    borderColor: 'border-stone-500/30',
    label: 'No Market Data',
    Icon: Minus,
  },
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

interface PiePriceComparisonProps {
  data: PriceComparisonData
  className?: string
}

export function PiePriceComparison({ data, className }: PiePriceComparisonProps) {
  const position = classifyPosition(data.yourPriceCents, data.marketAverageCents)
  const config = positionConfig[position]
  const Icon = config.Icon

  const deltaPct =
    data.marketAverageCents && data.marketAverageCents > 0
      ? Math.round(
          ((data.yourPriceCents - data.marketAverageCents) / data.marketAverageCents) * 100
        )
      : null

  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border ${config.borderColor} ${config.bgColor} px-3 py-2 text-xs ${className || ''}`}
      role="status"
      aria-label="Price comparison with market"
    >
      {/* Your price */}
      <div className="flex items-center gap-1.5">
        <span className="text-stone-400">Your price:</span>
        <span className="font-semibold text-stone-100">{formatCents(data.yourPriceCents)}</span>
        <span className="text-stone-500">{data.unitLabel}</span>
      </div>

      <span className="hidden sm:inline text-stone-600" aria-hidden="true">
        |
      </span>

      {/* Market average */}
      <div className="flex items-center gap-1.5">
        <span className="text-stone-400">Market avg:</span>
        <span className="font-semibold text-stone-100">
          {data.marketAverageCents ? formatCents(data.marketAverageCents) : 'N/A'}
        </span>
        {deltaPct !== null && (
          <span className={`flex items-center gap-0.5 ${config.color}`}>
            <Icon className="h-3 w-3" aria-hidden="true" />
            {deltaPct > 0 ? '+' : ''}
            {deltaPct}%
          </span>
        )}
      </div>

      {/* Food cost */}
      {data.foodCostPct !== null && (
        <>
          <span className="hidden sm:inline text-stone-600" aria-hidden="true">
            |
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-stone-400">Food cost:</span>
            <span
              className={`font-semibold ${
                data.foodCostPct <= 30
                  ? 'text-emerald-400'
                  : data.foodCostPct <= 40
                    ? 'text-amber-400'
                    : 'text-red-400'
              }`}
            >
              {data.foodCostPct}%
            </span>
          </div>
        </>
      )}

      {/* Position badge */}
      <span
        className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${config.color} ${config.bgColor} border ${config.borderColor}`}
      >
        {config.label}
      </span>
    </div>
  )
}
