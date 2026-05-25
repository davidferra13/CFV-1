'use server'

// Nearby Stores - proxies Google Places API for grocery stores near event venue.
// If no API key is configured, returns empty with a setup message.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ── Types ──────────────────────────────────────────────────────────────────

export interface NearbyStore {
  name: string
  address: string
  distanceMiles: number | null
  isOpen: boolean | null
  mapsUrl: string
}

export interface NearbyStoresResult {
  stores: NearbyStore[]
  message: string | null
}

// ── Haversine distance (miles) ─────────────────────────────────────────────

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959 // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// ── Main action ────────────────────────────────────────────────────────────

export async function getNearbyStores(eventId: string): Promise<NearbyStoresResult> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select('id, tenant_id, location_lat, location_lng')
    .eq('id', eventId)
    .eq('tenant_id', chef.tenantId!)
    .single()

  if (!event) return { stores: [], message: 'Event not found' }
  if (!event.location_lat || !event.location_lng) {
    return { stores: [], message: 'Add an event address to find nearby stores' }
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return {
      stores: [],
      message:
        'Google Places API key not configured. Add GOOGLE_PLACES_API_KEY to your environment to enable nearby store search.',
    }
  }

  try {
    const lat = event.location_lat
    const lng = event.location_lng
    const radius = 8047 // ~5 miles in meters

    const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
    url.searchParams.set('location', `${lat},${lng}`)
    url.searchParams.set('radius', String(radius))
    url.searchParams.set('type', 'supermarket')
    url.searchParams.set('key', apiKey)

    const res = await fetch(url.toString(), {
      next: { revalidate: 86400 }, // 24h cache
    })

    if (!res.ok) {
      return { stores: [], message: 'Store search temporarily unavailable' }
    }

    const data = await res.json()
    const results = (data.results ?? []).slice(0, 5)

    const stores: NearbyStore[] = results.map((place: any) => {
      const placeLat = place.geometry?.location?.lat
      const placeLng = place.geometry?.location?.lng
      const dist =
        placeLat && placeLng
          ? Math.round(haversineDistance(lat, lng, placeLat, placeLng) * 10) / 10
          : null

      return {
        name: place.name ?? 'Unknown Store',
        address: place.vicinity ?? '',
        distanceMiles: dist,
        isOpen: place.opening_hours?.open_now ?? null,
        mapsUrl: `https://www.google.com/maps/dir/${lat},${lng}/${encodeURIComponent(place.name + ' ' + (place.vicinity ?? ''))}`,
      }
    })

    // Sort by distance
    stores.sort((a, b) => (a.distanceMiles ?? 99) - (b.distanceMiles ?? 99))

    return { stores, message: null }
  } catch (err) {
    console.error('[nearby-stores] Error:', err)
    return { stores: [], message: 'Store search temporarily unavailable' }
  }
}
