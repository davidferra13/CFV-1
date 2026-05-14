import {
  classifyDiscoveryFreshness,
  type DiscoveryDataClass,
  type DiscoveryFreshnessEvaluation,
} from '@/lib/discovery/data-freshness'
import {
  evaluateDiscoverySourceUse,
  getDiscoverySourcePolicy,
  type DiscoverySourceType,
} from '@/lib/discovery/source-policy'

export type DiscoveryConfidenceField =
  | 'operator_identity'
  | 'menu_presence'
  | 'menu_content'
  | 'price'
  | 'capacity'
  | 'event_status'
  | 'hours'
  | 'photos'
  | 'geocode'
  | 'cuisine_tags'
  | 'availability'

export type DiscoveryConfidenceTier = 'high' | 'medium' | 'low' | 'unknown'

export type DiscoveryModerationState =
  | 'clear'
  | 'quarantined'
  | 'approved'
  | 'rejected'
  | 'suppressed'

export type DiscoveryQuarantineReason =
  | 'duplicate_risk'
  | 'bad_photo'
  | 'bad_category'
  | 'closed_business'
  | 'source_conflict'
  | 'stale_menu'
  | 'questionable_event'
  | 'unsafe_content'
  | 'disputed_data'

export type DiscoveryRemovalState =
  | 'none'
  | 'correction_requested'
  | 'claim_pending'
  | 'disputed'
  | 'opted_out'
  | 'removed'

export type DiscoveryConfidenceInput = {
  sourceType: DiscoverySourceType
  field: DiscoveryConfidenceField
  freshness?: Pick<DiscoveryFreshnessEvaluation, 'state'> | null
  corroboratingSourceCount?: number
  inferred?: boolean
  moderationState?: DiscoveryModerationState
  removalState?: DiscoveryRemovalState
}

export type DiscoveryConfidenceEvaluation = {
  score: number
  tier: DiscoveryConfidenceTier
  canSupportStrongClaim: boolean
  reasons: string[]
}

export type ExternalMenuSourceInput = {
  sourceType: DiscoverySourceType
  sourceUrl?: string | null
  capturedAt?: string | Date | null
  changedAt?: string | Date | null
  currentAt?: string | Date
  extractionStatus: 'none' | 'link_only' | 'metadata_extracted' | 'full_content' | 'failed'
  operatorClaimed?: boolean
  hasAttribution?: boolean
  moderationState?: DiscoveryModerationState
  removalState?: DiscoveryRemovalState
}

export type ExternalMenuReadModel = {
  status:
    | 'no_menu'
    | 'link_only'
    | 'metadata_current'
    | 'metadata_stale'
    | 'claimed_current'
    | 'suppressed'
  sourceUrl: string | null
  canPowerMenuSearch: boolean
  canDisplayExtractedMetadata: boolean
  freshness: DiscoveryFreshnessEvaluation
  confidence: DiscoveryConfidenceEvaluation
  reasons: string[]
}

export type DiscoveryCoverageMetric = {
  id: string
  market: 'nyc' | 'miami' | 'boston' | string
  queryType:
    | 'rail_lane'
    | 'cuisine_region'
    | 'menu_led'
    | 'budget'
    | 'capacity'
    | 'event'
    | 'dietary'
    | 'radius'
  freshResultCount: number
  totalResultCount: number
  requiredFreshResultCount: number
  missingDimensions?: string[]
}

export type DiscoveryCoverageGateResult = {
  passed: boolean
  blockedMetricIds: string[]
  warnings: string[]
}

const SOURCE_BASE_CONFIDENCE: Record<DiscoverySourceType, number> = {
  chef_flow_claimed: 0.98,
  operator_submission: 0.92,
  partner_api: 0.88,
  direct_operator_website: 0.82,
  event_platform: 0.72,
  menu_platform: 0.66,
  open_street_map: 0.58,
  google_places: 0.5,
  yelp: 0.48,
  review_location_provider: 0.46,
  social_page: 0.38,
  chef_flow_private: 0,
  unknown: 0,
}

const FIELD_CONFIDENCE_ADJUSTMENTS: Record<DiscoveryConfidenceField, number> = {
  operator_identity: 0.06,
  menu_presence: 0,
  menu_content: -0.08,
  price: -0.08,
  capacity: -0.12,
  event_status: -0.02,
  hours: -0.02,
  photos: -0.1,
  geocode: 0.08,
  cuisine_tags: -0.1,
  availability: -0.12,
}

export function scoreDiscoverySourceConfidence(
  input: DiscoveryConfidenceInput
): DiscoveryConfidenceEvaluation {
  const reasons: string[] = []
  let score = SOURCE_BASE_CONFIDENCE[input.sourceType] + FIELD_CONFIDENCE_ADJUSTMENTS[input.field]

  if (input.inferred) {
    score -= 0.18
    reasons.push('Field was inferred rather than directly observed.')
  }

  const corroboratingSourceCount = input.corroboratingSourceCount ?? 0
  if (corroboratingSourceCount > 0) {
    score += Math.min(0.12, corroboratingSourceCount * 0.04)
    reasons.push(`Corroborated by ${corroboratingSourceCount} additional source(s).`)
  }

  if (input.freshness?.state === 'aging') {
    score -= 0.08
    reasons.push('Freshness is aging.')
  } else if (input.freshness?.state === 'stale') {
    score -= 0.22
    reasons.push('Freshness is stale.')
  } else if (input.freshness?.state === 'unknown') {
    score -= 0.28
    reasons.push('Freshness is unknown.')
  } else if (input.freshness?.state === 'invalid') {
    score = 0
    reasons.push('Freshness is invalid.')
  }

  if (isPublicDiscoverySuppressed(input)) {
    score = 0
    reasons.push('Record is suppressed by removal or moderation state.')
  }

  score = clamp(score)
  const tier = confidenceTier(score)

  return {
    score,
    tier,
    canSupportStrongClaim: tier === 'high' && !input.inferred,
    reasons,
  }
}

export function isPublicDiscoverySuppressed(input: {
  moderationState?: DiscoveryModerationState
  removalState?: DiscoveryRemovalState
}): boolean {
  return (
    input.removalState === 'opted_out' ||
    input.removalState === 'removed' ||
    input.removalState === 'disputed' ||
    input.moderationState === 'quarantined' ||
    input.moderationState === 'rejected' ||
    input.moderationState === 'suppressed'
  )
}

export function buildExternalMenuReadModel(input: ExternalMenuSourceInput): ExternalMenuReadModel {
  const sourceUrl = input.sourceUrl?.trim() || null
  const freshness = classifyDiscoveryFreshness({
    dataClass: 'menu',
    checkedAt: input.capturedAt,
    changedAt: input.changedAt,
    currentAt: input.currentAt,
  })
  const confidence = scoreDiscoverySourceConfidence({
    sourceType: input.operatorClaimed ? 'chef_flow_claimed' : input.sourceType,
    field: input.extractionStatus === 'full_content' ? 'menu_content' : 'menu_presence',
    freshness,
    moderationState: input.moderationState,
    removalState: input.removalState,
  })
  const sourceUse = evaluateDiscoverySourceUse({
    sourceType: input.sourceType,
    intendedUse: input.extractionStatus === 'full_content' ? 'full_content' : 'search_index',
    hasAttribution: input.hasAttribution,
    isFresh: freshness.canSupportFreshClaim,
    isOperatorControlled: Boolean(input.operatorClaimed),
    isOptedOut: isPublicDiscoverySuppressed({ removalState: input.removalState }),
    isQuarantined: input.moderationState === 'quarantined',
  })
  const reasons = [...sourceUse.reasons, ...confidence.reasons]

  if (!sourceUrl || input.extractionStatus === 'none') {
    return menuModel('no_menu', sourceUrl, false, false, freshness, confidence, reasons)
  }
  if (sourceUse.state === 'suppressed' || input.extractionStatus === 'failed') {
    return menuModel('suppressed', sourceUrl, false, false, freshness, confidence, reasons)
  }
  if (input.operatorClaimed && freshness.canSupportFreshClaim && confidence.canSupportStrongClaim) {
    return menuModel('claimed_current', sourceUrl, true, true, freshness, confidence, reasons)
  }
  if (
    input.extractionStatus === 'link_only' ||
    getDiscoverySourcePolicy(input.sourceType).displayMode === 'link_only'
  ) {
    return menuModel('link_only', sourceUrl, false, false, freshness, confidence, reasons)
  }
  if (freshness.state === 'fresh' || freshness.state === 'aging') {
    return menuModel('metadata_current', sourceUrl, true, true, freshness, confidence, reasons)
  }

  return menuModel('metadata_stale', sourceUrl, false, false, freshness, confidence, reasons)
}

export function evaluateDiscoveryCoverageGates(
  metrics: DiscoveryCoverageMetric[]
): DiscoveryCoverageGateResult {
  const blockedMetricIds: string[] = []
  const warnings: string[] = []

  for (const metric of metrics) {
    if (metric.freshResultCount < metric.requiredFreshResultCount) {
      blockedMetricIds.push(metric.id)
      warnings.push(
        `${metric.market}:${metric.id} has ${metric.freshResultCount}/${metric.requiredFreshResultCount} fresh results.`
      )
    }
    if (metric.missingDimensions?.length) {
      blockedMetricIds.push(metric.id)
      warnings.push(`${metric.market}:${metric.id} missing ${metric.missingDimensions.join(', ')}.`)
    }
  }

  return {
    passed: blockedMetricIds.length === 0,
    blockedMetricIds: Array.from(new Set(blockedMetricIds)),
    warnings,
  }
}

export function freshnessDataClassForConfidenceField(
  field: DiscoveryConfidenceField
): DiscoveryDataClass {
  if (field === 'menu_content' || field === 'menu_presence') return 'menu'
  if (field === 'price') return 'price'
  if (field === 'event_status') return 'event_status'
  if (field === 'hours') return 'hours'
  if (field === 'photos') return 'photos'
  if (field === 'geocode') return 'geocode'
  if (field === 'availability') return 'chef_availability'
  return 'operator_status'
}

function menuModel(
  status: ExternalMenuReadModel['status'],
  sourceUrl: string | null,
  canPowerMenuSearch: boolean,
  canDisplayExtractedMetadata: boolean,
  freshness: DiscoveryFreshnessEvaluation,
  confidence: DiscoveryConfidenceEvaluation,
  reasons: string[]
): ExternalMenuReadModel {
  return {
    status,
    sourceUrl,
    canPowerMenuSearch,
    canDisplayExtractedMetadata,
    freshness,
    confidence,
    reasons,
  }
}

function confidenceTier(score: number): DiscoveryConfidenceTier {
  if (score >= 0.78) return 'high'
  if (score >= 0.55) return 'medium'
  if (score > 0) return 'low'
  return 'unknown'
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100))
}
