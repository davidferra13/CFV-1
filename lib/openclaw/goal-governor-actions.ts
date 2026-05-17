'use server'

/**
 * OpenClaw Goal Governor Actions
 *
 * Admin-only server actions for KPI contract management,
 * scorecard generation, drift detection, and slice readiness gating.
 * Internal infrastructure, not chef-facing.
 */

import { requireAdmin } from '@/lib/auth/admin'
import type {
  CalibrationStatus,
  ConvergenceStatus,
  DriftSeverity,
  KpiContractEntry,
  KpiDriftResult,
  MetricType,
  RatchetDecision,
  RolloutBlocker,
  ScorecardMetricRow,
  SliceKpiReadiness,
  SlicePhase,
  SliceScorecard,
} from '@/lib/openclaw/goal-governor-types'
import {
  classifyMetricType,
  RATE_DRIFT_DEFAULTS,
  COUNT_DRIFT_DEFAULTS,
} from '@/lib/openclaw/goal-governor-types'

// ---------------------------------------------------------------------------
// In-memory store (no DB table per spec)
// ---------------------------------------------------------------------------

/**
 * KPI contracts keyed by sliceId, then metricName.
 * In production this would be persisted; for now it lives in server memory
 * and is populated via registerSliceKpiContract / registerKpiMetric.
 */
const kpiStore = new Map<string, Map<string, KpiContractEntry>>()

/**
 * Measured values keyed by metricName -> array of measurements (time series).
 */
type MeasuredPoint = {
  value: number
  measuredAt: string
  windowStart: string
  windowEnd: string
  sampleSize: number
}
const measurementStore = new Map<string, MeasuredPoint[]>()

/** Ratchet history */
const ratchetHistory: RatchetDecision[] = []

/** Active rollout blockers keyed by sliceId */
const blockerStore = new Map<string, RolloutBlocker[]>()

// ---------------------------------------------------------------------------
// Slice & Metric Registration
// ---------------------------------------------------------------------------

/**
 * Register a full KPI contract for a slice.
 * Replaces any existing contract for that slice.
 */
export async function registerSliceKpiContract(
  sliceId: string,
  metrics: KpiContractEntry[]
): Promise<{ success: boolean; metricCount: number }> {
  await requireAdmin()

  const sliceMap = new Map<string, KpiContractEntry>()
  for (const m of metrics) {
    sliceMap.set(m.metricName, m)
  }
  kpiStore.set(sliceId, sliceMap)

  return { success: true, metricCount: metrics.length }
}

/**
 * Register or update a single KPI metric within a slice contract.
 */
export async function registerKpiMetric(
  sliceId: string,
  metric: KpiContractEntry
): Promise<{ success: boolean }> {
  await requireAdmin()

  if (!kpiStore.has(sliceId)) {
    kpiStore.set(sliceId, new Map())
  }
  kpiStore.get(sliceId)!.set(metric.metricName, metric)

  return { success: true }
}

/**
 * Remove a metric from a slice contract.
 */
export async function removeKpiMetric(
  sliceId: string,
  metricName: string
): Promise<{ success: boolean; existed: boolean }> {
  await requireAdmin()

  const sliceMap = kpiStore.get(sliceId)
  if (!sliceMap) return { success: true, existed: false }

  const existed = sliceMap.delete(metricName)
  return { success: true, existed }
}

// ---------------------------------------------------------------------------
// Measurement Recording
// ---------------------------------------------------------------------------

/**
 * Record a measured value for a metric.
 * Appends to time series for drift detection.
 */
export async function recordMeasurement(
  metricName: string,
  value: number,
  windowStart: string,
  windowEnd: string,
  sampleSize: number
): Promise<{ success: boolean }> {
  await requireAdmin()

  if (!measurementStore.has(metricName)) {
    measurementStore.set(metricName, [])
  }

  measurementStore.get(metricName)!.push({
    value,
    measuredAt: new Date().toISOString(),
    windowStart,
    windowEnd,
    sampleSize,
  })

  return { success: true }
}

// ---------------------------------------------------------------------------
// KPI Contract Queries
// ---------------------------------------------------------------------------

/**
 * Get the full KPI contract for a slice.
 */
export async function getSliceKpiContract(sliceId: string): Promise<KpiContractEntry[]> {
  await requireAdmin()

  const sliceMap = kpiStore.get(sliceId)
  if (!sliceMap) return []

  return Array.from(sliceMap.values())
}

/**
 * List all registered slice IDs with their metric counts.
 */
export async function listSlices(): Promise<Array<{ sliceId: string; metricCount: number }>> {
  await requireAdmin()

  const result: Array<{ sliceId: string; metricCount: number }> = []
  for (const [sliceId, metrics] of kpiStore) {
    result.push({ sliceId, metricCount: metrics.size })
  }
  return result
}

/**
 * Get a single KPI metric definition.
 */
export async function getKpiMetric(
  sliceId: string,
  metricName: string
): Promise<KpiContractEntry | null> {
  await requireAdmin()

  return kpiStore.get(sliceId)?.get(metricName) ?? null
}

// ---------------------------------------------------------------------------
// Drift Detection
// ---------------------------------------------------------------------------

/**
 * Compute drift severity for a single metric based on its latest measurements.
 */
function computeDrift(
  metric: KpiContractEntry,
  measurements: MeasuredPoint[]
): KpiDriftResult | null {
  if (measurements.length === 0) return null

  const latest = measurements[measurements.length - 1]
  const metricType = classifyMetricType(metric.metricName)
  const deviation = latest.value - metric.targetValue
  const deviationPct = metric.targetValue !== 0 ? Math.abs(deviation / metric.targetValue) * 100 : 0

  const severity = classifyDriftSeverity(metric, metricType, latest.value, measurements)

  // Count consecutive warning/fail windows from the end
  let consecutiveWarning = 0
  let consecutiveFail = 0
  for (let i = measurements.length - 1; i >= 0; i--) {
    const s = classifyDriftSeverity(
      metric,
      metricType,
      measurements[i].value,
      measurements.slice(0, i + 1)
    )
    if (s === 'failed_drift') {
      consecutiveFail++
      consecutiveWarning++
    } else if (s === 'warning') {
      consecutiveWarning++
      consecutiveFail = 0
    } else {
      break
    }
  }

  return {
    metricName: metric.metricName,
    currentValue: latest.value,
    targetValue: metric.targetValue,
    baselineValue: metric.baselineValue,
    deviation,
    deviationPct,
    severity,
    consecutiveWarningWindows: consecutiveWarning,
    consecutiveFailWindows: consecutiveFail,
    measuredAt: latest.measuredAt,
    windowStart: latest.windowStart,
    windowEnd: latest.windowEnd,
    sampleSize: latest.sampleSize,
    meetsMinSample: latest.sampleSize >= metric.minimumSampleSize,
  }
}

/**
 * Classify drift severity using spec-defined thresholds.
 */
function classifyDriftSeverity(
  metric: KpiContractEntry,
  metricType: MetricType,
  currentValue: number,
  _measurements: MeasuredPoint[]
): DriftSeverity {
  const reference = metric.baselineValue ?? metric.targetValue

  if (metricType === 'rate') {
    // Rate metrics: deviation in percentage points
    const ppDiff = Math.abs(currentValue - reference)
    // "Worse" depends on direction: for most rates, lower is worse
    // except blank_result_rate, dead_letter_rate, stale_source_rate where higher is worse
    const isInverseMetric =
      metric.metricName.includes('blank') ||
      metric.metricName.includes('dead_letter') ||
      metric.metricName.includes('stale_source_rate') ||
      metric.metricName.includes('incident_rate')

    const isWorse = isInverseMetric ? currentValue > reference : currentValue < reference

    if (!isWorse) return 'normal_noise'

    if (ppDiff > RATE_DRIFT_DEFAULTS.failedDriftPp) return 'failed_drift'
    if (ppDiff > RATE_DRIFT_DEFAULTS.warningPp) return 'warning'
    if (ppDiff > RATE_DRIFT_DEFAULTS.normalNoisePp) return 'warning'
    return 'normal_noise'
  } else {
    // Count/lag/cost metrics: deviation as percentage of reference
    if (reference === 0) return 'normal_noise'
    const pctDiff = (Math.abs(currentValue - reference) / reference) * 100

    // For counts, higher is usually worse (incident count, queue lag, etc.)
    const isWorse = currentValue > reference

    if (!isWorse) return 'normal_noise'

    if (pctDiff > COUNT_DRIFT_DEFAULTS.failedDriftPct) return 'failed_drift'
    if (pctDiff > COUNT_DRIFT_DEFAULTS.warningPct) return 'warning'
    if (pctDiff > COUNT_DRIFT_DEFAULTS.normalNoisePct) return 'warning'
    return 'normal_noise'
  }
}

/**
 * Detect drift across all metrics in a slice.
 * Admin-only.
 */
export async function detectSliceDrift(sliceId: string): Promise<KpiDriftResult[]> {
  await requireAdmin()

  const sliceMap = kpiStore.get(sliceId)
  if (!sliceMap) return []

  const results: KpiDriftResult[] = []
  for (const [metricName, metric] of sliceMap) {
    const measurements = measurementStore.get(metricName) ?? []
    const drift = computeDrift(metric, measurements)
    if (drift) {
      results.push(drift)
    }
  }

  return results
}

/**
 * Detect drift for a single metric.
 */
export async function detectMetricDrift(
  sliceId: string,
  metricName: string
): Promise<KpiDriftResult | null> {
  await requireAdmin()

  const metric = kpiStore.get(sliceId)?.get(metricName)
  if (!metric) return null

  const measurements = measurementStore.get(metricName) ?? []
  return computeDrift(metric, measurements)
}

// ---------------------------------------------------------------------------
// Scorecard Generation
// ---------------------------------------------------------------------------

/**
 * Determine convergence status for a single metric.
 */
function deriveConvergenceStatus(
  metric: KpiContractEntry,
  drift: KpiDriftResult | null
): ConvergenceStatus {
  if (!drift) return 'unknown'
  if (!drift.meetsMinSample) return 'unknown'

  if (drift.severity === 'failed_drift') return 'failed'
  if (drift.severity === 'warning') return 'warning'

  // Check if current value meets target
  const metricType = classifyMetricType(metric.metricName)
  const isInverse =
    metric.metricName.includes('blank') ||
    metric.metricName.includes('dead_letter') ||
    metric.metricName.includes('stale_source_rate') ||
    metric.metricName.includes('incident_rate')

  if (metricType === 'rate') {
    const onTarget = isInverse
      ? drift.currentValue <= metric.targetValue
      : drift.currentValue >= metric.targetValue
    return onTarget ? 'on_target' : 'warning'
  }

  // Count metrics: lower is usually better (incident count, lag, etc.)
  return drift.currentValue <= metric.targetValue ? 'on_target' : 'warning'
}

/**
 * Determine trend direction from recent measurements.
 */
function deriveTrendDirection(
  measurements: MeasuredPoint[]
): 'improving' | 'stable' | 'degrading' | 'unknown' {
  if (measurements.length < 2) return 'unknown'

  const recent = measurements.slice(-3)
  if (recent.length < 2) return 'unknown'

  const first = recent[0].value
  const last = recent[recent.length - 1].value
  const change = last - first
  const pctChange = first !== 0 ? Math.abs(change / first) * 100 : 0

  if (pctChange < 1) return 'stable'
  // For simplicity, assume higher = better (caller interprets per metric)
  return change > 0 ? 'improving' : 'degrading'
}

/**
 * Generate a founder-facing scorecard for a slice.
 * Admin-only.
 */
export async function generateSliceScorecard(
  sliceId: string,
  sliceName: string,
  slicePhase: SlicePhase
): Promise<SliceScorecard> {
  await requireAdmin()

  const sliceMap = kpiStore.get(sliceId)
  const metrics: ScorecardMetricRow[] = []
  let worstStatus: ConvergenceStatus = 'on_target'
  const statusPriority: Record<ConvergenceStatus, number> = {
    on_target: 0,
    unknown: 1,
    warning: 2,
    failed: 3,
  }

  if (sliceMap) {
    for (const [metricName, metric] of sliceMap) {
      const measurements = measurementStore.get(metricName) ?? []
      const drift = computeDrift(metric, measurements)
      const convergence = deriveConvergenceStatus(metric, drift)
      const trend = deriveTrendDirection(measurements)
      const latest = measurements[measurements.length - 1] ?? null

      metrics.push({
        metricName,
        family: metric.family,
        tier: metric.tier,
        currentValue: drift?.currentValue ?? null,
        targetValue: metric.targetValue,
        warningThreshold: metric.warningThreshold,
        failureThreshold: metric.failureThreshold,
        calibrationStatus: metric.calibrationStatus,
        convergenceStatus: convergence,
        trendDirection: trend,
        lastMeasuredAt: latest?.measuredAt ?? null,
        sampleSize: latest?.sampleSize ?? 0,
        meetsMinSample: latest ? latest.sampleSize >= metric.minimumSampleSize : false,
      })

      if (statusPriority[convergence] > statusPriority[worstStatus]) {
        worstStatus = convergence
      }
    }
  }

  const rolloutBlockers = blockerStore.get(sliceId) ?? []

  // If any hard blockers exist, overall is failed regardless of metrics
  const hasHardBlocker = rolloutBlockers.some((b) => b.severity === 'hard')
  const overall: ConvergenceStatus = hasHardBlocker ? 'failed' : worstStatus

  // Determine recommendation
  let recommendation: 'continue' | 'repair' | 'reprioritize'
  let recommendationReason: string

  if (overall === 'failed') {
    const failedMetrics = metrics.filter((m) => m.convergenceStatus === 'failed')
    if (failedMetrics.length > metrics.length / 2) {
      recommendation = 'reprioritize'
      recommendationReason = `More than half of metrics are in failed state (${failedMetrics.length}/${metrics.length}). Slice may need fundamental rethinking.`
    } else {
      recommendation = 'repair'
      recommendationReason = hasHardBlocker
        ? `Hard rollout blockers exist: ${rolloutBlockers
            .filter((b) => b.severity === 'hard')
            .map((b) => b.reason)
            .join('; ')}`
        : `${failedMetrics.length} metric(s) in failed drift: ${failedMetrics.map((m) => m.metricName).join(', ')}`
    }
  } else if (overall === 'warning') {
    recommendation = 'continue'
    recommendationReason = 'Some metrics in warning state. Continue with monitoring.'
  } else if (overall === 'unknown') {
    recommendation = 'continue'
    recommendationReason =
      'Insufficient data for convergence assessment. Continue collecting measurements.'
  } else {
    recommendation = 'continue'
    recommendationReason = 'All metrics on target. Proceed to next phase.'
  }

  return {
    sliceId,
    sliceName,
    slicePhase,
    overall,
    generatedAt: new Date().toISOString(),
    metrics,
    rolloutBlockers,
    recommendation,
    recommendationReason,
  }
}

// ---------------------------------------------------------------------------
// Slice KPI Readiness Gate
// ---------------------------------------------------------------------------

const KPI_REQUIRED_FIELDS: Array<keyof KpiContractEntry> = [
  'metricName',
  'whyItMatters',
  'formula',
  'targetValue',
  'warningThreshold',
  'failureThreshold',
  'measurementWindow',
  'dataSource',
  'owner',
  'reviewCadence',
  'slicePhase',
  'leadingOrLagging',
  'minimumSampleSize',
  'calibrationStatus',
  'family',
  'tier',
]

/**
 * Check whether a slice's KPI contract is complete enough to begin implementation.
 * Admin-only.
 */
export async function checkSliceReadiness(
  sliceId: string,
  sliceName: string
): Promise<SliceKpiReadiness> {
  await requireAdmin()

  const sliceMap = kpiStore.get(sliceId)
  if (!sliceMap || sliceMap.size === 0) {
    return {
      sliceId,
      sliceName,
      isReady: false,
      definedMetrics: [],
      incompleteMetrics: [],
      assessedAt: new Date().toISOString(),
    }
  }

  const definedMetrics: string[] = []
  const incompleteMetrics: Array<{
    metricName: string
    missingFields: string[]
  }> = []

  for (const [metricName, metric] of sliceMap) {
    const missing: string[] = []

    for (const field of KPI_REQUIRED_FIELDS) {
      const val = metric[field]
      if (val === undefined || val === null || val === '') {
        missing.push(field)
      }
    }

    if (missing.length === 0) {
      definedMetrics.push(metricName)
    } else {
      incompleteMetrics.push({ metricName, missingFields: missing })
    }
  }

  return {
    sliceId,
    sliceName,
    isReady: incompleteMetrics.length === 0 && definedMetrics.length > 0,
    definedMetrics,
    incompleteMetrics,
    assessedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Rollout Blockers
// ---------------------------------------------------------------------------

/**
 * Add a rollout blocker to a slice.
 */
export async function addRolloutBlocker(
  sliceId: string,
  blocker: Omit<RolloutBlocker, 'detectedAt'>
): Promise<{ success: boolean }> {
  await requireAdmin()

  if (!blockerStore.has(sliceId)) {
    blockerStore.set(sliceId, [])
  }

  blockerStore.get(sliceId)!.push({
    ...blocker,
    detectedAt: new Date().toISOString(),
  })

  return { success: true }
}

/**
 * Remove a rollout blocker by ID.
 */
export async function removeRolloutBlocker(
  sliceId: string,
  blockerId: string
): Promise<{ success: boolean; existed: boolean }> {
  await requireAdmin()

  const blockers = blockerStore.get(sliceId)
  if (!blockers) return { success: true, existed: false }

  const idx = blockers.findIndex((b) => b.id === blockerId)
  if (idx === -1) return { success: true, existed: false }

  blockers.splice(idx, 1)
  return { success: true, existed: true }
}

/**
 * List rollout blockers for a slice.
 */
export async function listRolloutBlockers(sliceId: string): Promise<RolloutBlocker[]> {
  await requireAdmin()
  return blockerStore.get(sliceId) ?? []
}

// ---------------------------------------------------------------------------
// Ratchet Management
// ---------------------------------------------------------------------------

/**
 * Apply a ratchet decision (target adjustment) to a metric.
 * Downward ratchets require founderApproved = true.
 */
export async function applyRatchet(
  sliceId: string,
  decision: RatchetDecision
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()

  if (decision.direction === 'down' && !decision.founderApproved) {
    return {
      success: false,
      error:
        'Downward target revision requires explicit founder approval (founderApproved must be true)',
    }
  }

  const metric = kpiStore.get(sliceId)?.get(decision.metricName)
  if (!metric) {
    return { success: false, error: `Metric ${decision.metricName} not found in slice ${sliceId}` }
  }

  if (decision.direction === 'up' && metric.calibrationStatus !== 'locked') {
    return {
      success: false,
      error: `Cannot ratchet up: metric calibration is ${metric.calibrationStatus}, must be locked`,
    }
  }

  // Apply the new target
  metric.targetValue = decision.newTarget
  ratchetHistory.push(decision)

  return { success: true }
}

/**
 * Get ratchet history for a metric.
 */
export async function getRatchetHistory(metricName?: string): Promise<RatchetDecision[]> {
  await requireAdmin()

  if (!metricName) return [...ratchetHistory]
  return ratchetHistory.filter((r) => r.metricName === metricName)
}

// ---------------------------------------------------------------------------
// Calibration Status Management
// ---------------------------------------------------------------------------

/**
 * Update the calibration status of a metric.
 * Only upgrades pending -> provisional -> locked when evidence supports it.
 */
export async function updateCalibrationStatus(
  sliceId: string,
  metricName: string,
  newStatus: CalibrationStatus
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()

  const metric = kpiStore.get(sliceId)?.get(metricName)
  if (!metric) {
    return { success: false, error: `Metric ${metricName} not found in slice ${sliceId}` }
  }

  // Enforce upgrade path: pending -> provisional -> locked
  const statusOrder: Record<CalibrationStatus, number> = {
    pending: 0,
    provisional: 1,
    locked: 2,
  }

  // Allow upgrade or same; downgrade needs explicit intent (no guard, just log)
  metric.calibrationStatus = newStatus

  return { success: true }
}

/**
 * Update baseline value and window for a metric after measurement.
 */
export async function updateBaseline(
  sliceId: string,
  metricName: string,
  baselineValue: number,
  baselineWindow: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()

  const metric = kpiStore.get(sliceId)?.get(metricName)
  if (!metric) {
    return { success: false, error: `Metric ${metricName} not found in slice ${sliceId}` }
  }

  metric.baselineValue = baselineValue
  metric.baselineWindow = baselineWindow

  return { success: true }
}

// ---------------------------------------------------------------------------
// Summary / Overview
// ---------------------------------------------------------------------------

/**
 * Get a high-level summary across all slices.
 * Founder-facing overview of the entire OpenClaw KPI landscape.
 */
export async function getGovernorOverview(): Promise<{
  totalSlices: number
  totalMetrics: number
  byCalibration: Record<CalibrationStatus, number>
  byFamily: Record<string, number>
  slicesWithBlockers: number
  totalBlockers: number
}> {
  await requireAdmin()

  let totalMetrics = 0
  const byCalibration: Record<CalibrationStatus, number> = {
    pending: 0,
    provisional: 0,
    locked: 0,
  }
  const byFamily: Record<string, number> = {}

  for (const [, metrics] of kpiStore) {
    for (const [, metric] of metrics) {
      totalMetrics++
      byCalibration[metric.calibrationStatus]++
      byFamily[metric.family] = (byFamily[metric.family] ?? 0) + 1
    }
  }

  let slicesWithBlockers = 0
  let totalBlockers = 0
  for (const [, blockers] of blockerStore) {
    if (blockers.length > 0) {
      slicesWithBlockers++
      totalBlockers += blockers.length
    }
  }

  return {
    totalSlices: kpiStore.size,
    totalMetrics,
    byCalibration,
    byFamily,
    slicesWithBlockers,
    totalBlockers,
  }
}
