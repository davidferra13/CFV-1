import { notifyCIL } from '@/lib/cil/notify'
import type { QualityDriftAlert } from './dish-quality-tracker'

export async function emitQualityDriftSignals(
  tenantId: string,
  alerts: QualityDriftAlert[]
): Promise<void> {
  for (const alert of alerts) {
    try {
      await notifyCIL({
        tenantId,
        source: 'reputation',
        entityIds: [`recipe_${normalizeToCilId(alert.dishName)}`],
        payload: {
          type: 'dish_quality_drift',
          dishName: alert.dishName,
          severity: alert.severity,
          currentAvg: alert.currentAvg,
          peakAvg: alert.peakAvg,
          decline: alert.decline,
          message: alert.message,
        },
      })
    } catch (err) {
      console.error(
        '[quality-drift-cil-bridge] Failed to emit signal (non-fatal)',
        err instanceof Error ? err.message : err
      )
    }
  }
}

function normalizeToCilId(dishName: string): string {
  return dishName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}
