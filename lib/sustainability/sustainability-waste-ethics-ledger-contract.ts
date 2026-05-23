export const SUSTAINABILITY_LEDGER_ENTITY_KINDS = [
  'waste_event',
  'leftover_plan',
  'sustainability_preference',
  'sourcing_claim',
  'claim_evidence',
  'waste_reduction_recommendation',
  'packaging_plan',
] as const

export type SustainabilityLedgerEntityKind = (typeof SUSTAINABILITY_LEDGER_ENTITY_KINDS)[number]

export const SUSTAINABILITY_VISIBILITY_LEVELS = [
  'private_only',
  'chef_internal',
  'client_safe',
  'public_candidate',
  'public_profile',
  'never_publish',
] as const

export type SustainabilityVisibilityLevel = (typeof SUSTAINABILITY_VISIBILITY_LEVELS)[number]

export const WASTE_PREVENTABILITY_STATES = [
  'avoidable',
  'partially_avoidable',
  'unavoidable',
  'unknown',
] as const

export type WastePreventabilityState = (typeof WASTE_PREVENTABILITY_STATES)[number]

export const LEFTOVER_SAFETY_STATES = [
  'safe',
  'needs_review',
  'time_temperature_unknown',
  'allergen_unknown',
  'client_declined',
  'safety_blocked',
  'unknown',
] as const

export type LeftoverSafetyState = (typeof LEFTOVER_SAFETY_STATES)[number]

export const LEFTOVER_DISPOSAL_PATHS = [
  'client_keeps',
  'staff_meal',
  'donation',
  'compost',
  'discard',
  'return_to_vendor',
  'safety_blocked',
  'unknown',
] as const

export type LeftoverDisposalPath = (typeof LEFTOVER_DISPOSAL_PATHS)[number]

export const SOURCING_CLAIM_KINDS = [
  'local',
  'organic',
  'regenerative',
  'fair_trade',
  'foraged',
  'seasonal',
  'low_waste',
  'composted',
  'donated',
  'reusable_packaging',
  'humane',
  'reduced_food_miles',
] as const

export type SourcingClaimKind = (typeof SOURCING_CLAIM_KINDS)[number]

export const SOURCING_CLAIM_STATES = [
  'draft',
  'needs_evidence',
  'ready_for_review',
  'approved',
  'published',
  'rejected',
  'expired',
  'archived',
] as const

export type SourcingClaimState = (typeof SOURCING_CLAIM_STATES)[number]

export const CLAIM_EVIDENCE_KINDS = [
  'invoice',
  'vendor_record',
  'vendor_policy',
  'certification',
  'photo',
  'event_note',
  'donation_receipt',
  'compost_receipt',
  'client_approval',
  'ingredient_origin',
  'manual_attestation',
] as const

export type ClaimEvidenceKind = (typeof CLAIM_EVIDENCE_KINDS)[number]

export const WASTE_RECOMMENDATION_STATES = [
  'candidate',
  'accepted',
  'dismissed',
  'blocked_for_safety',
  'implemented',
  'archived',
  'unknown',
] as const

export type WasteRecommendationState = (typeof WASTE_RECOMMENDATION_STATES)[number]

export const WASTE_RECOMMENDATION_STATE_RANK: Record<WasteRecommendationState, number> = {
  candidate: 0,
  accepted: 1,
  implemented: 2,
  dismissed: 3,
  archived: 4,
  blocked_for_safety: 5,
  unknown: 6,
}

export type SustainabilitySignalConfidence = 'low' | 'medium' | 'high'

export type SustainabilitySourceRef = {
  source:
    | 'manual_chef_input'
    | 'event_waste_log'
    | 'inventory_waste_log'
    | 'event_leftover'
    | 'sourcing_entry'
    | 'ingredient_purchase_log'
    | 'vendor_record'
    | 'client_preference'
    | 'event_plan'
    | 'menu_plan'
    | 'recipe'
    | 'public_profile'
    | 'media_asset'
    | 'remy_private_summary'
    | 'derived'
  table:
    | 'event_waste_logs'
    | 'waste_logs'
    | 'event_leftovers'
    | 'sourcing_entries'
    | 'ingredient_purchase_log'
    | 'vendors'
    | 'vendor_price_entries'
    | 'ingredient_vendor_preferences'
    | 'ingredients'
    | 'clients'
    | 'events'
    | 'menus'
    | 'recipes'
    | 'media_assets'
    | 'chefs'
    | 'public_profile'
    | 'derived'
  rowId: string | null
}

export type WasteEventContract = {
  id: string | null
  tenantId: string
  chefId: string
  eventId: string | null
  ingredientId: string | null
  dishId: string | null
  itemName: string
  category: 'protein' | 'produce' | 'dairy' | 'grain' | 'prepared_dish' | 'packaging' | 'other'
  cause:
    | 'overproduction'
    | 'spoilage'
    | 'guest_no_show'
    | 'dietary_change'
    | 'quality_issue'
    | 'trim'
    | 'expired'
    | 'packaging'
    | 'other'
  amount: string | null
  estimatedCostCents: number | null
  preventability: WastePreventabilityState
  disposalPath: LeftoverDisposalPath
  safetyState: LeftoverSafetyState
  notes: string | null
  occurredAt: string | null
  visibility: Extract<SustainabilityVisibilityLevel, 'private_only' | 'chef_internal'>
  sourceRefs: SustainabilitySourceRef[]
}

export type LeftoverPlanItemContract = {
  id: string | null
  itemName: string
  quantity: string | null
  packagingType:
    | 'container'
    | 'wrapped'
    | 'bag'
    | 'box'
    | 'reusable'
    | 'client_container'
    | 'other'
    | null
  labelText: string | null
  storageInstructions: string | null
  disposalPath: LeftoverDisposalPath
  safetyState: LeftoverSafetyState
}

export type LeftoverPlanContract = {
  id: string | null
  tenantId: string
  chefId: string
  eventId: string
  clientId: string | null
  items: LeftoverPlanItemContract[]
  clientPreferenceRef: SustainabilitySourceRef | null
  defaultDisposalPath: LeftoverDisposalPath
  safetyState: LeftoverSafetyState
  clientSafeSummary: string | null
  privateNotes: string | null
  visibility: Extract<
    SustainabilityVisibilityLevel,
    'private_only' | 'chef_internal' | 'client_safe'
  >
  sourceRefs: SustainabilitySourceRef[]
}

export type SustainabilityPreferenceContract = {
  id: string | null
  tenantId: string
  chefId: string
  subjectKind: 'chef' | 'client' | 'event'
  subjectId: string
  values: (
    | 'reduce_food_waste'
    | 'prefer_local'
    | 'prefer_organic'
    | 'avoid_single_use_packaging'
    | 'compost_when_safe'
    | 'donate_when_legal_and_safe'
    | 'respect_dietary_values'
    | 'prefer_reusable_containers'
    | 'avoid_greenwashing'
  )[]
  priority: 'low' | 'medium' | 'high'
  safetyOverrideAllowed: false
  notes: string | null
  visibility: Extract<
    SustainabilityVisibilityLevel,
    'private_only' | 'chef_internal' | 'client_safe'
  >
  sourceRefs: SustainabilitySourceRef[]
}

export type ClaimEvidenceContract = {
  id: string | null
  tenantId: string
  chefId: string
  kind: ClaimEvidenceKind
  label: string
  evidenceAt: string | null
  expiresAt: string | null
  sourceRef: SustainabilitySourceRef
  confidence: SustainabilitySignalConfidence
  visibility: Extract<
    SustainabilityVisibilityLevel,
    'private_only' | 'chef_internal' | 'public_candidate' | 'public_profile'
  >
}

export type SourcingClaimContract = {
  id: string | null
  tenantId: string
  chefId: string
  kind: SourcingClaimKind
  subjectKind: 'ingredient' | 'vendor' | 'event' | 'menu' | 'profile' | 'packaging'
  subjectId: string | null
  claimText: string | null
  state: SourcingClaimState
  evidenceRefs: SustainabilitySourceRef[]
  approvedByUserId: string | null
  approvedAt: string | null
  expiresAt: string | null
  visibility: SustainabilityVisibilityLevel
}

export type WasteReductionRecommendationContract = {
  id: string | null
  tenantId: string
  chefId: string
  kind:
    | 'portion_adjustment'
    | 'menu_redesign'
    | 'procurement_adjustment'
    | 'packaging_change'
    | 'leftover_plan_change'
    | 'donation_or_compost_review'
    | 'claim_evidence_gap'
  state: WasteRecommendationState
  title: string
  rationale: string
  expectedImpact: string | null
  safetyState: LeftoverSafetyState
  blockedReason: string | null
  sourceRefs: SustainabilitySourceRef[]
  visibility: Extract<SustainabilityVisibilityLevel, 'private_only' | 'chef_internal'>
}

export type PublicSustainabilityClaimOutput = {
  tenantId: string
  chefId: string
  approvedClaims: SourcingClaimContract[]
  redactedClaimCount: number
  visibility: 'public_profile'
}

export type SustainabilityWasteEthicsLedgerContract = {
  tenantId: string
  chefId: string
  wasteEvents: WasteEventContract[]
  leftoverPlans: LeftoverPlanContract[]
  preferences: SustainabilityPreferenceContract[]
  sourcingClaims: SourcingClaimContract[]
  claimEvidence: ClaimEvidenceContract[]
  recommendations: WasteReductionRecommendationContract[]
  visibility: 'private_only'
}

export function deriveMostRestrictiveWasteRecommendationState(
  states: readonly WasteRecommendationState[]
): WasteRecommendationState {
  if (states.length === 0) return 'unknown'
  return states.reduce((current, candidate) =>
    WASTE_RECOMMENDATION_STATE_RANK[candidate] > WASTE_RECOMMENDATION_STATE_RANK[current]
      ? candidate
      : current
  )
}

export function isPrivateSustainabilityVisibility(
  visibility: SustainabilityVisibilityLevel
): visibility is 'private_only' | 'chef_internal' | 'never_publish' {
  return (
    visibility === 'private_only' ||
    visibility === 'chef_internal' ||
    visibility === 'never_publish'
  )
}

export function canUseLeftoverPath(input: {
  disposalPath: LeftoverDisposalPath
  safetyState: LeftoverSafetyState
}): boolean {
  if (input.disposalPath === 'safety_blocked') return false
  if (
    input.safetyState === 'safety_blocked' ||
    input.safetyState === 'time_temperature_unknown' ||
    input.safetyState === 'allergen_unknown' ||
    input.safetyState === 'unknown'
  ) {
    return input.disposalPath === 'discard' || input.disposalPath === 'compost'
  }
  return true
}

export function canPublishSustainabilityClaim(
  claim: SourcingClaimContract
): claim is SourcingClaimContract & { visibility: 'public_profile' } {
  return (
    claim.visibility === 'public_profile' &&
    (claim.state === 'approved' || claim.state === 'published') &&
    claim.evidenceRefs.length > 0 &&
    Boolean(claim.claimText?.trim())
  )
}

export function buildPublicSustainabilityClaimOutput(input: {
  tenantId: string
  chefId: string
  claims: SourcingClaimContract[]
}): PublicSustainabilityClaimOutput {
  const approvedClaims = input.claims.filter(canPublishSustainabilityClaim)

  return {
    tenantId: input.tenantId,
    chefId: input.chefId,
    approvedClaims,
    redactedClaimCount: input.claims.length - approvedClaims.length,
    visibility: 'public_profile',
  }
}
