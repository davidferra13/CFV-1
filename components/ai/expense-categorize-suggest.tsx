'use client'

// Inline expense categorization suggestion.
// Called when chef types a description in the expense form.
// Returns a badge with the suggested category — chef clicks to accept.

import { useState, useEffect, useRef } from 'react'
import { Sparkles, Loader2 } from '@/components/ui/icons'
import { categorizeExpense, type CategorizationResult } from '@/lib/ai/expense-categorizer'
import {
  EXPENSE_CATEGORY_LABELS,
  type ExpenseCategory,
} from '@/lib/ai/expense-categorizer-constants'

interface Props {
  description: string
  amountCents: number
  onAccept: (category: ExpenseCategory) => void
}

export function ExpenseCategorizeSuggest({ description, amountCents, onAccept }: Props) {
  const [result, setResult] = useState<CategorizationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (description.length < 4) {
      setResult(null)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await categorizeExpense(description, amountCents)
        setResult(data)
      } catch {
        setResult(null)
      } finally {
        setLoading(false)
      }
    }, 800)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [description, amountCents])

  if (loading) {
    return (
      <div className="flex items-center gap-1 text-[11px] text-stone-400">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Auto-categorizing...</span>
      </div>
    )
  }

  if (!result) return null

  const label = EXPENSE_CATEGORY_LABELS[result.category]
  const confidenceColor =
    result.confidence === 'high'
      ? 'text-green-700 bg-green-950 border-green-200'
      : result.confidence === 'medium'
        ? 'text-amber-700 bg-amber-950 border-amber-200'
        : 'text-stone-500 bg-stone-800 border-stone-700'

  return (
    <div className="flex items-center gap-2">
      <Sparkles className="w-3 h-3 text-brand-500" />
      <span className="text-[11px] text-stone-500">Suggested:</span>
      <button
        onClick={() => onAccept(result.category)}
        className={`text-[11px] px-2 py-0.5 rounded border font-medium ${confidenceColor} hover:opacity-80 transition-opacity`}
        title={result.reasoning}
      >
        {label}
      </button>
      {result.alternativeCategory && (
        <button
          onClick={() => onAccept(result.alternativeCategory!)}
          className="text-[11px] text-stone-400 hover:text-stone-400"
          title="Alternative suggestion"
        >
          or {EXPENSE_CATEGORY_LABELS[result.alternativeCategory]}
        </button>
      )}
    </div>
  )
}
