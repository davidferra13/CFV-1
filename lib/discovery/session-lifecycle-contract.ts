import {
  clearDiscoveryFilterState,
  discoveryFiltersToHref,
  normalizeDiscoveryFilterState,
  toggleDiscoveryRailFilter,
  type DiscoveryFilterState,
  type DiscoveryRailSelection,
} from '@/lib/discovery/filter-state-contract'
import {
  evaluateDiscoveryRailItem,
  evaluateDiscoveryRailRoute,
  getAllowedDiscoveryRailActions,
  type DiscoveryActorRole,
  type DiscoveryRailAction,
  type DiscoveryRailItemDecision,
} from '@/lib/discovery/rail-contract-registry'
import {
  getDiscoveryFeatureDecision,
  type DiscoveryFeatureDecision,
  type DiscoveryFeatureFlagConfig,
  type DiscoveryKillSwitchConfig,
} from '@/lib/discovery/rail-feature-flags'
import type { DiscoveryRailItem } from '@/lib/discovery/homepage-discovery-rail'

export type DiscoverySessionMode = 'uninfluenced' | 'influenced'

export type DiscoverySessionLifecycle = 'active' | 'paused' | 'completed' | 'expired'

export type DiscoverySessionSource = 'homepage' | 'eat' | 'remy' | 'circle' | 'saved_brief'

export type DiscoveryResetScope = 'current_search' | 'fresh_mix' | 'circle_planning'

export type DiscoveryResetSource =
  | 'manual_reset'
  | 'remy_reset'
  | 'fresh_mix'
  | 'circle_planning_reset'

export type DiscoveryDurableStateRefs = {
  savedItemIds: string[]
  pinnedItemIds: string[]
  hiddenItemKeys: string[]
  circleDecisionIds: string[]
}

export type DiscoveryCollaborativeState = {
  circleId?: string
  shortlistItemIds: string[]
  voteIds: string[]
  commentIds: string[]
}

export type DiscoverySession = {
  id: string
  role: DiscoveryActorRole
  source: DiscoverySessionSource
  lifecycle: DiscoverySessionLifecycle
  mode: DiscoverySessionMode
  policyVersion: string
  seed: string
  revision: number
  filters: DiscoveryFilterState
  selectedItems: DiscoveryRailSelection[]
  lockedItemKeys: string[]
  compareItemIds: string[]
  remyHints: string[]
  durableState: DiscoveryDurableStateRefs
  collaborativeState: DiscoveryCollaborativeState
  startedAt: string
  updatedAt: string
  expiresAt: string
}

export type DiscoverySessionInput = {
  id?: string
  role: DiscoveryActorRole
  source?: DiscoverySessionSource
  lifecycle?: DiscoverySessionLifecycle
  mode?: DiscoverySessionMode
  policyVersion?: string
  seed?: string
  filters?: Partial<DiscoveryFilterState>
  selectedItems?: DiscoveryRailSelection[]
  lockedItemKeys?: string[]
  compareItemIds?: string[]
  remyHints?: string[]
  durableState?: Partial<DiscoveryDurableStateRefs>
  collaborativeState?: Partial<DiscoveryCollaborativeState>
  now?: Date
  ttlMinutes?: number
}

export type DiscoverySessionApplyResult = {
  session: DiscoverySession
  decision: DiscoveryRailItemDecision
  analytics: DiscoverySessionAnalyticsEvent | null
}

export type DiscoverySessionAnalyticsEvent = {
  event: string
  sessionId: string
  policyVersion: string
  role: DiscoveryActorRole
  itemType?: string
  itemLabel?: string
  action?: DiscoveryRailAction
  source: DiscoverySessionSource
}

export type DiscoveryResetCommand = {
  scope: DiscoveryResetScope
  source: DiscoveryResetSource
  actorRole: DiscoveryActorRole
  canManageCircle?: boolean
  confirmed?: boolean
}

export type DiscoveryResetResult = {
  session: DiscoverySession
  executed: boolean
  requiresConfirmation: boolean
  reason: string
  clears: string[]
  preserves: string[]
  analytics: DiscoverySessionAnalyticsEvent | null
}

export type DiscoverySessionFeatureContext = {
  flags?: DiscoveryFeatureFlagConfig
  killSwitches?: DiscoveryKillSwitchConfig
  remyAvailable?: boolean
}

export function createDiscoverySession(input: DiscoverySessionInput): DiscoverySession {
  const now = input.now ?? new Date()
  const ttlMinutes = input.ttlMinutes ?? 120
  const startedAt = now.toISOString()
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60_000).toISOString()
  const filters = normalizeDiscoveryFilterState(input.filters)
  const selectedItems = input.selectedItems ?? filters.selectedRailItems
  const seed = input.seed ?? `${input.source ?? 'homepage'}:${now.getTime()}`

  return {
    id: input.id ?? `discovery-session-${now.getTime()}`,
    role: input.role,
    source: input.source ?? 'homepage',
    lifecycle: input.lifecycle ?? 'active',
    mode: input.mode ?? 'uninfluenced',
    policyVersion: input.policyVersion ?? 'discovery-rail-v1',
    seed,
    revision: 0,
    filters,
    selectedItems,
    lockedItemKeys: input.lockedItemKeys ?? [],
    compareItemIds: input.compareItemIds ?? [],
    remyHints: input.remyHints ?? [],
    durableState: {
      savedItemIds: input.durableState?.savedItemIds ?? [],
      pinnedItemIds: input.durableState?.pinnedItemIds ?? [],
      hiddenItemKeys: input.durableState?.hiddenItemKeys ?? [],
      circleDecisionIds: input.durableState?.circleDecisionIds ?? [],
    },
    collaborativeState: {
      ...(input.collaborativeState?.circleId
        ? { circleId: input.collaborativeState.circleId }
        : {}),
      shortlistItemIds: input.collaborativeState?.shortlistItemIds ?? [],
      voteIds: input.collaborativeState?.voteIds ?? [],
      commentIds: input.collaborativeState?.commentIds ?? [],
    },
    startedAt,
    updatedAt: startedAt,
    expiresAt,
  }
}

export function applyDiscoveryRailItemToSession(
  session: DiscoverySession,
  item: Pick<DiscoveryRailItem, 'type' | 'label' | 'href'>
): DiscoverySessionApplyResult {
  const decision = evaluateDiscoveryRailItem(item, session.role)
  if (!decision.actionable || !decision.allowedActions.includes('select')) {
    return { session, decision, analytics: null }
  }

  const filters = toggleDiscoveryRailFilter(session.filters, item)
  const next = touchSession({
    ...session,
    lifecycle: 'active',
    filters,
    selectedItems: filters.selectedRailItems,
    revision: session.revision + 1,
  })

  return {
    session: next,
    decision,
    analytics: {
      event: 'discovery_rail_select',
      sessionId: session.id,
      policyVersion: session.policyVersion,
      role: session.role,
      itemType: item.type,
      itemLabel: item.label,
      action: 'select',
      source: session.source,
    },
  }
}

export function getDiscoverySessionAllowedActions(
  session: Pick<DiscoverySession, 'role'>,
  item: Pick<DiscoveryRailItem, 'type'>
): DiscoveryRailAction[] {
  return getAllowedDiscoveryRailActions(item.type, session.role)
}

export function getDiscoverySessionRouteEligibility(
  session: Pick<DiscoverySession, 'role'>,
  item: Pick<DiscoveryRailItem, 'type' | 'href'>
): DiscoveryRailItemDecision {
  return evaluateDiscoveryRailItem(item, session.role)
}

export function buildDiscoverySessionDestination(
  session: DiscoverySession,
  route = '/eat'
): { href: string; eligible: boolean; reason: string } {
  const href = discoveryFiltersToHref(route, session.filters)
  const routeDecision = evaluateDiscoveryRailRoute({ type: 'occasion', href })
  return {
    href: routeDecision.allowed ? href : '/eat',
    eligible: routeDecision.allowed,
    reason: routeDecision.reason,
  }
}

export function executeDiscoverySessionReset(
  session: DiscoverySession,
  command: DiscoveryResetCommand
): DiscoveryResetResult {
  if (command.scope === 'circle_planning') {
    return executeCirclePlanningReset(session, command)
  }

  if (command.scope === 'fresh_mix') {
    const next = touchSession({
      ...session,
      seed: `${session.seed}:fresh:${session.revision + 1}`,
      revision: session.revision + 1,
    })
    return resetResult(
      next,
      true,
      false,
      'Fresh mix keeps active intent and changes rail seed.',
      ['rail_order', 'temporary_repetition_bias'],
      [
        'filters',
        'selected_items',
        'saved_items',
        'pinned_items',
        'hidden_items',
        'circle_state',
        'durable_memory',
      ],
      command
    )
  }

  const filters = clearDiscoveryFilterState(session.filters)
  const next = touchSession({
    ...session,
    filters,
    selectedItems: [],
    compareItemIds: [],
    remyHints: [],
    seed: `${session.source}:reset:${session.revision + 1}`,
    revision: session.revision + 1,
  })

  return resetResult(
    next,
    true,
    false,
    'Current search reset clears temporary exploration state.',
    [
      'filters',
      'selected_items',
      'comparison_state',
      'remy_hints',
      'radius_override',
      'sort_override',
    ],
    [
      'saved_items',
      'pinned_items',
      'hidden_items',
      'circle_shortlist',
      'circle_votes',
      'circle_comments',
      'durable_memory',
    ],
    command
  )
}

export function getDiscoverySessionFeatureDecision(
  session: Pick<DiscoverySession, 'role'>,
  feature: Parameters<typeof getDiscoveryFeatureDecision>[0],
  context: DiscoverySessionFeatureContext = {}
): DiscoveryFeatureDecision {
  return getDiscoveryFeatureDecision(feature, { role: session.role, ...context })
}

export function expireDiscoverySession(
  session: DiscoverySession,
  now = new Date()
): DiscoverySession {
  if (new Date(session.expiresAt).getTime() > now.getTime()) return session
  return touchSession({ ...session, lifecycle: 'expired' }, now)
}

function executeCirclePlanningReset(
  session: DiscoverySession,
  command: DiscoveryResetCommand
): DiscoveryResetResult {
  const allowed = command.actorRole === 'admin' || command.canManageCircle === true
  if (!allowed) {
    return resetResult(
      session,
      false,
      false,
      'Only admins or circle managers can reset shared planning state.',
      [],
      ['circle_shortlist', 'circle_votes', 'circle_comments', 'durable_memory'],
      command
    )
  }

  if (!command.confirmed) {
    return resetResult(
      session,
      false,
      true,
      'Circle planning reset requires confirmation.',
      ['circle_shortlist', 'circle_votes', 'circle_comments'],
      [
        'saved_items',
        'pinned_items',
        'hidden_items',
        'historical_circle_decisions',
        'durable_memory',
      ],
      command
    )
  }

  const next = touchSession({
    ...session,
    collaborativeState: {
      ...(session.collaborativeState.circleId
        ? { circleId: session.collaborativeState.circleId }
        : {}),
      shortlistItemIds: [],
      voteIds: [],
      commentIds: [],
    },
    revision: session.revision + 1,
  })

  return resetResult(
    next,
    true,
    false,
    'Circle planning reset cleared active shared planning state.',
    ['circle_shortlist', 'circle_votes', 'circle_comments'],
    [
      'saved_items',
      'pinned_items',
      'hidden_items',
      'historical_circle_decisions',
      'durable_memory',
    ],
    command
  )
}

function resetResult(
  session: DiscoverySession,
  executed: boolean,
  requiresConfirmation: boolean,
  reason: string,
  clears: string[],
  preserves: string[],
  command: DiscoveryResetCommand
): DiscoveryResetResult {
  return {
    session,
    executed,
    requiresConfirmation,
    reason,
    clears,
    preserves,
    analytics: executed
      ? {
          event: command.source,
          sessionId: session.id,
          policyVersion: session.policyVersion,
          role: session.role,
          source: session.source,
        }
      : null,
  }
}

function touchSession(session: DiscoverySession, now = new Date()): DiscoverySession {
  return {
    ...session,
    updatedAt: now.toISOString(),
  }
}
