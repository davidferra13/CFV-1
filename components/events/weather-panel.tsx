// WeatherPanel - server component
// Fetches Open-Meteo forecast (or historical data) for the event date/location.
// Shows nothing when weather is unavailable or too far in the future (>16 days).

import { getEventWeather } from '@/lib/weather/open-meteo'

interface WeatherPanelProps {
  lat: number
  lng: number
  eventDate: string | Date
}

export async function WeatherPanel({ lat, lng, eventDate }: WeatherPanelProps) {
  const weather = await getEventWeather(lat, lng, eventDate)
  if (!weather) return null

  const precipIn = (weather.precipitationMm / 25.4).toFixed(2)
  const hasPrecip = weather.precipitationMm > 0.1

  return (
    <div className="mt-3 rounded-lg border border-sky-200 bg-sky-950 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl" role="img" aria-label={weather.description}>
            {weather.emoji}
          </span>
          <div>
            <p className="text-sm font-medium text-sky-900">{weather.description}</p>
            <p className="text-xs text-sky-700">
              {weather.tempMinF}°–{weather.tempMaxF}°F
              {hasPrecip && <span className="ml-2">· {precipIn}" precip</span>}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-sky-500">
            {weather.isHistorical ? 'Actual weather' : 'Forecast'}
          </p>
          <p className="text-xs text-sky-400">Open-Meteo</p>
        </div>
      </div>
    </div>
  )
}
