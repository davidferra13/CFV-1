'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, ChevronRight, Check, X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  confirmMatchAction,
  dismissMatchAction,
  type UnmatchedIngredient,
  type MatchSuggestion,
} from '@/lib/pricing/ingredient-matching-actions'

interface IngredientMatchReviewProps {
  initialUnmatched: UnmatchedIngredient[]
}

export function IngredientMatchReview({ initialUnmatched }: IngredientMatchReviewProps) {
  const [unmatched, setUnmatched] = useState(initialUnmatched)
  const [expanded, setExpanded] = useState(initialUnmatched.length < 5)
  const [page, setPage] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [batchSelections, setBatchSelections] = useState<Record<string, boolean>>({})

  const PAGE_SIZE = 20
  const totalPages = Math.ceil(unmatched.length / PAGE_SIZE)
  const pageItems = unmatched.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  if (unmatched.length === 0) return null

  // Find high-confidence matches for batch confirm
  const highConfidenceItems = unmatched.filter(
    (item) => item.suggestions.length > 0 && item.suggestions[0].score > 0.8
  )

  function handleConfirm(ingredientId: string, suggestion: MatchSuggestion) {
    startTransition(async () => {
      try {
        const res = await confirmMatchAction(ingredientId, suggestion.systemIngredientId)
        if (res.success) {
          setUnmatched((prev) => prev.filter((item) => item.id !== ingredientId))
        }
      } catch {
        // Let user try again
      }
    })
  }

  function handleDismiss(ingredientId: string) {
    startTransition(async () => {
      try {
        const res = await dismissMatchAction(ingredientId)
        if (res.success) {
          setUnmatched((prev) => prev.filter((item) => item.id !== ingredientId))
        }
      } catch {
        // Let user try again
      }
    })
  }

  function handleBatchConfirm() {
    startTransition(async () => {
      const toConfirm = highConfidenceItems.filter(
        (item) => batchSelections[item.id] !== false // default is checked
      )
      const confirmed: string[] = []
      for (const item of toConfirm) {
        try {
          const res = await confirmMatchAction(item.id, item.suggestions[0].systemIngredientId)
          if (res.success) confirmed.push(item.id)
        } catch {
          // Skip failures
        }
      }
      setUnmatched((prev) => prev.filter((item) => !confirmed.includes(item.id)))
      setShowBatchModal(false)
    })
  }

  function openBatchModal() {
    // Initialize all as checked
    const selections: Record<string, boolean> = {}
    for (const item of highConfidenceItems) {
      selections[item.id] = true
    }
    setBatchSelections(selections)
    setShowBatchModal(true)
  }

  return (
    <div className="border border-stone-700 rounded-lg bg-stone-900/50">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-800/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-stone-200">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          Unmatched Ingredients ({unmatched.length})
        </div>
        {highConfidenceItems.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              openBatchModal()
            }}
            className="text-xs text-brand-400 hover:text-brand-300"
          >
            <Zap className="w-3 h-3 mr-1" />
            Match All High-Confidence ({highConfidenceItems.length})
          </Button>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {pageItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 py-2 border-t border-stone-800 first:border-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-200 truncate">{item.name}</p>
                {item.category && (
                  <p className="text-xs text-stone-500 capitalize">{item.category}</p>
                )}
              </div>
              <div className="flex-shrink-0 flex items-center gap-1.5">
                {item.suggestions.length > 0 ? (
                  item.suggestions.slice(0, 3).map((s) => (
                    <button
                      key={s.systemIngredientId}
                      onClick={() => handleConfirm(item.id, s)}
                      disabled={isPending}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-stone-700 hover:border-emerald-600 hover:bg-emerald-900/30 text-stone-300 hover:text-emerald-400 transition-colors disabled:opacity-50"
                      title={`Similarity: ${(s.score * 100).toFixed(0)}%`}
                    >
                      <Check className="w-3 h-3" />
                      {s.name}
                    </button>
                  ))
                ) : (
                  <span className="text-xs text-stone-500">No match found</span>
                )}
                <button
                  onClick={() => handleDismiss(item.id)}
                  disabled={isPending}
                  className="text-xs text-stone-500 hover:text-stone-300 px-1.5 py-1"
                  title="None of these"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-stone-800">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <span className="text-xs text-stone-500">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Batch Confirmation Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-stone-900 border border-stone-700 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="px-4 py-3 border-b border-stone-700">
              <h3 className="text-sm font-medium text-stone-200">
                Confirm High-Confidence Matches ({highConfidenceItems.length})
              </h3>
              <p className="text-xs text-stone-400 mt-1">
                Uncheck any matches that look incorrect before confirming.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5">
              {highConfidenceItems.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-stone-800/50 rounded px-2"
                >
                  <input
                    type="checkbox"
                    checked={batchSelections[item.id] !== false}
                    onChange={(e) =>
                      setBatchSelections((prev) => ({ ...prev, [item.id]: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-stone-600 bg-stone-800 text-brand-500"
                  />
                  <span className="text-sm text-stone-300 flex-1 truncate">{item.name}</span>
                  <span className="text-xs text-stone-500">→</span>
                  <span className="text-sm text-emerald-400 flex-1 truncate">
                    {item.suggestions[0]?.name}
                  </span>
                  <span className="text-xs text-stone-500">
                    {(item.suggestions[0]?.score * 100).toFixed(0)}%
                  </span>
                </label>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-stone-700 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowBatchModal(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleBatchConfirm} disabled={isPending}>
                {isPending ? 'Confirming...' : 'Confirm Selected'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
