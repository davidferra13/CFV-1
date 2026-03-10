// Smart Reorder Triggers
// Checks inventory levels against par, groups by preferred vendor,
// and generates draft purchase orders automatically.

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────

export type ReorderAlert = {
  ingredientName: string
  currentStock: number
  parLevel: number
  shortfall: number
  unit: string
  reorderQty: number | null
  preferredVendorId: string | null
  preferredVendorName: string | null
  lastPriceCents: number | null
  lastPriceUnit: string | null
  urgency: 'critical' | 'low' | 'ok'
}

export type ReorderSetting = {
  id: string
  ingredientName: string
  parLevel: number
  reorderQty: number
  preferredVendorId: string | null
  preferredVendorName: string | null
  unit: string
  isActive: boolean
}

// ─── Schemas ─────────────────────────────────────────────────────

const SetReorderSettingsSchema = z.object({
  ingredientName: z.string().min(1, 'Ingredient name is required'),
  parLevel: z.number().min(0, 'Par level cannot be negative'),
  reorderQty: z.number().min(0, 'Reorder quantity cannot be negative'),
  preferredVendorId: z.string().uuid().optional().nullable(),
  unit: z.string().min(1, 'Unit is required'),
})

export type SetReorderSettingsInput = z.infer<typeof SetReorderSettingsSchema>

// ─── Actions ─────────────────────────────────────────────────────

/**
 * Check all inventory items against their reorder points.
 * Returns items below par with preferred vendor info and last price.
 * Merges data from inventory_counts and reorder_settings tables.
 */
export async function checkReorderPoints(): Promise<ReorderAlert[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch inventory counts that have par levels
  const { data: counts, error: countError } = await supabase
    .from('inventory_counts')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .not('par_level', 'is', null)

  if (countError) {
    console.error('[reorder] checkReorderPoints count error:', countError)
    throw new Error('Failed to check inventory levels')
  }

  // Fetch reorder settings for override values
  const { data: settings, error: settingsError } = await supabase
    .from('reorder_settings')
    .select('*, vendors:preferred_vendor_id(id, name)')
    .eq('chef_id', user.tenantId!)
    .eq('is_active', true)

  if (settingsError) {
    console.error('[reorder] checkReorderPoints settings error:', settingsError)
    // Non-fatal: continue without settings
  }

  // Also fetch preferred vendor mappings
  const { data: preferredMappings } = await supabase
    .from('vendor_preferred_ingredients')
    .select('ingredient_name, vendor_id, vendors(id, name)')
    .eq('chef_id', user.tenantId!)

  // Build lookup maps
  const settingsMap = new Map<string, any>()
  for (const s of settings ?? []) {
    settingsMap.set((s.ingredient_name || '').toLowerCase(), s)
  }

  const preferredMap = new Map<string, any>()
  for (const p of preferredMappings ?? []) {
    preferredMap.set((p.ingredient_name || '').toLowerCase(), p)
  }

  // Fetch latest prices for all ingredients from this chef's vendors
  const { data: latestPrices } = await supabase
    .from('vendor_price_points')
    .select('item_name, vendor_id, price_cents, unit, recorded_at')
    .eq('chef_id', user.tenantId!)
    .order('recorded_at', { ascending: false })
    .limit(2000)

  // Build a map of latest price per ingredient (across all vendors)
  const priceMap = new Map<string, { price_cents: number; unit: string }>()
  for (const p of latestPrices ?? []) {
    const key = (p.item_name || '').toLowerCase()
    if (!priceMap.has(key)) {
      priceMap.set(key, { price_cents: p.price_cents, unit: p.unit })
    }
  }

  const alerts: ReorderAlert[] = []

  for (const count of counts ?? []) {
    const name = (count.ingredient_name || '').toLowerCase()
    const currentQty = Number(count.current_qty ?? 0)
    const parLevel = Number(count.par_level ?? 0)

    if (parLevel <= 0) continue
    if (currentQty >= parLevel) continue

    const shortfall = parLevel - currentQty
    const setting = settingsMap.get(name)
    const preferred = preferredMap.get(name)
    const price = priceMap.get(name)

    // Determine preferred vendor: setting overrides preferred_ingredients mapping
    const vendorId = setting?.preferred_vendor_id ?? preferred?.vendor_id ?? count.vendor_id ?? null
    const vendorName = setting?.vendors?.name ?? preferred?.vendors?.name ?? null

    // Urgency: critical if below 50% of par, low if below par but above 50%
    const ratio = currentQty / parLevel
    const urgency: 'critical' | 'low' | 'ok' = ratio < 0.5 ? 'critical' : 'low'

    alerts.push({
      ingredientName: count.ingredient_name,
      currentStock: currentQty,
      parLevel,
      shortfall,
      unit: count.unit || 'each',
      reorderQty: setting?.reorder_qty != null ? Number(setting.reorder_qty) : null,
      preferredVendorId: vendorId,
      preferredVendorName: vendorName,
      lastPriceCents: price?.price_cents ?? null,
      lastPriceUnit: price?.unit ?? null,
      urgency,
    })
  }

  // Sort: critical first, then by shortfall descending
  alerts.sort((a, b) => {
    if (a.urgency === 'critical' && b.urgency !== 'critical') return -1
    if (a.urgency !== 'critical' && b.urgency === 'critical') return 1
    return b.shortfall - a.shortfall
  })

  return alerts
}

/**
 * Get just the count of items currently below par (for dashboard widget).
 */
export async function getReorderAlertCount(): Promise<number> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('inventory_counts')
    .select('id, current_qty, par_level')
    .eq('chef_id', user.tenantId!)
    .not('par_level', 'is', null)

  if (error) {
    console.error('[reorder] getReorderAlertCount error:', error)
    return 0
  }

  return (data ?? []).filter((row: any) => Number(row.current_qty) < Number(row.par_level)).length
}

/**
 * Generate a draft purchase order from reorder alerts for a specific vendor.
 * Groups items by vendor and creates a PO with estimated prices.
 */
export async function generateReorderPO(
  vendorId: string,
  items: { ingredientName: string; qty: number; unit: string; estimatedPriceCents?: number }[]
) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  if (items.length === 0) {
    throw new Error('At least one item is required to create a PO')
  }

  // Verify vendor belongs to this chef
  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('id, name')
    .eq('id', vendorId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (vendorError || !vendor) {
    throw new Error('Vendor not found')
  }

  // Calculate estimated total
  const estimatedTotalCents = items.reduce(
    (sum, item) => sum + Math.round((item.estimatedPriceCents ?? 0) * item.qty),
    0
  )

  // Create the PO
  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .insert({
      chef_id: user.tenantId!,
      vendor_id: vendorId,
      status: 'draft',
      order_date: new Date().toISOString().split('T')[0],
      estimated_total_cents: estimatedTotalCents,
      notes: `Auto-generated reorder for ${items.length} item(s) below par level`,
    })
    .select()
    .single()

  if (poError) {
    console.error('[reorder] generateReorderPO error:', poError)
    throw new Error('Failed to create purchase order')
  }

  // Add PO items
  const poItems = items.map((item) => ({
    purchase_order_id: po.id,
    chef_id: user.tenantId!,
    ingredient_name: item.ingredientName,
    ordered_qty: item.qty,
    unit: item.unit,
    estimated_unit_price_cents: item.estimatedPriceCents ?? null,
    estimated_total_cents: item.estimatedPriceCents
      ? Math.round(item.estimatedPriceCents * item.qty)
      : null,
  }))

  const { error: itemsError } = await supabase.from('purchase_order_items').insert(poItems)

  if (itemsError) {
    console.error('[reorder] generateReorderPO items error:', itemsError)
    // PO was created but items failed. Non-fatal, user can add items manually.
    console.warn('[reorder] PO created but some items failed to insert')
  }

  revalidatePath('/inventory/purchase-orders')
  revalidatePath('/inventory/reorder')

  return { poId: po.id, vendorName: vendor.name, itemCount: items.length }
}

/**
 * Get all reorder settings for the current chef.
 */
export async function getReorderSettings(): Promise<ReorderSetting[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('reorder_settings')
    .select('*, vendors:preferred_vendor_id(id, name)')
    .eq('chef_id', user.tenantId!)
    .order('ingredient_name', { ascending: true })

  if (error) {
    console.error('[reorder] getReorderSettings error:', error)
    throw new Error('Failed to get reorder settings')
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    ingredientName: row.ingredient_name,
    parLevel: Number(row.par_level),
    reorderQty: Number(row.reorder_qty),
    preferredVendorId: row.preferred_vendor_id,
    preferredVendorName: row.vendors?.name ?? null,
    unit: row.unit,
    isActive: row.is_active,
  }))
}

/**
 * Set reorder configuration for a specific ingredient.
 * Uses upsert on (chef_id, ingredient_name).
 */
export async function setReorderSettings(input: SetReorderSettingsInput) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const parsed = SetReorderSettingsSchema.parse(input)

  const normalized = parsed.ingredientName.trim().toLowerCase()

  const { error } = await supabase.from('reorder_settings').upsert(
    {
      chef_id: user.tenantId!,
      ingredient_name: normalized,
      par_level: parsed.parLevel,
      reorder_qty: parsed.reorderQty,
      preferred_vendor_id: parsed.preferredVendorId ?? null,
      unit: parsed.unit,
      is_active: true,
    },
    { onConflict: 'chef_id,ingredient_name' }
  )

  if (error) {
    console.error('[reorder] setReorderSettings error:', error)
    throw new Error('Failed to save reorder settings')
  }

  // Also sync to inventory_counts par_level if it exists
  const { error: syncError } = await supabase
    .from('inventory_counts')
    .update({ par_level: parsed.parLevel, vendor_id: parsed.preferredVendorId ?? null })
    .eq('chef_id', user.tenantId!)
    .eq('ingredient_name', normalized)

  if (syncError) {
    // Non-fatal: inventory_counts row may not exist yet
    console.warn('[reorder] Could not sync par_level to inventory_counts:', syncError.message)
  }

  revalidatePath('/inventory/reorder')
  revalidatePath('/inventory')
}

/**
 * Delete a reorder setting.
 */
export async function deleteReorderSetting(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('reorder_settings')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[reorder] deleteReorderSetting error:', error)
    throw new Error('Failed to delete reorder setting')
  }

  revalidatePath('/inventory/reorder')
}
