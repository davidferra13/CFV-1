export type DiscoveryCompareCandidateType =
  | 'chef'
  | 'restaurant'
  | 'cuisine'
  | 'menu'
  | 'private_dinner'
  | 'open_table'
  | 'remy_suggestion'
  | 'manual_pick'
  | 'recipe'

export type DiscoveryCompareDimension =
  | 'distance'
  | 'cuisine_fit'
  | 'budget'
  | 'group_fit'
  | 'availability'
  | 'confidence'
  | 'why_recommended'

export type DiscoveryCompareSignal = {
  dimension: DiscoveryCompareDimension
  label: string
  value: string
  status: 'strong' | 'okay' | 'weak' | 'missing'
}

export type DiscoveryCompareCandidate = {
  id: string
  type: DiscoveryCompareCandidateType
  label: string
  href?: string | null
  cuisineTags?: readonly string[]
  distanceMiles?: number | null
  priceLevel?: 'budget' | 'moderate' | 'premium' | 'luxury' | null
  supportsGroupSize?: number | null
  available?: boolean | null
  confidence?: number | null
  whyRecommended?: readonly string[]
  actionData?: {
    menuHref?: string | null
    directionsHref?: string | null
    phoneHref?: string | null
    reserveHref?: string | null
    orderHref?: string | null
    inquiryHref?: string | null
    ingredientHref?: string | null
    prepHref?: string | null
    detailHref?: string | null
  }
}

export type DiscoveryCompareContext = {
  desiredCuisine?: string | null
  maxDistanceMiles?: number | null
  budget?: 'budget' | 'moderate' | 'premium' | 'luxury' | null
  groupSize?: number | null
}

export type DinnerPlanActionId =
  | 'view_menu'
  | 'get_directions'
  | 'call'
  | 'reserve_or_order'
  | 'send_inquiry'
  | 'view_ingredients'
  | 'prep_window'
  | 'view_details'
  | 'share_plan'
  | 'reopen_discovery'

export type DinnerPlanAction = {
  id: DinnerPlanActionId
  label: string
  href?: string | null
  primary: boolean
}

export type DinnerPlanHandoffReadiness = {
  ready: boolean
  primaryAction: DinnerPlanAction
  secondaryActions: DinnerPlanAction[]
  blockers: string[]
}

export function buildCompareSignals(
  candidate: DiscoveryCompareCandidate,
  context: DiscoveryCompareContext = {}
): DiscoveryCompareSignal[] {
  return [
    distanceSignal(candidate, context),
    cuisineSignal(candidate, context),
    budgetSignal(candidate, context),
    groupSignal(candidate, context),
    availabilitySignal(candidate),
    confidenceSignal(candidate),
    whySignal(candidate),
  ]
}

export function buildCompareMatrix(
  candidates: readonly DiscoveryCompareCandidate[],
  context: DiscoveryCompareContext = {}
): Array<DiscoveryCompareCandidate & { signals: DiscoveryCompareSignal[]; score: number }> {
  return candidates.slice(0, 4).map((candidate) => {
    const signals = buildCompareSignals(candidate, context)
    return {
      ...candidate,
      signals,
      score: signals.reduce((total, signal) => total + signalScore(signal.status), 0),
    }
  })
}

export function resolveDinnerPlanHandoffReadiness(
  candidate: DiscoveryCompareCandidate
): DinnerPlanHandoffReadiness {
  const blockers: string[] = []
  const actions = getDinnerPlanActions(candidate)
  const primaryAction =
    actions.find((action) => action.primary && action.href) ??
    actions.find((action) => action.id === 'view_details') ??
    fallbackAction('view_details', 'View details', candidate.href)

  if (!candidate.href && !primaryAction.href) blockers.push('Missing detail destination')
  if (candidate.available === false) blockers.push('Availability is not confirmed')
  if (!candidate.label.trim()) blockers.push('Missing selected option label')

  const secondaryActions = actions
    .filter((action) => action.id !== primaryAction.id)
    .filter(
      (action) => action.href || action.id === 'share_plan' || action.id === 'reopen_discovery'
    )
    .slice(0, 4)

  return {
    ready: blockers.length === 0,
    primaryAction,
    secondaryActions,
    blockers,
  }
}

function getDinnerPlanActions(candidate: DiscoveryCompareCandidate): DinnerPlanAction[] {
  const data = candidate.actionData ?? {}

  if (candidate.type === 'restaurant' || candidate.type === 'open_table') {
    return [
      fallbackAction('reserve_or_order', 'Reserve or order', data.reserveHref ?? data.orderHref),
      fallbackAction('view_menu', 'View menu', data.menuHref),
      fallbackAction('get_directions', 'Directions', data.directionsHref),
      fallbackAction('call', 'Call', data.phoneHref),
      fallbackAction('view_details', 'View details', candidate.href ?? data.detailHref),
      fallbackAction('share_plan', 'Share plan', null),
      fallbackAction('reopen_discovery', 'Reopen discovery', '/eat'),
    ]
  }

  if (candidate.type === 'recipe') {
    return [
      fallbackAction('view_ingredients', 'View ingredients', data.ingredientHref ?? candidate.href),
      fallbackAction('prep_window', 'Prep window', data.prepHref),
      fallbackAction('view_details', 'View details', candidate.href ?? data.detailHref),
      fallbackAction('share_plan', 'Share plan', null),
      fallbackAction('reopen_discovery', 'Reopen discovery', '/eat'),
    ]
  }

  if (candidate.type === 'chef' || candidate.type === 'private_dinner') {
    return [
      fallbackAction('send_inquiry', 'Send inquiry', data.inquiryHref ?? candidate.href),
      fallbackAction('view_menu', 'View menu', data.menuHref),
      fallbackAction('view_details', 'View details', candidate.href ?? data.detailHref),
      fallbackAction('share_plan', 'Share plan', null),
      fallbackAction('reopen_discovery', 'Reopen discovery', '/eat'),
    ]
  }

  return [
    fallbackAction('view_details', 'View details', candidate.href ?? data.detailHref),
    fallbackAction('share_plan', 'Share plan', null),
    fallbackAction('reopen_discovery', 'Reopen discovery', '/eat'),
  ]
}

function distanceSignal(
  candidate: DiscoveryCompareCandidate,
  context: DiscoveryCompareContext
): DiscoveryCompareSignal {
  if (candidate.distanceMiles === null || candidate.distanceMiles === undefined) {
    return signal('distance', 'Distance', 'Unknown', 'missing')
  }
  const max = context.maxDistanceMiles ?? 10
  return signal(
    'distance',
    'Distance',
    `${candidate.distanceMiles} miles`,
    candidate.distanceMiles <= max
      ? 'strong'
      : candidate.distanceMiles <= max * 1.5
        ? 'okay'
        : 'weak'
  )
}

function cuisineSignal(
  candidate: DiscoveryCompareCandidate,
  context: DiscoveryCompareContext
): DiscoveryCompareSignal {
  const desired = context.desiredCuisine?.toLowerCase()
  if (!desired) return signal('cuisine_fit', 'Cuisine fit', 'No preference set', 'missing')
  const match = candidate.cuisineTags?.some((tag) => tag.toLowerCase().includes(desired))
  return signal(
    'cuisine_fit',
    'Cuisine fit',
    match ? context.desiredCuisine! : 'Different cuisine',
    match ? 'strong' : 'weak'
  )
}

function budgetSignal(
  candidate: DiscoveryCompareCandidate,
  context: DiscoveryCompareContext
): DiscoveryCompareSignal {
  if (!candidate.priceLevel) return signal('budget', 'Budget', 'Unknown', 'missing')
  if (!context.budget) return signal('budget', 'Budget', candidate.priceLevel, 'okay')
  const levels = ['budget', 'moderate', 'premium', 'luxury']
  const candidateIndex = levels.indexOf(candidate.priceLevel)
  const desiredIndex = levels.indexOf(context.budget)
  return signal(
    'budget',
    'Budget',
    candidate.priceLevel,
    candidateIndex <= desiredIndex
      ? 'strong'
      : candidateIndex === desiredIndex + 1
        ? 'okay'
        : 'weak'
  )
}

function groupSignal(
  candidate: DiscoveryCompareCandidate,
  context: DiscoveryCompareContext
): DiscoveryCompareSignal {
  if (!context.groupSize) return signal('group_fit', 'Group fit', 'No group size set', 'missing')
  if (!candidate.supportsGroupSize)
    return signal('group_fit', 'Group fit', 'Unknown capacity', 'missing')
  return signal(
    'group_fit',
    'Group fit',
    `Up to ${candidate.supportsGroupSize}`,
    candidate.supportsGroupSize >= context.groupSize ? 'strong' : 'weak'
  )
}

function availabilitySignal(candidate: DiscoveryCompareCandidate): DiscoveryCompareSignal {
  if (candidate.available === null || candidate.available === undefined) {
    return signal('availability', 'Availability', 'Unknown', 'missing')
  }
  return signal(
    'availability',
    'Availability',
    candidate.available ? 'Available signal' : 'Unavailable or stale',
    candidate.available ? 'strong' : 'weak'
  )
}

function confidenceSignal(candidate: DiscoveryCompareCandidate): DiscoveryCompareSignal {
  if (candidate.confidence === null || candidate.confidence === undefined) {
    return signal('confidence', 'Confidence', 'Unknown', 'missing')
  }
  const value = Math.max(0, Math.min(1, candidate.confidence))
  return signal(
    'confidence',
    'Confidence',
    `${Math.round(value * 100)}%`,
    value >= 0.75 ? 'strong' : value >= 0.5 ? 'okay' : 'weak'
  )
}

function whySignal(candidate: DiscoveryCompareCandidate): DiscoveryCompareSignal {
  const reasons = candidate.whyRecommended?.filter(Boolean) ?? []
  return signal(
    'why_recommended',
    'Why recommended',
    reasons.length > 0 ? reasons.slice(0, 2).join(', ') : 'No reason captured',
    reasons.length > 0 ? 'strong' : 'missing'
  )
}

function signal(
  dimension: DiscoveryCompareDimension,
  label: string,
  value: string,
  status: DiscoveryCompareSignal['status']
): DiscoveryCompareSignal {
  return { dimension, label, value, status }
}

function signalScore(status: DiscoveryCompareSignal['status']): number {
  if (status === 'strong') return 3
  if (status === 'okay') return 2
  if (status === 'weak') return 1
  return 0
}

function fallbackAction(
  id: DinnerPlanActionId,
  label: string,
  href: string | null | undefined
): DinnerPlanAction {
  return {
    id,
    label,
    href: href ?? null,
    primary: id !== 'share_plan' && id !== 'reopen_discovery',
  }
}
