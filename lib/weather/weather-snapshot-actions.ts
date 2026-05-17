'use server'

// Weather Snapshot Actions
// Capture and retrieve weather conditions for events.
// Snapshot capture is designed to be non-blocking (callers wrap in try/catch).

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getEventWeather, fetchForecast } from './open-meteo'

export interface WeatherSnapshot {
  id: string
  eventId: string
  forecastHighF: number | null
  forecastLowF: number | null
  condition: string | null
  precipProbability: number | null
  windSpeedMph: number | null
  actualNotes: string | null
  capturedAt: string
}

/**
 * Capture a weather snapshot for a completed event.
 * Fetches weather from Open-Meteo (historical or recent forecast) and stores it.
 * Idempotent: if a snapshot already exists for this event, it is skipped.
 *
 * Requires event to have venue coordinates (location_lat/lng).
 * Non-blocking by design: callers should wrap in try/catch.
 */
export async function captureWeatherSnapshot(
  tenantId: string,
  eventId: string
): Promise<{ captured: boolean; error?: string }> {
  try {
    const db: any = createServerClient({ admin: true })

    // Check if snapshot already exists (idempotency)
    const { data: existing } = await db
      .from('event_weather_snapshots')
      .select('id')
      .eq('event_id', eventId)
      .maybeSingle()

    if (existing) {
      return { captured: false, error: 'Snapshot already exists' }
    }

    // Fetch event to get coordinates and date
    const { data: event, error: eventError } = await db
      .from('events')
      .select('event_date, location_lat, location_lng')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single()

    if (eventError || !event) {
      return { captured: false, error: 'Event not found' }
    }

    // Only capture for events with venue coordinates
    if (event.location_lat == null || event.location_lng == null) {
      return { captured: false, error: 'No venue coordinates' }
    }

    // Try fetchForecast first (returns DailyForecast with precip + wind data).
    // Falls back to getEventWeather for historical dates beyond forecast range.
    const eventDateStr = typeof event.event_date === 'string'
      ? event.event_date
      : new Date(event.event_date).toISOString().slice(0, 10)

    let highF: number | null = null
    let lowF: number | null = null
    let condition: string | null = null
    let precipProb: number | null = null
    let windMph: number | null = null

    // Attempt DailyForecast (has all fields)
    const forecastResult = await fetchForecast(event.location_lat, event.location_lng)
    const dayMatch = forecastResult.forecasts.find((f) => f.date === eventDateStr)

    if (dayMatch) {
      highF = dayMatch.tempHighF
      lowF = dayMatch.tempLowF
      condition = dayMatch.condition
      precipProb = dayMatch.precipProbability
      windMph = dayMatch.windSpeedMph
    } else {
      // Fallback: historical/archive API (no precip/wind, but gets temps)
      const weatherResult = await getEventWeather(
        event.location_lat,
        event.location_lng,
        event.event_date
      )
      if (weatherResult.data) {
        highF = weatherResult.data.tempMaxF
        lowF = weatherResult.data.tempMinF
        condition = weatherResult.data.description
      }
    }

    if (highF == null && condition == null) {
      // Store a partial snapshot with no weather data (marks that capture was attempted)
      await db.from('event_weather_snapshots').insert({
        tenant_id: tenantId,
        event_id: eventId,
        condition: 'unavailable',
        captured_at: new Date().toISOString(),
      })
      return { captured: true, error: 'Weather data unavailable, partial snapshot stored' }
    }

    await db.from('event_weather_snapshots').insert({
      tenant_id: tenantId,
      event_id: eventId,
      forecast_high_f: highF,
      forecast_low_f: lowF,
      condition,
      precip_probability: precipProb,
      wind_speed_mph: windMph,
      captured_at: new Date().toISOString(),
    })

    return { captured: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[weather-snapshot] Capture failed:', msg)
    return { captured: false, error: msg }
  }
}

/**
 * Retrieve the weather snapshot for an event.
 * Auth: requireChef(), tenant-scoped.
 */
export async function getWeatherSnapshot(
  eventId: string
): Promise<WeatherSnapshot | null> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()

    const { data, error } = await db
      .from('event_weather_snapshots')
      .select('id, event_id, forecast_high_f, forecast_low_f, condition, precip_probability, wind_speed_mph, actual_notes, captured_at')
      .eq('event_id', eventId)
      .eq('tenant_id', user.tenantId!)
      .maybeSingle()

    if (error || !data) return null

    return {
      id: data.id,
      eventId: data.event_id,
      forecastHighF: data.forecast_high_f,
      forecastLowF: data.forecast_low_f,
      condition: data.condition,
      precipProbability: data.precip_probability,
      windSpeedMph: data.wind_speed_mph,
      actualNotes: data.actual_notes,
      capturedAt: data.captured_at,
    }
  } catch {
    return null
  }
}

/**
 * Add or update the chef's actual weather notes on a snapshot.
 * Lets the chef record what really happened vs. what the forecast said.
 * Auth: requireChef(), tenant-scoped.
 */
export async function addWeatherNotes(
  eventId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()

    const { error } = await db
      .from('event_weather_snapshots')
      .update({ actual_notes: notes })
      .eq('event_id', eventId)
      .eq('tenant_id', user.tenantId!)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: msg }
  }
}

/**
 * Retrieve weather history across events for a tenant within a date range.
 * Auth: requireChef(), tenant-scoped.
 */
export async function getWeatherHistory(
  dateRange?: { from: string; to: string }
): Promise<WeatherSnapshot[]> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()

    let query = db
      .from('event_weather_snapshots')
      .select('id, event_id, forecast_high_f, forecast_low_f, condition, precip_probability, wind_speed_mph, actual_notes, captured_at')
      .eq('tenant_id', user.tenantId!)
      .order('captured_at', { ascending: false })

    if (dateRange?.from) {
      query = query.gte('captured_at', dateRange.from)
    }
    if (dateRange?.to) {
      query = query.lte('captured_at', dateRange.to)
    }

    const { data, error } = await query

    if (error || !data) return []

    return (data as any[]).map((row) => ({
      id: row.id,
      eventId: row.event_id,
      forecastHighF: row.forecast_high_f,
      forecastLowF: row.forecast_low_f,
      condition: row.condition,
      precipProbability: row.precip_probability,
      windSpeedMph: row.wind_speed_mph,
      actualNotes: row.actual_notes,
      capturedAt: row.captured_at,
    }))
  } catch {
    return []
  }
}
