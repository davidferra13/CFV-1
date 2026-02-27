// Open-Meteo weather API — completely free, no API key required
// Forecast: https://api.open-meteo.com (up to 16 days ahead)
// Historical: https://archive-api.open-meteo.com (past dates)

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
      const weather = await getEventWeather(ev.lat, ev.lng, ev.eventDate)
      if (weather) {
        results[ev.id] = {
          emoji: weather.emoji,
          tempMinF: weather.tempMinF,
          tempMaxF: weather.tempMaxF,
          precipitationMm: weather.precipitationMm,
          description: weather.description,
        }
      }
    } catch {
      // Non-blocking — skip this event's weather silently
    }
  })

  await Promise.all(promises)
  return results
}

export async function getEventWeather(
  lat: number,
  lng: number,
  eventDate: string | Date
): Promise<EventWeather | null> {
  try {
    const date = typeof eventDate === 'string' ? new Date(eventDate) : eventDate
    const dateStr = toDateStr(date)
    const today = new Date()
    const todayStr = toDateStr(today)
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / 86_400_000)

    // Too far in the future for any API
    if (diffDays > 16) return null

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
    if (!res.ok) return null

    const data = await res.json()
    const daily = data.daily

    if (!daily?.weathercode?.length) return null

    // For forecast, pick the last entry (which is the target date)
    const idx = daily.time.indexOf(dateStr)
    if (idx === -1) return null

    const code = daily.weathercode[idx]
    const { text, emoji } = wmoLookup(code)

    return {
      date: dateStr,
      tempMaxF: Math.round(daily.temperature_2m_max[idx]),
      tempMinF: Math.round(daily.temperature_2m_min[idx]),
      precipitationMm: daily.precipitation_sum[idx] ?? 0,
      weatherCode: code,
      description: text,
      emoji,
      isHistorical,
    }
  } catch {
    return null
  }
}
