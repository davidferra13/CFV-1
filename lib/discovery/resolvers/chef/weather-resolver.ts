import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'
import type { EventWeatherAlert } from '@/lib/ai/remy-weather'

const MAX_ITEMS = 3

const ALERT_LEVEL_TO_TIER: Record<string, RailTier> = {
  severe: 'p1',
  warning: 'p2',
  info: 'p3',
}

function mapWeatherAlert(alert: EventWeatherAlert): GodModeResolvedItem {
  const tier = ALERT_LEVEL_TO_TIER[alert.alertLevel] ?? 'p3'
  const eventLabel = alert.occasion ?? 'Event'
  const clientLabel = alert.clientName ? ` for ${alert.clientName}` : ''

  // Include chef guidance in context when available
  const contextParts = [alert.alertMessage]
  if (alert.chefGuidance?.length) {
    contextParts.push(...alert.chefGuidance)
  }

  return {
    definitionId: 'chef.event_risk_weather',
    tier,
    label: `Weather alert: ${eventLabel}${clientLabel}`,
    context: contextParts.join(' | '),
    destination: '/events',
    icon: alert.alertLevel === 'severe' ? '🔴' : alert.alertLevel === 'warning' ? '🟡' : '🔵',
    sourceKind: 'system',
    score: alert.alertLevel === 'severe' ? 90 : alert.alertLevel === 'warning' ? 60 : 30,
    nextAction: `Check forecast for ${alert.location} on ${alert.eventDate}`,
    data: {
      eventId: alert.eventId,
      eventDate: alert.eventDate,
      location: alert.location,
      alertLevel: alert.alertLevel,
      forecast: alert.forecast,
    },
  }
}

export async function resolveWeatherAlerts(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  try {
    const { getWeatherAlerts } = await import('@/lib/ai/remy-weather')
    const result = await getWeatherAlerts(ctx.tenantId)
    if (!result || result.alerts.length === 0) return []

    return result.alerts.slice(0, MAX_ITEMS).map(mapWeatherAlert)
  } catch {
    return []
  }
}
