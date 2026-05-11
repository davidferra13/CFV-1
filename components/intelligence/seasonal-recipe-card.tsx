'use client'

import Link from 'next/link'
import type { SeasonalRecipeMatch } from '@/lib/intelligence/seasonal-menu'
import { Star, Leaf } from '@/components/ui/icons'

export function SeasonalRecipeCard({ recipe }: { recipe: SeasonalRecipeMatch }) {
  const matchColor =
    recipe.seasonalMatchPct >= 70
      ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40'
      : recipe.seasonalMatchPct >= 40
        ? 'text-amber-400 bg-amber-950/40 border-amber-800/40'
        : 'text-stone-400 bg-stone-900/40 border-stone-800/40'

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="block rounded-xl border border-stone-800 bg-stone-900/50 p-4 hover:border-stone-700 hover:bg-stone-900/80 transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-stone-200 truncate">{recipe.name}</h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-stone-500">
            {recipe.category && (
              <span className="capitalize">{recipe.category}</span>
            )}
            {recipe.cuisine && (
              <>
                <span className="text-stone-700">|</span>
                <span className="capitalize">{recipe.cuisine}</span>
              </>
            )}
          </div>
        </div>
        {recipe.rating && (
          <div className="flex items-center gap-0.5 text-amber-400">
            <Star className="h-3.5 w-3.5" weight="fill" />
            <span className="text-xs font-medium">{recipe.rating}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 mt-3">
        <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${matchColor}`}>
          <Leaf className="h-3 w-3" />
          {recipe.seasonalMatchPct}% seasonal
        </div>
        <span className="text-xs text-stone-500">
          {recipe.seasonalIngredientCount}/{recipe.totalIngredientCount} ingredients
        </span>
      </div>

      {recipe.timesServed > 0 && (
        <p className="text-xs text-stone-600 mt-2">
          Served {recipe.timesServed} time{recipe.timesServed === 1 ? '' : 's'}
        </p>
      )}
    </Link>
  )
}
