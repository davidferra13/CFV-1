'use server'

// Remy — Weather Awareness (Phase 6A)
// Fetches weather forecasts for upcoming events using Open-Meteo (free, no API key).
// Used by the proactive alert engine to warn about bad weather for outdoor events.
// PRIVACY: Only sends location text (city/address) to Open-Meteo for geocoding.
// No client names, event details, or business data leaves the server.

interface GeoResult {
  latitude: number
  longitude: number
  name: string
}

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
}

// WMO Weather interpretation codes → human-readable descriptions
const WMO_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
}

/**
 * Geocode a location string to lat/lng using Open-Meteo's geocoding API.
 * Returns null if geocoding fails (no match, network error, etc.).
 */
async function geocodeLocation(location: string): Promise<GeoResult | null> {
  try {
    const query = encodeURIComponent(location.trim())
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=1&language=en&format=json`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const result = data?.results?.[0]
    if (!result) return null
    return {
      latitude: result.latitude,
      longitude: result.longitude,
      name: result.name,
    }
  } catch {
    return null
  }
}

/**
 * Fetch weather forecast for a specific date at given coordinates.
 * Uses Open-Meteo's free forecast API (no API key needed).
 * Returns null if the date is outside the forecast range (typically 16 days).
 */
async function fetchForecast(
  lat: number,
  lng: number,
  date: string
): Promise<WeatherForecast | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code,wind_speed_10m_max` +
        `&start_date=${date}&end_date=${date}&timezone=auto`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const daily = data?.daily
    if (!daily || !daily.time || daily.time.length === 0) return null

    const tempHighC = daily.temperature_2m_max[0]
    const tempLowC = daily.temperature_2m_min[0]
    return {
      date: daily.time[0],
      tempHighC,
      tempLowC,
      tempHighF: Math.round((tempHighC * 9) / 5 + 32),
      tempLowF: Math.round((tempLowC * 9) / 5 + 32),
      precipitationMm: daily.precipitation_sum[0] ?? 0,
      precipitationProbability: daily.precipitation_probability_max[0] ?? 0,
      weatherCode: daily.weather_code[0] ?? 0,
      weatherDescription: WMO_CODES[daily.weather_code[0]] ?? 'Unknown',
      windSpeedKmh: daily.wind_speed_10m_max[0] ?? 0,
    }
  } catch {
    return null
  }
}

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
    issues.push(`Extreme heat: ${forecast.tempHighF}°F high`)
    if (level !== 'severe') level = 'warning'
  } else if (forecast.tempLowF <= 25) {
    issues.push(`Extreme cold: ${forecast.tempLowF}°F low`)
    if (level !== 'severe') level = 'warning'
  } else if (forecast.tempHighF >= 95) {
    issues.push(`High heat: ${forecast.tempHighF}°F`)
  } else if (forecast.tempLowF <= 32) {
    issues.push(`Freezing temps: ${forecast.tempLowF}°F low`)
  }

  // High winds
  if (forecast.windSpeedKmh >= 60) {
    issues.push(`Very high winds: ${Math.round(forecast.windSpeedKmh * 0.621)}mph`)
    if (level !== 'severe') level = 'warning'
  } else if (forecast.windSpeedKmh >= 40) {
    issues.push(`Windy: ${Math.round(forecast.windSpeedKmh * 0.621)}mph`)
  }

  if (issues.length === 0) return null

  return { level, message: issues.join('. ') + '.' }
}

/**
 * Get weather alerts for upcoming events.
 * Queries events within the next 7 days, geocodes their locations,
 * fetches forecasts, and returns alerts for concerning weather.
 */
export function getWeatherAlerts(tenantId: string): Promise<EventWeatherAlert[]> {
  // Import dynamically to avoid circular deps in server actions
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const weekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: events } = await supabase
    .from('events')
    .select('id, event_date, location, occasion, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .not('status', 'in', '("cancelled","completed")')
    .gte('event_date', today)
    .lte('event_date', weekOut)
    .order('event_date', { ascending: true })
    .limit(10)

  if (!events || events.length === 0) return []

  const alerts: EventWeatherAlert[] = []

  // Geocode cache to avoid re-geocoding the same location
  const geoCache = new Map<string, GeoResult | null>()

  for (const event of events) {
    if (!event.location) continue
    const eventDate = new Date(event.event_date).toISOString().split('T')[0]

    // Geocode (with cache)
    const locKey = event.location.toLowerCase().trim()
    if (!geoCache.has(locKey)) {
      geoCache.set(locKey, await geocodeLocation(event.location))
    }
    const geo = geoCache.get(locKey)
    if (!geo) continue

    // Fetch forecast
    const forecast = await fetchForecast(geo.latitude, geo.longitude, eventDate)
    if (!forecast) continue

    // Evaluate
    const evaluation = evaluateWeather(forecast)
    if (!evaluation) continue

    alerts.push({
      eventId: event.id,
      eventDate: eventDate,
      location: event.location,
      occasion: event.occasion ?? null,
      clientName: (event.client as any)?.full_name ?? null,
      forecast,
      alertLevel: evaluation.level,
      alertMessage: evaluation.message,
    })
  }

  return alerts
}

/**
 * Format weather alerts as a Remy response.
 */
export function formatWeatherAlerts(alerts: EventWeatherAlert[]): string {
  if (alerts.length === 0) {
    return 'No weather concerns for your upcoming events this week. Clear skies ahead!'
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

    lines.push(`${icon} **${eventLabel}${clientLabel}** — ${dateLabel} @ ${alert.location}`)
    lines.push(`  ${alert.alertMessage}`)
    lines.push(
      `  ${alert.forecast.weatherDescription}, ${alert.forecast.tempLowF}–${alert.forecast.tempHighF}°F`
    )
    lines.push('')
  }

  if (alerts.some((a) => a.alertLevel === 'severe')) {
    lines.push('**Consider having a backup plan for severe weather events.**')
  }

  return lines.join('\n').trim()
}
