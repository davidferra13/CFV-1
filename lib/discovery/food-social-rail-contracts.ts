export type FoodSocialRailFamily =
  | 'opportunity_marketplace'
  | 'population_governance'
  | 'social_safety'
  | 'relationship_life_event'
  | 'visibility_consent'
  | 'shared_circle_discovery'
  | 'food_signal_notifications'
  | 'universal_food_object'
  | 'what_to_eat_now'
  | 'partner_vendor_opportunity'
  | 'food_social_network'

export type FoodSocialActorMode = 'public' | 'guest' | 'client' | 'chef' | 'partner' | 'admin'

export type FoodSocialRailContext =
  | 'public_home'
  | 'client_home'
  | 'chef_workspace'
  | 'circle'
  | 'partner_portal'
  | 'admin_review'

export type FoodSocialSignalClass =
  | 'opportunity'
  | 'relationship'
  | 'circle'
  | 'notification'
  | 'search_recovery'
  | 'social_graph'
  | 'governance'

export type FoodSocialConsentGrant =
  | 'relationship_planning'
  | 'circle_activity'
  | 'chef_profile_summary'
  | 'partner_opportunities'
  | 'food_memory'
  | 'notifications'

export type FoodSocialObjectType =
  | 'chef'
  | 'restaurant'
  | 'menu'
  | 'dish'
  | 'recipe'
  | 'event'
  | 'location'
  | 'opportunity'

export type FoodSocialRailContract = {
  family: FoodSocialRailFamily
  title: string
  signalClass: FoodSocialSignalClass
  owner: 'system' | 'client' | 'chef' | 'circle' | 'partner' | 'admin'
  defaultContexts: readonly FoodSocialRailContext[]
  requiredConsents: readonly FoodSocialConsentGrant[]
  optOutKey: string
  rarity: 'common' | 'limited' | 'rare'
  maxShareOfRail: number
  expiryPolicy: 'session' | 'time_window' | 'event_date' | 'manual_review'
  populationFormula: string
  reasonTemplate: string
  demotionPolicy: string
}

export type FoodSocialRailCandidate = {
  id: string
  family: FoodSocialRailFamily
  label: string
  score: number
  urgency?: 'normal' | 'urgent'
  expiresAt?: string | null
}

export type FoodSocialRailDecision = {
  candidateId: string
  family: FoodSocialRailFamily
  eligible: boolean
  score: number
  reason: string
  audit: {
    owner: FoodSocialRailContract['owner']
    signalClass: FoodSocialSignalClass
    optOutKey: string
    expiryPolicy: FoodSocialRailContract['expiryPolicy']
    populationFormula: string
  }
}

export type FoodSocialRailMix = {
  selected: FoodSocialRailDecision[]
  suppressed: FoodSocialRailDecision[]
  reason: string
}

export type FoodSocialVisibilityDecision = {
  allowed: boolean
  visibleDetail: 'none' | 'summary' | 'reason_only' | 'full'
  requiresConfirmation: boolean
  reason: string
}

export type UniversalFoodAction =
  | 'save'
  | 'send_to_circle'
  | 'ask_chef'
  | 'plan_dinner'
  | 'vote'
  | 'keep_private'
  | 'hide'
  | 'notify_me'

export type UniversalFoodActionDecision = {
  action: UniversalFoodAction
  enabled: boolean
  writesMemory: boolean
  writesSharedState: boolean
  requiresConfirmation: boolean
  reason: string
}

export type WhatToEatRecovery = {
  mode: 'continue' | 'clarify' | 'recover'
  prompt: string
  suggestedFamilies: FoodSocialRailFamily[]
}

const FOOD_SOCIAL_RAIL_CONTRACTS: Record<FoodSocialRailFamily, FoodSocialRailContract> = {
  opportunity_marketplace: contract({
    family: 'opportunity_marketplace',
    title: 'Deferred Discovery Rail Opportunity Marketplace',
    signalClass: 'opportunity',
    owner: 'chef',
    defaultContexts: ['client_home', 'circle', 'chef_workspace'],
    requiredConsents: ['partner_opportunities'],
    optOutKey: 'rail.opportunities',
    rarity: 'limited',
    maxShareOfRail: 0.18,
    expiryPolicy: 'time_window',
    populationFormula: 'score * freshness * relationshipFit * capacityConfidence',
    reasonTemplate: 'Relevant chef opening, discount, package, or featured menu.',
    demotionPolicy: 'Demote after view, expiry, low fit, or user hide.',
  }),
  population_governance: contract({
    family: 'population_governance',
    title: 'Rail Population Formula And Signal Governance',
    signalClass: 'governance',
    owner: 'system',
    defaultContexts: ['public_home', 'client_home', 'circle', 'chef_workspace'],
    requiredConsents: [],
    optOutKey: 'rail.governance',
    rarity: 'common',
    maxShareOfRail: 1,
    expiryPolicy: 'session',
    populationFormula: 'baseScore * contextFit * freshness * diversityBalance',
    reasonTemplate:
      'Every rail item must expose owner, score, reason, expiry, and demotion policy.',
    demotionPolicy: 'Demote repeated, stale, hidden, expired, or low-confidence signals.',
  }),
  social_safety: contract({
    family: 'social_safety',
    title: 'Lean Circle Rules And Social Safety Foundation',
    signalClass: 'social_graph',
    owner: 'circle',
    defaultContexts: ['circle', 'client_home'],
    requiredConsents: ['circle_activity'],
    optOutKey: 'rail.socialSafety',
    rarity: 'limited',
    maxShareOfRail: 0.16,
    expiryPolicy: 'manual_review',
    populationFormula: 'circleTrust * rolePermission * consentFit',
    reasonTemplate: 'Circle social prompts stay lean, permissioned, and reversible.',
    demotionPolicy: 'Suppress when role, consent, mute, block, or safety review fails.',
  }),
  relationship_life_event: contract({
    family: 'relationship_life_event',
    title: 'Relationship Graph And Life Event Planner',
    signalClass: 'relationship',
    owner: 'client',
    defaultContexts: ['client_home', 'circle'],
    requiredConsents: ['relationship_planning'],
    optOutKey: 'rail.relationshipPlanning',
    rarity: 'rare',
    maxShareOfRail: 0.08,
    expiryPolicy: 'event_date',
    populationFormula: 'lifeEventProximity * relationshipStrength * planningWindowFit',
    reasonTemplate: 'Upcoming birthday, anniversary, or recurring dinner planning window.',
    demotionPolicy: 'Demote outside the planning window or after a plan is accepted/dismissed.',
  }),
  visibility_consent: contract({
    family: 'visibility_consent',
    title: 'Visibility Consent And Cross Context Safety Center',
    signalClass: 'governance',
    owner: 'system',
    defaultContexts: ['client_home', 'chef_workspace', 'circle', 'partner_portal'],
    requiredConsents: [],
    optOutKey: 'rail.visibilityConsent',
    rarity: 'common',
    maxShareOfRail: 1,
    expiryPolicy: 'session',
    populationFormula: 'roleBoundary * explicitConsent * minimumNecessaryDetail',
    reasonTemplate: 'Cross-context details require consent and minimum necessary visibility.',
    demotionPolicy: 'Fail closed when consent, role boundary, or context ownership is unclear.',
  }),
  shared_circle_discovery: contract({
    family: 'shared_circle_discovery',
    title: 'Shared Diner Circle Discovery Rail And Stats',
    signalClass: 'circle',
    owner: 'circle',
    defaultContexts: ['circle'],
    requiredConsents: ['circle_activity'],
    optOutKey: 'rail.sharedCircleDiscovery',
    rarity: 'limited',
    maxShareOfRail: 0.24,
    expiryPolicy: 'session',
    populationFormula: 'memberFit * consensusDelta * constraintSafety * recency',
    reasonTemplate: 'Shared rail candidate with fit stats, conflicts, and current winning signal.',
    demotionPolicy: 'Demote stale, vetoed, resolved, or low-consensus candidates.',
  }),
  food_signal_notifications: contract({
    family: 'food_signal_notifications',
    title: 'Unified Food Signal Notifications And Inbox',
    signalClass: 'notification',
    owner: 'system',
    defaultContexts: ['client_home', 'chef_workspace', 'circle'],
    requiredConsents: ['notifications'],
    optOutKey: 'rail.foodNotifications',
    rarity: 'limited',
    maxShareOfRail: 0.14,
    expiryPolicy: 'time_window',
    populationFormula: 'urgency * relevance * channelQuietHoursFit',
    reasonTemplate: 'A food signal is worth surfacing without email or noisy push.',
    demotionPolicy: 'Suppress by quiet hours, duplicate inbox item, expiry, or channel opt-out.',
  }),
  universal_food_object: contract({
    family: 'universal_food_object',
    title: 'Universal Food Object Actions And Memory Capture',
    signalClass: 'governance',
    owner: 'system',
    defaultContexts: ['public_home', 'client_home', 'circle', 'chef_workspace'],
    requiredConsents: ['food_memory'],
    optOutKey: 'rail.foodMemory',
    rarity: 'common',
    maxShareOfRail: 1,
    expiryPolicy: 'session',
    populationFormula: 'objectTypeFit * actionAvailability * consentFit',
    reasonTemplate: 'Food objects share one action model: save, send, ask, plan, vote, private.',
    demotionPolicy: 'Disable actions that would write memory or shared state without consent.',
  }),
  what_to_eat_now: contract({
    family: 'what_to_eat_now',
    title: 'What To Eat Now Universal Search And Recovery',
    signalClass: 'search_recovery',
    owner: 'system',
    defaultContexts: ['public_home', 'client_home', 'circle'],
    requiredConsents: [],
    optOutKey: 'rail.whatToEatNow',
    rarity: 'common',
    maxShareOfRail: 0.2,
    expiryPolicy: 'session',
    populationFormula: 'queryIntent * inventoryFit * recoveryNeed',
    reasonTemplate: 'Recover vague or empty food intent into useful next choices.',
    demotionPolicy: 'Demote after successful result selection or clear refined query.',
  }),
  partner_vendor_opportunity: contract({
    family: 'partner_vendor_opportunity',
    title: 'Partner Location And Vendor Opportunity Profiles',
    signalClass: 'opportunity',
    owner: 'partner',
    defaultContexts: ['partner_portal', 'chef_workspace', 'client_home'],
    requiredConsents: ['partner_opportunities'],
    optOutKey: 'rail.partnerVendorOpportunities',
    rarity: 'rare',
    maxShareOfRail: 0.1,
    expiryPolicy: 'manual_review',
    populationFormula: 'partnerFit * locationFit * commercialPolicy * trustScore',
    reasonTemplate: 'Partner location, vendor, Airbnb, or venue opportunity relevant to this user.',
    demotionPolicy: 'Suppress when attribution, compensation, consent, or freshness is missing.',
  }),
  food_social_network: contract({
    family: 'food_social_network',
    title: 'Food Social Network Unification',
    signalClass: 'social_graph',
    owner: 'system',
    defaultContexts: ['client_home', 'circle', 'chef_workspace'],
    requiredConsents: ['circle_activity', 'food_memory'],
    optOutKey: 'rail.foodSocialNetwork',
    rarity: 'limited',
    maxShareOfRail: 0.16,
    expiryPolicy: 'manual_review',
    populationFormula: 'relationshipFit * objectRelevance * safetyBoundary * recency',
    reasonTemplate:
      'Unifies food objects, relationships, circles, chef prompts, and private memory.',
    demotionPolicy: 'Suppress when privacy, role, or social graph safety is unresolved.',
  }),
}

export function listFoodSocialRailContracts(): FoodSocialRailContract[] {
  return Object.values(FOOD_SOCIAL_RAIL_CONTRACTS)
}

export function getFoodSocialRailContract(family: FoodSocialRailFamily): FoodSocialRailContract {
  return FOOD_SOCIAL_RAIL_CONTRACTS[family]
}

export function evaluateFoodSocialRailCandidate(input: {
  candidate: FoodSocialRailCandidate
  actorMode: FoodSocialActorMode
  context: FoodSocialRailContext
  consentGrants?: readonly FoodSocialConsentGrant[]
  optedOutKeys?: readonly string[]
  now?: string
}): FoodSocialRailDecision {
  const contract = getFoodSocialRailContract(input.candidate.family)
  const consent = new Set(input.consentGrants ?? [])
  const optedOut = new Set(input.optedOutKeys ?? [])
  const missingConsent = contract.requiredConsents.filter((grant) => !consent.has(grant))
  const expired = isExpired(input.candidate.expiresAt, input.now)
  const contextAllowed = contract.defaultContexts.includes(input.context)
  const optOutSuppressed = optedOut.has(contract.optOutKey)

  const base = {
    candidateId: input.candidate.id,
    family: input.candidate.family,
    score: Math.max(0, input.candidate.score),
    audit: {
      owner: contract.owner,
      signalClass: contract.signalClass,
      optOutKey: contract.optOutKey,
      expiryPolicy: contract.expiryPolicy,
      populationFormula: contract.populationFormula,
    },
  }

  if (expired) {
    return { ...base, eligible: false, reason: `${contract.title} is expired.` }
  }

  if (optOutSuppressed) {
    return { ...base, eligible: false, reason: `${contract.title} is suppressed by opt-out.` }
  }

  if (!contextAllowed) {
    return {
      ...base,
      eligible: false,
      reason: `${contract.title} is not allowed in ${input.context}.`,
    }
  }

  if (missingConsent.length > 0 && input.actorMode !== 'admin') {
    return {
      ...base,
      eligible: false,
      reason: `${contract.title} requires consent: ${missingConsent.join(', ')}.`,
    }
  }

  return {
    ...base,
    eligible: true,
    score: scoreWithRarity(input.candidate.score, contract.rarity, input.candidate.urgency),
    reason: contract.reasonTemplate,
  }
}

export function resolveFoodSocialRailMix(input: {
  candidates: readonly FoodSocialRailCandidate[]
  actorMode: FoodSocialActorMode
  context: FoodSocialRailContext
  consentGrants?: readonly FoodSocialConsentGrant[]
  optedOutKeys?: readonly string[]
  maxItems?: number
  now?: string
}): FoodSocialRailMix {
  const maxItems = input.maxItems ?? 8
  const evaluated = input.candidates.map((candidate) =>
    evaluateFoodSocialRailCandidate({ ...input, candidate })
  )
  const selected: FoodSocialRailDecision[] = []
  const suppressed = evaluated.filter((decision) => !decision.eligible)
  const eligible = evaluated
    .filter((decision) => decision.eligible)
    .sort((a, b) => b.score - a.score)

  for (const decision of eligible) {
    if (selected.length >= maxItems) {
      suppressed.push({ ...decision, eligible: false, reason: 'Rail capacity reached.' })
      continue
    }

    const contract = getFoodSocialRailContract(decision.family)
    const familyCount = selected.filter((item) => item.family === decision.family).length
    const familyLimit = Math.max(1, Math.floor(maxItems * contract.maxShareOfRail))
    if (familyCount >= familyLimit) {
      suppressed.push({
        ...decision,
        eligible: false,
        reason: `${contract.title} reached its population share cap.`,
      })
      continue
    }

    selected.push(decision)
  }

  return {
    selected,
    suppressed,
    reason: 'Rail mix selected by score, consent, expiry, context, and per-family share caps.',
  }
}

export function decideFoodSocialVisibility(input: {
  family: FoodSocialRailFamily
  viewerMode: FoodSocialActorMode
  sourceContext: FoodSocialRailContext
  targetContext: FoodSocialRailContext
  consentGrants?: readonly FoodSocialConsentGrant[]
}): FoodSocialVisibilityDecision {
  const contract = getFoodSocialRailContract(input.family)
  const consent = new Set(input.consentGrants ?? [])
  const missingConsent = contract.requiredConsents.some((grant) => !consent.has(grant))
  const crossContext = input.sourceContext !== input.targetContext

  if (missingConsent && input.viewerMode !== 'admin') {
    return {
      allowed: false,
      visibleDetail: 'none',
      requiresConfirmation: false,
      reason: 'Required consent is missing for this food social signal.',
    }
  }

  if (input.viewerMode === 'chef' && crossContext) {
    return {
      allowed: true,
      visibleDetail: 'summary',
      requiresConfirmation: false,
      reason: 'Chef workspace can see consented summaries, not raw personal activity.',
    }
  }

  if (crossContext) {
    return {
      allowed: true,
      visibleDetail: 'reason_only',
      requiresConfirmation: true,
      reason: 'Cross-context rail visibility requires confirmation before writing shared state.',
    }
  }

  return {
    allowed: true,
    visibleDetail: 'full',
    requiresConfirmation: false,
    reason: 'Signal stays inside its source context.',
  }
}

export function buildUniversalFoodObjectActions(input: {
  objectType: FoodSocialObjectType
  authenticated: boolean
  inCircleContext?: boolean
  chefAvailable?: boolean
  consentGrants?: readonly FoodSocialConsentGrant[]
}): UniversalFoodActionDecision[] {
  const consent = new Set(input.consentGrants ?? [])
  const canWriteMemory = input.authenticated && consent.has('food_memory')
  const canWriteCircle =
    input.authenticated && input.inCircleContext && consent.has('circle_activity')

  return [
    action('save', input.authenticated, canWriteMemory, false, canWriteMemory),
    action('send_to_circle', Boolean(canWriteCircle), false, true, true),
    action('ask_chef', Boolean(input.authenticated && input.chefAvailable), false, false, false),
    action('plan_dinner', input.authenticated, canWriteMemory, false, true),
    action('vote', Boolean(canWriteCircle), false, true, false),
    action('keep_private', input.authenticated, canWriteMemory, false, false),
    action('hide', input.authenticated, canWriteMemory, false, false),
    action('notify_me', input.authenticated && consent.has('notifications'), false, false, false),
  ]
}

export function resolveWhatToEatRecovery(input: {
  query?: string | null
  resultCount: number
  hasDietaryConstraint?: boolean
  hasCircleContext?: boolean
}): WhatToEatRecovery {
  const query = (input.query ?? '').trim()

  if (input.resultCount > 0 && query.length > 2) {
    return {
      mode: 'continue',
      prompt: 'Keep browsing matching food options.',
      suggestedFamilies: ['what_to_eat_now'],
    }
  }

  if (query.length <= 2) {
    return {
      mode: 'clarify',
      prompt: 'What sounds good right now?',
      suggestedFamilies: ['what_to_eat_now', 'population_governance'],
    }
  }

  return {
    mode: 'recover',
    prompt: 'No strong matches yet. Try a broader craving, nearby option, or circle vote.',
    suggestedFamilies: input.hasCircleContext
      ? ['what_to_eat_now', 'shared_circle_discovery']
      : input.hasDietaryConstraint
        ? ['what_to_eat_now', 'visibility_consent']
        : ['what_to_eat_now', 'opportunity_marketplace'],
  }
}

function contract(input: FoodSocialRailContract): FoodSocialRailContract {
  return input
}

function scoreWithRarity(
  score: number,
  rarity: FoodSocialRailContract['rarity'],
  urgency: FoodSocialRailCandidate['urgency']
): number {
  const rarityFactor = rarity === 'rare' ? 0.74 : rarity === 'limited' ? 0.88 : 1
  const urgencyFactor = urgency === 'urgent' ? 1.25 : 1
  return Math.round(score * rarityFactor * urgencyFactor * 100) / 100
}

function isExpired(expiresAt: string | null | undefined, now = new Date().toISOString()): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() <= new Date(now).getTime()
}

function action(
  actionName: UniversalFoodAction,
  enabled: boolean,
  writesMemory: boolean,
  writesSharedState: boolean,
  requiresConfirmation: boolean
): UniversalFoodActionDecision {
  return {
    action: actionName,
    enabled,
    writesMemory,
    writesSharedState,
    requiresConfirmation: enabled && requiresConfirmation,
    reason: enabled
      ? `${actionName} is available for this food object.`
      : `${actionName} requires authentication, consent, or the right context.`,
  }
}
