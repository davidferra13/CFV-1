'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  USER_LOCATION_STORAGE_KEY,
  USER_LOCATION_COOKIE,
  USER_LOCATION_COOKIE_MAX_AGE,
  type SavedLocation,
} from './user-location'

export { type SavedLocation }

export function useUserLocation() {
  const [savedLocation, setSavedLocation] = useState<SavedLocation | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(USER_LOCATION_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as SavedLocation
        setSavedLocation(parsed)
      }
    } catch {
      // ignore parse errors
    }
    setHydrated(true)
  }, [])

  const saveLocation = useCallback((loc: SavedLocation) => {
    try {
      localStorage.setItem(USER_LOCATION_STORAGE_KEY, JSON.stringify(loc))
      const expires = new Date(Date.now() + USER_LOCATION_COOKIE_MAX_AGE * 1000).toUTCString()
      document.cookie = `${USER_LOCATION_COOKIE}=${encodeURIComponent(JSON.stringify(loc))}; path=/; expires=${expires}; SameSite=Lax`
      setSavedLocation(loc)
    } catch {
      // ignore storage errors
    }
  }, [])

  const clearLocation = useCallback(() => {
    try {
      localStorage.removeItem(USER_LOCATION_STORAGE_KEY)
      document.cookie = `${USER_LOCATION_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
      setSavedLocation(null)
    } catch {
      // ignore storage errors
    }
  }, [])

  return { savedLocation, saveLocation, clearLocation, hydrated }
}
