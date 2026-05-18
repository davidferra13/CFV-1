'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { fetchForecast, type DailyForecast } from './open-meteo'
import { dateToDateString } from '@/lib/utils/format'
import {
  getCookingAdvisories,
  extractTechniquesFromMenu,
  type CookingAdvisory,
  type WeatherCondition,
} from './cooking-advisories'

export interface EventCookingAdvisoryResult {
  advisories: CookingAdvisory[]
  forecast: DailyForecast | null
  eventDate: string
  eventName: string
}

/**
 * Fetch cooking advisories for a specific event.
 * Pulls weather forecast for the event date/location, extracts techniques
 * from the event's menu dishes, and runs the advisory engine.
 * Auth gated, tenant scoped.
 */
export async function getEventCookingAdvisories(
  eventId: string
): Promise<EventCookingAdvisoryResult | null> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()

    const { data: event, error } = await db
      .from('events')
      .select('event_date, location_lat, location_lng, occasion, menu_id')
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (error || !event) return null
    if (event.location_lat == null || event.location_lng == null) return null

    const eventDateStr = dateToDateString(event.event_date as Date | string)
    const eventDate = new Date(eventDateStr + 'T00:00:00')
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    if (eventDate < now) return null

    const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / 86_400_000)
    if (diffDays > 7) return null

    // Fetch forecast
    const forecastResult = await fetchForecast(event.location_lat, event.location_lng)
    const dayForecast = forecastResult.forecasts.find((f) => f.date === eventDateStr)
    if (!dayForecast) return null

    // Fetch menu dishes for technique extraction
    let techniques: string[] = []
    if (event.menu_id) {
      const { data: dishes } = await db
        .from('dishes')
        .select('name, description, chef_notes')
        .eq('menu_id', event.menu_id)
        .eq('tenant_id', user.tenantId!)

      if (dishes?.length) {
        const menuItems = dishes.map((d: any) => ({
          name: d.name ?? '',
          description: d.description,
          notes: d.chef_notes,
        }))
        techniques = extractTechniquesFromMenu(menuItems)
      }
    }

    if (!techniques.length) {
      return {
        advisories: [],
        forecast: dayForecast,
        eventDate: eventDateStr,
        eventName: event.occasion ?? 'Event',
      }
    }

    // Build weather condition from forecast
    // Open-Meteo does not provide humidity directly in daily forecast,
    // so we use precipProbability as a humidity proxy (conservative)
    const weather: WeatherCondition = {
      tempF: dayForecast.tempHighF,
      humidity: dayForecast.precipProbability,
      windMph: dayForecast.windSpeedMph,
      precipitation: dayForecast.precipProbability,
      condition: dayForecast.condition,
    }

    const advisories = getCookingAdvisories(weather, techniques)

    return {
      advisories,
      forecast: dayForecast,
      eventDate: eventDateStr,
      eventName: event.occasion ?? 'Event',
    }
  } catch {
    return null
  }
}
