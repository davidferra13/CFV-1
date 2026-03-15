'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import {
  getFrequentIngredients,
  getIngredientPriceStats,
  getPriceComparison,
  getPriceHistory,
  type IngredientPriceStats,
  type PriceTrend,
  type PriceEntry,
} from '@/lib/finance/grocery-price-actions'

function TrendArrow({ trend }: { trend: PriceTrend }) {
  if (trend === 'up') return <span className="text-red-500" title="Price increasing">&#9650;</span>
  if (trend === 'down') return <span className="text-green-500" title="Price decreasing">&#9660;</span>
  return <span className="text-gray-400" title="Price stable">&#9644;</span>
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/** Simple CSS-only bar chart showing price over time */
function PriceSparkline({ entries }: { entries: PriceEntry[] }) {
  if (entries.length < 2) return null

  // Show last 10 entries, oldest first
  const recent = entries.slice(0, 10).reverse()
  const unitPrices = recent.map((e) => e.price_cents / (e.quantity || 1))
  const max = Math.max(...unitPrices)
  const min = Math.min(...unitPrices)
  const range = max - min || 1

  return (
    <div className="flex items-end gap-px h-8" title="Price trend (last 10 entries)">
      {unitPrices.map((price, i) => {
        const height = ((price - min) / range) * 100
        const isLatest = i === unitPrices.length - 1
        return (
          <div
            key={i}
            className={`w-2 rounded-t ${isLatest ? 'bg-blue-500' : 'bg-blue-200'}`}
            style={{ height: `${Math.max(height, 10)}%` }}
            title={`${formatCents(Math.round(price))} - ${recent[i].receipt_date}`}
          />
        )
      })}
    </div>
  )
}

export function GroceryPriceTrends() {
  const [stats, setStats] = useState<IngredientPriceStats[]>([])
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null)
  const [comparison, setComparison] = useState<
    { store_name: string; avg_cents: number; latest_cents: number; entry_count: number }[]
  >([])
  const [sparklineData, setSparklineData] = useState<Map<string, PriceEntry[]>>(new Map())
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const loadStats = useCallback(() => {
    startTransition(async () => {
      try {
        const freqResult = await getFrequentIngredients()
        if (!freqResult.success || !freqResult.ingredients) {
          setError(freqResult.error || 'Failed to load ingredients')
          return
        }

        // Fetch stats for each frequent ingredient
        const allStats: IngredientPriceStats[] = []
        const sparklines = new Map<string, PriceEntry[]>()

        for (const ing of freqResult.ingredients) {
          const [statsResult, histResult] = await Promise.all([
            getIngredientPriceStats(ing.name),
            getPriceHistory(ing.name),
          ])
          if (statsResult.success && statsResult.stats) {
            allStats.push(statsResult.stats)
          }
          if (histResult.success && histResult.entries) {
            sparklines.set(ing.name, histResult.entries)
          }
        }

        setStats(allStats)
        setSparklineData(sparklines)
        setError(null)
      } catch (err) {
        setError('Failed to load price trends')
        console.error('[grocery-price-trends] load failed:', err)
      }
    })
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  function handleSelectIngredient(name: string) {
    setSelectedIngredient(name)
    startTransition(async () => {
      try {
        const result = await getPriceComparison(name)
        if (result.success && result.stores) {
          setComparison(result.stores)
        }
      } catch (err) {
        console.error('[grocery-price-trends] comparison failed:', err)
      }
    })
  }

  // Sort by average price descending for "most expensive" view
  const sortedByPrice = [...stats].sort((a, b) => b.avg_cents - a.avg_cents)
  const top10Expensive = sortedByPrice.slice(0, 10)

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Price Trends</h2>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {stats.length === 0 && !isPending && !error && (
        <p className="text-sm text-gray-400">
          No price data yet. Log some receipt prices to see trends.
        </p>
      )}

      {/* Per-ingredient stats table */}
      {stats.length > 0 && (
        <div className="overflow-x-auto">
          <h3 className="mb-2 text-sm font-medium text-gray-700">
            Ingredient Price History
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500">
                <th className="pb-2 pr-3">Ingredient</th>
                <th className="pb-2 pr-3">Avg</th>
                <th className="pb-2 pr-3">Min</th>
                <th className="pb-2 pr-3">Max</th>
                <th className="pb-2 pr-3">Latest</th>
                <th className="pb-2 pr-3">Trend</th>
                <th className="pb-2 pr-3">Chart</th>
                <th className="pb-2 pr-3">Entries</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr
                  key={s.ingredient_name}
                  className={`border-b last:border-0 cursor-pointer hover:bg-gray-50 ${
                    selectedIngredient === s.ingredient_name ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleSelectIngredient(s.ingredient_name)}
                >
                  <td className="py-2 pr-3 font-medium capitalize">
                    {s.ingredient_name}
                  </td>
                  <td className="py-2 pr-3">{formatCents(s.avg_cents)}</td>
                  <td className="py-2 pr-3 text-green-600">
                    {formatCents(s.min_cents)}
                  </td>
                  <td className="py-2 pr-3 text-red-600">
                    {formatCents(s.max_cents)}
                  </td>
                  <td className="py-2 pr-3">{formatCents(s.latest_cents)}</td>
                  <td className="py-2 pr-3">
                    <TrendArrow trend={s.trend} />
                  </td>
                  <td className="py-2 pr-3">
                    <PriceSparkline
                      entries={sparklineData.get(s.ingredient_name) ?? []}
                    />
                  </td>
                  <td className="py-2 pr-3 text-gray-500">{s.entry_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Store comparison for selected ingredient */}
      {selectedIngredient && comparison.length > 0 && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 text-sm font-medium text-gray-700">
            Store Comparison: <span className="capitalize">{selectedIngredient}</span>
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500">
                <th className="pb-2 pr-3">Store</th>
                <th className="pb-2 pr-3">Avg Price</th>
                <th className="pb-2 pr-3">Latest Price</th>
                <th className="pb-2 pr-3">Entries</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((c) => (
                <tr key={c.store_name} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-medium">{c.store_name}</td>
                  <td className="py-2 pr-3">{formatCents(c.avg_cents)}</td>
                  <td className="py-2 pr-3">{formatCents(c.latest_cents)}</td>
                  <td className="py-2 pr-3 text-gray-500">{c.entry_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedIngredient && comparison.length === 0 && !isPending && (
        <p className="text-sm text-gray-400">
          No store comparison data available. Log prices with store names to compare.
        </p>
      )}

      {/* Top 10 most expensive */}
      {top10Expensive.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-gray-700">
            Top 10 Most Expensive Ingredients (by avg price)
          </h3>
          <div className="space-y-1">
            {top10Expensive.map((s, i) => {
              const maxAvg = top10Expensive[0].avg_cents || 1
              const widthPercent = (s.avg_cents / maxAvg) * 100
              return (
                <div key={s.ingredient_name} className="flex items-center gap-2">
                  <span className="w-5 text-xs text-gray-400">{i + 1}</span>
                  <span className="w-32 truncate text-sm capitalize">
                    {s.ingredient_name}
                  </span>
                  <div className="flex-1">
                    <div
                      className="h-4 rounded bg-orange-200"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-sm font-medium">
                    {formatCents(s.avg_cents)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
