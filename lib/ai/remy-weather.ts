'use server'

// Remy - Weather Awareness (Phase 6A)
// Uses shared weather utilities (lib/weather/open-meteo, lib/geocoding/nominatim)
// and shared enrichment (lib/weather/weather-alert-enrichment).
// PRIVACY: Only sends location text for geocoding.
// No client names, event details, or business data leaves the server.

import { getCurrentUser } from '@/lib/auth/get-user'
import { dateToDateString } from '@/lib/utils/format'
import { fetchForecast, type DailyForecast } from '@/lib/weather/open-meteo'
import { geocodeAddress } from '@/lib/geocoding/nominatim'
import {
  enrichWeatherAlert,
  inferEventType,
  type EventType,
} from '@/lib/weather/weather-alert-enrichment'

// Re-export enrichment types so existing callers don't break
export { enrichWeatherAlert, inferEventType, type EventType }
export type { EnrichedWeatherAlert, WeatherGuidance } from '@/lib/weather/weather-alert-enrichment'

// ---- Remy-specific types (exported, consumed by weather-resolver + callers) ----

interface WeatherForecast {
  date: string
  tempHighC: number
  tempLowC: number
  tempHighF: number
  tempLowF: number
  precipitationMm: number
  precipitationProbability: number
  weatherCode: number
  weatherDescription: string
  windSpeedKmh: number
}

export interface EventWeatherAlert {
  eventId: string
  eventDate: string
  location: string
  occasion: string | null
  clientName: string | null
  forecast: WeatherForecast
  alertLevel: 'info' | 'warning' | 'severe'
  alertMessage: string
  /** Chef-specific contextual guidance (outdoor/indoor aware) */
  chefGuidance: string[]
}

// ---- Core evaluation (now uses mph internally, matches shared module) ----

/**
 * Evaluate weather conditions and generate alert if warranted.
 * Returns alert level and message, or null if weather is fine.
 */
function evaluateWeather(forecast: WeatherForecast): {
  level: 'info' | 'warning' | 'severe'
  message: string
} | null {
  const issues: string[] = []
  let level: 'info' | 'warning' | 'severe' = 'info'
  const windMph = Math.round(forecast.windSpeedKmh * 0.621)

  // Severe: thunderstorms, heavy rain/snow, freezing conditions
  if ([95, 96, 99].includes(forecast.weatherCode)) {
    issues.push(`${forecast.weatherDescription} expected`)
    level = 'severe'
  } else if ([65, 67, 75, 82, 86].includes(forecast.weatherCode)) {
    issues.push(`${forecast.weatherDescription} expected`)
    level = 'severe'
  }
  // Warning: moderate rain/snow, high wind
  else if ([63, 66, 73, 81, 85].includes(forecast.weatherCode)) {
    issues.push(`${forecast.weatherDescription} expected`)
    level = 'warning'
  }

  // High precipitation probability
  if (forecast.precipitationProbability >= 70 && level === 'info') {
    issues.push(`${forecast.precipitationProbability}% chance of precipitation`)
    level = 'warning'
  } else if (forecast.precipitationProbability >= 50 && level === 'info') {
    issues.push(`${forecast.precipitationProbability}% chance of precipitation`)
  }

  // Extreme temperatures
  if (forecast.tempHighF >= 100) {
    issues.push(`Extreme heat: ${forecast.tempHighF}F high`)
    if (level !== 'severe') level = 'warning'
  } else if (forecast.tempLowF <= 25) {
    issues.push(`Extreme cold: ${forecast.tempLowF}F low`)
    if (level !== 'severe') level = 'warning'
  } else if (forecast.tempHighF >= 95) {
    issues.push(`High heat: ${forecast.tempHighF}F`)
  } else if (forecast.tempLowF <= 32) {
    issues.push(`Freezing temps: ${forecast.tempLowF}F low`)
  }

  // High winds (now in mph for consistency)
  if (windMph >= 40) {
    issues.push(`Very high winds: ${windMph}mph`)
    if (level !== 'severe') level = 'warning'
  } else if (windMph >= 25) {
    issues.push(`Strong winds: ${windMph}mph`)
    if (level !== 'severe') level = 'warning'
  } else if (windMph >= 15) {
    issues.push(`Breezy: ${windMph}mph`)
  }

  if (issues.length === 0) return null

  return { level, message: issues.join('. ') + '.' }
}

// ---- Main alert fetcher ----

export type WeatherAlertResult = {
  alerts: EventWeatherAlert[]
  checkedCount: number
  failedCount: number
}

/**
 * Get weather alerts for upcoming events.
 * Queries events within the next 7 days, uses shared weather utilities
 * for geocoding and forecasts, and returns alerts for concerning weather.
 */
export async function getWeatherAlerts(tenantId: string): Promise<WeatherAlertResult> {
  // Tenant isolation: verify tenantId matches session when called from user context
  const sessionUser = await getCurrentUser()
  if (sessionUser && tenantId !== sessionUser.tenantId) {
    throw new Error('Unauthorized: tenant mismatch')
  }
  // Import dynamically to avoid circular deps in server actions
  const { createAdminClient } = await import('@/lib/db/admin')
  const db = createAdminClient()

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const _wo = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7)
  const weekOut = `${_wo.getFullYear()}-${String(_wo.getMonth() + 1).padStart(2, '0')}-${String(_wo.getDate()).padStart(2, '0')}`

  const { data: events } = await db
    .from('events')
    .select(
      'id, event_date, location_address, location_lat, location_lng, occasion, client:clients(full_name)'
    )
    .eq('tenant_id', tenantId)
    .not('status', 'in', '("cancelled","completed")')
    .gte('event_date', today)
    .lte('event_date', weekOut)
    .order('event_date', { ascending: true })
    .limit(10)

  if (!events || events.length === 0) return { alerts: [], checkedCount: 0, failedCount: 0 }

  const alerts: EventWeatherAlert[] = []
  let checkedCount = 0
  let failedCount = 0

  // Geocode cache to avoid re-geocoding the same location
  const geoCache = new Map<string, { lat: number; lng: number } | null>()
  // Forecast cache: one 7-day fetch per unique lat/lng covers all events at that location
  const forecastCache = new Map<string, DailyForecast[]>()

  for (const event of events) {
    if (!event.location_address) continue
    const eventDate = dateToDateString(event.event_date as Date | string)

    let lat: number
    let lng: number

    // Use stored coordinates when available; fall back to shared geocoder
    if (event.location_lat != null && event.location_lng != null) {
      lat = event.location_lat as number
      lng = event.location_lng as number
    } else {
      // Geocode via shared Nominatim utility (cached in Upstash)
      const locKey = event.location_address.toLowerCase().trim()
      if (!geoCache.has(locKey)) {
        try {
          const geo = await geocodeAddress(event.location_address)
          geoCache.set(locKey, geo ? { lat: geo.lat, lng: geo.lng } : null)
        } catch {
          geoCache.set(locKey, null)
        }
      }
      const geo = geoCache.get(locKey)
      if (!geo) {
        failedCount++
        continue
      }
      lat = geo.lat
      lng = geo.lng
    }

    // Fetch 7-day forecast via shared Open-Meteo utility (cached per location)
    const coordKey = `${lat.toFixed(4)},${lng.toFixed(4)}`
    if (!forecastCache.has(coordKey)) {
      try {
        const result = await fetchForecast(lat, lng)
        forecastCache.set(coordKey, result.forecasts)
      } catch {
        forecastCache.set(coordKey, [])
      }
    }

    const forecasts = forecastCache.get(coordKey) ?? []
    const dayMatch = forecasts.find((f) => f.date === eventDate)
    if (!dayMatch) {
      failedCount++
      continue
    }
    checkedCount++

    // Map shared DailyForecast to Remy's WeatherForecast shape
    const forecast: WeatherForecast = {
      date: dayMatch.date,
      tempHighF: dayMatch.tempHighF,
      tempLowF: dayMatch.tempLowF,
      tempHighC: Math.round(((dayMatch.tempHighF - 32) * 5) / 9),
      tempLowC: Math.round(((dayMatch.tempLowF - 32) * 5) / 9),
      precipitationMm: 0, // shared forecast uses probability, not mm
      precipitationProbability: dayMatch.precipProbability,
      weatherCode: dayMatch.weatherCode,
      weatherDescription: dayMatch.condition,
      windSpeedKmh: Math.round(dayMatch.windSpeedMph / 0.621),
    }

    // Evaluate
    const evaluation = evaluateWeather(forecast)
    if (!evaluation) continue

    // Enrich with chef-specific guidance
    const eventType = inferEventType(event.occasion ?? null)
    const chefGuidance = enrichWeatherAlert(forecast, eventType)

    alerts.push({
      eventId: event.id,
      eventDate: eventDate,
      location: event.location_address,
      occasion: event.occasion ?? null,
      clientName: (event.client as any)?.full_name ?? null,
      forecast,
      alertLevel: evaluation.level,
      alertMessage: evaluation.message,
      chefGuidance,
    })
  }

  return { alerts, checkedCount, failedCount }
}

/**
 * Format weather alerts as a Remy response.
 * Now includes chef-specific guidance when available.
 */
export async function formatWeatherAlerts(result: WeatherAlertResult): Promise<string> {
  const { alerts, checkedCount, failedCount } = result

  if (alerts.length === 0) {
    if (checkedCount === 0 && failedCount > 0) {
      return 'Could not check weather for your upcoming events (weather service unavailable). Try again later.'
    }
    if (failedCount > 0) {
      return `No weather concerns for the ${checkedCount} event${checkedCount !== 1 ? 's' : ''} I could check, but ${failedCount} event${failedCount !== 1 ? 's' : ''} could not be checked (geocoding or forecast unavailable).`
    }
    if (checkedCount === 0) {
      return 'No upcoming events with locations to check weather for this week.'
    }
    return 'No weather concerns for your upcoming events this week.'
  }

  const lines: string[] = ['**Weather alerts for upcoming events:**\n']

  for (const alert of alerts) {
    const icon = alert.alertLevel === 'severe' ? '🔴' : alert.alertLevel === 'warning' ? '🟡' : '🔵'
    const eventLabel = alert.occasion ?? 'Event'
    const clientLabel = alert.clientName ? ` for ${alert.clientName}` : ''
    const dateLabel = new Date(alert.eventDate + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })

    lines.push(`${icon} **${eventLabel}${clientLabel}** - ${dateLabel} @ ${alert.location}`)
    lines.push(`  ${alert.alertMessage}`)
    lines.push(
      `  ${alert.forecast.weatherDescription}, ${alert.forecast.tempLowF}-${alert.forecast.tempHighF}F`
    )

    // Chef-specific guidance
    if (alert.chefGuidance.length > 0) {
      lines.push('')
      lines.push('  **Chef prep notes:**')
      for (const tip of alert.chefGuidance) {
        lines.push(`  - ${tip}`)
      }
    }

    lines.push('')
  }

  if (alerts.some((a) => a.alertLevel === 'severe')) {
    lines.push('**Consider having a backup plan for severe weather events.**')
  }

  if (failedCount > 0) {
    lines.push(
      `\n*Note: ${failedCount} event${failedCount !== 1 ? 's' : ''} could not be checked (geocoding or forecast unavailable).*`
    )
  }

  return lines.join('\n').trim()
}
