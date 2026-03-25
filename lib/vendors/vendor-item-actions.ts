'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { recordVendorPricePoint } from '@/lib/vendors/price-point-actions'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const AddVendorItemSchema = z.object({
  vendor_id: z.string().uuid(),
  ingredient_id: z.string().uuid().optional(),
  vendor_sku: z.string().optional(),
  vendor_item_name: z.string().min(1, 'Item name is required'),
  unit_price_cents: z.number().int().min(0),
  unit_size: z.number().nullable().optional(),
  unit_measure: z.string().optional(),
  notes: z.string().optional(),
})

export type AddVendorItemInput = z.infer<typeof AddVendorItemSchema>

const UpdateVendorItemSchema = AddVendorItemSchema.partial().omit({ vendor_id: true })
export type UpdateVendorItemInput = z.infer<typeof UpdateVendorItemSchema>

// ============================================
// VENDOR ITEM CRUD
// ============================================

export async function addVendorItem(input: AddVendorItemInput) {
  const user = await requireChef()
  const db: any = createServerClient()
  const data = AddVendorItemSchema.parse(input)

  const { data: item, error } = await db
    .from('vendor_items')
    .insert({
      vendor_id: data.vendor_id,
      ingredient_id: data.ingredient_id || null,
      vendor_sku: data.vendor_sku || null,
      vendor_item_name: data.vendor_item_name,
      unit_price_cents: data.unit_price_cents,
      unit_size: data.unit_size ?? null,
      unit_measure: data.unit_measure || null,
      notes: data.notes || null,
      chef_id: user.tenantId!,
    })
    .select()
    .single()

  if (error) {
    console.error('[vendor-items] addVendorItem error:', error)
    throw new Error('Failed to add vendor item')
  }

  await recordVendorPricePoint({
    db,
    tenantId: user.tenantId!,
    vendorId: data.vendor_id,
    ingredientId: data.ingredient_id ?? null,
    itemName: data.vendor_item_name,
    unitMeasure: data.unit_measure ?? null,
    unitSize: data.unit_size ?? null,
    priceCents: data.unit_price_cents,
    notes: data.notes ?? null,
  })

  revalidatePath('/vendors')
  return item
}

export async function updateVendorItem(id: string, input: UpdateVendorItemInput) {
  const user = await requireChef()
  const db: any = createServerClient()
  const data = UpdateVendorItemSchema.parse(input)

  const { data: existingItem, error: existingError } = await db
    .from('vendor_items')
    .select(
      'id, vendor_id, ingredient_id, vendor_item_name, unit_price_cents, unit_size, unit_measure, notes'
    )
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (existingError || !existingItem) {
    console.error('[vendor-items] updateVendorItem existing lookup error:', existingError)
    throw new Error('Vendor item not found')
  }

  const updateData: Record<string, unknown> = {}
  if (data.ingredient_id !== undefined) updateData.ingredient_id = data.ingredient_id || null
  if (data.vendor_sku !== undefined) updateData.vendor_sku = data.vendor_sku || null
  if (data.vendor_item_name !== undefined) updateData.vendor_item_name = data.vendor_item_name
  if (data.unit_price_cents !== undefined) updateData.unit_price_cents = data.unit_price_cents
  if (data.unit_size !== undefined) updateData.unit_size = data.unit_size || null
  if (data.unit_measure !== undefined) updateData.unit_measure = data.unit_measure || null
  if (data.notes !== undefined) updateData.notes = data.notes || null
  updateData.updated_at = new Date().toISOString()

  const { error } = await db
    .from('vendor_items')
    .update(updateData)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[vendor-items] updateVendorItem error:', error)
    throw new Error('Failed to update vendor item')
  }

  const merged = {
    ingredient_id:
      data.ingredient_id !== undefined ? data.ingredient_id || null : existingItem.ingredient_id,
    vendor_item_name:
      data.vendor_item_name !== undefined ? data.vendor_item_name : existingItem.vendor_item_name,
    unit_price_cents:
      data.unit_price_cents !== undefined ? data.unit_price_cents : existingItem.unit_price_cents,
    unit_size: data.unit_size !== undefined ? data.unit_size || null : existingItem.unit_size,
    unit_measure:
      data.unit_measure !== undefined ? data.unit_measure || null : existingItem.unit_measure,
    notes: data.notes !== undefined ? data.notes || null : existingItem.notes,
  }

  const shouldRecordPricePoint =
    merged.vendor_item_name !== existingItem.vendor_item_name ||
    merged.unit_measure !== existingItem.unit_measure ||
    merged.unit_size !== existingItem.unit_size ||
    merged.unit_price_cents !== existingItem.unit_price_cents ||
    merged.ingredient_id !== existingItem.ingredient_id

  if (shouldRecordPricePoint) {
    await recordVendorPricePoint({
      db,
      tenantId: user.tenantId!,
      vendorId: existingItem.vendor_id,
      ingredientId: merged.ingredient_id,
      itemName: merged.vendor_item_name,
      unitMeasure: merged.unit_measure,
      unitSize: merged.unit_size,
      priceCents: merged.unit_price_cents,
      notes: merged.notes,
    })
  }

  revalidatePath('/vendors')
}

export async function deleteVendorItem(id: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('vendor_items')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[vendor-items] deleteVendorItem error:', error)
    throw new Error('Failed to delete vendor item')
  }

  revalidatePath('/vendors')
}

export async function listVendorItems(vendorId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('vendor_items')
    .select('*')
    .eq('vendor_id', vendorId)
    .eq('chef_id', user.tenantId!)
    .order('vendor_item_name', { ascending: true })

  if (error) {
    console.error('[vendor-items] listVendorItems error:', error)
    throw new Error('Failed to list vendor items')
  }

  return data ?? []
}

export async function getPriceComparison(ingredientId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('vendor_items')
    .select('*, vendors(name, status)')
    .eq('chef_id', user.tenantId!)
    .eq('ingredient_id', ingredientId)
    .order('unit_price_cents', { ascending: true })

  if (error) {
    console.error('[vendor-items] getPriceComparison error:', error)
    throw new Error('Failed to get price comparison')
  }

  return data ?? []
}

export async function getPriceComparisonAll() {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all vendor items that have an ingredient_id
  const { data, error } = await db
    .from('vendor_items')
    .select('*, vendors(name, status)')
    .eq('chef_id', user.tenantId!)
    .not('ingredient_id', 'is', null)
    .order('unit_price_cents', { ascending: true })

  if (error) {
    console.error('[vendor-items] getPriceComparisonAll error:', error)
    throw new Error('Failed to get price comparisons')
  }

  // Group by ingredient_id and find cheapest per ingredient
  const byIngredient = new Map<string, typeof data>()
  for (const item of data ?? []) {
    const key = item.ingredient_id!
    if (!byIngredient.has(key)) {
      byIngredient.set(key, [])
    }
    byIngredient.get(key)!.push(item)
  }

  // Return as array of { ingredientId, items[] } sorted by ingredient
  const result: { ingredientId: string; items: typeof data }[] = []
  for (const [ingredientId, items] of byIngredient) {
    result.push({ ingredientId, items })
  }

  return result
}
