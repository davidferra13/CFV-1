// Commerce Engine V1 — Inventory Bridge
// Deducts ingredients from inventory when a sale is completed.
// Adapts the walkEventRecipeChain pattern for commerce sales.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────

type IngredientNeed = {
  ingredientId: string
  ingredientName: string
  unit: string
  quantity: number
}

export type SaleDeductionPreviewItem = {
  ingredientId: string
  ingredientName: string
  unit: string
  needed: number
  onHand: number
  shortfall: number
  estimatedCostCents: number
}

export type SaleDeductionPreview = {
  items: SaleDeductionPreviewItem[]
  totalCostCents: number
}

// ─── Walk Sale Recipe Chain ──────────────────────────────────────

/**
 * Walk a sale's items → product_projections → recipes → recipe_ingredients
 * to determine all ingredient needs.
 * Handles sub-recipes recursively with cycle prevention.
 */
async function walkSaleRecipeChain(
  supabase: ReturnType<typeof import('@/lib/supabase/server').createServerClient>,
  saleId: string,
  tenantId: string
): Promise<Map<string, IngredientNeed>> {
  // Step 1: Get sale items with their product projections
  const { data: saleItems } = await (supabase
    .from('sale_items')
    .select('quantity, product_projection_id')
    .eq('sale_id', saleId)
    .eq('tenant_id', tenantId) as any)

  if (!saleItems || saleItems.length === 0) return new Map()

  // Step 2: Get recipe_ids from product projections
  const ppIds = saleItems.map((si: any) => si.product_projection_id).filter(Boolean)

  if (ppIds.length === 0) return new Map()

  const { data: products } = await (supabase
    .from('product_projections')
    .select('id, recipe_id')
    .in('id', ppIds) as any)

  if (!products || products.length === 0) return new Map()

  // Build map: product_projection_id → recipe_id
  const ppToRecipe = new Map<string, string>()
  for (const p of products) {
    if ((p as any).recipe_id) {
      ppToRecipe.set(p.id, (p as any).recipe_id)
    }
  }

  // Build recipe_id → cumulative quantity (from sale item quantities)
  const recipeMultipliers = new Map<string, number>()
  for (const si of saleItems) {
    const recipeId = ppToRecipe.get((si as any).product_projection_id)
    if (recipeId) {
      const qty = (si as any).quantity ?? 1
      recipeMultipliers.set(recipeId, (recipeMultipliers.get(recipeId) ?? 0) + qty)
    }
  }

  if (recipeMultipliers.size === 0) return new Map()

  // Step 3: Walk sub-recipes recursively (same pattern as walkEventRecipeChain)
  const allRecipeMultipliers = new Map(recipeMultipliers)
  const visited = new Set<string>()
  const toProcess = [...recipeMultipliers.keys()]

  while (toProcess.length > 0) {
    const batch = toProcess.filter((id) => !visited.has(id))
    if (batch.length === 0) break
    batch.forEach((id) => visited.add(id))

    const { data: subRecipes } = await (supabase
      .from('recipe_sub_recipes')
      .select('parent_recipe_id, child_recipe_id, quantity')
      .in('parent_recipe_id', batch) as any)

    if (subRecipes && subRecipes.length > 0) {
      for (const sr of subRecipes) {
        if ((sr as any).child_recipe_id === (sr as any).parent_recipe_id) continue

        const parentMultiplier = allRecipeMultipliers.get((sr as any).parent_recipe_id) ?? 1
        const childMultiplier = parentMultiplier * parseFloat((sr as any).quantity ?? 1)
        allRecipeMultipliers.set(
          (sr as any).child_recipe_id,
          (allRecipeMultipliers.get((sr as any).child_recipe_id) ?? 0) + childMultiplier
        )

        if (!visited.has((sr as any).child_recipe_id)) {
          toProcess.push((sr as any).child_recipe_id)
        }
      }
    }
  }

  // Step 4: Get recipe_ingredients for all collected recipes
  const allRecipeIds = Array.from(allRecipeMultipliers.keys())
  const { data: recipeIngredients } = await (supabase
    .from('recipe_ingredients')
    .select('recipe_id, ingredient_id, quantity, unit')
    .in('recipe_id', allRecipeIds) as any)

  if (!recipeIngredients || recipeIngredients.length === 0) return new Map()

  // Step 5: Get ingredient names
  const ingredientIds: string[] = [
    ...new Set<string>(recipeIngredients.map((ri: any) => ri.ingredient_id)),
  ]
  const { data: ingredients } = await (supabase
    .from('ingredients')
    .select('id, name')
    .in('id', ingredientIds) as any)

  const ingredientNameMap = new Map<string, string>()
  for (const ing of (ingredients ?? []) as any[]) {
    ingredientNameMap.set(ing.id, ing.name)
  }

  // Step 6: Aggregate quantities by ingredient + unit
  const aggregated = new Map<string, IngredientNeed>()

  for (const ri of recipeIngredients) {
    const multiplier = allRecipeMultipliers.get((ri as any).recipe_id) ?? 1
    const qty = parseFloat((ri as any).quantity) * multiplier
    const name = ingredientNameMap.get((ri as any).ingredient_id) || (ri as any).ingredient_id

    const key = `${(ri as any).ingredient_id}:${(ri as any).unit}`
    const existing = aggregated.get(key)
    if (existing) {
      existing.quantity += qty
    } else {
      aggregated.set(key, {
        ingredientId: (ri as any).ingredient_id,
        ingredientName: name,
        unit: (ri as any).unit,
        quantity: qty,
      })
    }
  }

  return aggregated
}

// ─── Preview Sale Deduction ──────────────────────────────────────

/**
 * Preview what ingredients would be deducted for a sale.
 * Shows on-hand quantity, shortfall, and estimated cost.
 */
export async function previewSaleDeduction(saleId: string): Promise<SaleDeductionPreview> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const needs = await walkSaleRecipeChain(supabase, saleId, user.tenantId!)

  if (needs.size === 0) {
    return { items: [], totalCostCents: 0 }
  }

  // Get current stock levels
  const ingredientIds = [...new Set([...needs.values()].map((n) => n.ingredientId))]

  const { data: stockData } = await (supabase
    .from('inventory_current_stock' as any)
    .select('ingredient_id, unit, current_qty')
    .eq('chef_id', user.tenantId!)
    .in('ingredient_id', ingredientIds) as any)

  const stockMap = new Map<string, number>()
  for (const s of (stockData ?? []) as any[]) {
    stockMap.set(`${s.ingredient_id}:${s.unit}`, parseFloat(s.current_qty ?? 0))
  }

  // Get ingredient prices
  const { data: priceData } = await (supabase
    .from('ingredients')
    .select('id, last_price_cents, price_unit')
    .in('id', ingredientIds) as any)

  const priceMap = new Map<string, number>()
  for (const p of (priceData ?? []) as any[]) {
    if (p.last_price_cents) {
      priceMap.set(p.id, p.last_price_cents)
    }
  }

  const items: SaleDeductionPreviewItem[] = []
  let totalCost = 0

  for (const [key, need] of needs) {
    const onHand = stockMap.get(key) ?? 0
    const shortfall = Math.max(0, need.quantity - onHand)
    const unitPrice = priceMap.get(need.ingredientId) ?? 0
    const estimatedCost = Math.round(need.quantity * unitPrice)

    items.push({
      ingredientId: need.ingredientId,
      ingredientName: need.ingredientName,
      unit: need.unit,
      needed: need.quantity,
      onHand,
      shortfall,
      estimatedCostCents: estimatedCost,
    })

    totalCost += estimatedCost
  }

  return { items, totalCostCents: totalCost }
}

// ─── Execute Sale Deduction ──────────────────────────────────────

/**
 * Deduct ingredients from inventory for a completed sale.
 * Creates negative inventory_transactions with type 'sale_deduction'.
 */
export async function executeSaleDeduction(saleId: string): Promise<{ transactionIds: string[] }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const needs = await walkSaleRecipeChain(supabase, saleId, user.tenantId!)

  if (needs.size === 0) return { transactionIds: [] }

  // Get ingredient prices for cost tracking
  const ingredientIds = [...new Set([...needs.values()].map((n) => n.ingredientId))]
  const { data: priceData } = await (supabase
    .from('ingredients')
    .select('id, last_price_cents')
    .in('id', ingredientIds) as any)

  const priceMap = new Map<string, number>()
  for (const p of (priceData ?? []) as any[]) {
    if (p.last_price_cents) {
      priceMap.set(p.id, p.last_price_cents)
    }
  }

  // Create deduction transactions
  const transactions = [...needs.values()].map((need) => ({
    chef_id: user.tenantId!,
    ingredient_id: need.ingredientId,
    ingredient_name: need.ingredientName,
    transaction_type: 'sale_deduction',
    quantity: -need.quantity, // negative = removing from stock
    unit: need.unit,
    cost_cents: priceMap.get(need.ingredientId) ?? null,
    sale_id: saleId,
    notes: `Auto-deduction for sale`,
    created_by: user.id,
  }))

  const { data, error } = await (supabase
    .from('inventory_transactions')
    .insert(transactions as any)
    .select('id') as any)

  if (error) throw new Error(`Failed to deduct inventory: ${error.message}`)

  revalidatePath('/inventory')
  return { transactionIds: (data ?? []).map((d: any) => d.id) }
}

// ─── Reverse Sale Deduction ─────────────────────────────────────

/**
 * Reverse inventory deductions for a voided/refunded sale.
 * Creates positive inventory_transactions with type 'return_from_sale'.
 */
export async function reverseSaleDeduction(saleId: string): Promise<{ transactionIds: string[] }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Find all deduction transactions for this sale
  const { data: deductions, error: fetchErr } = await (supabase
    .from('inventory_transactions')
    .select('ingredient_id, ingredient_name, quantity, unit, cost_cents')
    .eq('sale_id' as any, saleId)
    .eq('chef_id', user.tenantId!)
    .eq('transaction_type', 'sale_deduction') as any)

  if (fetchErr) throw new Error(`Failed to fetch deductions: ${fetchErr.message}`)
  if (!deductions || deductions.length === 0) return { transactionIds: [] }

  // Create reversal transactions
  const reversals = deductions.map((d: any) => ({
    chef_id: user.tenantId!,
    ingredient_id: d.ingredient_id,
    ingredient_name: d.ingredient_name,
    transaction_type: 'return_from_sale',
    quantity: Math.abs(d.quantity), // positive = adding back
    unit: d.unit,
    cost_cents: d.cost_cents,
    sale_id: saleId,
    notes: `Reversal — sale voided/refunded`,
    created_by: user.id,
  }))

  const { data, error } = await (supabase
    .from('inventory_transactions')
    .insert(reversals as any)
    .select('id') as any)

  if (error) throw new Error(`Failed to reverse deductions: ${error.message}`)

  revalidatePath('/inventory')
  return { transactionIds: (data ?? []).map((d: any) => d.id) }
}

// ─── Deduct Non-Recipe Product Stock ─────────────────────────────

/**
 * For simple products without recipes (merchandise, packaged goods),
 * deduct directly from product_projections.available_qty.
 */
export async function deductProductStock(saleId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get sale items with product projections that track inventory
  const { data: saleItems } = await (supabase
    .from('sale_items')
    .select('product_projection_id, quantity')
    .eq('sale_id', saleId)
    .eq('tenant_id', user.tenantId!) as any)

  if (!saleItems || saleItems.length === 0) return

  const ppIds = saleItems.map((si: any) => si.product_projection_id).filter(Boolean)
  if (ppIds.length === 0) return

  const { data: products } = await (supabase
    .from('product_projections')
    .select('id, track_inventory, available_qty, recipe_id')
    .in('id', ppIds)
    .eq('tenant_id', user.tenantId!) as any)

  if (!products) return

  // Only deduct from products that track inventory AND have no recipe
  // (recipe-based products use the ingredient-level deduction above)
  for (const product of products) {
    if (!(product as any).track_inventory || (product as any).recipe_id) continue

    const saleItem = saleItems.find((si: any) => si.product_projection_id === product.id)
    if (!saleItem) continue

    const currentQty = (product as any).available_qty ?? 0
    const newQty = Math.max(0, currentQty - (saleItem as any).quantity)

    await (supabase
      .from('product_projections')
      .update({ available_qty: newQty } as any)
      .eq('id', product.id)
      .eq('tenant_id', user.tenantId!) as any)
  }
}
