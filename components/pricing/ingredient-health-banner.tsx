'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, ChevronDown, ChevronRight, Zap } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { confirmMatchAction, dismissMatchAction } from '@/lib/pricing/ingredient-matching-actions'
import {
  batchConfirmPendingAction,
  type IngredientHealthSummary,
  type PendingMatch,
  type UnresolvedIngredient,
} from '@/lib/pricing/ingredient-health-actions'

interface Props {
  health: IngredientHealthSummary
}

export function IngredientHealthBanner({ health }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingMatches, setPendingMatches] = useState(health.pendingMatches)
  const [unresolved, setUnresolved] = useState(health.unresolvedIngredients)
  const [stats, setStats] = useState(health.stats)
  const [expandedSection, setExpandedSection] = useState<'pending' | 'unmatched' | null>(
    // Auto-expand the most actionable section
    health.pendingMatches.length > 0
      ? 'pending'
      : health.unresolvedIngredients.length > 0
        ? 'unmatched'
        : null
  )

  const needsAttention = stats.pending + stats.unmatched
  const isFullyResolved = needsAttention === 0

  // Confirm a pending auto-match
  function handleConfirmPending(match: PendingMatch) {
    startTransition(async () => {
      try {
        const res = await confirmMatchAction(match.ingredientId, match.systemIngredientId)
        if (res.success) {
          setPendingMatches((prev) => prev.filter((m) => m.ingredientId !== match.ingredientId))
          setStats((prev) => ({
            ...prev,
            pending: prev.pending - 1,
            confirmed: prev.confirmed + 1,
            coveragePct:
              prev.total > 0
                ? Math.round(((prev.confirmed + 1 + prev.dismissed) / prev.total) * 100)
                : null,
          }))
        }
      } catch {
        // Let user try again
      }
    })
  }

  // Dismiss a pending auto-match
  function handleDismissPending(match: PendingMatch) {
    startTransition(async () => {
      try {
        const res = await dismissMatchAction(match.ingredientId)
        if (res.success) {
          setPendingMatches((prev) => prev.filter((m) => m.ingredientId !== match.ingredientId))
          setStats((prev) => ({
            ...prev,
            pending: prev.pending - 1,
            dismissed: prev.dismissed + 1,
            coveragePct:
              prev.total > 0
                ? Math.round(((prev.confirmed + prev.dismissed + 1) / prev.total) * 100)
                : null,
          }))
        }
      } catch {
        // Let user try again
      }
    })
  }

  // Confirm an unmatched ingredient's suggestion
  function handleConfirmUnmatched(ingredient: UnresolvedIngredient, systemIngredientId: string) {
    startTransition(async () => {
      try {
        const res = await confirmMatchAction(ingredient.id, systemIngredientId)
        if (res.success) {
          setUnresolved((prev) => prev.filter((u) => u.id !== ingredient.id))
          setStats((prev) => ({
            ...prev,
            unmatched: prev.unmatched - 1,
            confirmed: prev.confirmed + 1,
            coveragePct:
              prev.total > 0
                ? Math.round(((prev.confirmed + 1 + prev.dismissed) / prev.total) * 100)
                : null,
          }))
        }
      } catch {
        // Let user try again
      }
    })
  }

  // Dismiss an unmatched ingredient
  function handleDismissUnmatched(ingredientId: string) {
    startTransition(async () => {
      try {
        const res = await dismissMatchAction(ingredientId)
        if (res.success) {
          setUnresolved((prev) => prev.filter((u) => u.id !== ingredientId))
          setStats((prev) => ({
            ...prev,
            unmatched: prev.unmatched - 1,
            dismissed: prev.dismissed + 1,
            coveragePct:
              prev.total > 0
                ? Math.round(((prev.confirmed + prev.dismissed + 1) / prev.total) * 100)
                : null,
          }))
        }
      } catch {
        // Let user try again
      }
    })
  }

  // Batch confirm all pending matches
  function handleBatchConfirmAll() {
    const ids = pendingMatches.map((m) => m.ingredientId)
    startTransition(async () => {
      try {
        const res = await batchConfirmPendingAction(ids)
        if (res.confirmed > 0) {
          setPendingMatches([])
          setStats((prev) => ({
            ...prev,
            pending: 0,
            confirmed: prev.confirmed + res.confirmed,
            coveragePct:
              prev.total > 0
                ? Math.round(((prev.confirmed + res.confirmed + prev.dismissed) / prev.total) * 100)
                : null,
          }))
          router.refresh()
        }
      } catch {
        // Let user try again
      }
    })
  }

  if (stats.total === 0) return null

  // Coverage bar color
  const coveragePct = stats.coveragePct ?? 0
  const barColor =
    coveragePct >= 90 ? 'bg-emerald-500' : coveragePct >= 60 ? 'bg-amber-500' : 'bg-red-500'

  const statusColor =
    coveragePct >= 90 ? 'text-emerald-400' : coveragePct >= 60 ? 'text-amber-400' : 'text-red-400'

  return (
    <Card className="p-0 overflow-hidden">
      {/* Summary Bar */}
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Coverage percentage */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className={`text-2xl font-bold ${statusColor}`}>{coveragePct}%</span>
            <div className="text-sm">
              <p className="text-stone-200 font-medium">Ingredient Coverage</p>
              <p className="text-stone-500 text-xs">
                {stats.confirmed} verified ·{' '}
                {stats.pending > 0 ? `${stats.pending} pending · ` : ''}
                {stats.unmatched > 0 ? `${stats.unmatched} unmatched` : ''}
                {stats.dismissed > 0 ? ` · ${stats.dismissed} skipped` : ''}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex-1 min-w-[100px] max-w-[200px]">
            <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${barColor} rounded-full transition-all duration-500`}
                style={{ width: `${coveragePct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {pendingMatches.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleBatchConfirmAll}
              disabled={isPending}
              className="text-xs text-brand-400 hover:text-brand-300"
            >
              <Zap className="w-3 h-3 mr-1" />
              Confirm All ({pendingMatches.length})
            </Button>
          )}
        </div>
      </div>

      {/* Expandable sections */}
      {needsAttention > 0 && (
        <div className="border-t border-stone-800">
          {/* Pending Auto-Matches */}
          {pendingMatches.length > 0 && (
            <div>
              <button
                onClick={() => setExpandedSection(expandedSection === 'pending' ? null : 'pending')}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-stone-800/50 transition-colors text-sm"
              >
                <div className="flex items-center gap-2">
                  {expandedSection === 'pending' ? (
                    <ChevronDown className="w-4 h-4 text-stone-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-stone-400" />
                  )}
                  <span className="text-amber-400 font-medium">
                    {pendingMatches.length} pending match{pendingMatches.length !== 1 ? 'es' : ''}
                  </span>
                  <span className="text-stone-500">- the system found these, but you decide</span>
                </div>
              </button>

              {expandedSection === 'pending' && (
                <div className="px-4 pb-3 space-y-1">
                  {pendingMatches.map((match) => (
                    <div
                      key={match.ingredientId}
                      className="flex items-center gap-3 py-2 px-3 rounded-md bg-stone-800/30 hover:bg-stone-800/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className="text-sm text-stone-300 truncate">
                          {match.ingredientName}
                        </span>
                        <span className="text-stone-600 text-xs flex-shrink-0">matches</span>
                        <span className="text-sm text-emerald-400 truncate">
                          {match.systemIngredientName}
                        </span>
                        <span className="text-xs text-stone-600 flex-shrink-0">
                          {Math.round(match.similarityScore * 100)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleConfirmPending(match)}
                          disabled={isPending}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-stone-700 hover:border-emerald-600 hover:bg-emerald-900/30 text-stone-300 hover:text-emerald-400 transition-colors disabled:opacity-50"
                          title="Confirm this match"
                        >
                          <Check className="w-3 h-3" />
                          Confirm
                        </button>
                        <button
                          onClick={() => handleDismissPending(match)}
                          disabled={isPending}
                          className="text-xs text-stone-500 hover:text-stone-300 px-1.5 py-1"
                          title="Not a match"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Completely Unmatched Ingredients */}
          {unresolved.length > 0 && (
            <div className={pendingMatches.length > 0 ? 'border-t border-stone-800' : ''}>
              <button
                onClick={() =>
                  setExpandedSection(expandedSection === 'unmatched' ? null : 'unmatched')
                }
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-stone-800/50 transition-colors text-sm"
              >
                <div className="flex items-center gap-2">
                  {expandedSection === 'unmatched' ? (
                    <ChevronDown className="w-4 h-4 text-stone-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-stone-400" />
                  )}
                  <span className="text-red-400 font-medium">
                    {unresolved.length} unmatched ingredient{unresolved.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-stone-500">- no automatic match found</span>
                </div>
              </button>

              {expandedSection === 'unmatched' && (
                <div className="px-4 pb-3 space-y-1">
                  {unresolved.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 py-2 px-3 rounded-md bg-stone-800/30"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-stone-300">{item.name}</p>
                        {item.category && (
                          <p className="text-xs text-stone-500 capitalize">{item.category}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                        {item.suggestions.length > 0 ? (
                          item.suggestions.slice(0, 3).map((s) => (
                            <button
                              key={s.systemIngredientId}
                              onClick={() => handleConfirmUnmatched(item, s.systemIngredientId)}
                              disabled={isPending}
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-stone-700 hover:border-emerald-600 hover:bg-emerald-900/30 text-stone-300 hover:text-emerald-400 transition-colors disabled:opacity-50"
                              title={`Similarity: ${Math.round(s.score * 100)}%`}
                            >
                              <Check className="w-3 h-3" />
                              {s.name}
                            </button>
                          ))
                        ) : (
                          <span className="text-xs text-stone-500">No suggestions</span>
                        )}
                        <button
                          onClick={() => handleDismissUnmatched(item.id)}
                          disabled={isPending}
                          className="text-xs text-stone-500 hover:text-stone-300 px-1.5 py-1"
                          title="Skip this ingredient"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* All resolved state */}
      {isFullyResolved && stats.total > 0 && (
        <div className="border-t border-stone-800 px-4 py-2">
          <p className="text-xs text-emerald-400">
            All {stats.total} ingredients have been reviewed and verified by you.
          </p>
        </div>
      )}
    </Card>
  )
}
