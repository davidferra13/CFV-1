// Location Server Actions
// Saves zip code for authenticated or public users.

'use server'

import { getCurrentUser } from '@/lib/auth/get-user'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { setAccountLocation } from '@/lib/location/account-location'
import type { AccountLocation } from '@/lib/location/account-location'

const ZipSchema = z.string().regex(/^\d{5}$/, 'Zip must be exactly 5 digits')

const COOKIE_NAME = 'cf_default_zip'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export type LocationResult = {
  success: boolean
  zip: string | null
  location?: AccountLocation | null
  error?: string
}

/**
 * Save a zip code for the current user.
 * Authenticated: writes to user_location_defaults via setAccountLocation.
 * Public: sets httpOnly cookie.
 */
export async function saveUserLocation(zip: string): Promise<LocationResult> {
  const parsed = ZipSchema.safeParse(zip)
  if (!parsed.success) {
    return { success: false, zip: null, error: 'Invalid zip code' }
  }

  const user = await getCurrentUser()

  if (user) {
    try {
      const location = await setAccountLocation(user.id, parsed.data)
      return { success: true, zip: parsed.data, location }
    } catch (err) {
      console.error('[saveUserLocation] DB write failed:', err)
      return { success: false, zip: null, error: 'Failed to save location' }
    }
  }

  // Public path: cookie only
  const jar = await cookies()
  jar.set(COOKIE_NAME, JSON.stringify({ zip: parsed.data }), {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })

  return { success: true, zip: parsed.data }
}
