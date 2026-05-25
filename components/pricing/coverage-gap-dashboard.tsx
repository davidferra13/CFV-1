'use client'

import { useState, useEffect, useTransition } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import {
  getCoverageGapDashboard,
  type CoverageGapDashboard as DashboardData,
  type GapItem,
} from '@/lib/pricing/coverage-gap-actions'
import { freshnessColor, freshnessLabel, getAgeDays } from '@/lib/pricing/freshness'
import { PricePinModal } from './price-pin-modal'

function coverageColorClass(pct: number): string {
  if (pct >= 90) return 'text-emerald-400'
  if (pct >= 70) return 'text-amber-400'
  return 'text-red-400'
}

function coverageBgClass(pct: number): string {
  if (pct >= 90) return 'border-emerald-700/40 bg-emerald-900/20'
  if (pct >= 70) return 'border-amber-700/40 bg-amber-900/20'
  return 'border-red-700/40 bg-red-900/20'
}

export function CoverageGapDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, startTransition] = useTransition()
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [pinTarget, setPinTarget] = useState<GapItem | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    startTransition(async () => {
      try {
        const result = await getCoverageGapDashboard()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load coverage data')
      }
    })
  }, [])

  if (error) {
    return (
      <div className="rounded-lg border border-red-700/40 bg-red-900/20 p-4">
        <p className="text-sm text-red-400">Failed to load coverage data: {error}</p>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-800 p-6 animate-pulse">
        <div className="h-10 w-32 bg-stone-700 rounded mb-2" />
        <div className="h-4 w-48 bg-stone-700 rounded" />
      </div>
    )
  }

  if (data.total === 0) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-800 p-6">
        <p className="text-sm text-stone-400">No active ingredients found in your recipes.</p>
      </div>
    )
  }

  const gapCount = data.gaps.length

  return (
    <div className="space-y-4">
      <div className={`rounded-lg border p-6 ${coverageBgClass(data.coveragePct)}`}>
        <div className="flex items-baseline gap-3">
          <span className={`text-4xl font-bold ${coverageColorClass(data.coveragePct)}`}>
            {data.coveragePct}%
          </span>
          <span className="text-lg text-stone-300">coverage</span>
        </div>
        <p className="text-sm text-stone-400 mt-1">
          {data.covered} of {data.total} active ingredients priced
        </p>

        {gapCount > 0 && (
          <p className="text-sm text-amber-400 mt-2">
            {gapCount} ingredient{gapCount !== 1 ? 's' : ''} need attention
          </p>
        )}

        <button
          type="button"
          className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-300 mt-3"
          onClick={() => setShowBreakdown(!showBreakdown)}
        >
          {showBreakdown ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          Source breakdown
        </button>

        {showBreakdown && (
          <div className="mt-3 space-y-1.5">
            {Object.entries(data.bySource)
              .sort(([, a], [, b]) => b - a)
              .map(([source, count]) => (
                <div key={source} className="flex items-center gap-2">
                  <div
                    className="h-2 bg-emerald-500/60 rounded"
                    style={{ width: `${Math.max(8, (count / data.covered) * 100)}%` }}
                  />
                  <span className="text-xs text-stone-400 whitespace-nowrap">
                    {count} {source.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}

            <div className="pt-2 border-t border-stone-700 mt-2">
              <p className="text-xs text-stone-500">By freshness:</p>
              <div className="flex gap-4 mt-1">
                {(['fresh', 'aging', 'stale', 'expired'] as const).map((state) => (
                  <span key={state} className={`text-xs ${freshnessColor(state)}`}>
                    {data.byFreshness[state]} {state}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {gapCount > 0 && (
        <div className="rounded-lg border border-stone-700 bg-stone-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-700">
            <h3 className="text-sm font-medium text-stone-300">
              Ingredients needing prices ({gapCount})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700/50 text-stone-400 text-xs">
                  <th className="text-left px-4 py-2 font-medium">Ingredient</th>
                  <th className="text-left px-4 py-2 font-medium">Category</th>
                  <th className="text-right px-4 py-2 font-medium">Recipes</th>
                  <th className="text-right px-4 py-2 font-medium">Last Price</th>
                  <th className="text-left px-4 py-2 font-medium">Age</th>
                  <th className="text-right px-4 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.gaps.map((gap) => (
                  <tr
                    key={gap.ingredientId}
                    className="border-b border-stone-700/30 hover:bg-stone-700/20"
                  >
                    <td className="px-4 py-2 text-white">{gap.name}</td>
                    <td className="px-4 py-2 text-stone-400">{gap.category || 'Uncategorized'}</td>
                    <td className="px-4 py-2 text-right text-stone-300">{gap.recipeCount}</td>
                    <td className="px-4 py-2 text-right">
                      {gap.lastPrice ? (
                        <span
                          className={`${gap.freshnessState === 'expired' ? 'line-through text-red-400' : 'text-stone-300'}`}
                        >
                          ${(gap.lastPrice / 100).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-stone-500">None</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {gap.lastPriceAge !== null ? (
                        <span className={freshnessColor(gap.freshnessState)}>
                          {freshnessLabel(gap.freshnessState, gap.lastPriceAge)}
                        </span>
                      ) : (
                        <span className="text-stone-500">No data</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-blue-400 hover:text-blue-300 text-xs"
                        onClick={() => setPinTarget(gap)}
                      >
                        Pin a price
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pinTarget && (
        <PricePinModal
          ingredientId={pinTarget.ingredientId}
          ingredientName={pinTarget.name}
          onClose={() => setPinTarget(null)}
          onPinned={() => {
            setPinTarget(null)
            startTransition(async () => {
              try {
                const result = await getCoverageGapDashboard()
                setData(result)
              } catch {
                // Stale data is acceptable here
              }
            })
          }}
        />
      )}
    </div>
  )
}
