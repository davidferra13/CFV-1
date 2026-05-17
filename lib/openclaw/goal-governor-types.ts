/**
 * OpenClaw Goal Governor & KPI Contract - Type Definitions
 *
 * Types for KPI tracking, goal governance, convergence status,
 * and drift detection across OpenClaw build slices.
 *
 * NOT a 'use server' file - safe to import from actions, API routes, and UI.
 */

// ---------------------------------------------------------------------------
// Calibration & Classification
// ---------------------------------------------------------------------------

/** Whether a KPI target is evidence-ready */
export type CalibrationStatus = 'pending' | 'provisional' | 'locked'

/** Leading indicators predict; lagging indicators confirm */
export type LeadingOrLagging = 'leading' | 'lagging'

/** Metric hierarchy tier */
export type MetricTier =
  | 'primary_outcome'
  | 'guardrail'
  | 'leading_indicator'
  | 'lagging_indicator'

/** KPI metric families */
export type KpiFamily =
  | 'coverage_and_observation'
  | 'price_usefulness'
  | 'metadata_completeness'
  | 'runtime_quality'
  | 'product_outcome_value'
  | 'economic_grounding'

/** Review cadence for KPI evaluation */
export type ReviewCadence = 'daily' | 'weekly' | 'biweekly' | 'monthly'

/** Slice lifecycle phase */
export type SlicePhase =
  | 'pre_implementation'
  | 'active_implementation'
  | 'post_implementation'
  | 'maintenance'

// ---------------------------------------------------------------------------
// KPI Contract (per-metric definition)
// ---------------------------------------------------------------------------

/**
 * Full KPI contract entry. Every serious OpenClaw build slice
 * must define one of these per tracked metric before implementation.
 */
export type KpiContractEntry = {
  /** Unique metric identifier (snake_case) */
  metricName: string
  /** Plain-English explanation of why this metric matters */
  whyItMatters: string
  /** Numerator / denominator / inclusion-exclusion rules */
  formula: string
  /** The committed success target */
  targetValue: number
  /** Threshold that triggers a warning state */
  warningThreshold: number
  /** Threshold that triggers a failure state */
  failureThreshold: number
  /** Time window for measurement (e.g. "14d", "28d", "56d") */
  measurementWindow: string
  /** Where the data comes from (e.g. "pi_bridge", "chefflow_db", "runtime_logs") */
  dataSource: string
  /** Who owns this metric (agent or role name) */
  owner: string
  /** How often the metric is reviewed */
  reviewCadence: ReviewCadence
  /** Which slice phase this metric applies to */
  slicePhase: SlicePhase
  /** Whether this is a leading or lagging indicator */
  leadingOrLagging: LeadingOrLagging
  /** Current measured baseline value (null if not yet captured) */
  baselineValue: number | null
  /** Window over which the baseline was captured */
  baselineWindow: string | null
  /** Minimum events/entities before the metric is meaningful */
  minimumSampleSize: number
  /** Whether we trust this metric enough to gate on it */
  calibrationStatus: CalibrationStatus
  /** Optional stretch target beyond the committed target */
  stretchValue?: number
  /** Metric family classification */
  family: KpiFamily
  /** Metric hierarchy tier */
  tier: MetricTier
}

// ---------------------------------------------------------------------------
// Convergence & Drift
// ---------------------------------------------------------------------------

/** Overall slice convergence status */
export type ConvergenceStatus = 'on_target' | 'warning' | 'failed' | 'unknown'

/** Drift severity for a single metric */
export type DriftSeverity = 'normal_noise' | 'warning' | 'failed_drift'

/** Drift detection result for one metric in one review window */
export type KpiDriftResult = {
  metricName: string
  currentValue: number
  targetValue: number
  baselineValue: number | null
  deviation: number
  deviationPct: number
  severity: DriftSeverity
  consecutiveWarningWindows: number
  consecutiveFailWindows: number
  measuredAt: string
  windowStart: string
  windowEnd: string
  sampleSize: number
  meetsMinSample: boolean
}

// ---------------------------------------------------------------------------
// Scorecard (founder-facing summary)
// ---------------------------------------------------------------------------

/** Single metric row in the scorecard */
export type ScorecardMetricRow = {
  metricName: string
  family: KpiFamily
  tier: MetricTier
  currentValue: number | null
  targetValue: number
  warningThreshold: number
  failureThreshold: number
  calibrationStatus: CalibrationStatus
  convergenceStatus: ConvergenceStatus
  trendDirection: 'improving' | 'stable' | 'degrading' | 'unknown'
  lastMeasuredAt: string | null
  sampleSize: number
  meetsMinSample: boolean
}

/** Scorecard for a single OpenClaw build slice */
export type SliceScorecard = {
  sliceId: string
  sliceName: string
  slicePhase: SlicePhase
  overall: ConvergenceStatus
  generatedAt: string
  metrics: ScorecardMetricRow[]
  /** Metrics that are blocking rollout */
  rolloutBlockers: RolloutBlocker[]
  /** Recommendation for next action */
  recommendation: 'continue' | 'repair' | 'reprioritize'
  recommendationReason: string
}

/** A condition that blocks rollout even if primary metrics look good */
export type RolloutBlocker = {
  id: string
  reason: string
  severity: 'hard' | 'soft'
  relatedMetric: string | null
  detectedAt: string
}

// ---------------------------------------------------------------------------
// Ratchet Policy
// ---------------------------------------------------------------------------

/** Direction and justification for a target change */
export type RatchetDirection = 'up' | 'flat' | 'down'

export type RatchetDecision = {
  metricName: string
  direction: RatchetDirection
  previousTarget: number
  newTarget: number
  justification: string
  /** Down requires founder approval */
  founderApproved: boolean
  decidedAt: string
  /** Evidence windows that supported this decision */
  evidenceWindows: number
}

// ---------------------------------------------------------------------------
// Slice KPI Readiness Gate
// ---------------------------------------------------------------------------

/** Pre-implementation readiness check result */
export type SliceKpiReadiness = {
  sliceId: string
  sliceName: string
  isReady: boolean
  /** Metrics that are fully defined */
  definedMetrics: string[]
  /** Metrics missing required fields */
  incompleteMetrics: Array<{
    metricName: string
    missingFields: string[]
  }>
  /** Assessment timestamp */
  assessedAt: string
}

// ---------------------------------------------------------------------------
// Drift Threshold Defaults
// ---------------------------------------------------------------------------

/** Default thresholds for rate-based metrics (percentage points) */
export const RATE_DRIFT_DEFAULTS = {
  normalNoisePp: 2,
  warningPp: 5,
  failedDriftPp: 8,
  consecutiveWindowsForWarning: 2,
  consecutiveWindowsForFailed: 2,
} as const

/** Default thresholds for count/lag/cost metrics (percentage of baseline) */
export const COUNT_DRIFT_DEFAULTS = {
  normalNoisePct: 10,
  warningPct: 20,
  failedDriftPct: 35,
  consecutiveWindowsForWarning: 2,
  consecutiveWindowsForFailed: 2,
} as const

/** Default calibration windows and sample floors */
export const CALIBRATION_DEFAULTS = {
  operational: {
    baselineWindowDays: 14,
    minSampleEvents: 200,
    minSampleEntities: 50,
  },
  chefLookup: {
    baselineWindowDays: 28,
    minSampleLookups: 250,
  },
  recipePricing: {
    baselineWindowDays: 28,
    minSampleRuns: 50,
  },
  strategic: {
    baselineWindowDays: 56,
    minConsecutiveWindows: 2,
  },
} as const

// ---------------------------------------------------------------------------
// Metric type classification helper
// ---------------------------------------------------------------------------

export type MetricType = 'rate' | 'count'

/**
 * Determine whether a metric uses rate-based or count-based drift thresholds.
 * Rate metrics have values 0-100 (percentages). Count metrics are raw numbers.
 */
export function classifyMetricType(metricName: string): MetricType {
  const rateMetrics = [
    'lookup_success_rate',
    'recipe_completion_rate',
    'ingredient_price_resolution_rate',
    'product_usability_rate',
    'source_freshness_rate',
    'source_health_rate',
    'blank_result_rate',
    'stale_source_rate',
    'dead_letter_rate',
    'image_coverage',
    'source_url_coverage',
    'classification_completeness',
    'nutrition_evidence_coverage',
    'allergen_evidence_coverage',
    'reliable_pingability_coverage',
    'inferred_price_acceptance_rate',
    'stale_source_recovery_rate',
    'current_pct',
    'availability_pct',
  ]
  if (rateMetrics.includes(metricName) || metricName.endsWith('_rate') || metricName.endsWith('_coverage') || metricName.endsWith('_pct')) {
    return 'rate'
  }
  return 'count'
}
