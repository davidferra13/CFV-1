'use server'

// Client Dietary Context
// Returns all dietary info for a client, including past event dietary notes.
// Used to pre-populate dietary info on quote/menu/event pages.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export type ClientDietaryContext = {
  clientId: string
  clientName: string
  dietary_restrictions: string[]
  allergies: string[]
  dislikes: string[]
  spice_tolerance: string | null
  favorite_cuisines: string[]
  favorite_dishes: string[]
  dietary_protocols: string[]
  wine_beverage_preferences: string | null
  // Past event dietary notes (from events where this client was served)
  pastEventDietaryNotes: PastEventDietaryNote[]
}

export type PastEventDietaryNote = {
  eventId: string
  eventDate: string
  occasion: string | null
  dietary_restrictions: string[]
  allergies: string[]
}

export async function getClientDietaryContext(
  clientId: string
): Promise<ClientDietaryContext | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch client dietary info
  const { data: client, error } = await supabase
    .from('clients')
    .select(
      'id, full_name, dietary_restrictions, allergies, dislikes, spice_tolerance, favorite_cuisines, favorite_dishes, dietary_protocols, wine_beverage_preferences'
    )
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !client) return null

  // Fetch past event dietary notes (events that had dietary info set)
  const { data: events } = await supabase
    .from('events')
    .select('id, event_date, occasion, dietary_restrictions, allergies')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .order('event_date', { ascending: false })
    .limit(20)

  const pastEventDietaryNotes: PastEventDietaryNote[] = (events || [])
    .filter(
      (e: any) =>
        (e.dietary_restrictions && e.dietary_restrictions.length > 0) ||
        (e.allergies && e.allergies.length > 0)
    )
    .map((e: any) => ({
      eventId: e.id,
      eventDate: e.event_date,
      occasion: e.occasion,
      dietary_restrictions: e.dietary_restrictions || [],
      allergies: e.allergies || [],
    }))

  return {
    clientId: client.id,
    clientName: client.full_name || 'Client',
    dietary_restrictions: client.dietary_restrictions || [],
    allergies: client.allergies || [],
    dislikes: client.dislikes || [],
    spice_tolerance: client.spice_tolerance || null,
    favorite_cuisines: client.favorite_cuisines || [],
    favorite_dishes: client.favorite_dishes || [],
    dietary_protocols: client.dietary_protocols || [],
    wine_beverage_preferences: client.wine_beverage_preferences || null,
    pastEventDietaryNotes,
  }
}
