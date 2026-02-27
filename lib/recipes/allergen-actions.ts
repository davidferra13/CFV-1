'use server'

// Allergen Detection Server Action — uses Edamam Nutrition Analysis API
// to identify allergens, cautions, and health labels from recipe ingredients.
// Non-blocking: if Edamam fails or keys are missing, returns empty arrays.
// Uses Upstash cache upstream (in lib/nutrition/edamam.ts) to stay under 10K/month limit.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { analyzeRecipe } from '@/lib/nutrition/edamam'

// ── Types ────────────────────────────────────────────────────────────────────

export type AllergenResult = {
  allergens: string[]
  cautions: string[]
  healthLabels: string[]
  calories: number | null
  protein: number | null
  fat: number | null
  carbs: number | null
  fiber: number | null
  configured: boolean
}

// ── Main Action ──────────────────────────────────────────────────────────────

/**
 * Detect allergens for a recipe by sending its ingredients to Edamam.
 * Returns allergen list, cautions, and health labels.
 *
 * Non-blocking: if Edamam is unavailable or keys are not set, returns empty arrays.
 * The `configured` field tells the UI whether API keys are present.
 */
export async function detectAllergens(recipeId: string): Promise<AllergenResult> {
  const user = await requireChef()
  const supabase = createServerClient()

  const emptyResult: AllergenResult = {
    allergens: [],
    cautions: [],
    healthLabels: [],
    calories: null,
    protein: null,
    fat: null,
    carbs: null,
    fiber: null,
    configured: !!(process.env.EDAMAM_APP_ID && process.env.EDAMAM_APP_KEY),
  }

  // 1. Fetch recipe ingredients
  const { data: recipe } = await supabase
    .from('recipes')
    .select('id, name')
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!recipe) {
    throw new Error('Recipe not found')
  }

  const { data: recipeIngredients } = await supabase
    .from('recipe_ingredients')
    .select(
      `
      quantity,
      unit,
      preparation_notes,
      ingredient:ingredients(name)
    `
    )
    .eq('recipe_id', recipeId)
    .order('sort_order', { ascending: true })

  const ingredients = recipeIngredients || []

  if (ingredients.length === 0) {
    return emptyResult
  }

  // 2. Build ingredient lines for Edamam
  // Format: "2 cups rice", "1 tbsp olive oil", etc.
  const ingredientLines = ingredients.map((ri) => {
    const ing = ri.ingredient as { name: string }
    const name = ing?.name || 'unknown'
    const prep = ri.preparation_notes ? `, ${ri.preparation_notes}` : ''
    return `${ri.quantity} ${ri.unit} ${name}${prep}`
  })

  // 3. Call Edamam (cached upstream in lib/nutrition/edamam.ts)
  try {
    const result = await analyzeRecipe(ingredientLines)

    if (!result) {
      return emptyResult
    }

    return {
      allergens: result.allergens,
      cautions: result.cautions,
      healthLabels: result.healthLabels,
      calories: result.calories,
      protein: result.protein,
      fat: result.fat,
      carbs: result.carbs,
      fiber: result.fiber,
      configured: true,
    }
  } catch (err) {
    console.error('[detectAllergens] Edamam call failed:', err)
    return emptyResult
  }
}
