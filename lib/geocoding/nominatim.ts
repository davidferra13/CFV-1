// Nominatim (OpenStreetMap) geocoding - completely free, no API key required
// Rate limit: 1 request/second per IP; results are cached for 24h by Next.js

import { cacheGet, cacheSet } from '@/lib/cache/upstash'

const CACHE_TTL = 7 * 24 * 60 * 60 // 7 days - addresses don't move

export interface GeoPoint {
  lat: number
  lng: number
  displayName: string
}

/**
 * Geocode an address to lat/lng.
 * Cached in Upstash Redis for 7 days.
 */
export async function geocodeAddress(
  address: string,
  city?: string | null,
  state?: string | null,
  zip?: string | null
): Promise<GeoPoint | null> {
  const q = [address, city, state, zip].filter(Boolean).join(', ')
  if (!q.trim()) return null

  const cacheKey = `nominatim:${q.toLowerCase().trim()}`

  // Check Upstash cache first
  try {
    const cached = await cacheGet<GeoPoint>(cacheKey)
    if (cached !== null) return cached
  } catch {
    // Redis down - fall through to API
  }

  try {
    const params = new URLSearchParams({
      q,
      format: 'json',
      limit: '1',
      addressdetails: '0',
    })

    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: {
        'User-Agent': 'ChefFlow/1.0 (private-chef-management-platform)',
        'Accept-Language': 'en-US,en',
      },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null

    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null

    const result = data[0]
    const point: GeoPoint = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
    }

    // Store in Upstash (non-blocking)
    cacheSet(cacheKey, point, CACHE_TTL).catch(() => {})

    return point
  } catch {
    return null
  }
}
