'use server'

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getNutritionSummary, searchFoods } from '@/lib/nutrition/usda'
import { WEIGHT_CONVERSIONS, VOLUME_CONVERSIONS } from '@/lib/costing/knowledge'

const DraftIngredientSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
})

const DraftInputSchema = z.object({
  ingredients: z.array(DraftIngredientSchema),
  servings: z.number().positive().optional(),
})

export type NutrientTotals = {
  calories: number
  protein: number
  fat: number
  carbs: number
  fiber: number
  sodium: number
}

export type NutritionalSnapshot = {
  servings: number
  totals: NutrientTotals
  perServing: NutrientTotals
  missingIngredientCount: number
  ingredients: Array<{
    name: string
    quantity: number
    unit: string
    matchedFood: string | null
    matched: boolean
    estimatedGrams: number | null
    calories: number | null
    protein: number | null
    fat: number | null
    carbs: number | null
    fiber: number | null
    sodium: number | null
    per100g?: {
      calories: number | null
      protein: number | null
      fat: number | null
      carbs: number | null
      fiber: number | null
      sodium: number | null
    }
  }>
}

// Derived from canonical constants in lib/costing/knowledge.ts
const GRAMS_PER_UNIT: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: WEIGHT_CONVERSIONS.KG_TO_G,
  oz: WEIGHT_CONVERSIONS.OZ_TO_G,
  lb: WEIGHT_CONVERSIONS.LB_TO_G,
  lbs: WEIGHT_CONVERSIONS.LB_TO_G,
  ml: 1, // water-density approximation
  l: VOLUME_CONVERSIONS.L_TO_ML,
  cup: VOLUME_CONVERSIONS.CUP_TO_ML,
  cups: VOLUME_CONVERSIONS.CUP_TO_ML,
  tbsp: VOLUME_CONVERSIONS.TBSP_TO_ML,
  tablespoon: VOLUME_CONVERSIONS.TBSP_TO_ML,
  teaspoons: VOLUME_CONVERSIONS.TSP_TO_ML,
  tsp: VOLUME_CONVERSIONS.TSP_TO_ML,
  each: 100,
  piece: 100,
  pieces: 100,
  clove: 5,
  cloves: 5,
  pinch: 0.5,
}

function estimateGrams(quantity: number, unit: string) {
  const normalized = unit.trim().toLowerCase()
  const factor = GRAMS_PER_UNIT[normalized]
  if (!factor) return null
  return Math.round(quantity * factor * 100) / 100
}

function emptyTotals(): NutrientTotals {
  return {
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    fiber: 0,
    sodium: 0,
  }
}

function roundTotals(totals: NutrientTotals): NutrientTotals {
  return {
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    fiber: Math.round(totals.fiber * 10) / 10,
    sodium: Math.round(totals.sodium * 10) / 10,
  }
}

async function calculateSnapshot(
  ingredients: Array<{ name: string; quantity: number; unit: string }>,
  servings: number
): Promise<NutritionalSnapshot> {
  const totals = emptyTotals()
  let missingIngredientCount = 0

  const enriched = await Promise.all(
    ingredients.map(async (ingredient) => {
      const grams = estimateGrams(ingredient.quantity, ingredient.unit)
      if (!grams) {
        missingIngredientCount += 1
        return {
          ...ingredient,
          matchedFood: null,
          matched: false,
          estimatedGrams: null,
          calories: null,
          protein: null,
          fat: null,
          carbs: null,
          fiber: null,
          sodium: null,
        }
      }

      try {
        const search = await searchFoods(ingredient.name, 1)
        if (!search.length) {
          missingIngredientCount += 1
          return {
            ...ingredient,
            matchedFood: null,
            matched: false,
            estimatedGrams: grams,
            calories: null,
            protein: null,
            fat: null,
            carbs: null,
            fiber: null,
            sodium: null,
          }
        }

        const nutrition = await getNutritionSummary(search[0].fdcId)
        if (!nutrition) {
          missingIngredientCount += 1
          return {
            ...ingredient,
            matchedFood: null,
            matched: false,
            estimatedGrams: grams,
            calories: null,
            protein: null,
            fat: null,
            carbs: null,
            fiber: null,
            sodium: null,
          }
        }

        const scale = grams / 100
        const row = {
          ...ingredient,
          matchedFood: nutrition.name,
          matched: true,
          estimatedGrams: grams,
          calories: nutrition.calories != null ? Math.round(nutrition.calories * scale) : null,
          protein:
            nutrition.protein != null ? Math.round(nutrition.protein * scale * 10) / 10 : null,
          fat: nutrition.fat != null ? Math.round(nutrition.fat * scale * 10) / 10 : null,
          carbs: nutrition.carbs != null ? Math.round(nutrition.carbs * scale * 10) / 10 : null,
          fiber: nutrition.fiber != null ? Math.round(nutrition.fiber * scale * 10) / 10 : null,
          sodium: nutrition.sodium != null ? Math.round(nutrition.sodium * scale * 10) / 10 : null,
          per100g: {
            calories: nutrition.calories,
            protein: nutrition.protein,
            fat: nutrition.fat,
            carbs: nutrition.carbs,
            fiber: nutrition.fiber,
            sodium: nutrition.sodium,
          },
        }

        totals.calories += row.calories ?? 0
        totals.protein += row.protein ?? 0
        totals.fat += row.fat ?? 0
        totals.carbs += row.carbs ?? 0
        totals.fiber += row.fiber ?? 0
        totals.sodium += row.sodium ?? 0

        return row
      } catch {
        missingIngredientCount += 1
        return {
          ...ingredient,
          matchedFood: null,
          matched: false,
          estimatedGrams: grams,
          calories: null,
          protein: null,
          fat: null,
          carbs: null,
          fiber: null,
          sodium: null,
        }
      }
    })
  )

  const roundedTotals = roundTotals(totals)
  const safeServings = Math.max(1, servings)

  const perServing = roundTotals({
    calories: roundedTotals.calories / safeServings,
    protein: roundedTotals.protein / safeServings,
    fat: roundedTotals.fat / safeServings,
    carbs: roundedTotals.carbs / safeServings,
    fiber: roundedTotals.fiber / safeServings,
    sodium: roundedTotals.sodium / safeServings,
  })

  return {
    servings: safeServings,
    totals: roundedTotals,
    perServing,
    missingIngredientCount,
    ingredients: enriched,
  }
}

export async function calculateNutritionalSnapshot(input: {
  ingredients: Array<{ name: string; quantity: number; unit: string }>
  servings?: number
}): Promise<NutritionalSnapshot> {
  const parsed = DraftInputSchema.parse(input)
  const servings = parsed.servings ?? 1
  return calculateSnapshot(parsed.ingredients, servings)
}

export async function saveRecipeNutritionalSnapshot(
  recipeId: string,
  snapshot: NutritionalSnapshot
) {
  const user = await requireChef()
  const db: any = createServerClient()

  await db
    .from('recipes')
    .update({
      calories_per_serving: snapshot.perServing.calories,
      calories_total: snapshot.totals.calories,
      protein_total_g: snapshot.totals.protein,
      fat_total_g: snapshot.totals.fat,
      carbs_total_g: snapshot.totals.carbs,
      fiber_total_g: snapshot.totals.fiber,
      sodium_total_mg: snapshot.totals.sodium,
      protein_per_serving_g: snapshot.perServing.protein,
      fat_per_serving_g: snapshot.perServing.fat,
      carbs_per_serving_g: snapshot.perServing.carbs,
      fiber_per_serving_g: snapshot.perServing.fiber,
      sodium_per_serving_mg: snapshot.perServing.sodium,
      nutrition_snapshot_json: snapshot as any,
      nutrition_calculated_at: new Date().toISOString(),
    } as any)
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)

  // Persist ingredient-level nutrition hints for future lookups.
  for (const row of snapshot.ingredients) {
    if (!row.matched || !row.per100g) continue

    await db
      .from('ingredients')
      .update({
        nutrition_calories_per_100g: row.per100g.calories,
        nutrition_protein_per_100g: row.per100g.protein,
        nutrition_fat_per_100g: row.per100g.fat,
        nutrition_carbs_per_100g: row.per100g.carbs,
        nutrition_fiber_per_100g: row.per100g.fiber,
        nutrition_sodium_mg_per_100g: row.per100g.sodium,
        nutrition_source: 'usda_fdc',
        nutrition_updated_at: new Date().toISOString(),
      } as any)
      .eq('tenant_id', user.tenantId!)
      .ilike('name', row.name)
      .limit(1)
  }

  return { ok: true }
}

export async function recalculateAndSaveRecipeNutrition(recipeId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: recipe, error: recipeError } = await db
    .from('recipes')
    .select('id, servings, yield_quantity')
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (recipeError || !recipe) {
    throw new Error('Recipe not found')
  }

  const { data: ingredients, error: ingredientError } = await db
    .from('recipe_ingredients')
    .select(
      `
      quantity,
      unit,
      ingredient:ingredients(name)
    `
    )
    .eq('recipe_id', recipeId)

  if (ingredientError) {
    throw new Error(`Failed to load recipe ingredients: ${ingredientError.message}`)
  }

  const draft = (ingredients ?? [])
    .map((row: any) => ({
      name: row.ingredient?.name,
      quantity: Number(row.quantity) || 0,
      unit: row.unit,
    }))
    .filter((row: any) => row.name && row.quantity > 0 && row.unit)

  if (!draft.length) {
    return { ok: true }
  }

  const snapshot = await calculateSnapshot(
    draft,
    (recipe.servings as number | null) ?? (recipe.yield_quantity as number | null) ?? 1
  )

  await saveRecipeNutritionalSnapshot(recipeId, snapshot)
  return snapshot
}
