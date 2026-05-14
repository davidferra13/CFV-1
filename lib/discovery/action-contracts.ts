import type { DiscoveryAction, DiscoveryItemType } from '@/lib/discovery/persistent-profile'
import type { ConsumerDiscoveryFilters } from '@/lib/public-consumer/discovery-actions'

export type DiscoveryNextActionId =
  | 'apply_filters'
  | 'compare'
  | 'save'
  | 'share_to_circle'
  | 'ask_remy'
  | 'find_restaurants'
  | 'find_chefs'
  | 'build_plan'
  | 'share_link'
  | 'reset_current_search'
  | 'fresh_mix'

export type DiscoveryActionSurface = 'homepage' | 'eat' | 'circle' | 'remy' | 'saved'

export type DiscoverySelectedItem = {
  id: string
  type: DiscoveryItemType | 'chef' | 'restaurant' | 'menu' | 'recipe' | 'manual_pick'
  label: string
  href?: string | null
}

export type DiscoveryActionContext = {
  surface: DiscoveryActionSurface
  selectedItems?: readonly DiscoverySelectedItem[]
  shortlistCount?: number
  compareCandidateCount?: number
  filters?: ConsumerDiscoveryFilters
  authenticated?: boolean
  remyAvailable?: boolean
  circleId?: string | null
  canCreateCircleShare?: boolean
  hasResults?: boolean
}

export type DiscoveryActionEligibility = {
  eligible: boolean
  reason: string
  requiresAuth?: boolean
  requiresSelection?: boolean
}

export type DiscoveryNextAction = {
  id: DiscoveryNextActionId
  label: string
  analyticsName: string
  eligibility: DiscoveryActionEligibility
}

export type ActiveFilterSummaryToken = {
  key: string
  label: string
  value: string
  source: 'manual_filter' | 'remy_tuning' | 'session_state'
  removable: boolean
}

export type ActiveFilterSummaryInput = {
  filters?: ConsumerDiscoveryFilters
  radiusMiles?: number | null
  sort?: string | null
  remyTuningEnabled?: boolean
  selectedCount?: number
}

export type OneTapFeedbackIntent =
  | 'not_for_me'
  | 'too_far'
  | 'too_expensive'
  | 'already_tried'
  | 'looks_good'
  | 'show_more_like_this'

export type OneTapFeedbackOption = {
  intent: OneTapFeedbackIntent
  label: string
  profileAction: DiscoveryAction | null
  effect:
    | 'hide_candidate'
    | 'lower_distance_fit'
    | 'lower_budget_fit'
    | 'mark_seen'
    | 'raise_affinity'
    | 'expand_similar'
  undoable: boolean
}

const NEXT_ACTION_LABELS: Record<DiscoveryNextActionId, string> = {
  apply_filters: 'Apply filters',
  compare: 'Compare',
  save: 'Save',
  share_to_circle: 'Share to circle',
  ask_remy: 'Ask Remy',
  find_restaurants: 'Find restaurants',
  find_chefs: 'Find chefs',
  build_plan: 'Build a plan',
  share_link: 'Share link',
  reset_current_search: 'Reset search',
  fresh_mix: 'Fresh mix',
}

export function getDiscoveryActionEligibility(
  actionId: DiscoveryNextActionId,
  context: DiscoveryActionContext
): DiscoveryActionEligibility {
  const selectedCount = context.selectedItems?.length ?? 0
  const compareCount = context.compareCandidateCount ?? selectedCount
  const hasFilters = Object.keys(context.filters ?? {}).length > 0
  const hasWork = selectedCount > 0 || (context.shortlistCount ?? 0) > 0 || hasFilters

  switch (actionId) {
    case 'apply_filters':
      return selectedCount > 0 || hasFilters
        ? eligible('Ready to apply the visible discovery state.')
        : ineligible('Select a rail item or set a filter first.', { requiresSelection: true })
    case 'compare':
      return compareCount >= 2
        ? eligible('At least two candidates can be compared.')
        : ineligible('Comparison needs at least two candidates.', { requiresSelection: true })
    case 'save':
      if (selectedCount === 0)
        return ineligible('Select an item before saving.', { requiresSelection: true })
      return context.authenticated
        ? eligible('Selected items can be saved.')
        : ineligible('Sign in is required to save durable items.', { requiresAuth: true })
    case 'share_to_circle':
      if (selectedCount === 0)
        return ineligible('Select an item before sharing.', { requiresSelection: true })
      return context.circleId || context.canCreateCircleShare
        ? eligible('Selected items can be shared to a circle.')
        : ineligible('A circle context or share target is required.')
    case 'ask_remy':
      return context.remyAvailable
        ? eligible('Remy can explain or repair this discovery state.')
        : ineligible('Remy is unavailable; use visible controls instead.')
    case 'find_restaurants':
      return context.filters?.fulfillment === 'private_chef'
        ? eligible('Restaurant search can broaden a private-chef-only state.')
        : eligible('Restaurant discovery is available from this state.')
    case 'find_chefs':
      return context.filters?.fulfillment === 'restaurant'
        ? eligible('Chef search can broaden a restaurant-only state.')
        : eligible('Chef discovery is available from this state.')
    case 'build_plan':
      return selectedCount > 0 || (context.shortlistCount ?? 0) > 0
        ? eligible('A selected or shortlisted item can become a plan.')
        : ineligible('Pick or shortlist an item before building a plan.', {
            requiresSelection: true,
          })
    case 'share_link':
      return hasWork
        ? eligible('This discovery state can be encoded into a share link.')
        : ineligible('There is no discovery state to share yet.')
    case 'reset_current_search':
      return hasWork
        ? eligible('Temporary discovery state can be cleared.')
        : ineligible('There is no temporary discovery state to reset.')
    case 'fresh_mix':
      return eligible('The current intent can be kept while refreshing the mix.')
  }
}

export function getAvailableDiscoveryNextActions(
  context: DiscoveryActionContext
): DiscoveryNextAction[] {
  const preferred: DiscoveryNextActionId[] = [
    'apply_filters',
    'compare',
    'save',
    'share_to_circle',
    'ask_remy',
    'find_restaurants',
    'find_chefs',
    'build_plan',
    'share_link',
    'reset_current_search',
    'fresh_mix',
  ]

  return preferred
    .map((id) => ({
      id,
      label: NEXT_ACTION_LABELS[id],
      analyticsName: `discovery_${id}`,
      eligibility: getDiscoveryActionEligibility(id, context),
    }))
    .filter((action) => action.eligibility.eligible)
}

export function buildActiveFilterSummaryTokens(
  input: ActiveFilterSummaryInput
): ActiveFilterSummaryToken[] {
  const filters = input.filters ?? {}
  const tokens: ActiveFilterSummaryToken[] = []

  pushToken(tokens, 'craving', 'Craving', filters.craving)
  pushToken(tokens, 'intent', 'Intent', filters.intent?.replace(/_/g, ' '))
  pushToken(tokens, 'fulfillment', 'Mode', filters.fulfillment?.replace(/_/g, ' '))
  pushToken(tokens, 'location', 'Location', filters.location)
  if (input.radiusMiles && input.radiusMiles > 0) {
    pushToken(tokens, 'radius', 'Radius', `${input.radiusMiles} miles`)
  }
  pushToken(tokens, 'budget', 'Budget', filters.budget)
  pushToken(tokens, 'dietary', 'Dietary', filters.dietary)
  pushToken(tokens, 'dateWindow', 'When', filters.dateWindow)
  if (filters.partySize && filters.partySize > 0) {
    pushToken(tokens, 'partySize', 'Party', `${filters.partySize} people`)
  }
  pushToken(tokens, 'eventStyle', 'Vibe', filters.eventStyle)
  pushToken(tokens, 'sort', 'Sort', input.sort ?? undefined, 'session_state')
  if (input.remyTuningEnabled) {
    pushToken(tokens, 'remy', 'Remy', 'on', 'remy_tuning')
  }
  if (input.selectedCount && input.selectedCount > 0) {
    pushToken(tokens, 'selected', 'Selected', String(input.selectedCount), 'session_state')
  }

  return tokens
}

export function formatActiveFilterSummary(input: ActiveFilterSummaryInput): string {
  const tokens = buildActiveFilterSummaryTokens(input)
  return tokens.map((token) => token.value).join(' · ')
}

export function getOneTapFeedbackOptions(): OneTapFeedbackOption[] {
  return [
    {
      intent: 'not_for_me',
      label: 'Not for me',
      profileAction: 'hide',
      effect: 'hide_candidate',
      undoable: true,
    },
    {
      intent: 'too_far',
      label: 'Too far',
      profileAction: null,
      effect: 'lower_distance_fit',
      undoable: true,
    },
    {
      intent: 'too_expensive',
      label: 'Too expensive',
      profileAction: null,
      effect: 'lower_budget_fit',
      undoable: true,
    },
    {
      intent: 'already_tried',
      label: 'Already tried',
      profileAction: 'dismiss',
      effect: 'mark_seen',
      undoable: true,
    },
    {
      intent: 'looks_good',
      label: 'Looks good',
      profileAction: 'love',
      effect: 'raise_affinity',
      undoable: true,
    },
    {
      intent: 'show_more_like_this',
      label: 'Show more like this',
      profileAction: 'pin',
      effect: 'expand_similar',
      undoable: true,
    },
  ]
}

function eligible(reason: string): DiscoveryActionEligibility {
  return { eligible: true, reason }
}

function ineligible(
  reason: string,
  flags: Pick<DiscoveryActionEligibility, 'requiresAuth' | 'requiresSelection'> = {}
): DiscoveryActionEligibility {
  return { eligible: false, reason, ...flags }
}

function pushToken(
  tokens: ActiveFilterSummaryToken[],
  key: string,
  label: string,
  value: string | undefined,
  source: ActiveFilterSummaryToken['source'] = 'manual_filter'
) {
  const normalized = value?.trim()
  if (!normalized) return
  tokens.push({ key, label, value: normalized, source, removable: source !== 'remy_tuning' })
}
