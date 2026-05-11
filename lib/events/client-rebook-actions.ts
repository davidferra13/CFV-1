'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export interface RebookData {
  occasion: string | null
  guest_count: number | null
  location_address: string | null
  location_city: string | null
  location_state: string | null
  dietary_notes: string | null
}

/**
 * Fetch event details for pre-filling a rebooking inquiry.
 * Client must own the event.
 */
export async function getRebookData(eventId: string): Promise<RebookData | null> {
  const user = await requireClient()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select(
      'occasion, guest_count, location_address, location_city, location_state, special_requests'
    )
    .eq('id', eventId)
    .eq('client_id', user.entityId)
    .single()

  if (!event) return null

  return {
    occasion: event.occasion ?? null,
    guest_count: event.guest_count ?? null,
    location_address: event.location_address ?? null,
    location_city: event.location_city ?? null,
    location_state: event.location_state ?? null,
    dietary_notes: event.special_requests ?? null,
  }
}
