'use server'

// Pre-Event Weather Checklist Server Action
// Fetches weather forecast for an event and generates conditional checklist items.
// Only produces items for outdoor events within 7-day forecast window.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { fetchForecast } from './open-meteo'
import {
  generateWeatherChecklist,
  inferEventType,
  type WeatherChecklistItem,
} from './weather-checklist'

export interface PreEventWeatherChecklistResult {
  items: WeatherChecklistItem[]
  eventType: 'outdoor' | 'indoor' | 'unknown'
  forecastAvailable: boolean
  /** ISO date string for the forecast day used */
  forecastDate: string | null
}

/**
 * Get weather-conditional checklist items for an upcoming event.
 * Returns empty items for indoor events, events without coordinates,
 * or events beyond the 7-day forecast window.
 *
 * Auth: requireChef(), tenant-scoped.
 */
export async function getPreEventWeatherChecklist(
  eventId: string
): Promise<PreEventWeatherChecklistResult> {
  const empty: PreEventWeatherChecklistResult = {
    items: [],
    eventType: 'unknown',
    forecastAvailable: false,
    forecastDate: null,
  }

  try {
    const user = await requireChef()
    const db: any = createServerClient()

    // Fetch event with location and site assessment data
    const { data: event, error } = await db
      .from('events')
      .select(
        'id, event_date, location_lat, location_lng, location_notes, status'
      )
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (error || !event) return empty

    // Need coordinates for weather
    if (event.location_lat == null || event.location_lng == null) return empty

    // Check if event is within forecast range (7 days)
    const eventDate = new Date(event.event_date + 'T00:00:00')
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / 86_400_000)

    if (diffDays < 0 || diffDays > 7) return empty

    // Try to get site assessment for weather exposure info
    let weatherExposure: boolean | null = null
    let hasOutdoorSpace: boolean | null = null
    try {
      const { data: siteAssessment } = await db
        .from('event_site_assessments')
        .select('weather_exposure, outdoor_space')
        .eq('event_id', eventId)
        .maybeSingle()

      if (siteAssessment) {
        weatherExposure = siteAssessment.weather_exposure ?? null
        hasOutdoorSpace = siteAssessment.outdoor_space ?? null
      }
    } catch {
      // Site assessment lookup is optional
    }

    const eventType = inferEventType({
      weatherExposure,
      hasOutdoorSpace,
      locationNotes: event.location_notes,
    })

    // Indoor events: no weather checklist needed
    if (eventType === 'indoor') {
      return { items: [], eventType, forecastAvailable: false, forecastDate: null }
    }

    // Fetch forecast
    const forecastResult = await fetchForecast(event.location_lat, event.location_lng)
    if (forecastResult.error || forecastResult.forecasts.length === 0) {
      return { items: [], eventType, forecastAvailable: false, forecastDate: null }
    }

    // Find the day matching the event date
    const dateStr = event.event_date
    const dayForecast = forecastResult.forecasts.find((f) => f.date === dateStr)
    if (!dayForecast) {
      return { items: [], eventType, forecastAvailable: false, forecastDate: null }
    }

    const items = generateWeatherChecklist(dayForecast, eventType)

    return {
      items,
      eventType,
      forecastAvailable: true,
      forecastDate: dateStr,
    }
  } catch {
    return empty
  }
}
