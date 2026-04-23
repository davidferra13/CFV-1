// Event Deduction Server Actions
// Chef-only: Preview, execute, and reverse inventory deductions for events.
// Walks the full chain: event -> menus -> dishes -> components -> recipes -> recipe_ingredients.
// Also walks sub-recipes recursively via recipe_sub_recipes (with cycle prevention).

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  buildStockCoverageMap,
  consolidateIngredientRows,
  estimateIngredientCostCents,
  fetchCurrentStockRows,
  fetchIngredientPlanningMeta,
  getIngredientPlanningKey,
} from './planning-support'

// ─── Types ───────────────────────────────────────────────────────

export type DeductionPreviewItem = {
  ingredientId: string
  ingredientName: string
  unit: string
  neededQty: number
  onHandQty: number
  shortfallQty: number
  estimatedCostCents: number
}

export type DeductionPreview = {
  items: DeductionPreviewItem[]
  totalCostCents: number
}

export type DeductionAdjustment = {
  ingredientId: string
  unit?: string
  overrideQty: number
}

export type ReturnItem = {
  ingredientId: string
  ingredientName: string
  quantity: number
  unit: string
  notes?: string
}

// ─── Schemas ─────────────────────────────────────────────────────

const ReturnItemSchema = z.object({
  ingredientId: z.string().uuid(),
  ingredientName: z.string().min(1),
  quantity: z.number().positive('Return quantity must be positive'),
  unit: z.string().min(1),
  notes: z.string().optional(),
})

const AdjustmentSchema = z.object({
  ingredientId: z.string().uuid(),
  unit: z.string().min(1).optional(),
  overrideQty: z.number().positive('Override quantity must be positive'),
})

// ─── DB helper ────────────────────────────────────────────
function db(db: any) {
  return {
    transactions: () => db.from('inventory_transactions' as any) as any,
  }
}

// ─── Actions ─────────────────────────────────────────────────────

/**
 * Preview what inventory would be deducted for an event.
 * Walks the full recipe chain including sub-recipes recursively.
 * Returns needed quantities, current on-hand quantities, shortfalls, and estimated costs.
 */
export async function previewEventDeduction(eventId: string): Promise<DeductionPreview> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify event ownership
  const { data: event, error: eventError } = await db
    .from('events')
    .select('id, tenant_id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) throw new Error('Event not found')

  const ingredientNeedRows = [...(await walkEventRecipeChain(db, eventId, user.tenantId!)).values()]
  if (ingredientNeedRows.length === 0) return { items: [], totalCostCents: 0 }

  const ingredientIds = [...new Set(ingredientNeedRows.map((need) => need.ingredientId))]
  const metaByIngredient = await fetchIngredientPlanningMeta(db, ingredientIds)
  const normalizedNeeds = consolidateIngredientRows(ingredientNeedRows, metaByIngredient)
  const stockRows = await fetchCurrentStockRows(db, user.tenantId!, ingredientIds)
  const stockCoverage = buildStockCoverageMap(normalizedNeeds, stockRows, metaByIngredient)

  const items: DeductionPreviewItem[] = []
  let totalCostCents = 0

  for (const need of normalizedNeeds) {
    const coverage =
      stockCoverage.get(getIngredientPlanningKey(need.ingredientId, need.unit)) ?? null
    const onHandQty = Math.max(0, coverage?.onHandQty ?? 0)
    const shortfall = Math.max(0, need.quantity - onHandQty)
    const estimatedCost = estimateIngredientCostCents(
      need.quantity,
      need.unit,
      metaByIngredient.get(need.ingredientId)
    )
    totalCostCents += estimatedCost

    items.push({
      ingredientId: need.ingredientId,
      ingredientName: need.ingredientName,
      unit: need.unit,
      neededQty: Math.round(need.quantity * 1000) / 1000,
      onHandQty: Math.round(onHandQty * 1000) / 1000,
      shortfallQty: Math.round(shortfall * 1000) / 1000,
      estimatedCostCents: estimatedCost,
    })
  }

  return { items, totalCostCents }
}

/**
 * Execute inventory deductions for an event.
 * Calls preview to get items, optionally applies adjustments, then creates
 * negative inventory_transactions (type: event_deduction) for each ingredient.
 */
export async function executeEventDeduction(
  eventId: string,
  adjustments?: DeductionAdjustment[]
): Promise<{ transactionIds: string[] }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Validate adjustments if provided
  const parsedAdjustments = adjustments?.map((a) => AdjustmentSchema.parse(a))

  // Get the preview to know what to deduct
  const preview = await previewEventDeduction(eventId)

  if (preview.items.length === 0) {
    throw new Error('No ingredients to deduct for this event')
  }

  // Build adjustment map for overrides
  const adjustmentMap = new Map<string, number>()
  if (parsedAdjustments) {
    for (const adj of parsedAdjustments) {
      if (adj.unit) {
        adjustmentMap.set(getIngredientPlanningKey(adj.ingredientId, adj.unit), adj.overrideQty)
      }
      adjustmentMap.set(adj.ingredientId, adj.overrideQty)
    }
  }

  // Create negative transactions for each ingredient
  const transactionRows: Array<Record<string, any>> = []

  for (const item of preview.items) {
    const planningKey = getIngredientPlanningKey(item.ingredientId, item.unit)
    const deductQty =
      adjustmentMap.get(planningKey) ?? adjustmentMap.get(item.ingredientId) ?? item.neededQty

    if (deductQty <= 0) continue

    const scaledCostCents =
      item.estimatedCostCents > 0 && item.neededQty > 0
        ? Math.round((item.estimatedCostCents * deductQty) / item.neededQty)
        : null

    transactionRows.push({
      chef_id: user.tenantId!,
      ingredient_id: item.ingredientId || null,
      ingredient_name: item.ingredientName,
      transaction_type: 'event_deduction',
      quantity: -Math.abs(deductQty), // Negative = removing from stock
      unit: item.unit,
      cost_cents: scaledCostCents,
      event_id: eventId,
      notes: `Event deduction for ${item.ingredientName}`,
      created_by: user.id,
    })
  }

  if (transactionRows.length === 0) {
    throw new Error('No deductions to execute after applying adjustments')
  }

  const { data, error } = await db(db).transactions().insert(transactionRows).select('id')

  if (error) throw new Error(`Failed to execute event deductions: ${(error as any).message}`)

  revalidatePath('/inventory')
  revalidatePath(`/events/${eventId}`)

  return {
    transactionIds: ((data || []) as any[]).map((row: any) => row.id),
  }
}

/**
 * Reverse all event deductions for an event.
 * Finds all event_deduction transactions for the event and creates positive
 * return_from_event transactions to cancel them out.
 */
export async function reverseEventDeduction(
  eventId: string
): Promise<{ transactionIds: string[] }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Find all event_deduction transactions for this event
  const { data: deductions, error: fetchError } = await db(db)
    .transactions()
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('event_id', eventId)
    .eq('transaction_type', 'event_deduction')

  if (fetchError) throw new Error(`Failed to fetch deductions: ${(fetchError as any).message}`)

  if (!deductions || deductions.length === 0) {
    throw new Error('No deductions found for this event to reverse')
  }

  // Create positive return_from_event transactions to offset each deduction
  const returnRows = (deductions as any[]).map((tx: any) => ({
    chef_id: user.tenantId!,
    ingredient_id: tx.ingredient_id,
    ingredient_name: tx.ingredient_name,
    transaction_type: 'return_from_event',
    quantity: Math.abs(Number(tx.quantity)), // Positive = adding back to stock
    unit: tx.unit,
    cost_cents: tx.cost_cents,
    location_id: tx.location_id,
    event_id: eventId,
    notes: `Reversal of event deduction for ${tx.ingredient_name}`,
    created_by: user.id,
  }))

  const { data, error } = await db(db).transactions().insert(returnRows).select('id')

  if (error) throw new Error(`Failed to reverse event deductions: ${(error as any).message}`)

  revalidatePath('/inventory')
  revalidatePath(`/events/${eventId}`)

  return {
    transactionIds: ((data || []) as any[]).map((row: any) => row.id),
  }
}

/**
 * Return specific items from an event (partial return).
 * Creates positive return_from_event transactions for the specified items.
 */
export async function returnFromEvent(
  eventId: string,
  items: ReturnItem[]
): Promise<{ transactionIds: string[] }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (items.length === 0) {
    throw new Error('No items to return')
  }

  const parsedItems = items.map((item) => ReturnItemSchema.parse(item))

  // Verify event ownership
  const { data: event, error: eventError } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) throw new Error('Event not found')

  // Create positive return_from_event transactions
  const returnRows = parsedItems.map((item) => ({
    chef_id: user.tenantId!,
    ingredient_id: item.ingredientId,
    ingredient_name: item.ingredientName,
    transaction_type: 'return_from_event',
    quantity: Math.abs(item.quantity), // Positive = adding back to stock
    unit: item.unit,
    event_id: eventId,
    notes: item.notes ?? `Returned from event: ${item.ingredientName}`,
    created_by: user.id,
  }))

  const { data, error } = await db(db).transactions().insert(returnRows).select('id')

  if (error) throw new Error(`Failed to record returns: ${(error as any).message}`)

  revalidatePath('/inventory')
  revalidatePath(`/events/${eventId}`)

  return {
    transactionIds: ((data || []) as any[]).map((row: any) => row.id),
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Walk the full recipe chain for an event:
 *   event -> menus -> dishes -> components (with scale_factor) -> recipes -> recipe_ingredients
 * Also walks sub-recipes recursively via recipe_sub_recipes.
 * Uses a visited set to prevent cycles.
 * Returns aggregated ingredient quantities.
 */
async function walkEventRecipeChain(
  db: any,
  eventId: string,
  tenantId: string
): Promise<
  Map<string, { ingredientId: string; ingredientName: string; unit: string; quantity: number }>
> {
  // Step 1: Get menus for this event
  const { data: menus } = await db
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)

  if (!menus || menus.length === 0) return new Map()

  const menuIds = (menus as any[]).map((m: any) => m.id)

  // Step 2: Get dishes for those menus
  const { data: dishes } = await db.from('dishes').select('id').in('menu_id', menuIds)

  if (!dishes || dishes.length === 0) return new Map()

  const dishIds = (dishes as any[]).map((d: any) => d.id)

  // Step 3: Get components with recipe_id and scale_factor
  const { data: components } = await db
    .from('components')
    .select('recipe_id, scale_factor')
    .in('dish_id', dishIds)
    .not('recipe_id', 'is', null)

  if (!components || components.length === 0) return new Map()

  // Build a map of recipe_id -> cumulative scale factor (a recipe can appear in multiple components)
  const recipeScaleMap = new Map<string, number>()
  for (const c of components as any[]) {
    const scale = Number(c.scale_factor ?? 1)
    recipeScaleMap.set(c.recipe_id, (recipeScaleMap.get(c.recipe_id) ?? 0) + scale)
  }

  // Step 4: Walk sub-recipes recursively
  const allRecipeMultipliers = new Map<string, number>()
  for (const [recipeId, scale] of recipeScaleMap) {
    allRecipeMultipliers.set(recipeId, (allRecipeMultipliers.get(recipeId) ?? 0) + scale)
  }

  const visited = new Set<string>()
  const toProcess = [...recipeScaleMap.keys()]

  while (toProcess.length > 0) {
    const batch = toProcess.filter((id) => !visited.has(id))
    if (batch.length === 0) break
    batch.forEach((id) => visited.add(id))

    const { data: subRecipes } = await db
      .from('recipe_sub_recipes')
      .select('parent_recipe_id, child_recipe_id, quantity')
      .in('parent_recipe_id', batch)

    if (subRecipes && subRecipes.length > 0) {
      for (const sr of subRecipes as any[]) {
        // Skip if adding this would create a cycle
        if (sr.child_recipe_id === sr.parent_recipe_id) continue

        const parentMultiplier = allRecipeMultipliers.get(sr.parent_recipe_id) ?? 1
        const childMultiplier = parentMultiplier * Number(sr.quantity ?? 1)
        allRecipeMultipliers.set(
          sr.child_recipe_id,
          (allRecipeMultipliers.get(sr.child_recipe_id) ?? 0) + childMultiplier
        )
        // Only process if not already visited (cycle prevention)
        if (!visited.has(sr.child_recipe_id)) {
          toProcess.push(sr.child_recipe_id)
        }
      }
    }
  }

  // Step 5: Get recipe_ingredients for all collected recipes
  const allRecipeIds = Array.from(allRecipeMultipliers.keys())
  if (allRecipeIds.length === 0) return new Map()

  const { data: recipeIngredients } = await db
    .from('recipe_ingredients')
    .select('recipe_id, ingredient_id, quantity, unit')
    .in('recipe_id', allRecipeIds)

  if (!recipeIngredients || recipeIngredients.length === 0) return new Map()

  // Step 6: Get ingredient details (names)
  const ingredientIds = [
    ...new Set((recipeIngredients as any[]).map((ri: any) => ri.ingredient_id)),
  ]
  const { data: ingredients } = await db
    .from('ingredients')
    .select('id, name')
    .in('id', ingredientIds)

  const ingredientNameMap = new Map<string, string>()
  for (const ing of (ingredients || []) as any[]) {
    ingredientNameMap.set(ing.id, ing.name)
  }

  // Step 7: Aggregate quantities by ingredient + unit
  const aggregated = new Map<
    string,
    { ingredientId: string; ingredientName: string; unit: string; quantity: number }
  >()

  for (const ri of recipeIngredients as any[]) {
    const multiplier = allRecipeMultipliers.get(ri.recipe_id) ?? 1
    const qty = Number(ri.quantity) * multiplier
    const name = ingredientNameMap.get(ri.ingredient_id) || ri.ingredient_id

    const key = `${ri.ingredient_id}:${ri.unit}`
    const existing = aggregated.get(key)
    if (existing) {
      existing.quantity += qty
    } else {
      aggregated.set(key, {
        ingredientId: ri.ingredient_id,
        ingredientName: name,
        unit: ri.unit,
        quantity: qty,
      })
    }
  }

  return aggregated
}
