// Nominatim (OpenStreetMap) geocoding — completely free, no API key required
// Rate limit: 1 request/second per IP; results are cached for 24h by Next.js

export interface GeoPoint {
  lat: number
  lng: number
  displayName: string
}

export async function geocodeAddress(
  address: string,
  city?: string | null,
  state?: string | null,
  zip?: string | null
): Promise<GeoPoint | null> {
  try {
    const q = [address, city, state, zip].filter(Boolean).join(', ')
    if (!q.trim()) return null

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
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
    }
  } catch {
    return null
  }
}
