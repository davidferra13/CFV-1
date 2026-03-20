// Catering Bid Costing - Server Actions
// Cost entire catering events from the recipe database.
// Pull ingredient costs, scale by guest count, add labor/overhead, generate a complete bid.
// All costing is deterministic math (Formula > AI).

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export type BidCourseInput = {
  recipeId: string
  servings: number
}

export type GenerateBidParams = {
  eventId?: string
  menuId?: string
  guestCount: number
  courses: BidCourseInput[]
  laborHours: number
  laborRateCents: number
  overheadPercent: number
  profitMarginPercent: number
  includeEquipment: boolean
  equipmentCostCents?: number
  travelMiles: number
}

export type RecipeBreakdown = {
  recipeId: string
  recipeName: string
  ingredientCostCents: number
  scaledCostCents: number
  servings: number
  yieldQuantity: number | null
  hasAllPrices: boolean
}

export type BidResult = {
  foodCostCents: number
  laborCostCents: number
  overheadCents: number
  travelCostCents: number
  equipmentCostCents: number
  subtotalCents: number
  profitCents: number
  totalCents: number
  perPersonCents: number
  breakdown: RecipeBreakdown[]
  warnings: string[]
}

// IRS standard mileage rate for 2026: 72.5 cents/mile
const MILEAGE_RATE_CENTS = 7250 // per 100 miles (72.5 cents/mile * 100)

// ============================================
// GENERATE CATERING BID
// ============================================

export async function generateCateringBid(params: GenerateBidParams): Promise<BidResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const warnings: string[] = []

  // Fetch recipe cost data from the recipe_cost_summary view
  const recipeIds = params.courses.map((c) => c.recipeId)

  const { data: recipeCosts, error: costError } = await supabase
    .from('recipe_cost_summary')
    .select(
      'recipe_id, recipe_name, total_ingredient_cost_cents, cost_per_portion_cents, has_all_prices, ingredient_count'
    )
    .eq('tenant_id', tenantId)
    .in('recipe_id', recipeIds)

  if (costError) {
    console.error('[generateCateringBid] Cost fetch error:', costError)
    throw new Error('Failed to fetch recipe costs')
  }

  // Also fetch yield_quantity from recipes table for scaling
  const { data: recipes, error: recipeError } = await supabase
    .from('recipes')
    .select('id, name, yield_quantity')
    .eq('tenant_id', tenantId)
    .in('id', recipeIds)

  if (recipeError) {
    console.error('[generateCateringBid] Recipe fetch error:', recipeError)
    throw new Error('Failed to fetch recipe details')
  }

  // Build lookup maps
  const costMap = new Map((recipeCosts || []).map((r: any) => [r.recipe_id, r]))
  const recipeMap = new Map((recipes || []).map((r: any) => [r.id, r]))

  // Calculate food costs per course/recipe
  const breakdown: RecipeBreakdown[] = []
  let totalFoodCostCents = 0

  for (const course of params.courses) {
    const costData: any = costMap.get(course.recipeId)
    const recipeData: any = recipeMap.get(course.recipeId)

    if (!costData || !recipeData) {
      warnings.push(`Recipe not found: ${course.recipeId}. Skipped from cost calculation.`)
      continue
    }

    const baseCostCents = costData.total_ingredient_cost_cents || 0
    const yieldQty = recipeData.yield_quantity || 1
    const hasAllPrices = costData.has_all_prices || false

    if (!hasAllPrices) {
      warnings.push(
        `"${costData.recipe_name}" has incomplete ingredient pricing. Cost may be underestimated.`
      )
    }

    if (baseCostCents === 0) {
      warnings.push(
        `"${costData.recipe_name}" has no ingredient cost data. Add prices to ingredients for accurate costing.`
      )
    }

    // Scale: base cost is for yield_quantity servings.
    // Scale linearly to the requested servings.
    const scaleFactor = course.servings / yieldQty
    const scaledCostCents = Math.round(baseCostCents * scaleFactor)

    breakdown.push({
      recipeId: course.recipeId,
      recipeName: costData.recipe_name || recipeData.name,
      ingredientCostCents: baseCostCents,
      scaledCostCents,
      servings: course.servings,
      yieldQuantity: recipeData.yield_quantity,
      hasAllPrices,
    })

    totalFoodCostCents += scaledCostCents
  }

  // Labor cost: hours * rate
  const laborCostCents = Math.round(params.laborHours * params.laborRateCents)

  // Equipment cost
  const equipmentCostCents =
    params.includeEquipment && params.equipmentCostCents ? params.equipmentCostCents : 0

  // Travel cost: miles * 72.5 cents/mile
  // MILEAGE_RATE_CENTS is 7250 per 100 miles, so per mile = 7250/100 = 72.5
  const travelCostCents = Math.round((params.travelMiles * MILEAGE_RATE_CENTS) / 100)

  // Subtotal before overhead and profit
  const directCosts = totalFoodCostCents + laborCostCents + equipmentCostCents + travelCostCents

  // Overhead: percentage of direct costs
  const overheadCents = Math.round(directCosts * (params.overheadPercent / 100))

  const subtotalCents = directCosts + overheadCents

  // Profit: percentage of subtotal
  const profitCents = Math.round(subtotalCents * (params.profitMarginPercent / 100))

  const totalCents = subtotalCents + profitCents

  // Per person
  const perPersonCents = params.guestCount > 0 ? Math.round(totalCents / params.guestCount) : 0

  return {
    foodCostCents: totalFoodCostCents,
    laborCostCents,
    overheadCents,
    travelCostCents,
    equipmentCostCents,
    subtotalCents,
    profitCents,
    totalCents,
    perPersonCents,
    breakdown,
    warnings,
  }
}

// ============================================
// COST A SINGLE RECIPE
// ============================================

export async function getRecipeCostEstimate(
  recipeId: string,
  servings: number
): Promise<{
  recipeName: string
  baseCostCents: number
  scaledCostCents: number
  costPerServingCents: number
  yieldQuantity: number
  hasAllPrices: boolean
  ingredientCount: number
}> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { data: costData, error: costError } = await supabase
    .from('recipe_cost_summary')
    .select(
      'recipe_id, recipe_name, total_ingredient_cost_cents, cost_per_portion_cents, has_all_prices, ingredient_count'
    )
    .eq('tenant_id', tenantId)
    .eq('recipe_id', recipeId)
    .single()

  if (costError || !costData) {
    throw new Error('Recipe cost data not found')
  }

  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .select('yield_quantity')
    .eq('id', recipeId)
    .eq('tenant_id', tenantId)
    .single()

  if (recipeError || !recipe) {
    throw new Error('Recipe not found')
  }

  const baseCostCents = costData.total_ingredient_cost_cents || 0
  const yieldQty = recipe.yield_quantity || 1
  const scaleFactor = servings / yieldQty
  const scaledCostCents = Math.round(baseCostCents * scaleFactor)
  const costPerServingCents = servings > 0 ? Math.round(scaledCostCents / servings) : 0

  return {
    recipeName: costData.recipe_name || '',
    baseCostCents,
    scaledCostCents,
    costPerServingCents,
    yieldQuantity: yieldQty,
    hasAllPrices: costData.has_all_prices || false,
    ingredientCount: costData.ingredient_count || 0,
  }
}

// ============================================
// SAVE BID AS QUOTE
// ============================================

export async function saveBidAsQuote(
  bidResult: BidResult,
  params: {
    eventId?: string
    clientId: string
    guestCount: number
    bidName?: string
    notes?: string
  }
) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  // Verify client belongs to tenant
  const { data: client } = await supabase
    .from('clients')
    .select('tenant_id')
    .eq('id', params.clientId)
    .single()

  if (!client || client.tenant_id !== tenantId) {
    throw new Error('Client not found or does not belong to your account')
  }

  // Build pricing notes from bid breakdown
  const breakdownLines = bidResult.breakdown.map(
    (r) => `${r.recipeName}: $${(r.scaledCostCents / 100).toFixed(2)} (${r.servings} servings)`
  )
  const costSummary = [
    `Food: $${(bidResult.foodCostCents / 100).toFixed(2)}`,
    `Labor: $${(bidResult.laborCostCents / 100).toFixed(2)}`,
    `Overhead: $${(bidResult.overheadCents / 100).toFixed(2)}`,
    bidResult.travelCostCents > 0
      ? `Travel: $${(bidResult.travelCostCents / 100).toFixed(2)}`
      : null,
    bidResult.equipmentCostCents > 0
      ? `Equipment: $${(bidResult.equipmentCostCents / 100).toFixed(2)}`
      : null,
    `Profit: $${(bidResult.profitCents / 100).toFixed(2)}`,
  ].filter(Boolean)

  const pricingNotes = [
    'Bid Breakdown:',
    ...breakdownLines,
    '',
    'Cost Summary:',
    ...costSummary,
    '',
    `Per person: $${(bidResult.perPersonCents / 100).toFixed(2)}`,
  ].join('\n')

  const { data: quote, error } = await supabase
    .from('quotes')
    .insert({
      tenant_id: tenantId,
      client_id: params.clientId,
      event_id: params.eventId || null,
      quote_name: params.bidName || 'Catering Bid',
      pricing_model: 'per_person' as const,
      total_quoted_cents: bidResult.totalCents,
      price_per_person_cents: bidResult.perPersonCents,
      guest_count_estimated: params.guestCount,
      pricing_notes: pricingNotes,
      internal_notes: params.notes || null,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('[saveBidAsQuote] Error:', error)
    throw new Error('Failed to save bid as quote')
  }

  // Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId,
      actorId: user.id,
      action: 'quote_created',
      domain: 'quote',
      entityType: 'quote',
      entityId: quote.id,
      summary: `Created quote from catering bid: $${(bidResult.totalCents / 100).toFixed(2)}`,
      context: {
        source: 'catering_bid',
        total_cents: bidResult.totalCents,
        per_person_cents: bidResult.perPersonCents,
        guest_count: params.guestCount,
      },
      clientId: params.clientId,
    })
  } catch (err) {
    console.error('[saveBidAsQuote] Activity log failed (non-blocking):', err)
  }

  revalidatePath('/quotes')
  return quote
}

// ============================================
// BID HISTORY (from quotes created via bids)
// ============================================

export async function getBidHistory(): Promise<
  {
    id: string
    quoteName: string | null
    clientName: string | null
    totalCents: number
    perPersonCents: number | null
    guestCount: number | null
    status: string
    createdAt: string
  }[]
> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  // Get quotes that were created from catering bids
  // We identify them by pricing_notes containing "Bid Breakdown:"
  const { data: quotes, error } = await supabase
    .from('quotes')
    .select(
      'id, quote_name, total_quoted_cents, price_per_person_cents, guest_count_estimated, status, created_at, client:clients(name)'
    )
    .eq('tenant_id', tenantId)
    .like('pricing_notes', '%Bid Breakdown:%')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[getBidHistory] Error:', error)
    throw new Error('Failed to fetch bid history')
  }

  return (quotes || []).map((q: any) => ({
    id: q.id,
    quoteName: q.quote_name,
    clientName: (q.client as { name: string } | null)?.name || null,
    totalCents: q.total_quoted_cents,
    perPersonCents: q.price_per_person_cents,
    guestCount: q.guest_count_estimated,
    status: q.status,
    createdAt: q.created_at,
  }))
}

// ============================================
// SEARCH RECIPES (for bid builder)
// ============================================

export async function searchRecipesForBid(query: string): Promise<
  {
    id: string
    name: string
    category: string
    yieldQuantity: number | null
    costPerPortionCents: number | null
    hasAllPrices: boolean
  }[]
> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  let queryBuilder = supabase
    .from('recipes')
    .select('id, name, category, yield_quantity')
    .eq('tenant_id', tenantId)
    .eq('archived', false)
    .order('name')
    .limit(20)

  if (query.trim()) {
    queryBuilder = queryBuilder.ilike('name', `%${query.trim()}%`)
  }

  const { data: recipes, error } = await queryBuilder

  if (error) {
    console.error('[searchRecipesForBid] Error:', error)
    throw new Error('Failed to search recipes')
  }

  // Get cost data for found recipes
  const recipeIds = (recipes || []).map((r: any) => r.id)

  if (recipeIds.length === 0) return []

  const { data: costs } = await supabase
    .from('recipe_cost_summary')
    .select('recipe_id, cost_per_portion_cents, has_all_prices')
    .eq('tenant_id', tenantId)
    .in('recipe_id', recipeIds)

  const costMap = new Map((costs || []).map((c: any) => [c.recipe_id, c]))

  return (recipes || []).map((r: any) => {
    const cost: any = costMap.get(r.id)
    return {
      id: r.id,
      name: r.name,
      category: r.category,
      yieldQuantity: r.yield_quantity,
      costPerPortionCents: cost?.cost_per_portion_cents || null,
      hasAllPrices: cost?.has_all_prices || false,
    }
  })
}
