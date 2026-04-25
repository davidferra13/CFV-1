'use client'

import { useState, useEffect, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getRecipeAdjustmentSuggestions } from '@/lib/scaling/purchase-feedback'
import type {
  PurchaseFeedbackResult,
  QuantityAdjustmentSuggestion,
} from '@/lib/scaling/purchase-feedback'

const CONFIDENCE_COLORS: Record<string, 'default' | 'warning' | 'success'> = {
  low: 'default',
  medium: 'warning',
  high: 'success',
}

export function PurchaseFeedbackPanel({ recipeId }: { recipeId: string }) {
  const [result, setResult] = useState<PurchaseFeedbackResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getRecipeAdjustmentSuggestions(recipeId)
      .then((data) => {
        if (!cancelled) setResult(data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [recipeId])

  // Self-hide: no data, loading, or no suggestions
  if (loading || !result || result.suggestions.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Purchase History Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-stone-400">
          Based on {result.eventCount} completed events. You consistently purchase more of these
          ingredients than the recipe specifies.
        </p>
        {result.suggestions.map((s) => (
          <div
            key={s.ingredientId}
            className="flex items-center justify-between gap-2 rounded border border-stone-800 bg-stone-900/50 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium text-stone-200">{s.ingredientName}</span>
              <div className="text-xs text-stone-400">
                Recipe: {s.recipeQty} {s.unit} | Avg purchased: {s.avgPurchasedQty} {s.unit}
              </div>
              <div className="text-xs text-stone-500">
                {Math.round((s.overBuyRatio - 1) * 100)}% over-buy across {s.eventCount} events
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400">
                Suggested:{' '}
                <span className="text-stone-200 font-medium">
                  {s.suggestedQty} {s.unit}
                </span>
              </span>
              <Badge variant={CONFIDENCE_COLORS[s.confidence] || 'default'}>{s.confidence}</Badge>
            </div>
          </div>
        ))}
        <p className="text-xs text-stone-500 italic">
          Read-only analysis. Adjust recipe quantities manually if these suggestions make sense for
          your workflow.
        </p>
      </CardContent>
    </Card>
  )
}
