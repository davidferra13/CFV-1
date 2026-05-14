import { validateDiscoveryDestination } from '@/lib/discovery/discovery-destination-contract'
import type {
  DiscoveryDestinationFamily,
  DiscoveryDestinationValidation,
} from '@/lib/discovery/discovery-destination-contract'
import {
  HOMEPAGE_DISCOVERY_LANE_ITEM_TYPES,
  type DiscoveryItemType,
  type DiscoveryRailItem,
  type HomepageDiscoveryLane,
} from '@/lib/discovery/homepage-discovery-rail'

export type DiscoveryActorRole = 'public' | 'guest' | 'client' | 'chef' | 'admin'

export type DiscoveryRailAction =
  | 'navigate'
  | 'select'
  | 'filter'
  | 'save'
  | 'hide'
  | 'lock'
  | 'compare'
  | 'share'

export type DiscoveryFilterFacet =
  | 'cuisine'
  | 'craving'
  | 'dietary'
  | 'fulfillment'
  | 'occasion'
  | 'location'
  | 'budget'
  | 'dateWindow'
  | 'partySize'
  | 'resultType'
  | 'mood'
  | 'ingredient'

export type DiscoveryReasonCode =
  | 'random_pick'
  | 'pantry_match'
  | 'preference_match'
  | 'novelty_injection'
  | 'recovery_prompt'
  | 'seasonal_pick'
  | 'forced_engagement'
  | 'diversity_fill'
  | 'freshness_return'
  | 'manual_editorial'
  | 'location_match'
  | 'budget_fit'
  | 'occasion_fit'
  | 'saved_context'
  | 'circle_context'

export type DiscoveryAnalyticsEventName =
  | 'discovery_rail_impression'
  | 'discovery_rail_click'
  | 'discovery_rail_select'
  | 'discovery_filter_apply'
  | 'discovery_item_save'
  | 'discovery_item_hide'
  | 'discovery_item_lock'
  | 'discovery_item_compare'
  | 'discovery_item_share'

export type DiscoveryRailContract = {
  type: DiscoveryItemType
  label: string
  definition: string
  lane: HomepageDiscoveryLane
  destinationFamilies: readonly DiscoveryDestinationFamily[]
  filterFacets: readonly DiscoveryFilterFacet[]
  defaultActions: readonly DiscoveryRailAction[]
  roleAccess: Partial<Record<DiscoveryActorRole, readonly DiscoveryRailAction[]>>
  reasonCodes: readonly DiscoveryReasonCode[]
  analyticsEvents: readonly DiscoveryAnalyticsEventName[]
  requiresAuthFor: readonly DiscoveryRailAction[]
}

export type DiscoveryRailActionDecision = {
  allowed: boolean
  action: DiscoveryRailAction
  role: DiscoveryActorRole
  reason: string
  requiresAuth: boolean
}

export type DiscoveryRailRouteDecision = {
  allowed: boolean
  destination: DiscoveryDestinationValidation
  reason: string
  privateIdLeak: boolean
}

export type DiscoveryRailItemDecision = {
  actionable: boolean
  route: DiscoveryRailRouteDecision
  allowedActions: DiscoveryRailAction[]
  blockedActions: DiscoveryRailActionDecision[]
  analyticsEvents: DiscoveryAnalyticsEventName[]
  reasonCodes: DiscoveryReasonCode[]
  reason: string
}

const ROLE_ACTIONS: Record<DiscoveryActorRole, readonly DiscoveryRailAction[]> = {
  public: ['navigate', 'select', 'filter', 'hide', 'share'],
  guest: ['navigate', 'select', 'filter', 'save', 'hide', 'lock', 'compare', 'share'],
  client: ['navigate', 'select', 'filter', 'save', 'hide', 'lock', 'compare', 'share'],
  chef: ['navigate', 'select', 'filter', 'hide', 'share'],
  admin: ['navigate', 'select', 'filter', 'save', 'hide', 'lock', 'compare', 'share'],
}

const ROLE_AUTH_REQUIRED_ACTIONS: Partial<
  Record<DiscoveryActorRole, readonly DiscoveryRailAction[]>
> = {
  public: ['save', 'lock', 'compare'],
  chef: ['save', 'lock', 'compare'],
}

const ACTION_ANALYTICS: Record<DiscoveryRailAction, DiscoveryAnalyticsEventName> = {
  navigate: 'discovery_rail_click',
  select: 'discovery_rail_select',
  filter: 'discovery_filter_apply',
  save: 'discovery_item_save',
  hide: 'discovery_item_hide',
  lock: 'discovery_item_lock',
  compare: 'discovery_item_compare',
  share: 'discovery_item_share',
}

const PRIVATE_QUERY_KEYS = new Set([
  'id',
  'userId',
  'user_id',
  'tenantId',
  'tenant_id',
  'chefId',
  'chef_id',
  'sourceId',
  'source_id',
  'accountId',
  'account_id',
  'sessionId',
  'session_id',
])

const UUID_VALUE_PATTERN =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i

export const DISCOVERY_RAIL_CONTRACT_REGISTRY: Record<DiscoveryItemType, DiscoveryRailContract> = {
  cuisine: contract('cuisine', 'Cuisine', 'A cuisine or regional cooking tradition.', 'taste', {
    destinationFamilies: ['chefs', 'nearby', 'cuisine_page', 'eat'],
    filterFacets: ['cuisine'],
    defaultActions: ['navigate', 'select', 'filter', 'save', 'hide', 'share'],
    reasonCodes: ['preference_match', 'novelty_injection', 'diversity_fill', 'manual_editorial'],
  }),
  food_type: contract('food_type', 'Food type', 'A dish, category, or meal type.', 'taste', {
    destinationFamilies: ['nearby', 'eat', 'chefs'],
    filterFacets: ['craving', 'resultType'],
    defaultActions: ['navigate', 'select', 'filter', 'save', 'hide', 'share'],
    reasonCodes: ['preference_match', 'diversity_fill', 'random_pick'],
  }),
  craving: contract('craving', 'Craving', 'A user-stated taste or dish desire.', 'taste', {
    destinationFamilies: ['eat', 'nearby'],
    filterFacets: ['craving'],
    defaultActions: ['navigate', 'select', 'filter', 'save', 'hide', 'share'],
    reasonCodes: ['preference_match', 'recovery_prompt', 'random_pick'],
  }),
  service: contract('service', 'Service', 'A fulfillment or service format.', 'occasion', {
    destinationFamilies: ['chefs', 'eat', 'public_info'],
    filterFacets: ['fulfillment'],
    defaultActions: ['navigate', 'select', 'filter', 'save', 'share'],
    reasonCodes: ['occasion_fit', 'manual_editorial', 'preference_match'],
  }),
  occasion: contract('occasion', 'Occasion', 'A planning moment or event shape.', 'occasion', {
    destinationFamilies: ['eat', 'chefs', 'public_info'],
    filterFacets: ['occasion'],
    defaultActions: ['navigate', 'select', 'filter', 'save', 'lock', 'share'],
    reasonCodes: ['occasion_fit', 'recovery_prompt', 'manual_editorial'],
  }),
  dietary: contract('dietary', 'Dietary need', 'A dietary constraint or preference.', 'taste', {
    destinationFamilies: ['chefs', 'eat', 'nearby'],
    filterFacets: ['dietary'],
    defaultActions: ['navigate', 'select', 'filter', 'save', 'lock', 'share'],
    reasonCodes: ['preference_match', 'diversity_fill'],
  }),
  featured_chef: contract(
    'featured_chef',
    'Featured chef',
    'A public chef profile highlight.',
    'chefflow_picks',
    {
      destinationFamilies: ['chef_profile'],
      filterFacets: [],
      defaultActions: ['navigate', 'save', 'hide', 'compare', 'share'],
      reasonCodes: ['manual_editorial', 'preference_match', 'forced_engagement'],
    }
  ),
  chef_pick: contract(
    'chef_pick',
    'Chef pick',
    'A chef, menu, or service shortcut picked by ChefFlow.',
    'chefflow_picks',
    {
      destinationFamilies: ['chef_profile', 'chefs', 'eat', 'public_info'],
      filterFacets: ['resultType'],
      defaultActions: ['navigate', 'select', 'filter', 'save', 'hide', 'compare', 'share'],
      reasonCodes: ['manual_editorial', 'preference_match', 'freshness_return'],
    }
  ),
  combo: contract(
    'combo',
    'Combo',
    'A bundled set of taste and planning signals.',
    'chefflow_picks',
    {
      destinationFamilies: ['eat', 'chefs', 'nearby'],
      filterFacets: ['cuisine', 'occasion', 'budget', 'resultType'],
      defaultActions: ['navigate', 'select', 'filter', 'save', 'hide', 'lock', 'share'],
      reasonCodes: ['diversity_fill', 'occasion_fit', 'budget_fit', 'preference_match'],
    }
  ),
  story: contract(
    'story',
    'Story',
    'Editorial or explanatory discovery content.',
    'chefflow_picks',
    {
      destinationFamilies: ['eat', 'public_info', 'ingredients', 'chef_profile'],
      filterFacets: [],
      defaultActions: ['navigate', 'save', 'hide', 'share'],
      reasonCodes: ['manual_editorial', 'seasonal_pick', 'novelty_injection'],
    }
  ),
  surprise: contract('surprise', 'Surprise', 'A stochastic exploration prompt.', 'chefflow_picks', {
    destinationFamilies: ['eat', 'chefs'],
    filterFacets: ['mood'],
    defaultActions: ['navigate', 'select', 'filter', 'hide', 'share'],
    reasonCodes: ['random_pick', 'novelty_injection', 'diversity_fill'],
  }),
  seasonal: contract(
    'seasonal',
    'Seasonal',
    'A seasonal dish, ingredient, or dining moment.',
    'taste',
    {
      destinationFamilies: ['ingredients', 'eat', 'nearby'],
      filterFacets: ['ingredient', 'dateWindow'],
      defaultActions: ['navigate', 'select', 'filter', 'save', 'hide', 'share'],
      reasonCodes: ['seasonal_pick', 'freshness_return', 'pantry_match'],
    }
  ),
  location: contract(
    'location',
    'Location',
    'A place, radius, or local market signal.',
    'occasion',
    {
      destinationFamilies: ['chefs', 'nearby', 'eat'],
      filterFacets: ['location'],
      defaultActions: ['navigate', 'select', 'filter', 'save', 'lock', 'share'],
      reasonCodes: ['location_match', 'preference_match'],
    }
  ),
  mood: contract('mood', 'Mood', 'A qualitative dining or cooking vibe.', 'taste', {
    destinationFamilies: ['eat', 'chefs', 'nearby'],
    filterFacets: ['mood'],
    defaultActions: ['navigate', 'select', 'filter', 'save', 'hide', 'share'],
    reasonCodes: ['preference_match', 'novelty_injection', 'occasion_fit'],
  }),
  price: contract('price', 'Price', 'A budget or price comfort signal.', 'occasion', {
    destinationFamilies: ['eat', 'chefs', 'nearby'],
    filterFacets: ['budget'],
    defaultActions: ['navigate', 'select', 'filter', 'save', 'lock', 'share'],
    reasonCodes: ['budget_fit', 'preference_match'],
  }),
  time: contract('time', 'Time', 'A date, timing, or effort window.', 'occasion', {
    destinationFamilies: ['eat', 'chefs'],
    filterFacets: ['dateWindow'],
    defaultActions: ['navigate', 'select', 'filter', 'save', 'lock', 'share'],
    reasonCodes: ['occasion_fit', 'freshness_return', 'recovery_prompt'],
  }),
  group_size: contract(
    'group_size',
    'Group size',
    'A party size or household size signal.',
    'occasion',
    {
      destinationFamilies: ['eat', 'chefs'],
      filterFacets: ['partySize'],
      defaultActions: ['navigate', 'select', 'filter', 'save', 'lock', 'share'],
      reasonCodes: ['occasion_fit', 'circle_context'],
    }
  ),
  saved: contract(
    'saved',
    'Saved item',
    'A previously saved or recently used discovery item.',
    'chefflow_picks',
    {
      destinationFamilies: ['chefs', 'eat', 'chef_profile', 'hub'],
      filterFacets: ['resultType'],
      defaultActions: ['navigate', 'select', 'filter', 'save', 'hide', 'lock', 'compare', 'share'],
      reasonCodes: ['saved_context', 'freshness_return', 'preference_match'],
    }
  ),
  special_dining: contract(
    'special_dining',
    'Special dining',
    'A private, event, or high-intent dining format.',
    'occasion',
    {
      destinationFamilies: ['eat', 'chefs', 'public_info'],
      filterFacets: ['occasion', 'fulfillment'],
      defaultActions: ['navigate', 'select', 'filter', 'save', 'lock', 'share'],
      reasonCodes: ['occasion_fit', 'manual_editorial', 'preference_match'],
    }
  ),
  circle: contract('circle', 'Circle', 'A shared planning or group dining context.', 'occasion', {
    destinationFamilies: ['hub', 'eat'],
    filterFacets: ['occasion', 'partySize'],
    defaultActions: ['navigate', 'select', 'filter', 'lock', 'share'],
    reasonCodes: ['circle_context', 'occasion_fit', 'recovery_prompt'],
  }),
  culinary_signal: contract(
    'culinary_signal',
    'Culinary signal',
    'An ingredient, pantry, or flavor intelligence signal.',
    'taste',
    {
      destinationFamilies: ['ingredients', 'eat', 'nearby'],
      filterFacets: ['ingredient', 'craving'],
      defaultActions: ['navigate', 'select', 'filter', 'save', 'hide', 'share'],
      reasonCodes: ['pantry_match', 'seasonal_pick', 'preference_match'],
    }
  ),
}

export function listDiscoveryRailContracts(): DiscoveryRailContract[] {
  return Object.values(DISCOVERY_RAIL_CONTRACT_REGISTRY)
}

export function getDiscoveryRailContract(type: DiscoveryItemType): DiscoveryRailContract {
  return DISCOVERY_RAIL_CONTRACT_REGISTRY[type]
}

export function getDiscoveryRailActionDecision(
  type: DiscoveryItemType,
  action: DiscoveryRailAction,
  role: DiscoveryActorRole
): DiscoveryRailActionDecision {
  const contract = getDiscoveryRailContract(type)
  const roleAllowed = new Set([...(ROLE_ACTIONS[role] ?? []), ...(contract.roleAccess[role] ?? [])])
  const defaultAllowed = contract.defaultActions.includes(action)
  const requiresAuth = isRoleAuthRequired(role, action)

  if (!defaultAllowed) {
    return {
      allowed: false,
      action,
      role,
      reason: `${action} is not a supported ${type} rail action.`,
      requiresAuth,
    }
  }

  if (!roleAllowed.has(action)) {
    return {
      allowed: false,
      action,
      role,
      reason: `${role} cannot ${action} ${type} rail items in this context.`,
      requiresAuth,
    }
  }

  if (requiresAuth) {
    return {
      allowed: false,
      action,
      role,
      reason: `${action} requires guest/client context or admin support context.`,
      requiresAuth,
    }
  }

  return {
    allowed: true,
    action,
    role,
    reason: `${action} is allowed for ${role}.`,
    requiresAuth: false,
  }
}

export function getAllowedDiscoveryRailActions(
  type: DiscoveryItemType,
  role: DiscoveryActorRole
): DiscoveryRailAction[] {
  return getDiscoveryRailContract(type).defaultActions.filter(
    (action) => getDiscoveryRailActionDecision(type, action, role).allowed
  )
}

export function evaluateDiscoveryRailRoute(
  item: Pick<DiscoveryRailItem, 'type' | 'href'>
): DiscoveryRailRouteDecision {
  const destination = validateDiscoveryDestination(item.type, item.href)
  const privateIdLeak = discoveryHrefHasPrivateIdentifier(item.href)
  if (privateIdLeak) {
    return {
      allowed: false,
      destination,
      privateIdLeak,
      reason: 'Discovery rail href leaks a private identifier in query state.',
    }
  }

  if (!destination.valid) {
    return {
      allowed: false,
      destination,
      privateIdLeak,
      reason: destination.reason,
    }
  }

  return {
    allowed: true,
    destination,
    privateIdLeak,
    reason: 'Approved rail route.',
  }
}

export function evaluateDiscoveryRailItem(
  item: Pick<DiscoveryRailItem, 'type' | 'href'>,
  role: DiscoveryActorRole
): DiscoveryRailItemDecision {
  const contract = getDiscoveryRailContract(item.type)
  const route = evaluateDiscoveryRailRoute(item)
  const decisions = contract.defaultActions.map((action) =>
    getDiscoveryRailActionDecision(item.type, action, role)
  )
  const allowedActions = decisions
    .filter((decision) => decision.allowed)
    .map((decision) => decision.action)
  const blockedActions = decisions.filter((decision) => !decision.allowed)
  const analyticsEvents: DiscoveryAnalyticsEventName[] = unique<DiscoveryAnalyticsEventName>([
    'discovery_rail_impression',
    ...allowedActions.map((action) => ACTION_ANALYTICS[action]),
  ])
  const actionable = route.allowed && allowedActions.length > 0

  return {
    actionable,
    route,
    allowedActions,
    blockedActions,
    analyticsEvents,
    reasonCodes: [...contract.reasonCodes],
    reason: actionable
      ? 'Rail item has an approved route and at least one allowed action.'
      : 'Rail item must render as disabled, fallback, or plain content.',
  }
}

export function getUnsupportedDiscoveryRailFallback(type: string): {
  type: 'unsupported'
  allowedActions: []
  href: '/eat'
  reason: string
} {
  return {
    type: 'unsupported',
    allowedActions: [],
    href: '/eat',
    reason: `Unsupported discovery rail type ${type} falls back to broad /eat discovery.`,
  }
}

export function discoveryHrefHasPrivateIdentifier(href: string): boolean {
  let url: URL
  try {
    url = new URL(href, 'https://chef.test')
  } catch {
    return false
  }

  for (const [key, value] of url.searchParams.entries()) {
    if (PRIVATE_QUERY_KEYS.has(key)) return true
    if (UUID_VALUE_PATTERN.test(value)) return true
  }

  return false
}

function contract(
  type: DiscoveryItemType,
  label: string,
  definition: string,
  lane: HomepageDiscoveryLane,
  input: Pick<
    DiscoveryRailContract,
    'destinationFamilies' | 'filterFacets' | 'defaultActions' | 'reasonCodes'
  > & {
    roleAccess?: Partial<Record<DiscoveryActorRole, readonly DiscoveryRailAction[]>>
    analyticsEvents?: readonly DiscoveryAnalyticsEventName[]
    requiresAuthFor?: readonly DiscoveryRailAction[]
  }
): DiscoveryRailContract {
  const analyticsEvents: DiscoveryAnalyticsEventName[] = input.analyticsEvents
    ? [...input.analyticsEvents]
    : [
        'discovery_rail_impression',
        ...unique(input.defaultActions.map((action) => ACTION_ANALYTICS[action])),
      ]

  return {
    type,
    label,
    definition,
    lane,
    destinationFamilies: input.destinationFamilies,
    filterFacets: input.filterFacets,
    defaultActions: input.defaultActions,
    roleAccess: input.roleAccess ?? {},
    reasonCodes: input.reasonCodes,
    analyticsEvents,
    requiresAuthFor: input.requiresAuthFor ?? ['save', 'lock', 'compare'],
  }
}

function isRoleAuthRequired(role: DiscoveryActorRole, action: DiscoveryRailAction): boolean {
  return ROLE_AUTH_REQUIRED_ACTIONS[role]?.includes(action) ?? false
}

function unique<T>(values: readonly T[]): T[] {
  return Array.from(new Set(values))
}

for (const lane of Object.keys(HOMEPAGE_DISCOVERY_LANE_ITEM_TYPES) as HomepageDiscoveryLane[]) {
  const itemTypes = HOMEPAGE_DISCOVERY_LANE_ITEM_TYPES[lane]
  for (const itemType of itemTypes) {
    const registeredLane = DISCOVERY_RAIL_CONTRACT_REGISTRY[itemType].lane
    if (registeredLane !== lane) {
      throw new Error(
        `${itemType} rail contract is registered to ${registeredLane}, expected ${lane}.`
      )
    }
  }
}
