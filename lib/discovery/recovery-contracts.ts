import type {
  ConsumerDiscoveryFilters,
  FulfillmentMode,
} from '@/lib/public-consumer/discovery-actions'

export type DiscoveryResetScope = 'current_search' | 'fresh_mix' | 'circle_planning'
export type DiscoveryResetSource =
  | 'manual_reset'
  | 'remy_reset'
  | 'fresh_mix'
  | 'circle_planning_reset'
export type DiscoveryCircleRole = 'host' | 'admin' | 'member' | 'guest' | 'none'

export type DiscoveryExplorationState = {
  filters?: ConsumerDiscoveryFilters
  selectedIds?: readonly string[]
  compareCandidateIds?: readonly string[]
  radiusMiles?: number | null
  sort?: string | null
  remyTuning?: Record<string, unknown> | null
  sessionHints?: readonly string[]
  freshMixSeed?: string | null
  durable?: {
    savedItemIds?: readonly string[]
    pinnedItemIds?: readonly string[]
    hiddenItemIds?: readonly string[]
    circleShortlistIds?: readonly string[]
    voteIds?: readonly string[]
    commentIds?: readonly string[]
    historicalDecisionIds?: readonly string[]
  }
}

export type DiscoveryResetCommand = {
  scope: DiscoveryResetScope
  source: DiscoveryResetSource
  requestedByRole?: DiscoveryCircleRole
  confirmed?: boolean
}

export type DiscoveryResetPlan = {
  scope: DiscoveryResetScope
  eligible: boolean
  requiresConfirmation: boolean
  clears: string[]
  preserves: string[]
  analyticsEvent: DiscoveryResetSource
  reason: string
}

export type EmptyResultsRepairActionId =
  | 'expand_radius'
  | 'remove_filter'
  | 'switch_to_restaurants'
  | 'switch_to_chefs'
  | 'show_similar_cuisines'
  | 'ask_remy'
  | 'reset_current_search'

export type EmptyResultsRepairAction = {
  id: EmptyResultsRepairActionId
  label: string
  reason: string
  nextFilters?: ConsumerDiscoveryFilters
}

export function buildDiscoveryResetPlan(
  command: DiscoveryResetCommand,
  state: DiscoveryExplorationState = {}
): DiscoveryResetPlan {
  const durablePreserves = [
    'saved items',
    'pinned items',
    'explicit hides',
    'personal memory',
    'circle shortlist',
    'votes',
    'comments',
    'historical decisions',
  ]

  if (command.scope === 'fresh_mix') {
    return {
      scope: command.scope,
      eligible: true,
      requiresConfirmation: false,
      clears: ['rail ordering', 'freshness cooldown seed'],
      preserves: ['current intent', 'filters', ...durablePreserves],
      analyticsEvent: 'fresh_mix',
      reason: 'Refreshes eligible rail composition without clearing intent.',
    }
  }

  if (command.scope === 'circle_planning') {
    const role = command.requestedByRole ?? 'none'
    const authorized = role === 'host' || role === 'admin'
    return {
      scope: command.scope,
      eligible: authorized && command.confirmed === true,
      requiresConfirmation: true,
      clears: ['active circle shortlist', 'active circle votes', 'active circle comparison state'],
      preserves: ['historical decisions', 'personal saved items', 'personal memory'],
      analyticsEvent: 'circle_planning_reset',
      reason: authorized
        ? 'Circle planning reset requires confirmation before collaborative state is cleared.'
        : 'Only a host or admin can reset collaborative planning state.',
    }
  }

  const clears = [
    'chat-derived filters',
    'selected chips',
    'radius override',
    'sort override',
    'comparison state',
    'transient rail session hints',
  ]
  if (state.remyTuning) clears.push('Remy tuning')

  return {
    scope: command.scope,
    eligible: true,
    requiresConfirmation: false,
    clears,
    preserves: durablePreserves,
    analyticsEvent: command.source === 'remy_reset' ? 'remy_reset' : 'manual_reset',
    reason:
      'Clears temporary exploration state while preserving durable user and circle artifacts.',
  }
}

export function applyDiscoveryResetPlan(
  state: DiscoveryExplorationState,
  plan: DiscoveryResetPlan
): DiscoveryExplorationState {
  if (!plan.eligible) return state
  if (plan.scope === 'fresh_mix') {
    return { ...state, freshMixSeed: nextSeed(state.freshMixSeed) }
  }
  if (plan.scope === 'circle_planning') {
    return {
      ...state,
      selectedIds: [],
      compareCandidateIds: [],
      durable: {
        ...state.durable,
        circleShortlistIds: [],
        voteIds: [],
      },
    }
  }
  return {
    durable: state.durable,
    filters: {},
    selectedIds: [],
    compareCandidateIds: [],
    radiusMiles: null,
    sort: null,
    remyTuning: null,
    sessionHints: [],
    freshMixSeed: state.freshMixSeed ?? null,
  }
}

export function buildSmartEmptyResultsRepairActions(input: {
  filters?: ConsumerDiscoveryFilters
  radiusMiles?: number | null
  remyAvailable?: boolean
  similarCuisines?: readonly string[]
}): EmptyResultsRepairAction[] {
  const filters = input.filters ?? {}
  const actions: EmptyResultsRepairAction[] = []

  if (input.radiusMiles && input.radiusMiles < 50) {
    actions.push({
      id: 'expand_radius',
      label: `Expand to ${Math.min(50, input.radiusMiles + 10)} miles`,
      reason: 'A wider radius can recover sparse local supply.',
      nextFilters: { ...filters },
    })
  }

  const removable = firstRemovableFilter(filters)
  if (removable) {
    const nextFilters = { ...filters }
    delete (nextFilters as Record<string, unknown>)[removable]
    actions.push({
      id: 'remove_filter',
      label: `Remove ${removable.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
      reason: 'Removing one constraint keeps the search understandable.',
      nextFilters,
    })
  }

  const switched = switchFulfillment(filters.fulfillment)
  if (switched) actions.push(switched)

  if (input.similarCuisines?.length) {
    actions.push({
      id: 'show_similar_cuisines',
      label: `Try ${input.similarCuisines.slice(0, 2).join(' or ')}`,
      reason: 'Similar cuisines can preserve intent while widening matches.',
      nextFilters: { ...filters, craving: input.similarCuisines[0] },
    })
  }

  if (input.remyAvailable) {
    actions.push({
      id: 'ask_remy',
      label: 'Ask Remy to repair search',
      reason: 'Remy can suggest a narrower reset path without losing context.',
    })
  }

  actions.push({
    id: 'reset_current_search',
    label: 'Reset current search',
    reason: 'Always provide an escape hatch from over-filtering.',
    nextFilters: {},
  })

  return dedupe(actions).slice(0, 5)
}

function firstRemovableFilter(
  filters: ConsumerDiscoveryFilters
): keyof ConsumerDiscoveryFilters | null {
  const priority: Array<keyof ConsumerDiscoveryFilters> = [
    'dietary',
    'budget',
    'craving',
    'eventStyle',
    'dateWindow',
    'location',
  ]
  return priority.find((key) => filters[key] !== undefined && filters[key] !== null) ?? null
}

function switchFulfillment(
  fulfillment: FulfillmentMode | undefined
): EmptyResultsRepairAction | null {
  if (fulfillment === 'private_chef') {
    return {
      id: 'switch_to_restaurants',
      label: 'Include restaurants',
      reason: 'Restaurant results can recover a chef-only dead end.',
      nextFilters: { fulfillment: 'restaurant' },
    }
  }
  if (fulfillment === 'restaurant') {
    return {
      id: 'switch_to_chefs',
      label: 'Include chefs',
      reason: 'Chef results can recover a restaurant-only dead end.',
      nextFilters: { fulfillment: 'private_chef' },
    }
  }
  return null
}

function nextSeed(current: string | null | undefined): string {
  const value = Number(current?.replace('mix-', '') ?? 0)
  return `mix-${Number.isFinite(value) ? value + 1 : 1}`
}

function dedupe(actions: EmptyResultsRepairAction[]): EmptyResultsRepairAction[] {
  const seen = new Set<EmptyResultsRepairActionId>()
  return actions.filter((action) => {
    if (seen.has(action.id)) return false
    seen.add(action.id)
    return true
  })
}
