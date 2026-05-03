'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'

type WeatherData = {
  date: string
  tempHigh: number
  tempLow: number
  precipChance: number
  condition: string
  icon: string
}

type Props = {
  eventDate: string | null // YYYY-MM-DD
  location: string | null
  latitude?: number | null
  longitude?: number | null
}

function getWeatherIcon(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 3) return '⛅'
  if (code <= 49) return '🌫️'
  if (code <= 59) return '🌦️'
  if (code <= 69) return '🌧️'
  if (code <= 79) return '🌨️'
  if (code <= 82) return '🌧️'
  if (code <= 86) return '🌨️'
  if (code <= 99) return '⛈️'
  return '🌤️'
}

function getConditionText(code: number): string {
  if (code === 0) return 'Clear'
  if (code <= 3) return 'Partly cloudy'
  if (code <= 49) return 'Foggy'
  if (code <= 59) return 'Drizzle'
  if (code <= 69) return 'Rain'
  if (code <= 79) return 'Snow'
  if (code <= 82) return 'Rain showers'
  if (code <= 86) return 'Snow showers'
  if (code <= 99) return 'Thunderstorm'
  return 'Fair'
}

export function WeatherAlertPanel({ eventDate, latitude, longitude }: Props) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!eventDate || !latitude || !longitude) return

    // Only fetch if event is within 7 days (forecast limit)
    const eventDateObj = new Date(eventDate + 'T00:00:00')
    const now = new Date()
    const daysUntil = Math.ceil((eventDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntil < 0 || daysUntil > 7) return

    setLoading(true)
    // Open-Meteo: free, no API key, no rate limits for small usage
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&temperature_unit=fahrenheit&timezone=auto&start_date=${eventDate}&end_date=${eventDate}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.daily && data.daily.time?.length > 0) {
          const idx = 0
          const code = data.daily.weather_code[idx]
          setWeather({
            date: data.daily.time[idx],
            tempHigh: Math.round(data.daily.temperature_2m_max[idx]),
            tempLow: Math.round(data.daily.temperature_2m_min[idx]),
            precipChance: data.daily.precipitation_probability_max[idx] || 0,
            condition: getConditionText(code),
            icon: getWeatherIcon(code),
          })
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Could not fetch weather')
        setLoading(false)
      })
  }, [eventDate, latitude, longitude])

  if (!eventDate || !latitude || !longitude) return null
  if (loading || error) return null
  if (!weather) return null

  const isRainy = weather.precipChance > 40
  const isCold = weather.tempLow < 45
  const isHot = weather.tempHigh > 90

  return (
    <Card
      className={`p-4 ${
        isRainy
          ? 'border-amber-800/50'
          : isCold
            ? 'border-blue-800/50'
            : isHot
              ? 'border-red-800/50'
              : 'border-stone-700'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{weather.icon}</span>
          <div>
            <p className="text-sm font-medium text-white">
              Event Day Forecast: {weather.condition}
            </p>
            <div className="flex items-center gap-3 text-xs text-stone-400 mt-0.5">
              <span>
                High {weather.tempHigh}F / Low {weather.tempLow}F
              </span>
              <span
                className={
                  weather.precipChance > 60
                    ? 'text-red-300'
                    : weather.precipChance > 30
                      ? 'text-amber-300'
                      : 'text-emerald-300'
                }
              >
                {weather.precipChance}% rain
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(isRainy || isCold || isHot) && (
        <div className="mt-3 space-y-1">
          {isRainy && (
            <p className="text-xs text-amber-300">
              Rain likely. Consider tent/cover for outdoor service. Protect equipment.
            </p>
          )}
          {isCold && (
            <p className="text-xs text-blue-300">
              Cold evening. Plan for heating, warm courses, and guest comfort.
            </p>
          )}
          {isHot && (
            <p className="text-xs text-red-300">
              Hot day. Extra ice, shade for prep area, hydration for team.
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
