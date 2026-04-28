import {
  isHighImpactFactType,
  isRegulatedFactType,
  requiresJurisdictionScope,
  type CulinaryFactType,
  type CulinaryLifecycleState,
  type CulinaryPublicationEligibility,
} from './domain'

export type { CulinaryFactType } from './domain'

export type CulinaryFactLifecycleState = CulinaryLifecycleState

export type CulinaryFactPublicationEligibility = CulinaryPublicationEligibility | 'needs_review'

export type CulinaryFactReviewStatus =
  | 'not_required'
  | 'pending'
  | 'approved'
  | 'verified'
  | 'rejected'
  | 'dismissed'

export type CulinaryFactFreshnessStatus = 'fresh' | 'stale' | 'unknown'

export type CulinaryFactTrustReason =
  | 'source_missing'
  | 'capture_timestamp_missing'
  | 'confidence_invalid'
  | 'confidence_too_low'
  | 'publication_not_surfaceable'
  | 'lifecycle_not_surfaceable'
  | 'lifecycle_conflicting'
  | 'lifecycle_rejected'
  | 'lifecycle_archived'
  | 'lifecycle_superseded'
  | 'fact_stale'
  | 'observed_timestamp_invalid'
  | 'review_required'
  | 'review_rejected'
  | 'jurisdiction_missing'
  | 'tenant_scope_missing'
  | 'monetary_value_missing'
  | 'monetary_value_invalid'
  | 'monetary_value_negative'

export interface CulinaryFactTrustInput {
  factType: CulinaryFactType
  lifecycleState: CulinaryFactLifecycleState
  publicationEligibility: CulinaryFactPublicationEligibility
  confidenceScore: number
  sourceRecordId?: string | null
  capturedAt: Date | string
  observedAt?: Date | string | null
  freshnessWindowMs?: number
  tenantId?: string | null
  jurisdiction?: string | null
  valuePresent?: boolean
  value?: unknown
  reviewStatus?: CulinaryFactReviewStatus | null
  now?: Date | string
}

export interface CulinaryFactFreshness {
  status: CulinaryFactFreshnessStatus
  asOf: string | null
  ageMs: number | null
  windowMs: number
}

export interface CulinaryFactTrustResult {
  canSurface: boolean
  reasons: CulinaryFactTrustReason[]
  freshness: CulinaryFactFreshness
  requiresReview: boolean
  effectiveConfidence: number
}

const REGULAR_CONFIDENCE_THRESHOLD = 0.7
const HIGH_IMPACT_CONFIDENCE_THRESHOLD = 0.95
const REGULAR_FRESHNESS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000
const HIGH_IMPACT_FRESHNESS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

const BLOCKED_LIFECYCLE_STATES = new Set<CulinaryFactLifecycleState>([
  'conflicting',
  'stale',
  'unreachable',
  'rejected',
  'superseded',
  'archived',
])

const SURFACEABLE_LIFECYCLE_STATES = new Set<CulinaryFactLifecycleState>([
  'observed',
  'verified',
  'surfaceable',
])

const APPROVED_REVIEW_STATUSES = new Set<CulinaryFactReviewStatus>(['approved', 'verified'])

const REJECTED_REVIEW_STATUSES = new Set<CulinaryFactReviewStatus>(['rejected', 'dismissed'])

function parseTime(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function normalizeConfidence(confidenceScore: number): number {
  if (!Number.isFinite(confidenceScore)) {
    return 0
  }

  if (confidenceScore < 0) {
    return 0
  }

  if (confidenceScore > 1) {
    return 1
  }

  return confidenceScore
}

export function isMonetaryCulinaryFact(factType: CulinaryFactType): boolean {
  return factType.endsWith('_cents')
}

export function isRegulatedCulinaryFact(factType: CulinaryFactType): boolean {
  return isRegulatedFactType(factType)
}

export function isHighImpactCulinaryFact(factType: CulinaryFactType): boolean {
  return isMonetaryCulinaryFact(factType) || isHighImpactFactType(factType)
}

function resolveFreshnessWindow(input: CulinaryFactTrustInput, highImpact: boolean): number {
  const defaultWindow = highImpact ? HIGH_IMPACT_FRESHNESS_WINDOW_MS : REGULAR_FRESHNESS_WINDOW_MS

  if (!Number.isFinite(input.freshnessWindowMs) || input.freshnessWindowMs === undefined) {
    return defaultWindow
  }

  const suppliedWindow = Math.max(0, input.freshnessWindowMs)
  return highImpact ? Math.min(suppliedWindow, defaultWindow) : suppliedWindow
}

function addReason(reasons: CulinaryFactTrustReason[], reason: CulinaryFactTrustReason): void {
  if (!reasons.includes(reason)) {
    reasons.push(reason)
  }
}

export function evaluateCulinaryFactTrust(input: CulinaryFactTrustInput): CulinaryFactTrustResult {
  const reasons: CulinaryFactTrustReason[] = []
  const now = parseTime(input.now) ?? new Date()
  const capturedAt = parseTime(input.capturedAt)
  const observedAt = parseTime(input.observedAt) ?? capturedAt
  const effectiveConfidence = normalizeConfidence(input.confidenceScore)
  const highImpact = isHighImpactCulinaryFact(input.factType)
  const needsJurisdiction = requiresJurisdictionScope(input.factType)
  const monetary = isMonetaryCulinaryFact(input.factType)
  const freshnessWindowMs = resolveFreshnessWindow(input, highImpact)
  const ageMs = observedAt ? Math.max(0, now.getTime() - observedAt.getTime()) : null
  const freshnessStatus: CulinaryFactFreshnessStatus =
    ageMs === null ? 'unknown' : ageMs > freshnessWindowMs ? 'stale' : 'fresh'
  const reviewStatus = input.reviewStatus ?? 'not_required'
  const hasApprovedReview = APPROVED_REVIEW_STATUSES.has(reviewStatus)
  const hasHighImpactConfidence = effectiveConfidence >= HIGH_IMPACT_CONFIDENCE_THRESHOLD
  const requiresReview =
    reviewStatus === 'pending' ||
    input.lifecycleState === 'needs_review' ||
    (highImpact && !hasApprovedReview && !hasHighImpactConfidence)

  if (!input.sourceRecordId || input.sourceRecordId.trim().length === 0) {
    addReason(reasons, 'source_missing')
  }

  if (!capturedAt) {
    addReason(reasons, 'capture_timestamp_missing')
  }

  if (!observedAt) {
    addReason(reasons, 'observed_timestamp_invalid')
  }

  if (
    !Number.isFinite(input.confidenceScore) ||
    input.confidenceScore < 0 ||
    input.confidenceScore > 1
  ) {
    addReason(reasons, 'confidence_invalid')
  }

  const confidenceThreshold = highImpact
    ? HIGH_IMPACT_CONFIDENCE_THRESHOLD
    : REGULAR_CONFIDENCE_THRESHOLD

  if (!hasApprovedReview && effectiveConfidence < confidenceThreshold) {
    addReason(reasons, 'confidence_too_low')
  }

  if (input.publicationEligibility !== 'surfaceable') {
    addReason(reasons, 'publication_not_surfaceable')
  }

  if (!SURFACEABLE_LIFECYCLE_STATES.has(input.lifecycleState)) {
    addReason(reasons, 'lifecycle_not_surfaceable')
  }

  if (BLOCKED_LIFECYCLE_STATES.has(input.lifecycleState)) {
    if (input.lifecycleState === 'conflicting') {
      addReason(reasons, 'lifecycle_conflicting')
    }

    if (input.lifecycleState === 'rejected') {
      addReason(reasons, 'lifecycle_rejected')
    }

    if (input.lifecycleState === 'archived') {
      addReason(reasons, 'lifecycle_archived')
    }

    if (input.lifecycleState === 'superseded') {
      addReason(reasons, 'lifecycle_superseded')
    }
  }

  if (freshnessStatus !== 'fresh') {
    addReason(reasons, 'fact_stale')
  }

  if (requiresReview) {
    addReason(reasons, 'review_required')
  }

  if (REJECTED_REVIEW_STATUSES.has(reviewStatus)) {
    addReason(reasons, 'review_rejected')
  }

  if (needsJurisdiction && (!input.jurisdiction || input.jurisdiction.trim().length === 0)) {
    addReason(reasons, 'jurisdiction_missing')
  }

  if (!input.tenantId || input.tenantId.trim().length === 0) {
    addReason(reasons, 'tenant_scope_missing')
  }

  if (monetary) {
    const hasValue = input.valuePresent ?? input.value !== undefined

    if (!hasValue) {
      addReason(reasons, 'monetary_value_missing')
    } else if (
      typeof input.value !== 'number' ||
      !Number.isFinite(input.value) ||
      !Number.isInteger(input.value)
    ) {
      addReason(reasons, 'monetary_value_invalid')
    } else if (input.value < 0) {
      addReason(reasons, 'monetary_value_negative')
    }
  }

  return {
    canSurface: reasons.length === 0,
    reasons,
    freshness: {
      status: freshnessStatus,
      asOf: observedAt?.toISOString() ?? null,
      ageMs,
      windowMs: freshnessWindowMs,
    },
    requiresReview,
    effectiveConfidence,
  }
}
