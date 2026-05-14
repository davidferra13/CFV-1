export type DiscoverySourceType =
  | 'chef_flow_claimed'
  | 'operator_submission'
  | 'partner_api'
  | 'direct_operator_website'
  | 'open_street_map'
  | 'menu_platform'
  | 'event_platform'
  | 'social_page'
  | 'google_places'
  | 'yelp'
  | 'review_location_provider'
  | 'chef_flow_private'
  | 'unknown'

export type DiscoverySourcePolicyStatus = 'allowed' | 'conditional' | 'prohibited'

export type DiscoverySourceUse =
  | 'link_out'
  | 'public_metadata'
  | 'search_index'
  | 'public_claim'
  | 'full_content'

export type DiscoverySourceDisplayMode =
  | 'full_claims'
  | 'metadata_with_attribution'
  | 'link_only'
  | 'internal_only'
  | 'prohibited'

export type DiscoverySourcePolicy = {
  type: DiscoverySourceType
  label: string
  status: DiscoverySourcePolicyStatus
  displayMode: DiscoverySourceDisplayMode
  allowedUses: readonly DiscoverySourceUse[]
  attributionRequired: boolean
  optOutRequired: boolean
  maxCrawlCadenceHours: number | null
  retentionDays: number | null
  notes: string
}

export type DiscoverySourceEvaluationInput = {
  sourceType: DiscoverySourceType
  intendedUse: DiscoverySourceUse
  hasAttribution?: boolean
  isFresh?: boolean
  isOperatorControlled?: boolean
  isOptedOut?: boolean
  isQuarantined?: boolean
}

export type DiscoverySourceEvaluation = {
  allowed: boolean
  state: 'eligible' | 'degraded' | 'suppressed'
  policy: DiscoverySourcePolicy
  reasons: string[]
}

export const DISCOVERY_SOURCE_POLICIES: Record<DiscoverySourceType, DiscoverySourcePolicy> = {
  chef_flow_claimed: {
    type: 'chef_flow_claimed',
    label: 'Claimed ChefFlow profile',
    status: 'allowed',
    displayMode: 'full_claims',
    allowedUses: ['link_out', 'public_metadata', 'search_index', 'public_claim', 'full_content'],
    attributionRequired: false,
    optOutRequired: true,
    maxCrawlCadenceHours: null,
    retentionDays: null,
    notes: 'Operator-controlled ChefFlow data can power strong public claims.',
  },
  operator_submission: {
    type: 'operator_submission',
    label: 'Operator submission',
    status: 'allowed',
    displayMode: 'full_claims',
    allowedUses: ['link_out', 'public_metadata', 'search_index', 'public_claim', 'full_content'],
    attributionRequired: false,
    optOutRequired: true,
    maxCrawlCadenceHours: null,
    retentionDays: null,
    notes: 'Submitted public listing data can be displayed with claim/correction/removal paths.',
  },
  partner_api: {
    type: 'partner_api',
    label: 'Partner API',
    status: 'allowed',
    displayMode: 'full_claims',
    allowedUses: ['link_out', 'public_metadata', 'search_index', 'public_claim', 'full_content'],
    attributionRequired: true,
    optOutRequired: true,
    maxCrawlCadenceHours: null,
    retentionDays: null,
    notes: 'Partner contract must define display, attribution, and refresh rights.',
  },
  direct_operator_website: {
    type: 'direct_operator_website',
    label: 'Direct operator website',
    status: 'conditional',
    displayMode: 'metadata_with_attribution',
    allowedUses: ['link_out', 'public_metadata', 'search_index', 'public_claim'],
    attributionRequired: true,
    optOutRequired: true,
    maxCrawlCadenceHours: 24,
    retentionDays: 45,
    notes: 'Use current metadata and links; avoid hoarding complete menu copies.',
  },
  open_street_map: {
    type: 'open_street_map',
    label: 'OpenStreetMap',
    status: 'conditional',
    displayMode: 'metadata_with_attribution',
    allowedUses: ['link_out', 'public_metadata', 'search_index'],
    attributionRequired: true,
    optOutRequired: true,
    maxCrawlCadenceHours: 168,
    retentionDays: 180,
    notes: 'Suitable for place metadata, not menu/event claims.',
  },
  menu_platform: {
    type: 'menu_platform',
    label: 'External menu platform',
    status: 'conditional',
    displayMode: 'link_only',
    allowedUses: ['link_out', 'public_metadata', 'search_index'],
    attributionRequired: true,
    optOutRequired: true,
    maxCrawlCadenceHours: 24,
    retentionDays: 14,
    notes: 'Prefer source links and lightweight tags; do not host full copied menus by default.',
  },
  event_platform: {
    type: 'event_platform',
    label: 'External event platform',
    status: 'conditional',
    displayMode: 'metadata_with_attribution',
    allowedUses: ['link_out', 'public_metadata', 'search_index', 'public_claim'],
    attributionRequired: true,
    optOutRequired: true,
    maxCrawlCadenceHours: 12,
    retentionDays: 30,
    notes: 'Event claims must be date/status fresh and link back to the source.',
  },
  social_page: {
    type: 'social_page',
    label: 'Social page',
    status: 'conditional',
    displayMode: 'link_only',
    allowedUses: ['link_out', 'public_metadata'],
    attributionRequired: true,
    optOutRequired: true,
    maxCrawlCadenceHours: 24,
    retentionDays: 14,
    notes: 'Use as a weak public signal; do not derive strong claims without corroboration.',
  },
  google_places: {
    type: 'google_places',
    label: 'Google Places',
    status: 'conditional',
    displayMode: 'link_only',
    allowedUses: ['link_out', 'public_metadata'],
    attributionRequired: true,
    optOutRequired: true,
    maxCrawlCadenceHours: null,
    retentionDays: 7,
    notes: 'Treat provider data as attributed/link-out metadata unless a contract permits more.',
  },
  yelp: {
    type: 'yelp',
    label: 'Yelp',
    status: 'conditional',
    displayMode: 'link_only',
    allowedUses: ['link_out', 'public_metadata'],
    attributionRequired: true,
    optOutRequired: true,
    maxCrawlCadenceHours: null,
    retentionDays: 7,
    notes: 'Do not copy reviews, ratings, or full menu content into ChefFlow.',
  },
  review_location_provider: {
    type: 'review_location_provider',
    label: 'Review or location provider',
    status: 'conditional',
    displayMode: 'link_only',
    allowedUses: ['link_out', 'public_metadata'],
    attributionRequired: true,
    optOutRequired: true,
    maxCrawlCadenceHours: null,
    retentionDays: 7,
    notes: 'Provider-specific terms decide whether metadata can be indexed.',
  },
  chef_flow_private: {
    type: 'chef_flow_private',
    label: 'Private ChefFlow data',
    status: 'prohibited',
    displayMode: 'internal_only',
    allowedUses: [],
    attributionRequired: false,
    optOutRequired: false,
    maxCrawlCadenceHours: null,
    retentionDays: null,
    notes:
      'Private recipes, costing, client menus, and internal event menus never power public discovery.',
  },
  unknown: {
    type: 'unknown',
    label: 'Unknown source',
    status: 'prohibited',
    displayMode: 'prohibited',
    allowedUses: [],
    attributionRequired: true,
    optOutRequired: true,
    maxCrawlCadenceHours: null,
    retentionDays: 0,
    notes: 'Unknown provenance fails closed.',
  },
}

export function getDiscoverySourcePolicy(sourceType: DiscoverySourceType): DiscoverySourcePolicy {
  return DISCOVERY_SOURCE_POLICIES[sourceType] ?? DISCOVERY_SOURCE_POLICIES.unknown
}

export function evaluateDiscoverySourceUse(
  input: DiscoverySourceEvaluationInput
): DiscoverySourceEvaluation {
  const policy = getDiscoverySourcePolicy(input.sourceType)
  const reasons: string[] = []

  if (input.isOptedOut) reasons.push('Source record is opted out or removed.')
  if (input.isQuarantined) reasons.push('Source record is quarantined pending moderation.')
  if (policy.status === 'prohibited')
    reasons.push(`${policy.label} is prohibited for public discovery.`)
  if (!policy.allowedUses.includes(input.intendedUse)) {
    reasons.push(`${policy.label} does not allow ${input.intendedUse}.`)
  }
  if (policy.attributionRequired && !input.hasAttribution) {
    reasons.push(`${policy.label} requires public attribution.`)
  }
  if (input.intendedUse === 'public_claim' && input.isFresh === false) {
    reasons.push('Freshness is not strong enough for a public claim.')
  }
  if (input.intendedUse === 'full_content' && !input.isOperatorControlled) {
    reasons.push('Full content display requires operator control or explicit partner rights.')
  }

  const allowed = reasons.length === 0
  const state = allowed
    ? 'eligible'
    : input.isOptedOut ||
        input.isQuarantined ||
        policy.status === 'prohibited' ||
        !policy.allowedUses.includes(input.intendedUse)
      ? 'suppressed'
      : 'degraded'

  return { allowed, state, policy, reasons }
}
