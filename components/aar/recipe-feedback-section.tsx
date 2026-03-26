'use client'

// Recipe Feedback Section for AAR Form
// Shows each recipe used at the event and lets the chef rate:
//   - Timing accuracy (faster/accurate/slower than expected)
//   - Would use again (yes/no)
//   - Notes (optional, per-recipe)

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

export type RecipeFeedbackEntry = {
  recipeId: string
  recipeName: string
  componentName: string
  timingAccuracy: 'faster' | 'accurate' | 'slower' | null
  wouldUseAgain: boolean
  notes: string | null
}

type Props = {
  eventId: string
  value: RecipeFeedbackEntry[]
  onChange: (feedbacks: RecipeFeedbackEntry[]) => void
}

const TIMING_OPTIONS = [
  { value: 'faster', label: 'Faster', icon: '⚡', desc: 'Quicker than expected' },
  { value: 'accurate', label: 'On time', icon: '✓', desc: 'As estimated' },
  { value: 'slower', label: 'Slower', icon: '⏳', desc: 'Took longer' },
] as const

export function RecipeFeedbackSection({ eventId, value, onChange }: Props) {
  const [recipes, setRecipes] = useState<RecipeFeedbackEntry[]>(value)
  const [loading, setLoading] = useState(value.length === 0)
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (value.length > 0) {
      setRecipes(value)
      setLoading(false)
      return
    }

    // Load recipes for this event
    let cancelled = false
    ;(async () => {
      try {
        const { getRecipesForEvent } = await import('@/lib/recipes/actions')
        const eventRecipes = await getRecipesForEvent(eventId)

        if (cancelled) return

        // Deduplicate by recipe ID (same recipe might appear in multiple components)
        const seen = new Set<string>()
        const entries: RecipeFeedbackEntry[] = []
        for (const er of eventRecipes) {
          if (er.recipe && !seen.has(er.recipe.id)) {
            seen.add(er.recipe.id)
            entries.push({
              recipeId: er.recipe.id,
              recipeName: er.recipe.name,
              componentName: er.componentName,
              timingAccuracy: null,
              wouldUseAgain: true,
              notes: null,
            })
          }
        }

        setRecipes(entries)
        onChange(entries)
      } catch (err) {
        console.error('[RecipeFeedbackSection] Failed to load recipes:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [eventId]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateRecipe = (recipeId: string, updates: Partial<RecipeFeedbackEntry>) => {
    const next = recipes.map((r) => (r.recipeId === recipeId ? { ...r, ...updates } : r))
    setRecipes(next)
    onChange(next)
  }

  const toggleNotes = (recipeId: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev)
      if (next.has(recipeId)) next.delete(recipeId)
      else next.add(recipeId)
      return next
    })
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-stone-800 rounded w-1/3" />
          <div className="h-3 bg-stone-800 rounded w-full" />
        </div>
      </Card>
    )
  }

  if (recipes.length === 0) return null

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-stone-100 mb-2">Recipe Feedback</h2>
      <p className="text-sm text-stone-500 mb-4">
        Rate each recipe used at this event. This builds your recipe track record over time.
      </p>

      <div className="space-y-4">
        {recipes.map((recipe) => (
          <div key={recipe.recipeId} className="border border-stone-800 rounded-lg p-4 space-y-3">
            {/* Recipe name */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-200">{recipe.recipeName}</p>
                <p className="text-xs text-stone-500">{recipe.componentName}</p>
              </div>
              {/* Would use again toggle */}
              <button
                type="button"
                onClick={() =>
                  updateRecipe(recipe.recipeId, { wouldUseAgain: !recipe.wouldUseAgain })
                }
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  recipe.wouldUseAgain
                    ? 'border-green-800 bg-green-950 text-green-400'
                    : 'border-red-800 bg-red-950 text-red-400'
                }`}
              >
                {recipe.wouldUseAgain ? 'Would use again' : 'Would not repeat'}
              </button>
            </div>

            {/* Timing accuracy */}
            <div className="flex gap-2">
              {TIMING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    updateRecipe(recipe.recipeId, {
                      timingAccuracy: recipe.timingAccuracy === opt.value ? null : opt.value,
                    })
                  }
                  className={`flex-1 py-2 px-2 rounded-lg border text-center transition-all text-xs ${
                    recipe.timingAccuracy === opt.value
                      ? 'border-brand-600 bg-brand-950 text-brand-400 font-medium'
                      : 'border-stone-700 bg-stone-900 text-stone-400 hover:border-stone-600'
                  }`}
                >
                  <span className="block text-sm">{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>

            {/* Notes toggle + field */}
            <div>
              <button
                type="button"
                onClick={() => toggleNotes(recipe.recipeId)}
                className="text-xs text-brand-400 hover:text-brand-300 underline underline-offset-2"
              >
                {expandedNotes.has(recipe.recipeId)
                  ? 'Hide notes'
                  : recipe.notes
                    ? 'Edit notes'
                    : 'Add notes'}
              </button>
              {expandedNotes.has(recipe.recipeId) && (
                <div className="mt-2">
                  <Textarea
                    placeholder="How did this recipe perform? Any adjustments needed?"
                    value={recipe.notes ?? ''}
                    onChange={(e) =>
                      updateRecipe(recipe.recipeId, { notes: e.target.value || null })
                    }
                    rows={2}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
