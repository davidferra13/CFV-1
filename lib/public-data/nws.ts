import { cacheFetch } from '@/lib/cache/upstash'

const NWS_API_BASE = 'https://api.weather.gov'
const CACHE_TTL_SECONDS = 15 * 60

export type NwsAlert = {
  id: string
  event: string
  headline: string
  severity: string | null
  urgency: string | null
  certainty: string | null
  effective: string | null
  ends: string | null
  areaDesc: string | null
  instruction: string | null
}

function getUserAgent(): string {
  return process.env.WEATHER_GOV_USER_AGENT || 'ChefFlow/1.0 (ops@cheflowhq.com)'
}

export async function getNwsActiveAlerts(lat: number, lng: number): Promise<NwsAlert[]> {
  const roundedLat = lat.toFixed(4)
  const roundedLng = lng.toFixed(4)

  return cacheFetch<NwsAlert[]>(
    `public-data:nws-alerts:${roundedLat}:${roundedLng}`,
    CACHE_TTL_SECONDS,
    async () => {
      try {
        const params = new URLSearchParams({
          point: `${roundedLat},${roundedLng}`,
        })

        const res = await fetch(`${NWS_API_BASE}/alerts/active?${params}`, {
          headers: {
            'User-Agent': getUserAgent(),
            Accept: 'application/geo+json',
          },
          next: { revalidate: CACHE_TTL_SECONDS },
        })

        if (!res.ok) return []

        const json = await res.json()
        const features = Array.isArray(json?.features) ? json.features : []

        return features.map((feature: any) => ({
          id: String(feature?.id ?? crypto.randomUUID()),
          event: String(feature?.properties?.event ?? 'Weather alert'),
          headline: String(
            feature?.properties?.headline ??
              feature?.properties?.event ??
              'National Weather Service alert'
          ),
          severity: feature?.properties?.severity ?? null,
          urgency: feature?.properties?.urgency ?? null,
          certainty: feature?.properties?.certainty ?? null,
          effective: feature?.properties?.effective ?? null,
          ends: feature?.properties?.ends ?? null,
          areaDesc: feature?.properties?.areaDesc ?? null,
          instruction: feature?.properties?.instruction ?? null,
        }))
      } catch {
        return []
      }
    }
  )
}
