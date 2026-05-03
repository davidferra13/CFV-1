// Ingredient Board - Menu Sync
// Pull ingredients from an event's menu into the ingredient availability board.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { bulkAddIngredients, type IngredientCategory } from './ingredient-board-actions'

// Map common ingredient categories to board categories
function inferCategory(ingredientName: string, category?: string): IngredientCategory {
  const name = (ingredientName || '').toLowerCase()
  const cat = (category || '').toLowerCase()

  if (
    cat.includes('herb') ||
    name.includes('basil') ||
    name.includes('cilantro') ||
    name.includes('thyme') ||
    name.includes('rosemary') ||
    name.includes('mint') ||
    name.includes('parsley') ||
    name.includes('dill') ||
    name.includes('sage')
  )
    return 'herb'
  if (
    cat.includes('dairy') ||
    name.includes('butter') ||
    name.includes('cream') ||
    name.includes('cheese') ||
    name.includes('milk') ||
    name.includes('yogurt')
  )
    return 'dairy'
  if (
    cat.includes('protein') ||
    cat.includes('meat') ||
    cat.includes('seafood') ||
    name.includes('chicken') ||
    name.includes('beef') ||
    name.includes('pork') ||
    name.includes('fish') ||
    name.includes('shrimp') ||
    name.includes('lamb')
  )
    return 'protein'
  if (
    cat.includes('grain') ||
    name.includes('flour') ||
    name.includes('rice') ||
    name.includes('bread') ||
    name.includes('pasta') ||
    name.includes('oat')
  )
    return 'grain'
  if (
    cat.includes('produce') ||
    cat.includes('vegetable') ||
    cat.includes('fruit') ||
    name.includes('tomato') ||
    name.includes('onion') ||
    name.includes('garlic') ||
    name.includes('potato') ||
    name.includes('carrot') ||
    name.includes('lettuce')
  )
    return 'produce'
  if (
    cat.includes('pantry') ||
    cat.includes('spice') ||
    cat.includes('oil') ||
    name.includes('salt') ||
    name.includes('pepper') ||
    name.includes('oil') ||
    name.includes('vinegar') ||
    name.includes('sugar')
  )
    return 'pantry'

  return 'other'
}

/**
 * Sync ingredients from an event's assigned menu(s) into the ingredient board.
 * Returns count of new ingredients added (skips duplicates).
 */
export async function syncMenuToIngredientBoard(input: {
  boardId: string
  eventId: string
}): Promise<{ success: boolean; added: number; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify board belongs to chef
  const { data: board } = await db
    .from('circle_ingredient_board')
    .select('id, tenant_id')
    .eq('id', input.boardId)
    .eq('tenant_id', user.entityId)
    .single()

  if (!board) return { success: false, added: 0, error: 'Board not found' }

  // Get menus assigned to this event
  const { data: eventMenus } = await db
    .from('event_menus')
    .select('menu_id')
    .eq('event_id', input.eventId)

  if (!eventMenus || eventMenus.length === 0) {
    // Try direct menu assignment on event
    const { data: event } = await db
      .from('events')
      .select('menu_id')
      .eq('id', input.eventId)
      .single()

    if (!event?.menu_id) {
      return { success: false, added: 0, error: 'No menu assigned to this event' }
    }

    eventMenus.push({ menu_id: event.menu_id })
  }

  const menuIds = eventMenus.map((em: any) => em.menu_id)

  // Get all recipes from these menus
  const { data: menuCourses } = await db
    .from('menu_courses')
    .select('recipe_id')
    .in('menu_id', menuIds)
    .not('recipe_id', 'is', null)

  if (!menuCourses || menuCourses.length === 0) {
    return { success: false, added: 0, error: 'No recipes found in the menu' }
  }

  const recipeIds = [...new Set(menuCourses.map((mc: any) => mc.recipe_id))]

  // Get all ingredients from these recipes
  const { data: recipeIngredients } = await db
    .from('recipe_ingredients')
    .select('ingredient_name, quantity, unit, category, ingredient_id')
    .in('recipe_id', recipeIds)

  if (!recipeIngredients || recipeIngredients.length === 0) {
    return { success: false, added: 0, error: 'No ingredients found in recipes' }
  }

  // Dedupe and format for board
  const ingredientMap = new Map<
    string,
    { name: string; category: IngredientCategory; quantity: string }
  >()

  for (const ri of recipeIngredients) {
    const name = (ri.ingredient_name || '').trim()
    if (!name) continue

    const key = name.toLowerCase()
    if (!ingredientMap.has(key)) {
      const qty = ri.quantity && ri.unit ? `${ri.quantity} ${ri.unit}` : ri.quantity || ''
      ingredientMap.set(key, {
        name,
        category: inferCategory(name, ri.category),
        quantity: qty,
      })
    } else {
      // Accumulate quantities if same ingredient appears multiple times
      const existing = ingredientMap.get(key)!
      if (ri.quantity && ri.unit && existing.quantity) {
        existing.quantity += `, +${ri.quantity} ${ri.unit}`
      }
    }
  }

  const ingredients = [...ingredientMap.values()]

  if (ingredients.length === 0) {
    return { success: false, added: 0, error: 'No named ingredients found' }
  }

  return bulkAddIngredients({ boardId: input.boardId, ingredients })
}
