'use client'

// Expense Line Items Panel
// Shows line items for an expense with ingredient matching.
// Chef can review auto-matched ingredients, manually match unmatched items,
// and apply prices to update the ingredient master list.

import { useState, useTransition, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { ExpenseLineItem, IngredientMatch } from '@/lib/finance/expense-line-item-actions'
import {
  getExpenseLineItems,
  suggestIngredientMatches,
  matchLineItemToIngredient,
  applyLineItemPrices,
} from '@/lib/finance/expense-line-item-actions'

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function MatchBadge({ matchedBy, confidence }: { matchedBy: string; confidence: number | null }) {
  if (!confidence) return <span className="text-xs text-stone-500">Unmatched</span>
  const label = matchedBy === 'manual' ? 'Manual' : matchedBy === 'receipt_ocr' ? 'Auto' : 'AI'
  const cls =
    confidence >= 0.8
      ? 'bg-green-900/50 text-green-400'
      : confidence >= 0.6
        ? 'bg-amber-900/50 text-amber-400'
        : 'bg-stone-800 text-stone-400'
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${cls}`}>
      {label} ({Math.round(confidence * 100)}%)
    </span>
  )
}

function IngredientSelector({
  lineItemId,
  description,
  currentIngredientId,
  onMatch,
}: {
  lineItemId: string
  description: string
  currentIngredientId: string | null
  onMatch: (lineItemId: string, ingredientId: string | null, ingredientName: string | null) => void
}) {
  const [suggestions, setSuggestions] = useState<IngredientMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const loadSuggestions = async () => {
    if (suggestions.length > 0) {
      setOpen(!open)
      return
    }
    setLoading(true)
    try {
      const matches = await suggestIngredientMatches(description, 8)
      setSuggestions(matches)
      setOpen(true)
    } catch {
      toast.error('Failed to load ingredient suggestions')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (match: IngredientMatch | null) => {
    startTransition(async () => {
      try {
        await matchLineItemToIngredient({
          lineItemId,
          ingredientId: match?.ingredientId ?? null,
        })
        onMatch(lineItemId, match?.ingredientId ?? null, match?.ingredientName ?? null)
        setOpen(false)
        toast.success(match ? `Matched to ${match.ingredientName}` : 'Unmatched')
      } catch {
        toast.error('Failed to update match')
      }
    })
  }

  return (
    <div className="relative">
      <button
        onClick={loadSuggestions}
        disabled={loading || pending}
        className="text-xs text-brand-400 hover:text-brand-300 underline underline-offset-2"
      >
        {loading ? 'Loading...' : currentIngredientId ? 'Change' : 'Match'}
      </button>

      {open && (
        <div className="absolute right-0 top-6 z-20 w-72 bg-stone-900 border border-stone-700 rounded-lg shadow-xl p-2 space-y-1">
          <p className="text-xs text-stone-500 px-2 pb-1 border-b border-stone-800">
            Match to ingredient
          </p>
          {suggestions.length === 0 && (
            <p className="text-xs text-stone-400 px-2 py-2">No ingredients found</p>
          )}
          {suggestions.map((match) => (
            <button
              key={match.ingredientId}
              onClick={() => handleSelect(match)}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-stone-800 flex items-center justify-between"
            >
              <span className="text-sm text-stone-200 truncate">{match.ingredientName}</span>
              <span className="text-xs text-stone-500 shrink-0 ml-2">
                {Math.round(match.confidence * 100)}%
              </span>
            </button>
          ))}
          {currentIngredientId && (
            <button
              onClick={() => handleSelect(null)}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-red-900/30 text-xs text-red-400"
            >
              Remove match
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="w-full text-center py-1 text-xs text-stone-500 hover:text-stone-300"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

type Props = {
  expenseId: string
  eventId?: string | null
}

export function ExpenseLineItemsPanel({ expenseId, eventId }: Props) {
  const [lineItems, setLineItems] = useState<ExpenseLineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, startApplyTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    getExpenseLineItems(expenseId).then((items) => {
      if (!cancelled) {
        setLineItems(items)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [expenseId])

  const handleMatch = (
    lineItemId: string,
    ingredientId: string | null,
    ingredientName: string | null
  ) => {
    setLineItems((prev) =>
      prev.map((li) =>
        li.id === lineItemId
          ? {
              ...li,
              ingredientId,
              ingredientName,
              matchedBy: 'manual',
              matchConfidence: ingredientId ? 1.0 : null,
            }
          : li
      )
    )
  }

  const handleApplyPrices = () => {
    startApplyTransition(async () => {
      try {
        const result = await applyLineItemPrices(expenseId)
        if (result.success) {
          toast.success(
            `Updated ${result.updated} ingredient price${result.updated !== 1 ? 's' : ''}`
          )
          // Refresh line items to show price_applied status
          const updated = await getExpenseLineItems(expenseId)
          setLineItems(updated)
        } else {
          toast.error(result.error || 'Failed to apply prices')
        }
      } catch {
        toast.error('Failed to apply prices')
      }
    })
  }

  if (loading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-stone-800 rounded w-1/3" />
          <div className="h-3 bg-stone-800 rounded w-full" />
          <div className="h-3 bg-stone-800 rounded w-full" />
        </div>
      </Card>
    )
  }

  if (lineItems.length === 0) return null

  const matchedCount = lineItems.filter((li) => li.ingredientId).length
  const unappliedCount = lineItems.filter((li) => li.ingredientId && !li.priceApplied).length

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="text-sm font-semibold text-stone-200">Line Items</h3>
          <p className="text-xs text-stone-500">
            {matchedCount}/{lineItems.length} matched to ingredients
          </p>
        </div>
        {unappliedCount > 0 && (
          <Button size="sm" variant="secondary" onClick={handleApplyPrices} disabled={applying}>
            {applying
              ? 'Applying...'
              : `Update ${unappliedCount} price${unappliedCount !== 1 ? 's' : ''}`}
          </Button>
        )}
      </div>

      <div className="divide-y divide-stone-800">
        {lineItems.map((li) => (
          <div key={li.id} className="py-2 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-stone-200 truncate">{li.description}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {li.ingredientName && (
                  <span className="text-xs text-stone-400">→ {li.ingredientName}</span>
                )}
                <MatchBadge matchedBy={li.matchedBy} confidence={li.matchConfidence} />
                {li.priceApplied && <span className="text-xs text-green-600">Price applied</span>}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-medium text-stone-100">
                {formatCents(li.amountCents)}
              </span>
              <IngredientSelector
                lineItemId={li.id}
                description={li.description}
                currentIngredientId={li.ingredientId}
                onMatch={handleMatch}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
