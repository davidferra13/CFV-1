'use client'

// Weather Widget for Event Intelligence Panel.
// 3-day forecast window centered on event day. Uses Open-Meteo via server action.

import { useState, useEffect } from 'react'
import { CloudSun, Wind, AlertTriangle } from '@/components/ui/icons'
import {
  getEventWeatherForecast,
  type EventWeatherForecast,
  type WeatherDay,
} from '@/lib/events/weather-actions'

interface Props {
  eventId: string
}

function DayCard({ day }: { day: WeatherDay }) {
  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-lg border p-3 ${
        day.isEventDay
          ? 'border-blue-500 bg-stone-800/80 ring-1 ring-blue-500/30'
          : 'border-stone-700 bg-stone-800/50'
      }`}
    >
      <span className="text-xs font-medium text-stone-400">{day.label}</span>
      <span className="text-2xl">{day.emoji}</span>
      <span className="text-sm font-semibold text-white">
        {Math.round(day.tempHighF)}/{Math.round(day.tempLowF)}°F
      </span>
      <span className="text-xs text-stone-400">{day.condition}</span>
      {day.precipProbability > 0 && (
        <span className="text-xs text-blue-400">{day.precipProbability}% rain</span>
      )}
      {day.windSpeedMph > 10 && (
        <span className="flex items-center gap-0.5 text-xs text-stone-500">
          <Wind size={12} />
          {Math.round(day.windSpeedMph)} mph
        </span>
      )}
    </div>
  )
}

export function WeatherWidget({ eventId }: Props) {
  const [forecast, setForecast] = useState<EventWeatherForecast | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getEventWeatherForecast(eventId)
      .then((data) => {
        if (!cancelled) setForecast(data)
      })
      .catch(() => {
        // Hide on error
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [eventId])

  if (loading) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-pulse rounded bg-stone-700" />
          <div className="h-4 w-32 animate-pulse rounded bg-stone-700" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-stone-800" />
          ))}
        </div>
      </div>
    )
  }

  if (!forecast) return null

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CloudSun size={18} className="text-stone-400" />
          <h3 className="text-sm font-semibold text-white">Weather Forecast</h3>
        </div>
        <div className="flex items-center gap-2">
          {forecast.isOutdoor && (
            <span className="rounded-full bg-blue-900/40 px-2 py-0.5 text-xs text-blue-300">
              Outdoor event
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {forecast.days.map((day) => (
          <DayCard key={day.date} day={day} />
        ))}
      </div>

      {forecast.needsContingency && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-700/50 bg-amber-900/20 px-3 py-2">
          <AlertTriangle size={16} className="shrink-0 text-amber-500" />
          <span className="text-xs text-amber-300">
            Rain likely. Consider a weather contingency plan.
          </span>
        </div>
      )}
    </div>
  )
}
