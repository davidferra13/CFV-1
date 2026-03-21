'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  getEventWeatherForecast,
  type EventWeatherForecastResult,
} from '@/lib/weather/weather-actions'
import { WeatherAlertBadge } from './weather-alert-badge'

type WeatherForecastCardProps = {
  eventId: string
}

export function WeatherForecastCard({ eventId }: WeatherForecastCardProps) {
  const [data, setData] = useState<EventWeatherForecastResult | null>(null)
  const [error, setError] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      try {
        const result = await getEventWeatherForecast(eventId)
        setData(result)
        setError(false)
      } catch {
        setError(true)
        setData(null)
      } finally {
        setLoaded(true)
      }
    })
  }, [eventId])

  // Not yet loaded, show nothing (avoid layout shift)
  if (!loaded && isPending) return null

  // No data available (no coords, too far out, past event)
  if (!error && !data) return null

  // Fetch failed
  if (error) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
        <p className="text-sm text-stone-500">Could not load weather forecast</p>
      </div>
    )
  }

  // We have data
  const { forecast, risk, eventDate } = data!

  // Format the date nicely (e.g., "March 25")
  const dateObj = new Date(eventDate + 'T00:00:00')
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-200">Weather Forecast</h3>
        <WeatherAlertBadge riskLevel={risk.riskLevel} />
      </div>

      {/* Date and condition */}
      <p className="text-sm text-stone-300">
        {formattedDate} - {forecast.condition}
      </p>

      {/* Details grid */}
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-stone-500 text-xs">Temperature</p>
          <p className="text-stone-200">
            High {forecast.tempHighF}F / Low {forecast.tempLowF}F
          </p>
        </div>
        <div>
          <p className="text-stone-500 text-xs">Rain</p>
          <p className="text-stone-200">{forecast.precipProbability}%</p>
        </div>
        <div>
          <p className="text-stone-500 text-xs">Wind</p>
          <p className="text-stone-200">{forecast.windSpeedMph} mph</p>
        </div>
      </div>

      {/* Warnings */}
      {risk.warnings.length > 0 && (
        <div className="border-t border-stone-700 pt-2 space-y-1">
          {risk.warnings.map((warning, i) => (
            <p key={i} className="text-xs text-amber-400 flex items-start gap-1.5">
              <span className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
              {warning}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
