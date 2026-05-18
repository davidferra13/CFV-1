import type { GodModeResolvedItem, GodModeResolverContext } from '../../god-mode-types'

export async function resolveQualityDrift(
  _ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  try {
    const { getQualityDriftAlerts } = await import('@/lib/intelligence/dish-quality-tracker')
    const alerts = await getQualityDriftAlerts()

    return alerts.map((alert) => ({
      definitionId: `chef.quality_drift.${normalizeDishKey(alert.dishName)}`,
      tier: alert.severity === 'warning' ? 'p3' : 'p4',
      label: `Quality drift: ${alert.dishName} ratings declining (${alert.peakAvg} to ${alert.currentAvg})`,
      context: `Based on guest ratings across multiple events. Consider reviewing technique or ingredients.`,
      destination: '/chef/intelligence',
      icon: 'trending-down',
      sourceKind: 'system',
      evidenceLabel: 'computed',
      confidence: 0.6,
      nextAction: 'Review recent prep notes and ingredient sourcing for this dish',
      data: {
        dishName: alert.dishName,
        currentAvg: alert.currentAvg,
        peakAvg: alert.peakAvg,
        decline: alert.decline,
        severity: alert.severity,
      },
    }))
  } catch (err) {
    console.error('[quality-drift-resolver] Failed:', err)
    return []
  }
}

function normalizeDishKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}
