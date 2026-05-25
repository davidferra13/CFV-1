// Module 4: Nutritional Data
// Ingredient lookup and recipe-level calculation

import type { NutritionEntry, MacroSummary, RecipeNutritionSummary } from './types'
import { NUTRITION_DISCLAIMER } from './types'
import rawData from './data/nutrition-common.json'

const entries: NutritionEntry[] = rawData as NutritionEntry[]

/** Search nutrition entries by ingredient name */
export function searchNutrition(query: string): NutritionEntry[] {
  if (!query.trim()) return entries
  const q = query.toLowerCase().trim()
  return entries.filter((e) => e.ingredientName.toLowerCase().includes(q))
}

/** Get a single entry by id */
export function getNutritionEntry(id: string): NutritionEntry | undefined {
  return entries.find((e) => e.id === id)
}

/** Find best matching nutrition entry for an ingredient name */
export function findBestMatch(ingredientName: string): NutritionEntry | undefined {
  const q = ingredientName.toLowerCase().trim()
  // Exact match first
  const exact = entries.find((e) => e.ingredientName.toLowerCase() === q)
  if (exact) return exact
  // Partial match
  return entries.find((e) => e.ingredientName.toLowerCase().includes(q))
}

/** Get all nutrition entries */
export function getAllNutritionEntries(): NutritionEntry[] {
  return entries
}

/** Scale nutrition data from per-100g to a specific weight in grams */
export function scaleToGrams(entry: NutritionEntry, grams: number): MacroSummary {
  const factor = grams / entry.servingSize
  return {
    calories: Math.round(entry.calories * factor),
    protein: Math.round(entry.protein * factor * 10) / 10,
    fat: Math.round(entry.fat * factor * 10) / 10,
    carbohydrates: Math.round(entry.carbohydrates * factor * 10) / 10,
    fiber: entry.fiber != null ? Math.round(entry.fiber * factor * 10) / 10 : null,
  }
}

type RecipeIngredientInput = {
  name: string
  quantityGrams: number
}

/** Calculate nutrition summary for a recipe given ingredients with gram quantities */
export function calculateRecipeNutrition(
  recipeId: string,
  ingredients: RecipeIngredientInput[],
  servings: number
): RecipeNutritionSummary {
  const totals: MacroSummary = {
    calories: 0,
    protein: 0,
    fat: 0,
    carbohydrates: 0,
    fiber: 0,
  }

  let matchedCount = 0
  const missing: string[] = []

  for (const ing of ingredients) {
    const entry = findBestMatch(ing.name)
    if (!entry) {
      missing.push(ing.name)
      continue
    }
    matchedCount++
    const scaled = scaleToGrams(entry, ing.quantityGrams)
    totals.calories += scaled.calories
    totals.protein += scaled.protein
    totals.fat += scaled.fat
    totals.carbohydrates += scaled.carbohydrates
    if (scaled.fiber != null) {
      totals.fiber = (totals.fiber ?? 0) + scaled.fiber
    }
  }

  const coverage = ingredients.length > 0 ? matchedCount / ingredients.length : 0

  const perServing: MacroSummary =
    servings > 0
      ? {
          calories: Math.round(totals.calories / servings),
          protein: Math.round((totals.protein / servings) * 10) / 10,
          fat: Math.round((totals.fat / servings) * 10) / 10,
          carbohydrates: Math.round((totals.carbohydrates / servings) * 10) / 10,
          fiber: totals.fiber != null ? Math.round((totals.fiber / servings) * 10) / 10 : null,
        }
      : totals

  return {
    recipeId,
    servings,
    perServing,
    totalRecipe: {
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein * 10) / 10,
      fat: Math.round(totals.fat * 10) / 10,
      carbohydrates: Math.round(totals.carbohydrates * 10) / 10,
      fiber: totals.fiber != null ? Math.round(totals.fiber * 10) / 10 : null,
    },
    coverage: Math.round(coverage * 100) / 100,
    missingIngredients: missing,
    disclaimer: NUTRITION_DISCLAIMER,
  }
}
