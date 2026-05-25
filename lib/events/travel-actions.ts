'use server'

// Travel details CRUD for events table travel columns.
// Used by travel-equipment-section component.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// -- Types ------------------------------------------------------------------

export interface EventTravelDetails {
  travel_mode: string | null
  travel_departure_at: string | null
  travel_return_at: string | null
  travel_notes: string | null
  travel_cost_cents: number | null
  accommodation_name: string | null
  accommodation_address: string | null
  accommodation_confirmation: string | null
  accommodation_cost_cents: number | null
}

export interface UpdateTravelInput {
  travel_mode?: string | null
  travel_departure_at?: string | null
  travel_return_at?: string | null
  travel_notes?: string | null
  travel_cost_cents?: number | null
  accommodation_name?: string | null
  accommodation_address?: string | null
  accommodation_confirmation?: string | null
  accommodation_cost_cents?: number | null
}

// -- 1. getEventTravelDetails -----------------------------------------------

export async function getEventTravelDetails(eventId: string): Promise<EventTravelDetails | null> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('events')
    .select(
      'travel_mode, travel_departure_at, travel_return_at, travel_notes, travel_cost_cents, accommodation_name, accommodation_address, accommodation_confirmation, accommodation_cost_cents'
    )
    .eq('id', eventId)
    .eq('tenant_id', chef.tenantId!)
    .single()

  if (error || !data) return null
  return data
}

// -- 2. updateEventTravelDetails --------------------------------------------

export async function updateEventTravelDetails(
  eventId: string,
  updates: UpdateTravelInput
): Promise<{ success: boolean; error?: string }> {
  const chef = await requireChef()
  const db: any = createServerClient()

  // Verify event belongs to tenant
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', chef.tenantId!)
    .maybeSingle()

  if (!event) return { success: false, error: 'Event not found' }

  // Validate travel_mode
  if (
    updates.travel_mode !== undefined &&
    updates.travel_mode !== null &&
    !['drive', 'fly', 'train', 'other'].includes(updates.travel_mode)
  ) {
    return { success: false, error: 'Invalid travel mode' }
  }

  const payload: Record<string, unknown> = {}

  if (updates.travel_mode !== undefined) payload.travel_mode = updates.travel_mode
  if (updates.travel_departure_at !== undefined)
    payload.travel_departure_at = updates.travel_departure_at
  if (updates.travel_return_at !== undefined) payload.travel_return_at = updates.travel_return_at
  if (updates.travel_notes !== undefined) payload.travel_notes = updates.travel_notes
  if (updates.travel_cost_cents !== undefined) payload.travel_cost_cents = updates.travel_cost_cents
  if (updates.accommodation_name !== undefined)
    payload.accommodation_name = updates.accommodation_name
  if (updates.accommodation_address !== undefined)
    payload.accommodation_address = updates.accommodation_address
  if (updates.accommodation_confirmation !== undefined)
    payload.accommodation_confirmation = updates.accommodation_confirmation
  if (updates.accommodation_cost_cents !== undefined)
    payload.accommodation_cost_cents = updates.accommodation_cost_cents

  if (Object.keys(payload).length === 0) return { success: true }

  const { error } = await db
    .from('events')
    .update(payload)
    .eq('id', eventId)
    .eq('tenant_id', chef.tenantId!)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}
