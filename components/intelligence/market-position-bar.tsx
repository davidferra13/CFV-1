/**
 * Market Position Bar
 *
 * Horizontal bar showing where this quote falls relative to the market range.
 * Marks: well below | below | at market | above | well above
 */

import type { PricingConfidenceReport, MarketPosition } from '@/lib/intelligence/pricing-confidence'
import { formatCurrency } from '@/lib/utils/currency'

interface MarketPositionBarProps {
  report: PricingConfidenceReport
}

const POSITION_CONFIG: Record<MarketPosition, {
  label: string
  color: string
  dotColor: string
  pctOffset: number
}> = {
  well_below: {
    label: 'Well Below Market',
    color: 'text-sky-400',
    dotColor: 'bg-sky-400',
    pctOffset: 10,
  },
  below: {
    label: 'Below Market',
    color: 'text-emerald-400',
    dotColor: 'bg-emerald-400',
    pctOffset: 30,
  },
  at_market: {
    label: 'At Market',
    color: 'text-emerald-400',
    dotColor: 'bg-emerald-400',
    pctOffset: 50,
  },
  above: {
    label: 'Above Market',
    color: 'text-amber-400',
    dotColor: 'bg-amber-400',
    pctOffset: 70,
  },
  well_above: {
    label: 'Well Above Market',
    color: 'text-red-400',
    dotColor: 'bg-red-400',
    pctOffset: 90,
  },
}

export function MarketPositionBar({ report }: MarketPositionBarProps) {
  const config = POSITION_CONFIG[report.marketPosition]

  if (!report.marketAvgPerGuestCents) {
    return (
      <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 p-3">
        <p className="text-xs text-stone-500">
          Not enough data to determine market position.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
          Market Position
        </h4>
        <span className={`text-xs font-semibold ${config.color}`}>
          {config.label}
          {report.marketDeltaPct !== null && (
            <span className="ml-1">
              ({report.marketDeltaPct > 0 ? '+' : ''}{report.marketDeltaPct}%)
            </span>
          )}
        </span>
      </div>

      {/* Bar */}
      <div className="relative h-3 bg-stone-800 rounded-full overflow-hidden mb-3">
        {/* Gradient from blue (cheap) to red (expensive) */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(to right, #38bdf8, #34d399, #fbbf24, #f87171)',
            opacity: 0.3,
          }}
        />

        {/* Market average marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-stone-400"
          style={{ left: '50%' }}
          title="Market Average"
        />

        {/* Quote position dot */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full ${config.dotColor} border-2 border-stone-900 shadow-md`}
          style={{ left: `${config.pctOffset}%`, transform: `translateX(-50%) translateY(-50%)` }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs text-stone-500">
        <span>Your Price: {formatCurrency(report.perGuestCents)}/guest</span>
        <span>Market Avg: {formatCurrency(report.marketAvgPerGuestCents)}/guest</span>
      </div>
    </div>
  )
}
