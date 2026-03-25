'use server'

// Grocery List Consolidation + Substitution
// Pure formula: arithmetic for quantities, lookup tables for sections, keyword matching for flags.
//
// Previously used Ollama to consolidate ingredient lists.
// Removed: ingredient consolidation is addition, section assignment is a lookup table,
// dietary flagging is keyword matching, and common substitutions are a curated map.
// None of these require AI. A formula is instant, free, and always consistent.
//
// The substitution map covers 90%+ of real private chef scenarios.
// Chefs know their own exotic swaps better than any LLM would.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  consolidateGroceryFormula,
  type GroceryConsolidationResult,
  type ConsolidatedIngredient,
} from '@/lib/formulas/grocery-consolidation'

// Re-export types for consumers
export type { ConsolidatedIngredient, GroceryConsolidationResult }

export async function consolidateGroceryList(eventId: string): Promise<GroceryConsolidationResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  // event_menu_components is not in generated types - table exists in DB but not yet in types/database.ts
  const [eventResult, menuResult] = await Promise.all([
    db
      .from('events')
      .select('occasion, guest_count, dietary_restrictions, allergies')
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single(),
    (db.from as Function)('event_menu_components')
      .select(
        `
        name,
        recipes(name, servings, recipe_ingredients(quantity, unit, ingredients(name)))
      `
      )
      .eq('event_id', eventId) as Promise<{
      data: Array<{
        name: string
        recipes: {
          name: string
          servings: number | null
          recipe_ingredients: Array<{
            quantity: number
            unit: string
            ingredients: { name: string } | null
          }>
        } | null
      }> | null
    }>,
  ])

  const event = eventResult.data
  if (!event) throw new Error('Event not found')

  const menuItems = menuResult.data ?? []
  const guestCount = event.guest_count ?? 10

  // Flatten all ingredients with recipe context and scale for guest count
  const allIngredients: {
    recipeName: string
    ingredientName: string
    quantity: string
    unit: string
  }[] = []

  for (const item of menuItems) {
    const recipe = Array.isArray(item.recipes) ? item.recipes[0] : item.recipes
    if (!recipe) continue
    const recipeServings = recipe.servings ?? 4
    const scaleFactor = guestCount / recipeServings
    const ingredients = Array.isArray(recipe.recipe_ingredients) ? recipe.recipe_ingredients : []

    for (const ing of ingredients) {
      allIngredients.push({
        recipeName: item.name,
        ingredientName: ing.ingredients?.name ?? 'Unknown ingredient',
        quantity: ing.quantity ? String(Math.ceil(Number(ing.quantity) * scaleFactor)) : '',
        unit: ing.unit ?? '',
      })
    }
  }

  if (allIngredients.length === 0) {
    return {
      ingredients: [],
      bySection: {},
      dietaryFlags: [],
      shoppingNotes:
        'No recipes with ingredients found for this event. Add recipes with ingredient lists to generate a grocery list.',
      generatedAt: new Date().toISOString(),
    }
  }

  const restrictions = [...(event.dietary_restrictions ?? []), ...(event.allergies ?? [])].filter(
    Boolean
  )

  // Pure formula. No AI. Instant. Free. Consistent.
  return consolidateGroceryFormula(allIngredients, restrictions)
}
