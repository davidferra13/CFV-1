// Nutritional Analysis Server Actions
// Feature 6.1: USDA FoodData Central integration
// Chef-scoped, tenant-isolated

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  searchFoods,
  getFoodDetails,
  extractNutrients,
  scaleNutrients,
  sumNutrients,
  EMPTY_NUTRIENTS,
} from './usda-client'
import type { NutrientInfo, USDAFoodSearchResult } from './usda-client'

export type { NutrientInfo, USDAFoodSearchResult }

// ============================================
// TYPES
// ============================================

export type RecipeNutritionResult = {
  recipeId: string
  recipeName: string
  servings: number
  totalNutrients: NutrientInfo
  perServingNutrients: NutrientInfo
  ingredients: IngredientNutritionRow[]
  hasOverride: boolean
  overrideData: NutrientInfo | null
  completeness: number // 0-100, % of ingredients with USDA match
}

export type IngredientNutritionRow = {
  ingredientId: string
  ingredientName: string
  quantity: number
  unit: string
  fdcId: number | null
  nutrients: NutrientInfo
  isEstimated: boolean
}

export type MenuNutritionResult = {
  menuId: string
  menuName: string
  totalNutrients: NutrientInfo
  courses: CourseNutrition[]
  dietaryIndicators: DietaryIndicator[]
}

export type CourseNutrition = {
  courseNumber: number
  courseName: string
  dishes: DishNutrition[]
  courseTotal: NutrientInfo
}

export type DishNutrition = {
  dishId: string
  dishName: string
  nutrients: NutrientInfo
}

export type DietaryIndicator = {
  label: string
  met: boolean
  description: string
}

// ============================================
// 1. SEARCH USDA FOOD DATABASE
// ============================================

/**
 * Search USDA FoodData Central for foods matching a query.
 * No tenant scoping needed since this is a public database lookup.
 */
export async function searchFoodDatabase(query: string): Promise<{
  success: boolean
  results: USDAFoodSearchResult[]
  error?: string
}> {
  // Still require auth so anonymous users can't abuse the API
  await requireChef()

  try {
    const results = await searchFoods(query, 15)
    return { success: true, results }
  } catch (err) {
    console.error('[searchFoodDatabase] Error:', err)
    return { success: false, results: [], error: 'Failed to search USDA database' }
  }
}

// ============================================
// 2. GET FOOD NUTRIENTS BY FDC ID
// ============================================

/**
 * Get detailed nutrient data for a specific USDA food item.
 */
export async function getFoodNutrients(fdcId: number): Promise<{
  success: boolean
  nutrients: NutrientInfo | null
  description: string | null
  error?: string
}> {
  await requireChef()

  try {
    const detail = await getFoodDetails(fdcId)
    if (!detail) {
      return { success: false, nutrients: null, description: null, error: 'Food not found' }
    }

    const nutrients = extractNutrients(detail)
    return { success: true, nutrients, description: detail.description }
  } catch (err) {
    console.error('[getFoodNutrients] Error:', err)
    return {
      success: false,
      nutrients: null,
      description: null,
      error: 'Failed to fetch nutrient data',
    }
  }
}

// ============================================
// 3. CALCULATE RECIPE NUTRITION
// ============================================

/**
 * Calculate total and per-serving nutrition for a recipe
 * by summing USDA nutrient data across all recipe ingredients.
 *
 * Ingredients store quantity/unit but not weight in grams,
 * so we use a rough unit-to-gram conversion for common units.
 * Ingredients without a USDA fdcId match are flagged as incomplete.
 */
export async function calculateRecipeNutrition(recipeId: string): Promise<{
  success: boolean
  data: RecipeNutritionResult | null
  error?: string
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  try {
    // Fetch recipe
    const { data: recipe, error: recipeErr } = await db
      .from('recipes')
      .select('id, name, yield_quantity, yield_unit, dietary_tags')
      .eq('id', recipeId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (recipeErr || !recipe) {
      return { success: false, data: null, error: 'Recipe not found' }
    }

    // Fetch recipe ingredients with joined ingredient details
    const { data: recipeIngredients, error: riErr } = await db
      .from('recipe_ingredients')
      .select('id, ingredient_id, quantity, unit, ingredients(id, name, unknown_fields)')
      .eq('recipe_id', recipeId)

    if (riErr) {
      console.error('[calculateRecipeNutrition] Error fetching ingredients:', riErr)
      return { success: false, data: null, error: 'Failed to fetch recipe ingredients' }
    }

    const ingredientRows: IngredientNutritionRow[] = []
    let matchedCount = 0

    for (const ri of recipeIngredients || []) {
      const ingredient = ri.ingredients as unknown as {
        id: string
        name: string
        unknown_fields: Record<string, unknown> | null
      } | null

      if (!ingredient) continue

      // Check if this ingredient has a USDA FDC ID stored in unknown_fields
      const fdcId = (ingredient.unknown_fields as Record<string, unknown>)?.usda_fdc_id as
        | number
        | null
      const storedNutrientsPer100g = (ingredient.unknown_fields as Record<string, unknown>)
        ?.usda_nutrients_per_100g as NutrientInfo | null

      let nutrients = { ...EMPTY_NUTRIENTS }
      let isEstimated = true

      if (fdcId && storedNutrientsPer100g) {
        // Convert quantity+unit to approximate grams, then scale nutrients
        const weightGrams = estimateWeightGrams(ri.quantity, ri.unit)
        nutrients = scaleNutrients(storedNutrientsPer100g, weightGrams)
        isEstimated = false
        matchedCount++
      }

      ingredientRows.push({
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        quantity: ri.quantity,
        unit: ri.unit,
        fdcId,
        nutrients,
        isEstimated,
      })
    }

    const totalIngredients = ingredientRows.length
    const completeness =
      totalIngredients > 0 ? Math.round((matchedCount / totalIngredients) * 100) : 0

    const totalNutrients = sumNutrients(ingredientRows.map((r) => r.nutrients))
    const servings = recipe.yield_quantity || 1
    const perServingNutrients = divideNutrients(totalNutrients, servings)

    // Check for manual override in unknown_fields
    const overrideData = null as NutrientInfo | null // Future: read from recipe.unknown_fields

    return {
      success: true,
      data: {
        recipeId: recipe.id,
        recipeName: recipe.name,
        servings,
        totalNutrients,
        perServingNutrients,
        ingredients: ingredientRows,
        hasOverride: !!overrideData,
        overrideData,
        completeness,
      },
    }
  } catch (err) {
    console.error('[calculateRecipeNutrition] Error:', err)
    return { success: false, data: null, error: 'Failed to calculate recipe nutrition' }
  }
}

// ============================================
// 4. SAVE NUTRITION OVERRIDE
// ============================================

/**
 * Manually override calculated nutrition values for a recipe.
 * Stored in recipe.unknown_fields.nutrition_override.
 */
export async function saveNutritionOverride(
  recipeId: string,
  data: NutrientInfo
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  try {
    // Verify recipe belongs to this chef
    const { data: recipe, error: fetchErr } = await db
      .from('recipes')
      .select('id, unknown_fields')
      .eq('id', recipeId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (fetchErr || !recipe) {
      return { success: false, error: 'Recipe not found' }
    }

    const existingFields = (recipe.unknown_fields as Record<string, unknown>) || {}

    const { error: updateErr } = await db
      .from('recipes')
      .update({
        unknown_fields: {
          ...existingFields,
          nutrition_override: data,
          nutrition_override_at: new Date().toISOString(),
        },
      })
      .eq('id', recipeId)
      .eq('tenant_id', user.tenantId!)

    if (updateErr) {
      console.error('[saveNutritionOverride] Error:', updateErr)
      return { success: false, error: 'Failed to save nutrition override' }
    }

    return { success: true }
  } catch (err) {
    console.error('[saveNutritionOverride] Error:', err)
    return { success: false, error: 'Failed to save nutrition override' }
  }
}

// ============================================
// 5. GET MENU NUTRITION
// ============================================

/**
 * Aggregate nutrition for all dishes in a menu.
 * Rolls up recipe nutrition per dish, grouped by course.
 */
export async function getMenuNutrition(menuId: string): Promise<{
  success: boolean
  data: MenuNutritionResult | null
  error?: string
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  try {
    // Fetch menu
    const { data: menu, error: menuErr } = await db
      .from('menus')
      .select('id, name')
      .eq('id', menuId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (menuErr || !menu) {
      return { success: false, data: null, error: 'Menu not found' }
    }

    // Fetch dishes with their linked recipe IDs
    const { data: dishes, error: dishErr } = await db
      .from('dishes')
      .select('id, name, course_number, course_name, recipe_id')
      .eq('menu_id', menuId)
      .eq('tenant_id', user.tenantId!)
      .order('course_number', { ascending: true })
      .order('sort_order', { ascending: true })

    if (dishErr) {
      return { success: false, data: null, error: 'Failed to fetch menu dishes' }
    }

    // Build course map
    const courseMap = new Map<number, { name: string; dishes: DishNutrition[] }>()

    for (const dish of dishes || []) {
      let dishNutrients = { ...EMPTY_NUTRIENTS }

      // If dish has a linked recipe, calculate its nutrition
      if (dish.recipe_id) {
        const result = await calculateRecipeNutrition(dish.recipe_id)
        if (result.success && result.data) {
          // Use per-serving nutrients for the dish contribution
          dishNutrients = result.data.perServingNutrients
        }
      }

      const courseNum = dish.course_number || 1
      if (!courseMap.has(courseNum)) {
        courseMap.set(courseNum, {
          name: dish.course_name || `Course ${courseNum}`,
          dishes: [],
        })
      }

      courseMap.get(courseNum)!.dishes.push({
        dishId: dish.id,
        dishName: dish.name,
        nutrients: dishNutrients,
      })
    }

    // Build courses array
    const courses: CourseNutrition[] = []
    for (const [courseNumber, courseData] of courseMap) {
      courses.push({
        courseNumber,
        courseName: courseData.name,
        dishes: courseData.dishes,
        courseTotal: sumNutrients(courseData.dishes.map((d) => d.nutrients)),
      })
    }

    const totalNutrients = sumNutrients(courses.map((c) => c.courseTotal))

    // Evaluate dietary indicators
    const dietaryIndicators = evaluateDietaryIndicators(totalNutrients)

    return {
      success: true,
      data: {
        menuId: menu.id,
        menuName: menu.name,
        totalNutrients,
        courses,
        dietaryIndicators,
      },
    }
  } catch (err) {
    console.error('[getMenuNutrition] Error:', err)
    return { success: false, data: null, error: 'Failed to calculate menu nutrition' }
  }
}

// ============================================
// HELPERS
// ============================================

/** Divide nutrient values by a number of servings. */
function divideNutrients(total: NutrientInfo, servings: number): NutrientInfo {
  if (servings <= 0) return total
  return {
    calories: Math.round(total.calories / servings),
    protein_g: Math.round((total.protein_g / servings) * 10) / 10,
    carbs_g: Math.round((total.carbs_g / servings) * 10) / 10,
    fat_g: Math.round((total.fat_g / servings) * 10) / 10,
    fiber_g: Math.round((total.fiber_g / servings) * 10) / 10,
    sodium_mg: Math.round(total.sodium_mg / servings),
    sugar_g: Math.round((total.sugar_g / servings) * 10) / 10,
  }
}

/**
 * Rough conversion from common cooking units to grams.
 * USDA data is per 100g, so we need weight in grams.
 * This is approximate. Chefs can override with manual values.
 */
function estimateWeightGrams(quantity: number, unit: string): number {
  const u = unit.toLowerCase().trim()

  // Weight units (direct)
  if (u === 'g' || u === 'gram' || u === 'grams') return quantity
  if (u === 'kg' || u === 'kilogram' || u === 'kilograms') return quantity * 1000
  if (u === 'oz' || u === 'ounce' || u === 'ounces') return quantity * 28.35
  if (u === 'lb' || u === 'lbs' || u === 'pound' || u === 'pounds') return quantity * 453.6

  // Volume units (approximate, assumes water-like density)
  if (u === 'ml' || u === 'milliliter' || u === 'milliliters') return quantity
  if (u === 'l' || u === 'liter' || u === 'liters') return quantity * 1000
  if (u === 'tsp' || u === 'teaspoon' || u === 'teaspoons') return quantity * 5
  if (u === 'tbsp' || u === 'tablespoon' || u === 'tablespoons') return quantity * 15
  if (u === 'cup' || u === 'cups') return quantity * 240
  if (u === 'fl oz' || u === 'fluid ounce' || u === 'fluid ounces') return quantity * 30
  if (u === 'pint' || u === 'pints') return quantity * 473
  if (u === 'quart' || u === 'quarts') return quantity * 946
  if (u === 'gallon' || u === 'gallons') return quantity * 3785

  // Count units (rough estimate: 1 "unit" ~ 100g, 1 "bunch" ~ 150g)
  if (u === 'unit' || u === 'each' || u === 'piece' || u === 'pieces') return quantity * 100
  if (u === 'bunch' || u === 'bunches') return quantity * 150
  if (u === 'clove' || u === 'cloves') return quantity * 5
  if (u === 'slice' || u === 'slices') return quantity * 30
  if (u === 'sprig' || u === 'sprigs') return quantity * 2
  if (u === 'pinch') return quantity * 0.5
  if (u === 'dash') return quantity * 0.5

  // Unknown unit: default to quantity * 100g (one "portion")
  return quantity * 100
}

/**
 * Evaluate dietary compliance indicators based on total nutrient values.
 * These are per-meal thresholds (not daily values).
 */
function evaluateDietaryIndicators(nutrients: NutrientInfo): DietaryIndicator[] {
  return [
    {
      label: 'Low Sodium',
      met: nutrients.sodium_mg < 600,
      description:
        nutrients.sodium_mg < 600
          ? `${nutrients.sodium_mg}mg sodium (under 600mg threshold)`
          : `${nutrients.sodium_mg}mg sodium (over 600mg threshold)`,
    },
    {
      label: 'High Protein',
      met: nutrients.protein_g > 30,
      description:
        nutrients.protein_g > 30
          ? `${nutrients.protein_g}g protein (over 30g threshold)`
          : `${nutrients.protein_g}g protein (under 30g threshold)`,
    },
    {
      label: 'Low Carb',
      met: nutrients.carbs_g < 50,
      description:
        nutrients.carbs_g < 50
          ? `${nutrients.carbs_g}g carbs (under 50g threshold)`
          : `${nutrients.carbs_g}g carbs (over 50g threshold)`,
    },
    {
      label: 'High Fiber',
      met: nutrients.fiber_g > 10,
      description:
        nutrients.fiber_g > 10
          ? `${nutrients.fiber_g}g fiber (over 10g threshold)`
          : `${nutrients.fiber_g}g fiber (under 10g threshold)`,
    },
    {
      label: 'Low Sugar',
      met: nutrients.sugar_g < 25,
      description:
        nutrients.sugar_g < 25
          ? `${nutrients.sugar_g}g sugar (under 25g threshold)`
          : `${nutrients.sugar_g}g sugar (over 25g threshold)`,
    },
  ]
}
