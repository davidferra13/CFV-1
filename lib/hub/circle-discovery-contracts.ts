import type { DiscoverySelectedItem } from '@/lib/discovery/action-contracts'
import type { DiscoveryFilterState } from '@/lib/discovery/filter-state-contract'

export type CircleDiscoveryRole =
  | 'owner'
  | 'admin'
  | 'host'
  | 'member'
  | 'guest'
  | 'viewer'
  | 'non_member'

export type CircleDiscoveryMode = 'personal' | 'circle' | 'remy_assisted'

export type CircleDiscoveryActionType =
  | 'view_session'
  | 'like_candidate'
  | 'veto_candidate'
  | 'shortlist_candidate'
  | 'apply_state'
  | 'finalize_decision'
  | 'invite_member'

export type CircleDiscoverySessionIntent = 'tonight' | 'this_week' | 'event' | 'open'

export type CircleDiscoveryAccess = {
  allowed: boolean
  role: CircleDiscoveryRole
  canViewSession: boolean
  canContribute: boolean
  canApplyToCircle: boolean
  canFinalizeDecision: boolean
  canInvite: boolean
  visibility: 'none' | 'public_summary' | 'circle_activity'
  reason: string
}

export type CircleDiscoveryModeDecision = {
  mode: CircleDiscoveryMode
  allowed: boolean
  requiresConfirmation: boolean
  privacyBoundary: 'personal_only' | 'circle_shared' | 'remy_assisted' | 'blocked'
  label: string
  reason: string
}

export type CircleDiscoveryApplyTargetId =
  | 'restaurants'
  | 'chefs'
  | 'menus'
  | 'this_circle'
  | 'remy_tuning'
  | 'save_for_later'

export type CircleDiscoveryApplyTarget = {
  id: CircleDiscoveryApplyTargetId
  label: string
  eligible: boolean
  reason: string
  writesSharedState: boolean
  requiresConfirmation: boolean
}

export type CircleDiscoveryMemberAction = {
  actorId: string
  actorRole: CircleDiscoveryRole
  sessionId: string
  actionType: CircleDiscoveryActionType
  candidateId?: string
  createdAt: string
  visibleToCircle: boolean
}

export type CircleDiscoveryActionDecision =
  | {
      allowed: true
      action: CircleDiscoveryMemberAction
      reason: string
    }
  | {
      allowed: false
      action: null
      reason: string
    }

export type CircleDiscoveryAppliedState = {
  circleId: string
  sessionId: string
  actorId: string
  sourceMode: CircleDiscoveryMode
  filters: Partial<DiscoveryFilterState>
  selectedItems: Array<Pick<DiscoverySelectedItem, 'id' | 'type' | 'label' | 'href'>>
  sharedAt: string
  privacyBoundary: 'circle_shared'
  redactedPrivateFieldCount: number
}

export type CircleDiscoveryApplyDecision =
  | {
      allowed: true
      appliedState: CircleDiscoveryAppliedState
      reason: string
    }
  | {
      allowed: false
      appliedState: null
      reason: string
    }

const CIRCLE_WRITE_ROLES = new Set<CircleDiscoveryRole>(['owner', 'admin', 'host', 'member'])
const CIRCLE_MANAGE_ROLES = new Set<CircleDiscoveryRole>(['owner', 'admin', 'host'])
const READONLY_ROLES = new Set<CircleDiscoveryRole>(['guest', 'viewer'])
const PRIVATE_FILTER_KEYS = new Set<string>(['selectedRailItems', 'remyTuning'])

export function resolveCircleDiscoveryAccess(input: {
  actorRole?: CircleDiscoveryRole | null
  hasValidShareToken?: boolean
  hasValidProfileToken?: boolean
}): CircleDiscoveryAccess {
  const role = input.actorRole ?? 'non_member'
  const hasTokenRead = Boolean(input.hasValidShareToken || input.hasValidProfileToken)

  if (CIRCLE_MANAGE_ROLES.has(role)) {
    return {
      allowed: true,
      role,
      canViewSession: true,
      canContribute: true,
      canApplyToCircle: true,
      canFinalizeDecision: true,
      canInvite: true,
      visibility: 'circle_activity',
      reason: 'Circle hosts and admins can manage shared discovery.',
    }
  }

  if (role === 'member') {
    return {
      allowed: true,
      role,
      canViewSession: true,
      canContribute: true,
      canApplyToCircle: true,
      canFinalizeDecision: false,
      canInvite: false,
      visibility: 'circle_activity',
      reason: 'Circle members can contribute shared discovery signals.',
    }
  }

  if (READONLY_ROLES.has(role) || hasTokenRead) {
    return {
      allowed: true,
      role,
      canViewSession: true,
      canContribute: false,
      canApplyToCircle: false,
      canFinalizeDecision: false,
      canInvite: false,
      visibility: 'public_summary',
      reason: 'Read-only access can view the summary without writing circle state.',
    }
  }

  return {
    allowed: false,
    role,
    canViewSession: false,
    canContribute: false,
    canApplyToCircle: false,
    canFinalizeDecision: false,
    canInvite: false,
    visibility: 'none',
    reason: 'Circle discovery requires membership or a valid read token.',
  }
}

export function decideCircleDiscoveryMode(input: {
  requestedMode: CircleDiscoveryMode
  currentMode?: CircleDiscoveryMode
  actorRole?: CircleDiscoveryRole | null
  circleId?: string | null
  remyAvailable?: boolean
  explicitConfirmation?: boolean
}): CircleDiscoveryModeDecision {
  const role = input.actorRole ?? 'non_member'

  if (input.requestedMode === 'personal') {
    return {
      mode: 'personal',
      allowed: true,
      requiresConfirmation: false,
      privacyBoundary: 'personal_only',
      label: 'Personal discovery',
      reason: 'Personal discovery does not write shared circle state.',
    }
  }

  if (input.requestedMode === 'remy_assisted') {
    if (!input.remyAvailable) {
      return blockedMode('remy_assisted', 'Remy-assisted discovery is unavailable.')
    }
    return {
      mode: 'remy_assisted',
      allowed: true,
      requiresConfirmation: input.currentMode === 'personal' && !input.explicitConfirmation,
      privacyBoundary: 'remy_assisted',
      label: 'Remy-assisted discovery',
      reason: 'Remy can tune the session without exposing private member details.',
    }
  }

  const access = resolveCircleDiscoveryAccess({ actorRole: role })
  if (!input.circleId || !access.canApplyToCircle) {
    return blockedMode('circle', 'Circle discovery requires an active writable circle membership.')
  }

  return {
    mode: 'circle',
    allowed: true,
    requiresConfirmation: input.currentMode === 'personal' && !input.explicitConfirmation,
    privacyBoundary: 'circle_shared',
    label: 'Circle discovery',
    reason: 'Circle discovery writes actions into shared dinner state.',
  }
}

export function buildCircleDiscoveryApplyTargets(input: {
  selectedItems?: readonly DiscoverySelectedItem[]
  actorRole?: CircleDiscoveryRole | null
  circleId?: string | null
  authenticated?: boolean
  remyAvailable?: boolean
}): CircleDiscoveryApplyTarget[] {
  const selected = input.selectedItems ?? []
  const types = new Set(selected.map((item) => item.type))
  const hasSelection = selected.length > 0
  const access = resolveCircleDiscoveryAccess({ actorRole: input.actorRole })

  return [
    target(
      'restaurants',
      'Restaurants',
      hasSelection && hasAnyType(types, ['restaurant', 'manual_pick']),
      'Select a restaurant candidate first.',
      false
    ),
    target(
      'chefs',
      'Chefs',
      hasSelection && hasAnyType(types, ['chef']),
      'Select a chef candidate first.',
      false
    ),
    target(
      'menus',
      'Menus',
      hasSelection && hasAnyType(types, ['menu', 'recipe']),
      'Select a menu or recipe candidate first.',
      false
    ),
    target(
      'this_circle',
      'This circle',
      hasSelection && Boolean(input.circleId) && access.canApplyToCircle,
      'A writable circle membership and selected item are required.',
      true,
      true
    ),
    target(
      'remy_tuning',
      'Remy tuning',
      Boolean(input.remyAvailable),
      'Remy tuning is unavailable.',
      false,
      true
    ),
    target(
      'save_for_later',
      'Save for later',
      hasSelection && Boolean(input.authenticated),
      'Sign in and select an item before saving.',
      false
    ),
  ]
}

export function createCircleDiscoveryMemberAction(input: {
  actorId: string
  actorRole?: CircleDiscoveryRole | null
  sessionId: string
  actionType: CircleDiscoveryActionType
  candidateId?: string
  now?: string
}): CircleDiscoveryActionDecision {
  const role = input.actorRole ?? 'non_member'
  const access = resolveCircleDiscoveryAccess({ actorRole: role })

  if (!canPerformAction(input.actionType, access)) {
    return {
      allowed: false,
      action: null,
      reason: `Role ${role} cannot perform ${input.actionType}.`,
    }
  }

  return {
    allowed: true,
    action: {
      actorId: input.actorId,
      actorRole: role,
      sessionId: input.sessionId,
      actionType: input.actionType,
      candidateId: input.candidateId,
      createdAt: input.now ?? new Date().toISOString(),
      visibleToCircle: input.actionType !== 'view_session',
    },
    reason: 'Action is allowed for this circle role.',
  }
}

export function applyDiscoveryStateToCircle(input: {
  circleId: string
  sessionId: string
  actorId: string
  actorRole?: CircleDiscoveryRole | null
  sourceMode: CircleDiscoveryMode
  filters?: Partial<DiscoveryFilterState>
  selectedItems?: readonly DiscoverySelectedItem[]
  explicitConfirmation?: boolean
  now?: string
}): CircleDiscoveryApplyDecision {
  const mode = decideCircleDiscoveryMode({
    requestedMode: 'circle',
    currentMode: input.sourceMode,
    actorRole: input.actorRole,
    circleId: input.circleId,
    explicitConfirmation: input.explicitConfirmation,
  })

  if (!mode.allowed || mode.requiresConfirmation) {
    return {
      allowed: false,
      appliedState: null,
      reason: mode.requiresConfirmation
        ? 'Shared circle apply requires confirmation.'
        : mode.reason,
    }
  }

  const redacted = redactDiscoveryFilters(input.filters ?? {})

  return {
    allowed: true,
    appliedState: {
      circleId: input.circleId,
      sessionId: input.sessionId,
      actorId: input.actorId,
      sourceMode: input.sourceMode,
      filters: redacted.filters,
      selectedItems: (input.selectedItems ?? []).map((item) => ({
        id: item.id,
        type: item.type,
        label: item.label,
        href: item.href ?? null,
      })),
      sharedAt: input.now ?? new Date().toISOString(),
      privacyBoundary: 'circle_shared',
      redactedPrivateFieldCount: redacted.redactedPrivateFieldCount,
    },
    reason: 'Discovery state was sanitized for circle sharing.',
  }
}

function canPerformAction(
  actionType: CircleDiscoveryActionType,
  access: CircleDiscoveryAccess
): boolean {
  if (actionType === 'view_session') return access.canViewSession
  if (actionType === 'finalize_decision') return access.canFinalizeDecision
  if (actionType === 'invite_member') return access.canInvite
  if (actionType === 'apply_state') return access.canApplyToCircle
  return access.canContribute
}

function redactDiscoveryFilters(filters: Partial<DiscoveryFilterState>): {
  filters: Partial<DiscoveryFilterState>
  redactedPrivateFieldCount: number
} {
  const safe: Partial<DiscoveryFilterState> = {}
  let redactedPrivateFieldCount = 0

  for (const [key, value] of Object.entries(filters)) {
    if (PRIVATE_FILTER_KEYS.has(key)) {
      redactedPrivateFieldCount += 1
      continue
    }
    ;(safe as Record<string, unknown>)[key] = Array.isArray(value) ? [...value] : value
  }

  return { filters: safe, redactedPrivateFieldCount }
}

function target(
  id: CircleDiscoveryApplyTargetId,
  label: string,
  eligible: boolean,
  ineligibleReason: string,
  writesSharedState: boolean,
  requiresConfirmation = false
): CircleDiscoveryApplyTarget {
  return {
    id,
    label,
    eligible,
    reason: eligible ? `${label} can receive the current discovery state.` : ineligibleReason,
    writesSharedState,
    requiresConfirmation: eligible && requiresConfirmation,
  }
}

function hasAnyType(types: Set<string>, expected: readonly string[]): boolean {
  return expected.some((type) => types.has(type))
}

function blockedMode(mode: CircleDiscoveryMode, reason: string): CircleDiscoveryModeDecision {
  return {
    mode,
    allowed: false,
    requiresConfirmation: false,
    privacyBoundary: 'blocked',
    label: 'Blocked',
    reason,
  }
}
