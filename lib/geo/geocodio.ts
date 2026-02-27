// Geocodio — free geocoding + address autocomplete (US + Canada)
// https://www.geocod.io/
// 2,500 requests/day free, no credit card

const GEOCODIO_BASE = 'https://api.geocod.io/v1.7'

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
 */
export async function geocodeAddress(address: string): Promise<GeocodioResult | null> {
  try {
    const params = new URLSearchParams({
      q: address,
      api_key: getApiKey(),
    })
    const res = await fetch(`${GEOCODIO_BASE}/geocode?${params}`, {
      next: { revalidate: 86400 }, // cache 24h — addresses don't move
    })
    if (!res.ok) return null
    const data: GeocodeResponse = await res.json()
    return data.results?.[0] ?? null
  } catch {
    return null
  }
}

/**
 * Reverse geocode — lat/lng to address.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodioResult | null> {
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
    return data.results?.[0] ?? null
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
