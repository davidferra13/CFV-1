'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  calculateTruePlateCost,
  IRS_MILEAGE_RATE_CENTS_2026,
  DEFAULT_OVERHEAD_PERCENT,
  DEFAULT_HOURLY_RATE_CENTS,
  type TruePlateCost,
} from '@/lib/formulas/true-plate-cost'

export interface PlateCostResult {
  success: true
  data: TruePlateCost & {
    guestCount: number
    quotedPriceCents: number | null
    quotedPerPlateCents: number | null
    ingredientCostCents: number
    laborHours: number
    travelMiles: number
  }
}

export interface PlateCostError {
  success: false
  error: string
}

/**
 * Gathers data from menus, events, and pricing config,
 * then computes the true plate cost breakdown.
 *
 * Requires at least one of menuId or eventId.
 * If eventId is provided, uses its guest_count, quoted_price_cents, and menu_id.
 * If menuId is provided directly, uses it for recipe data.
 */
export async function getTruePlateCost(input: {
  menuId?: string
  eventId?: string
}): Promise<PlateCostResult | PlateCostError> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const db: any = createServerClient()

    if (!input.menuId && !input.eventId) {
      return { success: false, error: 'Either menuId or eventId is required' }
    }

    let guestCount = 0
    let quotedPriceCents: number | null = null
    let menuId = input.menuId || null
    let travelMiles = 0

    // 1. If eventId provided, fetch event data
    if (input.eventId) {
      const { data: event, error: eventError } = await db
        .from('events')
        .select('guest_count, quoted_price_cents, menu_id, mileage_miles')
        .eq('id', input.eventId)
        .eq('tenant_id', tenantId)
        .single()

      if (eventError || !event) {
        return { success: false, error: 'Event not found or access denied' }
      }

      guestCount = event.guest_count || 0
      quotedPriceCents = event.quoted_price_cents
      travelMiles = event.mileage_miles || 0

      // Use event's menu_id if no menuId was passed directly
      if (!menuId && event.menu_id) {
        menuId = event.menu_id
      }
    }

    if (!menuId) {
      return { success: false, error: 'No menu linked. Link a menu to calculate plate cost.' }
    }

    // 2. Fetch dishes with linked recipes
    const { data: menuItems, error: itemsError } = await db
      .from('dishes')
      .select(
        `
        id, name, course_name,
        linked_recipe_id
      `
      )
      .eq('menu_id', menuId)
      .eq('tenant_id', tenantId)

    if (itemsError) {
      return { success: false, error: `Failed to load dishes: ${itemsError.message}` }
    }

    if (!menuItems || menuItems.length === 0) {
      return { success: false, error: 'Menu has no dishes' }
    }

    // 3. Sum ingredient costs and estimate labor from recipe times
    let totalIngredientCostCents = 0
    let totalPrepMinutes = 0
    let totalCookMinutes = 0

    const recipeIds = menuItems
      .map((item: any) => item.linked_recipe_id)
      .filter(Boolean) as string[]

    let recipeMap = new Map<string, any>()
    if (recipeIds.length > 0) {
      const { data: recipes } = await db
        .from('recipes')
        .select('id, total_cost_cents, prep_time_minutes, cook_time_minutes, servings')
        .in('id', recipeIds)
        .eq('tenant_id', tenantId)

      for (const r of recipes ?? []) {
        recipeMap.set(r.id, r)
      }
    }

    for (const item of menuItems) {
      const recipe = item.linked_recipe_id ? recipeMap.get(item.linked_recipe_id) : null
      if (recipe) {
        totalIngredientCostCents += recipe.total_cost_cents || 0
        totalPrepMinutes += recipe.prep_time_minutes || 0
        totalCookMinutes += recipe.cook_time_minutes || 0
      }
    }

    // Estimate labor hours from recipe prep + cook times
    const laborHours = (totalPrepMinutes + totalCookMinutes) / 60

    // 4. Fetch chef pricing config for mileage rate
    let mileageRateCents = IRS_MILEAGE_RATE_CENTS_2026
    let hourlyRateCents = DEFAULT_HOURLY_RATE_CENTS
    let overheadPercent = DEFAULT_OVERHEAD_PERCENT

    const { data: pricingConfig } = await db
      .from('chef_pricing_config')
      .select('mileage_rate_cents, overhead_percent, hourly_rate_cents')
      .eq('chef_id', tenantId)
      .single()

    if (pricingConfig?.mileage_rate_cents) {
      mileageRateCents = pricingConfig.mileage_rate_cents
    }
    if (pricingConfig?.overhead_percent != null) {
      overheadPercent = pricingConfig.overhead_percent
    }
    if (pricingConfig?.hourly_rate_cents) {
      hourlyRateCents = pricingConfig.hourly_rate_cents
    }

    // If no guest count from event, default to 1 to avoid division by zero
    if (guestCount <= 0) {
      guestCount = 1
    }

    // 5. Calculate true plate cost
    const result = calculateTruePlateCost({
      ingredientCostCents: totalIngredientCostCents,
      guestCount,
      laborHours,
      hourlyRateCents,
      travelMiles,
      mileageRateCents,
      overheadPercent,
      quotedPriceCents: quotedPriceCents || undefined,
    })

    const quotedPerPlateCents =
      quotedPriceCents && guestCount > 0 ? Math.round(quotedPriceCents / guestCount) : null

    return {
      success: true,
      data: {
        ...result,
        guestCount,
        quotedPriceCents,
        quotedPerPlateCents,
        ingredientCostCents: totalIngredientCostCents,
        laborHours,
        travelMiles,
      },
    }
  } catch (err: any) {
    console.error('[getTruePlateCost] Error:', err)
    return { success: false, error: err.message || 'Failed to calculate plate cost' }
  }
}
