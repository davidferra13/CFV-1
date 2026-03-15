'use server'

import { detectMyLocation } from '@/lib/geo/geo-actions'
import { formatLocationQueryValue, reverseResolvePublicLocation } from '@/lib/geo/public-location'

type DirectoryLocationActionResult = {
  query: string
  label: string
  approximate: boolean
  source: 'current' | 'approximate'
} | null

function toApproximateLocationResult(): Promise<DirectoryLocationActionResult> {
  return detectMyLocation().then((location) => {
    if (!location) return null

    const query =
      formatLocationQueryValue({
        city: location.city,
        state: location.regionName || location.region,
        zip: location.zip,
      }) || null

    if (!query) return null

    return {
      query,
      label: query,
      approximate: true,
      source: 'approximate',
    }
  })
}

export async function resolveCurrentDirectoryLocation(
  latitude: number,
  longitude: number
): Promise<DirectoryLocationActionResult> {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null
  }

  const resolved = await reverseResolvePublicLocation(latitude, longitude)
  if (resolved) {
    return {
      query: resolved.query,
      label: resolved.displayLabel,
      approximate: false,
      source: 'current',
    }
  }

  return toApproximateLocationResult()
}

export async function detectApproximateDirectoryLocation(): Promise<DirectoryLocationActionResult> {
  return toApproximateLocationResult()
}
