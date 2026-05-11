'use client'

import type { SeasonalIngredient } from '@/lib/intelligence/seasonal-menu'
import { Leaf, TrendUp } from '@/components/ui/icons'

export function SeasonalIngredientGrid({
  ingredients,
}: {
  ingredients: SeasonalIngredient[]
}) {
  if (ingredients.length === 0) {
    return (
      <div className="text-center py-8 text-stone-500">
        No seasonal ingredients found for this month. Try adding ingredients to your seasonal palettes.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {ingredients.map((ingredient, i) => (
        <div
          key={`${ingredient.name}-${i}`}
          className={`rounded-xl border px-4 py-3 transition-colors ${
            ingredient.microWindowActive
              ? 'border-emerald-700/50 bg-emerald-950/30'
              : 'border-stone-800 bg-stone-900/50'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-stone-200 leading-tight">
              {ingredient.name}
            </span>
            {ingredient.microWindowActive && (
              <Leaf className="h-4 w-4 text-emerald-400 shrink-0" />
            )}
          </div>

          {ingredient.microWindowNotes && (
            <p className="text-xs text-stone-500 mt-1 line-clamp-2">
              {ingredient.microWindowNotes}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2">
            {ingredient.priceCents !== null && (
              <span className="text-xs text-stone-400">
                ${(ingredient.priceCents / 100).toFixed(2)}
              </span>
            )}
            <div className="flex items-center gap-1">
              <TrendUp className="h-3 w-3 text-emerald-500" />
              <span className="text-xs text-emerald-500 font-medium">
                {ingredient.seasonScore}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
