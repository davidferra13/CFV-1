import 'server-only'

import { cookies } from 'next/headers'
import { USER_LOCATION_COOKIE, type SavedLocation } from './user-location'

/**
 * Reads the saved user location from the cf-loc cookie.
 * Set client-side by useUserLocation hook after first search.
 * Returns null if no location has been saved or cookie is malformed.
 */
export async function getServerSavedLocation(): Promise<SavedLocation | null> {
  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get(USER_LOCATION_COOKIE)?.value
    if (!raw) return null
    const parsed = JSON.parse(decodeURIComponent(raw))
    if (
      typeof parsed !== 'object' ||
      typeof parsed.displayLabel !== 'string' ||
      typeof parsed.lat !== 'number' ||
      typeof parsed.lng !== 'number'
    ) {
      return null
    }
    return parsed as SavedLocation
  } catch {
    return null
  }
}
