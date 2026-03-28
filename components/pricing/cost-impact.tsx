'use client'

/**
 * CostImpact - Shows which of the chef's ingredients had recent price changes.
 * Helps answer: "Why did my recipe cost change?"
 */

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import { getCostImpact, type CostImpactResult } from '@/lib/openclaw/price-intelligence-actions'

interface Props {
  ingredientNames: string[]
}

export function CostImpact({ ingredientNames }: Props) {
  const [result, setResult] = useState<CostImpactResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [days, setDays] = useState(7)

  if (ingredientNames.length === 0) return null

  const handleCheck = () => {
    setError(null)
    startTransition(async () => {
      try {
        const data = await getCostImpact(ingredientNames, days)
        setResult(data)
      } catch {
        setError('Could not reach price database')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Price Change Impact</CardTitle>
            <p className="text-xs text-stone-500 mt-0.5">
              Ingredients with significant price changes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="text-xs bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-300"
            >
              <option value={3}>Last 3 days</option>
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
            <Button variant="secondary" size="sm" onClick={handleCheck} disabled={isPending}>
              {isPending ? 'Checking...' : result ? 'Refresh' : 'Check Impact'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {error && (
        <CardContent>
          <p className="text-sm text-amber-400">{error}</p>
        </CardContent>
      )}

      {result && (
        <CardContent className="space-y-3">
          {result.impactCount === 0 ? (
            <p className="text-sm text-stone-500 text-center py-2">
              No significant price changes in the last {result.lookbackDays} days
            </p>
          ) : (
            <>
              {/* Summary */}
              <div className="flex items-center gap-4 text-xs">
                <span className="text-stone-400">
                  {result.impactCount} ingredient{result.impactCount !== 1 ? 's' : ''} changed
                </span>
                {result.totalIncreaseCents > 0 && (
                  <span className="text-red-400">
                    +{formatCurrency(result.totalIncreaseCents)} increases
                  </span>
                )}
                {result.totalDecreaseCents > 0 && (
                  <span className="text-emerald-400">
                    -{formatCurrency(result.totalDecreaseCents)} decreases
                  </span>
                )}
              </div>

              {/* Impact list */}
              <div className="space-y-1.5">
                {result.impacts.map((impact, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-xs font-bold ${
                          impact.direction === 'up' ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {impact.direction === 'up' ? '\u2191' : '\u2193'}
                      </span>
                      <span className="text-stone-200 truncate">{impact.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2 text-xs">
                      <span className="text-stone-500">
                        {formatCurrency(impact.oldCents)} {'\u2192'}{' '}
                        {formatCurrency(impact.newCents)}
                      </span>
                      <span
                        className={`font-medium ${
                          impact.direction === 'up' ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {impact.direction === 'up' ? '+' : ''}
                        {impact.changePct}%
                      </span>
                      <span className="text-stone-600">{impact.store}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}
