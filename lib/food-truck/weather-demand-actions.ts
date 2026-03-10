'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import {
  getOperationalRiskSignals,
  type OperationalRiskSignals,
} from '@/lib/public-data/weather-risk'

// ---- Types ----

export type WeatherDay = {
  date: string
  temp_high_f: number
  temp_low_f: number
  precip_probability: number
  wind_speed_mph: number
  weather_code: number
  weather_description: string
}

export type DemandAdjustment = {
  date: string
  weather: WeatherDay
  multiplier: number
  reasons: string[]
  is_weekend: boolean
}

export type AdjustedParLevel = {
  item_name: string
  base_quantity: number
  adjusted_quantity: number
  multiplier: number
}

export type WeatherOperationalRisk = OperationalRiskSignals

// ---- Weather Code Descriptions ----

const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
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

// ---- Weather Fetch ----

export async function getWeatherForecast(
  lat: number,
  lng: number,
  date: string
): Promise<WeatherDay[]> {
  await requireChef() // auth check

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,weather_code&timezone=auto&temperature_unit=fahrenheit&wind_speed_unit=mph`

  const res = await fetch(url, { next: { revalidate: 3600 } }) // cache 1 hour
  if (!res.ok) {
    throw new Error(`Weather API failed: ${res.status} ${res.statusText}`)
  }

  const json = await res.json()
  const daily = json.daily

  if (!daily || !daily.time) {
    throw new Error('Weather API returned invalid data')
  }

  const days: WeatherDay[] = []
  for (let i = 0; i < daily.time.length; i++) {
    days.push({
      date: daily.time[i],
      temp_high_f: daily.temperature_2m_max[i],
      temp_low_f: daily.temperature_2m_min[i],
      precip_probability: daily.precipitation_probability_max[i],
      wind_speed_mph: daily.wind_speed_10m_max[i],
      weather_code: daily.weather_code[i],
      weather_description: WEATHER_CODES[daily.weather_code[i]] ?? 'Unknown',
    })
  }

  return days
}

// ---- Deterministic Demand Multiplier (Formula > AI) ----

export function calculateDemandMultiplier(weather: WeatherDay, date: string): DemandAdjustment {
  let multiplier = 1.0
  const reasons: string[] = []

  // Temperature adjustment
  if (weather.temp_high_f > 85) {
    multiplier += 0.15
    reasons.push(`Hot day (${weather.temp_high_f}F): +15% demand for cold items`)
  } else if (weather.temp_high_f < 40) {
    multiplier -= 0.25
    reasons.push(`Cold day (${weather.temp_high_f}F): -25% fewer walk-ups expected`)
  }

  // Precipitation adjustment
  if (weather.precip_probability > 80) {
    multiplier -= 0.5
    reasons.push(`High rain chance (${weather.precip_probability}%): -50% foot traffic`)
  } else if (weather.precip_probability > 60) {
    multiplier -= 0.3
    reasons.push(`Rain likely (${weather.precip_probability}%): -30% foot traffic`)
  }

  // Wind adjustment
  if (weather.wind_speed_mph > 25) {
    multiplier -= 0.15
    reasons.push(`High winds (${weather.wind_speed_mph}mph): -15% outdoor dining`)
  }

  // Weekend bonus
  const dayOfWeek = new Date(date).getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  if (isWeekend) {
    multiplier += 0.2
    reasons.push('Weekend: +20% foot traffic')
  }

  // Clamp to [0.3, 1.5]
  multiplier = Math.max(0.3, Math.min(1.5, multiplier))
  multiplier = Math.round(multiplier * 100) / 100

  if (reasons.length === 0) {
    reasons.push('Normal conditions, no adjustments')
  }

  return {
    date,
    weather,
    multiplier,
    reasons,
    is_weekend: isWeekend,
  }
}

// ---- Adjusted Par Levels ----

export async function getAdjustedParLevels(
  date: string,
  lat: number,
  lng: number,
  baseParLevels: { item_name: string; base_quantity: number }[]
): Promise<{
  adjustment: DemandAdjustment
  par_levels: AdjustedParLevel[]
}> {
  const forecast = await getWeatherForecast(lat, lng, date)
  const dayForecast = forecast.find((d) => d.date === date)

  if (!dayForecast) {
    // Date not in forecast range, return base levels with 1.0 multiplier
    return {
      adjustment: {
        date,
        weather: {
          date,
          temp_high_f: 0,
          temp_low_f: 0,
          precip_probability: 0,
          wind_speed_mph: 0,
          weather_code: -1,
          weather_description: 'No forecast available',
        },
        multiplier: 1.0,
        reasons: ['Date outside forecast range, using base quantities'],
        is_weekend: false,
      },
      par_levels: baseParLevels.map((p) => ({
        item_name: p.item_name,
        base_quantity: p.base_quantity,
        adjusted_quantity: p.base_quantity,
        multiplier: 1.0,
      })),
    }
  }

  const adjustment = calculateDemandMultiplier(dayForecast, date)

  const par_levels: AdjustedParLevel[] = baseParLevels.map((p) => ({
    item_name: p.item_name,
    base_quantity: p.base_quantity,
    adjusted_quantity: Math.max(1, Math.round(p.base_quantity * adjustment.multiplier)),
    multiplier: adjustment.multiplier,
  }))

  return { adjustment, par_levels }
}

// ---- Week Forecast With Demand ----

export async function getWeekForecastWithDemand(
  lat: number,
  lng: number
): Promise<DemandAdjustment[]> {
  await requireChef()

  const forecast = await getWeatherForecast(lat, lng, new Date().toISOString().split('T')[0])

  return forecast.map((day) => calculateDemandMultiplier(day, day.date))
}

export async function getWeatherOperationalRisk(
  lat: number,
  lng: number
): Promise<WeatherOperationalRisk> {
  await requireChef()
  return getOperationalRiskSignals(lat, lng)
}

// ---- Get Location Coordinates ----

export async function getLocationCoordinates(locationId: string): Promise<{
  lat: number
  lng: number
  name: string
} | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('truck_locations')
    .select('lat, lng, name')
    .eq('id', locationId)
    .eq('tenant_id', user.entityId!)
    .single()

  if (error || !data) return null
  if (data.lat == null || data.lng == null) return null

  return { lat: Number(data.lat), lng: Number(data.lng), name: data.name }
}
