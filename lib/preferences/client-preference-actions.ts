// Client Preference Actions - Self-service dietary/allergy/preference management
// Reads and writes to hub_guest_profiles (the same table chef-side reads)

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

export type ClientPreferences = {
  dietary_restrictions: string[]
  allergies: string[]
  dislikes: string[]
  favorites: string[]
  spice_tolerance: string | null
  cuisine_preferences: string[]
}

/**
 * Resolve the hub_guest_profile for this client, creating one if needed.
 */
async function resolveProfile(db: any, clientId: string) {
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select(
      'id, known_dietary, known_allergies, dislikes, favorites, spice_tolerance, cuisine_preferences'
    )
    .eq('client_id', clientId)
    .maybeSingle()

  if (profile) return profile

  // Auto-create
  const { data: client } = await db
    .from('clients')
    .select('full_name, email, tenant_id')
    .eq('id', clientId)
    .single()

  if (!client) throw new Error('Client record not found')

  const { data: newProfile, error } = await db
    .from('hub_guest_profiles')
    .insert({
      client_id: clientId,
      tenant_id: client.tenant_id,
      display_name: client.full_name || 'Guest',
      email: client.email,
      profile_token: crypto.randomUUID(),
    })
    .select(
      'id, known_dietary, known_allergies, dislikes, favorites, spice_tolerance, cuisine_preferences'
    )
    .single()

  if (error) throw new Error(`Failed to create profile: ${error.message}`)
  return newProfile
}

export async function getMyPreferences(): Promise<ClientPreferences> {
  const user = await requireClient()
  const db: any = createServerClient()
  const profile = await resolveProfile(db, user.entityId)

  return {
    dietary_restrictions: profile.known_dietary || [],
    allergies: profile.known_allergies || [],
    dislikes: profile.dislikes || [],
    favorites: profile.favorites || [],
    spice_tolerance: profile.spice_tolerance || null,
    cuisine_preferences: profile.cuisine_preferences || [],
  }
}

export async function updateMyPreferences(prefs: ClientPreferences) {
  const user = await requireClient()
  const db: any = createServerClient()
  const profile = await resolveProfile(db, user.entityId)

  const { error } = await db
    .from('hub_guest_profiles')
    .update({
      known_dietary: prefs.dietary_restrictions,
      known_allergies: prefs.allergies,
      dislikes: prefs.dislikes,
      favorites: prefs.favorites,
      spice_tolerance: prefs.spice_tolerance || null,
      cuisine_preferences: prefs.cuisine_preferences,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id)

  if (error) {
    console.error('[updateMyPreferences] Update failed:', error)
    throw new Error('Failed to save preferences')
  }

  revalidatePath('/my-preferences')
  return { success: true }
}
