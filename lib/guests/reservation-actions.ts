'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const CreateReservationSchema = z.object({
  guest_id: z.string().uuid(),
  reservation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  reservation_time: z.string().optional(),
  party_size: z.number().int().min(1).optional(),
  table_number: z.string().optional(),
  notes: z.string().optional(),
})

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>

const UpdateReservationSchema = CreateReservationSchema.partial().omit({ guest_id: true })
export type UpdateReservationInput = z.infer<typeof UpdateReservationSchema>

// ============================================
// RESERVATION CRUD
// ============================================

export async function createReservation(input: CreateReservationInput) {
  const user = await requireChef()
  const supabase = createServerClient()
  const data = CreateReservationSchema.parse(input)

  const { data: reservation, error } = await supabase
    .from('guest_reservations')
    .insert({
      guest_id: data.guest_id,
      reservation_date: data.reservation_date,
      reservation_time: data.reservation_time || null,
      party_size: data.party_size || null,
      table_number: data.table_number || null,
      notes: data.notes || null,
      status: 'confirmed',
      chef_id: user.tenantId!,
    })
    .select()
    .single()

  if (error) {
    console.error('[reservations] createReservation error:', error)
    throw new Error('Failed to create reservation')
  }

  revalidatePath('/guests')
  revalidatePath(`/guests/${data.guest_id}`)
  return reservation
}

export async function updateReservation(id: string, input: UpdateReservationInput) {
  const user = await requireChef()
  const supabase = createServerClient()
  const data = UpdateReservationSchema.parse(input)

  const updateData: Record<string, unknown> = {}
  if (data.reservation_date !== undefined) updateData.reservation_date = data.reservation_date
  if (data.reservation_time !== undefined)
    updateData.reservation_time = data.reservation_time || null
  if (data.party_size !== undefined) updateData.party_size = data.party_size || null
  if (data.table_number !== undefined) updateData.table_number = data.table_number || null
  if (data.notes !== undefined) updateData.notes = data.notes || null
  updateData.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from('guest_reservations')
    .update(updateData)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[reservations] updateReservation error:', error)
    throw new Error('Failed to update reservation')
  }

  revalidatePath('/guests')
}

export async function cancelReservation(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: reservation, error } = await supabase
    .from('guest_reservations')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select('guest_id')
    .single()

  if (error) {
    console.error('[reservations] cancelReservation error:', error)
    throw new Error('Failed to cancel reservation')
  }

  revalidatePath('/guests')
  if (reservation?.guest_id) {
    revalidatePath(`/guests/${reservation.guest_id}`)
  }
}

export async function listReservations(date?: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  let q = supabase
    .from('guest_reservations')
    .select('*, guests(name, phone)')
    .eq('chef_id', user.tenantId!)
    .order('reservation_date', { ascending: true })
    .order('reservation_time', { ascending: true })

  if (date) {
    q = q.eq('reservation_date', date)
  }

  const { data, error } = await q

  if (error) {
    console.error('[reservations] listReservations error:', error)
    throw new Error('Failed to list reservations')
  }

  return data ?? []
}

export async function getReservation(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('guest_reservations')
    .select('*, guests(name, phone, email)')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (error) {
    console.error('[reservations] getReservation error:', error)
    throw new Error('Reservation not found')
  }

  return data
}
