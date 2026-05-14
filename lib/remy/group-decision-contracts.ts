import type { DiscoveryCompareCandidate } from '@/lib/discovery/compare-contracts'
import type { PreferenceSignalLedgerEntry } from '@/lib/discovery/preference-contract'

export type RemyDiscoveryContextMode = 'personal' | 'circle' | 'ambiguous'
export type RemyCircleRole = 'host' | 'admin' | 'member' | 'guest' | 'non_member'

export type RemyContextGuardrailDecision = {
  mode: RemyDiscoveryContextMode
  allowed: boolean
  requiresConfirmation: boolean
  reason: string
  visibleLabel: string
  privacyBoundary: 'personal_only' | 'circle_shared' | 'blocked'
}

export type RemyDecisionMechanic =
  | 'poll'
  | 'ranked_vote'
  | 'veto_round'
  | 'everyone_pick_two'
  | 'host_top_three'
  | 'missing_vote_reminder'
  | 'dietary_concern_check'
  | 'final_preference_prompt'

export type RemyGroupDecisionState = {
  candidateCount: number
  memberCount: number
  votedMemberIds?: readonly string[]
  blockerCount?: number
  dietaryConcernCount?: number
  hostRequestedFinalCall?: boolean
  decisionPressure?: 'low' | 'normal' | 'high'
  actorRole: RemyCircleRole
}

export type RemyGroupDecisionProposal = {
  mechanic: RemyDecisionMechanic
  requiresConfirmation: boolean
  allowed: boolean
  reason: string
  hostOnly: boolean
  suggestedAction:
    | 'create_poll'
    | 'create_ranked_vote'
    | 'ask_for_vetoes'
    | 'ask_each_member_for_two'
    | 'summarize_top_three'
    | 'remind_missing_voters'
    | 'check_dietary_blockers'
    | 'ask_for_final_preference'
    | 'none'
}

export type RemyConstraintField =
  | 'date'
  | 'budget'
  | 'distance'
  | 'dietary'
  | 'cuisine'
  | 'headcount'
  | 'occasion'
  | 'service_format'

export type RemyConstraintOperation = 'lock' | 'unlock' | 'veto'

export type RemyConstraint = {
  field: RemyConstraintField
  value: string
  locked: boolean
  source: 'user' | 'circle' | 'remy'
  reusable: boolean
}

export type RemyConstraintIntent = {
  operation: RemyConstraintOperation
  field: RemyConstraintField
  value: string
  reusable: boolean
  requiresConfirmation: boolean
}

export type RemyConstraintResolution = {
  constraints: RemyConstraint[]
  vetoes: RemyConstraint[]
  blockedRelaxations: RemyConstraint[]
}

export type SharedPreferenceVisibility = 'explicit_shared' | 'aggregate_allowed' | 'private'

export type SharedPreferenceSignal = {
  memberId: string
  label: string
  polarity: 'like' | 'dislike' | 'restriction' | 'allergy' | 'never_show' | 'context'
  visibility: SharedPreferenceVisibility
  sourceSignalId?: string
}

export type RemyPreferenceNegotiationResult = {
  overlapLabels: string[]
  conflictLabels: string[]
  redactedPrivateSignalCount: number
  compromiseCandidateIds: string[]
  explanation: string
}

export type RemyScenarioOverlay<TState> = {
  id: string
  label: string
  activeState: TState
  scenarioState: TState
  mutatesActiveState: false
  requiresConfirmationToApply: true
  changedKeys: string[]
}

export type RemyOccasion =
  | 'anniversary'
  | 'birthday'
  | 'client_dinner'
  | 'casual_hang'
  | 'work_dinner'
  | 'post_show'

export type RemyOccasionWeights = {
  occasion: RemyOccasion
  reliability: number
  novelty: number
  formality: number
  dietaryRisk: number
  budgetSensitivity: number
  travelTolerance: number
  decisionPace: number
}

export type RemyTasteInterviewAnswer = {
  key: 'novelty' | 'formality' | 'budget' | 'dietary' | 'analogy'
  value: string
}

export type RemyTasteInterviewStep = {
  complete: boolean
  question: string | null
  proposalTags: string[]
  memoryRequiresConsent: boolean
}

const CIRCLE_WORDS = /\b(we|us|our|circle|group|everyone|maya|alex|guests?)\b/i
const PERSONAL_WORDS = /\b(i|me|my|mine|personal|for myself)\b/i
const CIRCLE_ACTION_WORDS = /\b(apply to circle|share with circle|for everyone|group rail)\b/i

export function decideRemyDiscoveryContext(input: {
  message: string
  currentMode?: RemyDiscoveryContextMode
  circleId?: string | null
  actorRole?: RemyCircleRole
  hasCircleMembership?: boolean
}): RemyContextGuardrailDecision {
  const message = input.message.trim()
  const role = input.actorRole ?? (input.hasCircleMembership ? 'member' : 'non_member')
  const wantsCircle = CIRCLE_ACTION_WORDS.test(message) || CIRCLE_WORDS.test(message)
  const wantsPersonal = PERSONAL_WORDS.test(message)
  const inferredMode: RemyDiscoveryContextMode =
    wantsCircle && wantsPersonal
      ? 'ambiguous'
      : wantsCircle
        ? 'circle'
        : wantsPersonal
          ? 'personal'
          : (input.currentMode ?? 'ambiguous')

  if (inferredMode === 'circle' && (!input.circleId || role === 'non_member')) {
    return {
      mode: 'circle',
      allowed: false,
      requiresConfirmation: false,
      reason: 'Circle changes require an active circle membership.',
      visibleLabel: 'Circle blocked',
      privacyBoundary: 'blocked',
    }
  }

  if (inferredMode === 'ambiguous') {
    return {
      mode: 'ambiguous',
      allowed: false,
      requiresConfirmation: true,
      reason: 'Remy needs to know whether this applies to personal discovery or the shared circle.',
      visibleLabel: 'Choose personal or circle',
      privacyBoundary: 'blocked',
    }
  }

  if (inferredMode === 'circle') {
    return {
      mode: 'circle',
      allowed: true,
      requiresConfirmation: !CIRCLE_ACTION_WORDS.test(message),
      reason: CIRCLE_ACTION_WORDS.test(message)
        ? 'The request explicitly targets the shared circle.'
        : 'Circle state is shared, so Remy should confirm before applying it.',
      visibleLabel: 'Circle discovery',
      privacyBoundary: 'circle_shared',
    }
  }

  return {
    mode: 'personal',
    allowed: true,
    requiresConfirmation: false,
    reason: 'The request stays in personal discovery state.',
    visibleLabel: 'Personal discovery',
    privacyBoundary: 'personal_only',
  }
}

export function proposeGroupDecisionMechanic(
  state: RemyGroupDecisionState
): RemyGroupDecisionProposal {
  const hostOnly = state.actorRole === 'host' || state.actorRole === 'admin'
  const votedCount = state.votedMemberIds?.length ?? 0
  const missingVotes = Math.max(0, state.memberCount - votedCount)
  const base = {
    requiresConfirmation: true,
    allowed: true,
    hostOnly: false,
  }

  if (state.actorRole === 'non_member') {
    return {
      mechanic: 'poll',
      requiresConfirmation: false,
      allowed: false,
      hostOnly: true,
      reason: 'Only circle members can move a shared decision forward.',
      suggestedAction: 'none',
    }
  }

  if ((state.dietaryConcernCount ?? 0) > 0) {
    return {
      ...base,
      mechanic: 'dietary_concern_check',
      reason: 'Dietary concerns should be cleared before ranking options.',
      suggestedAction: 'check_dietary_blockers',
    }
  }

  if ((state.blockerCount ?? 0) > 0) {
    return {
      ...base,
      mechanic: 'veto_round',
      reason: 'Known blockers call for a veto pass before narrowing the list.',
      suggestedAction: 'ask_for_vetoes',
    }
  }

  if (missingVotes > 0 && votedCount > 0) {
    return {
      ...base,
      mechanic: 'missing_vote_reminder',
      reason: `${missingVotes} member${missingVotes === 1 ? '' : 's'} have not weighed in yet.`,
      suggestedAction: 'remind_missing_voters',
    }
  }

  if (state.hostRequestedFinalCall || state.decisionPressure === 'high') {
    return {
      ...base,
      mechanic: 'host_top_three',
      hostOnly: true,
      allowed: hostOnly,
      reason: hostOnly
        ? 'A host top-three summary can compress the choice without auto-booking.'
        : 'Only a host or admin can make the final shared call.',
      suggestedAction: hostOnly ? 'summarize_top_three' : 'none',
    }
  }

  if (state.candidateCount > 6) {
    return {
      ...base,
      mechanic: 'everyone_pick_two',
      reason: 'The list is still broad; asking each member for two picks creates signal quickly.',
      suggestedAction: 'ask_each_member_for_two',
    }
  }

  if (state.candidateCount >= 3) {
    return {
      ...base,
      mechanic: 'ranked_vote',
      reason: 'A short list is ready for ranked voting.',
      suggestedAction: 'create_ranked_vote',
    }
  }

  return {
    ...base,
    mechanic: 'final_preference_prompt',
    reason: 'There are few enough candidates to ask for a final preference.',
    suggestedAction: 'ask_for_final_preference',
  }
}

export function parseConstraintIntent(message: string): RemyConstraintIntent | null {
  const normalized = message.trim().toLowerCase()
  const operation: RemyConstraintOperation | null = /\b(unlock|relax|remove lock)\b/.test(
    normalized
  )
    ? 'unlock'
    : /\b(no|not|never|too far|veto|avoid|don't show)\b/.test(normalized)
      ? 'veto'
      : /\b(lock|non-negotiable|do not change|don't change|must keep)\b/.test(normalized)
        ? 'lock'
        : null
  if (!operation) return null

  const field = inferConstraintField(normalized)
  if (!field) return null

  return {
    operation,
    field,
    value: extractConstraintValue(normalized, field),
    reusable: /\b(always|remember|from now on|reusable)\b/.test(normalized),
    requiresConfirmation:
      operation === 'lock' || /\bremember|always|from now on\b/.test(normalized),
  }
}

export function resolveConstraints(input: {
  existing: readonly RemyConstraint[]
  intents: readonly RemyConstraintIntent[]
  proposedRelaxations?: Partial<Record<RemyConstraintField, string | null>>
}): RemyConstraintResolution {
  let constraints = [...input.existing]
  const vetoes: RemyConstraint[] = []

  for (const intent of input.intents) {
    if (intent.operation === 'unlock') {
      constraints = constraints.map((constraint) =>
        constraint.field === intent.field &&
        (!intent.value || constraint.value.toLowerCase().includes(intent.value.toLowerCase()))
          ? { ...constraint, locked: false }
          : constraint
      )
      continue
    }

    const constraint: RemyConstraint = {
      field: intent.field,
      value: intent.value,
      locked: intent.operation === 'lock',
      source: 'user',
      reusable: intent.reusable,
    }

    if (intent.operation === 'veto') vetoes.push(constraint)
    else constraints = upsertConstraint(constraints, constraint)
  }

  const blockedRelaxations = constraints.filter((constraint) => {
    if (!constraint.locked) return false
    const proposed = input.proposedRelaxations?.[constraint.field]
    return proposed !== undefined && proposed !== null && proposed !== constraint.value
  })

  return { constraints, vetoes, blockedRelaxations }
}

export function negotiateSharedPreferences(input: {
  signals: readonly SharedPreferenceSignal[]
  candidates: readonly DiscoveryCompareCandidate[]
}): RemyPreferenceNegotiationResult {
  const visible = input.signals.filter((signal) => signal.visibility !== 'private')
  const privateCount = input.signals.length - visible.length
  const likes = visible.filter((signal) => signal.polarity === 'like')
  const blockers = visible.filter((signal) =>
    ['restriction', 'allergy', 'never_show'].includes(signal.polarity)
  )
  const dislikes = visible.filter((signal) => signal.polarity === 'dislike')

  const likeCounts = countByLabel(likes)
  const overlapLabels = [...likeCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([label]) => label)
  const conflictLabels = [...new Set([...blockers, ...dislikes].map((signal) => signal.label))]

  const compromiseCandidateIds = input.candidates
    .map((candidate) => ({
      id: candidate.id,
      score: scoreCompromiseCandidate(candidate, overlapLabels, conflictLabels),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((candidate) => candidate.id)
    .slice(0, 3)

  return {
    overlapLabels,
    conflictLabels,
    redactedPrivateSignalCount: privateCount,
    compromiseCandidateIds,
    explanation:
      privateCount > 0
        ? 'Summary uses shared and aggregate signals only; private member details are redacted.'
        : 'Summary uses shared signals available to this circle.',
  }
}

export function buildScenarioOverlay<TState extends Record<string, unknown>>(input: {
  id: string
  label: string
  activeState: TState
  patch: Partial<TState>
}): RemyScenarioOverlay<TState> {
  return {
    id: input.id,
    label: input.label,
    activeState: input.activeState,
    scenarioState: { ...input.activeState, ...input.patch },
    mutatesActiveState: false,
    requiresConfirmationToApply: true,
    changedKeys: Object.keys(input.patch),
  }
}

export function getOccasionWeights(occasion: RemyOccasion): RemyOccasionWeights {
  const base: RemyOccasionWeights = {
    occasion,
    reliability: 0.6,
    novelty: 0.4,
    formality: 0.4,
    dietaryRisk: 0.7,
    budgetSensitivity: 0.5,
    travelTolerance: 0.5,
    decisionPace: 0.5,
  }

  const overrides: Record<RemyOccasion, Partial<RemyOccasionWeights>> = {
    anniversary: { reliability: 0.85, novelty: 0.65, formality: 0.75, decisionPace: 0.35 },
    birthday: { reliability: 0.75, novelty: 0.6, formality: 0.45, decisionPace: 0.55 },
    client_dinner: {
      reliability: 0.95,
      novelty: 0.25,
      formality: 0.85,
      dietaryRisk: 0.95,
      budgetSensitivity: 0.35,
    },
    casual_hang: { reliability: 0.55, novelty: 0.5, formality: 0.2, budgetSensitivity: 0.75 },
    work_dinner: { reliability: 0.9, novelty: 0.3, formality: 0.75, dietaryRisk: 0.85 },
    post_show: { reliability: 0.75, novelty: 0.35, travelTolerance: 0.25, decisionPace: 0.9 },
  }

  return { ...base, ...overrides[occasion] }
}

export function nextTasteInterviewStep(
  answers: readonly RemyTasteInterviewAnswer[],
  hardConstraints: readonly string[] = []
): RemyTasteInterviewStep {
  const answered = new Set(answers.map((answer) => answer.key))
  if (!answered.has('dietary') && hardConstraints.length === 0) {
    return {
      complete: false,
      question: 'Any hard dietary rules I should keep fixed?',
      proposalTags: [],
      memoryRequiresConsent: false,
    }
  }
  if (!answered.has('novelty')) {
    return {
      complete: false,
      question: 'Should this feel familiar, surprising, or somewhere in between?',
      proposalTags: [],
      memoryRequiresConsent: false,
    }
  }
  if (!answered.has('formality')) {
    return {
      complete: false,
      question: 'More casual, polished, or omakase-style but relaxed?',
      proposalTags: [],
      memoryRequiresConsent: false,
    }
  }

  return {
    complete: true,
    question: null,
    proposalTags: [
      ...hardConstraints,
      ...answers.map((answer) => `${answer.key}:${answer.value.trim().toLowerCase()}`),
    ].filter(Boolean),
    memoryRequiresConsent: true,
  }
}

export function sharedPreferenceSignalsFromLedger(
  signals: readonly PreferenceSignalLedgerEntry[]
): SharedPreferenceSignal[] {
  return signals.map((signal) => ({
    memberId: signal.scope.guestId ?? signal.scope.householdMemberId ?? signal.ownerId,
    label: signal.normalizedTerm.displayLabel,
    polarity: signal.polarity,
    visibility:
      signal.shareCategory === 'private'
        ? 'private'
        : signal.explicit
          ? 'explicit_shared'
          : 'aggregate_allowed',
    sourceSignalId: signal.id,
  }))
}

function inferConstraintField(value: string): RemyConstraintField | null {
  if (
    /\b(friday|saturday|sunday|monday|tuesday|wednesday|thursday|date|tonight|tomorrow)\b/.test(
      value
    )
  )
    return 'date'
  if (/\b(budget|price|under|over|\$|expensive|cheap)\b/.test(value)) return 'budget'
  if (/\b(distance|radius|miles|far|near)\b/.test(value)) return 'distance'
  if (/\b(vegetarian|vegan|gluten|allergy|allergen|dietary|kosher|halal)\b/.test(value))
    return 'dietary'
  if (/\b(sushi|italian|thai|korean|mexican|cuisine)\b/.test(value)) return 'cuisine'
  if (/\b(headcount|people|guests|party)\b/.test(value)) return 'headcount'
  if (/\b(occasion|birthday|anniversary|client|work)\b/.test(value)) return 'occasion'
  if (/\b(private chef|restaurant|delivery|pickup|eat in|eat out)\b/.test(value))
    return 'service_format'
  return null
}

function extractConstraintValue(message: string, field: RemyConstraintField): string {
  if (field === 'budget') {
    const budget = message.match(/\$?\d+[\w\s-]*/)
    return budget?.[0]?.trim() ?? 'budget'
  }
  if (field === 'distance') {
    const distance = message.match(/\d+\s*(mile|miles|mi)\b/)
    return distance?.[0]?.trim() ?? (message.includes('too far') ? 'too far' : 'distance')
  }
  const known = message.match(
    /\b(friday|saturday|sunday|vegetarian|vegan|gluten free|sushi|italian|thai|korean|mexican|birthday|anniversary|client dinner|work dinner|restaurant|private chef)\b/
  )
  return known?.[0]?.trim() ?? field
}

function upsertConstraint(constraints: RemyConstraint[], next: RemyConstraint): RemyConstraint[] {
  const index = constraints.findIndex((constraint) => constraint.field === next.field)
  if (index < 0) return [...constraints, next]
  return constraints.map((constraint, currentIndex) => (currentIndex === index ? next : constraint))
}

function countByLabel(signals: readonly SharedPreferenceSignal[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const signal of signals) counts.set(signal.label, (counts.get(signal.label) ?? 0) + 1)
  return counts
}

function scoreCompromiseCandidate(
  candidate: DiscoveryCompareCandidate,
  overlaps: readonly string[],
  conflicts: readonly string[]
): number {
  const text = [
    candidate.label,
    ...(candidate.cuisineTags ?? []),
    ...(candidate.whyRecommended ?? []),
  ]
    .join(' ')
    .toLowerCase()
  const overlapScore = overlaps.filter((label) => text.includes(label.toLowerCase())).length * 3
  const conflictPenalty = conflicts.filter((label) => text.includes(label.toLowerCase())).length * 4
  const confidence = Math.round((candidate.confidence ?? 0.5) * 2)
  return overlapScore + confidence - conflictPenalty
}
