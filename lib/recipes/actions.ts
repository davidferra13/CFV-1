// Recipe Book Server Actions
// Chef-only: Manage recipes, ingredients, and recipe-component linking
// Enforces tenant scoping

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Database } from '@/types/database'

type RecipeCategory = Database['public']['Enums']['recipe_category']
type RecipeCuisine = Database['public']['Enums']['recipe_cuisine']
type RecipeMealType = Database['public']['Enums']['recipe_meal_type']
type IngredientCategory = Database['public']['Enums']['ingredient_category']
type RecipeInsert = Database['public']['Tables']['recipes']['Insert']
type RecipeUpdate = Database['public']['Tables']['recipes']['Update']

type RecipeEvent = {
  id: string
  occasion: string | null
  event_date: string
  status: string
  client?: { full_name?: string | null } | null
}

type DishWithMenuEvent = {
  menu?: {
    event?: RecipeEvent | null
    name?: string | null
  } | null
} | null

// ============================================
// VALIDATION SCHEMAS
// ============================================

const RECIPE_CATEGORIES: [string, ...string[]] = [
  'sauce',
  'protein',
  'starch',
  'vegetable',
  'fruit',
  'dessert',
  'bread',
  'pasta',
  'soup',
  'salad',
  'appetizer',
  'condiment',
  'beverage',
  'other',
]

const RECIPE_CUISINES: [string, ...string[]] = [
  'italian',
  'french',
  'mexican',
  'japanese',
  'chinese',
  'indian',
  'mediterranean',
  'thai',
  'korean',
  'american',
  'southern',
  'middle_eastern',
  'fusion',
  'other',
]

const RECIPE_MEAL_TYPES: [string, ...string[]] = [
  'breakfast',
  'brunch',
  'lunch',
  'dinner',
  'snack_passed',
  'any',
]

const INGREDIENT_CATEGORIES: [string, ...string[]] = [
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

const CreateRecipeSchema = z.object({
  name: z.string().min(1, 'Recipe name required'),
  category: z.enum(RECIPE_CATEGORIES as [string, ...string[]]),
  method: z.string().default(''),
  method_detailed: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  adaptations: z.string().optional(),
  prep_time_minutes: z.number().int().positive().optional(),
  cook_time_minutes: z.number().int().positive().optional(),
  total_time_minutes: z.number().int().positive().optional(),
  yield_quantity: z.number().positive().optional(),
  yield_unit: z.string().optional(),
  yield_description: z.string().optional(),
  dietary_tags: z.array(z.string()).optional(),
  servings: z.number().int().positive().optional(),
  calories_per_serving: z.number().int().positive().optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  equipment: z.array(z.string()).optional(),
  cuisine: z.enum(RECIPE_CUISINES as [string, ...string[]]).optional(),
  meal_type: z.enum(RECIPE_MEAL_TYPES as [string, ...string[]]).optional(),
  season: z.array(z.string()).optional(),
  occasion_tags: z.array(z.string()).optional(),
})

export type CreateRecipeInput = z.infer<typeof CreateRecipeSchema>

const UpdateRecipeSchema = z.object({
  name: z.string().min(1, 'Recipe name required').optional(),
  category: z.enum(RECIPE_CATEGORIES as [string, ...string[]]).optional(),
  method: z.string().optional(),
  method_detailed: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  adaptations: z.string().nullable().optional(),
  prep_time_minutes: z.number().int().positive().nullable().optional(),
  cook_time_minutes: z.number().int().positive().nullable().optional(),
  total_time_minutes: z.number().int().positive().nullable().optional(),
  yield_quantity: z.number().positive().nullable().optional(),
  yield_unit: z.string().nullable().optional(),
  yield_description: z.string().nullable().optional(),
  dietary_tags: z.array(z.string()).optional(),
  servings: z.number().int().positive().nullable().optional(),
  calories_per_serving: z.number().int().positive().nullable().optional(),
  difficulty: z.number().int().min(1).max(5).nullable().optional(),
  equipment: z.array(z.string()).optional(),
  cuisine: z
    .enum(RECIPE_CUISINES as [string, ...string[]])
    .nullable()
    .optional(),
  meal_type: z
    .enum(RECIPE_MEAL_TYPES as [string, ...string[]])
    .nullable()
    .optional(),
  season: z.array(z.string()).optional(),
  occasion_tags: z.array(z.string()).optional(),
})

export type UpdateRecipeInput = z.infer<typeof UpdateRecipeSchema>

const AddIngredientToRecipeSchema = z.object({
  ingredient_name: z.string().min(1, 'Ingredient name required'),
  ingredient_category: z.enum(INGREDIENT_CATEGORIES as [string, ...string[]]).default('other'),
  ingredient_default_unit: z.string().default('unit'),
  quantity: z.number().positive(),
  unit: z.string().min(1, 'Unit required'),
  preparation_notes: z.string().optional(),
  is_optional: z.boolean().optional(),
  sort_order: z.number().int().optional(),
})

export type AddIngredientInput = z.infer<typeof AddIngredientToRecipeSchema>

const UpdateRecipeIngredientSchema = z.object({
  quantity: z.number().positive().optional(),
  unit: z.string().min(1).optional(),
  preparation_notes: z.string().nullable().optional(),
  is_optional: z.boolean().optional(),
  sort_order: z.number().int().optional(),
})

export type UpdateRecipeIngredientInput = z.infer<typeof UpdateRecipeIngredientSchema>

const CreateIngredientSchema = z.object({
  name: z.string().min(1, 'Ingredient name required'),
  category: z.enum(INGREDIENT_CATEGORIES as [string, ...string[]]).default('other'),
  default_unit: z.string().default('unit'),
  description: z.string().optional(),
  average_price_cents: z.number().int().nonnegative().optional(),
  is_staple: z.boolean().optional(),
  allergen_flags: z.array(z.string()).optional(),
  dietary_tags: z.array(z.string()).optional(),
})

export type CreateIngredientInput = z.infer<typeof CreateIngredientSchema>

const UpdateIngredientSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum(INGREDIENT_CATEGORIES as [string, ...string[]]).optional(),
  default_unit: z.string().optional(),
  description: z.string().nullable().optional(),
  average_price_cents: z.number().int().nonnegative().nullable().optional(),
  is_staple: z.boolean().optional(),
  allergen_flags: z.array(z.string()).optional(),
  dietary_tags: z.array(z.string()).optional(),
})

export type UpdateIngredientInput = z.infer<typeof UpdateIngredientSchema>

// ============================================
// 1. CREATE RECIPE
// ============================================

export async function createRecipe(input: CreateRecipeInput) {
  const user = await requireChef()
  const db: any = createServerClient()
  const validated = CreateRecipeSchema.parse(input)
  const recipeInsert: RecipeInsert = {
    tenant_id: user.tenantId!,
    name: validated.name,
    category: validated.category as RecipeCategory,
    method: validated.method || '',
    method_detailed: validated.method_detailed || null,
    description: validated.description || null,
    notes: validated.notes || null,
    adaptations: validated.adaptations || null,
    prep_time_minutes: validated.prep_time_minutes || null,
    cook_time_minutes: validated.cook_time_minutes || null,
    total_time_minutes: validated.total_time_minutes || null,
    yield_quantity: validated.yield_quantity || null,
    yield_unit: validated.yield_unit || null,
    yield_description: validated.yield_description || null,
    dietary_tags: validated.dietary_tags || [],
    servings: validated.servings || null,
    calories_per_serving: validated.calories_per_serving || null,
    difficulty: validated.difficulty || null,
    equipment: validated.equipment || [],
    cuisine: (validated.cuisine as RecipeCuisine | undefined) ?? null,
    meal_type: (validated.meal_type as RecipeMealType | undefined) ?? null,
    season: validated.season || [],
    occasion_tags: validated.occasion_tags || [],
    created_by: user.id,
    updated_by: user.id,
  }

  const { data: recipe, error } = await db.from('recipes').insert(recipeInsert).select().single()

  if (error) {
    console.error('[createRecipe] Error:', error)
    throw new Error('Failed to create recipe')
  }

  revalidatePath('/recipes')
  return { success: true, recipe }
}

// ============================================
// 2. GET RECIPES (list with filters)
// ============================================

export type RecipeListItem = {
  id: string
  name: string
  category: RecipeCategory
  method: string
  dietary_tags: string[]
  servings: number | null
  calories_per_serving: number | null
  prep_time_minutes: number | null
  cook_time_minutes: number | null
  yield_quantity: number | null
  yield_unit: string | null
  times_cooked: number
  last_cooked_at: string | null
  created_at: string
  ingredient_count: number | null
  total_cost_cents: number | null
  has_all_prices: boolean | null
  last_price_updated_at: string | null
  cuisine: string | null
  meal_type: string | null
  season: string[]
  occasion_tags: string[]
  photo_url: string | null
  family_id: string | null
  variation_label: string | null
  family_name: string | null
}

export async function getRecipes(filters?: {
  category?: string
  cuisine?: string
  meal_type?: string
  search?: string
  is_template?: boolean
  sort?: 'name' | 'recent' | 'most_used'
}) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get recipes
  let query = db.from('recipes').select('*').eq('tenant_id', user.tenantId!).eq('archived', false)

  if (filters?.category) {
    query = query.eq('category', filters.category as RecipeCategory)
  }

  if (filters?.cuisine) {
    query = query.eq('cuisine', filters.cuisine as RecipeCuisine)
  }

  if (filters?.meal_type) {
    query = query.eq('meal_type', filters.meal_type as RecipeMealType)
  }

  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`)
  }

  // Sort
  if (filters?.sort === 'most_used') {
    query = query.order('times_cooked', { ascending: false })
  } else if (filters?.sort === 'recent') {
    query = query.order('created_at', { ascending: false })
  } else {
    query = query.order('name', { ascending: true })
  }

  const { data: recipes, error } = await query

  if (error) {
    console.error('[getRecipes] Error:', error)
    throw new Error('Failed to fetch recipes')
  }

  // Get cost data from the view
  const { data: costData } = await db
    .from('recipe_cost_summary')
    .select(
      'recipe_id, ingredient_count, total_ingredient_cost_cents, has_all_prices, last_price_updated_at'
    )
    .eq('tenant_id', user.tenantId!)

  const costMap = new Map<string, any>((costData || []).map((c: any) => [c.recipe_id, c]))

  // Get family names for recipes that have a family_id
  const familyIds = [...new Set((recipes || []).map((r: any) => r.family_id).filter(Boolean))]
  let familyMap = new Map<string, string>()
  if (familyIds.length > 0) {
    const { data: families } = await db
      .from('recipe_families')
      .select('id, name')
      .in('id', familyIds)
    familyMap = new Map((families || []).map((f: any) => [f.id, f.name]))
  }

  const result: RecipeListItem[] = (recipes || []).map((r: any) => {
    const cost = costMap.get(r.id)
    return {
      id: r.id,
      name: r.name,
      category: r.category,
      method: r.method,
      dietary_tags: r.dietary_tags || [],
      servings: r.servings ?? null,
      calories_per_serving: r.calories_per_serving ?? null,
      prep_time_minutes: r.prep_time_minutes,
      cook_time_minutes: r.cook_time_minutes,
      yield_quantity: r.yield_quantity,
      yield_unit: r.yield_unit,
      times_cooked: r.times_cooked,
      last_cooked_at: r.last_cooked_at,
      created_at: r.created_at,
      ingredient_count: cost?.ingredient_count ?? null,
      total_cost_cents: cost?.total_ingredient_cost_cents ?? null,
      has_all_prices: cost?.has_all_prices ?? null,
      last_price_updated_at: cost?.last_price_updated_at ?? null,
      cuisine: r.cuisine ?? null,
      meal_type: r.meal_type ?? null,
      season: r.season || [],
      occasion_tags: r.occasion_tags || [],
      photo_url: r.photo_url ?? null,
      family_id: r.family_id ?? null,
      variation_label: r.variation_label ?? null,
      family_name: r.family_id ? (familyMap.get(r.family_id) ?? null) : null,
    }
  })

  return result
}

// ============================================
// 3. GET RECIPE BY ID (full detail)
// ============================================

export async function getRecipeById(recipeId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: recipe, error } = await db
    .from('recipes')
    .select('*')
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !recipe) {
    console.error('[getRecipeById] Error:', error)
    return null
  }

  // Get ingredients for this recipe (includes computed cost and yield data)
  const { data: recipeIngredients } = await db
    .from('recipe_ingredients')
    .select(
      `
      id,
      quantity,
      unit,
      sort_order,
      is_optional,
      preparation_notes,
      substitution_notes,
      computed_cost_cents,
      yield_pct,
      ingredient:ingredients(id, name, category, default_unit, average_price_cents, cost_per_unit_cents, last_price_cents, last_price_date, price_unit, weight_to_volume_ratio, last_price_source, last_price_store, last_price_confidence, price_trend_direction, price_trend_pct)
    `
    )
    .eq('recipe_id', recipeId)
    .order('sort_order', { ascending: true })

  // Get cost summary
  const { data: costSummary } = await db
    .from('recipe_cost_summary')
    .select('*')
    .eq('recipe_id', recipeId)
    .single()

  // Get event history: recipe → components → dishes → menus → events
  const { data: linkedComponents } = await db
    .from('components')
    .select(
      `
      id,
      name,
      dish:dishes(
        id,
        course_name,
        menu:menus(
          id,
          name,
          event:events(id, occasion, event_date, status, client:clients(full_name))
        )
      )
    `
    )
    .eq('recipe_id', recipeId)
    .eq('tenant_id', user.tenantId!)

  // Flatten event history from linked components
  const eventHistory: Array<{
    eventId: string
    occasion: string | null
    eventDate: string
    status: string
    clientName: string | null
    componentName: string
    menuName: string
  }> = []

  for (const comp of linkedComponents || []) {
    const dish = comp.dish as DishWithMenuEvent
    const menu = dish?.menu
    const event = menu?.event
    if (!menu || !event) continue
    eventHistory.push({
      eventId: event.id,
      occasion: event.occasion,
      eventDate: event.event_date,
      status: event.status,
      clientName: event.client?.full_name ?? null,
      componentName: comp.name,
      menuName: menu.name ?? '',
    })
  }

  // De-duplicate events (recipe may be used in multiple components of same event)
  const uniqueEvents = Array.from(new Map(eventHistory.map((e) => [e.eventId, e])).values()).sort(
    (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
  )

  // Get sub-recipes (children of this recipe)
  const { data: subRecipeRows } = await db
    .from('recipe_sub_recipes')
    .select('id, quantity, unit, sort_order, notes, child_recipe_id')
    .eq('parent_recipe_id', recipeId)
    .order('sort_order', { ascending: true })

  const subRecipes: Array<{
    id: string
    quantity: number
    unit: string
    sort_order: number
    notes: string | null
    childRecipe: {
      id: string
      name: string
      category: string
      yield_quantity: number | null
      yield_unit: string | null
    } | null
  }> = []

  for (const sr of subRecipeRows || []) {
    const { data: childRecipe } = await db
      .from('recipes')
      .select('id, name, category, yield_quantity, yield_unit')
      .eq('id', sr.child_recipe_id)
      .single()

    subRecipes.push({
      id: sr.id,
      quantity: sr.quantity,
      unit: sr.unit,
      sort_order: sr.sort_order,
      notes: sr.notes,
      childRecipe: childRecipe ?? null,
    })
  }

  // Get "used in" (parent recipes that reference this one as a sub-recipe)
  const { data: usedInRows } = await db
    .from('recipe_sub_recipes')
    .select('id, parent_recipe_id')
    .eq('child_recipe_id', recipeId)

  const usedInRecipes: Array<{ id: string; name: string; category: string }> = []
  for (const ui of usedInRows || []) {
    const { data: parentRecipe } = await db
      .from('recipes')
      .select('id, name, category')
      .eq('id', ui.parent_recipe_id)
      .single()
    if (parentRecipe) usedInRecipes.push(parentRecipe)
  }

  // Compute per-ingredient cost status for UI indicators
  const { canConvert, lookupDensity } = await import('@/lib/units/conversion-engine')
  const ingredientsMapped = (recipeIngredients || []).map((ri: any) => {
    const ing = ri.ingredient
    const costPerUnit = ing?.cost_per_unit_cents ?? ing?.last_price_cents ?? null
    const costUnit = ing?.price_unit || ing?.default_unit || 'each'
    const density = ing?.weight_to_volume_ratio ?? (ing?.name ? lookupDensity(ing.name) : null)

    // Determine cost status
    let costStatus: 'accurate' | 'estimated' | 'no_price' | 'stale' = 'accurate'
    let costNote: string | null = null

    if (!costPerUnit) {
      costStatus = 'no_price'
      costNote = 'No price data for this ingredient'
    } else if (!canConvert(ri.unit, costUnit, density)) {
      costStatus = 'estimated'
      costNote = `Uses ${ri.unit}, priced per ${costUnit} (no conversion available)`
    } else if (ing?.last_price_date) {
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(ing.last_price_date).getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysSinceUpdate > 90) {
        costStatus = 'stale'
        costNote = `Price last updated ${daysSinceUpdate} days ago`
      }
    }

    return {
      id: ri.id,
      quantity: ri.quantity,
      unit: ri.unit,
      sort_order: ri.sort_order,
      is_optional: ri.is_optional,
      preparation_notes: ri.preparation_notes,
      substitution_notes: ri.substitution_notes,
      computedCostCents: ri.computed_cost_cents as number | null,
      costStatus,
      costNote,
      ingredient: {
        id: ing?.id,
        name: ing?.name,
        category: ing?.category as IngredientCategory,
        default_unit: ing?.default_unit,
        average_price_cents: ing?.average_price_cents,
      },
    }
  })

  // Summarize cost issues
  const costIssues = {
    missingPrices: ingredientsMapped.filter((i) => i.costStatus === 'no_price').length,
    unitMismatches: ingredientsMapped.filter((i) => i.costStatus === 'estimated').length,
    stalePrices: ingredientsMapped.filter((i) => i.costStatus === 'stale').length,
  }

  return {
    ...recipe,
    ingredients: ingredientsMapped,
    subRecipes,
    usedInRecipes,
    costSummary: costSummary
      ? {
          ingredientCount: costSummary.ingredient_count,
          totalCostCents: costSummary.total_ingredient_cost_cents,
          costPerPortionCents: costSummary.cost_per_portion_cents,
          hasAllPrices: costSummary.has_all_prices,
        }
      : null,
    costIssues,
    eventHistory: uniqueEvents,
  }
}

// ============================================
// 4. UPDATE RECIPE
// ============================================

export async function updateRecipe(recipeId: string, input: UpdateRecipeInput) {
  const user = await requireChef()
  const db: any = createServerClient()
  const validated = UpdateRecipeSchema.parse(input)

  const updateData: Partial<RecipeUpdate> = { updated_by: user.id }
  if (validated.name !== undefined) updateData.name = validated.name
  if (validated.category !== undefined) updateData.category = validated.category as RecipeCategory
  if (validated.method !== undefined) updateData.method = validated.method
  if (validated.method_detailed !== undefined)
    updateData.method_detailed = validated.method_detailed
  if (validated.description !== undefined) updateData.description = validated.description
  if (validated.notes !== undefined) updateData.notes = validated.notes
  if (validated.adaptations !== undefined) updateData.adaptations = validated.adaptations
  if (validated.prep_time_minutes !== undefined)
    updateData.prep_time_minutes = validated.prep_time_minutes
  if (validated.cook_time_minutes !== undefined)
    updateData.cook_time_minutes = validated.cook_time_minutes
  if (validated.total_time_minutes !== undefined)
    updateData.total_time_minutes = validated.total_time_minutes
  if (validated.yield_quantity !== undefined) updateData.yield_quantity = validated.yield_quantity
  if (validated.yield_unit !== undefined) updateData.yield_unit = validated.yield_unit
  if (validated.yield_description !== undefined)
    updateData.yield_description = validated.yield_description
  if (validated.dietary_tags !== undefined) updateData.dietary_tags = validated.dietary_tags
  if (validated.servings !== undefined) updateData.servings = validated.servings
  if (validated.calories_per_serving !== undefined)
    updateData.calories_per_serving = validated.calories_per_serving
  if (validated.difficulty !== undefined) updateData.difficulty = validated.difficulty
  if (validated.equipment !== undefined) updateData.equipment = validated.equipment
  if (validated.cuisine !== undefined)
    updateData.cuisine = validated.cuisine as RecipeCuisine | null
  if (validated.meal_type !== undefined)
    updateData.meal_type = validated.meal_type as RecipeMealType | null
  if (validated.season !== undefined) updateData.season = validated.season
  if (validated.occasion_tags !== undefined) updateData.occasion_tags = validated.occasion_tags

  const { data: recipe, error } = await db
    .from('recipes')
    .update(updateData)
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateRecipe] Error:', error)
    throw new Error('Failed to update recipe')
  }

  revalidatePath('/recipes')
  revalidatePath(`/recipes/${recipeId}`)
  return { success: true, recipe }
}

// ============================================
// 5. DELETE RECIPE
// ============================================

export async function deleteRecipe(recipeId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Unlink from any components first
  await db
    .from('components')
    .update({ recipe_id: null })
    .eq('recipe_id', recipeId)
    .eq('tenant_id', user.tenantId!)

  // Delete recipe_ingredients
  await db.from('recipe_ingredients').delete().eq('recipe_id', recipeId)

  // Delete sub-recipe links (both as parent and as child)
  await db.from('recipe_sub_recipes').delete().eq('parent_recipe_id', recipeId)
  await db.from('recipe_sub_recipes').delete().eq('child_recipe_id', recipeId)

  // Delete the recipe
  const { error } = await db
    .from('recipes')
    .delete()
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteRecipe] Error:', error)
    throw new Error('Failed to delete recipe')
  }

  revalidatePath('/recipes')
  return { success: true }
}

// ============================================
// 6. ADD INGREDIENT TO RECIPE (find-or-create)
// ============================================

export async function addIngredientToRecipe(recipeId: string, input: AddIngredientInput) {
  const user = await requireChef()
  const db: any = createServerClient()
  const validated = AddIngredientToRecipeSchema.parse(input)

  // Verify recipe belongs to tenant
  const { data: recipe } = await db
    .from('recipes')
    .select('id')
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!recipe) {
    throw new Error('Recipe not found')
  }

  // Find or create ingredient (case-insensitive)
  const ingredientId = await findOrCreateIngredient(
    db,
    user.tenantId!,
    user.id,
    validated.ingredient_name,
    validated.ingredient_category as IngredientCategory,
    validated.ingredient_default_unit
  )

  // Compute unit-aware cost before inserting
  const costResult = await computeRecipeIngredientCost(
    db,
    user.tenantId!,
    ingredientId,
    validated.quantity,
    validated.unit
  )

  // Insert recipe_ingredient with computed cost
  const { data: recipeIngredient, error } = await db
    .from('recipe_ingredients')
    .insert({
      recipe_id: recipeId,
      ingredient_id: ingredientId,
      quantity: validated.quantity,
      unit: validated.unit,
      preparation_notes: validated.preparation_notes || null,
      is_optional: validated.is_optional || false,
      sort_order: validated.sort_order ?? 0,
      computed_cost_cents: costResult.costCents,
    })
    .select()
    .single()

  if (error) {
    console.error('[addIngredientToRecipe] Error:', error)
    throw new Error('Failed to add ingredient')
  }

  // Update recipe total cost (non-blocking)
  try {
    await refreshRecipeTotalCost(db, user.tenantId!, recipeId)
  } catch {
    // Cost refresh is non-blocking
  }

  revalidatePath(`/recipes/${recipeId}`)
  return {
    success: true,
    recipeIngredient,
    costWarning: costResult.warning,
  }
}

// ============================================
// 7. UPDATE RECIPE INGREDIENT
// ============================================

export async function updateRecipeIngredient(
  recipeIngredientId: string,
  input: UpdateRecipeIngredientInput
) {
  const user = await requireChef()
  const db: any = createServerClient()
  const validated = UpdateRecipeIngredientSchema.parse(input)

  // Verify tenant access through the recipe and get current data for cost recompute
  const { data: ri } = await db
    .from('recipe_ingredients')
    .select('recipe_id, ingredient_id, quantity, unit, recipe:recipes(tenant_id)')
    .eq('id', recipeIngredientId)
    .single()

  if (!ri || (ri.recipe as { tenant_id: string } | null)?.tenant_id !== user.tenantId) {
    throw new Error('Recipe ingredient not found')
  }

  const updateData: Record<string, unknown> = {}
  if (validated.quantity !== undefined) updateData.quantity = validated.quantity
  if (validated.unit !== undefined) updateData.unit = validated.unit
  if (validated.preparation_notes !== undefined)
    updateData.preparation_notes = validated.preparation_notes
  if (validated.is_optional !== undefined) updateData.is_optional = validated.is_optional
  if (validated.sort_order !== undefined) updateData.sort_order = validated.sort_order

  // Recompute cost if quantity or unit changed
  let costWarning: string | null = null
  if (validated.quantity !== undefined || validated.unit !== undefined) {
    const newQty = validated.quantity ?? Number(ri.quantity)
    const newUnit = validated.unit ?? ri.unit
    const costResult = await computeRecipeIngredientCost(
      db,
      user.tenantId!,
      ri.ingredient_id,
      newQty,
      newUnit
    )
    updateData.computed_cost_cents = costResult.costCents
    costWarning = costResult.warning
  }

  const { error } = await db
    .from('recipe_ingredients')
    .update(updateData)
    .eq('id', recipeIngredientId)

  if (error) {
    console.error('[updateRecipeIngredient] Error:', error)
    throw new Error('Failed to update ingredient')
  }

  // Refresh recipe total cost (non-blocking)
  try {
    await refreshRecipeTotalCost(db, user.tenantId!, ri.recipe_id)
  } catch {
    // Cost refresh is non-blocking
  }

  revalidatePath(`/recipes/${ri.recipe_id}`)
  return { success: true, costWarning }
}

// ============================================
// 8. REMOVE INGREDIENT FROM RECIPE
// ============================================

export async function removeIngredientFromRecipe(recipeIngredientId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify tenant access through the recipe
  const { data: ri } = await db
    .from('recipe_ingredients')
    .select('recipe_id, recipe:recipes(tenant_id)')
    .eq('id', recipeIngredientId)
    .single()

  if (!ri || (ri.recipe as { tenant_id: string } | null)?.tenant_id !== user.tenantId) {
    throw new Error('Recipe ingredient not found')
  }

  const { error } = await db.from('recipe_ingredients').delete().eq('id', recipeIngredientId)

  if (error) {
    console.error('[removeIngredientFromRecipe] Error:', error)
    throw new Error('Failed to remove ingredient')
  }

  // Refresh recipe total cost after ingredient removal (was previously missing)
  try {
    await refreshRecipeTotalCost(db, user.tenantId!, ri.recipe_id)
  } catch (err) {
    console.error('[removeIngredientFromRecipe] Cost refresh failed (non-blocking):', err)
  }

  revalidatePath(`/recipes/${ri.recipe_id}`)
  return { success: true }
}

// ============================================
// 9. GET INGREDIENTS (master list)
// ============================================

export async function getIngredients(filters?: { category?: string; search?: string }) {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('ingredients')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('archived', false)

  if (filters?.category) {
    query = query.eq('category', filters.category as IngredientCategory)
  }

  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`)
  }

  query = query.order('name', { ascending: true })

  const { data: ingredients, error } = await query

  if (error) {
    console.error('[getIngredients] Error:', error)
    throw new Error('Failed to fetch ingredients')
  }

  // Get usage counts from the view
  const { data: usageData } = await db
    .from('ingredient_usage_summary')
    .select('ingredient_id, times_used')
    .eq('tenant_id', user.tenantId!)

  const usageMap = new Map((usageData || []).map((u: any) => [u.ingredient_id, u.times_used ?? 0]))

  return (ingredients || []).map((ing: any) => ({
    ...ing,
    usage_count: usageMap.get(ing.id) ?? 0,
  }))
}

// ============================================
// 10. CREATE INGREDIENT (find-or-create)
// ============================================

export async function createIngredient(input: CreateIngredientInput) {
  const user = await requireChef()
  const db: any = createServerClient()
  const validated = CreateIngredientSchema.parse(input)

  // Find-or-create: check for existing ingredient (case-insensitive)
  const { data: existing } = await db
    .from('ingredients')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .ilike('name', validated.name)
    .limit(1)
    .single()

  if (existing) {
    return { success: true, ingredient: existing, existed: true }
  }

  const { data: ingredient, error } = await db
    .from('ingredients')
    .insert({
      tenant_id: user.tenantId!,
      name: validated.name,
      category: validated.category as IngredientCategory,
      default_unit: validated.default_unit,
      description: validated.description || null,
      average_price_cents: validated.average_price_cents || null,
      is_staple: validated.is_staple || false,
      allergen_flags: validated.allergen_flags || [],
      dietary_tags: validated.dietary_tags || [],
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('[createIngredient] Error:', error)
    throw new Error('Failed to create ingredient')
  }

  revalidatePath('/recipes/ingredients')
  return { success: true, ingredient, existed: false }
}

// ============================================
// 11. UPDATE INGREDIENT
// ============================================

export async function updateIngredient(ingredientId: string, input: UpdateIngredientInput) {
  const user = await requireChef()
  const db: any = createServerClient()
  const validated = UpdateIngredientSchema.parse(input)

  const updateData: Record<string, unknown> = { updated_by: user.id }
  if (validated.name !== undefined) updateData.name = validated.name
  if (validated.category !== undefined) updateData.category = validated.category
  if (validated.default_unit !== undefined) updateData.default_unit = validated.default_unit
  if (validated.description !== undefined) updateData.description = validated.description
  if (validated.average_price_cents !== undefined)
    updateData.average_price_cents = validated.average_price_cents
  if (validated.is_staple !== undefined) updateData.is_staple = validated.is_staple
  if (validated.allergen_flags !== undefined) updateData.allergen_flags = validated.allergen_flags
  if (validated.dietary_tags !== undefined) updateData.dietary_tags = validated.dietary_tags

  const { data: ingredient, error } = await db
    .from('ingredients')
    .update(updateData)
    .eq('id', ingredientId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateIngredient] Error:', error)
    throw new Error('Failed to update ingredient')
  }

  revalidatePath('/recipes/ingredients')
  return { success: true, ingredient }
}

// ============================================
// 12. LINK RECIPE TO COMPONENT
// ============================================

export async function linkRecipeToComponent(recipeId: string, componentId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify recipe belongs to tenant
  const { data: recipe } = await db
    .from('recipes')
    .select('id')
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!recipe) {
    throw new Error('Recipe not found')
  }

  // Verify component belongs to tenant
  const { data: component } = await db
    .from('components')
    .select('id')
    .eq('id', componentId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!component) {
    throw new Error('Component not found')
  }

  const { error } = await db
    .from('components')
    .update({ recipe_id: recipeId })
    .eq('id', componentId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[linkRecipeToComponent] Error:', error)
    throw new Error('Failed to link recipe')
  }

  revalidatePath('/menus')
  revalidatePath('/recipes')
  return { success: true }
}

// ============================================
// 13. UNLINK RECIPE FROM COMPONENT
// ============================================

export async function unlinkRecipeFromComponent(componentId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('components')
    .update({ recipe_id: null })
    .eq('id', componentId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[unlinkRecipeFromComponent] Error:', error)
    throw new Error('Failed to unlink recipe')
  }

  revalidatePath('/menus')
  revalidatePath('/recipes')
  return { success: true }
}

// ============================================
// 14. GET RECIPES FOR EVENT
// ============================================

export async function getRecipesForEvent(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Event → menus → dishes → components → recipes
  const { data: menus } = await db
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (!menus || menus.length === 0) return []

  const menuIds = menus.map((m: any) => m.id)

  const { data: dishes } = await db
    .from('dishes')
    .select('id')
    .in('menu_id', menuIds)
    .eq('tenant_id', user.tenantId!)

  if (!dishes || dishes.length === 0) return []

  const dishIds = dishes.map((d: any) => d.id)

  const { data: components } = await db
    .from('components')
    .select(
      `
      id,
      name,
      category,
      recipe:recipes(id, name, category, method)
    `
    )
    .in('dish_id', dishIds)
    .eq('tenant_id', user.tenantId!)
    .not('recipe_id', 'is', null)

  return (components || []).map((c: any) => ({
    componentId: c.id,
    componentName: c.name,
    componentCategory: c.category,
    recipe: c.recipe as { id: string; name: string; category: string; method: string } | null,
  }))
}

// ============================================
// 15. GET UNRECORDED COMPONENTS FOR EVENT
// ============================================

export async function getUnrecordedComponentsForEvent(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Event → menus → dishes → components where recipe_id IS NULL
  const { data: menus } = await db
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (!menus || menus.length === 0) return []

  const menuIds = menus.map((m: any) => m.id)

  const { data: dishes } = await db
    .from('dishes')
    .select('id')
    .in('menu_id', menuIds)
    .eq('tenant_id', user.tenantId!)

  if (!dishes || dishes.length === 0) return []

  const dishIds = dishes.map((d: any) => d.id)

  const { data: components } = await db
    .from('components')
    .select('id, name, category')
    .in('dish_id', dishIds)
    .eq('tenant_id', user.tenantId!)
    .is('recipe_id', null)

  return (components || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    category: c.category,
  }))
}

// ============================================
// 16. GET RECIPE DEBT (dashboard widget)
// ============================================

export type RecipeDebt = {
  last7Days: number
  last30Days: number
  older: number
  total: number
  totalRecipes: number
}

export async function getRecipeDebt(): Promise<RecipeDebt> {
  const user = await requireChef()
  const db: any = createServerClient()

  const now = new Date()
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(now.getDate() - 7)
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(now.getDate() - 30)

  // All components with no recipe, joined through their event
  const { data: components } = await db
    .from('components')
    .select(
      `
      id,
      dish:dishes(
        menu:menus(
          event:events(id, event_date)
        )
      )
    `
    )
    .eq('tenant_id', user.tenantId!)
    .is('recipe_id', null)

  let last7Days = 0
  let last30Days = 0
  let older = 0

  for (const comp of components || []) {
    const dish = comp.dish as DishWithMenuEvent
    const event = dish?.menu?.event
    if (!event?.event_date) continue

    const eventDate = new Date(event.event_date)
    if (eventDate >= sevenDaysAgo) {
      last7Days++
    } else if (eventDate >= thirtyDaysAgo) {
      last30Days++
    } else {
      older++
    }
  }

  const { count: totalRecipes } = await db
    .from('recipes')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId!)
    .eq('archived', false)

  return {
    last7Days,
    last30Days,
    older,
    total: last7Days + last30Days + older,
    totalRecipes: totalRecipes ?? 0,
  }
}

// ============================================
// 17. GET ALL UNRECORDED COMPONENTS (sprint mode)
// ============================================

export type UnrecordedComponentForSprint = {
  componentId: string
  componentName: string
  componentCategory: string
  eventId: string
  eventOccasion: string | null
  eventDate: string
  clientName: string | null
}

export async function getAllUnrecordedComponents(): Promise<UnrecordedComponentForSprint[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: components } = await db
    .from('components')
    .select(
      `
      id, name, category,
      dish:dishes(
        menu:menus(
          event:events(
            id, occasion, event_date,
            client:clients(full_name)
          )
        )
      )
    `
    )
    .eq('tenant_id', user.tenantId!)
    .is('recipe_id', null)

  const results: UnrecordedComponentForSprint[] = []

  for (const comp of components || []) {
    const dish = comp.dish as DishWithMenuEvent
    const event = dish?.menu?.event
    if (!event?.id || !event?.event_date) continue

    results.push({
      componentId: comp.id,
      componentName: comp.name,
      componentCategory: comp.category,
      eventId: event.id,
      eventOccasion: event.occasion ?? null,
      eventDate: event.event_date,
      clientName: (event.client as { full_name?: string } | null)?.full_name ?? null,
    })
  }

  // Sort most recent events first so chef starts with freshest memory
  results.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())

  return results
}

// ============================================
// SEARCH RECIPES (lightweight, for link modals)
// ============================================

export async function searchRecipes(query: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: recipes } = await db
    .from('recipes')
    .select(
      'id, name, category, total_cost_cents, cost_per_serving_cents, yield_quantity, yield_unit'
    )
    .eq('tenant_id', user.tenantId!)
    .eq('archived', false)
    .ilike('name', `%${query}%`)
    .order('name', { ascending: true })
    .limit(20)

  return (recipes || []) as {
    id: string
    name: string
    category: string
    total_cost_cents: number | null
    cost_per_serving_cents: number | null
    yield_quantity: number | null
    yield_unit: string | null
  }[]
}

// ============================================
// HELPER: Find or create ingredient
// ============================================

async function findOrCreateIngredient(
  db: ReturnType<typeof createServerClient>,
  tenantId: string,
  userId: string,
  name: string,
  category: IngredientCategory,
  defaultUnit: string
): Promise<string> {
  // Case-insensitive lookup
  const { data: existing } = await db
    .from('ingredients')
    .select('id')
    .eq('tenant_id', tenantId)
    .ilike('name', name)
    .limit(1)
    .single()

  if (existing) {
    return existing.id
  }

  const { data: newIngredient, error } = await db
    .from('ingredients')
    .insert({
      tenant_id: tenantId,
      name,
      category,
      default_unit: defaultUnit,
      dietary_tags: [],
      allergen_flags: [],
      created_by: userId,
      updated_by: userId,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[findOrCreateIngredient] Error:', error)
    throw new Error('Failed to create ingredient "${name}"')
  }

  return newIngredient.id
}

// ============================================
// SUB-RECIPE CRUD
// ============================================

const AddSubRecipeSchema = z.object({
  child_recipe_id: z.string().uuid(),
  quantity: z.number().positive().default(1),
  unit: z.string().default('batch'),
  sort_order: z.number().int().optional(),
  notes: z.string().optional(),
})

export type AddSubRecipeInput = z.infer<typeof AddSubRecipeSchema>

const UpdateSubRecipeSchema = z.object({
  quantity: z.number().positive().optional(),
  unit: z.string().optional(),
  sort_order: z.number().int().optional(),
  notes: z.string().nullable().optional(),
})

export type UpdateSubRecipeInput = z.infer<typeof UpdateSubRecipeSchema>

/**
 * Add a sub-recipe to a parent recipe.
 * The DB trigger prevents circular references.
 */
export async function addSubRecipe(parentRecipeId: string, input: AddSubRecipeInput) {
  const user = await requireChef()
  const db: any = createServerClient()
  const validated = AddSubRecipeSchema.parse(input)

  // Verify both recipes belong to tenant
  const { data: parentRecipe } = await db
    .from('recipes')
    .select('id')
    .eq('id', parentRecipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!parentRecipe) throw new Error('Parent recipe not found')

  const { data: childRecipe } = await db
    .from('recipes')
    .select('id')
    .eq('id', validated.child_recipe_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!childRecipe) throw new Error('Sub-recipe not found')

  const { data, error } = await db
    .from('recipe_sub_recipes')
    .insert({
      parent_recipe_id: parentRecipeId,
      child_recipe_id: validated.child_recipe_id,
      quantity: validated.quantity,
      unit: validated.unit,
      sort_order: validated.sort_order ?? 0,
      notes: validated.notes || null,
    })
    .select()
    .single()

  if (error) {
    // Catch circular reference error from DB trigger
    if (error.message?.includes('Circular sub-recipe reference')) {
      throw new Error('Cannot add this sub-recipe - it would create a circular reference.')
    }
    console.error('[addSubRecipe] Error:', error)
    throw new Error('Failed to add sub-recipe')
  }

  revalidatePath(`/recipes/${parentRecipeId}`)
  return { success: true, subRecipe: data }
}

/**
 * Update a sub-recipe link (quantity, unit, sort_order, notes)
 */
export async function updateSubRecipe(subRecipeId: string, input: UpdateSubRecipeInput) {
  const user = await requireChef()
  const db: any = createServerClient()
  const validated = UpdateSubRecipeSchema.parse(input)

  // Verify tenant access: get parent recipe and check tenant
  const { data: link } = await db
    .from('recipe_sub_recipes')
    .select('parent_recipe_id')
    .eq('id', subRecipeId)
    .single()

  if (!link) throw new Error('Sub-recipe link not found')

  const { data: recipe } = await db
    .from('recipes')
    .select('id')
    .eq('id', link.parent_recipe_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!recipe) throw new Error('Access denied')

  const updateData: Record<string, unknown> = {}
  if (validated.quantity !== undefined) updateData.quantity = validated.quantity
  if (validated.unit !== undefined) updateData.unit = validated.unit
  if (validated.sort_order !== undefined) updateData.sort_order = validated.sort_order
  if (validated.notes !== undefined) updateData.notes = validated.notes

  const { error } = await db.from('recipe_sub_recipes').update(updateData).eq('id', subRecipeId)

  if (error) {
    console.error('[updateSubRecipe] Error:', error)
    throw new Error('Failed to update sub-recipe')
  }

  revalidatePath(`/recipes/${link.parent_recipe_id}`)
  return { success: true }
}

/**
 * Remove a sub-recipe from a parent recipe
 */
export async function removeSubRecipe(subRecipeId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify tenant access
  const { data: link } = await db
    .from('recipe_sub_recipes')
    .select('parent_recipe_id')
    .eq('id', subRecipeId)
    .single()

  if (!link) throw new Error('Sub-recipe link not found')

  const { data: recipe } = await db
    .from('recipes')
    .select('id')
    .eq('id', link.parent_recipe_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!recipe) throw new Error('Access denied')

  const { error } = await db.from('recipe_sub_recipes').delete().eq('id', subRecipeId)

  if (error) {
    console.error('[removeSubRecipe] Error:', error)
    throw new Error('Failed to remove sub-recipe')
  }

  revalidatePath(`/recipes/${link.parent_recipe_id}`)
  return { success: true }
}

// ============================================
// RECIPE QUICK CAPTURE (dashboard widget)
// ============================================

/**
 * Create a minimal draft recipe from raw text.
 * First line becomes the name, full text goes into notes.
 * No AI processing, no ingredient extraction. Just a text dump.
 */
export async function createRecipeDraft(rawText: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const trimmed = rawText.trim()
  if (!trimmed) throw new Error('Recipe text cannot be empty')

  const lines = trimmed.split('\n')
  const name = lines[0].slice(0, 100) || 'Untitled Recipe Draft'

  const { error } = await db.from('recipes').insert({
    tenant_id: user.tenantId!,
    created_by: user.id,
    name,
    notes: trimmed,
    category: 'other' as const,
    method: '',
  })

  if (error) {
    console.error('[createRecipeDraft] Error:', error)
    throw new Error('Failed to save recipe draft')
  }

  revalidatePath('/dashboard')
  revalidatePath('/recipes')
  return { success: true, name }
}

// ============================================
// RECIPE FAMILIES (Variations)
// ============================================

export type RecipeFamily = {
  id: string
  name: string
  description: string | null
  created_at: string
  recipe_count: number
}

/**
 * Create a new recipe family and optionally assign a recipe to it.
 */
export async function createRecipeFamily(
  name: string,
  description?: string,
  initialRecipeId?: string,
  variationLabel?: string
) {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!name.trim()) throw new Error('Family name is required')

  const { data: family, error } = await db
    .from('recipe_families')
    .insert({
      tenant_id: user.tenantId!,
      name: name.trim(),
      description: description?.trim() || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error(`A recipe family named "${name}" already exists`)
    }
    console.error('[createRecipeFamily] Error:', error)
    throw new Error('Failed to create recipe family')
  }

  // If an initial recipe was provided, assign it to this family
  if (initialRecipeId) {
    await db
      .from('recipes')
      .update({
        family_id: family.id,
        variation_label: variationLabel?.trim() || null,
      })
      .eq('id', initialRecipeId)
      .eq('tenant_id', user.tenantId!)
  }

  revalidatePath('/recipes')
  return { success: true, family }
}

/**
 * Assign a recipe to an existing family with a variation label.
 */
export async function assignRecipeToFamily(
  recipeId: string,
  familyId: string,
  variationLabel?: string
) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('recipes')
    .update({
      family_id: familyId,
      variation_label: variationLabel?.trim() || null,
    })
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[assignRecipeToFamily] Error:', error)
    throw new Error('Failed to assign recipe to family')
  }

  revalidatePath('/recipes')
  return { success: true }
}

/**
 * Remove a recipe from its family.
 */
export async function removeRecipeFromFamily(recipeId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('recipes')
    .update({ family_id: null, variation_label: null })
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[removeRecipeFromFamily] Error:', error)
    throw new Error('Failed to remove recipe from family')
  }

  revalidatePath('/recipes')
  return { success: true }
}

/**
 * Get all recipe families for the current chef with recipe counts.
 */
export async function getRecipeFamilies() {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: families, error } = await db
    .from('recipe_families')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('name')

  if (error) {
    console.error('[getRecipeFamilies] Error:', error)
    throw new Error('Failed to fetch recipe families')
  }

  // Count recipes per family
  const familyIds = (families || []).map((f: any) => f.id)
  let countMap = new Map<string, number>()
  if (familyIds.length > 0) {
    const { data: recipes } = await db
      .from('recipes')
      .select('family_id')
      .in('family_id', familyIds)
      .eq('tenant_id', user.tenantId!)
      .eq('archived', false)

    for (const r of recipes || []) {
      countMap.set(r.family_id, (countMap.get(r.family_id) || 0) + 1)
    }
  }

  return (families || []).map(
    (f: any): RecipeFamily => ({
      id: f.id,
      name: f.name,
      description: f.description,
      created_at: f.created_at,
      recipe_count: countMap.get(f.id) || 0,
    })
  )
}

/**
 * Get all recipes in a specific family.
 */
export async function getRecipesInFamily(familyId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: recipes, error } = await db
    .from('recipes')
    .select('id, name, category, variation_label, dietary_tags, times_cooked, photo_url')
    .eq('family_id', familyId)
    .eq('tenant_id', user.tenantId!)
    .eq('archived', false)
    .order('variation_label')

  if (error) {
    console.error('[getRecipesInFamily] Error:', error)
    throw new Error('Failed to fetch family recipes')
  }

  return recipes || []
}

/**
 * Create a recipe and assign it to a family in one step.
 * Used by the Recipe Dump "Add Variation" flow.
 */
export async function createRecipeInFamily(
  input: CreateRecipeInput,
  familyId: string,
  variationLabel: string
) {
  const result = await createRecipe(input)

  if (result.success && result.recipe?.id) {
    await assignRecipeToFamily(result.recipe.id, familyId, variationLabel)
  }

  return result
}

// ============================================
// UNIT-AWARE COST COMPUTATION (internal helpers)
// ============================================

type CostResult = {
  costCents: number | null
  warning: string | null
}

/**
 * Compute the cost of a specific quantity of an ingredient using unit-aware conversion.
 * Uses the conversion engine with density lookups for cross-type conversions (cups to lbs).
 * Returns null cost + warning when conversion is not possible.
 */
export async function computeRecipeIngredientCost(
  db: ReturnType<typeof createServerClient>,
  tenantId: string,
  ingredientId: string,
  quantity: number,
  recipeUnit: string
): Promise<CostResult> {
  const { computeIngredientCost, canConvert, lookupDensity } =
    await import('@/lib/units/conversion-engine')

  // Fetch ingredient pricing data
  const { data: ingredient } = await db
    .from('ingredients')
    .select(
      'name, cost_per_unit_cents, last_price_cents, price_unit, default_unit, weight_to_volume_ratio, default_yield_pct'
    )
    .eq('id', ingredientId)
    .eq('tenant_id', tenantId)
    .single()

  if (!ingredient) return { costCents: null, warning: null }

  // Determine the cost and its unit
  const costPerUnit = ingredient.cost_per_unit_cents ?? ingredient.last_price_cents
  if (!costPerUnit) {
    return { costCents: null, warning: 'no_price' }
  }

  const costUnit = ingredient.price_unit || ingredient.default_unit || 'each'

  // Get density: prefer ingredient record, fall back to common densities
  const density = ingredient.weight_to_volume_ratio ?? lookupDensity(ingredient.name)

  // Check if conversion is possible before computing
  if (!canConvert(recipeUnit, costUnit, density)) {
    // Can't convert: return naive fallback but flag it
    const naiveCost = Math.round(quantity * costPerUnit)
    const yieldPct = ingredient.default_yield_pct ?? 100
    const yieldAdjusted = yieldPct < 100 ? Math.round((naiveCost * 100) / yieldPct) : naiveCost
    return {
      costCents: yieldAdjusted,
      warning: `unit_mismatch:${recipeUnit}:${costUnit}`,
    }
  }

  // Compute with full unit conversion
  const rawCost = computeIngredientCost(quantity, recipeUnit, costPerUnit, costUnit, density)
  if (rawCost === null) {
    return {
      costCents: Math.round(quantity * costPerUnit),
      warning: `conversion_failed:${recipeUnit}:${costUnit}`,
    }
  }

  // Apply yield percentage
  const yieldPct = ingredient.default_yield_pct ?? 100
  const yieldAdjusted = yieldPct < 100 ? Math.round((rawCost * 100) / yieldPct) : rawCost

  return { costCents: yieldAdjusted, warning: null }
}

/**
 * Refresh a recipe's total_cost_cents and cost_per_serving_cents
 * by summing all recipe_ingredients.computed_cost_cents.
 */
export async function refreshRecipeTotalCost(
  db: ReturnType<typeof createServerClient>,
  tenantId: string,
  recipeId: string
) {
  // Sum computed costs from all ingredients
  const { data: ingredients } = await db
    .from('recipe_ingredients')
    .select('computed_cost_cents')
    .eq('recipe_id', recipeId)

  const totalCents = (ingredients ?? []).reduce(
    (sum: number, ri: { computed_cost_cents: number | null }) =>
      sum + (ri.computed_cost_cents ?? 0),
    0
  )

  // Get yield quantity for per-serving calc
  const { data: recipe } = await db
    .from('recipes')
    .select('yield_quantity')
    .eq('id', recipeId)
    .eq('tenant_id', tenantId)
    .single()

  const yieldQty = recipe?.yield_quantity ? Number(recipe.yield_quantity) : null
  const costPerServing = yieldQty && yieldQty > 0 ? Math.round(totalCents / yieldQty) : null

  await db
    .from('recipes')
    .update({
      total_cost_cents: totalCents > 0 ? totalCents : null,
      cost_per_serving_cents: costPerServing,
    } as any)
    .eq('id', recipeId)
    .eq('tenant_id', tenantId)
}

// ============================================
// RECOMPUTE ALL RECIPE COSTS (bulk refresh)
// ============================================

/**
 * Recompute computed_cost_cents for every ingredient in a recipe,
 * then update the recipe's total_cost_cents and cost_per_serving_cents.
 *
 * Call this after ingredient prices change or to fix stale costs.
 * Returns per-ingredient warnings for unit mismatches.
 */
export async function recomputeRecipeCosts(recipeId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify recipe belongs to tenant
  const { data: recipe } = await db
    .from('recipes')
    .select('id')
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!recipe) throw new Error('Recipe not found')

  // Get all recipe ingredients
  const { data: ingredients } = await db
    .from('recipe_ingredients')
    .select('id, ingredient_id, quantity, unit')
    .eq('recipe_id', recipeId)

  if (!ingredients || ingredients.length === 0) {
    return { success: true, updated: 0, warnings: [] }
  }

  const warnings: Array<{ ingredientId: string; warning: string }> = []
  let updated = 0

  for (const ri of ingredients as any[]) {
    const costResult = await computeRecipeIngredientCost(
      db,
      user.tenantId!,
      ri.ingredient_id,
      Number(ri.quantity),
      ri.unit
    )

    await db
      .from('recipe_ingredients')
      .update({ computed_cost_cents: costResult.costCents })
      .eq('id', ri.id)

    updated++

    if (costResult.warning) {
      warnings.push({ ingredientId: ri.ingredient_id, warning: costResult.warning })
    }
  }

  // Refresh recipe totals
  await refreshRecipeTotalCost(db, user.tenantId!, recipeId)

  revalidatePath(`/recipes/${recipeId}`)
  return { success: true, updated, warnings }
}
