'use client'

import { useState, useTransition } from 'react'
import { calculateRecipeNutrition, saveNutritionOverride } from '@/lib/nutrition/nutrition-actions'
import type { RecipeNutritionResult, NutrientInfo } from '@/lib/nutrition/nutrition-actions'
import { NutritionLabel } from './nutrition-label'
import { EMPTY_NUTRIENTS } from '@/lib/nutrition/usda-client'

type RecipeNutritionPanelProps = {
  recipeId: string
  recipeName: string
}

// Common allergens to flag based on ingredient names
const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  Dairy: ['milk', 'cream', 'butter', 'cheese', 'yogurt', 'whey', 'casein', 'lactose'],
  Gluten: ['wheat', 'flour', 'bread', 'pasta', 'barley', 'rye', 'semolina'],
  Nuts: ['almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut', 'macadamia', 'peanut'],
  Shellfish: ['shrimp', 'crab', 'lobster', 'prawn', 'crawfish', 'crayfish'],
  Fish: ['salmon', 'tuna', 'cod', 'halibut', 'anchovy', 'sardine', 'tilapia', 'bass'],
  Eggs: ['egg', 'eggs', 'mayonnaise'],
  Soy: ['soy', 'tofu', 'edamame', 'tempeh', 'miso'],
  Sesame: ['sesame', 'tahini'],
}

/**
 * Full nutrition panel for a recipe.
 * Shows calculated nutrition, per-serving breakdown,
 * ingredient-by-ingredient contribution, manual override option,
 * and allergen flags.
 */
export function RecipeNutritionPanel({ recipeId, recipeName }: RecipeNutritionPanelProps) {
  const [nutritionData, setNutritionData] = useState<RecipeNutritionResult | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showOverrideForm, setShowOverrideForm] = useState(false)
  const [overrideValues, setOverrideValues] = useState<NutrientInfo>({ ...EMPTY_NUTRIENTS })
  const [isPending, startTransition] = useTransition()
  const [loaded, setLoaded] = useState(false)

  function handleCalculate() {
    setLoadError(null)
    startTransition(async () => {
      try {
        const result = await calculateRecipeNutrition(recipeId)
        if (result.success && result.data) {
          setNutritionData(result.data)
          setOverrideValues(result.data.totalNutrients)
          setLoaded(true)
        } else {
          setLoadError(result.error || 'Failed to calculate nutrition')
        }
      } catch {
        setLoadError('Failed to calculate nutrition')
      }
    })
  }

  function handleSaveOverride() {
    startTransition(async () => {
      try {
        const result = await saveNutritionOverride(recipeId, overrideValues)
        if (result.success) {
          setShowOverrideForm(false)
          // Refresh data
          handleCalculate()
        } else {
          setLoadError(result.error || 'Failed to save override')
        }
      } catch {
        setLoadError('Failed to save override')
      }
    })
  }

  // Detect allergens from ingredient names
  const detectedAllergens = nutritionData
    ? detectAllergens(nutritionData.ingredients.map((i) => i.ingredientName))
    : []

  if (!loaded) {
    return (
      <div className="rounded-lg border border-gray-200 p-6 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Nutritional Analysis</h3>
        <p className="text-sm text-gray-500 mb-4">
          Calculate nutrition facts using USDA FoodData Central
        </p>
        <button
          onClick={handleCalculate}
          disabled={isPending}
          className="rounded-md bg-brand-600 px-6 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isPending ? 'Calculating...' : 'Calculate Nutrition'}
        </button>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-600">{loadError}</p>
        <button
          onClick={handleCalculate}
          className="mt-2 text-sm text-red-700 underline hover:text-red-900"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!nutritionData) return null

  return (
    <div className="space-y-6">
      {/* Header with completeness indicator */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Nutritional Analysis</h3>
        <div className="flex items-center gap-3">
          <CompletenessBar value={nutritionData.completeness} />
          <button
            onClick={handleCalculate}
            disabled={isPending}
            className="text-xs text-brand-600 underline hover:text-brand-800"
          >
            Recalculate
          </button>
        </div>
      </div>

      {/* Allergen flags */}
      {detectedAllergens.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-800 mb-1">Potential Allergens Detected</p>
          <div className="flex flex-wrap gap-1.5">
            {detectedAllergens.map((allergen) => (
              <span
                key={allergen}
                className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 border border-amber-300"
              >
                {allergen}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main content: label + breakdown side by side */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Nutrition label */}
        <div className="shrink-0">
          <NutritionLabel
            nutrients={
              nutritionData.hasOverride && nutritionData.overrideData
                ? nutritionData.overrideData
                : nutritionData.totalNutrients
            }
            servings={nutritionData.servings}
            recipeName={nutritionData.recipeName}
          />
          {nutritionData.hasOverride && (
            <p className="text-xxs text-gray-400 mt-1">Using manually overridden values</p>
          )}
        </div>

        {/* Ingredient breakdown */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Ingredient Breakdown</h4>
          <div className="rounded-md border border-gray-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-left px-3 py-2 font-medium">Ingredient</th>
                  <th className="text-right px-2 py-2 font-medium">Qty</th>
                  <th className="text-right px-2 py-2 font-medium">Cal</th>
                  <th className="text-right px-2 py-2 font-medium">P(g)</th>
                  <th className="text-right px-2 py-2 font-medium">C(g)</th>
                  <th className="text-right px-2 py-2 font-medium">F(g)</th>
                  <th className="text-center px-2 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {nutritionData.ingredients.map((ing) => (
                  <tr key={ing.ingredientId} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-1.5 text-gray-900 truncate max-w-[150px]">
                      {ing.ingredientName}
                    </td>
                    <td className="text-right px-2 py-1.5 text-gray-600">
                      {ing.quantity} {ing.unit}
                    </td>
                    <td className="text-right px-2 py-1.5 text-gray-900 font-medium">
                      {Math.round(ing.nutrients.calories)}
                    </td>
                    <td className="text-right px-2 py-1.5 text-gray-600">
                      {ing.nutrients.protein_g}
                    </td>
                    <td className="text-right px-2 py-1.5 text-gray-600">
                      {ing.nutrients.carbs_g}
                    </td>
                    <td className="text-right px-2 py-1.5 text-gray-600">{ing.nutrients.fat_g}</td>
                    <td className="text-center px-2 py-1.5">
                      {ing.isEstimated ? (
                        <span
                          className="text-amber-500"
                          title="No USDA match - values may be inaccurate"
                        >
                          ?
                        </span>
                      ) : (
                        <span className="text-green-600" title="USDA matched">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {nutritionData.completeness < 100 && (
            <p className="text-xxs text-gray-400 mt-1.5">
              Ingredients marked with ? need to be linked to USDA foods for accurate nutrition data.
            </p>
          )}
        </div>
      </div>

      {/* Manual override section */}
      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={() => setShowOverrideForm(!showOverrideForm)}
          className="text-sm text-gray-600 hover:text-gray-900 underline"
        >
          {showOverrideForm ? 'Cancel override' : 'Manually override values'}
        </button>

        {showOverrideForm && (
          <div className="mt-3 rounded-md border border-gray-200 p-4 bg-gray-50">
            <p className="text-xs text-gray-500 mb-3">
              Override the calculated values with your own numbers. Useful when you know exact
              nutritional information from testing or labeling.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <OverrideField
                label="Calories"
                value={overrideValues.calories}
                onChange={(v) => setOverrideValues({ ...overrideValues, calories: v })}
              />
              <OverrideField
                label="Protein (g)"
                value={overrideValues.protein_g}
                onChange={(v) => setOverrideValues({ ...overrideValues, protein_g: v })}
              />
              <OverrideField
                label="Carbs (g)"
                value={overrideValues.carbs_g}
                onChange={(v) => setOverrideValues({ ...overrideValues, carbs_g: v })}
              />
              <OverrideField
                label="Fat (g)"
                value={overrideValues.fat_g}
                onChange={(v) => setOverrideValues({ ...overrideValues, fat_g: v })}
              />
              <OverrideField
                label="Fiber (g)"
                value={overrideValues.fiber_g}
                onChange={(v) => setOverrideValues({ ...overrideValues, fiber_g: v })}
              />
              <OverrideField
                label="Sodium (mg)"
                value={overrideValues.sodium_mg}
                onChange={(v) => setOverrideValues({ ...overrideValues, sodium_mg: v })}
              />
              <OverrideField
                label="Sugar (g)"
                value={overrideValues.sugar_g}
                onChange={(v) => setOverrideValues({ ...overrideValues, sugar_g: v })}
              />
            </div>
            <div className="flex justify-end mt-3">
              <button
                onClick={handleSaveOverride}
                disabled={isPending}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {isPending ? 'Saving...' : 'Save Override'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// Sub-components
// ============================================

function CompletenessBar({ value }: { value: number }) {
  const color = value >= 80 ? 'bg-green-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 rounded-full bg-gray-200 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-gray-500">{value}% matched</span>
    </div>
  )
}

function OverrideField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step="0.1"
        min="0"
        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
    </div>
  )
}

// ============================================
// Helpers
// ============================================

function detectAllergens(ingredientNames: string[]): string[] {
  const found = new Set<string>()

  for (const name of ingredientNames) {
    const lower = name.toLowerCase()
    for (const [allergen, keywords] of Object.entries(ALLERGEN_KEYWORDS)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        found.add(allergen)
      }
    }
  }

  return Array.from(found).sort()
}
