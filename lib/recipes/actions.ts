// Recipe Bible Server Actions
// Chef-only: Manage recipes, ingredients, and recipe-component linking
// Enforces tenant scoping

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Database } from '@/types/database'

type RecipeCategory = Database['public']['Enums']['recipe_category']
type IngredientCategory = Database['public']['Enums']['ingredient_category']

// ============================================
// VALIDATION SCHEMAS
// ============================================

const RECIPE_CATEGORIES: [string, ...string[]] = [
  'sauce', 'protein', 'starch', 'vegetable', 'fruit', 'dessert',
  'bread', 'pasta', 'soup', 'salad', 'appetizer', 'condiment',
  'beverage', 'other'
]

const INGREDIENT_CATEGORIES: [string, ...string[]] = [
  'protein', 'produce', 'dairy', 'pantry', 'spice', 'oil',
  'alcohol', 'baking', 'frozen', 'canned', 'fresh_herb',
  'dry_herb', 'condiment', 'beverage', 'specialty', 'other'
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
  const supabase = createServerClient()
  const validated = CreateRecipeSchema.parse(input)

  const { data: recipe, error } = await supabase
    .from('recipes')
    .insert({
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
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

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
}

export async function getRecipes(filters?: {
  category?: string
  search?: string
  is_template?: boolean
  sort?: 'name' | 'recent' | 'most_used'
}) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get recipes
  let query = supabase
    .from('recipes')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('archived', false)

  if (filters?.category) {
    query = query.eq('category', filters.category as RecipeCategory)
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
  const { data: costData } = await supabase
    .from('recipe_cost_summary')
    .select('recipe_id, ingredient_count, total_ingredient_cost_cents, has_all_prices')
    .eq('tenant_id', user.tenantId!)

  const costMap = new Map(
    (costData || []).map(c => [c.recipe_id, c])
  )

  const result: RecipeListItem[] = (recipes || []).map(r => {
    const cost = costMap.get(r.id)
    return {
      id: r.id,
      name: r.name,
      category: r.category,
      method: r.method,
      dietary_tags: r.dietary_tags || [],
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
    }
  })

  return result
}

// ============================================
// 3. GET RECIPE BY ID (full detail)
// ============================================

export async function getRecipeById(recipeId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: recipe, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !recipe) {
    console.error('[getRecipeById] Error:', error)
    return null
  }

  // Get ingredients for this recipe
  const { data: recipeIngredients } = await supabase
    .from('recipe_ingredients')
    .select(`
      id,
      quantity,
      unit,
      sort_order,
      is_optional,
      preparation_notes,
      substitution_notes,
      ingredient:ingredients(id, name, category, default_unit, average_price_cents)
    `)
    .eq('recipe_id', recipeId)
    .order('sort_order', { ascending: true })

  // Get cost summary
  const { data: costSummary } = await supabase
    .from('recipe_cost_summary')
    .select('*')
    .eq('recipe_id', recipeId)
    .single()

  // Get event history: recipe → components → dishes → menus → events
  const { data: linkedComponents } = await supabase
    .from('components')
    .select(`
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
    `)
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
    const dish = comp.dish as any
    if (!dish?.menu?.event) continue
    const menu = dish.menu
    const event = menu.event
    eventHistory.push({
      eventId: event.id,
      occasion: event.occasion,
      eventDate: event.event_date,
      status: event.status,
      clientName: event.client?.full_name ?? null,
      componentName: comp.name,
      menuName: menu.name,
    })
  }

  // De-duplicate events (recipe may be used in multiple components of same event)
  const uniqueEvents = Array.from(
    new Map(eventHistory.map(e => [e.eventId, e])).values()
  ).sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())

  return {
    ...recipe,
    ingredients: (recipeIngredients || []).map(ri => ({
      id: ri.id,
      quantity: ri.quantity,
      unit: ri.unit,
      sort_order: ri.sort_order,
      is_optional: ri.is_optional,
      preparation_notes: ri.preparation_notes,
      substitution_notes: ri.substitution_notes,
      ingredient: ri.ingredient as {
        id: string
        name: string
        category: IngredientCategory
        default_unit: string
        average_price_cents: number | null
      },
    })),
    costSummary: costSummary ? {
      ingredientCount: costSummary.ingredient_count,
      totalCostCents: costSummary.total_ingredient_cost_cents,
      costPerPortionCents: costSummary.cost_per_portion_cents,
      hasAllPrices: costSummary.has_all_prices,
    } : null,
    eventHistory: uniqueEvents,
  }
}

// ============================================
// 4. UPDATE RECIPE
// ============================================

export async function updateRecipe(recipeId: string, input: UpdateRecipeInput) {
  const user = await requireChef()
  const supabase = createServerClient()
  const validated = UpdateRecipeSchema.parse(input)

  const updateData: Record<string, unknown> = { updated_by: user.id }
  if (validated.name !== undefined) updateData.name = validated.name
  if (validated.category !== undefined) updateData.category = validated.category
  if (validated.method !== undefined) updateData.method = validated.method
  if (validated.method_detailed !== undefined) updateData.method_detailed = validated.method_detailed
  if (validated.description !== undefined) updateData.description = validated.description
  if (validated.notes !== undefined) updateData.notes = validated.notes
  if (validated.adaptations !== undefined) updateData.adaptations = validated.adaptations
  if (validated.prep_time_minutes !== undefined) updateData.prep_time_minutes = validated.prep_time_minutes
  if (validated.cook_time_minutes !== undefined) updateData.cook_time_minutes = validated.cook_time_minutes
  if (validated.total_time_minutes !== undefined) updateData.total_time_minutes = validated.total_time_minutes
  if (validated.yield_quantity !== undefined) updateData.yield_quantity = validated.yield_quantity
  if (validated.yield_unit !== undefined) updateData.yield_unit = validated.yield_unit
  if (validated.yield_description !== undefined) updateData.yield_description = validated.yield_description
  if (validated.dietary_tags !== undefined) updateData.dietary_tags = validated.dietary_tags

  const { data: recipe, error } = await supabase
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
  const supabase = createServerClient()

  // Unlink from any components first
  await supabase
    .from('components')
    .update({ recipe_id: null })
    .eq('recipe_id', recipeId)
    .eq('tenant_id', user.tenantId!)

  // Delete recipe_ingredients
  await supabase
    .from('recipe_ingredients')
    .delete()
    .eq('recipe_id', recipeId)

  // Delete the recipe
  const { error } = await supabase
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
  const supabase = createServerClient()
  const validated = AddIngredientToRecipeSchema.parse(input)

  // Verify recipe belongs to tenant
  const { data: recipe } = await supabase
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
    supabase,
    user.tenantId!,
    user.id,
    validated.ingredient_name,
    validated.ingredient_category as IngredientCategory,
    validated.ingredient_default_unit,
  )

  // Insert recipe_ingredient
  const { data: recipeIngredient, error } = await supabase
    .from('recipe_ingredients')
    .insert({
      recipe_id: recipeId,
      ingredient_id: ingredientId,
      quantity: validated.quantity,
      unit: validated.unit,
      preparation_notes: validated.preparation_notes || null,
      is_optional: validated.is_optional || false,
      sort_order: validated.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) {
    console.error('[addIngredientToRecipe] Error:', error)
    throw new Error('Failed to add ingredient')
  }

  revalidatePath(`/recipes/${recipeId}`)
  return { success: true, recipeIngredient }
}

// ============================================
// 7. UPDATE RECIPE INGREDIENT
// ============================================

export async function updateRecipeIngredient(recipeIngredientId: string, input: UpdateRecipeIngredientInput) {
  const user = await requireChef()
  const supabase = createServerClient()
  const validated = UpdateRecipeIngredientSchema.parse(input)

  // Verify tenant access through the recipe
  const { data: ri } = await supabase
    .from('recipe_ingredients')
    .select('recipe_id, recipe:recipes(tenant_id)')
    .eq('id', recipeIngredientId)
    .single()

  if (!ri || (ri.recipe as any)?.tenant_id !== user.tenantId) {
    throw new Error('Recipe ingredient not found')
  }

  const updateData: Record<string, unknown> = {}
  if (validated.quantity !== undefined) updateData.quantity = validated.quantity
  if (validated.unit !== undefined) updateData.unit = validated.unit
  if (validated.preparation_notes !== undefined) updateData.preparation_notes = validated.preparation_notes
  if (validated.is_optional !== undefined) updateData.is_optional = validated.is_optional
  if (validated.sort_order !== undefined) updateData.sort_order = validated.sort_order

  const { error } = await supabase
    .from('recipe_ingredients')
    .update(updateData)
    .eq('id', recipeIngredientId)

  if (error) {
    console.error('[updateRecipeIngredient] Error:', error)
    throw new Error('Failed to update ingredient')
  }

  revalidatePath(`/recipes/${ri.recipe_id}`)
  return { success: true }
}

// ============================================
// 8. REMOVE INGREDIENT FROM RECIPE
// ============================================

export async function removeIngredientFromRecipe(recipeIngredientId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify tenant access through the recipe
  const { data: ri } = await supabase
    .from('recipe_ingredients')
    .select('recipe_id, recipe:recipes(tenant_id)')
    .eq('id', recipeIngredientId)
    .single()

  if (!ri || (ri.recipe as any)?.tenant_id !== user.tenantId) {
    throw new Error('Recipe ingredient not found')
  }

  const { error } = await supabase
    .from('recipe_ingredients')
    .delete()
    .eq('id', recipeIngredientId)

  if (error) {
    console.error('[removeIngredientFromRecipe] Error:', error)
    throw new Error('Failed to remove ingredient')
  }

  revalidatePath(`/recipes/${ri.recipe_id}`)
  return { success: true }
}

// ============================================
// 9. GET INGREDIENTS (master list)
// ============================================

export async function getIngredients(filters?: {
  category?: string
  search?: string
}) {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
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
  const { data: usageData } = await supabase
    .from('ingredient_usage_summary')
    .select('ingredient_id, times_used')
    .eq('tenant_id', user.tenantId!)

  const usageMap = new Map(
    (usageData || []).map(u => [u.ingredient_id, u.times_used ?? 0])
  )

  return (ingredients || []).map(ing => ({
    ...ing,
    usage_count: usageMap.get(ing.id) ?? 0,
  }))
}

// ============================================
// 10. CREATE INGREDIENT (find-or-create)
// ============================================

export async function createIngredient(input: CreateIngredientInput) {
  const user = await requireChef()
  const supabase = createServerClient()
  const validated = CreateIngredientSchema.parse(input)

  // Find-or-create: check for existing ingredient (case-insensitive)
  const { data: existing } = await supabase
    .from('ingredients')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .ilike('name', validated.name)
    .limit(1)
    .single()

  if (existing) {
    return { success: true, ingredient: existing, existed: true }
  }

  const { data: ingredient, error } = await supabase
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
  const supabase = createServerClient()
  const validated = UpdateIngredientSchema.parse(input)

  const updateData: Record<string, unknown> = { updated_by: user.id }
  if (validated.name !== undefined) updateData.name = validated.name
  if (validated.category !== undefined) updateData.category = validated.category
  if (validated.default_unit !== undefined) updateData.default_unit = validated.default_unit
  if (validated.description !== undefined) updateData.description = validated.description
  if (validated.average_price_cents !== undefined) updateData.average_price_cents = validated.average_price_cents
  if (validated.is_staple !== undefined) updateData.is_staple = validated.is_staple
  if (validated.allergen_flags !== undefined) updateData.allergen_flags = validated.allergen_flags
  if (validated.dietary_tags !== undefined) updateData.dietary_tags = validated.dietary_tags

  const { data: ingredient, error } = await supabase
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
  const supabase = createServerClient()

  // Verify recipe belongs to tenant
  const { data: recipe } = await supabase
    .from('recipes')
    .select('id')
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!recipe) {
    throw new Error('Recipe not found')
  }

  // Verify component belongs to tenant
  const { data: component } = await supabase
    .from('components')
    .select('id')
    .eq('id', componentId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!component) {
    throw new Error('Component not found')
  }

  const { error } = await supabase
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
  const supabase = createServerClient()

  const { error } = await supabase
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
  const supabase = createServerClient()

  // Event → menus → dishes → components → recipes
  const { data: menus } = await supabase
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (!menus || menus.length === 0) return []

  const menuIds = menus.map(m => m.id)

  const { data: dishes } = await supabase
    .from('dishes')
    .select('id')
    .in('menu_id', menuIds)
    .eq('tenant_id', user.tenantId!)

  if (!dishes || dishes.length === 0) return []

  const dishIds = dishes.map(d => d.id)

  const { data: components } = await supabase
    .from('components')
    .select(`
      id,
      name,
      category,
      recipe:recipes(id, name, category, method)
    `)
    .in('dish_id', dishIds)
    .eq('tenant_id', user.tenantId!)
    .not('recipe_id', 'is', null)

  return (components || []).map(c => ({
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
  const supabase = createServerClient()

  // Event → menus → dishes → components where recipe_id IS NULL
  const { data: menus } = await supabase
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (!menus || menus.length === 0) return []

  const menuIds = menus.map(m => m.id)

  const { data: dishes } = await supabase
    .from('dishes')
    .select('id')
    .in('menu_id', menuIds)
    .eq('tenant_id', user.tenantId!)

  if (!dishes || dishes.length === 0) return []

  const dishIds = dishes.map(d => d.id)

  const { data: components } = await supabase
    .from('components')
    .select('id, name, category')
    .in('dish_id', dishIds)
    .eq('tenant_id', user.tenantId!)
    .is('recipe_id', null)

  return (components || []).map(c => ({
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
  const supabase = createServerClient()

  const now = new Date()
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(now.getDate() - 7)
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(now.getDate() - 30)

  // All components with no recipe, joined through their event
  const { data: components } = await supabase
    .from('components')
    .select(`
      id,
      dish:dishes(
        menu:menus(
          event:events(id, event_date)
        )
      )
    `)
    .eq('tenant_id', user.tenantId!)
    .is('recipe_id', null)

  let last7Days = 0
  let last30Days = 0
  let older = 0

  for (const comp of components || []) {
    const dish = comp.dish as any
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

  const { count: totalRecipes } = await supabase
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
  const supabase = createServerClient()

  const { data: components } = await supabase
    .from('components')
    .select(`
      id, name, category,
      dish:dishes(
        menu:menus(
          event:events(
            id, occasion, event_date,
            client:clients(full_name)
          )
        )
      )
    `)
    .eq('tenant_id', user.tenantId!)
    .is('recipe_id', null)

  const results: UnrecordedComponentForSprint[] = []

  for (const comp of components || []) {
    const dish = comp.dish as any
    const event = dish?.menu?.event
    if (!event?.id || !event?.event_date) continue

    results.push({
      componentId: comp.id,
      componentName: comp.name,
      componentCategory: comp.category,
      eventId: event.id,
      eventOccasion: event.occasion ?? null,
      eventDate: event.event_date,
      clientName: (event.client as any)?.full_name ?? null,
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
  const supabase = createServerClient()

  const { data: recipes } = await supabase
    .from('recipes')
    .select('id, name, category')
    .eq('tenant_id', user.tenantId!)
    .eq('archived', false)
    .ilike('name', `%${query}%`)
    .order('name', { ascending: true })
    .limit(20)

  return recipes || []
}

// ============================================
// HELPER: Find or create ingredient
// ============================================

async function findOrCreateIngredient(
  supabase: ReturnType<typeof createServerClient>,
  tenantId: string,
  userId: string,
  name: string,
  category: IngredientCategory,
  defaultUnit: string,
): Promise<string> {
  // Case-insensitive lookup
  const { data: existing } = await supabase
    .from('ingredients')
    .select('id')
    .eq('tenant_id', tenantId)
    .ilike('name', name)
    .limit(1)
    .single()

  if (existing) {
    return existing.id
  }

  const { data: newIngredient, error } = await supabase
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
