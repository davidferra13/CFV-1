'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { enqueueHermesEvent } from '@/lib/pricing/hermes-queue'

// ======================================================================
// CHEF INGREDIENT PRICES (standing overrides, Tier 0)
// ======================================================================

const setChefPriceSchema = z.object({
  ingredientId: z.string().uuid(),
  priceCents: z.number().int().positive(),
  priceUnit: z.string().min(1).max(20).default('lb'),
  source: z.enum(['manual', 'receipt', 'invoice', 'shopping_list']).default('manual'),
  marketPriceCents: z.number().int().positive().optional(),
  marketConfidence: z.number().min(0).max(1).optional(),
  notes: z.string().max(500).optional(),
})

export type SetChefPriceInput = z.infer<typeof setChefPriceSchema>

/**
 * Set or update a chef's standing price override for an ingredient.
 * This becomes Tier 0 in the resolution chain (above receipts).
 * Also writes a confirmed observation to ingredient_price_history.
 */
export async function setChefIngredientPrice(input: SetChefPriceInput) {
  const chef = await requireChef()
  const parsed = setChefPriceSchema.parse(input)
  const chefId = chef.tenantId ?? chef.entityId

  // Upsert the standing override
  await db.execute(sql`
    INSERT INTO chef_ingredient_prices (
      chef_id, ingredient_id, price_cents, price_unit, source,
      confirmed_at, market_price_at_confirm, market_confidence_at_confirm, notes,
      updated_at
    ) VALUES (
      ${chefId}, ${parsed.ingredientId}, ${parsed.priceCents}, ${parsed.priceUnit},
      ${parsed.source}, NOW(), ${parsed.marketPriceCents ?? null},
      ${parsed.marketConfidence ?? null}, ${parsed.notes ?? null}, NOW()
    )
    ON CONFLICT (chef_id, ingredient_id) DO UPDATE SET
      price_cents = EXCLUDED.price_cents,
      price_unit = EXCLUDED.price_unit,
      source = EXCLUDED.source,
      confirmed_at = NOW(),
      market_price_at_confirm = EXCLUDED.market_price_at_confirm,
      market_confidence_at_confirm = EXCLUDED.market_confidence_at_confirm,
      notes = EXCLUDED.notes,
      updated_at = NOW()
  `)

  // Also write to ingredient_price_history as a confirmed observation
  await db.execute(sql`
    INSERT INTO ingredient_price_history (
      tenant_id, ingredient_id, price_cents, unit, price_per_unit_cents,
      store_name, purchase_date, source, notes
    ) VALUES (
      ${chefId}, ${parsed.ingredientId}, ${parsed.priceCents}, ${parsed.priceUnit},
      ${parsed.priceCents}, 'Chef override', CURRENT_DATE, 'manual',
      ${parsed.notes ?? null}
    )
  `)

  // Contribute anonymized price to shared pool (non-blocking)
  contributeAnonymousPrice(
    chefId,
    parsed.ingredientId,
    parsed.priceCents,
    parsed.priceUnit,
    'override'
  )

  // Notify Hermes of price override (fire-and-forget)
  try {
    await enqueueHermesEvent('price.overridden', {
      ingredientId: parsed.ingredientId,
      tenantId: chefId,
      source: 'chef_override',
    })
  } catch {}

  revalidateTag('pricing')
  revalidatePath('/menus', 'layout')
  revalidatePath('/events', 'layout')

  return { success: true }
}

/**
 * Remove a standing price override. Falls back to normal resolution chain.
 */
export async function removeChefIngredientPrice(ingredientId: string) {
  const chef = await requireChef()
  const chefId = chef.tenantId ?? chef.entityId

  await db.execute(sql`
    DELETE FROM chef_ingredient_prices
    WHERE chef_id = ${chefId} AND ingredient_id = ${ingredientId}
  `)

  revalidateTag('pricing')
  return { success: true }
}

/**
 * Get all standing price overrides for the current chef.
 */
export async function getChefIngredientPrices() {
  const chef = await requireChef()
  const chefId = chef.tenantId ?? chef.entityId

  const rows = (await db.execute(sql`
    SELECT cip.*, i.name AS ingredient_name, i.category
    FROM chef_ingredient_prices cip
    JOIN ingredients i ON i.id = cip.ingredient_id
    WHERE cip.chef_id = ${chefId}
    ORDER BY cip.updated_at DESC
  `)) as unknown as Array<{
    id: string
    chef_id: string
    ingredient_id: string
    ingredient_name: string
    category: string | null
    price_cents: number
    price_unit: string
    source: string
    confirmed_at: string
    market_price_at_confirm: number | null
    market_confidence_at_confirm: number | null
    notes: string | null
    created_at: string
    updated_at: string
  }>

  return rows
}

// ======================================================================
// PRICE FEEDBACK (confirm/dispute signals)
// ======================================================================

const priceFeedbackSchema = z.object({
  ingredientId: z.string().uuid(),
  pricingRegionId: z.string().uuid().optional(),
  shownPriceCents: z.number().int().positive(),
  shownConfidence: z.number().min(0).max(1).optional(),
  shownSource: z.string().optional(),
  feedback: z.enum(['confirmed', 'too_high', 'too_low', 'wrong_item']),
  actualPriceCents: z.number().int().positive().optional(),
  storeName: z.string().max(200).optional(),
})

export type PriceFeedbackInput = z.infer<typeof priceFeedbackSchema>

/**
 * Submit feedback on a shown price. "Confirmed" signals boost confidence.
 * "Too high/low" with actual price creates a correction observation.
 * "Wrong item" flags a matching error.
 */
export async function submitPriceFeedback(input: PriceFeedbackInput) {
  const chef = await requireChef()
  const parsed = priceFeedbackSchema.parse(input)
  const chefId = chef.tenantId ?? chef.entityId

  await db.execute(sql`
    INSERT INTO price_feedback (
      chef_id, ingredient_id, pricing_region_id,
      shown_price_cents, shown_confidence, shown_source,
      feedback, actual_price_cents, store_name
    ) VALUES (
      ${chefId}, ${parsed.ingredientId}, ${parsed.pricingRegionId ?? null},
      ${parsed.shownPriceCents}, ${parsed.shownConfidence ?? null},
      ${parsed.shownSource ?? null}, ${parsed.feedback},
      ${parsed.actualPriceCents ?? null}, ${parsed.storeName ?? null}
    )
  `)

  // If they confirmed the price, write it as a high-confidence observation
  if (parsed.feedback === 'confirmed') {
    await db.execute(sql`
      INSERT INTO ingredient_price_history (
        tenant_id, ingredient_id, price_cents, price_per_unit_cents,
        unit, store_name, purchase_date, source, notes
      ) VALUES (
        ${chefId}, ${parsed.ingredientId}, ${parsed.shownPriceCents},
        ${parsed.shownPriceCents}, 'each',
        ${parsed.storeName ?? 'Confirmed'}, CURRENT_DATE, 'manual',
        'Chef confirmed price'
      )
    `)
    // Contribute anonymized confirmation to shared pool (non-blocking)
    contributeAnonymousPrice(
      chefId,
      parsed.ingredientId,
      parsed.shownPriceCents,
      'each',
      'confirmed'
    )
  }

  // If they provided a correction, write that as an observation too
  if (
    parsed.actualPriceCents &&
    (parsed.feedback === 'too_high' || parsed.feedback === 'too_low')
  ) {
    await db.execute(sql`
      INSERT INTO ingredient_price_history (
        tenant_id, ingredient_id, price_cents, price_per_unit_cents,
        unit, store_name, purchase_date, source, notes
      ) VALUES (
        ${chefId}, ${parsed.ingredientId}, ${parsed.actualPriceCents},
        ${parsed.actualPriceCents}, 'each',
        ${parsed.storeName ?? 'Chef correction'}, CURRENT_DATE, 'manual',
        ${'Price correction: shown ' + parsed.shownPriceCents + 'c, actual ' + parsed.actualPriceCents + 'c'}
      )
    `)
  }

  revalidateTag('pricing')
  return { success: true }
}

// ======================================================================
// ANONYMOUS PRICE CONTRIBUTIONS (crowd-sourced pricing)
// ======================================================================

/**
 * Write an anonymized price observation to the shared pool.
 * No tenant_id is stored. State is derived from the chef's profile.
 * Called automatically after confirmations and overrides.
 */
async function contributeAnonymousPrice(
  chefId: string,
  ingredientId: string,
  priceCents: number,
  unit: string,
  feedbackType: 'confirmed' | 'override'
): Promise<void> {
  try {
    // Get chef's state for regional bucketing
    const stateRows = (await db.execute(
      sql`SELECT home_state FROM chefs WHERE id = ${chefId} LIMIT 1`
    )) as unknown as { home_state: string | null }[]
    const state = stateRows[0]?.home_state
    if (!state) return // Can't contribute without geographic context

    await db.execute(sql`
      INSERT INTO anonymous_price_contributions (
        ingredient_id, state, price_cents, unit, feedback_type, contributed_at
      ) VALUES (
        ${ingredientId}, ${state}, ${priceCents}, ${unit}, ${feedbackType}, NOW()
      )
    `)
  } catch {
    // Non-critical; silently degrade. Never block the primary action.
  }
}

// ======================================================================
// CHEF SUPPLIER PREFERENCES
// ======================================================================

const supplierPrefSchema = z.object({
  storeName: z.string().min(1).max(200),
  chainSlug: z.string().optional(),
  vendorId: z.string().uuid().optional(),
  preferenceRank: z.number().int().min(1).max(10).default(1),
  isWholesale: z.boolean().default(false),
  zip: z.string().max(10).optional(),
  notes: z.string().max(500).optional(),
})

export type SupplierPrefInput = z.infer<typeof supplierPrefSchema>

/**
 * Add or update a supplier preference.
 */
export async function setSupplierPreference(input: SupplierPrefInput) {
  const chef = await requireChef()
  const parsed = supplierPrefSchema.parse(input)
  const chefId = chef.tenantId ?? chef.entityId

  await db.execute(sql`
    INSERT INTO chef_supplier_preferences (
      chef_id, store_name, chain_slug, vendor_id, preference_rank,
      is_wholesale, zip, notes, updated_at
    ) VALUES (
      ${chefId}, ${parsed.storeName}, ${parsed.chainSlug ?? null},
      ${parsed.vendorId ?? null}, ${parsed.preferenceRank},
      ${parsed.isWholesale}, ${parsed.zip ?? null},
      ${parsed.notes ?? null}, NOW()
    )
    ON CONFLICT (chef_id, store_name) DO UPDATE SET
      chain_slug = EXCLUDED.chain_slug,
      vendor_id = EXCLUDED.vendor_id,
      preference_rank = EXCLUDED.preference_rank,
      is_wholesale = EXCLUDED.is_wholesale,
      zip = EXCLUDED.zip,
      notes = EXCLUDED.notes,
      updated_at = NOW()
  `)

  revalidateTag('pricing')
  return { success: true }
}

/**
 * Remove a supplier preference.
 */
export async function removeSupplierPreference(storeName: string) {
  const chef = await requireChef()
  const chefId = chef.tenantId ?? chef.entityId

  await db.execute(sql`
    DELETE FROM chef_supplier_preferences
    WHERE chef_id = ${chefId} AND store_name = ${storeName}
  `)

  revalidateTag('pricing')
  return { success: true }
}

/**
 * Get all supplier preferences for the current chef.
 */
export async function getSupplierPreferences() {
  const chef = await requireChef()
  const chefId = chef.tenantId ?? chef.entityId

  const rows = (await db.execute(sql`
    SELECT * FROM chef_supplier_preferences
    WHERE chef_id = ${chefId}
    ORDER BY preference_rank ASC, store_name ASC
  `)) as unknown as Array<{
    id: string
    chef_id: string
    store_name: string
    chain_slug: string | null
    vendor_id: string | null
    preference_rank: number
    is_wholesale: boolean
    zip: string | null
    notes: string | null
    created_at: string
    updated_at: string
  }>

  return rows
}
