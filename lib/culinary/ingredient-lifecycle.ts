'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { computeIngredientCost, lookupDensity } from '@/lib/units/conversion-engine'

export type LifecycleItem = {
  ingredientId: string
  ingredientName: string
  unit: string
  // Stage 1-2: always present (derived from recipe)
  recipeQty: number
  yieldPct: number
  buyQty: number
  // Stage 3: null = no purchase transactions recorded for this event
  purchasedQty: number | null
  purchasedCostCents: number | null
  // Stage 4: null = no usage deductions recorded for this event
  usedQty: number | null
  // Stage 5: null if either purchased or used is null
  computedLeftoverQty: number | null
  lastPriceCents: number
  priceUnit: string
  density: number | null
  // Variance: null if upstream stage is null
  purchaseVarianceQty: number | null
  usageVarianceQty: number | null
}

export type LifecycleResult = {
  eventId: string
  items: LifecycleItem[]
  totals: {
    recipeCostCents: number
    buyCostCents: number
    purchasedCostCents: number
  }
}

export async function getEventIngredientLifecycle(eventId: string): Promise<LifecycleResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify event belongs to this chef
  const { data: event, error: eventError } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found or access denied')
  }

  // Fetch recipe ingredients with yield data for this event's menus
  const { data: menus } = await db
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (!menus?.length) {
    return {
      eventId,
      items: [],
      totals: { recipeCostCents: 0, buyCostCents: 0, purchasedCostCents: 0 },
    }
  }

  const menuIds = menus.map((m: any) => m.id)

  const { data: dishes } = await db
    .from('dishes')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .in('menu_id', menuIds)

  if (!dishes?.length) {
    return {
      eventId,
      items: [],
      totals: { recipeCostCents: 0, buyCostCents: 0, purchasedCostCents: 0 },
    }
  }

  const dishIds = dishes.map((d: any) => d.id)

  const { data: components } = await db
    .from('components')
    .select('recipe_id, scale_factor')
    .eq('tenant_id', user.tenantId!)
    .in('dish_id', dishIds)
    .not('recipe_id', 'is', null)

  if (!components?.length) {
    return {
      eventId,
      items: [],
      totals: { recipeCostCents: 0, buyCostCents: 0, purchasedCostCents: 0 },
    }
  }

  // Build recipe multipliers
  const recipeMultipliers = new Map<string, number>()
  for (const c of components as any[]) {
    const rid = c.recipe_id as string
    const scale = Number(c.scale_factor) || 1
    recipeMultipliers.set(rid, (recipeMultipliers.get(rid) ?? 0) + scale)
  }

  // Fetch recipe ingredients with yield
  const { data: recipeIngredients } = await db
    .from('recipe_ingredients')
    .select('recipe_id, ingredient_id, quantity, unit, yield_pct')
    .in('recipe_id', Array.from(recipeMultipliers.keys()))

  if (!recipeIngredients?.length) {
    return {
      eventId,
      items: [],
      totals: { recipeCostCents: 0, buyCostCents: 0, purchasedCostCents: 0 },
    }
  }

  const ingredientIds = Array.from(
    new Set((recipeIngredients as any[]).map((r: any) => r.ingredient_id).filter(Boolean))
  ) as string[]

  // Fetch ingredients, inventory transactions (purchases + usage) in parallel
  const [ingredientRows, purchaseRows, usageRows] = await Promise.all([
    db
      .from('ingredients')
      .select(
        'id, name, last_price_cents, default_yield_pct, price_unit, default_unit, weight_to_volume_ratio'
      )
      .eq('tenant_id', user.tenantId!)
      .in('id', ingredientIds),
    db
      .from('inventory_transactions')
      .select('ingredient_id, quantity, cost_cents, unit')
      .eq('chef_id', user.tenantId!)
      .eq('event_id', eventId)
      .eq('transaction_type', 'receive'),
    db
      .from('inventory_transactions')
      .select('ingredient_id, quantity, unit')
      .eq('chef_id', user.tenantId!)
      .eq('event_id', eventId)
      .eq('transaction_type', 'event_deduction'),
  ])

  const ingredientMap = new Map<string, any>((ingredientRows.data ?? []).map((r: any) => [r.id, r]))

  // Aggregate purchases by ingredient
  const purchasedByIngredient = new Map<string, { qty: number; costCents: number }>()
  for (const row of purchaseRows.data ?? []) {
    if (!row.ingredient_id) continue
    const existing = purchasedByIngredient.get(row.ingredient_id) ?? { qty: 0, costCents: 0 }
    existing.qty += Math.abs(Number(row.quantity) || 0)
    existing.costCents += Math.abs(Number(row.cost_cents) || 0)
    purchasedByIngredient.set(row.ingredient_id, existing)
  }

  // Aggregate usage by ingredient
  const usedByIngredient = new Map<string, number>()
  for (const row of usageRows.data ?? []) {
    if (!row.ingredient_id) continue
    usedByIngredient.set(
      row.ingredient_id,
      (usedByIngredient.get(row.ingredient_id) ?? 0) + Math.abs(Number(row.quantity) || 0)
    )
  }

  // Build lifecycle items
  const lifecycleMap = new Map<string, LifecycleItem>()

  for (const ri of recipeIngredients as any[]) {
    const ingredient = ingredientMap.get(ri.ingredient_id)
    if (!ingredient) continue

    const multiplier = recipeMultipliers.get(ri.recipe_id) ?? 1
    const recipeQty = (Number(ri.quantity) || 0) * multiplier
    const yieldPct = Math.max(
      Number(ri.yield_pct) || Number(ingredient.default_yield_pct) || 100,
      1
    )
    const buyQty = (recipeQty * 100) / yieldPct
    const key = `${ri.ingredient_id}:${ri.unit}`

    const existing = lifecycleMap.get(key)
    if (existing) {
      existing.recipeQty += recipeQty
      existing.buyQty += buyQty
      existing.yieldPct = Math.min(existing.yieldPct, yieldPct)
    } else {
      const purchased = purchasedByIngredient.get(ri.ingredient_id) // undefined = not recorded
      const usedQty = usedByIngredient.get(ri.ingredient_id) // undefined = not recorded
      const hasPurchase = purchased !== undefined
      const hasUsage = usedQty !== undefined

      lifecycleMap.set(key, {
        ingredientId: ri.ingredient_id,
        ingredientName: ingredient.name,
        unit: ri.unit,
        recipeQty,
        yieldPct,
        buyQty,
        purchasedQty: hasPurchase ? purchased.qty : null,
        purchasedCostCents: hasPurchase ? purchased.costCents : null,
        usedQty: hasUsage ? usedQty : null,
        computedLeftoverQty: hasPurchase && hasUsage ? purchased.qty - usedQty : null,
        lastPriceCents: Number(ingredient.last_price_cents) || 0,
        priceUnit: ingredient.price_unit || ingredient.default_unit || 'each',
        density: ingredient.weight_to_volume_ratio
          ? Number(ingredient.weight_to_volume_ratio)
          : null,
        purchaseVarianceQty: null,
        usageVarianceQty: null,
      })
    }
  }

  // Compute variances and totals
  const items: LifecycleItem[] = []
  let recipeCostCents = 0
  let buyCostCents = 0
  let totalPurchasedCostCents = 0

  for (const [, item] of lifecycleMap) {
    item.recipeQty = round3(item.recipeQty)
    item.buyQty = round3(item.buyQty)

    // Variance only computable when upstream data exists
    item.purchaseVarianceQty =
      item.purchasedQty !== null ? round3(item.purchasedQty - item.buyQty) : null
    item.usageVarianceQty = item.usedQty !== null ? round3(item.usedQty - item.recipeQty) : null
    item.computedLeftoverQty =
      item.purchasedQty !== null && item.usedQty !== null
        ? round3(item.purchasedQty - item.usedQty)
        : null

    const density = item.density ?? lookupDensity(item.ingredientName)
    const recipeCost = computeIngredientCost(
      item.recipeQty,
      item.unit,
      item.lastPriceCents,
      item.priceUnit,
      density
    )
    recipeCostCents += recipeCost ?? Math.round(item.recipeQty * item.lastPriceCents)
    const buyCost = computeIngredientCost(
      item.buyQty,
      item.unit,
      item.lastPriceCents,
      item.priceUnit,
      density
    )
    buyCostCents += buyCost ?? Math.round(item.buyQty * item.lastPriceCents)
    totalPurchasedCostCents += item.purchasedCostCents ?? 0

    items.push(item)
  }

  items.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName))

  return {
    eventId,
    items,
    totals: {
      recipeCostCents,
      buyCostCents,
      purchasedCostCents: totalPurchasedCostCents,
    },
  }
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}
