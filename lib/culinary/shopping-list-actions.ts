'use server'

import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { createPurchaseOrder, addPOItem } from '@/lib/inventory/purchase-order-actions'

const ShoppingListInputSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  eventIds: z.array(z.string().uuid()).optional(),
})

export type ShoppingListItem = {
  ingredientId: string
  ingredientName: string
  category: string
  supplier: string
  unit: string
  totalRequired: number
  onHand: number
  toBuy: number
  estimatedCostCents: number
  eventCount: number
}

export type ShoppingListResult = {
  startDate: string
  endDate: string
  items: ShoppingListItem[]
  totalEstimatedCostCents: number
  shortageCount: number
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}

async function getRecipeMultipliersForEvents(
  supabase: any,
  tenantId: string,
  eventIds: string[]
): Promise<Map<string, number>> {
  const { data: menus } = await supabase
    .from('menus')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  if (!menus?.length) return new Map()

  const { data: dishes } = await supabase
    .from('dishes')
    .select('id')
    .eq('tenant_id', tenantId)
    .in(
      'menu_id',
      menus.map((menu: any) => menu.id)
    )

  if (!dishes?.length) return new Map()

  const { data: components } = await supabase
    .from('components')
    .select('recipe_id, scale_factor')
    .eq('tenant_id', tenantId)
    .in(
      'dish_id',
      dishes.map((dish: any) => dish.id)
    )
    .not('recipe_id', 'is', null)

  if (!components?.length) return new Map()

  const multipliers = new Map<string, number>()
  for (const component of components as any[]) {
    const recipeId = component.recipe_id as string
    const scale = Number(component.scale_factor) || 1
    multipliers.set(recipeId, (multipliers.get(recipeId) ?? 0) + scale)
  }

  // include sub-recipes recursively
  const visited = new Set<string>()
  const queue = [...multipliers.keys()]

  while (queue.length > 0) {
    const batch = queue.filter((id) => !visited.has(id))
    if (batch.length === 0) break
    batch.forEach((id) => visited.add(id))

    const { data: subRecipes } = await supabase
      .from('recipe_sub_recipes')
      .select('parent_recipe_id, child_recipe_id, quantity')
      .in('parent_recipe_id', batch)

    for (const row of subRecipes ?? []) {
      const parentMultiplier = multipliers.get(row.parent_recipe_id) ?? 1
      const childMultiplier = parentMultiplier * (Number(row.quantity) || 1)
      multipliers.set(
        row.child_recipe_id,
        (multipliers.get(row.child_recipe_id) ?? 0) + childMultiplier
      )
      queue.push(row.child_recipe_id)
    }
  }

  return multipliers
}

export async function generateShoppingList(input: {
  startDate: string
  endDate: string
  eventIds?: string[]
}): Promise<ShoppingListResult> {
  const user = await requireChef()
  const parsed = ShoppingListInputSchema.parse(input)
  const supabase: any = createServerClient()

  let eventsQuery = supabase
    .from('events')
    .select('id, event_date')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', parsed.startDate)
    .lte('event_date', parsed.endDate)
    .in('status', ['confirmed', 'accepted', 'paid'])

  if (parsed.eventIds?.length) {
    eventsQuery = eventsQuery.in('id', parsed.eventIds)
  }

  const { data: events, error: eventsError } = await eventsQuery

  if (eventsError) throw new Error(`Failed to load events: ${eventsError.message}`)
  if (!events?.length) {
    return {
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      items: [],
      totalEstimatedCostCents: 0,
      shortageCount: 0,
    }
  }

  const eventIds = events.map((event: any) => event.id)
  const recipeMultipliers = await getRecipeMultipliersForEvents(supabase, user.tenantId!, eventIds)

  if (recipeMultipliers.size === 0) {
    return {
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      items: [],
      totalEstimatedCostCents: 0,
      shortageCount: 0,
    }
  }

  const { data: recipeIngredients, error: recipeIngredientsError } = await supabase
    .from('recipe_ingredients')
    .select('recipe_id, ingredient_id, quantity, unit')
    .in('recipe_id', Array.from(recipeMultipliers.keys()))

  if (recipeIngredientsError) {
    throw new Error(`Failed to load recipe ingredients: ${recipeIngredientsError.message}`)
  }

  const ingredientIds = Array.from(
    new Set((recipeIngredients ?? []).map((item: any) => item.ingredient_id).filter(Boolean))
  ) as string[]

  if (ingredientIds.length === 0) {
    return {
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      items: [],
      totalEstimatedCostCents: 0,
      shortageCount: 0,
    }
  }

  const [ingredientRows, stockRows, vendorItemsRows, vendorRows] = await Promise.all([
    supabase
      .from('ingredients')
      .select('id, name, category, last_price_cents, preferred_vendor')
      .eq('tenant_id', user.tenantId!)
      .in('id', ingredientIds),
    supabase
      .from('inventory_transactions')
      .select('ingredient_id, quantity')
      .eq('chef_id', user.tenantId!)
      .in('ingredient_id', ingredientIds),
    supabase
      .from('vendor_items')
      .select('ingredient_id, vendor_id, unit_price_cents')
      .eq('chef_id', user.tenantId!)
      .in('ingredient_id', ingredientIds),
    supabase.from('vendors').select('id, name').eq('chef_id', user.tenantId!),
  ])

  if (ingredientRows.error)
    throw new Error(`Failed to load ingredients: ${ingredientRows.error.message}`)
  if (stockRows.error) throw new Error(`Failed to load inventory: ${stockRows.error.message}`)
  if (vendorItemsRows.error) {
    throw new Error(`Failed to load vendor mappings: ${vendorItemsRows.error.message}`)
  }
  if (vendorRows.error) throw new Error(`Failed to load suppliers: ${vendorRows.error.message}`)

  const ingredientMap = new Map((ingredientRows.data ?? []).map((row: any) => [row.id, row]))
  const vendorNameMap = new Map((vendorRows.data ?? []).map((row: any) => [row.id, row.name]))

  const preferredVendorByIngredient = new Map<string, string>()
  const vendorItemsByIngredient = new Map<string, Array<{ vendorId: string; price: number }>>()

  for (const row of vendorItemsRows.data ?? []) {
    const list = vendorItemsByIngredient.get(row.ingredient_id ?? '') ?? []
    list.push({ vendorId: row.vendor_id, price: row.unit_price_cents ?? 0 })
    vendorItemsByIngredient.set(row.ingredient_id ?? '', list)
  }

  for (const [ingredientId, rows] of vendorItemsByIngredient.entries()) {
    if (!rows.length) continue
    rows.sort((a, b) => a.price - b.price)
    preferredVendorByIngredient.set(
      ingredientId,
      vendorNameMap.get(rows[0].vendorId) ?? 'Unassigned'
    )
  }

  const onHandByIngredient = new Map<string, number>()
  for (const row of stockRows.data ?? []) {
    if (!row.ingredient_id) continue
    onHandByIngredient.set(
      row.ingredient_id,
      (onHandByIngredient.get(row.ingredient_id) ?? 0) + (Number(row.quantity) || 0)
    )
  }

  const aggregated = new Map<string, ShoppingListItem>()
  for (const row of recipeIngredients ?? []) {
    const ingredient = ingredientMap.get(row.ingredient_id)
    if (!ingredient) continue

    const multiplier = recipeMultipliers.get(row.recipe_id) ?? 1
    const requiredQty = (Number(row.quantity) || 0) * multiplier
    const key = `${row.ingredient_id}:${row.unit}`

    const existing = aggregated.get(key) ?? {
      ingredientId: row.ingredient_id,
      ingredientName: ingredient.name,
      category: ingredient.category,
      supplier:
        ingredient.preferred_vendor ||
        preferredVendorByIngredient.get(row.ingredient_id) ||
        'Unassigned',
      unit: row.unit,
      totalRequired: 0,
      onHand: 0,
      toBuy: 0,
      estimatedCostCents: 0,
      eventCount: events.length,
    }

    existing.totalRequired += requiredQty
    aggregated.set(key, existing)
  }

  const items = Array.from(aggregated.values()).map((item) => {
    const onHand = onHandByIngredient.get(item.ingredientId) ?? 0
    const toBuy = Math.max(0, item.totalRequired - onHand)
    const ingredient = ingredientMap.get(item.ingredientId)
    const estimatedUnitCost = ingredient?.last_price_cents ?? 0

    return {
      ...item,
      totalRequired: round2(item.totalRequired),
      onHand: round2(onHand),
      toBuy: round2(toBuy),
      estimatedCostCents: Math.round(toBuy * estimatedUnitCost),
    }
  })

  items.sort((a, b) => b.toBuy - a.toBuy)

  return {
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    totalEstimatedCostCents: items.reduce((sum, item) => sum + item.estimatedCostCents, 0),
    shortageCount: items.filter((item) => item.toBuy > 0).length,
    items,
  }
}

export async function createPurchaseOrderFromShoppingList(input: {
  supplier?: string
  items: Array<{
    ingredientId: string
    ingredientName: string
    toBuy: number
    unit: string
    estimatedCostCents: number
  }>
}) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const filteredItems = input.items.filter((item) => item.toBuy > 0)
  if (!filteredItems.length)
    throw new Error('No shortage items selected for purchase order creation')

  let vendorId: string | undefined
  if (input.supplier && input.supplier !== 'Unassigned') {
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id')
      .eq('chef_id', user.tenantId!)
      .eq('name', input.supplier)
      .maybeSingle()
    vendorId = vendor?.id
  }

  const po = await createPurchaseOrder({
    vendorId,
    notes: `Auto-generated from shopping list shortages (${new Date().toISOString()})`,
  })

  for (const item of filteredItems) {
    const estimatedUnitPriceCents =
      item.toBuy > 0 ? Math.round(item.estimatedCostCents / item.toBuy) : undefined

    await addPOItem(po.id, {
      ingredientId: item.ingredientId,
      ingredientName: item.ingredientName,
      orderedQty: item.toBuy,
      unit: item.unit,
      estimatedUnitPriceCents,
    })
  }

  return po
}
