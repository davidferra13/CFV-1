# Purchase Feedback Panel - Build Spec

## Context

`lib/scaling/purchase-feedback.ts` contains a complete server action `getRecipeAdjustmentSuggestions(recipeId)` that analyzes purchase history across completed events. When a chef consistently buys 15%+ more of an ingredient than the recipe calls for (across 3+ events), it flags the recipe quantity as potentially understated.

**Problem:** The function is fully built and exported but nothing calls it. No UI exists.

## What to Build

A `PurchaseFeedbackPanel` client component rendered on the recipe detail page. Shows over-buy suggestions only when data exists (3+ completed events using this recipe with purchase data).

## Files to Create

### 1. `components/recipes/purchase-feedback-panel.tsx` (NEW - Client Component)

```tsx
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
```

### 2. Wire into `app/(chef)/recipes/[id]/recipe-detail-client.tsx` (EDIT)

Add import at the top (with the other component imports):

```tsx
import { PurchaseFeedbackPanel } from '@/components/recipes/purchase-feedback-panel'
```

Find a natural location in the JSX near the bottom of the detail view (after existing panels like `RecipeTrackRecordPanel`, `RecipeUsagePanel`, `NutritionPanel`). Add:

```tsx
<PurchaseFeedbackPanel recipeId={recipe.id} />
```

The component self-hides when no suggestions exist, so placement is safe anywhere.

## Constraints for Builder

- Do NOT modify `lib/scaling/purchase-feedback.ts`. It is complete and correct.
- Do NOT modify `types/database.ts`.
- Use ONLY existing UI components from `components/ui/`.
- The panel is READ-ONLY. No mutation buttons. No "apply suggestion" action. Just informational display.
- The panel self-hides when: loading, no data, or no suggestions. This means it renders nothing for recipes that lack purchase history, which is the common case. No loading spinner needed.
- Follow existing patterns in `recipe-detail-client.tsx` for where to place the panel (after other info panels).
- Do NOT add any em dashes anywhere.
- Toast is NOT needed (no mutations).

## Verification

After building:

1. Run `npx tsc --noEmit --skipLibCheck` - must pass
2. Run `npx next build --no-lint` - must pass
3. No new type errors introduced

## Files Changed Summary

| File                                               | Action                              |
| -------------------------------------------------- | ----------------------------------- |
| `components/recipes/purchase-feedback-panel.tsx`   | CREATE                              |
| `app/(chef)/recipes/[id]/recipe-detail-client.tsx` | EDIT (add 1 import + 1 render line) |
