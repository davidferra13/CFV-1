// Geocodio — free geocoding + address autocomplete (US + Canada)
// https://www.geocod.io/
// 2,500 requests/day free, no credit card

import { cacheGet, cacheSet } from '@/lib/cache/upstash'

const GEOCODIO_BASE = 'https://api.geocod.io/v1.7'
const CACHE_TTL = 7 * 24 * 60 * 60 // 7 days — addresses don't move

export interface GeocodioResult {
  formatted_address: string
  location: {
    lat: number
    lng: number
  }
  address_components: {
    number?: string
    street?: string
    suffix?: string
    city?: string
    county?: string
    state?: string
    zip?: string
    country?: string
  }
  accuracy: number
  accuracy_type: string
}

export interface GeocodeResponse {
  results: GeocodioResult[]
}

function getApiKey(): string {
  const key = process.env.GEOCODIO_API_KEY
  if (!key) throw new Error('GEOCODIO_API_KEY not set in .env.local')
  return key
}

/**
 * Forward geocode — address string to lat/lng.
 * Great for converting event addresses to coordinates.
 * Cached in Upstash Redis for 7 days.
 */
export async function geocodeAddress(address: string): Promise<GeocodioResult | null> {
  const cacheKey = `geocodio:fwd:${address.toLowerCase().trim()}`

  // Check Upstash cache first
  try {
    const cached = await cacheGet<GeocodioResult>(cacheKey)
    if (cached !== null) return cached
  } catch {
    // Redis down — fall through to API
  }

  try {
    const params = new URLSearchParams({
      q: address,
      api_key: getApiKey(),
    })
    const res = await fetch(`${GEOCODIO_BASE}/geocode?${params}`, {
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data: GeocodeResponse = await res.json()
    const result = data.results?.[0] ?? null

    // Store in Upstash (non-blocking — don't await in critical path)
    if (result) {
      cacheSet(cacheKey, result, CACHE_TTL).catch(() => {})
    }

    return result
  } catch {
    return null
  }
}

/**
 * Reverse geocode — lat/lng to address.
 * Cached in Upstash Redis for 7 days.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodioResult | null> {
  const cacheKey = `geocodio:rev:${lat.toFixed(6)},${lng.toFixed(6)}`

  try {
    const cached = await cacheGet<GeocodioResult>(cacheKey)
    if (cached !== null) return cached
  } catch {
    // Redis down — fall through to API
  }

  try {
    const params = new URLSearchParams({
      q: `${lat},${lng}`,
      api_key: getApiKey(),
    })
    const res = await fetch(`${GEOCODIO_BASE}/reverse?${params}`, {
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data: GeocodeResponse = await res.json()
    const result = data.results?.[0] ?? null

    if (result) {
      cacheSet(cacheKey, result, CACHE_TTL).catch(() => {})
    }

    return result
  } catch {
    return null
  }
}

/**
 * Batch geocode — multiple addresses at once.
 * Useful for importing client lists with addresses.
 * Max 10,000 addresses per batch.
 */
export async function batchGeocode(addresses: string[]): Promise<(GeocodioResult | null)[]> {
  if (addresses.length === 0) return []

  try {
    const res = await fetch(`${GEOCODIO_BASE}/geocode?api_key=${getApiKey()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addresses),
    })
    if (!res.ok) return addresses.map(() => null)
    const data = await res.json()
    return (data.results ?? []).map((r: any) => r?.response?.results?.[0] ?? null)
  } catch {
    return addresses.map(() => null)
  }
}
