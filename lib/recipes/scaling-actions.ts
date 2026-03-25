'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { scaleRecipe, type ScalableIngredient, type ScaleResult } from './recipe-scaling'

// ── Types ──────────────────────────────────────────────────────────────────────

export type ScaledRecipeResult = {
  recipeId: string
  recipeName: string
  originalYield: number
  targetServings: number
  yieldUnit: string
  scaling: ScaleResult
}

export type ScaledMenuResult = {
  eventId: string
  eventName: string
  guestCount: number
  menuId: string
  menuName: string
  recipes: ScaledRecipeResult[]
}

// ── getScaledRecipe ────────────────────────────────────────────────────────────

export async function getScaledRecipe(
  recipeId: string,
  targetServings: number
): Promise<ScaledRecipeResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch recipe with ingredients
  const { data: recipe, error: recipeError } = await db
    .from('recipes')
    .select(
      `
      id,
      name,
      servings,
      yield_quantity,
      yield_unit
    `
    )
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (recipeError || !recipe) {
    throw new Error('Recipe not found')
  }

  // Fetch recipe ingredients with ingredient details
  const { data: recipeIngredients, error: ingredientsError } = await db
    .from('recipe_ingredients')
    .select(
      `
      id,
      quantity,
      unit,
      ingredient_id,
      ingredients (
        id,
        name,
        category
      )
    `
    )
    .eq('recipe_id', recipeId)
    .order('sort_order', { ascending: true })

  if (ingredientsError) {
    throw new Error('Failed to load recipe ingredients')
  }

  // Use yield_quantity if available, fall back to servings
  const originalYield = recipe.yield_quantity ?? recipe.servings ?? 1
  const yieldUnit = recipe.yield_unit ?? 'servings'

  // Map to ScalableIngredient format
  const ingredients: ScalableIngredient[] = (recipeIngredients ?? [])
    .filter((ri: any) => ri.ingredients)
    .map((ri: any) => {
      const ing = ri.ingredients as unknown as { id: string; name: string; category: string }
      return {
        ingredientId: ing.id,
        name: ing.name,
        quantity: ri.quantity,
        unit: ri.unit,
        ingredientCategory: ing.category,
      }
    })

  const scaling = scaleRecipe(ingredients, originalYield, targetServings)

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    originalYield,
    targetServings,
    yieldUnit,
    scaling,
  }
}

// ── getScaledMenuForEvent ──────────────────────────────────────────────────────

export async function getScaledMenuForEvent(eventId: string): Promise<ScaledMenuResult | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch event with guest count
  const { data: event, error: eventError } = await db
    .from('events')
    .select('id, title, guest_count')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found')
  }

  // Find menu linked to this event
  const { data: menu, error: menuError } = await db
    .from('menus')
    .select('id, name')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()

  if (menuError) {
    throw new Error('Failed to load event menu')
  }

  if (!menu) {
    return null // No menu linked to this event
  }

  // Get dishes for this menu
  const { data: dishes, error: dishesError } = await db
    .from('dishes')
    .select('id')
    .eq('menu_id', menu.id)
    .eq('tenant_id', user.tenantId!)

  if (dishesError || !dishes?.length) {
    return {
      eventId: event.id,
      eventName: event.title,
      guestCount: event.guest_count,
      menuId: menu.id,
      menuName: menu.name,
      recipes: [],
    }
  }

  // Get components with recipe_id for these dishes
  const dishIds = dishes.map((d: any) => d.id)
  const { data: components, error: componentsError } = await db
    .from('components')
    .select('recipe_id')
    .in('dish_id', dishIds)
    .eq('tenant_id', user.tenantId!)
    .not('recipe_id', 'is', null)

  if (componentsError || !components?.length) {
    return {
      eventId: event.id,
      eventName: event.title,
      guestCount: event.guest_count,
      menuId: menu.id,
      menuName: menu.name,
      recipes: [],
    }
  }

  // Get unique recipe IDs
  const recipeIds = [
    ...new Set(components.map((c: any) => c.recipe_id).filter(Boolean)),
  ] as string[]

  // Scale each recipe to the event's guest count
  const recipes: ScaledRecipeResult[] = []
  for (const recipeId of recipeIds) {
    try {
      const scaled = await getScaledRecipe(recipeId, event.guest_count)
      recipes.push(scaled)
    } catch {
      // Skip recipes that fail to load (e.g. deleted ingredients)
      continue
    }
  }

  return {
    eventId: event.id,
    eventName: event.title,
    guestCount: event.guest_count,
    menuId: menu.id,
    menuName: menu.name,
    recipes,
  }
}
