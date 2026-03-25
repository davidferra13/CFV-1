// Vendor Price Comparison Server Actions
// Compare prices across multiple vendors for the same ingredient.
// Deterministic best-price selection (Formula > AI).

'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ── Types ────────────────────────────────────────────────────────────────────

export type VendorIngredientPrice = {
  id: string
  vendorId: string
  vendorName: string
  ingredientName: string
  ingredientId: string | null
  unitPriceCents: number | null
  priceUnit: string | null
  leadTimeDays: number | null
  minOrderQty: number | null
  minOrderUnit: string | null
  lastOrderedAt: string | null
  isPreferred: boolean
  notes: string | null
}

export type BestPriceResult = {
  vendorId: string
  vendorName: string
  unitPriceCents: number
  priceUnit: string | null
  leadTimeDays: number | null
  savingsVsHighestCents: number
  isPreferred: boolean
}

// ── Query vendor prices for an ingredient ────────────────────────────────────

/**
 * Get all vendor prices for a specific ingredient, sorted by price (cheapest first).
 */
export async function getVendorPricesForIngredient(
  ingredientName: string,
  ingredientId?: string | null
): Promise<VendorIngredientPrice[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('vendor_preferred_ingredients')
    .select(
      `
      id,
      vendor_id,
      ingredient_name,
      ingredient_id,
      unit_price_cents,
      price_unit,
      lead_time_days,
      min_order_qty,
      min_order_unit,
      last_ordered_at,
      is_preferred,
      notes,
      vendors!inner(business_name)
    `
    )
    .eq('chef_id', user.tenantId!)

  // Match by ingredient_id if available, otherwise by name
  if (ingredientId) {
    query = query.eq('ingredient_id', ingredientId)
  } else {
    query = query.eq('ingredient_name', ingredientName)
  }

  const { data, error } = await query.order('unit_price_cents', {
    ascending: true,
    nullsFirst: false,
  })

  if (error) throw new Error(`Failed to fetch vendor prices: ${error.message}`)

  return (data || []).map((row: any) => ({
    id: row.id,
    vendorId: row.vendor_id,
    vendorName: row.vendors?.business_name ?? 'Unknown vendor',
    ingredientName: row.ingredient_name,
    ingredientId: row.ingredient_id,
    unitPriceCents: row.unit_price_cents,
    priceUnit: row.price_unit,
    leadTimeDays: row.lead_time_days,
    minOrderQty: row.min_order_qty ? Number(row.min_order_qty) : null,
    minOrderUnit: row.min_order_unit,
    lastOrderedAt: row.last_ordered_at,
    isPreferred: row.is_preferred ?? false,
    notes: row.notes,
  }))
}

// ── Best price selection ─────────────────────────────────────────────────────

/**
 * Deterministic best-price vendor selection.
 * Returns the vendor with the lowest unit price.
 * If prices are equal, prefers the vendor marked as preferred.
 * If still tied, prefers the one with shorter lead time.
 */
export async function getBestPriceVendor(
  ingredientName: string,
  ingredientId?: string | null
): Promise<BestPriceResult | null> {
  const prices = await getVendorPricesForIngredient(ingredientName, ingredientId)

  // Filter to entries that have a price
  const withPrices = prices.filter((p) => p.unitPriceCents != null && p.unitPriceCents > 0)
  if (withPrices.length === 0) return null

  // Sort: lowest price first, then preferred, then shortest lead time
  const sorted = [...withPrices].sort((a, b) => {
    const priceDiff = (a.unitPriceCents ?? 0) - (b.unitPriceCents ?? 0)
    if (priceDiff !== 0) return priceDiff

    // Prefer the preferred vendor
    if (a.isPreferred && !b.isPreferred) return -1
    if (!a.isPreferred && b.isPreferred) return 1

    // Shorter lead time wins
    const leadA = a.leadTimeDays ?? 999
    const leadB = b.leadTimeDays ?? 999
    return leadA - leadB
  })

  const best = sorted[0]
  const highest = withPrices.reduce((max, p) => Math.max(max, p.unitPriceCents ?? 0), 0)

  return {
    vendorId: best.vendorId,
    vendorName: best.vendorName,
    unitPriceCents: best.unitPriceCents!,
    priceUnit: best.priceUnit,
    leadTimeDays: best.leadTimeDays,
    savingsVsHighestCents: highest - best.unitPriceCents!,
    isPreferred: best.isPreferred,
  }
}

// ── Update vendor pricing ────────────────────────────────────────────────────

/**
 * Create or update vendor pricing for an ingredient.
 */
export async function upsertVendorIngredientPricing(
  ingredientName: string,
  vendorId: string,
  data: {
    ingredientId?: string
    unitPriceCents?: number
    priceUnit?: string
    leadTimeDays?: number
    minOrderQty?: number
    minOrderUnit?: string
    isPreferred?: boolean
    notes?: string
  }
): Promise<{ id: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Check for existing entry
  const { data: existing } = await db
    .from('vendor_preferred_ingredients')
    .select('id')
    .eq('chef_id', user.tenantId!)
    .eq('ingredient_name', ingredientName)
    .eq('vendor_id', vendorId)
    .maybeSingle()

  if (existing?.id) {
    // Update
    const { error } = await db
      .from('vendor_preferred_ingredients')
      .update({
        ingredient_id: data.ingredientId ?? null,
        unit_price_cents: data.unitPriceCents ?? null,
        price_unit: data.priceUnit ?? null,
        lead_time_days: data.leadTimeDays ?? null,
        min_order_qty: data.minOrderQty ?? null,
        min_order_unit: data.minOrderUnit ?? null,
        is_preferred: data.isPreferred ?? false,
        notes: data.notes ?? null,
      })
      .eq('id', existing.id)

    if (error) throw new Error(`Failed to update vendor pricing: ${error.message}`)

    revalidatePath('/inventory')
    return { id: existing.id }
  }

  // Insert new
  const { data: inserted, error } = await db
    .from('vendor_preferred_ingredients')
    .insert({
      chef_id: user.tenantId!,
      ingredient_name: ingredientName,
      vendor_id: vendorId,
      ingredient_id: data.ingredientId ?? null,
      unit_price_cents: data.unitPriceCents ?? null,
      price_unit: data.priceUnit ?? null,
      lead_time_days: data.leadTimeDays ?? null,
      min_order_qty: data.minOrderQty ?? null,
      min_order_unit: data.minOrderUnit ?? null,
      is_preferred: data.isPreferred ?? false,
      notes: data.notes ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to insert vendor pricing: ${error.message}`)

  revalidatePath('/inventory')
  return { id: inserted.id }
}

/**
 * Delete a vendor-ingredient pricing entry.
 */
export async function deleteVendorIngredientPricing(id: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('vendor_preferred_ingredients')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete vendor pricing: ${error.message}`)

  revalidatePath('/inventory')
}
