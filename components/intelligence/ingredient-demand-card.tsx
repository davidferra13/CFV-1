/**
 * Ingredient Demand Card
 *
 * Individual ingredient demand summary showing quantity needed,
 * events using it, current price, and price trend.
 */

import type { IngredientDemandItem } from '@/lib/intelligence/ingredient-demand'
import { formatCurrency } from '@/lib/utils/currency'

interface IngredientDemandCardProps {
  item: IngredientDemandItem
}

const SOURCE_LABELS: Record<string, string> = {
  chef_override: 'Your price',
  receipt: 'Receipt',
  api_quote: 'API',
  wholesale: 'Wholesale',
  direct_scrape: 'Store',
  flyer: 'Flyer',
  instacart: 'Instacart',
  regional_average: 'Regional',
  resolved_national: 'National',
  market_aggregate: 'Market',
  government: 'USDA',
  historical: 'Historical',
  category_baseline: 'Estimate',
  synthetic: 'Synthetic',
}

export function IngredientDemandCard({ item }: IngredientDemandCardProps) {
  const price = item.currentPrice
  const hasPrice = price && price.source !== 'none' && price.cents > 0

  return (
    <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 p-3">
      {/* Name + category */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <h4 className="text-sm font-medium text-stone-100 truncate">{item.ingredientName}</h4>
          {item.category && (
            <span className="text-xs text-stone-500 capitalize">{item.category}</span>
          )}
        </div>
        {/* Urgency indicator */}
        <UrgencyDot score={item.recommendation.urgencyScore} />
      </div>

      {/* Quantity */}
      <div className="mb-2">
        <span className="text-lg font-bold text-stone-100">{item.totalQuantity}</span>
        <span className="text-sm text-stone-400 ml-1">{item.unit || 'units'}</span>
        <span className="text-xs text-stone-500 ml-2">
          {item.events.length} event{item.events.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Price */}
      {hasPrice && (
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-sm font-medium text-stone-200">
            {formatCurrency(price!.cents)}/{price!.unit}
          </span>
          <span className="text-xs text-stone-500">
            {SOURCE_LABELS[price!.source] || price!.source}
          </span>
          {/* Confidence dot */}
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              price!.confidence >= 0.7
                ? 'bg-emerald-400'
                : price!.confidence >= 0.4
                  ? 'bg-amber-400'
                  : 'bg-red-400'
            }`}
            title={`Confidence: ${Math.round(price!.confidence * 100)}%`}
          />
        </div>
      )}

      {/* Estimated total */}
      {item.estimatedCostCents > 0 && (
        <div className="text-xs text-stone-400 mb-2">
          Total est: {formatCurrency(item.estimatedCostCents)}
        </div>
      )}

      {/* Events list */}
      <div className="space-y-1">
        {item.events.slice(0, 4).map((evt) => (
          <div key={evt.eventId} className="flex items-center gap-2 text-xs text-stone-500">
            <span className="font-medium text-stone-400">
              {new Date(evt.eventDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <span className="truncate">{evt.clientName}</span>
            <span className="shrink-0 text-stone-600">
              {evt.quantity} {item.unit || 'u'}
            </span>
          </div>
        ))}
        {item.events.length > 4 && (
          <p className="text-xs text-stone-600">+{item.events.length - 4} more events</p>
        )}
      </div>

      {/* Seasonal info */}
      {item.seasonal.cheapestMonth && (
        <p className="text-xs text-stone-500 mt-2">
          Cheapest in {item.seasonal.cheapestMonth}
        </p>
      )}
    </div>
  )
}

function UrgencyDot({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-red-400' :
    score >= 60 ? 'bg-amber-400' :
    score >= 40 ? 'bg-sky-400' : 'bg-stone-600'

  return (
    <span
      className={`shrink-0 w-2.5 h-2.5 rounded-full ${color}`}
      title={`Urgency: ${score}/100`}
    />
  )
}
