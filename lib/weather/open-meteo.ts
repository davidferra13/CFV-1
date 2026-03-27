// Open-Meteo weather API - completely free, no API key required
// Forecast: https://api.open-meteo.com (up to 16 days ahead)
// Historical: https://archive-api.open-meteo.com (past dates)

// ── DailyForecast (used by weather-risk scoring) ────────────────────────────

export interface DailyForecast {
  date: string
  tempHighF: number
  tempLowF: number
  precipProbability: number
  windSpeedMph: number
  weatherCode: number
  condition: string
}

const WEATHER_CODE_CONDITIONS: Record<number, string> = {
  0: 'Clear',
  1: 'Clear',
  2: 'Partly Cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Fog',
  51: 'Drizzle',
  53: 'Drizzle',
  55: 'Drizzle',
  56: 'Freezing Drizzle',
  57: 'Freezing Drizzle',
  61: 'Rain',
  63: 'Rain',
  65: 'Rain',
  66: 'Freezing Rain',
  67: 'Freezing Rain',
  71: 'Snow',
  73: 'Snow',
  75: 'Snow',
  77: 'Snow',
  80: 'Rain Showers',
  81: 'Rain Showers',
  82: 'Rain Showers',
  85: 'Snow Showers',
  86: 'Snow Showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm',
  99: 'Thunderstorm',
}

function weatherCodeToCondition(code: number): string {
  return WEATHER_CODE_CONDITIONS[code] ?? 'Variable'
}

export type ForecastResult = {
  forecasts: DailyForecast[]
  error: string | null
}

/**
 * Fetch a 7-day daily forecast from Open-Meteo.
 * Returns { forecasts, error } so callers can distinguish "clear week" from "API down."
 */
export async function fetchForecast(lat: number, lng: number): Promise<ForecastResult> {
  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      daily:
        'temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,weather_code',
      timezone: 'America/New_York',
      forecast_days: '7',
      temperature_unit: 'fahrenheit',
      wind_speed_unit: 'mph',
    })

    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      console.error(`[open-meteo] Forecast HTTP ${res.status}`)
      return { forecasts: [], error: `Weather API returned ${res.status}` }
    }

    const data = await res.json()
    const daily = data.daily
    if (!daily?.time?.length) return { forecasts: [], error: null }

    const forecasts: DailyForecast[] = []
    for (let i = 0; i < daily.time.length; i++) {
      const code = daily.weather_code?.[i] ?? 0
      forecasts.push({
        date: daily.time[i],
        tempHighF: Math.round(daily.temperature_2m_max[i] ?? 0),
        tempLowF: Math.round(daily.temperature_2m_min[i] ?? 0),
        precipProbability: daily.precipitation_probability_max[i] ?? 0,
        windSpeedMph: Math.round(daily.wind_speed_10m_max[i] ?? 0),
        weatherCode: code,
        condition: weatherCodeToCondition(code),
      })
    }

    return { forecasts, error: null }
  } catch (err) {
    console.error('[open-meteo] Forecast error:', err)
    return { forecasts: [], error: 'Weather service unreachable' }
  }
}

// ── EventWeather (used by calendar/list views) ──────────────────────────────

export interface EventWeather {
  date: string
  tempMaxF: number
  tempMinF: number
  precipitationMm: number
  weatherCode: number
  description: string
  emoji: string
  isHistorical: boolean
}

const WMO_DESCRIPTIONS: Record<number, { text: string; emoji: string }> = {
  0: { text: 'Clear sky', emoji: '☀️' },
  1: { text: 'Mainly clear', emoji: '🌤️' },
  2: { text: 'Partly cloudy', emoji: '⛅' },
  3: { text: 'Overcast', emoji: '☁️' },
  45: { text: 'Foggy', emoji: '🌫️' },
  48: { text: 'Icy fog', emoji: '🌫️' },
  51: { text: 'Light drizzle', emoji: '🌦️' },
  53: { text: 'Drizzle', emoji: '🌦️' },
  55: { text: 'Heavy drizzle', emoji: '🌧️' },
  61: { text: 'Light rain', emoji: '🌧️' },
  63: { text: 'Rain', emoji: '🌧️' },
  65: { text: 'Heavy rain', emoji: '🌧️' },
  71: { text: 'Light snow', emoji: '🌨️' },
  73: { text: 'Snow', emoji: '❄️' },
  75: { text: 'Heavy snow', emoji: '❄️' },
  77: { text: 'Snow grains', emoji: '🌨️' },
  80: { text: 'Light showers', emoji: '🌦️' },
  81: { text: 'Showers', emoji: '🌧️' },
  82: { text: 'Violent showers', emoji: '⛈️' },
  85: { text: 'Snow showers', emoji: '🌨️' },
  86: { text: 'Heavy snow showers', emoji: '❄️' },
  95: { text: 'Thunderstorm', emoji: '⛈️' },
  96: { text: 'Thunderstorm + hail', emoji: '⛈️' },
  99: { text: 'Severe thunderstorm', emoji: '⛈️' },
}

function wmoLookup(code: number): { text: string; emoji: string } {
  return WMO_DESCRIPTIONS[code] ?? { text: 'Variable', emoji: '🌡️' }
}

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Compact weather summary for inline dashboard display.
 * Just emoji + temp range + optional precipitation warning.
 */
export interface InlineWeather {
  emoji: string
  tempMinF: number
  tempMaxF: number
  precipitationMm: number
  description: string
}

/**
 * Batch-fetch weather for multiple events by their coordinates and dates.
 * Returns a map of eventId → InlineWeather. Skips events with no coords or API errors.
 * All fetches run in parallel for performance.
 */
export async function getWeatherForEvents(
  events: Array<{ id: string; lat: number; lng: number; eventDate: string }>
): Promise<Record<string, InlineWeather>> {
  const results: Record<string, InlineWeather> = {}

  const promises = events.map(async (ev) => {
    try {
      const result = await getEventWeather(ev.lat, ev.lng, ev.eventDate)
      if (result.data) {
        results[ev.id] = {
          emoji: result.data.emoji,
          tempMinF: result.data.tempMinF,
          tempMaxF: result.data.tempMaxF,
          precipitationMm: result.data.precipitationMm,
          description: result.data.description,
        }
      }
    } catch {
      // Non-blocking - skip this event's weather silently
    }
  })

  await Promise.all(promises)
  return results
}

export type EventWeatherResult = {
  data: EventWeather | null
  error: string | null
}

export async function getEventWeather(
  lat: number,
  lng: number,
  eventDate: string | Date
): Promise<EventWeatherResult> {
  try {
    const date = typeof eventDate === 'string' ? new Date(eventDate) : eventDate
    const dateStr = toDateStr(date)
    const today = new Date()
    const todayStr = toDateStr(today)
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / 86_400_000)

    // Too far in the future for any API
    if (diffDays > 16) return { data: null, error: null }

    const isHistorical = diffDays < -1
    const baseUrl = isHistorical
      ? 'https://archive-api.open-meteo.com/v1/archive'
      : 'https://api.open-meteo.com/v1/forecast'

    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode',
      start_date: isHistorical ? dateStr : todayStr,
      end_date: dateStr,
      timezone: 'auto',
      temperature_unit: 'fahrenheit',
    })

    const res = await fetch(`${baseUrl}?${params}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) {
      console.error(`[open-meteo] EventWeather HTTP ${res.status}`)
      return { data: null, error: `Weather API returned ${res.status}` }
    }

    const data = await res.json()
    const daily = data.daily

    if (!daily?.weathercode?.length) return { data: null, error: null }

    // For forecast, pick the last entry (which is the target date)
    const idx = daily.time.indexOf(dateStr)
    if (idx === -1) return { data: null, error: null }

    const code = daily.weathercode[idx]
    const { text, emoji } = wmoLookup(code)

    return {
      data: {
        date: dateStr,
        tempMaxF: Math.round(daily.temperature_2m_max[idx]),
        tempMinF: Math.round(daily.temperature_2m_min[idx]),
        precipitationMm: daily.precipitation_sum[idx] ?? 0,
        weatherCode: code,
        description: text,
        emoji,
        isHistorical,
      },
      error: null,
    }
  } catch (err) {
    console.error('[open-meteo] EventWeather error:', err)
    return { data: null, error: 'Weather service unreachable' }
  }
}
