import { cacheFetch } from '@/lib/cache/upstash'
import {
  buildUsAddressLine,
  normalizeCity,
  normalizeStateCode,
  normalizeZip,
} from '@/lib/public-data/location-normalization'

const CENSUS_GEOCODER_BASE = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress'
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60

export type CensusGeocodeResult = {
  lat: number
  lng: number
  matchedAddress: string
  city: string | null
  state: string | null
  zip: string | null
  county: string | null
  source: 'census'
}

type CensusAddressMatch = {
  matchedAddress?: string
  coordinates?: {
    x?: number
    y?: number
  }
  addressComponents?: {
    city?: string
    state?: string
    zip?: string
  }
  geographies?: {
    Counties?: Array<{ NAME?: string }>
  }
}

function getUserAgent(): string {
  return process.env.WEATHER_GOV_USER_AGENT || 'ChefFlow/1.0 (ops@cheflowhq.com)'
}

export async function geocodeUsAddress(parts: {
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
}): Promise<CensusGeocodeResult | null> {
  const query = buildUsAddressLine(parts)
  if (!query) return null

  return cacheFetch<CensusGeocodeResult | null>(
    `public-data:census:${query.toLowerCase()}`,
    CACHE_TTL_SECONDS,
    async () => {
      const params = new URLSearchParams({
        address: query,
        benchmark: 'Public_AR_Current',
        format: 'json',
      })

      try {
        const res = await fetch(`${CENSUS_GEOCODER_BASE}?${params}`, {
          headers: {
            'User-Agent': getUserAgent(),
          },
          next: { revalidate: CACHE_TTL_SECONDS },
        })

        if (!res.ok) return null

        const json = await res.json()
        const match = (json?.result?.addressMatches?.[0] ?? null) as CensusAddressMatch | null

        const lat = Number(match?.coordinates?.y)
        const lng = Number(match?.coordinates?.x)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

        return {
          lat,
          lng,
          matchedAddress: String(match?.matchedAddress ?? query),
          city: normalizeCity(match?.addressComponents?.city ?? null),
          state: normalizeStateCode(match?.addressComponents?.state ?? null),
          zip: normalizeZip(match?.addressComponents?.zip ?? null),
          county: match?.geographies?.Counties?.[0]?.NAME ?? null,
          source: 'census',
        }
      } catch {
        return null
      }
    }
  )
}
