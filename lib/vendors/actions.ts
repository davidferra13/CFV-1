'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChefTenantScope } from '@/lib/db/tenant-scope'
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

export type VendorListInput = {
  limit?: number
  offset?: number
  search?: string
}

const UpdateVendorSchema = CreateVendorSchema.partial()
export type UpdateVendorInput = z.infer<typeof UpdateVendorSchema>

// ============================================
// VENDOR CRUD
// ============================================

export async function createVendor(input: VendorInput | CreateVendorInput) {
  const vendorScope = await requireChefTenantScope('chef_id')
  const db: any = createServerClient()

  const { data: vendor, error } = await vendorScope
    .insert(db.from('vendors'), {
      name: input.name,
      phone: input.phone || null,
      email: input.email || null,
      notes: input.notes || null,
      vendor_type: ('vendor_type' in input ? input.vendor_type : undefined) || 'grocery',
      address: ('address' in input ? input.address : undefined) || null,
      website: ('website' in input ? input.website : undefined) || null,
      is_preferred: ('is_preferred' in input ? input.is_preferred : false) || false,
      status: 'active',
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
  const vendorScope = await requireChefTenantScope('chef_id')
  const db: any = createServerClient()
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

  const { error } = (await vendorScope.updateById(db.from('vendors'), id, updateData)) as {
    error: unknown
  }

  if (error) {
    console.error('[vendors] updateVendor error:', error)
    throw new Error('Failed to update vendor')
  }

  revalidatePath('/vendors')
  revalidatePath(`/vendors/${id}`)
}

export async function deactivateVendor(id: string) {
  const vendorScope = await requireChefTenantScope('chef_id')
  const db: any = createServerClient()

  const { error } = (await vendorScope.updateById(db.from('vendors'), id, {
    status: 'inactive',
  })) as { error: unknown }

  if (error) {
    console.error('[vendors] deactivateVendor error:', error)
    throw new Error('Failed to deactivate vendor')
  }

  revalidatePath('/vendors')
}

export async function listVendors(activeOnly = true) {
  const vendorScope = await requireChefTenantScope('chef_id')
  const db: any = createServerClient()

  let q = vendorScope.apply(db.from('vendors').select('*')).order('name', { ascending: true })

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

export async function listVendorsPage(activeOnly = true, input: VendorListInput = {}) {
  const vendorScope = await requireChefTenantScope('chef_id')
  const db: any = createServerClient()
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100)
  const offset = Math.max(input.offset ?? 0, 0)
  const search = input.search?.trim()

  let q = vendorScope
    .apply(db.from('vendors').select('*', { count: 'exact' }))
    .order('is_preferred', { ascending: false })
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1)

  if (activeOnly) {
    q = q.eq('status', 'active')
  }

  if (search) {
    q = q.filter('search_vector', 'wfts(english)', search)
  }

  const { data, error, count } = await q

  if (error) {
    console.error('[vendors] listVendorsPage error:', error)
    throw new Error('Failed to list vendors')
  }

  return { items: data ?? [], total: count ?? 0 }
}

export async function getVendor(id: string) {
  const vendorScope = await requireChefTenantScope('chef_id')
  const db: any = createServerClient()

  const { data: vendor, error } = await vendorScope
    .byId(db.from('vendors').select('*'), id)
    .single()

  if (error) {
    console.error('[vendors] getVendor error:', error)
    throw new Error('Vendor not found')
  }

  // Also fetch vendor items
  const { data: items } = await vendorScope
    .apply(db.from('vendor_items').select('*').eq('vendor_id', id))
    .order('vendor_item_name', { ascending: true })

  return { ...vendor, items: items ?? [] }
}

export async function deleteVendor(id: string) {
  const vendorScope = await requireChefTenantScope('chef_id')
  const db: any = createServerClient()

  const { error } = (await vendorScope.deleteById(db.from('vendors'), id)) as { error: unknown }

  if (error) {
    console.error('[vendors] deleteVendor error:', error)
    throw new Error('Failed to delete vendor')
  }

  revalidatePath('/culinary/vendors')
}

export async function setVendorPreferred(id: string, preferred: boolean) {
  const vendorScope = await requireChefTenantScope('chef_id')
  const db: any = createServerClient()

  const { error } = (await vendorScope.updateById(db.from('vendors'), id, {
    is_preferred: preferred,
  })) as { error: unknown }

  if (error) {
    console.error('[vendors] setVendorPreferred error:', error)
    throw new Error('Failed to update vendor preference')
  }

  revalidatePath('/culinary/vendors')
}
