'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export type EquipmentCategory = 'cooking' | 'prep' | 'transport' | 'service' | 'storage' | 'other'
export type EquipmentCondition = 'excellent' | 'good' | 'fair' | 'needs_service' | 'retired'

export type Equipment = {
  id: string
  tenant_id: string
  item_name: string
  category: EquipmentCategory
  brand: string | null
  model: string | null
  serial_number: string | null
  purchase_date: string | null
  purchase_price_cents: number | null
  purchase_source: string | null
  condition: EquipmentCondition | null
  warranty_expiry: string | null
  service_contact_name: string | null
  service_contact_phone: string | null
  service_contact_url: string | null
  notes: string | null
  retired_date: string | null
  created_at: string
  updated_at: string
}

export type CreateEquipmentInput = {
  item_name: string
  category: EquipmentCategory
  brand?: string | null
  model?: string | null
  serial_number?: string | null
  purchase_date?: string | null
  purchase_price_cents?: number | null
  purchase_source?: string | null
  condition?: EquipmentCondition | null
  warranty_expiry?: string | null
  service_contact_name?: string | null
  service_contact_phone?: string | null
  service_contact_url?: string | null
  notes?: string | null
}

export type UpdateEquipmentInput = Partial<CreateEquipmentInput>

export type EquipmentValueSummary = {
  totalValueCents: number
  itemCount: number
  warrantyExpiringCount: number
}

// ============================================
// ACTIONS
// ============================================

export async function getEquipmentInventory(includeRetired = false): Promise<Equipment[]> {
  const user = await requireChef()
  const db = createServerClient()

  let query = db.from('chef_equipment').select('*').eq('tenant_id', user.tenantId!)

  if (!includeRetired) {
    query = query.is('retired_date', null)
  }

  const { data, error } = await query.order('category', { ascending: true })

  if (error) throw new Error(`Failed to load equipment: ${error.message}`)
  return (data ?? []) as Equipment[]
}

export async function createEquipment(
  input: CreateEquipmentInput
): Promise<{ success: true; item: Equipment }> {
  const user = await requireChef()
  const db = createServerClient()

  if (!input.item_name?.trim()) {
    throw new Error('Item name is required')
  }

  const { data, error } = await db
    .from('chef_equipment')
    .insert({
      tenant_id: user.tenantId!,
      item_name: input.item_name.trim(),
      category: input.category,
      brand: input.brand?.trim() || null,
      model: input.model?.trim() || null,
      serial_number: input.serial_number?.trim() || null,
      purchase_date: input.purchase_date || null,
      purchase_price_cents: input.purchase_price_cents ?? null,
      purchase_source: input.purchase_source?.trim() || null,
      condition: input.condition || null,
      warranty_expiry: input.warranty_expiry || null,
      service_contact_name: input.service_contact_name?.trim() || null,
      service_contact_phone: input.service_contact_phone?.trim() || null,
      service_contact_url: input.service_contact_url?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create equipment: ${error.message}`)

  revalidatePath('/business/ops')
  return { success: true, item: data as Equipment }
}

export async function updateEquipment(
  id: string,
  input: UpdateEquipmentInput
): Promise<{ success: true }> {
  const user = await requireChef()
  const db = createServerClient()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.item_name !== undefined) updates.item_name = input.item_name.trim()
  if (input.category !== undefined) updates.category = input.category
  if (input.brand !== undefined) updates.brand = input.brand?.trim() || null
  if (input.model !== undefined) updates.model = input.model?.trim() || null
  if (input.serial_number !== undefined) updates.serial_number = input.serial_number?.trim() || null
  if (input.purchase_date !== undefined) updates.purchase_date = input.purchase_date || null
  if (input.purchase_price_cents !== undefined)
    updates.purchase_price_cents = input.purchase_price_cents
  if (input.purchase_source !== undefined)
    updates.purchase_source = input.purchase_source?.trim() || null
  if (input.condition !== undefined) updates.condition = input.condition
  if (input.warranty_expiry !== undefined) updates.warranty_expiry = input.warranty_expiry || null
  if (input.service_contact_name !== undefined)
    updates.service_contact_name = input.service_contact_name?.trim() || null
  if (input.service_contact_phone !== undefined)
    updates.service_contact_phone = input.service_contact_phone?.trim() || null
  if (input.service_contact_url !== undefined)
    updates.service_contact_url = input.service_contact_url?.trim() || null
  if (input.notes !== undefined) updates.notes = input.notes?.trim() || null

  const { error } = await db
    .from('chef_equipment')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to update equipment: ${error.message}`)

  revalidatePath('/business/ops')
  return { success: true }
}

export async function retireEquipment(id: string): Promise<{ success: true }> {
  const user = await requireChef()
  const db = createServerClient()

  const { error } = await db
    .from('chef_equipment')
    .update({
      retired_date: new Date().toISOString().slice(0, 10),
      condition: 'retired',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to retire equipment: ${error.message}`)

  revalidatePath('/business/ops')
  return { success: true }
}

export async function getEquipmentValueSummary(): Promise<EquipmentValueSummary> {
  const user = await requireChef()
  const db = createServerClient()

  const { data, error } = await db
    .from('chef_equipment')
    .select('purchase_price_cents, warranty_expiry')
    .eq('tenant_id', user.tenantId!)
    .is('retired_date', null)

  if (error) throw new Error(`Failed to load equipment summary: ${error.message}`)

  const items = data ?? []
  const now = new Date()
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  let totalValueCents = 0
  let warrantyExpiringCount = 0

  for (const item of items) {
    if (item.purchase_price_cents) {
      totalValueCents += item.purchase_price_cents
    }
    if (item.warranty_expiry) {
      const expiry = new Date(item.warranty_expiry)
      if (expiry <= thirtyDays && expiry >= now) {
        warrantyExpiringCount++
      }
    }
  }

  return {
    totalValueCents,
    itemCount: items.length,
    warrantyExpiringCount,
  }
}
