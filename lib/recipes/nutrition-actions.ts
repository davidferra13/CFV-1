'use server'

// Recipe Nutrition - aggregates USDA nutrition data for all ingredients in a recipe.
// On-demand only (called when chef clicks "Show Nutrition") because it makes
// one USDA API call per ingredient. Results are Upstash-cached for 30 days
// upstream in lib/nutrition/usda.ts, so repeat lookups are free.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { searchFoods, getNutritionSummary } from '@/lib/nutrition/usda'
import type { NutritionSummary } from '@/lib/nutrition/usda'

// ── Types ────────────────────────────────────────────────────────────────────

export type RecipeNutritionResult = {
  /** Per-serving totals (divided by yield_quantity) */
  perServing: NutritionTotals
  /** Whole-recipe totals */
  wholeRecipe: NutritionTotals
  /** How many servings the recipe makes */
  servings: number
  /** Per-ingredient breakdown so chefs can see what contributes what */
  ingredients: IngredientNutrition[]
  /** How many ingredients we could NOT find nutrition data for */
  missingCount: number
}

export type NutritionTotals = {
  calories: number
  protein: number
  fat: number
  carbs: number
  fiber: number
  sodium: number
}

export type IngredientNutrition = {
  name: string
  quantity: number
  unit: string
  estimatedGrams: number | null
  matched: boolean
  usdaName: string | null
  calories: number | null
  protein: number | null
  fat: number | null
  carbs: number | null
  fiber: number | null
  sodium: number | null
}

// ── Unit → grams estimation ──────────────────────────────────────────────────
// USDA data is per 100g. We need to estimate how many grams each ingredient
// line represents. For weight units this is exact; for volume units we use
// water-density approximation (1 mL ≈ 1 g). This is an estimate, not a lab
// measurement - acceptable for a nutrition summary panel.

const GRAMS_PER_UNIT: Record<string, number> = {
  // Weight - exact
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,

  // Volume - water-density approximation (1 mL ≈ 1 g)
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  l: 1000,
  liter: 1000,
  liters: 1000,
  cup: 236.588,
  cups: 236.588,
  tbsp: 14.787,
  tablespoon: 14.787,
  tablespoons: 14.787,
  tsp: 4.929,
  teaspoon: 4.929,
  teaspoons: 4.929,
  floz: 29.574,
  'fl oz': 29.574,
  'fluid ounce': 29.574,
  'fluid ounces': 29.574,
  pint: 473.176,
  pints: 473.176,
  pt: 473.176,
  quart: 946.353,
  quarts: 946.353,
  qt: 946.353,
  gallon: 3785.41,
  gallons: 3785.41,
  gal: 3785.41,

  // Count-based - rough average for produce items (~100g each)
  each: 100,
  whole: 100,
  piece: 100,
  pieces: 100,
  clove: 5,
  cloves: 5,
  bunch: 150,
  head: 500,
  stalk: 60,
  stalks: 60,
  sprig: 2,
  sprigs: 2,
  pinch: 0.5,
  dash: 0.5,
  slice: 30,
  slices: 30,
  stick: 113.4, // stick of butter
  sticks: 113.4,
  can: 400,
  cans: 400,
}

function estimateGrams(quantity: number, unit: string): number | null {
  const normalized = unit.toLowerCase().trim()
  const factor = GRAMS_PER_UNIT[normalized]
  if (factor == null) return null
  return Math.round(quantity * factor * 100) / 100
}

// ── Main action ──────────────────────────────────────────────────────────────

export async function getRecipeNutrition(recipeId: string): Promise<RecipeNutritionResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  // 1. Fetch recipe + ingredients
  const { data: recipe, error: recipeError } = await db
    .from('recipes')
    .select('id, name, yield_quantity, yield_unit')
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (recipeError || !recipe) {
    throw new Error('Recipe not found')
  }

  const { data: recipeIngredients } = await db
    .from('recipe_ingredients')
    .select(
      `
      id,
      quantity,
      unit,
      is_optional,
      ingredient:ingredients(id, name)
    `
    )
    .eq('recipe_id', recipeId)
    .order('sort_order', { ascending: true })

  const ingredients = recipeIngredients || []

  if (ingredients.length === 0) {
    return {
      perServing: { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sodium: 0 },
      wholeRecipe: { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sodium: 0 },
      servings: recipe.yield_quantity || 1,
      ingredients: [],
      missingCount: 0,
    }
  }

  // 2. For each ingredient, search USDA and get nutrition per 100g
  const ingredientResults: IngredientNutrition[] = []
  let missingCount = 0

  for (const ri of ingredients) {
    const ing = ri.ingredient as { id: string; name: string }
    const ingredientName = ing?.name || 'Unknown'
    const gramsEstimate = estimateGrams(ri.quantity, ri.unit)

    // Search USDA for this ingredient
    let nutrition: NutritionSummary | null = null
    try {
      const searchResults = await searchFoods(ingredientName, 3)
      if (searchResults.length > 0) {
        // Use the first (best) match
        nutrition = await getNutritionSummary(searchResults[0].fdcId)
      }
    } catch {
      // USDA API failed for this ingredient - skip it gracefully
    }

    if (!nutrition || gramsEstimate == null) {
      missingCount++
      ingredientResults.push({
        name: ingredientName,
        quantity: ri.quantity,
        unit: ri.unit,
        estimatedGrams: gramsEstimate,
        matched: false,
        usdaName: nutrition?.name || null,
        calories: null,
        protein: null,
        fat: null,
        carbs: null,
        fiber: null,
        sodium: null,
      })
      continue
    }

    // USDA values are per 100g. Scale to the estimated weight of this ingredient line.
    const scale = gramsEstimate / 100

    ingredientResults.push({
      name: ingredientName,
      quantity: ri.quantity,
      unit: ri.unit,
      estimatedGrams: gramsEstimate,
      matched: true,
      usdaName: nutrition.name,
      calories: nutrition.calories != null ? Math.round(nutrition.calories * scale) : null,
      protein: nutrition.protein != null ? Math.round(nutrition.protein * scale * 10) / 10 : null,
      fat: nutrition.fat != null ? Math.round(nutrition.fat * scale * 10) / 10 : null,
      carbs: nutrition.carbs != null ? Math.round(nutrition.carbs * scale * 10) / 10 : null,
      fiber: nutrition.fiber != null ? Math.round(nutrition.fiber * scale * 10) / 10 : null,
      sodium: nutrition.sodium != null ? Math.round(nutrition.sodium * scale * 10) / 10 : null,
    })
  }

  // 3. Aggregate whole-recipe totals
  const wholeRecipe: NutritionTotals = {
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    fiber: 0,
    sodium: 0,
  }

  for (const ing of ingredientResults) {
    if (!ing.matched) continue
    wholeRecipe.calories += ing.calories ?? 0
    wholeRecipe.protein += ing.protein ?? 0
    wholeRecipe.fat += ing.fat ?? 0
    wholeRecipe.carbs += ing.carbs ?? 0
    wholeRecipe.fiber += ing.fiber ?? 0
    wholeRecipe.sodium += ing.sodium ?? 0
  }

  // Round whole-recipe totals
  wholeRecipe.calories = Math.round(wholeRecipe.calories)
  wholeRecipe.protein = Math.round(wholeRecipe.protein * 10) / 10
  wholeRecipe.fat = Math.round(wholeRecipe.fat * 10) / 10
  wholeRecipe.carbs = Math.round(wholeRecipe.carbs * 10) / 10
  wholeRecipe.fiber = Math.round(wholeRecipe.fiber * 10) / 10
  wholeRecipe.sodium = Math.round(wholeRecipe.sodium * 10) / 10

  // 4. Compute per-serving
  const servings = recipe.yield_quantity || 1
  const perServing: NutritionTotals = {
    calories: Math.round(wholeRecipe.calories / servings),
    protein: Math.round((wholeRecipe.protein / servings) * 10) / 10,
    fat: Math.round((wholeRecipe.fat / servings) * 10) / 10,
    carbs: Math.round((wholeRecipe.carbs / servings) * 10) / 10,
    fiber: Math.round((wholeRecipe.fiber / servings) * 10) / 10,
    sodium: Math.round((wholeRecipe.sodium / servings) * 10) / 10,
  }

  return {
    perServing,
    wholeRecipe,
    servings,
    ingredients: ingredientResults,
    missingCount,
  }
}
