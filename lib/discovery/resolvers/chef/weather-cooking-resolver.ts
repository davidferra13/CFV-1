import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'
import type { CookingAdvisory } from '@/lib/weather/cooking-advisories'

const MAX_ITEMS = 5

const SEVERITY_TO_TIER: Record<string, RailTier> = {
  critical: 'p1',
  warning: 'p2',
}

const SEVERITY_ICON: Record<string, string> = {
  critical: '🔴',
  warning: '🟡',
}

function formatTechniqueLabel(technique: string): string {
  return technique
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function mapAdvisoryToRailItem(
  advisory: CookingAdvisory,
  eventId: string,
  eventName: string,
  eventDate: string
): GodModeResolvedItem {
  const tier = SEVERITY_TO_TIER[advisory.severity] ?? 'p2'
  const techniqueLabel = formatTechniqueLabel(advisory.technique)

  return {
    definitionId: 'chef.cooking_weather_advisory',
    tier,
    label: `${advisory.severity === 'critical' ? 'Critical' : 'Warning'}: ${techniqueLabel} risk for ${eventName}`,
    context: advisory.message,
    destination: `/events/${eventId}`,
    icon: SEVERITY_ICON[advisory.severity] ?? '🔵',
    sourceKind: 'system',
    score: advisory.severity === 'critical' ? 85 : 55,
    nextAction: advisory.alternative
      ? `Consider: ${advisory.alternative}`
      : `Review ${techniqueLabel.toLowerCase()} plan for ${eventDate}`,
    data: {
      eventId,
      eventDate,
      eventName,
      technique: advisory.technique,
      severity: advisory.severity,
    },
  }
}

export async function resolveWeatherCookingAdvisories(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  try {
    const db: any = (await import('@/lib/db/server')).createServerClient()

    const now = ctx.now
    const maxDate = new Date(now)
    maxDate.setDate(now.getDate() + 7)
    const nowStr = now.toISOString().split('T')[0]
    const maxStr = maxDate.toISOString().split('T')[0]

    const { data: events } = await db
      .from('events')
      .select('id, event_date, occasion, location_lat, location_lng, menu_id')
      .eq('tenant_id', ctx.tenantId)
      .not('status', 'in', '("cancelled")')
      .gte('event_date', nowStr)
      .lte('event_date', maxStr)
      .not('location_lat', 'is', null)
      .not('location_lng', 'is', null)
      .not('menu_id', 'is', null)

    if (!events?.length) return []

    const { fetchForecast } = await import('@/lib/weather/open-meteo')
    const { getCookingAdvisories, extractTechniquesFromMenu } =
      await import('@/lib/weather/cooking-advisories')
    const { dateToDateString } = await import('@/lib/utils/format')

    const items: GodModeResolvedItem[] = []

    for (const event of events) {
      if (items.length >= MAX_ITEMS) break

      try {
        const eventDateStr = dateToDateString(event.event_date as Date | string)

        // Fetch dishes for this event's menu
        const { data: dishes } = await db
          .from('dishes')
          .select('name, description, chef_notes')
          .eq('menu_id', event.menu_id)
          .eq('tenant_id', ctx.tenantId)

        if (!dishes?.length) continue

        const menuItems = dishes.map((d: any) => ({
          name: d.name ?? '',
          description: d.description,
          notes: d.chef_notes,
        }))
        const techniques = extractTechniquesFromMenu(menuItems)
        if (!techniques.length) continue

        // Fetch weather
        const forecastResult = await fetchForecast(event.location_lat, event.location_lng)
        const dayForecast = forecastResult.forecasts.find((f: any) => f.date === eventDateStr)
        if (!dayForecast) continue

        const weather = {
          tempF: dayForecast.tempHighF,
          humidity: dayForecast.precipProbability,
          windMph: dayForecast.windSpeedMph,
          precipitation: dayForecast.precipProbability,
          condition: dayForecast.condition,
        }

        const advisories = getCookingAdvisories(weather, techniques)

        // Only surface critical and warning for the rail (skip info)
        const railAdvisories = advisories.filter(
          (a: any) => a.severity === 'critical' || a.severity === 'warning'
        )

        for (const advisory of railAdvisories) {
          if (items.length >= MAX_ITEMS) break
          items.push(
            mapAdvisoryToRailItem(advisory, event.id, event.occasion ?? 'Event', eventDateStr)
          )
        }
      } catch {
        // Skip individual event failures silently
      }
    }

    return items
  } catch {
    return []
  }
}
