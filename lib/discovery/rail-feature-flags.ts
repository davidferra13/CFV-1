import type { DiscoveryActorRole } from '@/lib/discovery/rail-contract-registry'

export type DiscoveryFeatureKey =
  | 'clear_all_reset'
  | 'active_filter_summary'
  | 'smart_empty_results_repair'
  | 'recent_searches'
  | 'saved_locations'
  | 'one_tap_feedback'
  | 'data_freshness_dashboard'
  | 'remy_tuning'
  | 'compare_mode'
  | 'shortlist_drawer'
  | 'discovery_session'
  | 'universal_filter_state'

export type DiscoveryFeatureFlagConfig = Partial<Record<DiscoveryFeatureKey, boolean>>

export type DiscoveryKillSwitchConfig = Partial<Record<DiscoveryFeatureKey | 'all', boolean>>

export type DiscoveryFeatureDecisionContext = {
  role: DiscoveryActorRole
  flags?: DiscoveryFeatureFlagConfig
  killSwitches?: DiscoveryKillSwitchConfig
  remyAvailable?: boolean
}

export type DiscoveryFeatureDecision = {
  feature: DiscoveryFeatureKey
  enabled: boolean
  visible: boolean
  reason: string
  source: 'default' | 'flag' | 'kill_switch' | 'dependency' | 'role'
}

type DiscoveryFeatureDefinition = {
  feature: DiscoveryFeatureKey
  defaultEnabled: boolean
  roles: readonly DiscoveryActorRole[]
  requiresRemy?: boolean
  fallback: string
}

const ALL_ROLES: readonly DiscoveryActorRole[] = ['public', 'guest', 'client', 'chef', 'admin']
const CLIENT_ROLES: readonly DiscoveryActorRole[] = ['guest', 'client', 'admin']

export const DISCOVERY_FEATURE_DEFINITIONS: Record<
  DiscoveryFeatureKey,
  DiscoveryFeatureDefinition
> = {
  clear_all_reset: {
    feature: 'clear_all_reset',
    defaultEnabled: true,
    roles: ALL_ROLES,
    fallback: 'Keep broad /eat navigation and ignore temporary exploration state.',
  },
  active_filter_summary: {
    feature: 'active_filter_summary',
    defaultEnabled: true,
    roles: ALL_ROLES,
    fallback: 'Hide the compact summary while preserving URL filter state.',
  },
  smart_empty_results_repair: {
    feature: 'smart_empty_results_repair',
    defaultEnabled: true,
    roles: ALL_ROLES,
    fallback: 'Show static recovery actions from the existing consumer discovery model.',
  },
  recent_searches: {
    feature: 'recent_searches',
    defaultEnabled: false,
    roles: CLIENT_ROLES,
    fallback: 'Do not persist or render recent searches.',
  },
  saved_locations: {
    feature: 'saved_locations',
    defaultEnabled: false,
    roles: CLIENT_ROLES,
    fallback: 'Use explicit URL/location input only.',
  },
  one_tap_feedback: {
    feature: 'one_tap_feedback',
    defaultEnabled: false,
    roles: ALL_ROLES,
    fallback: 'Use existing click/save/hide actions only.',
  },
  data_freshness_dashboard: {
    feature: 'data_freshness_dashboard',
    defaultEnabled: false,
    roles: ['admin'],
    fallback: 'Suppress operational freshness diagnostics from consumer surfaces.',
  },
  remy_tuning: {
    feature: 'remy_tuning',
    defaultEnabled: true,
    roles: ALL_ROLES,
    requiresRemy: true,
    fallback: 'Keep manual filters and disable Remy-derived tuning.',
  },
  compare_mode: {
    feature: 'compare_mode',
    defaultEnabled: true,
    roles: CLIENT_ROLES,
    fallback: 'Route users to individual chef or listing detail pages.',
  },
  shortlist_drawer: {
    feature: 'shortlist_drawer',
    defaultEnabled: true,
    roles: CLIENT_ROLES,
    fallback: 'Keep saved items durable but hide the planning drawer.',
  },
  discovery_session: {
    feature: 'discovery_session',
    defaultEnabled: true,
    roles: ALL_ROLES,
    fallback: 'Use stateless URL filters only.',
  },
  universal_filter_state: {
    feature: 'universal_filter_state',
    defaultEnabled: true,
    roles: ALL_ROLES,
    fallback: 'Use route-local query params without session projection.',
  },
}

export function getDiscoveryFeatureDecision(
  feature: DiscoveryFeatureKey,
  context: DiscoveryFeatureDecisionContext
): DiscoveryFeatureDecision {
  const definition = DISCOVERY_FEATURE_DEFINITIONS[feature]

  if (context.killSwitches?.all || context.killSwitches?.[feature]) {
    return {
      feature,
      enabled: false,
      visible: false,
      reason: `${feature} is disabled by discovery kill switch. ${definition.fallback}`,
      source: 'kill_switch',
    }
  }

  if (!definition.roles.includes(context.role)) {
    return {
      feature,
      enabled: false,
      visible: false,
      reason: `${feature} is not visible to ${context.role}. ${definition.fallback}`,
      source: 'role',
    }
  }

  if (definition.requiresRemy && context.remyAvailable === false) {
    return {
      feature,
      enabled: false,
      visible: false,
      reason: `${feature} requires Remy availability. ${definition.fallback}`,
      source: 'dependency',
    }
  }

  const flagValue = context.flags?.[feature]
  const enabled = flagValue ?? definition.defaultEnabled

  return {
    feature,
    enabled,
    visible: enabled,
    reason: enabled
      ? `${feature} is enabled.`
      : `${feature} is disabled by feature flag. ${definition.fallback}`,
    source: flagValue === undefined ? 'default' : 'flag',
  }
}

export function getDiscoveryFeatureDecisions(
  context: DiscoveryFeatureDecisionContext
): Record<DiscoveryFeatureKey, DiscoveryFeatureDecision> {
  return Object.keys(DISCOVERY_FEATURE_DEFINITIONS).reduce(
    (decisions, feature) => {
      const key = feature as DiscoveryFeatureKey
      decisions[key] = getDiscoveryFeatureDecision(key, context)
      return decisions
    },
    {} as Record<DiscoveryFeatureKey, DiscoveryFeatureDecision>
  )
}

export function isDiscoveryFeatureEnabled(
  feature: DiscoveryFeatureKey,
  context: DiscoveryFeatureDecisionContext
): boolean {
  return getDiscoveryFeatureDecision(feature, context).enabled
}
