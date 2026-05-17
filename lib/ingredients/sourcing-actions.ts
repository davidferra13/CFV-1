'use server'

// Ingredient Sourcing Intelligence - Server Actions
// Where to buy, price comparison, vendor preferences, purchase history.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  SourcingOption,
  VendorPreference,
  SeasonalWindow,
  PurchaseLogEntry,
  PurchaseLogInput,
  SourcingReport,
  SourcingReportItem,
} from './sourcing-types'

// Vendor type priority for sorting (lower = higher priority)
const VENDOR_TYPE_PRIORITY: Record<string, number> = {
  farm: 1,
  butcher: 2,
  fishmonger: 3,
  produce: 4,
  dairy: 5,
  specialty: 6,
  bakery: 7,
  grocery: 8,
  liquor: 9,
  equipment: 10,
  other: 11,
}

// ── getIngredientSourcingOptions ─────────────────────────────────────────────

export async function getIngredientSourcingOptions(
  ingredientId: string
): Promise<{ options: SourcingOption[]; error: string | null }> {
  try {
    const user = await requireChef()
    const tenantId = user.entityId
    const db = createServerClient()

    // Get all active vendors for this chef
    const { data: vendors, error: vendorErr } = await db
      .from('vendors')
      .select('id, name, vendor_type, phone, email, contact_name, is_preferred, reliability_score, minimum_order_cents, notes')
      .eq('chef_id', tenantId)
      .eq('status', 'active')

    if (vendorErr) {
      console.error('[sourcing] Failed to fetch vendors:', vendorErr.message)
      return { options: [], error: 'Failed to load vendor options' }
    }

    // Get vendor-specific price entries for this ingredient
    const { data: ingredient } = await db
      .from('ingredients')
      .select('name')
      .eq('id', ingredientId)
      .eq('tenant_id', tenantId)
      .single()

    const ingredientName = ingredient?.name ?? ''

    // Get vendor price entries matching ingredient name
    const { data: priceEntries } = await db
      .from('vendor_price_entries')
      .select('vendor_id, price_cents, unit, recorded_at')
      .eq('chef_id', tenantId)
      .ilike('item_name', ingredientName)
      .order('recorded_at', { ascending: false })

    // Build price lookup by vendor
    const priceByVendor: Record<string, { priceCents: number; unit: string; date: string }> = {}
    for (const entry of priceEntries ?? []) {
      if (!priceByVendor[entry.vendor_id]) {
        priceByVendor[entry.vendor_id] = {
          priceCents: entry.price_cents,
          unit: entry.unit,
          date: entry.recorded_at,
        }
      }
    }

    // Check ingredient_vendor_preferences for this ingredient
    const { data: prefs } = await db
      .from('ingredient_vendor_preferences')
      .select('vendor_name, is_preferred')
      .eq('ingredient_id', ingredientId)
      .eq('tenant_id', tenantId)

    const prefVendorNames = new Set(
      (prefs ?? []).filter((p: { is_preferred: boolean }) => p.is_preferred).map((p: { vendor_name: string }) => p.vendor_name.toLowerCase())
    )

    const options: SourcingOption[] = (vendors ?? []).map((v: Record<string, unknown>) => {
      const price = priceByVendor[v.id as string]
      const isIngredientPreferred = prefVendorNames.has((v.name as string).toLowerCase())
      return {
        vendorId: v.id as string,
        vendorName: v.name as string,
        vendorType: (v.vendor_type as string) ?? 'other',
        phone: (v.phone as string) ?? null,
        email: (v.email as string) ?? null,
        contactName: (v.contact_name as string) ?? null,
        isPreferred: isIngredientPreferred || (v.is_preferred as boolean),
        reliabilityScore: v.reliability_score ? Number(v.reliability_score) : null,
        minimumOrderCents: (v.minimum_order_cents as number) ?? null,
        notes: (v.notes as string) ?? null,
        lastPriceCents: price?.priceCents ?? null,
        lastPriceDate: price?.date ?? null,
        lastPriceUnit: price?.unit ?? null,
      }
    }) as SourcingOption[]

    // Sort: preferred first, then by vendor type priority
    options.sort((a, b) => {
      if (a.isPreferred !== b.isPreferred) return a.isPreferred ? -1 : 1
      const aPri = VENDOR_TYPE_PRIORITY[a.vendorType] ?? 99
      const bPri = VENDOR_TYPE_PRIORITY[b.vendorType] ?? 99
      return aPri - bPri
    })

    return { options, error: null }
  } catch (err) {
    console.error('[sourcing] getIngredientSourcingOptions error:', err)
    return { options: [], error: 'Failed to load sourcing options' }
  }
}

// ── setPreferredVendor ──────────────────────────────────────────────────────

export async function setPreferredVendor(
  ingredientId: string,
  vendorId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const user = await requireChef()
    const tenantId = user.entityId
    const db = createServerClient()

    // Fetch vendor name
    const { data: vendor, error: vendorErr } = await db
      .from('vendors')
      .select('id, name, vendor_type')
      .eq('id', vendorId)
      .eq('chef_id', tenantId)
      .single()

    if (vendorErr || !vendor) {
      return { success: false, error: 'Vendor not found' }
    }

    // Clear existing preferred for this ingredient
    await db
      .from('ingredient_vendor_preferences')
      .update({ is_preferred: false })
      .eq('ingredient_id', ingredientId)
      .eq('tenant_id', tenantId)

    // Upsert the new preferred vendor
    const { error: upsertErr } = await db
      .from('ingredient_vendor_preferences')
      .upsert(
        {
          ingredient_id: ingredientId,
          tenant_id: tenantId,
          vendor_name: vendor.name,
          vendor_type: vendor.vendor_type ?? 'other',
          is_preferred: true,
        },
        { onConflict: 'ingredient_id,tenant_id,vendor_name' }
      )

    if (upsertErr) {
      console.error('[sourcing] setPreferredVendor upsert error:', upsertErr.message)
      return { success: false, error: 'Failed to set preferred vendor' }
    }

    // Also update the ingredient's preferred_vendor field for quick access
    await db
      .from('ingredients')
      .update({ preferred_vendor: vendor.name })
      .eq('id', ingredientId)
      .eq('tenant_id', tenantId)

    return { success: true, error: null }
  } catch (err) {
    console.error('[sourcing] setPreferredVendor error:', err)
    return { success: false, error: 'Failed to set preferred vendor' }
  }
}

// ── getSourcingReport ───────────────────────────────────────────────────────

export async function getSourcingReport(
  eventId: string
): Promise<{ report: SourcingReport | null; error: string | null }> {
  try {
    const user = await requireChef()
    const tenantId = user.entityId
    const db = createServerClient()

    // Get event menu items (recipe ingredients for this event)
    const { data: eventMenus } = await db
      .from('event_menus')
      .select('menu_id')
      .eq('event_id', eventId)

    if (!eventMenus || eventMenus.length === 0) {
      return { report: null, error: 'No menus found for this event' }
    }

    const menuIds = eventMenus.map((em: { menu_id: string }) => em.menu_id)

    // Get menu items and their recipe ingredients
    const { data: menuItems } = await db
      .from('menu_items')
      .select('recipe_id')
      .in('menu_id', menuIds)

    const recipeIds = (menuItems ?? [])
      .map((mi: { recipe_id: string | null }) => mi.recipe_id)
      .filter(Boolean) as string[]

    // Get recipe ingredients
    const { data: recipeIngredients } = await db
      .from('recipe_ingredients')
      .select('ingredient_id, quantity, unit')
      .in('recipe_id', recipeIds)

    // Deduplicate by ingredient_id
    const ingredientMap = new Map<string, { quantity: string | null; unit: string | null }>()
    for (const ri of recipeIngredients ?? []) {
      if (ri.ingredient_id && !ingredientMap.has(ri.ingredient_id)) {
        ingredientMap.set(ri.ingredient_id, {
          quantity: ri.quantity?.toString() ?? null,
          unit: ri.unit ?? null,
        })
      }
    }

    const ingredientIds = Array.from(ingredientMap.keys())
    if (ingredientIds.length === 0) {
      return {
        report: { eventId, items: [], totalEstimatedCents: 0, vendorSummary: [] },
        error: null,
      }
    }

    // Get ingredient details
    const { data: ingredientRows } = await db
      .from('ingredients')
      .select('id, name, preferred_vendor, last_price_cents')
      .in('id', ingredientIds)
      .eq('tenant_id', tenantId)

    // Get all active vendors
    const { data: vendors } = await db
      .from('vendors')
      .select('id, name, vendor_type, phone, email, contact_name, is_preferred, reliability_score, minimum_order_cents, notes')
      .eq('chef_id', tenantId)
      .eq('status', 'active')

    // Build report items
    const items: SourcingReportItem[] = (ingredientRows ?? []).map((ing: Record<string, unknown>) => {
      const qty = ingredientMap.get(ing.id as string)
      const vendorOptions: SourcingOption[] = (vendors ?? []).map((v: Record<string, unknown>) => ({
        vendorId: v.id as string,
        vendorName: v.name as string,
        vendorType: (v.vendor_type as string) ?? 'other',
        phone: (v.phone as string) ?? null,
        email: (v.email as string) ?? null,
        contactName: (v.contact_name as string) ?? null,
        isPreferred: (v.is_preferred as boolean) || (v.name as string) === (ing.preferred_vendor as string),
        reliabilityScore: v.reliability_score ? Number(v.reliability_score) : null,
        minimumOrderCents: (v.minimum_order_cents as number) ?? null,
        notes: (v.notes as string) ?? null,
        lastPriceCents: null,
        lastPriceDate: null,
        lastPriceUnit: null,
      }))

      vendorOptions.sort((a, b) => {
        if (a.isPreferred !== b.isPreferred) return a.isPreferred ? -1 : 1
        return (VENDOR_TYPE_PRIORITY[a.vendorType] ?? 99) - (VENDOR_TYPE_PRIORITY[b.vendorType] ?? 99)
      })

      return {
        ingredientId: ing.id as string,
        ingredientName: ing.name as string,
        requiredQuantity: qty?.quantity ?? null,
        requiredUnit: qty?.unit ?? null,
        preferredVendor: (ing.preferred_vendor as string) ?? null,
        estimatedPriceCents: (ing.last_price_cents as number) ?? null,
        sourcingOptions: vendorOptions,
      }
    })

    // Vendor summary
    const vendorCounts: Record<string, { itemCount: number; estimatedCents: number }> = {}
    for (const item of items) {
      const vendorName = item.preferredVendor ?? item.sourcingOptions[0]?.vendorName ?? 'Unassigned'
      if (!vendorCounts[vendorName]) {
        vendorCounts[vendorName] = { itemCount: 0, estimatedCents: 0 }
      }
      vendorCounts[vendorName].itemCount++
      vendorCounts[vendorName].estimatedCents += item.estimatedPriceCents ?? 0
    }

    const vendorSummary = Object.entries(vendorCounts).map(([vendorName, stats]) => ({
      vendorName,
      ...stats,
    }))

    const totalEstimatedCents = items.reduce((sum, i) => sum + (i.estimatedPriceCents ?? 0), 0)

    return {
      report: { eventId, items, totalEstimatedCents, vendorSummary },
      error: null,
    }
  } catch (err) {
    console.error('[sourcing] getSourcingReport error:', err)
    return { report: null, error: 'Failed to generate sourcing report' }
  }
}

// ── getSeasonalAvailability ─────────────────────────────────────────────────

// Seasonal data based on ingredient category (Northeast US baseline).
// Future: pull from PIE seasonal scores or CIL signals.
const CATEGORY_SEASONS: Record<string, { peak: number[]; available: number[] }> = {
  produce: { peak: [6, 7, 8, 9], available: [5, 6, 7, 8, 9, 10] },
  fresh_herb: { peak: [5, 6, 7, 8, 9], available: [4, 5, 6, 7, 8, 9, 10] },
  protein: { peak: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], available: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  dairy: { peak: [4, 5, 6, 7, 8, 9], available: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  fruit: { peak: [6, 7, 8, 9], available: [5, 6, 7, 8, 9, 10] },
}

export async function getSeasonalAvailability(
  ingredientId: string
): Promise<{ seasonal: SeasonalWindow | null; error: string | null }> {
  try {
    const user = await requireChef()
    const tenantId = user.entityId
    const db = createServerClient()

    const { data: ingredient, error: ingErr } = await db
      .from('ingredients')
      .select('id, name, category')
      .eq('id', ingredientId)
      .eq('tenant_id', tenantId)
      .single()

    if (ingErr || !ingredient) {
      return { seasonal: null, error: 'Ingredient not found' }
    }

    const seasonData = CATEGORY_SEASONS[ingredient.category] ?? {
      peak: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      available: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    }

    return {
      seasonal: {
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        category: ingredient.category,
        peakMonths: seasonData.peak,
        availableMonths: seasonData.available,
        qualityNotes: null,
      },
      error: null,
    }
  } catch (err) {
    console.error('[sourcing] getSeasonalAvailability error:', err)
    return { seasonal: null, error: 'Failed to load seasonal data' }
  }
}

// ── logIngredientPurchase ───────────────────────────────────────────────────

export async function logIngredientPurchase(
  ingredientId: string,
  input: PurchaseLogInput
): Promise<{ entry: PurchaseLogEntry | null; error: string | null }> {
  try {
    const user = await requireChef()
    const tenantId = user.entityId
    const db = createServerClient()

    // Validate ingredient belongs to tenant
    const { data: ingredient } = await db
      .from('ingredients')
      .select('id, name')
      .eq('id', ingredientId)
      .eq('tenant_id', tenantId)
      .single()

    if (!ingredient) {
      return { entry: null, error: 'Ingredient not found' }
    }

    // Validate quality rating if provided
    if (input.qualityRating != null && (input.qualityRating < 1 || input.qualityRating > 5)) {
      return { entry: null, error: 'Quality rating must be between 1 and 5' }
    }

    // Insert purchase log
    const purchasedAt = input.purchasedAt ?? new Date().toISOString()
    const { data: entry, error: insertErr } = await db
      .from('ingredient_purchase_log')
      .insert({
        ingredient_id: ingredientId,
        tenant_id: tenantId,
        vendor_name: input.vendorName,
        price_cents: input.priceCents,
        quantity: input.quantity,
        unit: input.unit,
        quality_rating: input.qualityRating ?? null,
        purchased_at: purchasedAt,
        notes: input.notes ?? null,
      })
      .select()
      .single()

    if (insertErr) {
      console.error('[sourcing] logIngredientPurchase insert error:', insertErr.message)
      return { entry: null, error: 'Failed to log purchase' }
    }

    // Update ingredient's last price info
    await db
      .from('ingredients')
      .update({
        last_price_cents: input.priceCents,
        last_price_date: purchasedAt.split('T')[0],
        last_purchased_at: purchasedAt,
        last_price_store: input.vendorName,
        last_price_source: 'manual',
      })
      .eq('id', ingredientId)
      .eq('tenant_id', tenantId)

    return {
      entry: {
        id: entry.id,
        ingredientId: entry.ingredient_id,
        tenantId: entry.tenant_id,
        vendorName: entry.vendor_name,
        priceCents: entry.price_cents,
        quantity: entry.quantity,
        unit: entry.unit,
        qualityRating: entry.quality_rating,
        purchasedAt: entry.purchased_at,
        notes: entry.notes,
        createdAt: entry.created_at,
      },
      error: null,
    }
  } catch (err) {
    console.error('[sourcing] logIngredientPurchase error:', err)
    return { entry: null, error: 'Failed to log purchase' }
  }
}

// ── getPurchaseHistory ──────────────────────────────────────────────────────

export async function getPurchaseHistory(
  ingredientId: string,
  limit = 50
): Promise<{ purchases: PurchaseLogEntry[]; error: string | null }> {
  try {
    const user = await requireChef()
    const tenantId = user.entityId
    const db = createServerClient()

    const { data: rows, error: fetchErr } = await db
      .from('ingredient_purchase_log')
      .select('id, ingredient_id, tenant_id, vendor_name, price_cents, quantity, unit, quality_rating, purchased_at, notes, created_at')
      .eq('ingredient_id', ingredientId)
      .eq('tenant_id', tenantId)
      .order('purchased_at', { ascending: false })
      .limit(limit)

    if (fetchErr) {
      console.error('[sourcing] getPurchaseHistory error:', fetchErr.message)
      return { purchases: [], error: 'Failed to load purchase history' }
    }

    const purchases: PurchaseLogEntry[] = (rows ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      ingredientId: r.ingredient_id as string,
      tenantId: r.tenant_id as string,
      vendorName: r.vendor_name as string,
      priceCents: r.price_cents as number,
      quantity: r.quantity as string,
      unit: r.unit as string,
      qualityRating: (r.quality_rating as number) ?? null,
      purchasedAt: r.purchased_at as string,
      notes: (r.notes as string) ?? null,
      createdAt: r.created_at as string,
    }))

    return { purchases, error: null }
  } catch (err) {
    console.error('[sourcing] getPurchaseHistory error:', err)
    return { purchases: [], error: 'Failed to load purchase history' }
  }
}
