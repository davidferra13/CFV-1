// Mapbox — maps, geocoding, directions
// https://www.mapbox.com/
// 50K map loads/month free (card on file)
// Google Maps alternative — better free tier

const MAPBOX_BASE = 'https://api.mapbox.com'

function getAccessToken(): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) throw new Error('NEXT_PUBLIC_MAPBOX_TOKEN not set')
  return token
}

/**
 * Get a static map image URL.
 * Use directly in <img> tags — no JavaScript SDK needed.
 *
 * @param lng - Longitude
 * @param lat - Latitude
 * @param zoom - Zoom level (0-22, default 14)
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param style - Map style (default streets)
 */
export function getStaticMapUrl(
  lng: number,
  lat: number,
  zoom = 14,
  width = 600,
  height = 400,
  style: 'streets-v12' | 'satellite-v9' | 'light-v11' | 'dark-v11' = 'streets-v12'
): string {
  const token = getAccessToken()
  // Pin marker at the location
  const pin = `pin-s+e88f47(${lng},${lat})`
  return `${MAPBOX_BASE}/styles/v1/mapbox/${style}/static/${pin}/${lng},${lat},${zoom}/${width}x${height}@2x?access_token=${token}`
}

/**
 * Forward geocode — address to coordinates.
 * Alternative to Geocodio for non-US/Canada addresses.
 */
export async function geocode(
  address: string
): Promise<{ lng: number; lat: number; placeName: string } | null> {
  try {
    const token = getAccessToken()
    const res = await fetch(
      `${MAPBOX_BASE}/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}&limit=1`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const feature = data.features?.[0]
    if (!feature) return null

    return {
      lng: feature.center[0],
      lat: feature.center[1],
      placeName: feature.place_name ?? '',
    }
  } catch {
    return null
  }
}

/**
 * Get driving directions between two points.
 * Returns distance (meters) and duration (seconds).
 */
export async function getDirections(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number
): Promise<{
  distanceMeters: number
  distanceMiles: number
  durationSeconds: number
  durationMinutes: number
} | null> {
  try {
    const token = getAccessToken()
    const res = await fetch(
      `${MAPBOX_BASE}/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}?access_token=${token}`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const route = data.routes?.[0]
    if (!route) return null

    return {
      distanceMeters: route.distance,
      distanceMiles: Math.round((route.distance / 1609.34) * 10) / 10,
      durationSeconds: route.duration,
      durationMinutes: Math.round(route.duration / 60),
    }
  } catch {
    return null
  }
}

/**
 * Get a static map URL for an event location.
 * Uses the ChefFlow brand color for the pin.
 */
export function getEventMapUrl(lng: number, lat: number, width = 800, height = 400): string {
  return getStaticMapUrl(lng, lat, 14, width, height, 'streets-v12')
}
