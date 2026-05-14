'use server'

import { createAdminClient } from '@/lib/db/admin'
import { resolvePublicLocationQuery } from '@/lib/geo/public-location'
import { detectMyLocation } from '@/lib/geo/geo-actions'
import { requireAuth, getCurrentUser } from '@/lib/auth/get-user'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AccountLocation = {
  zip: string
  city: string | null
  state: string | null
  lat: number | null
  lng: number | null
  radiusMiles: number
  source: string
}

// ---------------------------------------------------------------------------
// Core CRUD
// ---------------------------------------------------------------------------

/** Read a user's saved default location. Returns null when none exists. */
// SECURITY: authUserId param kept for caller compatibility but IGNORED.
// userId is always derived from the authenticated session to prevent IDOR.
export async function getAccountLocation(_authUserId?: string): Promise<AccountLocation | null> {
  const user = await requireAuth()
  const db: any = createAdminClient()
  const { data, error } = await db
    .from('user_location_defaults')
    .select('zip, city, state, lat, lng, radius_miles, source')
    .eq('auth_user_id', user.authUserId)
    .single()

  if (error || !data) return null
  return {
    zip: data.zip,
    city: data.city ?? null,
    state: data.state ?? null,
    lat: data.lat ?? null,
    lng: data.lng ?? null,
    radiusMiles: data.radius_miles,
    source: data.source,
  }
}

/** Geocode a zip, upsert the user's default location, and return it. */
// SECURITY: _authUserId param kept for caller compatibility but IGNORED.
// userId is always derived from the authenticated session to prevent IDOR.
export async function setAccountLocation(
  _authUserId: string,
  zip: string,
  radiusMiles = 25
): Promise<AccountLocation> {
  const user = await requireAuth()
  const geo = await resolvePublicLocationQuery(zip)
  const city = geo.data?.city ?? null
  const state = geo.data?.state ?? null
  const lat = geo.data?.lat ?? null
  const lng = geo.data?.lng ?? null

  const db: any = createAdminClient()
  const { error } = await db.from('user_location_defaults').upsert(
    {
      auth_user_id: user.authUserId,
      zip,
      city,
      state,
      lat,
      lng,
      radius_miles: radiusMiles,
      source: 'manual',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'auth_user_id' }
  )

  if (error) throw new Error('Failed to save location: ' + error.message)

  return { zip, city, state, lat, lng, radiusMiles, source: 'manual' }
}

/** Update only the search radius for a user. */
// SECURITY: _authUserId param kept for caller compatibility but IGNORED.
// userId is always derived from the authenticated session to prevent IDOR.
export async function updateAccountRadius(_authUserId: string, radiusMiles: number): Promise<void> {
  const user = await requireAuth()
  const db: any = createAdminClient()
  const { error } = await db
    .from('user_location_defaults')
    .update({ radius_miles: radiusMiles, updated_at: new Date().toISOString() })
    .eq('auth_user_id', user.authUserId)

  if (error) throw new Error('Failed to update radius: ' + error.message)
}

// ---------------------------------------------------------------------------
// Session-aware resolvers
// ---------------------------------------------------------------------------

/** Resolve the current authenticated user's saved location. Returns null if not signed in. */
export async function resolveCurrentUserLocation(): Promise<AccountLocation | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const db: any = createAdminClient()
  const { data, error } = await db
    .from('user_location_defaults')
    .select('zip, city, state, lat, lng, radius_miles, source')
    .eq('auth_user_id', user.authUserId)
    .single()

  if (error || !data) return null
  return {
    zip: data.zip,
    city: data.city ?? null,
    state: data.state ?? null,
    lat: data.lat ?? null,
    lng: data.lng ?? null,
    radiusMiles: data.radius_miles,
    source: data.source,
  }
}

/** Try saved location first, then IP detection. Signals when user needs prompting. */
export async function getLocationOrDetect(): Promise<{
  location: AccountLocation | null
  needsPrompt: boolean
}> {
  const saved = await resolveCurrentUserLocation()
  if (saved) return { location: saved, needsPrompt: false }

  const detected = await detectMyLocation()
  if (detected?.zip) {
    return {
      location: {
        zip: detected.zip,
        city: detected.city ?? null,
        state: detected.regionName ?? null,
        lat: null,
        lng: null,
        radiusMiles: 25,
        source: 'ip-detect',
      },
      needsPrompt: true,
    }
  }

  return { location: null, needsPrompt: true }
}
