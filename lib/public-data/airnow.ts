import { cacheFetch } from '@/lib/cache/upstash'

const AIRNOW_API_BASE = 'https://www.airnowapi.org/aq/observation/latLong/current/'
const CACHE_TTL_SECONDS = 30 * 60

export type AirQualityObservation = {
  aqi: number
  category: string
  parameter: string
  reportingArea: string | null
  stateCode: string | null
  observedAt: string | null
}

function getApiKey(): string | null {
  return process.env.AIRNOW_API_KEY ?? null
}

export async function getCurrentAirQuality(
  lat: number,
  lng: number
): Promise<AirQualityObservation | null> {
  const apiKey = getApiKey()
  if (!apiKey) return null

  const roundedLat = lat.toFixed(4)
  const roundedLng = lng.toFixed(4)

  return cacheFetch<AirQualityObservation | null>(
    `public-data:airnow:${roundedLat}:${roundedLng}`,
    CACHE_TTL_SECONDS,
    async () => {
      try {
        const params = new URLSearchParams({
          format: 'application/json',
          latitude: roundedLat,
          longitude: roundedLng,
          distance: '25',
          API_KEY: apiKey,
        })

        const res = await fetch(`${AIRNOW_API_BASE}?${params}`, {
          next: { revalidate: CACHE_TTL_SECONDS },
        })

        if (!res.ok) return null

        const json = await res.json()
        if (!Array.isArray(json) || json.length === 0) return null

        const strongest = [...json]
          .filter((entry) => Number.isFinite(Number(entry?.AQI)))
          .sort((a, b) => Number(b?.AQI ?? 0) - Number(a?.AQI ?? 0))[0]

        if (!strongest) return null

        const observedAt =
          strongest.DateObserved && strongest.HourObserved != null && strongest.LocalTimeZone
            ? `${strongest.DateObserved} ${String(strongest.HourObserved).padStart(2, '0')}:00 ${strongest.LocalTimeZone}`
            : null

        return {
          aqi: Number(strongest.AQI),
          category: String(strongest?.Category?.Name ?? 'Unknown'),
          parameter: String(strongest?.ParameterName ?? 'AQI'),
          reportingArea: strongest?.ReportingArea ?? null,
          stateCode: strongest?.StateCode ?? null,
          observedAt,
        }
      } catch {
        return null
      }
    }
  )
}

export function classifyAirQualityRiskLevel(
  observation: AirQualityObservation | null
): 'low' | 'medium' | 'high' | 'critical' {
  const aqi = observation?.aqi ?? 0
  if (aqi >= 151) return 'critical'
  if (aqi >= 101) return 'high'
  if (aqi >= 51) return 'medium'
  return 'low'
}
