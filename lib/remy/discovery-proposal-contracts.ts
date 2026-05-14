import type {
  DiscoveryFilterState,
  DiscoveryRailSelection,
} from '@/lib/discovery/filter-state-contract'
import type { DiscoveryActorRole } from '@/lib/discovery/rail-contract-registry'

export type RemyDiscoveryTargetSurface = 'homepage' | 'eat' | 'circle' | 'remy'

export type RemyDiscoveryTargetMode = 'personal' | 'circle'

export type RemyDiscoveryProposalType =
  | 'change_radius'
  | 'add_filter'
  | 'remove_filter'
  | 'reorder_rail'
  | 'fresh_mix'
  | 'reset_current_search'
  | 'explain_option'
  | 'save_item'
  | 'pin_item'
  | 'hide_item'
  | 'save_to_circle'
  | 'compare_candidates'
  | 'suggest_vote'
  | 'recommend_circle_action'
  | 'save_memory'
  | 'create_task'
  | 'suggest_research'
  | 'start_inquiry'
  | 'draft_event_plan'
  | 'ask_clarifying_question'

export type RemyDiscoveryProposalLifecycle =
  | 'created'
  | 'shown'
  | 'accepted'
  | 'rejected'
  | 'ignored'
  | 'reset'
  | 'failed'
  | 'superseded'

export type RemyDiscoveryDurability = 'temporary' | 'durable_user' | 'durable_circle' | 'external'

export type RemyDiscoveryPermission =
  | 'authenticated_user'
  | 'circle_member'
  | 'circle_manager'
  | 'durable_memory_consent'
  | 'explicit_confirmation'
  | 'rail_session_executor'

export type RemyDiscoveryResetBehavior = {
  available: boolean
  scope: 'none' | 'current_search' | 'rail_order' | 'single_action' | 'circle_planning'
  reason: string
}

export type RemyDiscoveryConfirmation = {
  required: boolean
  reason: string
}

export type RemyDiscoveryProposalTarget = {
  surface: RemyDiscoveryTargetSurface
  mode: RemyDiscoveryTargetMode
  sessionId?: string | null
  circleId?: string | null
}

export type RemyDiscoveryFilterOperation = {
  field: keyof DiscoveryFilterState
  op: 'add' | 'remove' | 'set' | 'clear'
  value?: string | number | boolean | null
  label?: string
}

export type RemyDiscoverySelectedItemRef = DiscoveryRailSelection & {
  id?: string
}

export type RemyDiscoveryProposalPayload = {
  filters?: Partial<DiscoveryFilterState>
  filterOperations?: RemyDiscoveryFilterOperation[]
  selectedItems?: RemyDiscoverySelectedItemRef[]
  candidateIds?: string[]
  itemId?: string
  itemLabel?: string
  explanationRequest?: string
  memorySignal?: {
    label: string
    value: string
    scope: 'account' | 'household' | 'circle' | 'event'
  }
  task?: {
    title: string
    description?: string
  }
  researchRequest?: {
    query: string
    leavesCurrentSurface: boolean
  }
  nextActionId?: string
  clarificationQuestion?: string
}

export type RemyDiscoveryProposal = {
  id: string
  type: RemyDiscoveryProposalType
  lifecycle: RemyDiscoveryProposalLifecycle
  target: RemyDiscoveryProposalTarget
  confidence: number
  reason: string
  backingSignals: string[]
  requiredPermissions: RemyDiscoveryPermission[]
  durability: RemyDiscoveryDurability
  confirmation: RemyDiscoveryConfirmation
  reset: RemyDiscoveryResetBehavior
  analytics: {
    source: 'remy_chat'
    proposalType: RemyDiscoveryProposalType
    targetSurface: RemyDiscoveryTargetSurface
    targetMode: RemyDiscoveryTargetMode
    label: string
  }
  payload: RemyDiscoveryProposalPayload
  errorFallback: string
  createdAt: string
  updatedAt: string
}

export type RemyDiscoveryProposalInput = Omit<
  RemyDiscoveryProposal,
  | 'id'
  | 'lifecycle'
  | 'requiredPermissions'
  | 'confirmation'
  | 'reset'
  | 'analytics'
  | 'createdAt'
  | 'updatedAt'
> & {
  id?: string
  lifecycle?: RemyDiscoveryProposalLifecycle
  requiredPermissions?: RemyDiscoveryPermission[]
  confirmation?: Partial<RemyDiscoveryConfirmation>
  reset?: Partial<RemyDiscoveryResetBehavior>
  analyticsLabel?: string
  now?: Date
}

export type RemyDiscoveryAcceptanceContext = {
  authenticated: boolean
  actorRole: DiscoveryActorRole
  activeMode: RemyDiscoveryTargetMode
  circleId?: string | null
  canManageCircle?: boolean
  confirmed?: boolean
  durableMemoryConsent?: boolean
}

export type RemyDiscoveryAcceptanceDecision = {
  allowed: boolean
  requiresConfirmation: boolean
  requiresConsent: boolean
  reason: string
  executionOwner: 'rail_session' | 'blocked'
}

const HIGH_IMPACT_PROPOSAL_TYPES = new Set<RemyDiscoveryProposalType>([
  'save_memory',
  'create_task',
  'suggest_research',
  'start_inquiry',
  'draft_event_plan',
  'recommend_circle_action',
])

const CIRCLE_MANAGER_PROPOSAL_TYPES = new Set<RemyDiscoveryProposalType>([
  'recommend_circle_action',
  'suggest_vote',
  'save_to_circle',
])

export function createRemyDiscoveryProposal(
  input: RemyDiscoveryProposalInput
): RemyDiscoveryProposal {
  const now = input.now ?? new Date()
  const timestamp = now.toISOString()
  const confirmation = buildConfirmation(input)
  const requiredPermissions = buildRequiredPermissions(input, confirmation)
  const reset = buildResetBehavior(input)

  return {
    id: input.id ?? stableProposalId(input, timestamp),
    type: input.type,
    lifecycle: input.lifecycle ?? 'created',
    target: input.target,
    confidence: clamp01(input.confidence),
    reason: input.reason.trim(),
    backingSignals: unique(input.backingSignals.map((signal) => signal.trim()).filter(Boolean)),
    requiredPermissions,
    durability: input.durability,
    confirmation,
    reset,
    analytics: {
      source: 'remy_chat',
      proposalType: input.type,
      targetSurface: input.target.surface,
      targetMode: input.target.mode,
      label: input.analyticsLabel ?? `remy_discovery_${input.type}`,
    },
    payload: input.payload,
    errorFallback: input.errorFallback,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function transitionRemyDiscoveryProposal(
  proposal: RemyDiscoveryProposal,
  lifecycle: RemyDiscoveryProposalLifecycle,
  now = new Date()
): RemyDiscoveryProposal {
  if (!isAllowedTransition(proposal.lifecycle, lifecycle)) {
    throw new Error(`Cannot transition Remy proposal from ${proposal.lifecycle} to ${lifecycle}.`)
  }

  return {
    ...proposal,
    lifecycle,
    updatedAt: now.toISOString(),
  }
}

export function evaluateRemyDiscoveryProposalAcceptance(
  proposal: RemyDiscoveryProposal,
  context: RemyDiscoveryAcceptanceContext
): RemyDiscoveryAcceptanceDecision {
  if (!['created', 'shown'].includes(proposal.lifecycle)) {
    return blocked(`Proposal is ${proposal.lifecycle} and cannot be accepted.`, false, false)
  }

  if (proposal.requiredPermissions.includes('authenticated_user') && !context.authenticated) {
    return blocked(
      'Sign in is required before this Remy proposal can write durable state.',
      false,
      false
    )
  }

  if (proposal.target.mode === 'circle') {
    if (context.activeMode !== 'circle' || !context.circleId) {
      return blocked('Circle proposals require an active circle context.', false, false)
    }
    if (proposal.target.circleId && proposal.target.circleId !== context.circleId) {
      return blocked(
        'This proposal targets a different circle than the active context.',
        false,
        false
      )
    }
    if (proposal.requiredPermissions.includes('circle_manager') && !context.canManageCircle) {
      return blocked('This circle proposal requires manager permission.', false, false)
    }
  }

  const requiresConsent = proposal.requiredPermissions.includes('durable_memory_consent')
  if (requiresConsent && !context.durableMemoryConsent) {
    return blocked('Durable memory requires explicit consent before Remy can save it.', false, true)
  }

  if (proposal.confirmation.required && !context.confirmed) {
    return {
      allowed: false,
      requiresConfirmation: true,
      requiresConsent: false,
      reason: proposal.confirmation.reason,
      executionOwner: 'blocked',
    }
  }

  return {
    allowed: true,
    requiresConfirmation: false,
    requiresConsent: false,
    reason: 'Proposal may be handed to the visible Discovery rail/session executor.',
    executionOwner: 'rail_session',
  }
}

export function remyProposalLeavesRailUnchanged(
  lifecycle: RemyDiscoveryProposalLifecycle
): boolean {
  return lifecycle === 'rejected' || lifecycle === 'ignored' || lifecycle === 'failed'
}

export function buildRemyProposalAnalyticsEvent(
  proposal: RemyDiscoveryProposal,
  outcome: RemyDiscoveryProposalLifecycle
): {
  event: 'remy_discovery_proposal_lifecycle'
  proposalType: RemyDiscoveryProposalType
  sourceSurface: RemyDiscoveryTargetSurface
  targetMode: RemyDiscoveryTargetMode
  outcome: RemyDiscoveryProposalLifecycle
  confidence: number
} {
  return {
    event: 'remy_discovery_proposal_lifecycle',
    proposalType: proposal.type,
    sourceSurface: proposal.target.surface,
    targetMode: proposal.target.mode,
    outcome,
    confidence: proposal.confidence,
  }
}

function buildConfirmation(input: RemyDiscoveryProposalInput): RemyDiscoveryConfirmation {
  const forced =
    HIGH_IMPACT_PROPOSAL_TYPES.has(input.type) ||
    input.durability === 'external' ||
    input.durability === 'durable_circle' ||
    input.confirmation?.required === true

  return {
    required: forced,
    reason:
      input.confirmation?.reason ??
      (forced
        ? 'This Remy proposal changes durable, shared, or external state and needs confirmation.'
        : 'Temporary Discovery rail changes can be accepted directly and reset later.'),
  }
}

function buildRequiredPermissions(
  input: RemyDiscoveryProposalInput,
  confirmation: RemyDiscoveryConfirmation
): RemyDiscoveryPermission[] {
  const permissions = new Set<RemyDiscoveryPermission>([
    'rail_session_executor',
    ...(input.requiredPermissions ?? []),
  ])

  if (input.durability !== 'temporary') permissions.add('authenticated_user')
  if (input.target.mode === 'circle' || input.durability === 'durable_circle') {
    permissions.add('circle_member')
  }
  if (input.type === 'save_memory') permissions.add('durable_memory_consent')
  if (confirmation.required) permissions.add('explicit_confirmation')
  if (CIRCLE_MANAGER_PROPOSAL_TYPES.has(input.type)) permissions.add('circle_manager')

  return [...permissions]
}

function buildResetBehavior(input: RemyDiscoveryProposalInput): RemyDiscoveryResetBehavior {
  if (input.reset?.available !== undefined && input.reset.scope && input.reset.reason) {
    return {
      available: input.reset.available,
      scope: input.reset.scope,
      reason: input.reset.reason,
    }
  }

  if (input.durability !== 'temporary') {
    return {
      available: false,
      scope: 'none',
      reason: 'Durable proposals must be reversed through their owning product flow.',
    }
  }

  if (input.type === 'fresh_mix' || input.type === 'reorder_rail') {
    return {
      available: true,
      scope: 'rail_order',
      reason: 'Rail ordering can be reset without clearing durable saves or memory.',
    }
  }

  return {
    available: input.type !== 'ask_clarifying_question',
    scope: input.type === 'reset_current_search' ? 'current_search' : 'single_action',
    reason: 'Temporary Remy rail changes can be reset from the visible rail/session state.',
  }
}

function isAllowedTransition(
  from: RemyDiscoveryProposalLifecycle,
  to: RemyDiscoveryProposalLifecycle
): boolean {
  if (from === to) return true

  const allowed: Record<RemyDiscoveryProposalLifecycle, RemyDiscoveryProposalLifecycle[]> = {
    created: ['shown', 'accepted', 'rejected', 'ignored', 'failed', 'superseded'],
    shown: ['accepted', 'rejected', 'ignored', 'failed', 'superseded'],
    accepted: ['reset', 'failed', 'superseded'],
    rejected: ['superseded'],
    ignored: ['superseded'],
    reset: ['superseded'],
    failed: ['superseded'],
    superseded: [],
  }

  return allowed[from].includes(to)
}

function stableProposalId(input: RemyDiscoveryProposalInput, timestamp: string): string {
  const seed = [input.type, input.target.surface, input.target.mode, input.reason, timestamp].join(
    ':'
  )
  return `remy-proposal-${hash(seed)}`
}

function blocked(
  reason: string,
  requiresConfirmation: boolean,
  requiresConsent: boolean
): RemyDiscoveryAcceptanceDecision {
  return {
    allowed: false,
    requiresConfirmation,
    requiresConsent,
    reason,
    executionOwner: 'blocked',
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function unique<T>(values: readonly T[]): T[] {
  return Array.from(new Set(values))
}

function hash(value: string): string {
  let result = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }
  return (result >>> 0).toString(36)
}
