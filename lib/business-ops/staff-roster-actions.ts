'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export type StaffRole =
  | 'sous_chef'
  | 'line_cook'
  | 'server'
  | 'bartender'
  | 'dishwasher'
  | 'assistant'
  | 'driver'
  | 'other'

export type TrustedStaffContact = {
  id: string
  tenant_id: string
  name: string
  role: StaffRole
  phone: string | null
  email: string | null
  hourly_rate_cents: number | null
  day_rate_cents: number | null
  availability_notes: string | null
  reliability_rating: number | null
  last_worked_date: string | null
  last_worked_event: string | null
  has_food_handler_cert: boolean
  has_servsafe: boolean
  dietary_restrictions: string | null
  notes: string | null
  promoted_to_staff_id: string | null
  created_at: string
  updated_at: string
}

export type CreateTrustedStaffInput = {
  name: string
  role: StaffRole
  phone?: string | null
  email?: string | null
  hourly_rate_cents?: number | null
  day_rate_cents?: number | null
  availability_notes?: string | null
  reliability_rating?: number | null
  last_worked_date?: string | null
  last_worked_event?: string | null
  has_food_handler_cert?: boolean
  has_servsafe?: boolean
  dietary_restrictions?: string | null
  notes?: string | null
}

export type UpdateTrustedStaffInput = Partial<CreateTrustedStaffInput>

export type TrustedStaffFilters = {
  role?: StaffRole
  minRating?: number
}

// ============================================
// ACTIONS
// ============================================

export async function getTrustedStaff(
  filters?: TrustedStaffFilters
): Promise<TrustedStaffContact[]> {
  const user = await requireChef()
  const db = createServerClient()

  let query = db.from('trusted_staff_roster').select('*').eq('tenant_id', user.tenantId!)

  if (filters?.role) {
    query = query.eq('role', filters.role)
  }
  if (filters?.minRating) {
    query = query.gte('reliability_rating', filters.minRating)
  }

  const { data, error } = await query.order('name', { ascending: true })

  if (error) throw new Error(`Failed to load trusted staff: ${error.message}`)
  return (data ?? []) as TrustedStaffContact[]
}

export async function createTrustedStaff(
  input: CreateTrustedStaffInput
): Promise<{ success: true; contact: TrustedStaffContact }> {
  const user = await requireChef()
  const db = createServerClient()

  if (!input.name?.trim()) {
    throw new Error('Name is required')
  }

  const { data, error } = await db
    .from('trusted_staff_roster')
    .insert({
      tenant_id: user.tenantId!,
      name: input.name.trim(),
      role: input.role,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      hourly_rate_cents: input.hourly_rate_cents ?? null,
      day_rate_cents: input.day_rate_cents ?? null,
      availability_notes: input.availability_notes?.trim() || null,
      reliability_rating: input.reliability_rating ?? null,
      last_worked_date: input.last_worked_date || null,
      last_worked_event: input.last_worked_event?.trim() || null,
      has_food_handler_cert: input.has_food_handler_cert ?? false,
      has_servsafe: input.has_servsafe ?? false,
      dietary_restrictions: input.dietary_restrictions?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create trusted staff contact: ${error.message}`)

  revalidatePath('/business/ops')
  return { success: true, contact: data as TrustedStaffContact }
}

export async function updateTrustedStaff(
  id: string,
  input: UpdateTrustedStaffInput
): Promise<{ success: true }> {
  const user = await requireChef()
  const db = createServerClient()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.role !== undefined) updates.role = input.role
  if (input.phone !== undefined) updates.phone = input.phone?.trim() || null
  if (input.email !== undefined) updates.email = input.email?.trim() || null
  if (input.hourly_rate_cents !== undefined) updates.hourly_rate_cents = input.hourly_rate_cents
  if (input.day_rate_cents !== undefined) updates.day_rate_cents = input.day_rate_cents
  if (input.availability_notes !== undefined)
    updates.availability_notes = input.availability_notes?.trim() || null
  if (input.reliability_rating !== undefined) updates.reliability_rating = input.reliability_rating
  if (input.last_worked_date !== undefined)
    updates.last_worked_date = input.last_worked_date || null
  if (input.last_worked_event !== undefined)
    updates.last_worked_event = input.last_worked_event?.trim() || null
  if (input.has_food_handler_cert !== undefined)
    updates.has_food_handler_cert = input.has_food_handler_cert
  if (input.has_servsafe !== undefined) updates.has_servsafe = input.has_servsafe
  if (input.dietary_restrictions !== undefined)
    updates.dietary_restrictions = input.dietary_restrictions?.trim() || null
  if (input.notes !== undefined) updates.notes = input.notes?.trim() || null

  const { error } = await db
    .from('trusted_staff_roster')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to update trusted staff contact: ${error.message}`)

  revalidatePath('/business/ops')
  return { success: true }
}

export async function deleteTrustedStaff(id: string): Promise<{ success: true }> {
  const user = await requireChef()
  const db = createServerClient()

  const { error } = await db
    .from('trusted_staff_roster')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete trusted staff contact: ${error.message}`)

  revalidatePath('/business/ops')
  return { success: true }
}

/**
 * Promote a trusted staff contact to a full staff_members record.
 * Pre-fills name, phone, role, and rate from the roster entry.
 * Sets promoted_to_staff_id on the roster entry (becomes read-only in UI).
 */
export async function promoteToStaff(
  id: string
): Promise<{ success: true; staffMemberId: string }> {
  const user = await requireChef()
  const db = createServerClient()

  // Fetch the trusted contact
  const { data: contact, error: fetchError } = await db
    .from('trusted_staff_roster')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !contact) {
    throw new Error('Trusted staff contact not found')
  }

  if (contact.promoted_to_staff_id) {
    throw new Error('This contact has already been promoted to staff')
  }

  // Map trusted roster role to staff_role enum
  // staff_members uses staff_role enum: sous_chef, kitchen_assistant, service_staff, server, bartender, dishwasher, other
  const roleMap: Record<string, string> = {
    sous_chef: 'sous_chef',
    line_cook: 'kitchen_assistant',
    server: 'server',
    bartender: 'bartender',
    dishwasher: 'dishwasher',
    assistant: 'kitchen_assistant',
    driver: 'other',
    other: 'other',
  }

  // Create staff_members row
  const { data: staffRow, error: insertError } = await db
    .from('staff_members')
    .insert({
      chef_id: user.tenantId!,
      name: contact.name,
      role: roleMap[contact.role] || 'other',
      phone: contact.phone,
      email: contact.email,
      hourly_rate_cents: contact.hourly_rate_cents ?? 0,
      notes: contact.notes,
      status: 'active',
    })
    .select('id')
    .single()

  if (insertError) throw new Error(`Failed to create staff member: ${insertError.message}`)

  // Update trusted roster entry with promoted reference
  const { error: updateError } = await db
    .from('trusted_staff_roster')
    .update({
      promoted_to_staff_id: staffRow.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (updateError) throw new Error(`Failed to link promotion: ${updateError.message}`)

  revalidatePath('/business/ops')
  return { success: true, staffMemberId: staffRow.id }
}
