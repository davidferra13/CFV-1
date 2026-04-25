'use client'

import { useState } from 'react'
import type { WeeklyShoppingList } from '@/lib/hub/meal-board-shopping-list'

interface MealBoardShoppingListProps {
  groupId: string
  groupToken: string
  weekStart: string // ISO date
  weekEnd: string // ISO date
  weekLabel: string
  mealCount: number
}

type ShoppingListResponse =
  | { success: true; list: WeeklyShoppingList; error?: undefined }
  | { success: false; error?: string }

export function MealBoardShoppingList({
  groupId,
  groupToken,
  weekStart,
  weekEnd,
  weekLabel,
  mealCount,
}: MealBoardShoppingListProps) {
  const [list, setList] = useState<WeeklyShoppingList | null>(null)
  const [open, setOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleGenerate = () => {
    setError(null)
    setIsGenerating(true)
    void (async () => {
      try {
        const response = await fetch(`/api/hub-public/groups/${groupId}/meal-board-shopping-list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupToken,
            startDate: weekStart,
            endDate: weekEnd,
          }),
        })

        const result = (await response.json().catch(() => null)) as ShoppingListResponse | null
        if (!response.ok || !result?.success) {
          throw new Error(result?.error ?? 'Failed to generate shopping list')
        }

        setList(result.list)
        setOpen(true)
      } catch {
        setError('Failed to generate shopping list')
      } finally {
        setIsGenerating(false)
      }
    })()
  }

  const handleCopy = () => {
    if (!list) return

    const lines: string[] = []
    lines.push(`Shopping List: ${weekLabel}`)
    lines.push(
      `${list.mealCount} meals planned${list.headCount ? ` (up to ${list.headCount} people)` : ''}`
    )
    lines.push('')

    if (list.allergies.length > 0) {
      lines.push(`ALLERGIES: ${list.allergies.join(', ')}`)
      lines.push('')
    }

    if (list.ingredients.length > 0) {
      lines.push('--- INGREDIENTS (from recipes) ---')
      for (const ing of list.ingredients) {
        const qty = ing.quantity != null ? `${ing.quantity} ${ing.unit ?? ''}`.trim() : ''
        lines.push(`[ ] ${ing.name}${qty ? ` - ${qty}` : ''}`)
      }
      lines.push('')
    }

    if (list.unlinkedMeals.length > 0) {
      lines.push('--- PLANNED DISHES (shop for these) ---')
      for (const meal of list.unlinkedMeals) {
        lines.push(`[ ] ${meal.title}${meal.count > 1 ? ` (x${meal.count})` : ''}`)
      }
    }

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (mealCount === 0) return null

  return (
    <div>
      <button
        type="button"
        onClick={open ? () => setOpen(false) : handleGenerate}
        disabled={isGenerating}
        className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs text-stone-400 hover:bg-stone-700 disabled:opacity-50"
      >
        {isGenerating ? 'Generating...' : open ? 'Hide Shopping List' : 'Generate Shopping List'}
      </button>

      {error && <p className="mt-1 text-[10px] text-red-400">{error}</p>}

      {open && list && (
        <div className="mt-2 rounded-xl border border-stone-700 bg-stone-900/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-stone-200">Shopping List</h4>
              <p className="text-[10px] text-stone-500">
                {list.mealCount} meals, {weekLabel}
                {list.headCount ? ` (up to ${list.headCount} people)` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg bg-stone-700 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-600"
            >
              {copied ? 'Copied!' : 'Copy List'}
            </button>
          </div>

          {/* Allergy alert */}
          {list.allergies.length > 0 && (
            <div className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-3 py-2">
              <p className="text-[10px] font-semibold text-amber-400">
                Watch for allergens: {list.allergies.join(', ')}
              </p>
            </div>
          )}

          {/* Recipe-linked ingredients */}
          {list.ingredients.length > 0 && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-stone-500 mb-1.5">
                Ingredients (from recipes)
              </p>
              <div className="space-y-0.5">
                {list.ingredients.map((ing) => (
                  <div
                    key={ing.name}
                    className="flex items-center gap-2 rounded px-2 py-1 hover:bg-stone-800/60"
                  >
                    <span className="h-3 w-3 shrink-0 rounded-sm border border-stone-600" />
                    <span className="text-xs text-stone-200 flex-1">{ing.name}</span>
                    {ing.quantity != null && (
                      <span className="text-[10px] text-stone-500">
                        {ing.quantity} {ing.unit ?? ''}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unlinked meals */}
          {list.unlinkedMeals.length > 0 && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-stone-500 mb-1.5">
                Planned dishes (shop for these)
              </p>
              <div className="space-y-0.5">
                {list.unlinkedMeals.map((meal) => (
                  <div
                    key={meal.title}
                    className="flex items-center gap-2 rounded px-2 py-1 hover:bg-stone-800/60"
                  >
                    <span className="h-3 w-3 shrink-0 rounded-sm border border-stone-600" />
                    <span className="text-xs text-stone-200 flex-1">{meal.title}</span>
                    {meal.count > 1 && (
                      <span className="text-[10px] text-stone-500">x{meal.count}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {list.ingredients.length === 0 && list.unlinkedMeals.length === 0 && (
            <p className="text-xs text-stone-500 text-center py-4">
              No meals planned for this week.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
