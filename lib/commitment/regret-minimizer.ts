import { createServerClient } from '@/lib/db/server'

// Regret Minimizer (#35)
// Pre-override regret prediction. Tracks predicted vs actual regret to
// calibrate future predictions.

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export interface RegretPrediction {
  id: string
  tenantId: string
  overrideId: string
  predictedLevel: number
  actualLevel: number | null
  calibrationDelta: number | null
  createdAt: Date
  actualRecordedAt: Date | null
}

export interface CalibrationReport {
  tenantId: string
  totalPredictions: number
  calibratedPredictions: number
  averageDelta: number
  accuracyRate: number
  bias: 'overestimates' | 'underestimates' | 'well-calibrated'
  distributionPredicted: Record<number, number>
  distributionActual: Record<number, number>
  recentTrend: 'improving' | 'stable' | 'worsening'
}

/**
 * Record a regret prediction at override time (1=none, 5=severe).
 */
export async function recordRegretPrediction(
  tenantId: string,
  overrideId: string,
  regretLevel1to5: number
): Promise<RegretPrediction> {
  const clamped = Math.max(1, Math.min(5, Math.round(regretLevel1to5)))
  const id = generateId()
  const now = new Date()

  const client = createServerClient()
  await client.from('commitment_regret_predictions' as any).insert({
    id,
    tenant_id: tenantId,
    override_id: overrideId,
    predicted_level: clamped,
    actual_level: null,
    calibration_delta: null,
    created_at: now.toISOString(),
    actual_recorded_at: null,
  })

  return { id, tenantId, overrideId, predictedLevel: clamped, actualLevel: null, calibrationDelta: null, createdAt: now, actualRecordedAt: null }
}

/**
 * Record the actual regret level after time has passed (24-72 hours later).
 */
export async function recordActualRegret(
  tenantId: string,
  overrideId: string,
  actualLevel: number
): Promise<RegretPrediction | null> {
  const clamped = Math.max(1, Math.min(5, Math.round(actualLevel)))
  const client = createServerClient()
  const now = new Date()

  const { data: rows } = await client
    .from('commitment_regret_predictions' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('override_id', overrideId)
    .limit(1)

  if (!rows || rows.length === 0) return null

  const row = rows[0] as any
  const predictedLevel = row.predicted_level as number
  const calibrationDelta = clamped - predictedLevel

  await client
    .from('commitment_regret_predictions' as any)
    .update({ actual_level: clamped, calibration_delta: calibrationDelta, actual_recorded_at: now.toISOString() })
    .eq('id', row.id)
    .eq('tenant_id', tenantId)

  return {
    id: row.id as string, tenantId, overrideId, predictedLevel,
    actualLevel: clamped, calibrationDelta, createdAt: new Date(row.created_at as string), actualRecordedAt: now,
  }
}

/**
 * Get a calibration report showing prediction accuracy.
 */
export async function getCalibrationReport(tenantId: string): Promise<CalibrationReport> {
  const client = createServerClient()

  const { data: rows } = await client
    .from('commitment_regret_predictions' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  const all = (rows ?? []) as any[]
  const calibrated = all.filter((r) => r.actual_level !== null)

  const distributionPredicted: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  const distributionActual: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

  let totalDelta = 0
  let withinOne = 0

  for (const r of all) {
    distributionPredicted[r.predicted_level as number] = (distributionPredicted[r.predicted_level as number] ?? 0) + 1
  }

  for (const r of calibrated) {
    distributionActual[r.actual_level as number] = (distributionActual[r.actual_level as number] ?? 0) + 1
    const delta = (r.actual_level as number) - (r.predicted_level as number)
    totalDelta += delta
    if (Math.abs(delta) <= 1) withinOne++
  }

  const averageDelta = calibrated.length > 0 ? Math.round((totalDelta / calibrated.length) * 100) / 100 : 0
  const accuracyRate = calibrated.length > 0 ? Math.round((withinOne / calibrated.length) * 1000) / 10 : 0

  let bias: CalibrationReport['bias'] = 'well-calibrated'
  if (averageDelta > 0.5) bias = 'underestimates'
  else if (averageDelta < -0.5) bias = 'overestimates'

  let recentTrend: CalibrationReport['recentTrend'] = 'stable'
  if (calibrated.length >= 10) {
    const recent5 = calibrated.slice(0, 5)
    const older5 = calibrated.slice(5, 10)
    const recentAvgDelta = recent5.reduce((s: number, r: any) => s + Math.abs(r.calibration_delta as number), 0) / 5
    const olderAvgDelta = older5.reduce((s: number, r: any) => s + Math.abs(r.calibration_delta as number), 0) / 5
    if (recentAvgDelta < olderAvgDelta - 0.3) recentTrend = 'improving'
    else if (recentAvgDelta > olderAvgDelta + 0.3) recentTrend = 'worsening'
  }

  return { tenantId, totalPredictions: all.length, calibratedPredictions: calibrated.length, averageDelta, accuracyRate, bias, distributionPredicted, distributionActual, recentTrend }
}

/**
 * Get simple accuracy metrics.
 */
export async function getRegretAccuracy(
  tenantId: string
): Promise<{ accuracy: number; sampleSize: number; bias: string }> {
  const report = await getCalibrationReport(tenantId)
  return { accuracy: report.accuracyRate, sampleSize: report.calibratedPredictions, bias: report.bias }
}
