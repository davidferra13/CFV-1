'use server'

// Weather actions for Event Intelligence Panel
// Wraps Open-Meteo API (free, no key) for 3-day forecast window on event detail.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { fetchForecast, type DailyForecast, wmoLookup } from '@/lib/weather/open-meteo'

// ── Types ──────────────────────────────────────────────────────────────────

export interface EventWeatherForecast {
  days: WeatherDay[]
  eventDateIndex: number
  isOutdoor: boolean
  needsContingency: boolean
}

export interface WeatherDay {
  date: string
  label: string
  tempHighF: number
  tempLowF: number
  precipProbability: number
  windSpeedMph: number
  condition: string
  emoji: string
  weatherCode: number
  isEventDay: boolean
}

// ── Outdoor detection ──────────────────────────────────────────────────────

const OUTDOOR_KEYWORDS = ['farm', 'outdoor', 'garden', 'bbq', 'barbecue', 'picnic', 'rooftop']

function detectOutdoor(occasion: string | null, venueType: string | null): boolean {
  if (venueType === 'outdoor') return true
  if (occasion) {
    const lower = occasion.toLowerCase()
    return OUTDOOR_KEYWORDS.some((kw) => lower.includes(kw))
  }
  return false
}

// ── Main action ────────────────────────────────────────────────────────────

export async function getEventWeatherForecast(
  eventId: string
): Promise<EventWeatherForecast | null> {
  const chef = await requireChef()
  const db: any = createServerClient()

  // Get event with location + occasion
  const { data: event } = await db
    .from('events')
    .select('id, tenant_id, event_date, location_lat, location_lng, occasion, venue_profile_id')
    .eq('id', eventId)
    .eq('tenant_id', chef.tenantId!)
    .single()

  if (!event) return null
  if (!event.location_lat || !event.location_lng) return null

  const eventDate = new Date(event.event_date)
  const now = new Date()
  const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / 86_400_000)

  // Only show forecast for events within 7 days
  if (diffDays > 7 || diffDays < -1) return null

  const result = await fetchForecast(event.location_lat, event.location_lng)
  if (result.error || !result.forecasts.length) return null

  const eventDateStr = eventDate.toISOString().slice(0, 10)

  // Build 3-day window: day before, event day, day after
  const targetDates = [
    new Date(eventDate.getTime() - 86_400_000).toISOString().slice(0, 10),
    eventDateStr,
    new Date(eventDate.getTime() + 86_400_000).toISOString().slice(0, 10),
  ]

  const days: WeatherDay[] = []
  let eventDateIndex = -1

  for (const targetDate of targetDates) {
    const forecast = result.forecasts.find((f) => f.date === targetDate)
    if (!forecast) continue

    const isEventDay = targetDate === eventDateStr
    if (isEventDay) eventDateIndex = days.length

    const { emoji } = wmoLookup(forecast.weatherCode)

    days.push({
      date: forecast.date,
      label: isEventDay ? 'Event Day' : formatDayLabel(forecast.date, eventDateStr),
      tempHighF: forecast.tempHighF,
      tempLowF: forecast.tempLowF,
      precipProbability: forecast.precipProbability,
      windSpeedMph: forecast.windSpeedMph,
      condition: forecast.condition,
      emoji,
      weatherCode: forecast.weatherCode,
      isEventDay,
    })
  }

  if (!days.length) return null

  // Check outdoor status
  let venueType: string | null = null
  if (event.venue_profile_id) {
    const { data: venue } = await db
      .from('venue_profiles')
      .select('venue_type')
      .eq('id', event.venue_profile_id)
      .maybeSingle()
    venueType = venue?.venue_type ?? null
  }

  // Also check event_venue_details for rain backup
  const { data: venueDetails } = await db
    .from('event_venue_details')
    .select('rain_backup_plan')
    .eq('event_id', eventId)
    .maybeSingle()

  const isOutdoor = detectOutdoor(event.occasion, venueType) || !!venueDetails?.rain_backup_plan

  // Need contingency if outdoor + high precip + no rain plan
  const eventDayForecast = days.find((d) => d.isEventDay)
  const needsContingency =
    isOutdoor && (eventDayForecast?.precipProbability ?? 0) > 40 && !venueDetails?.rain_backup_plan

  return {
    days,
    eventDateIndex,
    isOutdoor,
    needsContingency,
  }
}

function formatDayLabel(date: string, eventDate: string): string {
  const d = new Date(date)
  const e = new Date(eventDate)
  const diff = Math.round((d.getTime() - e.getTime()) / 86_400_000)
  if (diff === -1) return 'Day Before'
  if (diff === 1) return 'Day After'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
