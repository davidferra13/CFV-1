// Resolve Menu Cost via PIE Bridge
// Pulls ingredient costs for a menu's dishes from the Pricing Intelligence Engine.
// Falls back to template pricing when Pi bridge is unavailable.

import { createServerClient } from '@/lib/db/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MenuCostResult {
  totalFoodCostCents: number
  perPersonCents: number
  guestCount: number
  items: MenuCostItem[]
  source: 'pie' | 'template' | 'estimate'
  confidence: number // 0-1, higher = more price data available
}

export interface MenuCostItem {
  dishName: string
  ingredientCount: number
  costCents: number
  source: 'pie' | 'estimate'
}

// ---------------------------------------------------------------------------
// Main Resolution
// ---------------------------------------------------------------------------

export async function resolveMenuCost(
  chefId: string,
  menuId: string,
  guestCount: number
): Promise<MenuCostResult> {
  const db: any = createServerClient()

  // Get menu template items (dishes/ingredients)
  const { data: menuItems } = await db
    .from('menu_template_items')
    .select('id, dish_name, ingredient_names, servings_per_recipe')
    .eq('menu_template_id', menuId)

  if (!menuItems || menuItems.length === 0) {
    // Fallback to template price
    const { data: template } = await db
      .from('menu_templates')
      .select('price_per_person_cents')
      .eq('id', menuId)
      .single()

    const perPerson = template?.price_per_person_cents || 5000 // $50 default
    return {
      totalFoodCostCents: perPerson * guestCount,
      perPersonCents: perPerson,
      guestCount,
      items: [],
      source: 'template',
      confidence: 0.3,
    }
  }

  // Try to resolve each dish's ingredient costs via PIE
  const items: MenuCostItem[] = []
  let totalResolved = 0
  let totalItems = menuItems.length

  for (const item of menuItems) {
    const ingredientNames: string[] = item.ingredient_names || []
    let dishCost = 0
    let resolvedCount = 0

    if (ingredientNames.length > 0) {
      try {
        const { resolvePrice } = await import('@/lib/pricing/resolve-price')
        for (const name of ingredientNames) {
          const price = await resolvePrice(name, chefId)
          if (price && price.cents > 0) {
            // Scale by servings needed for guest count
            const servingsPerRecipe = item.servings_per_recipe || 4
            const multiplier = Math.ceil(guestCount / servingsPerRecipe)
            dishCost += price.cents * multiplier
            resolvedCount++
          }
        }
      } catch {
        // PIE unavailable, will use estimate
      }
    }

    if (resolvedCount > 0) {
      totalResolved++
      items.push({
        dishName: item.dish_name || 'Unnamed dish',
        ingredientCount: ingredientNames.length,
        costCents: dishCost,
        source: 'pie',
      })
    } else {
      // Estimate: $8-12 per dish per person
      const estimatedPerPerson = 1000 // $10
      const estimated = estimatedPerPerson * guestCount
      items.push({
        dishName: item.dish_name || 'Unnamed dish',
        ingredientCount: ingredientNames.length,
        costCents: estimated,
        source: 'estimate',
      })
    }
  }

  const totalFoodCostCents = items.reduce((sum, i) => sum + i.costCents, 0)
  const perPersonCents = guestCount > 0 ? Math.round(totalFoodCostCents / guestCount) : 0
  const confidence = totalItems > 0 ? totalResolved / totalItems : 0

  return {
    totalFoodCostCents,
    perPersonCents,
    guestCount,
    items,
    source: confidence > 0.5 ? 'pie' : 'estimate',
    confidence,
  }
}
