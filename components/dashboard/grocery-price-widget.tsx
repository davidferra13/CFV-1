'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import {
  getPriceHistory,
  getIngredientPriceStats,
  getFrequentIngredients,
  type PriceEntry,
  type IngredientPriceStats,
} from '@/lib/finance/grocery-price-actions'

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

type PriceAlert = {
  ingredient: string
  changePercent: number
  currentCents: number
  previousCents: number
}

export function GroceryPriceWidget() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [monthSpendCents, setMonthSpendCents] = useState<number | null>(null)
  const [avgChangePercent, setAvgChangePercent] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(() => {
    startTransition(async () => {
      try {
        // Get all entries from last 60 days for analysis
        const freqResult = await getFrequentIngredients()
        if (!freqResult.success || !freqResult.ingredients) {
          setError('Could not load grocery data')
          return
        }

        // Calculate this month's spending
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split('T')[0]
        const histResult = await getPriceHistory()
        if (histResult.success && histResult.entries) {
          const monthEntries = histResult.entries.filter(
            (e) => e.receipt_date >= monthStart
          )
          const totalSpend = monthEntries.reduce(
            (sum, e) => sum + e.price_cents * (e.quantity || 1),
            0
          )
          setMonthSpendCents(Math.round(totalSpend))
        }

        // Check each frequent ingredient for >15% increase
        const priceAlerts: PriceAlert[] = []
        const changes: number[] = []

        for (const ing of freqResult.ingredients.slice(0, 15)) {
          const statsResult = await getIngredientPriceStats(ing.name)
          if (!statsResult.success || !statsResult.stats) continue

          const s = statsResult.stats
          // Only alert if we have enough data and trend is up
          if (s.entry_count >= 3 && s.trend === 'up') {
            // Calculate actual percentage change from avg to latest
            const change = ((s.latest_cents - s.avg_cents) / s.avg_cents) * 100
            if (change > 15) {
              priceAlerts.push({
                ingredient: s.ingredient_name,
                changePercent: Math.round(change),
                currentCents: s.latest_cents,
                previousCents: s.avg_cents,
              })
            }
            changes.push(change)
          } else if (s.entry_count >= 3) {
            const change = ((s.latest_cents - s.avg_cents) / s.avg_cents) * 100
            changes.push(change)
          }
        }

        setAlerts(priceAlerts.sort((a, b) => b.changePercent - a.changePercent))
        if (changes.length > 0) {
          const avg = changes.reduce((a, b) => a + b, 0) / changes.length
          setAvgChangePercent(Math.round(avg))
        }
        setError(null)
      } catch (err) {
        setError('Could not load grocery data')
        console.error('[grocery-price-widget] load failed:', err)
      }
    })
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (error) {
    return (
      <div className="rounded-lg border p-4">
        <h3 className="mb-2 text-sm font-semibold">Grocery Prices</h3>
        <p className="text-xs text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold">Grocery Prices</h3>

      {/* Quick stats */}
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500">This month</p>
          <p className="text-lg font-semibold">
            {monthSpendCents !== null ? formatCents(monthSpendCents) : '-'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Avg price change</p>
          <p className="text-lg font-semibold">
            {avgChangePercent !== null ? (
              <span
                className={
                  avgChangePercent > 0
                    ? 'text-red-500'
                    : avgChangePercent < 0
                    ? 'text-green-500'
                    : ''
                }
              >
                {avgChangePercent > 0 ? '+' : ''}
                {avgChangePercent}%
              </span>
            ) : (
              '-'
            )}
          </p>
        </div>
      </div>

      {/* Price alerts */}
      {alerts.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-red-600">
            Price alerts (&gt;15% increase)
          </p>
          <ul className="space-y-1">
            {alerts.slice(0, 5).map((a) => (
              <li
                key={a.ingredient}
                className="flex items-center justify-between text-xs"
              >
                <span className="capitalize">{a.ingredient}</span>
                <span className="font-medium text-red-500">
                  +{a.changePercent}% ({formatCents(a.currentCents)})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {alerts.length === 0 && !isPending && monthSpendCents !== null && (
        <p className="text-xs text-gray-400">No significant price increases detected.</p>
      )}

      {isPending && (
        <p className="text-xs text-gray-400">Loading...</p>
      )}
    </div>
  )
}
