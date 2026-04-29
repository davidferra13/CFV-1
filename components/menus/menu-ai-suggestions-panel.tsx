'use client'

// MenuAISuggestionsPanel
// Appears in Step 2 of the menu creation wizard.
// Searches the chef's recipe book only. It never asks AI to invent dishes.

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen } from '@/components/ui/icons'
import { getRecipeBookMenuSuggestions } from '@/lib/menus/recipe-book-suggestions-actions'

type CourseRow = {
  localId: string
  label: string
  dishName: string
  description: string
  recipeId?: string
  dietaryTags?: string[]
  allergenFlags?: string[]
}

type MenuSuggestionContext = {
  sceneType?: string
  cuisineType?: string
  serviceStyle?: string
  guestCount?: number
  season?: string
  notes?: string
  allergies?: string[] | string
}

type MenuSuggestion = {
  name: string
  rationale: string
  courses: Array<{
    course: string
    dish: string
    description: string
    recipeId?: string
    dietaryTags?: string[]
    allergenFlags?: string[]
  }>
}

interface Props {
  context: MenuSuggestionContext
  onApply: (courses: CourseRow[]) => void
}

export function MenuAISuggestionsPanel({ context, onApply }: Props) {
  const [isPending, startTransition] = useTransition()
  const [suggestions, setSuggestions] = useState<MenuSuggestion[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null)

  function fetchSuggestions() {
    setError(null)
    setSuggestions(null)
    setAppliedIndex(null)
    startTransition(async () => {
      try {
        const results = await getRecipeBookMenuSuggestions(context)
        setSuggestions(results)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Could not load recipe book matches'
        setError(msg)
      }
    })
  }

  function applyOption(index: number, suggestion: MenuSuggestion) {
    const courses: CourseRow[] = suggestion.courses.map((c) => ({
      localId: `recipe-${index}-${crypto.randomUUID()}`,
      label: c.course,
      dishName: c.dish,
      description: c.description,
      recipeId: c.recipeId,
      dietaryTags: c.dietaryTags,
      allergenFlags: c.allergenFlags,
    }))
    onApply(courses)
    setAppliedIndex(index)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-brand-400" />
            <CardTitle className="text-base">Recipe Book Matches</CardTitle>
          </div>
          {suggestions && (
            <button
              type="button"
              onClick={fetchSuggestions}
              disabled={isPending}
              className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
            >
              Refresh
            </button>
          )}
        </div>
        <p className="text-xs text-stone-500 mt-1">Existing recipes matched to this menu context</p>
      </CardHeader>
      <CardContent>
        {!suggestions && !isPending && !error && (
          <Button type="button" variant="secondary" onClick={fetchSuggestions} className="w-full">
            <BookOpen className="h-4 w-4 mr-2" />
            Find Recipe Matches
          </Button>
        )}

        {isPending && (
          <div className="flex flex-col items-center gap-2 py-4 text-stone-500">
            <div className="w-5 h-5 border-2 border-stone-600 border-t-brand-400 rounded-full animate-spin" />
            <p className="text-xs">Searching your recipe book...</p>
          </div>
        )}

        {error && (
          <div className="space-y-2">
            <p className="text-xs text-red-400">{error}</p>
            <Button type="button" variant="secondary" onClick={fetchSuggestions} className="w-full">
              Try Again
            </Button>
          </div>
        )}

        {suggestions && suggestions.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-stone-400">
              No saved recipes are available yet. Add courses manually or add recipes to your book
              first.
            </p>
            <Button type="button" variant="secondary" href="/recipes/new" className="w-full">
              Add Recipe
            </Button>
          </div>
        )}

        {suggestions && suggestions.length > 0 && (
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <div
                key={i}
                className={`rounded-lg border p-3 space-y-2 transition-colors ${
                  appliedIndex === i
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-stone-700 bg-stone-800/50 hover:border-stone-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-stone-100">{s.name}</p>
                    <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{s.rationale}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => applyOption(i, s)}
                    className={`flex-shrink-0 text-xs px-2 py-1 rounded transition-colors ${
                      appliedIndex === i
                        ? 'bg-brand-500 text-white'
                        : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                    }`}
                  >
                    {appliedIndex === i ? 'Applied' : 'Use This'}
                  </button>
                </div>
                <div className="space-y-0.5">
                  {s.courses.map((c, ci) => (
                    <div key={ci} className="space-y-0.5 text-xs">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-stone-600 flex-shrink-0">{c.course}:</span>
                        <span className="text-stone-300">{c.dish}</span>
                      </div>
                      {(c.dietaryTags?.length || c.allergenFlags?.length) && (
                        <div className="pl-12 text-[11px] text-stone-500">
                          {[
                            ...(c.dietaryTags ?? []).slice(0, 3),
                            ...(c.allergenFlags ?? []).slice(0, 3).map((flag) => `Contains ${flag}`),
                          ].join(' | ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
