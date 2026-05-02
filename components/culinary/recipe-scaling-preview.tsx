'use client'

// Recipe Scaling Preview
// Module: culinary
// Shows how each ingredient scales at different guest counts.
// Makes the existing non-linear scaling engine visible to the chef.
// Deterministic: formula > AI.

import { useState } from 'react'
import {
  scaleRecipe,
  getScalingCategory,
  getScalingCategoryLabel,
  type ScalableIngredient,
  type ScaledIngredient,
} from '@/lib/recipes/recipe-scaling'

type Props = {
  ingredients: ScalableIngredient[]
  baseYield: number
  yieldUnit?: string
}

const PREVIEW_MULTIPLIERS = [0.5, 1, 2, 4, 8]

const CATEGORY_COLORS: Record<string, string> = {
  bulk: 'text-stone-300',
  flavor: 'text-amber-400',
  structure: 'text-blue-400',
  finishing: 'text-purple-400',
}

function formatQty(qty: number): string {
  if (qty === 0) return '0'
  if (qty < 0.01) return '<0.01'
  if (qty >= 100) return Math.round(qty).toString()
  if (qty >= 10) return qty.toFixed(1)
  return qty.toFixed(2)
}

export function RecipeScalingPreview({ ingredients, baseYield, yieldUnit = 'servings' }: Props) {
  const [targetMultiplier, setTargetMultiplier] = useState(2)

  if (ingredients.length === 0) {
    return <p className="text-sm text-stone-500">No ingredients to preview scaling.</p>
  }

  const targetYield = baseYield * targetMultiplier
  const result = scaleRecipe(ingredients, baseYield, targetYield)

  // Group by scaling category for clarity
  const byCategory = new Map<string, ScaledIngredient[]>()
  for (const ing of result.scaledIngredients) {
    const cat = ing.scalingCategory
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat)!.push(ing)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-stone-300">Scaling Preview</h3>
        <div className="flex items-center gap-1">
          {PREVIEW_MULTIPLIERS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setTargetMultiplier(m)}
              className={`text-xs px-2 py-1 rounded ${
                targetMultiplier === m
                  ? 'bg-brand-600 text-white'
                  : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
              }`}
            >
              {m}x
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs text-stone-500">
        {baseYield} {yieldUnit} &rarr; {targetYield} {yieldUnit} ({targetMultiplier}x)
      </div>

      {result.warnings.length > 0 && (
        <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2">
          {result.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-400">
              {w}
            </p>
          ))}
        </div>
      )}

      {/* Scaling table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-stone-800">
              <th className="text-left py-2 pr-3 text-stone-500 font-medium">Ingredient</th>
              <th className="text-right py-2 px-2 text-stone-500 font-medium">Base</th>
              <th className="text-right py-2 px-2 text-stone-500 font-medium">
                {targetMultiplier}x
              </th>
              <th className="text-right py-2 px-2 text-stone-500 font-medium">Actual</th>
              <th className="text-left py-2 pl-2 text-stone-500 font-medium">Category</th>
            </tr>
          </thead>
          <tbody>
            {result.scaledIngredients.map((ing) => {
              const linearExpected = ing.originalQty * targetMultiplier
              const deviation =
                linearExpected > 0 ? ((ing.scaledQty - linearExpected) / linearExpected) * 100 : 0
              const catColor = CATEGORY_COLORS[ing.scalingCategory] || 'text-stone-400'

              return (
                <tr key={ing.ingredientId} className="border-b border-stone-800/50">
                  <td className="py-1.5 pr-3 text-stone-300 max-w-[180px] truncate">{ing.name}</td>
                  <td className="py-1.5 px-2 text-right text-stone-400">
                    {formatQty(ing.originalQty)} {ing.unit}
                  </td>
                  <td className="py-1.5 px-2 text-right font-medium text-stone-200">
                    {formatQty(ing.scaledQty)} {ing.unit}
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    {Math.abs(deviation) > 1 ? (
                      <span className={deviation < 0 ? 'text-amber-400' : 'text-stone-500'}>
                        {deviation > 0 ? '+' : ''}
                        {deviation.toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-stone-600">linear</span>
                    )}
                  </td>
                  <td className={`py-1.5 pl-2 ${catColor}`}>
                    {getScalingCategoryLabel(ing.scalingCategory)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Category legend */}
      <div className="flex flex-wrap gap-3 pt-1">
        {Array.from(byCategory.entries()).map(([cat, ings]) => (
          <div key={cat} className="flex items-center gap-1.5 text-[10px]">
            <span
              className={`w-2 h-2 rounded-full ${
                cat === 'bulk'
                  ? 'bg-stone-400'
                  : cat === 'flavor'
                    ? 'bg-amber-400'
                    : cat === 'structure'
                      ? 'bg-blue-400'
                      : 'bg-purple-400'
              }`}
            />
            <span className="text-stone-500">
              {getScalingCategoryLabel(cat as any)} ({ings.length})
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
