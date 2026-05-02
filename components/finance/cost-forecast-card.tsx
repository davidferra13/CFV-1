'use client'

// Predictive Cost Analysis Card
// Module: finance
// Shows projected ingredient cost at event date based on price trends.
// Pure display component consuming pre-fetched CostForecast data.

import type { CostForecast } from '@/lib/openclaw/cost-forecast-actions'

type Props = {
  forecast: CostForecast
}

const CONFIDENCE_STYLES: Record<string, string> = {
  high: 'text-emerald-400 bg-emerald-400/10',
  medium: 'text-amber-400 bg-amber-400/10',
  low: 'text-stone-400 bg-stone-700/30',
}

const DIRECTION_ICONS: Record<string, string> = {
  up: '\u2191',
  down: '\u2193',
  flat: '\u2192',
  unknown: '?',
}

const DIRECTION_COLORS: Record<string, string> = {
  up: 'text-red-400',
  down: 'text-emerald-400',
  flat: 'text-stone-400',
  unknown: 'text-stone-500',
}

function formatDollars(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function CostForecastCard({ forecast }: Props) {
  const isIncrease = forecast.changePct > 0
  const changeColor = isIncrease
    ? 'text-red-400'
    : forecast.changePct < 0
      ? 'text-emerald-400'
      : 'text-stone-400'

  // Only show ingredients with meaningful trends
  const trendingIngredients = forecast.ingredientForecasts
    .filter(
      (i) =>
        i.trendDirection !== 'flat' &&
        i.trendDirection !== 'unknown' &&
        Math.abs(i.trendPct7d || 0) > 1
    )
    .sort((a, b) => Math.abs(b.trendPct7d || 0) - Math.abs(a.trendPct7d || 0))
    .slice(0, 5)

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-stone-300">Cost Projection</h3>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full ${CONFIDENCE_STYLES[forecast.confidence]}`}
        >
          {forecast.confidence} confidence
        </span>
      </div>

      {/* Main projection */}
      <div className="flex items-baseline gap-4">
        <div>
          <div className="text-xs text-stone-500">Today</div>
          <div className="text-lg font-bold text-stone-300">
            {formatDollars(forecast.currentCostCents)}
          </div>
        </div>
        <div className={`text-lg ${changeColor}`}>{'\u2192'}</div>
        <div>
          <div className="text-xs text-stone-500">At event ({forecast.daysOut}d)</div>
          <div className={`text-lg font-bold ${changeColor}`}>
            {formatDollars(forecast.forecastCostCents)}
          </div>
        </div>
        <div className={`text-sm font-medium ${changeColor}`}>
          {isIncrease ? '+' : ''}
          {forecast.changePct.toFixed(1)}%
        </div>
      </div>

      {/* Trending ingredients */}
      {trendingIngredients.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-stone-800">
          <div className="text-[10px] text-stone-500 uppercase tracking-wide">
            Price movers (7d trend)
          </div>
          {trendingIngredients.map((ing) => (
            <div key={ing.name} className="flex items-center justify-between text-xs">
              <span className="text-stone-400 truncate max-w-[60%]">{ing.name}</span>
              <div className="flex items-center gap-1.5">
                <span className={DIRECTION_COLORS[ing.trendDirection]}>
                  {DIRECTION_ICONS[ing.trendDirection]}
                </span>
                <span className={DIRECTION_COLORS[ing.trendDirection]}>
                  {ing.trendPct7d
                    ? `${ing.trendPct7d > 0 ? '+' : ''}${ing.trendPct7d.toFixed(1)}%`
                    : '-'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {forecast.caveat && <p className="text-[10px] text-stone-600 italic">{forecast.caveat}</p>}
    </div>
  )
}
