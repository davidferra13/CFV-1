'use server'

// Weather Server Actions
// Batch-fetches weather data for multiple events using the Open-Meteo API.
// Used by calendar views and event list to show compact weather indicators.

import { getEventWeather, type EventWeather } from './open-meteo'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export interface WeatherRequest {
  lat: number
  lng: number
  date: string // ISO date string YYYY-MM-DD
}

/**
 * Batch-fetch weather for multiple location+date combinations.
 * Deduplicates requests with the same lat/lng/date to avoid redundant API calls.
 * Returns a record keyed by date string. If multiple locations exist on the same date,
 * the first successful result wins (calendar views typically need one forecast per day).
 *
 * Non-blocking: never throws — returns partial results on failure.
 */
export async function getWeatherBatch(
  requests: WeatherRequest[]
): Promise<Record<string, EventWeather>> {
  if (!requests.length) return {}

  // Deduplicate by "lat,lng,date" key — same location+date only needs one API call
  const seen = new Map<string, WeatherRequest>()
  for (const req of requests) {
    // Skip requests without valid coordinates
    if (!req.lat || !req.lng || !req.date) continue
    const key = `${req.lat.toFixed(4)},${req.lng.toFixed(4)},${req.date}`
    if (!seen.has(key)) seen.set(key, req)
  }

  const unique = Array.from(seen.values())
  const results: Record<string, EventWeather> = {}

  // Fetch all in parallel — each call has its own try/catch inside getEventWeather
  const settled = await Promise.allSettled(
    unique.map(async (req) => {
      const weather = await getEventWeather(req.lat, req.lng, req.date)
      return { date: req.date, weather }
    })
  )

  for (const result of settled) {
    if (result.status === 'fulfilled' && result.value.weather) {
      const { date, weather } = result.value
      // First result for a date wins (don't overwrite)
      if (!results[date]) {
        results[date] = weather
      }
    }
  }

  return results
}

/**
 * Fetch weather for a single date+location.
 * Convenience wrapper for the day view.
 * Returns null silently on any failure.
 */
export async function getWeatherForDate(
  lat: number,
  lng: number,
  date: string
): Promise<EventWeather | null> {
  try {
    return await getEventWeather(lat, lng, date)
  } catch {
    return null
  }
}

/**
 * Fetch weather for all events in a date range that have coordinates.
 * Queries the events table for location_lat/lng, then batch-fetches weather.
 * Returns a record keyed by ISO date string (YYYY-MM-DD).
 *
 * Non-blocking: returns empty object on any failure.
 */
export async function getWeatherForDateRange(
  startDate: string,
  endDate: string
): Promise<Record<string, EventWeather>> {
  try {
    const user = await requireChef()
    const supabase = createServerClient()

    const { data: events } = await supabase
      .from('events')
      .select('event_date, location_lat, location_lng')
      .eq('tenant_id', user.tenantId!)
      .not('status', 'in', '("cancelled")')
      .gte('event_date', startDate)
      .lte('event_date', endDate)
      .not('location_lat', 'is', null)
      .not('location_lng', 'is', null)

    if (!events || events.length === 0) return {}

    const requests: WeatherRequest[] = events.map((e) => ({
      lat: e.location_lat!,
      lng: e.location_lng!,
      date: e.event_date,
    }))

    return await getWeatherBatch(requests)
  } catch {
    return {}
  }
}

/**
 * Fetch weather for a list of events (used by the events list page).
 * Accepts pre-fetched event data to avoid a redundant DB query.
 * Only fetches weather for events within 16 days that have coordinates.
 *
 * Returns a record keyed by event ID for precise matching.
 */
export async function getWeatherForEvents(
  events: Array<{
    id: string
    event_date: string
    location_lat: number | null
    location_lng: number | null
  }>
): Promise<Record<string, EventWeather>> {
  try {
    const now = new Date()
    const maxDate = new Date(now)
    maxDate.setDate(now.getDate() + 16)
    const maxDateStr = maxDate.toISOString().split('T')[0]

    // Filter to events within 16 days that have coordinates
    const eligible = events.filter(
      (e) => e.location_lat != null && e.location_lng != null && e.event_date <= maxDateStr
    )

    if (eligible.length === 0) return {}

    // Build weather requests
    const requests: WeatherRequest[] = eligible.map((e) => ({
      lat: e.location_lat!,
      lng: e.location_lng!,
      date: e.event_date,
    }))

    const weatherByDate = await getWeatherBatch(requests)

    // Re-key by event ID (multiple events on same date get same weather)
    const result: Record<string, EventWeather> = {}
    for (const e of eligible) {
      const w = weatherByDate[e.event_date]
      if (w) result[e.id] = w
    }

    return result
  } catch {
    return {}
  }
}
