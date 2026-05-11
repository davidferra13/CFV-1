// Client Guest Actions - Host-side guest management and dietary rollup

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export type ClientGuest = {
  id: string
  name: string
  email: string | null
  rsvp_status: string
  dietary_restrictions: string[]
  allergies: string[]
  notes: string | null
  created_at: string
}

export type DietaryRollup = {
  totalGuests: number
  confirmed: number
  pending: number
  declined: number
  allergies: Array<{ name: string; count: number }>
  dietaryRestrictions: Array<{ name: string; count: number }>
}

const AddGuestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
})

/**
 * Verify client owns this event. Returns tenant_id if valid.
 */
async function verifyEventOwnership(db: any, eventId: string, clientId: string) {
  const { data } = await db
    .from('events')
    .select('id, tenant_id')
    .eq('id', eventId)
    .eq('client_id', clientId)
    .single()

  if (!data) throw new Error('Event not found or access denied')
  return data
}

export async function getClientEventGuests(eventId: string): Promise<ClientGuest[]> {
  const user = await requireClient()
  const db: any = createServerClient()
  await verifyEventOwnership(db, eventId, user.entityId)

  const { data, error } = await db
    .from('event_guests')
    .select('id, name, email, rsvp_status, dietary_restrictions, allergies, notes, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getClientEventGuests] Error:', error)
    throw new Error('Failed to load guest list')
  }

  return (data ?? []).map((g: any) => ({
    id: g.id,
    name: g.name || 'Guest',
    email: g.email || null,
    rsvp_status: g.rsvp_status || 'pending',
    dietary_restrictions: g.dietary_restrictions || [],
    allergies: g.allergies || [],
    notes: g.notes || null,
    created_at: g.created_at,
  }))
}

export async function getGuestDietaryRollup(eventId: string): Promise<DietaryRollup> {
  const guests = await getClientEventGuests(eventId)

  const allergyMap = new Map<string, number>()
  const dietaryMap = new Map<string, number>()
  let confirmed = 0
  let pending = 0
  let declined = 0

  for (const g of guests) {
    if (g.rsvp_status === 'confirmed' || g.rsvp_status === 'attending') confirmed++
    else if (g.rsvp_status === 'declined') declined++
    else pending++

    for (const a of g.allergies) {
      allergyMap.set(a, (allergyMap.get(a) || 0) + 1)
    }
    for (const d of g.dietary_restrictions) {
      dietaryMap.set(d, (dietaryMap.get(d) || 0) + 1)
    }
  }

  return {
    totalGuests: guests.length,
    confirmed,
    pending,
    declined,
    allergies: [...allergyMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    dietaryRestrictions: [...dietaryMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
  }
}

export async function addClientGuest(eventId: string, formData: { name: string; email?: string }) {
  const user = await requireClient()
  const parsed = AddGuestSchema.parse(formData)
  const db: any = createServerClient()
  const event = await verifyEventOwnership(db, eventId, user.entityId)

  const { error } = await db.from('event_guests').insert({
    event_id: eventId,
    tenant_id: event.tenant_id,
    name: parsed.name,
    email: parsed.email || null,
    rsvp_status: 'pending',
    added_by: 'client',
  })

  if (error) {
    console.error('[addClientGuest] Insert failed:', error)
    throw new Error('Failed to add guest')
  }

  revalidatePath(`/my-events/${eventId}/guests`)
  return { success: true }
}

export async function removeClientGuest(eventId: string, guestId: string) {
  const user = await requireClient()
  const db: any = createServerClient()
  await verifyEventOwnership(db, eventId, user.entityId)

  const { error } = await db.from('event_guests').delete().eq('id', guestId).eq('event_id', eventId)

  if (error) {
    console.error('[removeClientGuest] Delete failed:', error)
    throw new Error('Failed to remove guest')
  }

  revalidatePath(`/my-events/${eventId}/guests`)
  return { success: true }
}
