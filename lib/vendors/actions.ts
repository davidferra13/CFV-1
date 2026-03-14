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
