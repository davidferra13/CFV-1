'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { generateEventShoppingList } from '@/lib/culinary/shopping-list-actions'
import { getEventCostVariance } from '@/lib/finance/expense-line-item-actions'
import { getEventPnL } from '@/lib/finance/profit-actions'
import { PORTIONS_BY_SERVICE_STYLE } from '@/lib/finance/industry-benchmarks'
import { getPurchaseOrders } from '@/lib/inventory/purchase-order-actions'
import { getEventPrepBlocks } from '@/lib/scheduling/prep-block-actions'
import {
  buildProductionStages,
  computeScaledProductionRecipes,
  type ProductionLoopSignals,
  type ScaledProductionRecipe,
} from './production-loop'

export type ScaledEventRecipe = ScaledProductionRecipe

export type EventProductionLoopSnapshot = {
  event: {
    id: string
    occasion: string | null
    eventDate: string
    guestCount: number
    serviceStyle: string
    status: string
  }
  menuCount: number
  recipes: ScaledEventRecipe[]
  shopping: Awaited<ReturnType<typeof generateEventShoppingList>>
  prepBlockCount: number
  purchaseOrders: Awaited<ReturnType<typeof getPurchaseOrders>>
  variance: Awaited<ReturnType<typeof getEventCostVariance>>
  pnl: Awaited<ReturnType<typeof getEventPnL>>
  stages: ReturnType<typeof buildProductionStages>
}

async function getScaledEventRecipes(input: {
  db: any
  tenantId: string
  eventId: string
  guestCount: number
  serviceStyle: string
}) {
  const { db, tenantId, eventId, guestCount, serviceStyle } = input
  const { data: menus, error: menuError } = await db
    .from('menus')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)

  if (menuError) throw new Error(`Failed to load event menus: ${menuError.message}`)
  if (!menus?.length) return { menuCount: 0, recipes: [] as ScaledEventRecipe[] }
  const menuIds = menus.map((menu: any) => menu.id)
  const { data: dishes, error: dishError } = await db
    .from('dishes')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('menu_id', menuIds)

  if (dishError) throw new Error(`Failed to load event dishes: ${dishError.message}`)
  if (!dishes?.length) return { menuCount: menus.length, recipes: [] as ScaledEventRecipe[] }

  const { data: components, error: componentError } = await db
    .from('components')
    .select('recipe_id, scale_factor')
    .eq('tenant_id', tenantId)
    .in('dish_id', dishes.map((dish: any) => dish.id))
    .not('recipe_id', 'is', null)

  if (componentError) throw new Error(`Failed to load menu recipes: ${componentError.message}`)
  if (!components?.length) return { menuCount: menus.length, recipes: [] as ScaledEventRecipe[] }

  const recipeIds = [...new Set(components.map((component: any) => component.recipe_id))]
  const { data: recipeRows, error: recipeError } = await db
    .from('recipes')
    .select('id, name, servings, yield_quantity')
    .eq('tenant_id', tenantId)
    .in('id', recipeIds)
  if (recipeError) throw new Error(`Failed to load recipe yields: ${recipeError.message}`)

  const recipes = computeScaledProductionRecipes({
    guestCount,
    serviceStyleMultiplier: PORTIONS_BY_SERVICE_STYLE[serviceStyle]?.multiplier ?? 1,
    recipes: (recipeRows ?? []).map((recipe: any) => ({
      id: recipe.id,
      name: recipe.name ?? 'Unnamed recipe',
      servings: recipe.servings,
      yieldQuantity: recipe.yield_quantity,
    })),
    components: (components as any[]).map((component) => ({
      recipeId: component.recipe_id,
      scaleFactor: component.scale_factor,
    })),
  })

  return { menuCount: menus.length, recipes }
}
export async function getEventProductionLoopSnapshot(
  eventId: string
): Promise<EventProductionLoopSnapshot> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data: event, error } = await db
    .from('events')
    .select('id, occasion, event_date, guest_count, service_style, status')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !event) throw new Error('Event not found')

  const guestCount = Number(event.guest_count) || 1
  const serviceStyle = event.service_style ?? 'plated'

  const scaled = await getScaledEventRecipes({
    db,
    tenantId,
    eventId,
    guestCount,
    serviceStyle,
  })
  const emptyShopping = {
    startDate: event.event_date,
    endDate: event.event_date,
    items: [],
    totalEstimatedCostCents: 0,
    shortageCount: 0,
    incompleteRecipes: [],
  }

  const [shopping, prepBlocks, purchaseOrders, variance, pnl] = await Promise.all([
    generateEventShoppingList(eventId).catch(() => emptyShopping),
    getEventPrepBlocks(eventId).catch(() => []),
    getPurchaseOrders({ eventId }).catch(() => []),
    getEventCostVariance(eventId).catch(() => ({
      totalActualCents: 0,
      totalEstimatedCents: 0,
      varianceCents: 0,
      variancePercent: null,
      lineItems: [],
      unmatchedCount: 0,
      matchedCount: 0,
    })),
    getEventPnL(eventId).catch(() => null),
  ])

  const vendorCount = new Set(
    shopping.items.filter((item) => item.toBuy > 0).map((item) => item.supplier)
  ).size
  const signals: ProductionLoopSignals = {
    eventStatus: event.status,
    hasMenu: scaled.menuCount > 0,
    recipeCount: scaled.recipes.length,
    incompleteRecipeCount: shopping.incompleteRecipes.length,
    shoppingEligible: ['accepted', 'paid', 'confirmed'].includes(event.status),
    shortageCount: shopping.shortageCount,
    projectedPurchaseCents: shopping.totalEstimatedCostCents,
    vendorCount,
    prepBlockCount: prepBlocks.length,
    purchaseOrderCount: purchaseOrders.length,
    openPurchaseOrderCount: purchaseOrders.filter(
      (po) => !['received', 'cancelled'].includes(po.status)
    ).length,
    actualFoodCostCents: variance.totalActualCents,
    unmatchedReceiptItems: variance.unmatchedCount,
    revenueCents: pnl?.revenueCents ?? 0,
    totalCostCents: pnl?.totalCostCents ?? 0,
  }

  return {
    event: {
      id: event.id,
      occasion: event.occasion,
      eventDate: event.event_date,
      guestCount,
      serviceStyle,
      status: event.status,
    },
    menuCount: scaled.menuCount,
    recipes: scaled.recipes,
    shopping,
    prepBlockCount: prepBlocks.length,
    purchaseOrders,
    variance,
    pnl,
    stages: buildProductionStages(signals),
  }
}
