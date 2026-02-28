'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
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
  const supabase: any = createServerClient()
  const data = AddVendorItemSchema.parse(input)

  const { data: item, error } = await supabase
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

  revalidatePath('/vendors')
  return item
}

export async function updateVendorItem(id: string, input: UpdateVendorItemInput) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const data = UpdateVendorItemSchema.parse(input)

  const updateData: Record<string, unknown> = {}
  if (data.ingredient_id !== undefined) updateData.ingredient_id = data.ingredient_id || null
  if (data.vendor_sku !== undefined) updateData.vendor_sku = data.vendor_sku || null
  if (data.vendor_item_name !== undefined) updateData.vendor_item_name = data.vendor_item_name
  if (data.unit_price_cents !== undefined) updateData.unit_price_cents = data.unit_price_cents
  if (data.unit_size !== undefined) updateData.unit_size = data.unit_size || null
  if (data.unit_measure !== undefined) updateData.unit_measure = data.unit_measure || null
  if (data.notes !== undefined) updateData.notes = data.notes || null
  updateData.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from('vendor_items')
    .update(updateData)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[vendor-items] updateVendorItem error:', error)
    throw new Error('Failed to update vendor item')
  }

  revalidatePath('/vendors')
}

export async function deleteVendorItem(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
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
  const supabase: any = createServerClient()

  const { data, error } = await supabase
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
  const supabase: any = createServerClient()

  const { data, error } = await supabase
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
  const supabase: any = createServerClient()

  // Get all vendor items that have an ingredient_id
  const { data, error } = await supabase
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
