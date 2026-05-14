import type { ConsumerDiscoveryFilters } from '@/lib/public-consumer/discovery-actions'
import type { DiscoverySelectedItem } from '@/lib/discovery/action-contracts'
import {
  normalizeDiscoveryFilterState,
  type DiscoveryFilterState,
} from '@/lib/discovery/filter-state-contract'
import type {
  DiscoveryCompareCandidate,
  DiscoveryCompareContext,
} from '@/lib/discovery/compare-contracts'
import type { DiscoveryActorRole } from '@/lib/discovery/rail-contract-registry'
import {
  buildRemyNextActionHandoff,
  buildRemyDurableMemoryProposal,
  type RemyNextActionHandoff,
} from '@/lib/remy/action-discovery-handoff'
import {
  createDecisionAuditEvent,
  buildDecisionTimeline,
  summarizeDecisionPath,
  type RemyDecisionAuditEvent,
  type RemyDecisionTimelineItem,
} from '@/lib/remy/audit-trail-contracts'
import {
  buildRemyCompareSummary,
  detectRemyDecisionBlockers,
  type RemyBlockerCandidateState,
  type RemyDecisionBlocker,
} from '@/lib/remy/blocker-detection'
import {
  parseRemyBudgetIntent,
  evaluateRemyBudgetFit,
  type RemyBudgetCandidate,
  type RemyBudgetFit,
  type RemyBudgetIntent,
} from '@/lib/remy/budget-realism'
import {
  compressDiscoveryDecision,
  parseCompressionMode,
  type RemyCompressionResult,
} from '@/lib/remy/decision-compression-contracts'
import {
  createRemyDiscoveryProposal,
  evaluateRemyDiscoveryProposalAcceptance,
  type RemyDiscoveryAcceptanceDecision,
  type RemyDiscoveryProposal,
  type RemyDiscoveryProposalType,
  type RemyDiscoveryTargetMode,
  type RemyDiscoveryTargetSurface,
} from '@/lib/remy/discovery-proposal-contracts'
import {
  decideRemyDiscoveryContext,
  getOccasionWeights,
  nextTasteInterviewStep,
  parseConstraintIntent,
  proposeGroupDecisionMechanic,
  resolveConstraints,
  type RemyCircleRole,
  type RemyConstraint,
  type RemyConstraintResolution,
  type RemyContextGuardrailDecision,
  type RemyGroupDecisionProposal,
  type RemyOccasion,
  type RemyOccasionWeights,
  type RemyPreferenceNegotiationResult,
  type RemyTasteInterviewAnswer,
  type RemyTasteInterviewStep,
} from '@/lib/remy/group-decision-contracts'
import {
  translateCasualDiningIntent,
  type RemyDiningIntentTranslation,
} from '@/lib/remy/intent-discovery-parser'
import {
  buildPostDecisionFeedbackMemory,
  createMemoryProposal,
  type RemyMemoryProposal,
} from '@/lib/remy/memory-consent-contracts'
import {
  buildProofAwareRailExplanation,
  type RemyExplanationSignal,
  type RemyProofAwareRailExplanation,
} from '@/lib/remy/proof-aware-explanations'
import {
  buildRemySourceUpgradePrompt,
  type RemyResearchProposal,
  type RemySourceCandidate,
} from '@/lib/remy/source-research-proposals'
import {
  detectDiscoveryLoop,
  type RemyDiscoveryLoopInput,
  type RemyRecoveryAction,
  type RemyRecoveryProposal,
} from '@/lib/remy/staleness-recovery-contracts'
import { parseRemyUndoCommand, type RemyUndoCommand } from '@/lib/remy/undo-branch-contracts'

export type RemyDiscoveryRuntimeActor = {
  authenticated?: boolean
  actorRole?: DiscoveryActorRole
  circleRole?: RemyCircleRole
  hasCircleMembership?: boolean
  canManageCircle?: boolean
  confirmed?: boolean
  durableMemoryConsent?: boolean
  actorId?: string | null
  isHost?: boolean
}

export type RemyDiscoveryRuntimeCandidate = DiscoveryCompareCandidate & {
  budget?: RemyBudgetCandidate | null
  blockerState?: Omit<RemyBlockerCandidateState, 'candidate'> | null
  proofSignals?: RemyExplanationSignal[]
}

export type RemyDiscoveryRuntimeRequest = {
  message: string
  target?: {
    surface?: RemyDiscoveryTargetSurface
    mode?: RemyDiscoveryTargetMode
    sessionId?: string | null
    circleId?: string | null
  }
  currentFilters?: Partial<DiscoveryFilterState>
  actor?: RemyDiscoveryRuntimeActor
  candidates?: RemyDiscoveryRuntimeCandidate[]
  sourceCandidates?: RemySourceCandidate[]
  compareContext?: DiscoveryCompareContext
  group?: {
    memberCount?: number
    votedMemberIds?: string[]
    blockerCount?: number
    dietaryConcernCount?: number
    hostRequestedFinalCall?: boolean
    decisionPressure?: 'low' | 'normal' | 'high'
    expectedVotes?: number
    receivedVotes?: number
    locationDisagreement?: boolean
    dateSelected?: boolean
    requestedGroupSize?: number | null
    shortlistUpdatedAt?: string | Date | null
  }
  loop?: RemyDiscoveryLoopInput
  constraints?: RemyConstraint[]
  proposedRelaxations?: Partial<Record<RemyConstraint['field'], string | null>>
  auditEvents?: RemyDecisionAuditEvent[]
  interviewAnswers?: RemyTasteInterviewAnswer[]
  hardConstraints?: string[]
  now?: Date
}

type NormalizedRemyDiscoveryTarget = {
  surface: RemyDiscoveryTargetSurface
  mode: RemyDiscoveryTargetMode
  sessionId: string | null
  circleId: string | null
}

export type RemyProposalEnvelope = {
  proposal: RemyDiscoveryProposal
  acceptance: RemyDiscoveryAcceptanceDecision
}

export type RemyDiscoveryRuntimeResponse = {
  answer: string
  mode: RemyContextGuardrailDecision
  filters: DiscoveryFilterState
  translation: RemyDiningIntentTranslation
  proposalEnvelopes: RemyProposalEnvelope[]
  proposals: RemyDiscoveryProposal[]
  explanations: RemyProofAwareRailExplanation[]
  compare: ReturnType<typeof buildRemyCompareSummary> | null
  blockers: RemyDecisionBlocker[]
  nextAction: RemyNextActionHandoff
  recovery: RemyRecoveryProposal | null
  budgetIntent: RemyBudgetIntent | null
  budgetFits: RemyBudgetFit[]
  compression: RemyCompressionResult | null
  groupDecision: RemyGroupDecisionProposal | null
  constraints: RemyConstraintResolution | null
  undoCommand: RemyUndoCommand | null
  memories: RemyMemoryProposal[]
  research: RemyResearchProposal[]
  occasion: RemyOccasionWeights | null
  interview: RemyTasteInterviewStep | null
  audit: {
    events: RemyDecisionAuditEvent[]
    timeline: RemyDecisionTimelineItem[]
    summary: string
  }
  policy: {
    executionOwner: 'visible_discovery_rail'
    durableWritesRequire: 'explicit_confirmation_and_consent'
    externalActions: 'proposal_only'
  }
}

export function buildRemyDiscoveryRuntimeResponse(
  request: RemyDiscoveryRuntimeRequest
): RemyDiscoveryRuntimeResponse {
  const message = request.message.trim()
  const target = normalizeTarget(request)
  const actor = request.actor ?? {}
  const filters = normalizeDiscoveryFilterState(request.currentFilters)
  const mode = decideRemyDiscoveryContext({
    message,
    currentMode: target.mode,
    circleId: target.circleId,
    actorRole: actor.circleRole,
    hasCircleMembership: actor.hasCircleMembership ?? Boolean(target.circleId),
  })
  const activeMode = mode.allowed && mode.mode !== 'ambiguous' ? mode.mode : target.mode
  const translation = translateCasualDiningIntent(message, {
    currentFilters: filters,
    surface: target.surface,
    mode: activeMode,
    sessionId: target.sessionId,
    circleId: target.circleId,
    now: request.now,
  })

  const budgetIntent = mentionsBudget(message) ? parseRemyBudgetIntent(message) : null
  const budgetFits =
    budgetIntent && request.candidates
      ? request.candidates
          .filter((candidate) => candidate.budget)
          .map((candidate) =>
            evaluateRemyBudgetFit({ intent: budgetIntent, candidate: candidate.budget! })
          )
      : []
  const compare =
    request.candidates && request.candidates.length > 0
      ? buildRemyCompareSummary({
          candidates: request.candidates,
          context: request.compareContext ?? compareContextFromFilters(translation.filterState),
        })
      : null
  const blockerStates = buildBlockerStates(request.candidates ?? [])
  const blockers =
    blockerStates.length > 0 || request.group
      ? detectRemyDecisionBlockers({
          candidates: blockerStates,
          group: request.group,
        })
      : []
  const nextAction = buildRemyNextActionHandoff({
    surface: target.surface,
    mode: activeMode,
    sessionId: target.sessionId,
    circleId: target.circleId,
    actorRole: actor.actorRole ?? 'client',
    canManageCircle: actor.canManageCircle,
    durableMemoryConsent: actor.durableMemoryConsent,
    selectedItems: (request.candidates ?? []).slice(0, 3).map(toDiscoverySelectedItem),
    shortlistCount: request.candidates?.length,
    compareCandidateCount: request.candidates?.length,
    filters: toConsumerFilters(translation.filterState),
    authenticated: actor.authenticated,
    remyAvailable: true,
    canCreateCircleShare: Boolean(target.circleId),
    hasResults: (request.candidates?.length ?? 0) > 0,
    readinessConfidence: compare?.strongestCandidateId ? 0.72 : undefined,
    missingSignals: translation.clarification.missing.map(toMissingSignal),
    now: request.now,
  })
  const recovery = request.loop ? detectDiscoveryLoop(request.loop) : null
  const compressionMode = parseCompressionMode(message)
  const compression =
    compressionMode && request.candidates && request.candidates.length > 0
      ? compressDiscoveryDecision({
          mode: compressionMode,
          candidates: request.candidates,
          context: request.compareContext ?? compareContextFromFilters(translation.filterState),
        })
      : null
  const groupDecision = request.group
    ? proposeGroupDecisionMechanic({
        candidateCount: request.candidates?.length ?? 0,
        memberCount: request.group.memberCount ?? request.group.expectedVotes ?? 0,
        votedMemberIds: request.group.votedMemberIds,
        blockerCount: blockers.length,
        dietaryConcernCount: request.group.dietaryConcernCount,
        hostRequestedFinalCall: request.group.hostRequestedFinalCall,
        decisionPressure: request.group.decisionPressure,
        actorRole: actor.circleRole ?? 'member',
      })
    : null
  const constraintIntent = parseConstraintIntent(message)
  const constraints =
    constraintIntent || request.constraints?.length
      ? resolveConstraints({
          existing: request.constraints ?? [],
          intents: constraintIntent ? [constraintIntent] : [],
          proposedRelaxations: request.proposedRelaxations,
        })
      : null
  const memories = buildMemoryProposals(message, activeMode)
  const research = (request.sourceCandidates ?? [])
    .map((candidate) => buildRemySourceUpgradePrompt(candidate).proposal)
    .filter((proposal) => proposal.status === 'requires_user_approval')
  const occasion = resolveOccasionWeights(message)
  const interview =
    shouldRunTasteInterview(message) || (request.interviewAnswers?.length ?? 0) > 0
      ? nextTasteInterviewStep(request.interviewAnswers ?? [], request.hardConstraints ?? [])
      : null
  const explanations = (request.candidates ?? [])
    .filter((candidate) => candidate.proofSignals && candidate.proofSignals.length > 0)
    .map((candidate) =>
      buildProofAwareRailExplanation({
        candidateId: candidate.id,
        candidateLabel: candidate.label,
        signals: candidate.proofSignals ?? [],
      })
    )
  const undoCommand = parseRemyUndoCommand(message)
  const proposals = compactProposals([
    mode.requiresConfirmation
      ? clarifyingProposal(mode.reason, target, activeMode, request.now)
      : translation.proposal,
    budgetIntent?.requiresClarification && budgetIntent.clarificationQuestion
      ? clarifyingProposal(budgetIntent.clarificationQuestion, target, activeMode, request.now)
      : null,
    ...nextAction.proposals,
    ...(recovery
      ? recovery.actions.slice(0, 3).map((action) =>
          createRemyDiscoveryProposal({
            type: remyProposalTypeForRecoveryAction(action),
            target: { ...target, mode: activeMode },
            confidence: 0.58,
            reason: recovery.reason,
            backingSignals: recovery.signals.map((signal) => `stuck:${signal}`),
            durability: 'temporary',
            payload: { nextActionId: action },
            errorFallback: 'Keep using the current visible rail state.',
            analyticsLabel: `remy_discovery_recovery_${action}`,
            now: request.now,
          })
        )
      : []),
    ...research.slice(0, 3).map((item) =>
      createRemyDiscoveryProposal({
        type: 'suggest_research',
        target: { ...target, mode: activeMode },
        confidence: 0.64,
        reason: item.prompt ?? 'Run source research before promoting this candidate.',
        backingSignals: item.gaps.map((gap) => `source-gap:${gap.kind}`),
        durability: 'external',
        payload: {
          itemId: item.candidateId,
          itemLabel: item.candidateLabel,
          researchRequest: {
            query: item.tasks.map((task) => task.label).join('; '),
            leavesCurrentSurface: true,
          },
        },
        errorFallback: 'Leave the candidate confidence unchanged.',
        analyticsLabel: 'remy_discovery_source_research_proposal',
        now: request.now,
      })
    ),
    ...memories.map((memory) =>
      buildRemyDurableMemoryProposal({
        surface: target.surface,
        mode: activeMode,
        sessionId: target.sessionId,
        circleId: target.circleId,
        label: memory.source.replace(/_/g, ' '),
        value: memory.statement,
        confidence: 0.7,
        now: request.now,
      })
    ),
    groupDecision && groupDecision.allowed
      ? createRemyDiscoveryProposal({
          type:
            groupDecision.suggestedAction === 'create_poll' ||
            groupDecision.suggestedAction === 'create_ranked_vote'
              ? 'suggest_vote'
              : 'recommend_circle_action',
          target: { ...target, mode: 'circle' },
          confidence: 0.66,
          reason: groupDecision.reason,
          backingSignals: [`group-mechanic:${groupDecision.mechanic}`],
          durability: 'durable_circle',
          payload: { nextActionId: groupDecision.suggestedAction },
          errorFallback: 'Keep the circle decision as-is until the host acts.',
          analyticsLabel: 'remy_discovery_group_action_proposal',
          now: request.now,
        })
      : null,
  ])
  const proposalEnvelopes = proposals.map((proposal) => ({
    proposal,
    acceptance: evaluateRemyDiscoveryProposalAcceptance(proposal, {
      authenticated: actor.authenticated ?? false,
      actorRole: actor.actorRole ?? 'client',
      activeMode,
      circleId: target.circleId,
      canManageCircle: actor.canManageCircle,
      confirmed: actor.confirmed,
      durableMemoryConsent: actor.durableMemoryConsent,
    }),
  }))
  const audit = buildRuntimeAudit({
    request,
    mode: activeMode,
    translation,
    proposals,
    actorId: actor.actorId,
    isHost: actor.isHost,
  })

  return {
    answer: buildRuntimeAnswer({
      translation,
      mode,
      proposals,
      blockers,
      nextAction,
      recovery,
      explanations,
      research,
      memories,
    }),
    mode,
    filters: translation.filterState,
    translation,
    proposalEnvelopes,
    proposals,
    explanations,
    compare,
    blockers,
    nextAction,
    recovery,
    budgetIntent,
    budgetFits,
    compression,
    groupDecision,
    constraints,
    undoCommand,
    memories,
    research,
    occasion,
    interview,
    audit,
    policy: {
      executionOwner: 'visible_discovery_rail',
      durableWritesRequire: 'explicit_confirmation_and_consent',
      externalActions: 'proposal_only',
    },
  }
}

function normalizeTarget(request: RemyDiscoveryRuntimeRequest): NormalizedRemyDiscoveryTarget {
  return {
    surface: request.target?.surface ?? 'eat',
    mode: request.target?.mode ?? 'personal',
    sessionId: request.target?.sessionId ?? null,
    circleId: request.target?.circleId ?? null,
  }
}

function toDiscoverySelectedItem(candidate: RemyDiscoveryRuntimeCandidate): DiscoverySelectedItem {
  return {
    id: candidate.id,
    type: discoverySelectedItemType(candidate.type),
    label: candidate.label,
    href: candidate.href,
  }
}

function discoverySelectedItemType(
  type: RemyDiscoveryRuntimeCandidate['type']
): DiscoverySelectedItem['type'] {
  if (type === 'private_dinner') return 'service'
  if (type === 'open_table') return 'restaurant'
  if (type === 'remy_suggestion') return 'manual_pick'
  return type
}

function remyProposalTypeForRecoveryAction(action: RemyRecoveryAction): RemyDiscoveryProposalType {
  switch (action) {
    case 'widen_radius':
      return 'change_radius'
    case 'start_vote':
      return 'suggest_vote'
    case 'shortlist_two':
      return 'compare_candidates'
    case 'broaden_cuisine':
    case 'drop_weak_constraint':
      return 'add_filter'
    case 'switch_to_occasion_first':
      return 'reorder_rail'
    case 'fresh_mix':
    case 'reset_current_search':
      return action
  }
}

function buildBlockerStates(
  candidates: readonly RemyDiscoveryRuntimeCandidate[]
): RemyBlockerCandidateState[] {
  return candidates.map((candidate) => ({
    candidate,
    ...(candidate.blockerState ?? {}),
  }))
}

function compactProposals(
  values: Array<RemyDiscoveryProposal | null | undefined>
): RemyDiscoveryProposal[] {
  return values.filter((value): value is RemyDiscoveryProposal => Boolean(value))
}

function compareContextFromFilters(filters: DiscoveryFilterState): DiscoveryCompareContext {
  return {
    desiredCuisine: filters.cuisines[0] ?? null,
    maxDistanceMiles: filters.radiusMiles ?? null,
    budget: budgetLevel(filters.budget),
    groupSize: filters.partySize ?? null,
  }
}

function toConsumerFilters(filters: DiscoveryFilterState): ConsumerDiscoveryFilters {
  return {
    intent: filters.occasion,
    craving: filters.cravings[0] ?? filters.cuisines[0],
    fulfillment: filters.fulfillment,
    location: filters.location,
    budget: filters.budget,
    dietary: filters.dietary.join(','),
    dateWindow: filters.dateWindow,
    partySize: filters.partySize,
    eventStyle: filters.moods[0],
  }
}

function toMissingSignal(
  value: RemyDiningIntentTranslation['clarification']['missing'][number]
): 'taste' | 'time' | 'party_size' | 'location' {
  if (value === 'timing') return 'time'
  if (value === 'partySize') return 'party_size'
  if (value === 'occasion') return 'taste'
  return value
}

function budgetLevel(value: string | undefined): DiscoveryCompareContext['budget'] {
  if (!value) return null
  if (value.includes('luxury')) return 'luxury'
  if (value.includes('premium') || value.includes('splurge')) return 'premium'
  if (value.includes('budget') || value.includes('cheap') || value.includes('affordable')) {
    return 'budget'
  }
  return 'moderate'
}

function mentionsBudget(message: string): boolean {
  return /\b(budget|price|under|below|less than|max|cap|fees?|tax|tip|cheap|splurge|value|\$)\b/i.test(
    message
  )
}

function buildMemoryProposals(
  message: string,
  mode: RemyDiscoveryTargetMode
): RemyMemoryProposal[] {
  const memories: RemyMemoryProposal[] = []
  const rememberMatch = message.match(/\bremember(?: that|:)?\s+(.+)$/i)
  if (rememberMatch?.[1]) {
    memories.push(
      createMemoryProposal({
        scope: mode,
        statement: rememberMatch[1],
        source: 'explicit_remember_request',
      })
    )
  }

  const feedbackMatch = message.match(/\b(that was a win|that missed|avoid that next time)\b/i)
  if (feedbackMatch) {
    memories.push(
      buildPostDecisionFeedbackMemory({
        decisionLabel: 'Last discovery decision',
        outcome: /win/i.test(feedbackMatch[0]) ? 'win' : 'miss',
        scope: mode,
      })
    )
  }

  return memories
}

function resolveOccasionWeights(message: string): RemyOccasionWeights | null {
  const normalized = message.toLowerCase()
  const match: Array<[RegExp, RemyOccasion]> = [
    [/\banniversary\b/, 'anniversary'],
    [/\bbirthday\b/, 'birthday'],
    [/\bclient dinner\b/, 'client_dinner'],
    [/\bcasual hang\b|\bhang\b/, 'casual_hang'],
    [/\bwork dinner\b/, 'work_dinner'],
    [/\bpost[- ]?show\b|\bafter the show\b/, 'post_show'],
  ]
  const occasion = match.find(([pattern]) => pattern.test(normalized))?.[1]
  return occasion ? getOccasionWeights(occasion) : null
}

function shouldRunTasteInterview(message: string): boolean {
  return /\b(interview|ask me|calibrate|surprise mode|don't know what i want)\b/i.test(message)
}

function clarifyingProposal(
  question: string,
  target: NormalizedRemyDiscoveryTarget,
  mode: RemyDiscoveryTargetMode,
  now: Date | undefined
): RemyDiscoveryProposal {
  return createRemyDiscoveryProposal({
    type: 'ask_clarifying_question',
    target: { ...target, mode },
    confidence: 0.5,
    reason: 'Remy needs a small clarification before changing visible Discovery state.',
    backingSignals: ['clarification:required'],
    durability: 'temporary',
    payload: { clarificationQuestion: question },
    errorFallback: 'Keep the current Discovery rail unchanged.',
    analyticsLabel: 'remy_discovery_clarification',
    now,
  })
}

function buildRuntimeAudit(input: {
  request: RemyDiscoveryRuntimeRequest
  mode: RemyDiscoveryTargetMode
  translation: RemyDiningIntentTranslation
  proposals: RemyDiscoveryProposal[]
  actorId?: string | null
  isHost?: boolean
}): RemyDiscoveryRuntimeResponse['audit'] {
  const mode = input.mode
  const inferredEvents =
    input.translation.operations.length > 0
      ? [
          createDecisionAuditEvent({
            type: 'chat_filter_inferred',
            actorId: input.actorId,
            label: input.translation.operations
              .map((operation) => operation.label ?? operation.field)
              .join(', '),
            details: 'Generated as proposal metadata; visible rail still owns execution.',
            visibility: mode === 'circle' ? 'public_to_circle' : 'private',
            mode,
            at: input.request.now?.toISOString(),
          }),
        ]
      : []
  const proposalEvents = input.proposals.map((proposal) =>
    createDecisionAuditEvent({
      type: 'proposal_created',
      actorId: input.actorId,
      label: proposal.type.replace(/_/g, ' '),
      details: proposal.reason,
      visibility: proposal.target.mode === 'circle' ? 'public_to_circle' : 'private',
      mode: proposal.target.mode,
      sourceIds: [proposal.id],
      at: input.request.now?.toISOString(),
    })
  )
  const events = [...(input.request.auditEvents ?? []), ...inferredEvents, ...proposalEvents]
  const viewer = {
    actorId: input.actorId,
    mode,
    isHost: input.isHost,
  }
  return {
    events,
    timeline: buildDecisionTimeline({ events, viewer }),
    summary: summarizeDecisionPath({ events, viewer }),
  }
}

function buildRuntimeAnswer(input: {
  translation: RemyDiningIntentTranslation
  mode: RemyContextGuardrailDecision
  proposals: RemyDiscoveryProposal[]
  blockers: RemyDecisionBlocker[]
  nextAction: RemyNextActionHandoff
  recovery: RemyRecoveryProposal | null
  explanations: RemyProofAwareRailExplanation[]
  research: RemyResearchProposal[]
  memories: RemyMemoryProposal[]
}): string {
  if (!input.mode.allowed) return input.mode.reason
  if (input.translation.clarification.needed && input.translation.clarification.question) {
    return input.translation.clarification.question
  }
  if (input.blockers.some((blocker) => blocker.severity === 'blocker')) {
    return input.blockers.find((blocker) => blocker.severity === 'blocker')!.nextAction
  }
  if (input.recovery?.stuck && input.recovery.actions.length > 0) {
    return 'Discovery looks stuck. I can propose a reversible recovery without changing locked constraints.'
  }
  if (input.research.length > 0) {
    return input.research[0].prompt ?? 'I can propose source research before this is promoted.'
  }
  if (input.memories.length > 0) {
    return 'I can remember that only after explicit confirmation.'
  }
  if (input.explanations.length > 0) return input.explanations[0].answer
  if (input.nextAction.ready) return 'I found a safe next action proposal for the visible rail.'
  if (input.proposals.length > 0) return 'I translated that into a reversible Discovery proposal.'
  return 'I can tune the visible Discovery rail, but I need a little more dining intent first.'
}
