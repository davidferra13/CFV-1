'use client'

// MenuCostTicker - Live running cost display for the menu editor.
// Debounces recipe ID changes (500ms), fetches cost summaries via server action,
// shows running total, per-head cost, and confidence badge.
// Designed to sit in the editor sidebar as a compact, always-visible widget.

import { useEffect, useRef, useState, useCallback } from 'react'
import { lookupRecipeCosts, type LiveCostResult } from '@/lib/costing/live-cost-lookup'
import {
  CONFIDENCE_COLORS,
  CONFIDENCE_LABELS,
  type CostConfidenceLevel,
} from '@/lib/costing/recipe-cost-provenance'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  /** All recipe IDs currently linked to dishes in this menu */
  recipeIds: string[]
  /** Guest count for per-head calculation (null if unknown) */
  guestCount: number | null
  /** Bumped externally whenever recipes are linked/unlinked to force a refresh */
  refreshKey?: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MenuCostTicker({ recipeIds, guestCount, refreshKey }: Props) {
  const [result, setResult] = useState<LiveCostResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Stable serialized key for recipe IDs to detect actual changes
  const idsKey = recipeIds.slice().sort().join(',')

  const fetchCosts = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setResult(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(false)
    try {
      const data = await lookupRecipeCosts(ids)
      setResult(data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounced fetch on recipe ID changes or refreshKey
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      fetchCosts(recipeIds)
    }, 500)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [idsKey, refreshKey, fetchCosts, recipeIds])

  // No recipes linked at all
  if (!recipeIds.length && !loading) {
    return (
      <div className="bg-stone-900 rounded-xl border border-stone-700 p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Live Cost</p>
        <p className="text-xs text-stone-500">Link recipes to dishes to see live cost tracking</p>
      </div>
    )
  }

  return (
    <div className="bg-stone-900 rounded-xl border border-stone-700 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Live Cost</p>
        {loading && (
          <div className="h-3 w-3 rounded-full border border-stone-600 border-t-brand-500 animate-spin" />
        )}
      </div>

      {/* Skeleton while loading initial data */}
      {loading && !result && (
        <div className="space-y-2 animate-pulse">
          <div className="h-6 w-24 bg-stone-800 rounded" />
          <div className="h-4 w-32 bg-stone-800 rounded" />
          <div className="h-4 w-20 bg-stone-800 rounded" />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <p className="text-xs text-red-400">Failed to load costs. Will retry on next change.</p>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-3">
          {/* Total cost */}
          <div>
            {result.totalCostCents != null ? (
              <p className="text-xl font-bold text-stone-100 tabular-nums">
                ${(result.totalCostCents / 100).toFixed(2)}
              </p>
            ) : (
              <p className="text-sm text-stone-500">No cost data yet</p>
            )}
          </div>

          {/* Per head */}
          {result.totalCostCents != null && guestCount && guestCount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-stone-400">Per guest</span>
              <span className="font-semibold text-stone-100 tabular-nums">
                ${(result.totalCostCents / 100 / guestCount).toFixed(2)}
              </span>
            </div>
          )}

          {/* Coverage */}
          <div className="flex justify-between text-xs text-stone-400">
            <span>
              {result.recipes.length} recipe{result.recipes.length !== 1 ? 's' : ''} tracked
            </span>
            <span>
              {result.totalIngredients} ingredient{result.totalIngredients !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Confidence badge */}
          <ConfidenceBadge level={result.overallConfidence} score={result.overallConfidenceScore} />

          {/* Per-recipe breakdown (compact) */}
          {result.recipes.length > 0 && (
            <div className="pt-2 border-t border-stone-800 space-y-1">
              {result.recipes.map((r) => (
                <div key={r.recipeId} className="flex items-center justify-between text-xs">
                  <span className="text-stone-400 truncate max-w-[140px]" title={r.recipeName}>
                    {r.recipeName}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.totalCostCents != null ? (
                      <span className="text-stone-300 tabular-nums">
                        ${(r.totalCostCents / 100).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-stone-600">--</span>
                    )}
                    <ConfidenceDot level={r.confidenceLevel} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ConfidenceBadge({ level, score }: { level: CostConfidenceLevel; score: number }) {
  const colors = CONFIDENCE_COLORS[level]
  const label = CONFIDENCE_LABELS[level]

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${colors.bg} ${colors.border} ${colors.text}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          level === 'high'
            ? 'bg-emerald-400'
            : level === 'moderate'
              ? 'bg-amber-400'
              : level === 'low'
                ? 'bg-red-400'
                : 'bg-stone-500'
        }`}
      />
      {label}
      {level !== 'insufficient' && <span className="opacity-60">{score}%</span>}
    </div>
  )
}

function ConfidenceDot({ level }: { level: CostConfidenceLevel }) {
  const dotColor =
    level === 'high'
      ? 'bg-emerald-400'
      : level === 'moderate'
        ? 'bg-amber-400'
        : level === 'low'
          ? 'bg-red-400'
          : 'bg-stone-500'

  return (
    <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} title={CONFIDENCE_LABELS[level]} />
  )
}
