'use client'

/**
 * StoreScorecard - Shows which stores are cheapest for the chef's specific ingredients.
 * Not generic rankings; personalized to what the chef actually uses.
 */

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import {
  getStoreScorecard,
  type StoreScorecard as StoreScore,
} from '@/lib/openclaw/price-intelligence-actions'

interface Props {
  ingredientNames: string[]
}

export function StoreScorecard({ ingredientNames }: Props) {
  const [stores, setStores] = useState<StoreScore[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (ingredientNames.length === 0) return null

  const handleAnalyze = () => {
    setError(null)
    startTransition(async () => {
      try {
        const data = await getStoreScorecard(ingredientNames)
        setStores(data)
      } catch {
        setError('Could not reach price database')
      }
    })
  }

  // Find max coverage for bar scaling
  const maxCoverage = stores ? Math.max(...stores.map((s) => s.coveragePct), 1) : 100

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Store Scorecard</CardTitle>
            <p className="text-xs text-stone-500 mt-0.5">
              Which stores are cheapest for your {ingredientNames.length} ingredients
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleAnalyze} disabled={isPending}>
            {isPending ? 'Analyzing...' : stores ? 'Refresh' : 'Analyze Stores'}
          </Button>
        </div>
      </CardHeader>

      {error && (
        <CardContent>
          <p className="text-sm text-amber-400">{error}</p>
        </CardContent>
      )}

      {stores && stores.length > 0 && (
        <CardContent>
          <div className="space-y-2">
            {stores.slice(0, 8).map((s, i) => (
              <div key={s.store} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-5 text-center text-xs font-bold ${
                        i === 0
                          ? 'text-emerald-400'
                          : i === 1
                            ? 'text-stone-300'
                            : i === 2
                              ? 'text-amber-500'
                              : 'text-stone-500'
                      }`}
                    >
                      #{i + 1}
                    </span>
                    <span className="text-stone-200 font-medium">{s.store}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-stone-500">
                      {s.itemCount} items ({s.coveragePct}%)
                    </span>
                    <span className="text-emerald-400 font-medium">{s.wins} cheapest</span>
                    <span className="text-stone-300 font-medium w-16 text-right">
                      avg {formatCurrency(s.avgCents)}
                    </span>
                  </div>
                </div>
                {/* Coverage bar */}
                <div className="ml-7 h-1 bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${i === 0 ? 'bg-emerald-500' : 'bg-stone-600'}`}
                    style={{ width: `${(s.coveragePct / maxCoverage) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {stores.length === 0 && (
            <p className="text-sm text-stone-500 text-center py-2">
              No price data found for your ingredients
            </p>
          )}
        </CardContent>
      )}
    </Card>
  )
}
