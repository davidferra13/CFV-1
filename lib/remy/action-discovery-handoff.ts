import {
  getAvailableDiscoveryNextActions,
  type DiscoveryActionContext,
  type DiscoveryActionSurface,
  type DiscoveryNextAction,
  type DiscoveryNextActionId,
} from '@/lib/discovery/action-contracts'
import type { DiscoveryRailSelection } from '@/lib/discovery/filter-state-contract'
import type { DiscoveryActorRole } from '@/lib/discovery/rail-contract-registry'
import {
  createRemyDiscoveryProposal,
  type RemyDiscoveryDurability,
  type RemyDiscoveryProposal,
  type RemyDiscoveryProposalType,
  type RemyDiscoveryTargetMode,
  type RemyDiscoveryTargetSurface,
} from '@/lib/remy/discovery-proposal-contracts'

export type RemyNextActionHandoffContext = DiscoveryActionContext & {
  mode?: RemyDiscoveryTargetMode
  actorRole?: DiscoveryActorRole
  readinessConfidence?: number
  missingSignals?: RemyMissingDiscoverySignal[]
  sessionId?: string | null
  canManageCircle?: boolean
  durableMemoryConsent?: boolean
  now?: Date
}

export type RemyMissingDiscoverySignal =
  | 'selected_item'
  | 'taste'
  | 'time'
  | 'party_size'
  | 'location'
  | 'circle'
  | 'auth'

export type RemyNextActionHandoff = {
  ready: boolean
  confidence: number
  clarification: string | null
  missingSignals: RemyMissingDiscoverySignal[]
  proposals: RemyDiscoveryProposal[]
  allowedActions: DiscoveryNextAction[]
}

export type RemyDurableMemoryConsentGate = {
  canPropose: boolean
  canPersist: boolean
  requiresConfirmation: boolean
  requiresConsent: boolean
  reason: string
}

const ACTION_TO_PROPOSAL: Partial<
  Record<
    DiscoveryNextActionId,
    {
      type: RemyDiscoveryProposalType
      durability: RemyDiscoveryDurability
      reason: string
    }
  >
> = {
  apply_filters: {
    type: 'add_filter',
    durability: 'temporary',
    reason: 'Apply the visible Discovery filter state.',
  },
  compare: {
    type: 'compare_candidates',
    durability: 'temporary',
    reason: 'Compare the strongest visible candidates before choosing.',
  },
  save: {
    type: 'save_item',
    durability: 'durable_user',
    reason: 'Save the selected option so it is easy to return to later.',
  },
  share_to_circle: {
    type: 'save_to_circle',
    durability: 'durable_circle',
    reason: 'Share the selected option into the active circle context.',
  },
  ask_remy: {
    type: 'explain_option',
    durability: 'temporary',
    reason: 'Ask Remy to explain or repair the visible discovery state.',
  },
  build_plan: {
    type: 'create_task',
    durability: 'external',
    reason: 'Turn the selected option into a planning brief or next task.',
  },
  share_link: {
    type: 'create_task',
    durability: 'external',
    reason: 'Create a shareable handoff for the current discovery state.',
  },
  reset_current_search: {
    type: 'reset_current_search',
    durability: 'temporary',
    reason: 'Reset temporary search state while preserving durable saves and memory.',
  },
  fresh_mix: {
    type: 'fresh_mix',
    durability: 'temporary',
    reason: 'Keep the intent but refresh the rail mix.',
  },
}

export function buildRemyNextActionHandoff(
  context: RemyNextActionHandoffContext
): RemyNextActionHandoff {
  const confidence = clamp01(context.readinessConfidence ?? inferReadinessConfidence(context))
  const missingSignals = inferMissingSignals(context)
  const allowedActions = getAvailableDiscoveryNextActions(context)

  if (confidence < 0.45 || missingSignals.includes('selected_item')) {
    return {
      ready: false,
      confidence,
      clarification: clarificationFor(missingSignals),
      missingSignals,
      proposals: [],
      allowedActions,
    }
  }

  const proposals = allowedActions
    .filter((action) => ACTION_TO_PROPOSAL[action.id])
    .filter((action) => action.id !== 'reset_current_search')
    .slice(0, 4)
    .map((action) => proposalForAction(action, context, confidence))

  return {
    ready: proposals.length > 0,
    confidence,
    clarification: proposals.length > 0 ? null : clarificationFor(missingSignals),
    missingSignals,
    proposals,
    allowedActions,
  }
}

export function evaluateDurableMemoryConsentGate(input: {
  authenticated: boolean
  durableMemoryConsent?: boolean
  confirmed?: boolean
  proposedValue?: string | null
}): RemyDurableMemoryConsentGate {
  if (!input.proposedValue?.trim()) {
    return {
      canPropose: false,
      canPersist: false,
      requiresConfirmation: false,
      requiresConsent: false,
      reason: 'No durable memory signal was provided.',
    }
  }

  if (!input.authenticated) {
    return {
      canPropose: true,
      canPersist: false,
      requiresConfirmation: false,
      requiresConsent: false,
      reason: 'Sign in is required before Remy can save durable memory.',
    }
  }

  if (!input.durableMemoryConsent) {
    return {
      canPropose: true,
      canPersist: false,
      requiresConfirmation: false,
      requiresConsent: true,
      reason: 'Durable memory needs explicit consent.',
    }
  }

  if (!input.confirmed) {
    return {
      canPropose: true,
      canPersist: false,
      requiresConfirmation: true,
      requiresConsent: false,
      reason: 'Confirm before saving this preference to durable memory.',
    }
  }

  return {
    canPropose: true,
    canPersist: true,
    requiresConfirmation: false,
    requiresConsent: false,
    reason: 'Durable memory can be saved through the approved preference flow.',
  }
}

export function buildRemyDurableMemoryProposal(input: {
  surface?: RemyDiscoveryTargetSurface
  mode?: RemyDiscoveryTargetMode
  sessionId?: string | null
  circleId?: string | null
  label: string
  value: string
  confidence?: number
  now?: Date
}): RemyDiscoveryProposal {
  return createRemyDiscoveryProposal({
    type: 'save_memory',
    target: {
      surface: input.surface ?? 'remy',
      mode: input.mode ?? 'personal',
      sessionId: input.sessionId ?? null,
      circleId: input.circleId ?? null,
    },
    confidence: input.confidence ?? 0.62,
    reason: 'Remy can remember this dining preference only after consent and confirmation.',
    backingSignals: ['memory:proposed_from_chat'],
    durability: input.mode === 'circle' ? 'durable_circle' : 'durable_user',
    confirmation: {
      required: true,
      reason: 'Confirm before saving this as durable Remy memory.',
    },
    payload: {
      memorySignal: {
        label: input.label,
        value: input.value,
        scope: input.mode === 'circle' ? 'circle' : 'account',
      },
    },
    errorFallback: 'Keep this as a one-time Discovery rail hint instead.',
    analyticsLabel: 'remy_discovery_save_memory_proposal',
    now: input.now,
  })
}

export function getAllowedRemyDiscoveryActionProposals(
  context: RemyNextActionHandoffContext
): RemyDiscoveryProposalType[] {
  return getAvailableDiscoveryNextActions(context)
    .map((action) => ACTION_TO_PROPOSAL[action.id]?.type)
    .filter((type): type is RemyDiscoveryProposalType => Boolean(type))
}

function proposalForAction(
  action: DiscoveryNextAction,
  context: RemyNextActionHandoffContext,
  confidence: number
): RemyDiscoveryProposal {
  const mapping = ACTION_TO_PROPOSAL[action.id]
  if (!mapping) throw new Error(`Unsupported Remy handoff action: ${action.id}`)

  const selectedItems = context.selectedItems?.map((item) => ({
    type: toRailSelectionType(item.type),
    label: item.label,
    value: item.id,
    href: item.href ?? '/eat',
    id: item.id,
  }))

  return createRemyDiscoveryProposal({
    type: mapping.type,
    target: {
      surface: toRemyTargetSurface(context.surface),
      mode: context.mode ?? (context.circleId ? 'circle' : 'personal'),
      sessionId: context.sessionId ?? null,
      circleId: context.circleId ?? null,
    },
    confidence,
    reason: mapping.reason,
    backingSignals: [
      `next-action:${action.id}`,
      action.eligibility.reason,
      ...(context.hasResults ? ['results:available'] : []),
    ],
    durability: mapping.durability,
    payload: {
      selectedItems,
      candidateIds: context.selectedItems?.map((item) => item.id),
      nextActionId: action.id,
      task:
        mapping.type === 'create_task'
          ? { title: action.label, description: mapping.reason }
          : undefined,
    },
    errorFallback: 'Stay in Discovery and keep refining the visible rail.',
    analyticsLabel: `remy_discovery_next_action_${action.id}`,
    now: context.now,
  })
}

function toRailSelectionType(type: string): DiscoveryRailSelection['type'] {
  if (type === 'chef') return 'featured_chef'
  if (type === 'restaurant' || type === 'menu' || type === 'recipe' || type === 'manual_pick') {
    return 'saved'
  }
  return type as DiscoveryRailSelection['type']
}

function toRemyTargetSurface(surface: DiscoveryActionSurface): RemyDiscoveryTargetSurface {
  return surface === 'saved' ? 'eat' : surface
}

function inferReadinessConfidence(context: RemyNextActionHandoffContext): number {
  const selectedCount = context.selectedItems?.length ?? 0
  const shortlistCount = context.shortlistCount ?? 0
  const compareCount = context.compareCandidateCount ?? selectedCount
  const filterCount = Object.keys(context.filters ?? {}).length
  const signalScore =
    selectedCount * 0.2 + shortlistCount * 0.12 + compareCount * 0.1 + filterCount * 0.08
  return clamp01(0.22 + signalScore + (context.hasResults ? 0.12 : 0))
}

function inferMissingSignals(context: RemyNextActionHandoffContext): RemyMissingDiscoverySignal[] {
  const missing = new Set<RemyMissingDiscoverySignal>(context.missingSignals ?? [])
  const selectedCount = context.selectedItems?.length ?? 0
  const filters = context.filters ?? {}

  if (selectedCount === 0 && (context.shortlistCount ?? 0) === 0) missing.add('selected_item')
  if (!filters.craving && !filters.intent && !filters.eventStyle) missing.add('taste')
  if (!filters.dateWindow) missing.add('time')
  if (!filters.partySize) missing.add('party_size')
  if (!filters.location) missing.add('location')
  if (context.surface === 'circle' && !context.circleId) missing.add('circle')
  if ((context.authenticated === false && selectedCount > 0) || filters.visualMode)
    missing.add('auth')

  return [...missing]
}

function clarificationFor(missing: readonly RemyMissingDiscoverySignal[]): string {
  if (missing.includes('selected_item')) {
    return 'Which option should I use for the next step?'
  }
  if (missing.includes('party_size')) return 'How many people is this for?'
  if (missing.includes('time')) return 'When should this dinner happen?'
  if (missing.includes('location')) return 'What location or radius should I use?'
  return 'What should I optimize for next?'
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}
