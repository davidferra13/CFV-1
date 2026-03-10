import { classifyAirQualityRiskLevel, getCurrentAirQuality } from '@/lib/public-data/airnow'
import { getNwsActiveAlerts, type NwsAlert } from '@/lib/public-data/nws'

export type OperationalRiskSignals = {
  alerts: NwsAlert[]
  airQuality: Awaited<ReturnType<typeof getCurrentAirQuality>>
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  reasons: string[]
  updatedAt: string
}

function normalizeSeverity(value?: string | null): string {
  return String(value ?? '')
    .toLowerCase()
    .trim()
}

export function computeOperationalRiskLevel(input: {
  alerts: NwsAlert[]
  airQuality: Awaited<ReturnType<typeof getCurrentAirQuality>>
}): Pick<OperationalRiskSignals, 'riskLevel' | 'reasons'> {
  const reasons: string[] = []
  const highSeverityAlert = input.alerts.some((alert) =>
    ['severe', 'extreme'].includes(normalizeSeverity(alert.severity))
  )
  const anyAlert = input.alerts.length > 0
  const airQualityRisk = classifyAirQualityRiskLevel(input.airQuality)

  if (highSeverityAlert) {
    reasons.push('National Weather Service severe alert active for this location.')
  } else if (anyAlert) {
    reasons.push('National Weather Service advisory or watch active for this location.')
  }

  if (input.airQuality) {
    reasons.push(`Air quality is ${input.airQuality.category} (AQI ${input.airQuality.aqi}).`)
  }

  let riskLevel: OperationalRiskSignals['riskLevel'] = 'low'
  if (airQualityRisk === 'critical' || highSeverityAlert) riskLevel = 'critical'
  else if (airQualityRisk === 'high' || anyAlert) riskLevel = 'high'
  else if (airQualityRisk === 'medium') riskLevel = 'medium'

  if (reasons.length === 0) {
    reasons.push('No active weather or air-quality warnings detected.')
  }

  return { riskLevel, reasons }
}

export async function getOperationalRiskSignals(
  lat: number,
  lng: number
): Promise<OperationalRiskSignals> {
  const [alerts, airQuality] = await Promise.all([
    getNwsActiveAlerts(lat, lng),
    getCurrentAirQuality(lat, lng),
  ])
  const computed = computeOperationalRiskLevel({ alerts, airQuality })

  return {
    alerts,
    airQuality,
    riskLevel: computed.riskLevel,
    reasons: computed.reasons,
    updatedAt: new Date().toISOString(),
  }
}
