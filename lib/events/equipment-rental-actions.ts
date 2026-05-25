'use server'

// CRUD for event_equipment_rentals table
// Tracks rental vendors, items, costs, and return dates per event.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ── Types ──────────────────────────────────────────────────────────────────

export interface EquipmentRental {
  id: string
  event_id: string
  tenant_id: string
  vendor_name: string
  vendor_phone: string | null
  vendor_email: string | null
  items: string[]
  pickup_at: string | null
  return_at: string | null
  cost_cents: number | null
  deposit_cents: number | null
  confirmation_number: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateRentalInput {
  event_id: string
  vendor_name: string
  vendor_phone?: string
  vendor_email?: string
  items?: string[]
  pickup_at?: string
  return_at?: string
  cost_cents?: number
  deposit_cents?: number
  confirmation_number?: string
  notes?: string
}

export interface UpdateRentalInput {
  vendor_name?: string
  vendor_phone?: string | null
  vendor_email?: string | null
  items?: string[]
  pickup_at?: string | null
  return_at?: string | null
  cost_cents?: number | null
  deposit_cents?: number | null
  confirmation_number?: string | null
  notes?: string | null
}

// ── 1. getEquipmentRentals ─────────────────────────────────────────────────

export async function getEquipmentRentals(eventId: string): Promise<EquipmentRental[]> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_equipment_rentals')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', chef.tenantId!)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[equipment-rentals] List error:', error)
    return []
  }

  return data ?? []
}

// ── 2. createEquipmentRental ───────────────────────────────────────────────

export async function createEquipmentRental(
  input: CreateRentalInput
): Promise<{ success: boolean; rental?: EquipmentRental; error?: string }> {
  const chef = await requireChef()
  const db: any = createServerClient()

  // Verify event belongs to tenant
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', input.event_id)
    .eq('tenant_id', chef.tenantId!)
    .maybeSingle()

  if (!event) return { success: false, error: 'Event not found' }

  if (!input.vendor_name?.trim()) {
    return { success: false, error: 'Vendor name is required' }
  }

  const { data, error } = await db
    .from('event_equipment_rentals')
    .insert({
      event_id: input.event_id,
      tenant_id: chef.tenantId!,
      vendor_name: input.vendor_name.trim(),
      vendor_phone: input.vendor_phone?.trim() || null,
      vendor_email: input.vendor_email?.trim() || null,
      items: input.items ?? [],
      pickup_at: input.pickup_at || null,
      return_at: input.return_at || null,
      cost_cents: input.cost_cents ?? null,
      deposit_cents: input.deposit_cents ?? null,
      confirmation_number: input.confirmation_number?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath(`/events/${input.event_id}`)
  return { success: true, rental: data }
}

// ── 3. updateEquipmentRental ───────────────────────────────────────────────

export async function updateEquipmentRental(
  rentalId: string,
  updates: UpdateRentalInput
): Promise<{ success: boolean; error?: string }> {
  const chef = await requireChef()
  const db: any = createServerClient()

  // Get rental to verify ownership and get event_id for revalidation
  const { data: rental } = await db
    .from('event_equipment_rentals')
    .select('id, event_id')
    .eq('id', rentalId)
    .eq('tenant_id', chef.tenantId!)
    .maybeSingle()

  if (!rental) return { success: false, error: 'Rental not found' }

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (updates.vendor_name !== undefined) payload.vendor_name = updates.vendor_name
  if (updates.vendor_phone !== undefined) payload.vendor_phone = updates.vendor_phone
  if (updates.vendor_email !== undefined) payload.vendor_email = updates.vendor_email
  if (updates.items !== undefined) payload.items = updates.items
  if (updates.pickup_at !== undefined) payload.pickup_at = updates.pickup_at
  if (updates.return_at !== undefined) payload.return_at = updates.return_at
  if (updates.cost_cents !== undefined) payload.cost_cents = updates.cost_cents
  if (updates.deposit_cents !== undefined) payload.deposit_cents = updates.deposit_cents
  if (updates.confirmation_number !== undefined)
    payload.confirmation_number = updates.confirmation_number
  if (updates.notes !== undefined) payload.notes = updates.notes

  const { error } = await db
    .from('event_equipment_rentals')
    .update(payload)
    .eq('id', rentalId)
    .eq('tenant_id', chef.tenantId!)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/events/${rental.event_id}`)
  return { success: true }
}

// ── 4. deleteEquipmentRental ───────────────────────────────────────────────

export async function deleteEquipmentRental(
  rentalId: string
): Promise<{ success: boolean; error?: string }> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: rental } = await db
    .from('event_equipment_rentals')
    .select('id, event_id')
    .eq('id', rentalId)
    .eq('tenant_id', chef.tenantId!)
    .maybeSingle()

  if (!rental) return { success: false, error: 'Rental not found' }

  const { error } = await db
    .from('event_equipment_rentals')
    .delete()
    .eq('id', rentalId)
    .eq('tenant_id', chef.tenantId!)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/events/${rental.event_id}`)
  return { success: true }
}

// ── 5. getTotalRentalCost ──────────────────────────────────────────────────

export async function getTotalRentalCost(
  eventId: string
): Promise<{ totalCents: number; totalDepositCents: number }> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('event_equipment_rentals')
    .select('cost_cents, deposit_cents')
    .eq('event_id', eventId)
    .eq('tenant_id', chef.tenantId!)

  const rentals = data ?? []
  const totalCents = rentals.reduce((sum: number, r: any) => sum + (r.cost_cents ?? 0), 0)
  const totalDepositCents = rentals.reduce((sum: number, r: any) => sum + (r.deposit_cents ?? 0), 0)

  return { totalCents, totalDepositCents }
}
