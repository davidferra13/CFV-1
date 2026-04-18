'use server'

// Purchase Feedback Loop - Deterministic (Formula > AI)
// Analyzes historical purchase-vs-recipe variance to suggest recipe quantity adjustments.
//
// When a chef consistently purchases 15%+ more of an ingredient than the recipe calls for
// across 3+ events, the system flags the recipe quantity as potentially understated.
//
// This is READ-ONLY diagnostic data. It never auto-modifies recipe quantities.
// Surfaced on recipe detail pages for chef decision-making.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ── Types ────────────────────────────────────────────────────────────────

export type QuantityAdjustmentSuggestion = {
  ingredientId: string
  ingredientName: string
  unit: string
  recipeQty: number // what the recipe says
  avgPurchasedQty: number // what the chef actually buys (median across events)
  eventCount: number // how many events contributed data
  overBuyRatio: number // avgPurchasedQty / recipeExpectedBuyQty
  suggestedQty: number // recommended recipe quantity
  confidence: 'low' | 'medium' | 'high'
}

export type PurchaseFeedbackResult = {
  recipeId: string
  recipeName: string
  suggestions: QuantityAdjustmentSuggestion[]
  eventCount: number // total events analyzed
}

// ── Core Function ────────────────────────────────────────────────────────

/**
 * Analyze purchase history for a recipe to suggest quantity adjustments.
 *
 * Compares actual purchased quantities (from inventory_transactions type='receive')
 * against expected buy quantities (from recipe_ingredients * event scaling)
 * across multiple events.
 *
 * Returns suggestions only for ingredients where the chef consistently
 * buys 15%+ more than the recipe calls for, across 3+ events.
 */
export async function getRecipeAdjustmentSuggestions(
  recipeId: string
): Promise<PurchaseFeedbackResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify recipe belongs to tenant
  const { data: recipe } = await db
    .from('recipes')
    .select('id, name, servings, yield_quantity')
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!recipe) {
    return { recipeId, recipeName: 'Unknown', suggestions: [], eventCount: 0 }
  }

  // Find events that used this recipe (via components -> dishes -> menus -> events)
  const { data: components } = await db
    .from('components')
    .select('dish_id, scale_factor')
    .eq('recipe_id', recipeId)
    .eq('tenant_id', user.tenantId!)

  if (!components?.length) {
    return { recipeId, recipeName: recipe.name, suggestions: [], eventCount: 0 }
  }

  const dishIds = [...new Set((components as any[]).map((c: any) => c.dish_id))]
  const { data: dishes } = await db.from('dishes').select('id, menu_id').in('id', dishIds)

  if (!dishes?.length) {
    return { recipeId, recipeName: recipe.name, suggestions: [], eventCount: 0 }
  }

  const menuIds = [...new Set((dishes as any[]).map((d: any) => d.menu_id))]
  const { data: menus } = await db
    .from('menus')
    .select('id, event_id')
    .in('id', menuIds)
    .not('event_id', 'is', null)

  if (!menus?.length) {
    return { recipeId, recipeName: recipe.name, suggestions: [], eventCount: 0 }
  }

  const eventIds = [...new Set((menus as any[]).map((m: any) => m.event_id))]

  // Only consider completed events (have actual purchase data)
  const { data: events } = await db
    .from('events')
    .select('id, guest_count')
    .eq('tenant_id', user.tenantId!)
    .in('id', eventIds)
    .in('status', ['completed', 'in_progress'])

  if (!events?.length) {
    return { recipeId, recipeName: recipe.name, suggestions: [], eventCount: 0 }
  }

  // Fetch recipe ingredients
  const { data: recipeIngredients } = await db
    .from('recipe_ingredients')
    .select('ingredient_id, quantity, unit, yield_pct')
    .eq('recipe_id', recipeId)

  if (!recipeIngredients?.length) {
    return { recipeId, recipeName: recipe.name, suggestions: [], eventCount: 0 }
  }

  // Fetch ingredient names
  const ingredientIds = (recipeIngredients as any[]).map((ri: any) => ri.ingredient_id)
  const { data: ingredientRows } = await db
    .from('ingredients')
    .select('id, name, default_yield_pct')
    .in('id', ingredientIds)

  const ingredientNameMap = new Map<string, string>()
  const ingredientYieldMap = new Map<string, number>()
  for (const ing of (ingredientRows ?? []) as any[]) {
    ingredientNameMap.set(ing.id, ing.name)
    ingredientYieldMap.set(ing.id, Number(ing.default_yield_pct) || 100)
  }

  // For each ingredient, compute expected vs actual across events
  const recipeServings = Number(recipe.servings) || Number(recipe.yield_quantity) || 4

  // Collect per-event purchase data from inventory_transactions
  const { data: transactions } = await db
    .from('inventory_transactions')
    .select('ingredient_id, quantity, event_id')
    .eq('tenant_id', user.tenantId!)
    .eq('type', 'receive')
    .in(
      'event_id',
      events.map((e: any) => e.id)
    )
    .in('ingredient_id', ingredientIds)

  if (!transactions?.length) {
    return { recipeId, recipeName: recipe.name, suggestions: [], eventCount: events.length }
  }

  // Group transactions by ingredient + event
  const purchaseMap = new Map<string, Map<string, number>>() // ingredientId -> eventId -> qty
  for (const tx of transactions as any[]) {
    const key = tx.ingredient_id
    if (!purchaseMap.has(key)) purchaseMap.set(key, new Map())
    const eventMap = purchaseMap.get(key)!
    eventMap.set(tx.event_id, (eventMap.get(tx.event_id) ?? 0) + Number(tx.quantity))
  }

  // Analyze each ingredient
  const suggestions: QuantityAdjustmentSuggestion[] = []

  for (const ri of recipeIngredients as any[]) {
    const ingredientId = ri.ingredient_id
    const riQty = Number(ri.quantity) || 0
    if (riQty <= 0) continue

    const eventPurchases = purchaseMap.get(ingredientId)
    if (!eventPurchases || eventPurchases.size < 3) continue // need 3+ events

    const yieldPct = Math.max(
      Number(ri.yield_pct) || ingredientYieldMap.get(ingredientId) || 100,
      1
    )

    // Compute over-buy ratios per event
    const ratios: number[] = []
    for (const [eventId, purchasedQty] of eventPurchases) {
      const event = (events as any[]).find((e: any) => e.id === eventId)
      if (!event) continue

      const guestCount = Number(event.guest_count) || 10
      const scaleFactor = guestCount / recipeServings
      const expectedRecipeQty = riQty * scaleFactor
      const expectedBuyQty = (expectedRecipeQty * 100) / yieldPct

      if (expectedBuyQty <= 0) continue
      ratios.push(purchasedQty / expectedBuyQty)
    }

    if (ratios.length < 3) continue

    // Use median ratio for robustness
    ratios.sort((a, b) => a - b)
    const medianRatio =
      ratios.length % 2 === 0
        ? (ratios[ratios.length / 2 - 1] + ratios[ratios.length / 2]) / 2
        : ratios[Math.floor(ratios.length / 2)]

    // Only suggest if consistently over-buying by 15%+
    if (medianRatio < 1.15) continue

    // Compute suggested recipe quantity
    const suggestedQty = Math.round(riQty * medianRatio * 100) / 100

    // Confidence from event count
    let confidence: 'low' | 'medium' | 'high' = 'low'
    if (ratios.length >= 11) confidence = 'high'
    else if (ratios.length >= 6) confidence = 'medium'

    // Compute average purchased qty for display
    const avgPurchased = ratios.reduce((sum, r) => sum + r, 0) / ratios.length
    const avgPurchasedQty = Math.round(riQty * avgPurchased * 100) / 100

    suggestions.push({
      ingredientId,
      ingredientName: ingredientNameMap.get(ingredientId) ?? 'Unknown',
      unit: ri.unit,
      recipeQty: riQty,
      avgPurchasedQty,
      eventCount: ratios.length,
      overBuyRatio: Math.round(medianRatio * 100) / 100,
      suggestedQty,
      confidence,
    })
  }

  // Sort by highest over-buy ratio
  suggestions.sort((a, b) => b.overBuyRatio - a.overBuyRatio)

  return {
    recipeId,
    recipeName: recipe.name,
    suggestions,
    eventCount: events.length,
  }
}
