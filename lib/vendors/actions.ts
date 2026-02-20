'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// VENDORS
// ============================================

const VENDOR_TYPES = [
  'grocery', 'specialty', 'butcher', 'fishmonger', 'farm',
  'liquor', 'equipment', 'bakery', 'produce', 'dairy', 'other',
] as const

const VendorSchema = z.object({
  name:         z.string().min(1, 'Name is required'),
  vendor_type:  z.enum(VENDOR_TYPES).default('grocery'),
  phone:        z.string().optional(),
  email:        z.string().email().optional().or(z.literal('')),
  address:      z.string().optional(),
  website:      z.string().url().optional().or(z.literal('')),
  notes:        z.string().optional(),
  is_preferred: z.boolean().default(false),
  status:       z.enum(['active', 'inactive']).default('active'),
})

export type VendorInput = z.infer<typeof VendorSchema>


export async function createVendor(input: VendorInput) {
  const chef = await requireChef()
  const supabase = createServerClient()
  const data = VendorSchema.parse(input)

  const { error } = await (supabase as any)
    .from('vendors')
    .insert({
      ...data,
      chef_id: chef.id,
      email:   data.email   || null,
      website: data.website || null,
    })

  if (error) throw new Error(error.message)
  revalidatePath('/culinary/vendors')
}

export async function updateVendor(id: string, input: VendorInput) {
  const chef = await requireChef()
  const supabase = createServerClient()
  const data = VendorSchema.parse(input)

  const { error } = await (supabase as any)
    .from('vendors')
    .update({
      ...data,
      email:   data.email   || null,
      website: data.website || null,
    })
    .eq('id', id)
    .eq('chef_id', chef.id)

  if (error) throw new Error(error.message)
  revalidatePath('/culinary/vendors')
}

export async function deleteVendor(id: string) {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { error } = await (supabase as any)
    .from('vendors')
    .delete()
    .eq('id', id)
    .eq('chef_id', chef.id)

  if (error) throw new Error(error.message)
  revalidatePath('/culinary/vendors')
}

export async function listVendors(vendorType?: string) {
  const chef = await requireChef()
  const supabase = createServerClient()

  let q = (supabase as any)
    .from('vendors')
    .select('*')
    .eq('chef_id', chef.id)
    .eq('status', 'active')
    .order('is_preferred', { ascending: false })
    .order('name', { ascending: true })

  if (vendorType) {
    q = q.eq('vendor_type', vendorType)
  }

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function setVendorPreferred(id: string, isPreferred: boolean) {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { error } = await (supabase as any)
    .from('vendors')
    .update({ is_preferred: isPreferred })
    .eq('id', id)
    .eq('chef_id', chef.id)

  if (error) throw new Error(error.message)
  revalidatePath('/culinary/vendors')
}

// ============================================
// PRICE POINTS
// ============================================

const PricePointSchema = z.object({
  vendor_id:     z.string().uuid(),
  ingredient_id: z.string().uuid().optional(),
  item_name:     z.string().min(1, 'Item name is required'),
  price_cents:   z.number().int().min(0),
  unit:          z.string().min(1, 'Unit is required'),
  recorded_at:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes:         z.string().optional(),
})

export type PricePointInput = z.infer<typeof PricePointSchema>

export async function recordPricePoint(input: PricePointInput) {
  const chef = await requireChef()
  const supabase = createServerClient()
  const data = PricePointSchema.parse(input)

  const { error } = await (supabase as any)
    .from('vendor_price_points')
    .insert({
      ...data,
      chef_id: chef.id,
      ingredient_id: data.ingredient_id ?? null,
      recorded_at:   data.recorded_at ?? new Date().toISOString().slice(0, 10),
    })

  if (error) throw new Error(error.message)
  revalidatePath('/culinary/vendors')
}

export async function deletePricePoint(id: string) {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { error } = await (supabase as any)
    .from('vendor_price_points')
    .delete()
    .eq('id', id)
    .eq('chef_id', chef.id)

  if (error) throw new Error(error.message)
}

export async function getPriceHistory(vendorId?: string, ingredientId?: string) {
  const chef = await requireChef()
  const supabase = createServerClient()

  let q = (supabase as any)
    .from('vendor_price_points')
    .select('*, vendors(name)')
    .eq('chef_id', chef.id)
    .order('recorded_at', { ascending: false })
    .limit(100)

  if (vendorId)     q = q.eq('vendor_id', vendorId)
  if (ingredientId) q = q.eq('ingredient_id', ingredientId)

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getPricePointsForVendor(vendorId: string) {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('vendor_price_points')
    .select('*')
    .eq('chef_id', chef.id)
    .eq('vendor_id', vendorId)
    .order('recorded_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}
