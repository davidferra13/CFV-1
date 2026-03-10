'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

const CreateVendorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  account_number: z.string().optional(),
  delivery_days: z.array(z.enum(DAYS_OF_WEEK)).default([]),
  payment_terms: z.string().optional(),
  notes: z.string().optional(),
})

export type CreateVendorInput = z.infer<typeof CreateVendorSchema>

export type VendorInput = {
  name: string
  vendor_type?: string
  phone?: string
  email?: string
  address?: string
  website?: string
  notes?: string
  is_preferred?: boolean
}

const UpdateVendorSchema = CreateVendorSchema.partial()
export type UpdateVendorInput = z.infer<typeof UpdateVendorSchema>

// ============================================
// VENDOR CRUD
// ============================================

export async function createVendor(input: VendorInput | CreateVendorInput) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: vendor, error } = await supabase
    .from('vendors')
    .insert({
      name: input.name,
      phone: input.phone || null,
      email: input.email || null,
      notes: input.notes || null,
      vendor_type: ('vendor_type' in input ? input.vendor_type : undefined) || 'grocery',
      address: ('address' in input ? input.address : undefined) || null,
      website: ('website' in input ? input.website : undefined) || null,
      is_preferred: ('is_preferred' in input ? input.is_preferred : false) || false,
      status: 'active',
      chef_id: user.tenantId!,
    })
    .select()
    .single()

  if (error) {
    console.error('[vendors] createVendor error:', error)
    throw new Error('Failed to create vendor')
  }

  revalidatePath('/vendors')
  return vendor
}

export async function updateVendor(id: string, input: UpdateVendorInput) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const data = UpdateVendorSchema.parse(input)

  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.contact_name !== undefined) updateData.contact_name = data.contact_name || null
  if (data.phone !== undefined) updateData.phone = data.phone || null
  if (data.email !== undefined) updateData.email = data.email || null
  if (data.account_number !== undefined) updateData.account_number = data.account_number || null
  if (data.delivery_days !== undefined) updateData.delivery_days = data.delivery_days
  if (data.payment_terms !== undefined) updateData.payment_terms = data.payment_terms || null
  if (data.notes !== undefined) updateData.notes = data.notes || null

  const { error } = await supabase
    .from('vendors')
    .update(updateData)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[vendors] updateVendor error:', error)
    throw new Error('Failed to update vendor')
  }

  revalidatePath('/vendors')
  revalidatePath(`/vendors/${id}`)
}

export async function deactivateVendor(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('vendors')
    .update({ status: 'inactive' })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[vendors] deactivateVendor error:', error)
    throw new Error('Failed to deactivate vendor')
  }

  revalidatePath('/vendors')
}

export async function listVendors(activeOnly = true) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let q = supabase
    .from('vendors')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('name', { ascending: true })

  if (activeOnly) {
    q = q.eq('status', 'active')
  }

  const { data, error } = await q

  if (error) {
    console.error('[vendors] listVendors error:', error)
    throw new Error('Failed to list vendors')
  }

  return data ?? []
}

export async function getVendor(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: vendor, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (error) {
    console.error('[vendors] getVendor error:', error)
    throw new Error('Vendor not found')
  }

  // Also fetch vendor items
  const { data: items } = await supabase
    .from('vendor_items')
    .select('*')
    .eq('vendor_id', id)
    .eq('chef_id', user.tenantId!)
    .order('vendor_item_name', { ascending: true })

  return { ...vendor, items: items ?? [] }
}

export async function deleteVendor(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('vendors')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[vendors] deleteVendor error:', error)
    throw new Error('Failed to delete vendor')
  }

  revalidatePath('/culinary/vendors')
}

export async function setVendorPreferred(id: string, preferred: boolean) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('vendors')
    .update({ is_preferred: preferred })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[vendors] setVendorPreferred error:', error)
    throw new Error('Failed to update vendor preference')
  }

  revalidatePath('/culinary/vendors')
}

// ============================================
// RELIABILITY SCORE
// ============================================

/**
 * Update vendor reliability score from delivery history.
 * Deterministic: score = (onTimeDeliveries / totalDeliveries) * 100
 */
export async function updateReliabilityScore(
  vendorId: string,
  onTimeDeliveries: number,
  totalDeliveries: number
) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  if (totalDeliveries <= 0) {
    throw new Error('Total deliveries must be greater than zero')
  }
  if (onTimeDeliveries < 0 || onTimeDeliveries > totalDeliveries) {
    throw new Error('On-time deliveries must be between 0 and total deliveries')
  }

  const score = Math.round((onTimeDeliveries / totalDeliveries) * 10000) / 100

  const { error } = await supabase
    .from('vendors')
    .update({ reliability_score: score })
    .eq('id', vendorId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[vendors] updateReliabilityScore error:', error)
    throw new Error('Failed to update reliability score')
  }

  revalidatePath('/vendors')
  revalidatePath(`/vendors/${vendorId}`)
  return { score }
}

// ============================================
// PER-INGREDIENT PREFERRED VENDOR
// ============================================

/**
 * Get the preferred vendor for a specific ingredient (by name).
 */
export async function getPreferredVendor(ingredientName: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const normalized = ingredientName.trim().toLowerCase()

  const { data, error } = await supabase
    .from('vendor_preferred_ingredients')
    .select('*, vendors(id, name, status, reliability_score)')
    .eq('chef_id', user.tenantId!)
    .eq('ingredient_name', normalized)
    .maybeSingle()

  if (error) {
    console.error('[vendors] getPreferredVendor error:', error)
    throw new Error('Failed to get preferred vendor')
  }

  return data
}

/**
 * Set the preferred vendor for a specific ingredient (by name).
 * Uses upsert on (chef_id, ingredient_name).
 */
export async function setPreferredVendor(ingredientName: string, vendorId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const normalized = ingredientName.trim().toLowerCase()

  const { error } = await supabase.from('vendor_preferred_ingredients').upsert(
    {
      chef_id: user.tenantId!,
      ingredient_name: normalized,
      vendor_id: vendorId,
    },
    { onConflict: 'chef_id,ingredient_name' }
  )

  if (error) {
    console.error('[vendors] setPreferredVendor error:', error)
    throw new Error('Failed to set preferred vendor')
  }

  revalidatePath('/vendors')
  revalidatePath('/inventory/reorder')
}

/**
 * Get all preferred vendor mappings for the current chef.
 */
export async function getAllPreferredVendors() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('vendor_preferred_ingredients')
    .select('*, vendors(id, name, status)')
    .eq('chef_id', user.tenantId!)
    .order('ingredient_name', { ascending: true })

  if (error) {
    console.error('[vendors] getAllPreferredVendors error:', error)
    throw new Error('Failed to get preferred vendors')
  }

  return data ?? []
}

// ============================================
// PRICE COMPARISON BY NAME
// ============================================

/**
 * Compare prices for a given ingredient name across all vendors.
 * Uses vendor_price_points (latest per vendor).
 */
export async function compareVendorPrices(ingredientName: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const normalized = ingredientName.trim().toLowerCase()

  const { data, error } = await supabase
    .from('vendor_price_points')
    .select('*, vendors(id, name, status)')
    .eq('chef_id', user.tenantId!)
    .ilike('item_name', normalized)
    .order('recorded_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error('[vendors] compareVendorPrices error:', error)
    throw new Error('Failed to compare vendor prices')
  }

  // Deduplicate: keep only the latest price per vendor
  const latestByVendor = new Map<string, any>()
  for (const row of data ?? []) {
    if (!latestByVendor.has(row.vendor_id)) {
      latestByVendor.set(row.vendor_id, row)
    }
  }

  return Array.from(latestByVendor.values()).sort(
    (a: any, b: any) => (a.price_cents ?? 0) - (b.price_cents ?? 0)
  )
}

/**
 * Get the cheapest vendor for a specific ingredient (by name).
 * Returns the vendor with the lowest latest price.
 */
export async function getCheapestVendor(ingredientName: string) {
  const results = await compareVendorPrices(ingredientName)
  return results.length > 0 ? results[0] : null
}

/**
 * Get all current prices from one vendor (latest per ingredient).
 */
export async function getVendorPriceList(vendorId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('vendor_price_points')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('vendor_id', vendorId)
    .order('recorded_at', { ascending: false })
    .limit(2000)

  if (error) {
    console.error('[vendors] getVendorPriceList error:', error)
    throw new Error('Failed to get vendor price list')
  }

  // Deduplicate: latest price per item_name + unit combination
  const latestByItem = new Map<string, any>()
  for (const row of data ?? []) {
    const key = `${(row.item_name || '').toLowerCase()}|${(row.unit || '').toLowerCase()}`
    if (!latestByItem.has(key)) {
      latestByItem.set(key, row)
    }
  }

  return Array.from(latestByItem.values()).sort((a: any, b: any) =>
    (a.item_name || '').localeCompare(b.item_name || '')
  )
}

/**
 * Get price history for a given ingredient across all vendors over time.
 */
export async function getPriceHistory(ingredientName: string, days = 180) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const normalized = ingredientName.trim().toLowerCase()
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('vendor_price_points')
    .select('*, vendors(id, name)')
    .eq('chef_id', user.tenantId!)
    .ilike('item_name', normalized)
    .gte('recorded_at', sinceDate)
    .order('recorded_at', { ascending: true })

  if (error) {
    console.error('[vendors] getPriceHistory error:', error)
    throw new Error('Failed to get price history')
  }

  return data ?? []
}
