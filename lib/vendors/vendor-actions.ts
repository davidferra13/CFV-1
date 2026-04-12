'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const VendorCategory = z.enum([
  'grocery',
  'specialty',
  'farmers_market',
  'wholesale',
  'equipment',
  'rental',
  'other',
])

export type VendorCategory = z.infer<typeof VendorCategory>

const VendorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: VendorCategory,
  contact_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  website: z.string().url().optional().or(z.literal('')).nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_preferred: z.boolean().optional().default(false),
  rating: z.number().int().min(1).max(5).optional().nullable(),
})

export type VendorInput = z.infer<typeof VendorSchema>

const PriceEntrySchema = z.object({
  item_name: z.string().min(1, 'Item name is required'),
  price_cents: z.number().int().min(0),
  unit: z.string().min(1, 'Unit is required'),
  recorded_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  notes: z.string().optional().nullable(),
})

export type PriceEntryInput = z.infer<typeof PriceEntrySchema>

// ============================================
// VENDOR CRUD
// ============================================

export async function getVendors(filters?: { category?: VendorCategory; isPreferred?: boolean }) {
  const user = await requireChef()
  const db = await createServerClient()
  const tenantId = user.tenantId!

  let query = db.from('vendors').select('*').eq('chef_id', tenantId).order('name')

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }
  if (filters?.isPreferred !== undefined) {
    query = query.eq('is_preferred', filters.isPreferred)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch vendors: ${error.message}`)
  return data
}

export async function createVendor(input: VendorInput) {
  const user = await requireChef()
  const db = await createServerClient()
  const tenantId = user.tenantId!
  const data = VendorSchema.parse(input)

  const { data: vendor, error } = await db
    .from('vendors')
    .insert({ ...data, chef_id: tenantId })
    .select()
    .single()

  if (error) throw new Error(`Failed to create vendor: ${error.message}`)
  revalidatePath('/vendors')
  return vendor
}

export async function updateVendor(id: string, input: VendorInput) {
  const user = await requireChef()
  const db = await createServerClient()
  const tenantId = user.tenantId!
  const data = VendorSchema.parse(input)

  const { data: vendor, error } = await db
    .from('vendors')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('chef_id', tenantId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update vendor: ${error.message}`)
  revalidatePath('/vendors')
  return vendor
}

export async function deleteVendor(id: string) {
  const user = await requireChef()
  const db = await createServerClient()
  const tenantId = user.tenantId!

  const { error } = await db.from('vendors').delete().eq('id', id).eq('chef_id', tenantId)

  if (error) throw new Error(`Failed to delete vendor: ${error.message}`)
  revalidatePath('/vendors')
  return { success: true }
}

export async function togglePreferred(id: string) {
  const user = await requireChef()
  const db = await createServerClient()
  const tenantId = user.tenantId!

  // Fetch current state
  const { data: vendor, error: fetchError }: any = await db
    .from('vendors')
    .select('is_preferred')
    .eq('id', id)
    .eq('chef_id', tenantId)
    .single()

  if (fetchError || !vendor) throw new Error('Vendor not found')

  const { error } = await db
    .from('vendors')
    .update({
      is_preferred: !vendor.is_preferred,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('chef_id', tenantId)

  if (error) throw new Error(`Failed to toggle preferred: ${error.message}`)
  revalidatePath('/vendors')
  return { success: true, is_preferred: !vendor.is_preferred }
}

// ============================================
// PRICE TRACKING
// ============================================

export async function addPriceEntry(vendorId: string, input: PriceEntryInput) {
  const user = await requireChef()
  const db = await createServerClient()
  const tenantId = user.tenantId!
  const data = PriceEntrySchema.parse(input)

  // Verify vendor belongs to this chef
  const { data: vendor, error: vendorError } = await db
    .from('vendors')
    .select('id')
    .eq('id', vendorId)
    .eq('chef_id', tenantId)
    .single()

  if (vendorError || !vendor) throw new Error('Vendor not found')

  const { data: entry, error } = await db
    .from('vendor_price_entries')
    .insert({
      chef_id: tenantId,
      vendor_id: vendorId,
      item_name: data.item_name,
      price_cents: data.price_cents,
      unit: data.unit,
      recorded_at:
        data.recorded_at ||
        ((_vr) =>
          `${_vr.getFullYear()}-${String(_vr.getMonth() + 1).padStart(2, '0')}-${String(_vr.getDate()).padStart(2, '0')}`)(
          new Date()
        ),
      notes: data.notes,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to add price entry: ${error.message}`)
  revalidatePath('/vendors')
  return entry
}

export async function getPriceHistory(vendorId: string, itemName?: string) {
  const user = await requireChef()
  const db = await createServerClient()
  const tenantId = user.tenantId!

  let query = db
    .from('vendor_price_entries')
    .select('*')
    .eq('chef_id', tenantId)
    .eq('vendor_id', vendorId)
    .order('recorded_at', { ascending: false })

  if (itemName) {
    query = query.eq('item_name', itemName)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch price history: ${error.message}`)
  return data
}

export async function comparePrices(itemName: string) {
  const user = await requireChef()
  const db = await createServerClient()
  const tenantId = user.tenantId!

  // Get the latest price entry for each vendor for this item
  // Using a subquery approach: get all entries, then deduplicate in JS
  const { data: entries, error }: any = await db
    .from('vendor_price_entries')
    .select('*, vendors!inner(id, name, is_preferred, category)')
    .eq('chef_id', tenantId)
    .ilike('item_name', itemName)
    .order('recorded_at', { ascending: false })

  if (error) throw new Error(`Failed to compare prices: ${error.message}`)

  // Keep only the latest entry per vendor
  const latestByVendor = new Map<string, (typeof entries)[number]>()
  for (const entry of entries || []) {
    if (!latestByVendor.has(entry.vendor_id)) {
      latestByVendor.set(entry.vendor_id, entry)
    }
  }

  // Sort by price (cheapest first)
  return Array.from(latestByVendor.values()).sort((a, b) => a.price_cents - b.price_cents)
}

// ============================================
// STATS
// ============================================

export async function getVendorStats() {
  const user = await requireChef()
  const db = await createServerClient()
  const tenantId = user.tenantId!

  const [vendorsResult, preferredResult, pricesResult] = await Promise.all([
    db.from('vendors').select('id', { count: 'exact', head: true }).eq('chef_id', tenantId),
    db
      .from('vendors')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', tenantId)
      .eq('is_preferred', true),
    db
      .from('vendor_price_entries')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', tenantId),
  ])

  return {
    totalVendors: vendorsResult.count ?? 0,
    preferredCount: preferredResult.count ?? 0,
    totalPriceEntries: pricesResult.count ?? 0,
  }
}
