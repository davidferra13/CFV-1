export const NEW_REVENUE_OFFER_KINDS = [
  'class',
  'retainer',
  'meal_prep',
  'product',
  'gift_card',
  'membership',
  'content',
  'partnership',
  'premium_experience',
] as const

export type NewRevenueOfferKind = (typeof NEW_REVENUE_OFFER_KINDS)[number]

export const OFFER_LAUNCH_STATES = [
  'unknown',
  'idea',
  'validate',
  'draft',
  'ready_for_review',
  'live',
  'paused',
  'retired',
] as const

export type OfferLaunchState = (typeof OFFER_LAUNCH_STATES)[number]

export const OFFER_LAUNCH_STATE_RESTRICTIVENESS: Record<OfferLaunchState, number> = {
  live: 0,
  ready_for_review: 1,
  validate: 2,
  draft: 3,
  paused: 4,
  retired: 5,
  idea: 6,
  unknown: 7,
}

export const OFFER_VISIBILITY_LEVELS = [
  'private_only',
  'chef_internal',
  'client_safe_summary',
  'public_safe_summary',
  'requires_approval',
  'never_publish',
] as const

export type OfferVisibilityLevel = (typeof OFFER_VISIBILITY_LEVELS)[number]

export const OFFER_AUDIENCES = [
  'existing_clients',
  'public',
  'guests',
  'partners',
  'corporate',
  'local',
  'subscribers',
] as const

export type OfferAudience = (typeof OFFER_AUDIENCES)[number]

export type OfferConfidence = 'low' | 'medium' | 'high'
export type OfferCapacityImpact = 'none' | 'low' | 'medium' | 'high' | 'unknown'
export type OfferFulfillmentComplexity = 'simple' | 'moderate' | 'complex' | 'unknown'
export type OfferFitState = 'strong_fit' | 'possible_fit' | 'poor_fit' | 'blocked' | 'unknown'
export type OfferOutreachPermissionState = 'allowed' | 'needs_consent' | 'blocked' | 'unknown'
export type OfferStrategy = 'test_demand' | 'grow_revenue' | 'smooth_seasonality' | 'retain_clients'
export type OfferLaunchReadinessState = 'ready' | 'needs_review' | 'blocked'
export type OfferLaunchBlocker =
  | 'missing_source_evidence'
  | 'missing_economics'
  | 'audience_permission_required'
  | 'visibility_review_required'
  | 'public_approval_required'
  | 'capacity_review_required'
  | 'fulfillment_review_required'
  | 'offer_not_launchable'

export const OFFER_SOURCE_SYSTEMS = [
  'menu_offerings',
  'menus',
  'retainers',
  'recurring_services',
  'meal_prep_programs',
  'product_projections',
  'commerce_promotions',
  'client_incentives',
  'gift_cards',
  'gift_certificates',
  'loyalty',
  'billing_feature_gates',
  'public_profile',
  'discovery_profile',
  'client_contribution',
  'communications',
  'pricing_pie',
  'capacity_twin',
  'craft_evolution_lab',
  'derived',
] as const

export type OfferSourceSystem = (typeof OFFER_SOURCE_SYSTEMS)[number]

export type OfferSourceRef = {
  source:
    | 'manual_chef_input'
    | 'menu_offering'
    | 'retainer'
    | 'meal_prep_program'
    | 'product_projection'
    | 'commerce_promotion'
    | 'gift_card'
    | 'loyalty'
    | 'public_profile'
    | 'client_contribution'
    | 'pricing_pie'
    | 'capacity_twin'
    | 'craft_evolution_lab'
    | 'communication_history'
    | 'derived'
  table:
    | 'menu_offerings'
    | 'menus'
    | 'retainers'
    | 'recurring_services'
    | 'meal_prep_programs'
    | 'product_projections'
    | 'commerce_promotions'
    | 'client_incentives'
    | 'gift_cards'
    | 'gift_certificates'
    | 'loyalty_programs'
    | 'chefs'
    | 'discovery_profiles'
    | 'clients'
    | 'messages'
    | 'derived'
  rowId: string | null
}

export type OfferEconomicsContract = {
  tenantId: string
  offerId: string
  priceCents: number | null
  knownCostCents: number | null
  estimatedMarginCents: number | null
  estimatedMarginPercent: number | null
  capacityImpact: OfferCapacityImpact
  fulfillmentComplexity: OfferFulfillmentComplexity
  missingInputs: Array<'price' | 'cost' | 'capacity' | 'audience' | 'fulfillment' | 'tax' | 'terms'>
  confidence: OfferConfidence
  sourceRefs: OfferSourceRef[]
  visibility: 'chef_internal'
}

export type OfferAudienceFitContract = {
  tenantId: string
  offerId: string
  audience: OfferAudience
  fitState: OfferFitState
  reasons: string[]
  permissionState: OfferOutreachPermissionState
  visibility: OfferVisibilityLevel
  sourceRefs: OfferSourceRef[]
}

export type OfferPromotionApprovalContract = {
  tenantId: string
  offerId: string
  state: 'draft' | 'needs_review' | 'approved' | 'expired' | 'revoked'
  publicCopy: string | null
  approvedByUserId: string | null
  approvedAt: string | null
  expiresAt: string | null
  visibility: OfferVisibilityLevel
  sourceRefs: OfferSourceRef[]
}

export type NewRevenueOfferContract = {
  id: string
  tenantId: string
  chefId: string
  kind: NewRevenueOfferKind
  title: string
  state: OfferLaunchState
  strategy: OfferStrategy
  economics: OfferEconomicsContract
  audienceFits: OfferAudienceFitContract[]
  sourceRefs: OfferSourceRef[]
  visibility: OfferVisibilityLevel
  publicPromotion: OfferPromotionApprovalContract | null
  createdByUserId: string
  updatedAt: string
}

export type PublicOfferPromotionCard = {
  id: string
  kind: NewRevenueOfferKind
  title: string
  publicCopy: string
  priceCents: number | null
  visibility: 'public_safe_summary'
}

export type PublicOfferPromotionReadModel = {
  offers: PublicOfferPromotionCard[]
  redactedOfferCount: number
  visibility: 'public_safe_summary'
}

export type ClientSafeOfferSummary = {
  headline: string
  allowedReasons: string[]
  blockedPrivateReasonCount: number
  visibility: 'client_safe_summary'
}

export type OfferLaunchReadiness = {
  state: OfferLaunchReadinessState
  blockers: OfferLaunchBlocker[]
  requiredSourceSystems: OfferSourceSystem[]
  presentSourceSystems: OfferSourceSystem[]
  canPublishPublicPromotion: boolean
}

const SOURCE_SYSTEMS_BY_OFFER_KIND: Record<NewRevenueOfferKind, OfferSourceSystem[]> = {
  class: ['menu_offerings', 'menus', 'public_profile', 'commerce_promotions'],
  retainer: ['retainers'],
  meal_prep: ['recurring_services', 'meal_prep_programs', 'menus', 'capacity_twin'],
  product: ['product_projections', 'commerce_promotions', 'pricing_pie'],
  gift_card: ['client_incentives', 'gift_cards', 'gift_certificates'],
  membership: ['loyalty', 'client_incentives', 'billing_feature_gates'],
  content: ['public_profile', 'discovery_profile', 'communications'],
  partnership: ['client_contribution', 'communications', 'public_profile'],
  premium_experience: ['menu_offerings', 'menus', 'craft_evolution_lab', 'capacity_twin'],
}

export function deriveMostRestrictiveLaunchState(
  states: readonly OfferLaunchState[]
): OfferLaunchState {
  if (states.length === 0) return 'unknown'
  return states.reduce((current, candidate) =>
    OFFER_LAUNCH_STATE_RESTRICTIVENESS[candidate] > OFFER_LAUNCH_STATE_RESTRICTIVENESS[current]
      ? candidate
      : current
  )
}

export function isPrivateOfferVisibility(visibility: OfferVisibilityLevel): boolean {
  return (
    visibility === 'private_only' ||
    visibility === 'chef_internal' ||
    visibility === 'requires_approval' ||
    visibility === 'never_publish'
  )
}

export function isPublicOfferVisibility(visibility: OfferVisibilityLevel): boolean {
  return visibility === 'public_safe_summary'
}

export function getRequiredOfferSourceSystems(kind: NewRevenueOfferKind): OfferSourceSystem[] {
  return [...SOURCE_SYSTEMS_BY_OFFER_KIND[kind]]
}

function sourceSystemForRef(ref: OfferSourceRef): OfferSourceSystem | null {
  switch (ref.source) {
    case 'manual_chef_input':
    case 'derived':
      return 'derived'
    case 'menu_offering':
      return 'menu_offerings'
    case 'retainer':
      return 'retainers'
    case 'meal_prep_program':
      return 'meal_prep_programs'
    case 'product_projection':
      return 'product_projections'
    case 'commerce_promotion':
      return 'commerce_promotions'
    case 'gift_card':
      return ref.table === 'gift_certificates' ? 'gift_certificates' : 'gift_cards'
    case 'loyalty':
      return 'loyalty'
    case 'public_profile':
      return ref.table === 'discovery_profiles' ? 'discovery_profile' : 'public_profile'
    case 'client_contribution':
      return 'client_contribution'
    case 'pricing_pie':
      return 'pricing_pie'
    case 'capacity_twin':
      return 'capacity_twin'
    case 'craft_evolution_lab':
      return 'craft_evolution_lab'
    case 'communication_history':
      return 'communications'
    default:
      return null
  }
}

export function deriveOfferLaunchReadiness(offer: NewRevenueOfferContract): OfferLaunchReadiness {
  const blockers = new Set<OfferLaunchBlocker>()
  const requiredSourceSystems = getRequiredOfferSourceSystems(offer.kind)
  const presentSourceSystems = Array.from(
    new Set(
      [
        ...offer.sourceRefs,
        ...offer.economics.sourceRefs,
        ...offer.audienceFits.flatMap((fit) => fit.sourceRefs),
      ]
        .map(sourceSystemForRef)
        .filter((system): system is OfferSourceSystem => !!system)
    )
  )
  const hasRelevantSource = presentSourceSystems.some((system) =>
    requiredSourceSystems.includes(system)
  )

  if (!hasRelevantSource) blockers.add('missing_source_evidence')
  if (offer.economics.missingInputs.length > 0) blockers.add('missing_economics')
  if (offer.economics.capacityImpact === 'high' || offer.economics.capacityImpact === 'unknown') {
    blockers.add('capacity_review_required')
  }
  if (
    offer.economics.fulfillmentComplexity === 'complex' ||
    offer.economics.fulfillmentComplexity === 'unknown'
  ) {
    blockers.add('fulfillment_review_required')
  }
  if (
    !offer.audienceFits.some(
      (fit) => fit.fitState !== 'blocked' && fit.permissionState === 'allowed'
    )
  ) {
    blockers.add('audience_permission_required')
  }
  if (isPrivateOfferVisibility(offer.visibility)) blockers.add('visibility_review_required')
  if (offer.publicPromotion && !canPublishOfferPromotion(offer)) {
    blockers.add('public_approval_required')
  }
  if (offer.state === 'paused' || offer.state === 'retired' || offer.state === 'unknown') {
    blockers.add('offer_not_launchable')
  }

  const hardBlockers: OfferLaunchBlocker[] = [
    'missing_economics',
    'audience_permission_required',
    'offer_not_launchable',
  ]
  const state =
    blockers.size === 0
      ? 'ready'
      : [...blockers].some((blocker) => hardBlockers.includes(blocker))
        ? 'blocked'
        : 'needs_review'

  return {
    state,
    blockers: [...blockers],
    requiredSourceSystems,
    presentSourceSystems,
    canPublishPublicPromotion: canPublishOfferPromotion(offer),
  }
}

export function canPublishOfferPromotion(offer: NewRevenueOfferContract): boolean {
  const promotion = offer.publicPromotion
  if (!promotion) return false
  if (offer.state !== 'live') return false
  if (!isPublicOfferVisibility(offer.visibility)) return false
  if (promotion.state !== 'approved') return false
  if (!isPublicOfferVisibility(promotion.visibility)) return false
  if (!promotion.publicCopy?.trim()) return false
  if (offer.economics.missingInputs.length > 0) return false

  return offer.audienceFits.some(
    (fit) =>
      fit.audience === 'public' &&
      fit.fitState !== 'blocked' &&
      fit.permissionState === 'allowed' &&
      isPublicOfferVisibility(fit.visibility)
  )
}

export function buildPublicOfferPromotionReadModel(
  offers: readonly NewRevenueOfferContract[]
): PublicOfferPromotionReadModel {
  const publicOffers = offers.filter(canPublishOfferPromotion)

  return {
    offers: publicOffers.map((offer) => ({
      id: offer.id,
      kind: offer.kind,
      title: offer.title,
      publicCopy: offer.publicPromotion?.publicCopy?.trim() ?? '',
      priceCents: offer.economics.priceCents,
      visibility: 'public_safe_summary',
    })),
    redactedOfferCount: offers.length - publicOffers.length,
    visibility: 'public_safe_summary',
  }
}

export function buildClientSafeOfferSummary(
  offer: NewRevenueOfferContract
): ClientSafeOfferSummary {
  const safeFits = offer.audienceFits.filter(
    (fit) => fit.visibility === 'client_safe_summary' || fit.visibility === 'public_safe_summary'
  )
  const allowedReasons = safeFits.flatMap((fit) => fit.reasons).slice(0, 3)
  const privateReasonCount = offer.audienceFits
    .filter((fit) => !safeFits.includes(fit))
    .reduce((count, fit) => count + Math.max(1, fit.reasons.length), 0)

  const headline =
    offer.state === 'live'
      ? 'This offer is ready to share.'
      : offer.state === 'paused'
        ? 'This offer is currently paused.'
        : 'This offer needs review before sharing.'

  return {
    headline,
    allowedReasons,
    blockedPrivateReasonCount: privateReasonCount,
    visibility: 'client_safe_summary',
  }
}
