'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { sendEmail } from '@/lib/email/send'
import { ReservationConfirmationEmail } from '@/lib/email/templates/reservation-confirmation'

// ============================================
// SCHEMAS
// ============================================

const CreateReservationSchema = z.object({
  guestId: z.string().uuid().optional(),
  guestName: z.string().min(1, 'Guest name is required'),
  guestPhone: z.string().optional(),
  guestEmail: z.string().email().optional().or(z.literal('')),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  time: z.string().min(1, 'Time is required'),
  partySize: z.number().int().min(1).max(100),
  tableId: z.string().uuid().optional(),
  notes: z.string().optional(),
  sendConfirmation: z.boolean().optional(),
})

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>

const UpdateReservationSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  time: z.string().optional(),
  partySize: z.number().int().min(1).max(100).optional(),
  tableId: z.string().uuid().nullable().optional(),
  notes: z.string().optional(),
})

export type UpdateReservationInput = z.infer<typeof UpdateReservationSchema>

// ============================================
// RESERVATION CRUD
// ============================================

export async function createReservation(input: CreateReservationInput) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const data = CreateReservationSchema.parse(input)

  // Find or create guest
  let guestId = data.guestId
  if (!guestId) {
    // Try to find existing guest by phone or email
    if (data.guestPhone) {
      const { data: existing } = await supabase
        .from('guests')
        .select('id')
        .eq('chef_id', user.tenantId!)
        .eq('phone', data.guestPhone)
        .maybeSingle()
      if (existing) guestId = existing.id
    }
    if (!guestId && data.guestEmail) {
      const { data: existing } = await supabase
        .from('guests')
        .select('id')
        .eq('chef_id', user.tenantId!)
        .eq('email', data.guestEmail)
        .maybeSingle()
      if (existing) guestId = existing.id
    }
    // Create new guest if not found
    if (!guestId) {
      const { data: newGuest, error: guestError } = await supabase
        .from('guests')
        .insert({
          chef_id: user.tenantId!,
          name: data.guestName,
          phone: data.guestPhone || null,
          email: data.guestEmail || null,
        })
        .select('id')
        .single()
      if (guestError) {
        console.error('[reservations] createGuest error:', guestError)
        throw new Error('Failed to create guest record')
      }
      guestId = newGuest.id
    }
  }

  // Look up table label if tableId provided
  let tableNumber: string | null = null
  if (data.tableId) {
    const { data: table } = await supabase
      .from('commerce_dining_tables')
      .select('table_label')
      .eq('id', data.tableId)
      .eq('tenant_id', user.tenantId!)
      .maybeSingle()
    tableNumber = table?.table_label || null
  }

  const { data: reservation, error } = await supabase
    .from('guest_reservations')
    .insert({
      guest_id: guestId,
      reservation_date: data.date,
      reservation_time: data.time || null,
      party_size: data.partySize,
      table_number: tableNumber,
      notes: data.notes || null,
      status: 'confirmed',
      chef_id: user.tenantId!,
    })
    .select('*, guests(name, phone, email)')
    .single()

  if (error) {
    console.error('[reservations] createReservation error:', error)
    throw new Error('Failed to create reservation')
  }

  // Send confirmation email if requested
  if (data.sendConfirmation && reservation?.guests?.email) {
    try {
      const { data: chef } = await supabase
        .from('chefs')
        .select('business_name')
        .eq('id', user.tenantId!)
        .single()

      await sendEmail({
        to: reservation.guests.email,
        subject: 'Your reservation is confirmed!',
        react: ReservationConfirmationEmail({
          guestName: reservation.guests.name,
          restaurantName: chef?.business_name || 'Our Restaurant',
          date: data.date,
          time: data.time,
          partySize: data.partySize,
          tableNumber: tableNumber || undefined,
        }),
      })
    } catch (err) {
      console.error('[non-blocking] Reservation confirmation email failed', err)
    }
  }

  revalidatePath('/guests')
  revalidatePath('/guests/reservations')
  if (guestId) revalidatePath(`/guests/${guestId}`)
  return reservation
}

export async function updateReservation(reservationId: string, input: UpdateReservationInput) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const data = UpdateReservationSchema.parse(input)

  const updateData: Record<string, unknown> = {}
  if (data.date !== undefined) updateData.reservation_date = data.date
  if (data.time !== undefined) updateData.reservation_time = data.time || null
  if (data.partySize !== undefined) updateData.party_size = data.partySize
  if (data.notes !== undefined) updateData.notes = data.notes || null
  if (data.tableId !== undefined) {
    if (data.tableId) {
      const { data: table } = await supabase
        .from('commerce_dining_tables')
        .select('table_label')
        .eq('id', data.tableId)
        .eq('tenant_id', user.tenantId!)
        .maybeSingle()
      updateData.table_number = table?.table_label || null
    } else {
      updateData.table_number = null
    }
  }
  updateData.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from('guest_reservations')
    .update(updateData)
    .eq('id', reservationId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[reservations] updateReservation error:', error)
    throw new Error('Failed to update reservation')
  }

  revalidatePath('/guests')
  revalidatePath('/guests/reservations')
}

export async function cancelReservation(reservationId: string, reason?: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const updateData: Record<string, unknown> = {
    status: 'cancelled',
    updated_at: new Date().toISOString(),
  }
  if (reason) {
    // Append reason to notes
    const { data: existing } = await supabase
      .from('guest_reservations')
      .select('notes, guest_id, guests(email, name)')
      .eq('id', reservationId)
      .eq('chef_id', user.tenantId!)
      .single()

    const existingNotes = existing?.notes || ''
    updateData.notes = [existingNotes, `Cancelled: ${reason}`].filter(Boolean).join('\n')
  }

  const { data: reservation, error } = await supabase
    .from('guest_reservations')
    .update(updateData)
    .eq('id', reservationId)
    .eq('chef_id', user.tenantId!)
    .select('guest_id')
    .single()

  if (error) {
    console.error('[reservations] cancelReservation error:', error)
    throw new Error('Failed to cancel reservation')
  }

  revalidatePath('/guests')
  revalidatePath('/guests/reservations')
  if (reservation?.guest_id) {
    revalidatePath(`/guests/${reservation.guest_id}`)
  }
}

export async function seatReservation(reservationId: string, tableId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get table label
  const { data: table } = await supabase
    .from('commerce_dining_tables')
    .select('table_label')
    .eq('id', tableId)
    .eq('tenant_id', user.tenantId!)
    .maybeSingle()

  const { data: reservation, error } = await supabase
    .from('guest_reservations')
    .update({
      status: 'seated',
      table_number: table?.table_label || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reservationId)
    .eq('chef_id', user.tenantId!)
    .select('guest_id, party_size, guests(name)')
    .single()

  if (error) {
    console.error('[reservations] seatReservation error:', error)
    throw new Error('Failed to seat reservation')
  }

  // Update table status to seated
  try {
    await supabase
      .from('commerce_dining_tables')
      .update({ status: 'seated' })
      .eq('id', tableId)
      .eq('tenant_id', user.tenantId!)
  } catch (err) {
    console.error('[non-blocking] Table status update failed', err)
  }

  revalidatePath('/guests')
  revalidatePath('/guests/reservations')
  revalidatePath('/commerce/table-service')
  if (reservation?.guest_id) {
    revalidatePath(`/guests/${reservation.guest_id}`)
  }
  return reservation
}

export async function completeReservation(reservationId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: reservation, error } = await supabase
    .from('guest_reservations')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', reservationId)
    .eq('chef_id', user.tenantId!)
    .select('guest_id, party_size, reservation_date')
    .single()

  if (error) {
    console.error('[reservations] completeReservation error:', error)
    throw new Error('Failed to complete reservation')
  }

  // Record a visit for the guest
  if (reservation?.guest_id) {
    try {
      await supabase.from('guest_visits').insert({
        guest_id: reservation.guest_id,
        chef_id: user.tenantId!,
        visit_date: reservation.reservation_date,
        party_size: reservation.party_size || 1,
      })
    } catch (err) {
      console.error('[non-blocking] Visit recording failed', err)
    }
  }

  revalidatePath('/guests')
  revalidatePath('/guests/reservations')
  if (reservation?.guest_id) {
    revalidatePath(`/guests/${reservation.guest_id}`)
  }
}

export async function markNoShow(reservationId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: reservation, error } = await supabase
    .from('guest_reservations')
    .update({
      status: 'no_show',
      updated_at: new Date().toISOString(),
    })
    .eq('id', reservationId)
    .eq('chef_id', user.tenantId!)
    .select('guest_id')
    .single()

  if (error) {
    console.error('[reservations] markNoShow error:', error)
    throw new Error('Failed to mark as no-show')
  }

  // Tag the guest as "no-show" for future reference
  if (reservation?.guest_id) {
    try {
      await supabase.from('guest_tags').upsert(
        {
          guest_id: reservation.guest_id,
          chef_id: user.tenantId!,
          tag: 'no-show',
          color: 'red',
        },
        { onConflict: 'guest_id,tag' }
      )
    } catch (err) {
      console.error('[non-blocking] No-show tag failed', err)
    }
  }

  revalidatePath('/guests')
  revalidatePath('/guests/reservations')
  if (reservation?.guest_id) {
    revalidatePath(`/guests/${reservation.guest_id}`)
  }
}

export async function getReservationsForDate(date: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('guest_reservations')
    .select(
      '*, guests(id, name, phone, email, guest_tags(tag, color), guest_comps(id, redeemed_at))'
    )
    .eq('chef_id', user.tenantId!)
    .eq('reservation_date', date)
    .order('reservation_time', { ascending: true })

  if (error) {
    console.error('[reservations] getReservationsForDate error:', error)
    throw new Error('Failed to load reservations')
  }

  return data ?? []
}

export async function getUpcomingReservations(days: number = 7) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const today = new Date().toISOString().split('T')[0]
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + days)
  const end = endDate.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('guest_reservations')
    .select('*, guests(id, name, phone, email)')
    .eq('chef_id', user.tenantId!)
    .gte('reservation_date', today)
    .lte('reservation_date', end)
    .in('status', ['confirmed', 'seated'])
    .order('reservation_date', { ascending: true })
    .order('reservation_time', { ascending: true })

  if (error) {
    console.error('[reservations] getUpcomingReservations error:', error)
    throw new Error('Failed to load upcoming reservations')
  }

  return data ?? []
}

export async function getAvailableTables(date: string, time: string, partySize: number) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get all active tables that can fit the party
  const { data: allTables, error: tablesError } = await supabase
    .from('commerce_dining_tables')
    .select('id, table_label, seat_capacity, zone_id, status')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)
    .neq('status', 'out_of_service')
    .gte('seat_capacity', partySize)
    .order('seat_capacity', { ascending: true })

  if (tablesError) {
    console.error('[reservations] getAvailableTables error:', tablesError)
    throw new Error('Failed to load tables')
  }

  if (!allTables || allTables.length === 0) return []

  // Get reservations that overlap (same date, within 2 hour window)
  const { data: reservedTables } = await supabase
    .from('guest_reservations')
    .select('table_number')
    .eq('chef_id', user.tenantId!)
    .eq('reservation_date', date)
    .in('status', ['confirmed', 'seated'])

  const reservedLabels = new Set(
    (reservedTables ?? []).map((r: any) => r.table_number).filter(Boolean)
  )

  // Filter out tables that are already reserved
  return (allTables as any[]).filter((t: any) => !reservedLabels.has(t.table_label))
}

export async function confirmReservation(reservationId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: reservation, error } = await supabase
    .from('guest_reservations')
    .select('*, guests(name, email)')
    .eq('id', reservationId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (error || !reservation) {
    throw new Error('Reservation not found')
  }

  if (!reservation.guests?.email) {
    throw new Error('Guest has no email address on file')
  }

  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name')
    .eq('id', user.tenantId!)
    .single()

  await sendEmail({
    to: reservation.guests.email,
    subject: 'Your reservation is confirmed!',
    react: ReservationConfirmationEmail({
      guestName: reservation.guests.name,
      restaurantName: chef?.business_name || 'Our Restaurant',
      date: reservation.reservation_date,
      time: reservation.reservation_time || '',
      partySize: reservation.party_size || 1,
      tableNumber: reservation.table_number || undefined,
    }),
  })

  return { success: true }
}

// Legacy exports for backward compatibility with existing reservation-form.tsx
export async function listReservations(date?: string) {
  if (date) return getReservationsForDate(date)

  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('guest_reservations')
    .select('*, guests(name, phone)')
    .eq('chef_id', user.tenantId!)
    .order('reservation_date', { ascending: true })
    .order('reservation_time', { ascending: true })

  if (error) {
    console.error('[reservations] listReservations error:', error)
    throw new Error('Failed to list reservations')
  }

  return data ?? []
}

export async function getReservation(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

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
