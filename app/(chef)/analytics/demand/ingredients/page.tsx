// Ingredient Demand Forecast Page
// "Next 30 days: 3 events need lobster. Buy now or wait?"

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import {
  getIngredientDemandForecast,
  getTopBuyingRecommendations,
} from '@/lib/intelligence/ingredient-demand-actions'
import { DemandTimeline } from '@/components/intelligence/demand-timeline'
import { BuyRecommendationCard } from '@/components/intelligence/buy-recommendation-card'
import { IngredientDemandCard } from '@/components/intelligence/ingredient-demand-card'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata: Metadata = { title: 'Ingredient Demand Forecast' }

type SortBy = 'urgency' | 'cost' | 'events' | 'name'

export default async function IngredientDemandPage({
  searchParams,
}: {
  searchParams: { sort?: string; days?: string }
}) {
  const user = await requireChef()
  const days = Math.min(90, Math.max(7, parseInt(searchParams.days || '30') || 30))
  const sortBy = (searchParams.sort || 'urgency') as SortBy

  const [forecast, recommendations] = await Promise.all([
    getIngredientDemandForecast(days).catch(() => null),
    getTopBuyingRecommendations().catch(() => []),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/analytics/demand"
          className="text-sm text-stone-500 hover:text-stone-300"
        >
          &larr; Demand Forecast
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">
          Ingredient Demand
        </h1>
        <p className="text-stone-400 mt-1">
          What you need to buy for the next {days} days, with pricing intelligence.
        </p>
      </div>

      {/* Date range selector */}
      <div className="flex items-center gap-2">
        {[7, 14, 30, 60].map((d) => (
          <Link
            key={d}
            href={`/analytics/demand/ingredients?days=${d}&sort=${sortBy}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              days === d
                ? 'bg-brand-600 text-white'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
            }`}
          >
            {d}d
          </Link>
        ))}
      </div>

      {!forecast ? (
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-8 text-center">
          <p className="text-stone-500 text-sm">
            No upcoming events with menus found in the next {days} days.
            Add menus to your confirmed events to see ingredient demand.
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
              <p className="text-xs text-stone-500">Events</p>
              <p className="text-lg font-bold text-stone-100">{forecast.eventsCovered}</p>
            </div>
            <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
              <p className="text-xs text-stone-500">Ingredients</p>
              <p className="text-lg font-bold text-stone-100">{forecast.items.length}</p>
            </div>
            <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
              <p className="text-xs text-stone-500">Est. Total</p>
              <p className="text-lg font-bold text-stone-100">
                {formatCurrency(forecast.totalEstimatedCostCents)}
              </p>
            </div>
            <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
              <p className="text-xs text-stone-500">Buy Now</p>
              <p className="text-lg font-bold text-emerald-400">
                {forecast.topBuyNow.length}
              </p>
            </div>
          </div>

          {/* Timeline */}
          <DemandTimeline items={forecast.items} dateRange={forecast.dateRange} />

          {/* Buy Recommendations */}
          {recommendations.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold text-stone-100 mb-3">
                Buying Recommendations
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recommendations.map((item) => (
                  <BuyRecommendationCard key={item.ingredientId} item={item} />
                ))}
              </div>
            </section>
          )}

          {/* Sort selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500">Sort by:</span>
            {([
              ['urgency', 'Urgency'],
              ['cost', 'Cost'],
              ['events', 'Events'],
              ['name', 'Name'],
            ] as const).map(([key, label]) => (
              <Link
                key={key}
                href={`/analytics/demand/ingredients?days=${days}&sort=${key}`}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  sortBy === key
                    ? 'bg-brand-600 text-white'
                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* All ingredients grid */}
          <section>
            <h2 className="text-xl font-semibold text-stone-100 mb-3">
              All Ingredients ({forecast.items.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortItems(forecast.items, sortBy).map((item) => (
                <IngredientDemandCard key={item.ingredientId} item={item} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function sortItems(
  items: Awaited<ReturnType<typeof getIngredientDemandForecast>> extends infer T
    ? T extends null ? never : T extends { items: infer I } ? I : never
    : never,
  sortBy: SortBy
) {
  const sorted = [...items]
  switch (sortBy) {
    case 'urgency':
      return sorted.sort((a, b) => b.recommendation.urgencyScore - a.recommendation.urgencyScore)
    case 'cost':
      return sorted.sort((a, b) => b.estimatedCostCents - a.estimatedCostCents)
    case 'events':
      return sorted.sort((a, b) => b.events.length - a.events.length)
    case 'name':
      return sorted.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName))
    default:
      return sorted
  }
}
