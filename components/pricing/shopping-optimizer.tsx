'use client'

/**
 * ShoppingOptimizer - Shows cheapest store options for a set of ingredients.
 * Calls the Pi's /api/optimize/shopping-list endpoint.
 * Displays both single-store (convenience) and multi-store (cheapest) options.
 */

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import {
  getShoppingOptimization,
  type ShoppingOptResult,
} from '@/lib/openclaw/price-intelligence-actions'

interface Props {
  ingredientNames: string[]
}

export function ShoppingOptimizer({ ingredientNames }: Props) {
  const [result, setResult] = useState<ShoppingOptResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [expanded, setExpanded] = useState(false)

  if (ingredientNames.length === 0) return null

  const handleOptimize = () => {
    setError(null)
    startTransition(async () => {
      try {
        const data = await getShoppingOptimization(ingredientNames)
        setResult(data)
        setExpanded(true)
      } catch {
        setError('Could not reach live price optimization right now.')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Shopping Optimizer</CardTitle>
          <Button variant="secondary" size="sm" onClick={handleOptimize} disabled={isPending}>
            {isPending ? 'Calculating...' : result ? 'Recalculate' : 'Find Cheapest Stores'}
          </Button>
        </div>
      </CardHeader>

      {error && (
        <CardContent>
          <p className="text-sm text-amber-400">{error}</p>
        </CardContent>
      )}

      {result && expanded && (
        <CardContent className="space-y-4">
          {/* Single store option */}
          {result.singleStore && (
            <div className="p-3 rounded-lg border border-stone-700 bg-stone-900/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-200">Best Single Store</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    One trip, {result.singleStore.itemCount} items
                    {result.singleStore.missingCount > 0 &&
                      ` (${result.singleStore.missingCount} not available)`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-stone-100">
                    {formatCurrency(result.singleStore.totalCents)}
                  </p>
                  <p className="text-xs text-stone-400">{result.singleStore.store}</p>
                </div>
              </div>
            </div>
          )}

          {/* Multi store option */}
          {result.multiStore && result.multiStore.stores.length > 0 && (
            <div className="p-3 rounded-lg border border-emerald-800/50 bg-emerald-950/20">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-emerald-300">Multi-Store Optimal</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {result.multiStore.stores.length} stores
                    {result.multiStore.savings > 0 &&
                      `, saves ${formatCurrency(result.multiStore.savings)}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-emerald-400">
                    {formatCurrency(result.multiStore.totalCents)}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5 mt-3">
                {result.multiStore.stores.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-stone-300 font-medium">{s.store}</span>
                      <span className="text-stone-500 truncate">{s.items.join(', ')}</span>
                    </div>
                    <span className="text-stone-400 shrink-0 ml-2">
                      {formatCurrency(s.subtotalCents)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!result.singleStore && !result.multiStore && (
            <p className="text-sm text-stone-500 text-center py-2">
              No price data found for these ingredients yet
            </p>
          )}
        </CardContent>
      )}
    </Card>
  )
}
