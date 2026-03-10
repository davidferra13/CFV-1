// Vendor Price Comparison
// Reads from existing vendors + vendor_price_points tables.
// Computes price trends, best-price vendors, and cost comparisons
// for ingredients on a menu's shopping list.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ============================================
// TYPES
// ============================================

export interface VendorPriceEntry {
  vendorId: string
  vendorName: string
  vendorType: string
  isPreferred: boolean
  priceCents: number
  unit: string
  recordedAt: string
  notes: string | null
}

export interface IngredientVendorComparison {
  ingredientId: string
  ingredientName: string
  category: string
  // All price points across vendors
  priceHistory: VendorPriceEntry[]
  // Best current price
  bestPrice: VendorPriceEntry | null
  // Average price across vendors
  averagePriceCents: number
  // Price range
  lowestPriceCents: number
  highestPriceCents: number
  vendorCount: number
}

export interface VendorComparisonResult {
  ingredients: IngredientVendorComparison[]
  // Summary
  totalIngredients: number
  ingredientsWithPricing: number
  ingredientsWithoutPricing: number
  vendorsUsed: { id: string; name: string; type: string; itemCount: number }[]
  potentialSavingsCents: number // if you bought everything at cheapest vendor
}

// ============================================
// CORE: Compare vendors for menu ingredients
// ============================================

export async function compareVendorsForMenu(menuId: string): Promise<VendorComparisonResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const chefId = user.tenantId!

  // 1. Get all ingredients used in this menu
  const { data: dishes } = await supabase
    .from('dishes')
    .select('id')
    .eq('menu_id', menuId)
    .eq('tenant_id', chefId)

  const dishIds = (dishes || []).map((d: any) => d.id)
  if (dishIds.length === 0) {
    return emptyResult()
  }

  const { data: components } = await supabase
    .from('components')
    .select('recipe_id')
    .in('dish_id', dishIds)
    .eq('tenant_id', chefId)

  const recipeIds = (components || []).map((c: any) => c.recipe_id).filter(Boolean)

  if (recipeIds.length === 0) {
    return emptyResult()
  }

  // 2. Get recipe ingredients with ingredient details
  const { data: recipeIngredients } = await supabase
    .from('recipe_ingredients')
    .select(
      `
      ingredient_id,
      ingredient:ingredients!inner(
        id, name, category
      )
    `
    )
    .in('recipe_id', recipeIds)

  // Dedupe ingredients
  const ingredientMap = new Map<string, { id: string; name: string; category: string }>()
  for (const ri of recipeIngredients || []) {
    const ing = ri.ingredient as any
    if (ing && !ingredientMap.has(ing.id)) {
      ingredientMap.set(ing.id, { id: ing.id, name: ing.name, category: ing.category })
    }
  }

  const ingredientIds = [...ingredientMap.keys()]
  if (ingredientIds.length === 0) {
    return emptyResult()
  }

  // 3. Get all vendor price points for these ingredients
  const { data: pricePoints } = await supabase
    .from('vendor_price_points')
    .select(
      `
      id,
      vendor_id,
      ingredient_id,
      item_name,
      price_cents,
      unit,
      recorded_at,
      notes,
      vendor:vendors!inner(
        id, name, vendor_type, is_preferred
      )
    `
    )
    .in('ingredient_id', ingredientIds)
    .eq('chef_id', chefId)
    .order('recorded_at', { ascending: false })

  // 4. Group price points by ingredient
  const pricesByIngredient = new Map<string, VendorPriceEntry[]>()
  const vendorSet = new Map<
    string,
    { id: string; name: string; type: string; items: Set<string> }
  >()

  for (const pp of pricePoints || []) {
    const vendor = pp.vendor as any
    const ingId = pp.ingredient_id

    const entry: VendorPriceEntry = {
      vendorId: vendor.id,
      vendorName: vendor.name,
      vendorType: vendor.vendor_type,
      isPreferred: vendor.is_preferred,
      priceCents: pp.price_cents,
      unit: pp.unit,
      recordedAt: pp.recorded_at,
      notes: pp.notes,
    }

    const existing = pricesByIngredient.get(ingId) || []
    existing.push(entry)
    pricesByIngredient.set(ingId, existing)

    // Track vendors
    if (!vendorSet.has(vendor.id)) {
      vendorSet.set(vendor.id, {
        id: vendor.id,
        name: vendor.name,
        type: vendor.vendor_type,
        items: new Set(),
      })
    }
    vendorSet.get(vendor.id)!.items.add(ingId)
  }

  // 5. Build comparison for each ingredient
  const ingredients: IngredientVendorComparison[] = []
  let totalPotentialSavings = 0

  for (const [ingId, ing] of ingredientMap) {
    const prices = pricesByIngredient.get(ingId) || []

    if (prices.length === 0) {
      ingredients.push({
        ingredientId: ingId,
        ingredientName: ing.name,
        category: ing.category,
        priceHistory: [],
        bestPrice: null,
        averagePriceCents: 0,
        lowestPriceCents: 0,
        highestPriceCents: 0,
        vendorCount: 0,
      })
      continue
    }

    // Get latest price per vendor (most recent recorded_at)
    const latestByVendor = new Map<string, VendorPriceEntry>()
    for (const p of prices) {
      if (!latestByVendor.has(p.vendorId)) {
        latestByVendor.set(p.vendorId, p) // already sorted desc
      }
    }

    const latestPrices = [...latestByVendor.values()]
    const priceCents = latestPrices.map((p) => p.priceCents)
    const lowest = Math.min(...priceCents)
    const highest = Math.max(...priceCents)
    const avg = Math.round(priceCents.reduce((a, b) => a + b, 0) / priceCents.length)

    // Best price = lowest current price
    const bestPrice = latestPrices.find((p) => p.priceCents === lowest) ?? null

    // Potential savings = difference between highest and lowest current price
    if (latestPrices.length > 1) {
      totalPotentialSavings += highest - lowest
    }

    ingredients.push({
      ingredientId: ingId,
      ingredientName: ing.name,
      category: ing.category,
      priceHistory: prices,
      bestPrice,
      averagePriceCents: avg,
      lowestPriceCents: lowest,
      highestPriceCents: highest,
      vendorCount: latestByVendor.size,
    })
  }

  // Sort: ingredients with pricing first, then by name
  ingredients.sort((a, b) => {
    if (a.vendorCount > 0 && b.vendorCount === 0) return -1
    if (a.vendorCount === 0 && b.vendorCount > 0) return 1
    return a.ingredientName.localeCompare(b.ingredientName)
  })

  const withPricing = ingredients.filter((i) => i.vendorCount > 0).length

  return {
    ingredients,
    totalIngredients: ingredients.length,
    ingredientsWithPricing: withPricing,
    ingredientsWithoutPricing: ingredients.length - withPricing,
    vendorsUsed: [...vendorSet.values()].map((v) => ({
      id: v.id,
      name: v.name,
      type: v.type,
      itemCount: v.items.size,
    })),
    potentialSavingsCents: totalPotentialSavings,
  }
}

// ============================================
// HELPERS
// ============================================

function emptyResult(): VendorComparisonResult {
  return {
    ingredients: [],
    totalIngredients: 0,
    ingredientsWithPricing: 0,
    ingredientsWithoutPricing: 0,
    vendorsUsed: [],
    potentialSavingsCents: 0,
  }
}
