'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ───────────────────────────────────────────────────────

export type RentalStatus = 'needed' | 'confirmed' | 'picked_up' | 'returned' | 'cancelled'

export type EquipmentRental = {
  id: string
  event_id: string
  chef_id: string
  name: string
  vendor: string | null
  quantity: number
  daily_rate_cents: number | null
  total_cost_cents: number | null
  notes: string | null
  needed_date: string | null
  status: RentalStatus
  confirmed_at: string | null
  returned_at: string | null
  created_at: string
  updated_at: string
}

export type AddRentalInput = {
  name: string
  vendor?: string
  quantity?: number
  dailyRateCents?: number
  totalCostCents?: number
  notes?: string
  neededDate?: string
}

export type UpdateRentalInput = Partial<AddRentalInput>

// ─── Actions ─────────────────────────────────────────────────────

export async function addEquipmentRental(eventId: string, input: AddRentalInput) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('event_equipment_rentals')
    .insert({
      event_id: eventId,
      chef_id: user.tenantId!,
      name: input.name,
      vendor: input.vendor || null,
      quantity: input.quantity ?? 1,
      daily_rate_cents: input.dailyRateCents ?? null,
      total_cost_cents: input.totalCostCents ?? null,
      notes: input.notes || null,
      needed_date: input.neededDate || null,
      status: 'needed',
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to add rental: ${error.message}`)

  revalidatePath(`/events/${eventId}`)
  return data
}

export async function updateEquipmentRental(rentalId: string, input: UpdateRentalInput) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify ownership
  const { data: existing } = await supabase
    .from('event_equipment_rentals')
    .select('id, event_id')
    .eq('id', rentalId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!existing) throw new Error('Rental not found or access denied')

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.name !== undefined) updateData.name = input.name
  if (input.vendor !== undefined) updateData.vendor = input.vendor || null
  if (input.quantity !== undefined) updateData.quantity = input.quantity
  if (input.dailyRateCents !== undefined) updateData.daily_rate_cents = input.dailyRateCents
  if (input.totalCostCents !== undefined) updateData.total_cost_cents = input.totalCostCents
  if (input.notes !== undefined) updateData.notes = input.notes || null
  if (input.neededDate !== undefined) updateData.needed_date = input.neededDate || null

  const { data, error } = await supabase
    .from('event_equipment_rentals')
    .update(updateData)
    .eq('id', rentalId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to update rental: ${error.message}`)

  revalidatePath(`/events/${existing.event_id}`)
  return data
}

export async function deleteEquipmentRental(rentalId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: existing } = await supabase
    .from('event_equipment_rentals')
    .select('id, event_id')
    .eq('id', rentalId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!existing) throw new Error('Rental not found or access denied')

  const { error } = await supabase
    .from('event_equipment_rentals')
    .delete()
    .eq('id', rentalId)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete rental: ${error.message}`)

  revalidatePath(`/events/${existing.event_id}`)
}

export async function getEventRentals(eventId: string): Promise<EquipmentRental[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('event_equipment_rentals')
    .select('*')
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch rentals: ${error.message}`)

  return data ?? []
}

export async function markRentalConfirmed(rentalId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: existing } = await supabase
    .from('event_equipment_rentals')
    .select('id, event_id')
    .eq('id', rentalId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!existing) throw new Error('Rental not found or access denied')

  const { error } = await supabase
    .from('event_equipment_rentals')
    .update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', rentalId)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to confirm rental: ${error.message}`)

  revalidatePath(`/events/${existing.event_id}`)
}

export async function markRentalReturned(rentalId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: existing } = await supabase
    .from('event_equipment_rentals')
    .select('id, event_id')
    .eq('id', rentalId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!existing) throw new Error('Rental not found or access denied')

  const { error } = await supabase
    .from('event_equipment_rentals')
    .update({
      status: 'returned',
      returned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', rentalId)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to mark rental returned: ${error.message}`)

  revalidatePath(`/events/${existing.event_id}`)
}

export async function getUpcomingRentals(): Promise<
  (EquipmentRental & { event_title?: string; event_date?: string })[]
> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const thirtyDaysOut = new Date()
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30)

  const { data, error } = await supabase
    .from('event_equipment_rentals')
    .select('*, event:events(title, event_date)')
    .eq('chef_id', user.tenantId!)
    .in('status', ['needed', 'confirmed', 'picked_up'])
    .lte('needed_date', thirtyDaysOut.toISOString().split('T')[0])
    .order('needed_date', { ascending: true })

  if (error) throw new Error(`Failed to fetch upcoming rentals: ${error.message}`)

  return (data ?? []).map((r: any) => ({
    ...r,
    event_title: r.event?.title,
    event_date: r.event?.event_date,
  }))
}
