'use client'

// Recipe Nutrition Panel - shows aggregated USDA nutrition data for a recipe.
// On-demand: chef clicks "Show Nutrition" to trigger API lookups.
// Displays per-serving macros (calories, protein, fat, carbs, fiber, sodium)
// plus a collapsible per-ingredient breakdown.

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getRecipeNutrition } from '@/lib/recipes/nutrition-actions'
import type { RecipeNutritionResult, NutritionTotals } from '@/lib/recipes/nutrition-actions'

type Props = {
  recipeId: string
  ingredientCount: number
}

export function NutritionPanel({ recipeId, ingredientCount }: Props) {
  const [data, setData] = useState<RecipeNutritionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [viewMode, setViewMode] = useState<'serving' | 'total'>('serving')

  function handleFetch() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await getRecipeNutrition(recipeId)
        setData(result)
      } catch (err: any) {
        setError(err.message || 'Failed to load nutrition data')
      }
    })
  }

  // Not yet loaded - show the trigger button
  if (!data && !error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Nutrition</CardTitle>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleFetch}
              disabled={isPending || ingredientCount === 0}
            >
              {isPending ? 'Analyzing...' : 'Show Nutrition'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="flex items-center gap-3 py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-600 border-t-brand-500" />
              <p className="text-sm text-stone-400">
                Looking up {ingredientCount} ingredient{ingredientCount !== 1 ? 's' : ''} via
                USDA...
              </p>
            </div>
          ) : ingredientCount === 0 ? (
            <p className="text-stone-500 text-center py-4">
              Add ingredients to see nutrition data.
            </p>
          ) : (
            <p className="text-sm text-stone-500">
              Estimate calories, protein, fat, carbs, and more using USDA data. Makes one API call
              per ingredient.
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Nutrition</CardTitle>
            <Button size="sm" variant="secondary" onClick={handleFetch} loading={isPending}>
              {isPending ? 'Retrying...' : 'Retry'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-400">Nutrition data unavailable. {error}</p>
        </CardContent>
      </Card>
    )
  }

  // Loaded - show the nutrition summary
  const totals: NutritionTotals = viewMode === 'serving' ? data!.perServing : data!.wholeRecipe
  const matchedCount = data!.ingredients.filter((i) => i.matched).length

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <CardTitle>Nutrition</CardTitle>
            {data!.missingCount > 0 && (
              <Badge variant="warning">
                {data!.missingCount} ingredient{data!.missingCount !== 1 ? 's' : ''} not found
              </Badge>
            )}
          </div>
          <Button size="sm" variant="secondary" onClick={handleFetch} loading={isPending}>
            {isPending ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Toggle: per serving vs whole recipe */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setViewMode('serving')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              viewMode === 'serving'
                ? 'bg-brand-500/20 text-brand-400 font-medium'
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            Per Serving ({data!.servings} servings)
          </button>
          <button
            onClick={() => setViewMode('total')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              viewMode === 'total'
                ? 'bg-brand-500/20 text-brand-400 font-medium'
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            Whole Recipe
          </button>
        </div>

        {/* Macro grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
          <MacroCard label="Calories" value={totals.calories} unit="kcal" highlight />
          <MacroCard label="Protein" value={totals.protein} unit="g" />
          <MacroCard label="Fat" value={totals.fat} unit="g" />
          <MacroCard label="Carbs" value={totals.carbs} unit="g" />
          <MacroCard label="Fiber" value={totals.fiber} unit="g" />
          <MacroCard label="Sodium" value={totals.sodium} unit="mg" />
        </div>

        {/* Data quality note */}
        <p className="text-xs text-stone-500 mb-3">
          {matchedCount}/{data!.ingredients.length} ingredients matched. Estimates use USDA FoodData
          Central. Volume-based ingredients use approximate density.
        </p>

        {/* Per-ingredient breakdown toggle */}
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="text-sm text-stone-400 hover:text-stone-200 transition-colors"
        >
          {showBreakdown ? 'Hide' : 'Show'} per-ingredient breakdown
          <span className="ml-1">{showBreakdown ? '\u25B2' : '\u25BC'}</span>
        </button>

        {showBreakdown && (
          <div className="mt-3 border border-stone-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-800/50 text-stone-400 text-xs">
                  <th className="text-left px-3 py-2 font-medium">Ingredient</th>
                  <th className="text-right px-2 py-2 font-medium">Cal</th>
                  <th className="text-right px-2 py-2 font-medium">Pro</th>
                  <th className="text-right px-2 py-2 font-medium">Fat</th>
                  <th className="text-right px-2 py-2 font-medium">Carb</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {data!.ingredients.map((ing, i) => (
                  <tr key={i} className={ing.matched ? '' : 'opacity-50'}>
                    <td className="px-3 py-2">
                      <div className="text-stone-100">
                        {ing.quantity} {ing.unit} {ing.name}
                      </div>
                      {ing.matched && ing.usdaName && (
                        <div className="text-xs text-stone-500 truncate max-w-[200px]">
                          USDA: {ing.usdaName}
                        </div>
                      )}
                      {!ing.matched && <div className="text-xs text-amber-500">No match</div>}
                    </td>
                    <td className="text-right px-2 py-2 text-stone-300">
                      {ing.calories != null ? ing.calories : '-'}
                    </td>
                    <td className="text-right px-2 py-2 text-stone-300">
                      {ing.protein != null ? `${ing.protein}g` : '-'}
                    </td>
                    <td className="text-right px-2 py-2 text-stone-300">
                      {ing.fat != null ? `${ing.fat}g` : '-'}
                    </td>
                    <td className="text-right px-2 py-2 text-stone-300">
                      {ing.carbs != null ? `${ing.carbs}g` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Macro card sub-component ─────────────────────────────────────────────────

function MacroCard({
  label,
  value,
  unit,
  highlight,
}: {
  label: string
  value: number
  unit: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-center ${
        highlight ? 'border-brand-600/50 bg-brand-950/30' : 'border-stone-700 bg-stone-800/30'
      }`}
    >
      <p className="text-xs text-stone-500 mb-0.5">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-brand-400' : 'text-stone-100'}`}>
        {value % 1 === 0 ? value : value.toFixed(1)}
      </p>
      <p className="text-xs text-stone-500">{unit}</p>
    </div>
  )
}
