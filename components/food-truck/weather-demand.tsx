'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  DemandAdjustment,
  AdjustedParLevel,
  getWeekForecastWithDemand,
  getAdjustedParLevels,
  getLocationCoordinates,
} from '@/lib/food-truck/weather-demand-actions'
import { getLocations, TruckLocation } from '@/lib/food-truck/location-actions'
import { Button } from '@/components/ui/button'

// ---- Weather Icons (text-based, no external deps) ----

function weatherIcon(code: number): string {
  if (code === 0 || code === 1) return '\u2600' // sun
  if (code === 2) return '\u26C5' // partly cloudy
  if (code === 3) return '\u2601' // overcast
  if (code >= 45 && code <= 48) return '\uD83C\uDF2B' // fog
  if (code >= 51 && code <= 55) return '\uD83C\uDF27' // drizzle
  if (code >= 61 && code <= 65) return '\uD83C\uDF27' // rain
  if (code >= 71 && code <= 77) return '\u2744' // snow
  if (code >= 80 && code <= 82) return '\uD83C\uDF26' // rain showers
  if (code >= 85 && code <= 86) return '\u2744' // snow showers
  if (code >= 95) return '\u26A1' // thunderstorm
  return '\u2753' // unknown
}

function multiplierColor(m: number): string {
  if (m >= 1.1) return 'bg-green-100 text-green-800 border-green-300'
  if (m >= 0.9) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
  return 'bg-red-100 text-red-800 border-red-300'
}

function multiplierLabel(m: number): string {
  if (m >= 1.1) return 'Above avg'
  if (m >= 0.9) return 'Normal'
  return 'Below avg'
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

// ---- Default Par Levels (used when no par planning exists) ----

const DEFAULT_PAR_LEVELS = [
  { item_name: 'Tacos', base_quantity: 50 },
  { item_name: 'Burritos', base_quantity: 30 },
  { item_name: 'Bowls', base_quantity: 25 },
  { item_name: 'Drinks', base_quantity: 60 },
  { item_name: 'Sides', base_quantity: 40 },
]

// ---- Main Component ----

export default function WeatherDemand() {
  const [isPending, startTransition] = useTransition()
  const [weekForecast, setWeekForecast] = useState<DemandAdjustment[]>([])
  const [selectedDay, setSelectedDay] = useState<DemandAdjustment | null>(null)
  const [parLevels, setParLevels] = useState<AdjustedParLevel[]>([])
  const [locations, setLocations] = useState<TruckLocation[]>([])
  const [selectedLocation, setSelectedLocation] = useState<string>('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [manualLat, setManualLat] = useState('40.7128')
  const [manualLng, setManualLng] = useState('-74.0060')
  const [error, setError] = useState<string | null>(null)

  // Load locations on mount
  useEffect(() => {
    startTransition(async () => {
      try {
        const locs = await getLocations()
        setLocations(locs)
      } catch {
        // Non-critical, manual coords work as fallback
      }
    })
  }, [])

  // Load forecast when coordinates change
  useEffect(() => {
    if (!coords) return
    loadForecast(coords.lat, coords.lng)
  }, [coords])

  function loadForecast(lat: number, lng: number) {
    setError(null)
    startTransition(async () => {
      try {
        const forecast = await getWeekForecastWithDemand(lat, lng)
        setWeekForecast(forecast)
        setSelectedDay(null)
        setParLevels([])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load weather forecast')
      }
    })
  }

  async function handleLocationChange(locationId: string) {
    setSelectedLocation(locationId)
    if (!locationId) return

    startTransition(async () => {
      try {
        const loc = await getLocationCoordinates(locationId)
        if (loc) {
          setCoords({ lat: loc.lat, lng: loc.lng })
        } else {
          setError('Location has no coordinates set. Enter them manually or update the location.')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load location')
      }
    })
  }

  function handleManualCoords() {
    const lat = parseFloat(manualLat)
    const lng = parseFloat(manualLng)
    if (isNaN(lat) || isNaN(lng)) {
      setError('Enter valid latitude and longitude')
      return
    }
    setCoords({ lat, lng })
  }

  function handleDaySelect(day: DemandAdjustment) {
    setSelectedDay(day)
    if (!coords) return

    startTransition(async () => {
      try {
        const result = await getAdjustedParLevels(
          day.date,
          coords.lat,
          coords.lng,
          DEFAULT_PAR_LEVELS
        )
        setParLevels(result.par_levels)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to calculate par levels')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Weather-Based Demand</h1>
        <p className="text-sm text-muted-foreground">
          Adjust prep quantities based on weather forecasts. All calculations are deterministic (no
          AI).
        </p>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Location Selection */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="font-semibold">Select Location</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">From your locations</label>
            <select
              value={selectedLocation}
              onChange={(e) => handleLocationChange(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Choose a location...</option>
              {locations
                .filter((l) => l.is_active)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Or enter coordinates</label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                placeholder="Latitude"
                className="w-28 rounded-md border px-2 py-2 text-sm"
              />
              <input
                type="text"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                placeholder="Longitude"
                className="w-28 rounded-md border px-2 py-2 text-sm"
              />
              <Button size="sm" onClick={handleManualCoords} disabled={isPending}>
                Go
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Forecast Strip */}
      {weekForecast.length > 0 && (
        <div>
          <h3 className="mb-3 font-semibold">7-Day Forecast</h3>
          <div className="grid grid-cols-7 gap-2">
            {weekForecast.map((day) => {
              const dateObj = new Date(day.date + 'T12:00:00')
              const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' })
              const monthDay = dateObj.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
              const isSelected = selectedDay?.date === day.date

              return (
                <button
                  key={day.date}
                  onClick={() => handleDaySelect(day)}
                  className={`rounded-lg border p-3 text-center transition-colors hover:bg-accent ${
                    isSelected ? 'ring-2 ring-primary bg-accent' : ''
                  }`}
                >
                  <p className="text-xs font-medium">{dayName}</p>
                  <p className="text-xs text-muted-foreground">{monthDay}</p>
                  <p className="my-1 text-2xl">{weatherIcon(day.weather.weather_code)}</p>
                  <p className="text-sm font-medium">{Math.round(day.weather.temp_high_f)}F</p>
                  <p className="text-xs text-muted-foreground">
                    {day.weather.precip_probability}% rain
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${multiplierColor(day.multiplier)}`}
                  >
                    {day.multiplier}x
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Selected Day Detail */}
      {selectedDay && (
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold">
                {new Date(selectedDay.date + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
              <p className="text-sm text-muted-foreground">
                {selectedDay.weather.weather_description} | High{' '}
                {Math.round(selectedDay.weather.temp_high_f)}F, Low{' '}
                {Math.round(selectedDay.weather.temp_low_f)}F | Wind{' '}
                {Math.round(selectedDay.weather.wind_speed_mph)}mph
              </p>
            </div>
            <div className="text-right">
              <span
                className={`inline-block rounded-full border px-3 py-1 text-sm font-bold ${multiplierColor(selectedDay.multiplier)}`}
              >
                {selectedDay.multiplier}x - {multiplierLabel(selectedDay.multiplier)}
              </span>
            </div>
          </div>

          {/* Reasons */}
          <div>
            <p className="text-sm font-medium mb-1">Adjustment Reasons:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {selectedDay.reasons.map((reason, i) => (
                <li key={i}>- {reason}</li>
              ))}
            </ul>
          </div>

          {/* Par Level Comparison */}
          {parLevels.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Adjusted Prep Quantities</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-4">Item</th>
                      <th className="py-2 pr-4">Normal Prep</th>
                      <th className="py-2 pr-4">Weather-Adjusted</th>
                      <th className="py-2">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parLevels.map((level) => {
                      const diff = level.adjusted_quantity - level.base_quantity
                      return (
                        <tr key={level.item_name} className="border-b">
                          <td className="py-2 pr-4 font-medium">{level.item_name}</td>
                          <td className="py-2 pr-4">{level.base_quantity}</td>
                          <td className="py-2 pr-4 font-semibold">{level.adjusted_quantity}</td>
                          <td className="py-2">
                            <span
                              className={
                                diff > 0
                                  ? 'text-green-600'
                                  : diff < 0
                                    ? 'text-red-600'
                                    : 'text-muted-foreground'
                              }
                            >
                              {diff > 0 ? '+' : ''}
                              {diff}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {weekForecast.length === 0 && !error && !isPending && (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <p className="text-lg mb-2">Select a location to see the weather forecast</p>
          <p className="text-sm">Choose from your saved locations or enter coordinates manually.</p>
        </div>
      )}

      {isPending && (
        <div className="text-center text-sm text-muted-foreground py-4">
          Loading forecast data...
        </div>
      )}
    </div>
  )
}
