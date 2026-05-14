import {
  buildCompareMatrix,
  type DiscoveryCompareCandidate,
  type DiscoveryCompareContext,
} from '@/lib/discovery/compare-contracts'
import type {
  PreferencePolarity,
  PreferenceSignalLedgerEntry,
} from '@/lib/discovery/preference-contract'
import type { CircleDiscoveryMemberAction } from '@/lib/hub/circle-discovery-contracts'

export type CircleDinnerFulfillmentMode = 'eat_in' | 'eat_out' | 'either'

export type CircleConsensusVisibility = 'explicit_shared' | 'aggregate_allowed' | 'private'

export type CircleConsensusSignal = {
  memberId: string
  label: string
  polarity: PreferencePolarity
  strength?: number
  visibility: CircleConsensusVisibility
  sourceSignalId?: string
}

export type CircleAggregatedSignal = {
  label: string
  polarity: PreferencePolarity
  memberCount: number
  averageStrength: number
  visibility: 'aggregate'
}

export type CircleSignalAggregation = {
  aggregateSignals: CircleAggregatedSignal[]
  redactedPrivateSignalCount: number
  memberIdsIncluded: never[]
  sourceSignalIdsIncluded: never[]
  explanation: string
}

export type CircleConsensusCandidate = DiscoveryCompareCandidate & {
  consensusScore: number
  actionScore: number
  preferenceScore: number
  compareScore: number
  vetoedByCount: number
  hardBlockerLabels: string[]
  matchedAggregateLabels: string[]
  fulfillmentFit: 'strong' | 'allowed' | 'weak'
}

export type CircleConsensusResult = {
  mode: CircleDinnerFulfillmentMode
  candidates: CircleConsensusCandidate[]
  aggregation: CircleSignalAggregation
  topCandidate: CircleConsensusCandidate | null
}

export type CircleDecisionReadinessStatus =
  | 'no_candidates'
  | 'needs_more_votes'
  | 'diet_conflict_unresolved'
  | 'budget_split'
  | 'strong_winner'
  | 'enough_signal_to_choose'
  | 'still_exploring'

export type CircleDecisionReadiness = {
  status: CircleDecisionReadinessStatus
  score: number
  label: string
  readyToFinalize: boolean
  missingVoteCount: number
  blockerLabels: string[]
  topCandidateId: string | null
}

const HARD_POLARITIES = new Set<PreferencePolarity>(['allergy', 'restriction', 'never_show'])
const NEGATIVE_POLARITIES = new Set<PreferencePolarity>([
  'allergy',
  'restriction',
  'never_show',
  'dislike',
])

export function aggregateCircleSignals(
  signals: readonly CircleConsensusSignal[]
): CircleSignalAggregation {
  const visible = signals.filter((signal) => signal.visibility !== 'private')
  const redactedPrivateSignalCount = signals.length - visible.length
  const byKey = new Map<
    string,
    {
      label: string
      polarity: PreferencePolarity
      memberIds: Set<string>
      strengthTotal: number
      signalCount: number
    }
  >()

  for (const signal of visible) {
    const key = `${signal.polarity}:${normalizeLabel(signal.label)}`
    const current =
      byKey.get(key) ??
      ({
        label: signal.label,
        polarity: signal.polarity,
        memberIds: new Set<string>(),
        strengthTotal: 0,
        signalCount: 0,
      } satisfies {
        label: string
        polarity: PreferencePolarity
        memberIds: Set<string>
        strengthTotal: number
        signalCount: number
      })

    current.memberIds.add(signal.memberId)
    current.strengthTotal += clamp01(signal.strength ?? 1)
    current.signalCount += 1
    byKey.set(key, current)
  }

  const aggregateSignals = [...byKey.values()]
    .map((entry) => ({
      label: entry.label,
      polarity: entry.polarity,
      memberCount: entry.memberIds.size,
      averageStrength: round2(entry.strengthTotal / Math.max(1, entry.signalCount)),
      visibility: 'aggregate' as const,
    }))
    .sort((left, right) => {
      const byMembers = right.memberCount - left.memberCount
      if (byMembers !== 0) return byMembers
      return left.label.localeCompare(right.label)
    })

  return {
    aggregateSignals,
    redactedPrivateSignalCount,
    memberIdsIncluded: [],
    sourceSignalIdsIncluded: [],
    explanation:
      redactedPrivateSignalCount > 0
        ? 'Aggregates include shared signals only; private member signals are counted but not exposed.'
        : 'Aggregates include shared circle signals only.',
  }
}

export function scoreCircleConsensus(input: {
  candidates: readonly DiscoveryCompareCandidate[]
  actions?: readonly CircleDiscoveryMemberAction[]
  signals?: readonly CircleConsensusSignal[]
  compareContext?: DiscoveryCompareContext
  mode?: CircleDinnerFulfillmentMode
}): CircleConsensusResult {
  const mode = input.mode ?? 'either'
  const aggregation = aggregateCircleSignals(input.signals ?? [])
  const compareScores = new Map(
    buildCompareMatrix(input.candidates, input.compareContext).map((candidate) => [
      candidate.id,
      candidate.score,
    ])
  )

  const candidates = input.candidates
    .map((candidate) => {
      const actionScore = scoreActions(candidate.id, input.actions ?? [])
      const preference = scorePreferences(candidate, aggregation.aggregateSignals)
      const compareScore = compareScores.get(candidate.id) ?? 0
      const fulfillmentFit = getFulfillmentFit(candidate, mode)
      const fulfillmentAdjustment =
        fulfillmentFit === 'strong' ? 2 : fulfillmentFit === 'allowed' ? 0 : -4
      const consensusScore =
        compareScore +
        actionScore +
        preference.score +
        fulfillmentAdjustment -
        preference.vetoedByCount * 20

      return {
        ...candidate,
        consensusScore,
        actionScore,
        preferenceScore: preference.score,
        compareScore,
        vetoedByCount: preference.vetoedByCount,
        hardBlockerLabels: preference.hardBlockerLabels,
        matchedAggregateLabels: preference.matchedAggregateLabels,
        fulfillmentFit,
      }
    })
    .sort((left, right) => right.consensusScore - left.consensusScore)

  return {
    mode,
    candidates,
    aggregation,
    topCandidate: candidates[0] ?? null,
  }
}

export function evaluateCircleDecisionReadiness(input: {
  consensus: CircleConsensusResult
  memberCount: number
  votedMemberIds?: readonly string[]
  minVoteRatio?: number
  budgetSplit?: boolean
}): CircleDecisionReadiness {
  const candidates = input.consensus.candidates
  if (candidates.length === 0) {
    return readiness('no_candidates', 0, 'No candidates yet', false, input.memberCount, [], null)
  }

  const votedCount = new Set(input.votedMemberIds ?? []).size
  const requiredVotes = Math.max(1, Math.ceil(input.memberCount * (input.minVoteRatio ?? 0.6)))
  const missingVoteCount = Math.max(0, requiredVotes - votedCount)
  const top = candidates[0]
  const second = candidates[1]
  const blockerLabels = top.hardBlockerLabels

  if (blockerLabels.length > 0) {
    return readiness(
      'diet_conflict_unresolved',
      35,
      'Diet conflict unresolved',
      false,
      missingVoteCount,
      blockerLabels,
      top.id
    )
  }

  if (input.budgetSplit) {
    return readiness('budget_split', 45, 'Budget split', false, missingVoteCount, [], top.id)
  }

  if (missingVoteCount > 0) {
    return readiness(
      'needs_more_votes',
      50,
      `Needs ${missingVoteCount} more vote${missingVoteCount === 1 ? '' : 's'}`,
      false,
      missingVoteCount,
      [],
      top.id
    )
  }

  const gap = second ? top.consensusScore - second.consensusScore : top.consensusScore
  if (top.consensusScore >= 12 && gap >= 5) {
    return readiness('strong_winner', 95, 'Strong winner', true, 0, [], top.id)
  }

  if (top.consensusScore >= 8) {
    return readiness('enough_signal_to_choose', 80, 'Enough signal to choose', true, 0, [], top.id)
  }

  return readiness('still_exploring', 60, 'Still exploring', false, 0, [], top.id)
}

export function circleConsensusSignalsFromPreferenceLedger(
  signals: readonly PreferenceSignalLedgerEntry[]
): CircleConsensusSignal[] {
  return signals.map((signal) => ({
    memberId: signal.scope.guestId ?? signal.scope.householdMemberId ?? signal.ownerId,
    label: signal.normalizedTerm.displayLabel,
    polarity: signal.polarity,
    strength: signal.strength,
    visibility:
      signal.shareCategory === 'private'
        ? 'private'
        : signal.explicit
          ? 'explicit_shared'
          : 'aggregate_allowed',
    sourceSignalId: signal.id,
  }))
}

function scoreActions(
  candidateId: string,
  actions: readonly CircleDiscoveryMemberAction[]
): number {
  let score = 0
  const memberVotes = new Set<string>()

  for (const action of actions) {
    if (action.candidateId !== candidateId) continue
    if (action.actionType === 'veto_candidate') score -= 20
    if (action.actionType === 'like_candidate') {
      score += 3
      memberVotes.add(action.actorId)
    }
    if (action.actionType === 'shortlist_candidate') score += 2
  }

  return score + memberVotes.size
}

function scorePreferences(
  candidate: DiscoveryCompareCandidate,
  signals: readonly CircleAggregatedSignal[]
): {
  score: number
  vetoedByCount: number
  hardBlockerLabels: string[]
  matchedAggregateLabels: string[]
} {
  let score = 0
  let vetoedByCount = 0
  const hardBlockerLabels: string[] = []
  const matchedAggregateLabels: string[] = []
  const text = candidateText(candidate)

  for (const signal of signals) {
    if (!text.includes(normalizeLabel(signal.label))) continue

    matchedAggregateLabels.push(signal.label)
    const weight = signal.memberCount * signal.averageStrength
    if (signal.polarity === 'like') score += 3 * weight
    if (signal.polarity === 'context') score += 1 * weight
    if (NEGATIVE_POLARITIES.has(signal.polarity)) score -= 4 * weight
    if (HARD_POLARITIES.has(signal.polarity)) {
      vetoedByCount += signal.memberCount
      hardBlockerLabels.push(signal.label)
    }
  }

  return {
    score: round2(score),
    vetoedByCount,
    hardBlockerLabels,
    matchedAggregateLabels,
  }
}

function getFulfillmentFit(
  candidate: DiscoveryCompareCandidate,
  mode: CircleDinnerFulfillmentMode
): CircleConsensusCandidate['fulfillmentFit'] {
  if (mode === 'either') return 'allowed'
  const eatInTypes = new Set(['recipe', 'private_dinner', 'chef', 'menu'])
  const eatOutTypes = new Set(['restaurant', 'open_table'])
  if (mode === 'eat_in') return eatInTypes.has(candidate.type) ? 'strong' : 'weak'
  return eatOutTypes.has(candidate.type) ? 'strong' : 'weak'
}

function candidateText(candidate: DiscoveryCompareCandidate): string {
  return [
    candidate.label,
    candidate.type,
    ...(candidate.cuisineTags ?? []),
    ...(candidate.whyRecommended ?? []),
  ]
    .join(' ')
    .toLowerCase()
}

function readiness(
  status: CircleDecisionReadinessStatus,
  score: number,
  label: string,
  readyToFinalize: boolean,
  missingVoteCount: number,
  blockerLabels: string[],
  topCandidateId: string | null
): CircleDecisionReadiness {
  return {
    status,
    score,
    label,
    readyToFinalize,
    missingVoteCount,
    blockerLabels,
    topCandidateId,
  }
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase()
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
