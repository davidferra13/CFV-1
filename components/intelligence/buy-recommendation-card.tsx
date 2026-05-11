/**
 * Buy Recommendation Card
 *
 * Shows a buy-now/wait recommendation for an ingredient with price data.
 * Used in the ingredient demand forecast page.
 */

import type { IngredientDemandItem } from '@/lib/intelligence/ingredient-demand'
import { formatCurrency } from '@/lib/utils/currency'

interface BuyRecommendationCardProps {
  item: IngredientDemandItem
}

const ACTION_CONFIG = {
  buy_now: {
    label: 'Buy Now',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    icon: '$$',
  },
  wait: {
    label: 'Wait',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    text: 'text-sky-400',
    icon: '...',
  },
  watch: {
    label: 'Watch',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    icon: '**',
  },
  no_data: {
    label: 'No Data',
    bg: 'bg-stone-500/10',
    border: 'border-stone-500/30',
    text: 'text-stone-400',
    icon: '??',
  },
} as const

const TREND_CONFIG = {
  rising: { label: 'Trending Up', text: 'text-red-400', arrow: '\u2191' },
  falling: { label: 'Trending Down', text: 'text-emerald-400', arrow: '\u2193' },
  stable: { label: 'Stable', text: 'text-stone-400', arrow: '\u2192' },
  unknown: { label: '', text: 'text-stone-500', arrow: '' },
} as const

export function BuyRecommendationCard({ item }: BuyRecommendationCardProps) {
  const rec = item.recommendation
  const config = ACTION_CONFIG[rec.action]
  const trend = TREND_CONFIG[item.seasonal.direction]

  const earliestEvent = item.events[0]
  const daysUntil = earliestEvent
    ? Math.ceil(
        (new Date(earliestEvent.eventDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null

  return (
    <div
      className={`rounded-lg border ${config.border} ${config.bg} p-4 transition-colors hover:bg-stone-800/60`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-stone-100 truncate">
            {item.ingredientName}
          </h4>
          <p className="text-xs text-stone-500">
            {item.totalQuantity} {item.unit || 'units'} across {item.events.length} event
            {item.events.length !== 1 ? 's' : ''}
          </p>
        </div>
        <span
          className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${config.text} ${config.bg} border ${config.border}`}
        >
          {config.label}
        </span>
      </div>

      {/* Price row */}
      <div className="flex items-baseline gap-3 mb-2">
        {item.currentPrice && item.currentPrice.source !== 'none' && (
          <div>
            <span className="text-lg font-bold text-stone-100">
              {formatCurrency(item.currentPrice.cents)}
            </span>
            <span className="text-xs text-stone-500">/{item.currentPrice.unit}</span>
          </div>
        )}
        {item.seasonal.direction !== 'unknown' && (
          <span className={`text-xs font-medium ${trend.text}`}>
            {trend.arrow} {trend.label}
          </span>
        )}
      </div>

      {/* Forecast row */}
      {item.seasonal.forecast30dCents && item.currentPrice && item.currentPrice.cents > 0 && (
        <div className="text-xs text-stone-400 mb-2">
          30-day forecast: {formatCurrency(item.seasonal.forecast30dCents)}/{item.currentPrice.unit}
          {item.seasonal.direction === 'rising' && (
            <span className="text-red-400 ml-1">
              (+{Math.round(
                ((item.seasonal.forecast30dCents - item.currentPrice.cents) / item.currentPrice.cents) * 100
              )}%)
            </span>
          )}
          {item.seasonal.direction === 'falling' && (
            <span className="text-emerald-400 ml-1">
              ({Math.round(
                ((item.seasonal.forecast30dCents - item.currentPrice.cents) / item.currentPrice.cents) * 100
              )}%)
            </span>
          )}
        </div>
      )}

      {/* Estimated total cost */}
      {item.estimatedCostCents > 0 && (
        <div className="text-xs text-stone-400 mb-2">
          Est. total: <span className="text-stone-200 font-medium">{formatCurrency(item.estimatedCostCents)}</span>
        </div>
      )}

      {/* Potential savings */}
      {rec.potentialSavingsCents && rec.potentialSavingsCents > 0 && (
        <div className="text-xs text-emerald-400 mb-2">
          Potential savings: {formatCurrency(rec.potentialSavingsCents)}
        </div>
      )}

      {/* Recommendation reason */}
      <p className="text-xs text-stone-400 mb-2">{rec.reason}</p>

      {/* Event chips */}
      <div className="flex flex-wrap gap-1">
        {item.events.slice(0, 3).map((evt) => (
          <span
            key={evt.eventId}
            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-stone-800 text-stone-400 border border-stone-700/50"
          >
            {new Date(evt.eventDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
            {daysUntil !== null && evt === earliestEvent && daysUntil <= 7 && (
              <span className="ml-1 text-amber-400">({daysUntil}d)</span>
            )}
          </span>
        ))}
        {item.events.length > 3 && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-stone-800 text-stone-500">
            +{item.events.length - 3} more
          </span>
        )}
      </div>
    </div>
  )
}
