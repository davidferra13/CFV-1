// Solar Times - Pure utility functions for sunrise, sunset, and golden hour
// Uses Open-Meteo daily endpoint (already fetched with sunrise/sunset fields)

import { fetchForecast } from './open-meteo'

// ── Types ───────────────────────────────────────────────────────────────────

export interface SolarTimes {
  /** ISO 8601 datetime for sunrise (e.g. "2026-05-16T05:23") */
  sunrise: string
  /** ISO 8601 datetime for sunset (e.g. "2026-05-16T20:12") */
  sunset: string
  /** ISO 8601 datetime for golden hour start (roughly 1 hour before sunset) */
  goldenHourStart: string
  /** ISO 8601 datetime for golden hour end (sunset itself) */
  goldenHourEnd: string
  /** Total daylight in minutes */
  dayLengthMinutes: number
  /** Formatted sunrise time, e.g. "5:23 AM" */
  sunriseFormatted: string
  /** Formatted sunset time, e.g. "8:12 PM" */
  sunsetFormatted: string
  /** Formatted golden hour start, e.g. "7:12 PM" */
  goldenHourFormatted: string
}

// ── Core Functions ──────────────────────────────────────────────────────────

/**
 * Fetch sunrise, sunset, and golden hour for a given location and date.
 * Returns null if the date is outside the forecast window or API fails.
 */
export async function getSolarTimes(
  lat: number,
  lng: number,
  date: string // YYYY-MM-DD
): Promise<SolarTimes | null> {
  try {
    const result = await fetchForecast(lat, lng)
    const dayMatch = result.forecasts.find((f) => f.date === date)
    if (!dayMatch?.sunrise || !dayMatch?.sunset) return null

    const sunriseMs = new Date(dayMatch.sunrise).getTime()
    const sunsetMs = new Date(dayMatch.sunset).getTime()

    if (isNaN(sunriseMs) || isNaN(sunsetMs)) return null

    const dayLengthMinutes = Math.round((sunsetMs - sunriseMs) / 60_000)
    const goldenHourStart = getGoldenHourStart(dayMatch.sunset)

    return {
      sunrise: dayMatch.sunrise,
      sunset: dayMatch.sunset,
      goldenHourStart,
      goldenHourEnd: dayMatch.sunset,
      dayLengthMinutes,
      sunriseFormatted: formatSolarTime(dayMatch.sunrise),
      sunsetFormatted: formatSolarTime(dayMatch.sunset),
      goldenHourFormatted: formatSolarTime(goldenHourStart),
    }
  } catch {
    return null
  }
}

/**
 * Calculate golden hour start time (approximately 60 minutes before sunset).
 * Returns ISO 8601 datetime string.
 */
export function getGoldenHourStart(sunsetIso: string): string {
  const sunsetMs = new Date(sunsetIso).getTime()
  const goldenMs = sunsetMs - 60 * 60_000 // 60 minutes before sunset
  return new Date(goldenMs).toISOString().slice(0, 16) // trim seconds
}

/**
 * Heuristic check: does this event appear to be outdoors?
 * Checks venue_type, notes, tags, and title for outdoor indicators.
 */
export function isOutdoorEvent(event: {
  venue_type?: string | null
  notes?: string | null
  tags?: string[] | null
  title?: string | null
  weather_exposure?: string | null
}): boolean {
  // Explicit weather_exposure field takes priority
  if (event.weather_exposure === 'outdoor' || event.weather_exposure === 'partial') {
    return true
  }
  if (event.weather_exposure === 'indoor') {
    return false
  }

  const outdoorKeywords = [
    'outdoor',
    'outside',
    'garden',
    'patio',
    'backyard',
    'rooftop',
    'terrace',
    'deck',
    'lawn',
    'farm',
    'vineyard',
    'poolside',
    'beach',
    'park',
    'picnic',
    'tent',
    'al fresco',
    'open air',
  ]

  const searchText = [
    event.venue_type,
    event.notes,
    event.title,
    ...(event.tags ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return outdoorKeywords.some((kw) => searchText.includes(kw))
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Format an ISO datetime like "2026-05-16T20:12" to "8:12 PM".
 */
function formatSolarTime(iso: string): string {
  const timePart = iso.split('T')[1]
  if (!timePart) return iso
  const [hStr, mStr] = timePart.split(':')
  const h = parseInt(hStr, 10)
  const m = mStr ?? '00'
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${m} ${period}`
}
