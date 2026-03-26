// Recipe Photo Import - Server Actions
// Saves vision-parsed recipes (from parseRecipeFromImage) to the database.
// Bridges the ParsedRecipe schema from vision parsing to the recipe DB schema.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type { ParsedRecipe, ParsedIngredient } from '@/lib/ai/parse-recipe-schema'
import type { Database } from '@/types/database'

type RecipeCategory = Database['public']['Enums']['recipe_category']
type IngredientCategory = Database['public']['Enums']['ingredient_category']

export type PhotoImportResult =
  | {
      success: true
      recipeId: string
      name: string
      ingredientCount: number
    }
  | {
      success: false
      error: string
    }

/**
 * Save a vision-parsed recipe to the database.
 * Accepts the ParsedRecipe shape from parseRecipeFromImage.
 */
export async function saveVisionParsedRecipe(
  parsed: ParsedRecipe,
  sourceNote?: string
): Promise<PhotoImportResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  try {
    // Create the recipe
    const { data: recipe, error: recipeError } = await db
      .from('recipes')
      .insert({
        tenant_id: user.tenantId!,
        name: parsed.name,
        category: parsed.category as RecipeCategory,
        method: parsed.method,
        method_detailed: parsed.method_detailed || null,
        description: parsed.description || null,
        notes: sourceNote ? `Imported from photo. ${sourceNote}` : 'Imported from photo.',
        prep_time_minutes: parsed.prep_time_minutes || null,
        cook_time_minutes: parsed.cook_time_minutes || null,
        total_time_minutes: parsed.total_time_minutes || null,
        yield_quantity: parsed.yield_quantity || null,
        yield_unit: parsed.yield_unit || null,
        yield_description: parsed.yield_description || null,
        dietary_tags: parsed.dietary_tags || [],
        allergen_flags: parsed.allergen_flags || [],
        created_by: user.id,
        updated_by: user.id,
      })
      .select('id')
      .single()

    if (recipeError || !recipe) {
      console.error('[saveVisionParsedRecipe] Recipe insert error:', recipeError)
      return { success: false, error: 'Failed to create recipe. Please try again.' }
    }

    // Add each ingredient
    let addedCount = 0
    for (let i = 0; i < parsed.ingredients.length; i++) {
      const ing = parsed.ingredients[i]
      if (!ing.name) continue

      try {
        const ingredientId = await findOrCreateIngredient(
          db,
          user.tenantId!,
          user.id,
          ing.name,
          ing.category as IngredientCategory
        )

        await db.from('recipe_ingredients').insert({
          recipe_id: recipe.id,
          ingredient_id: ingredientId,
          quantity: ing.quantity || 1,
          unit: ing.unit || 'unit',
          preparation_notes: ing.preparation_notes || null,
          is_optional: ing.is_optional || false,
          sort_order: i,
        })

        addedCount++
      } catch (err) {
        // Non-blocking: continue with other ingredients
        console.error(`[saveVisionParsedRecipe] Failed to add ingredient "${ing.name}":`, err)
      }
    }

    revalidatePath('/recipes')
    revalidatePath(`/recipes/${recipe.id}`)

    return {
      success: true,
      recipeId: recipe.id,
      name: parsed.name,
      ingredientCount: addedCount,
    }
  } catch (err) {
    console.error('[saveVisionParsedRecipe] Unexpected error:', err)
    return { success: false, error: 'An unexpected error occurred. Please try again.' }
  }
}

/**
 * Save multiple vision-parsed recipes in sequence.
 */
export async function saveVisionParsedRecipeBatch(
  recipes: { parsed: ParsedRecipe; filename: string }[]
): Promise<{
  results: {
    filename: string
    success: boolean
    recipeId?: string
    name?: string
    ingredientCount?: number
    error?: string
  }[]
}> {
  const results: {
    filename: string
    success: boolean
    recipeId?: string
    name?: string
    ingredientCount?: number
    error?: string
  }[] = []

  for (const item of recipes) {
    const result = await saveVisionParsedRecipe(item.parsed, `Source: ${item.filename}`)
    if (result.success) {
      results.push({
        filename: item.filename,
        success: true,
        recipeId: result.recipeId,
        name: result.name,
        ingredientCount: result.ingredientCount,
      })
    } else {
      results.push({
        filename: item.filename,
        success: false,
        error: result.error,
      })
    }
  }

  return { results }
}

// ============================================
// HELPER: Find or create ingredient
// ============================================

async function findOrCreateIngredient(
  db: ReturnType<typeof createServerClient>,
  tenantId: string,
  userId: string,
  name: string,
  category: IngredientCategory = 'other'
): Promise<string> {
  const normalizedName = name.trim()

  // Case-insensitive lookup
  const { data: existing } = await db
    .from('ingredients')
    .select('id')
    .eq('tenant_id', tenantId)
    .ilike('name', normalizedName)
    .limit(1)
    .single()

  if (existing) return existing.id

  // Map vision ingredient categories to DB ingredient categories
  const validCategories: IngredientCategory[] = [
    'protein',
    'produce',
    'dairy',
    'pantry',
    'spice',
    'oil',
    'alcohol',
    'baking',
    'frozen',
    'canned',
    'fresh_herb',
    'dry_herb',
    'condiment',
    'beverage',
    'specialty',
    'other',
  ]
  const dbCategory = validCategories.includes(category) ? category : 'other'

  const { data: newIngredient, error } = await db
    .from('ingredients')
    .insert({
      tenant_id: tenantId,
      name: normalizedName,
      category: dbCategory,
      default_unit: 'unit',
      dietary_tags: [],
      allergen_flags: [],
      created_by: userId,
      updated_by: userId,
    })
    .select('id')
    .single()

  if (error || !newIngredient) {
    throw new Error(`Failed to create ingredient "${normalizedName}"`)
  }

  return newIngredient.id
}
