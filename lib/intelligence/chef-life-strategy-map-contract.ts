export const STRATEGY_SIGNAL_STATES = [
  'aligned',
  'neutral',
  'misaligned',
  'risky',
  'unknown',
] as const

export type StrategySignalState = (typeof STRATEGY_SIGNAL_STATES)[number]

export const STRATEGY_SIGNAL_RANK: Record<StrategySignalState, number> = {
  aligned: 0,
  neutral: 1,
  misaligned: 2,
  risky: 3,
  unknown: 4,
}

export const STRATEGY_REVIEW_CADENCES = [
  'monthly',
  'quarterly',
  'seasonal',
  'annual',
  'ad_hoc',
] as const

export type StrategyReviewCadence = (typeof STRATEGY_REVIEW_CADENCES)[number]

export const STRATEGY_GOAL_AREAS = [
  'client_mix',
  'cuisine_identity',
  'income',
  'capacity_boundary',
  'family_constraint',
  'reputation',
  'geography',
  'new_revenue',
  'values',
  'exit_legacy',
] as const

export type StrategyGoalArea = (typeof STRATEGY_GOAL_AREAS)[number]

export const STRATEGY_CONSTRAINT_KINDS = [
  'family',
  'caregiving',
  'geography',
  'capacity',
  'health',
  'identity',
  'faith',
  'sobriety',
  'travel',
  'schedule',
  'cash_runway',
  'exit_timeline',
] as const

export type StrategyConstraintKind = (typeof STRATEGY_CONSTRAINT_KINDS)[number]

export const STRATEGY_VISIBILITY_LEVELS = [
  'private_only',
  'chef_internal',
  'client_safe_summary',
  'public_safe_summary',
] as const

export type StrategyVisibilityLevel = (typeof STRATEGY_VISIBILITY_LEVELS)[number]

export const STRATEGY_DECISION_SUBJECT_TYPES = [
  'client',
  'inquiry',
  'event',
  'quote',
  'public_profile',
  'pricing_plan',
  'capacity_plan',
  'craft_plan',
  'queue_item',
] as const

export type StrategyDecisionSubjectType = (typeof STRATEGY_DECISION_SUBJECT_TYPES)[number]

export type StrategyConfidence = 'low' | 'medium' | 'high'

export type StrategySourceRef = {
  source:
    | 'manual_chef_input'
    | 'chef_goal'
    | 'goal_snapshot'
    | 'client_contribution'
    | 'capacity_twin'
    | 'public_profile'
    | 'discovery_profile'
    | 'event_history'
    | 'inquiry_history'
    | 'quote_history'
    | 'remy_private_summary'
    | 'chef_preference'
    | 'derived'
  table:
    | 'chef_goals'
    | 'goal_snapshots'
    | 'goal_client_suggestions'
    | 'chef_preferences'
    | 'clients'
    | 'events'
    | 'inquiries'
    | 'quotes'
    | 'chefs'
    | 'discovery_profiles'
    | 'client_notes'
    | 'derived'
  rowId: string | null
}

export type StrategyGoalContract = {
  id: string | null
  tenantId: string
  area: StrategyGoalArea
  label: string
  target: string
  currentSummary: string | null
  horizon: 'season' | 'year' | 'three_year' | 'five_year' | 'legacy'
  state: 'draft' | 'active' | 'paused' | 'met' | 'retired' | 'stale'
  confidence: StrategyConfidence
  visibility: 'private_only'
  sourceRefs: StrategySourceRef[]
}

export type StrategicConstraintContract = {
  tenantId: string
  kind: StrategyConstraintKind
  label: string
  effect: 'prefer' | 'avoid' | 'hard_boundary' | 'soft_boundary' | 'review_required' | 'unknown'
  startsAt: string | null
  endsAt: string | null
  privateNotes: string | null
  visibility: 'private_only'
  sourceRefs: StrategySourceRef[]
}

export type ClientMixTargetContract = {
  tenantId: string
  segment:
    | 'premium_private'
    | 'recurring_household'
    | 'corporate'
    | 'events'
    | 'classes'
    | 'products'
    | 'referral_network'
    | 'local_public'
    | 'custom'
  desiredSharePercent: number | null
  currentSharePercent: number | null
  targetRevenueCents: number | null
  notes: string | null
  visibility: 'private_only'
}

export type LifeStrategyContract = {
  tenantId: string
  chefId: string
  version: number
  horizonLabel: string
  reviewCadence: StrategyReviewCadence
  lastReviewedAt: string | null
  nextReviewAt: string | null
  goals: StrategyGoalContract[]
  constraints: StrategicConstraintContract[]
  clientMixTargets: ClientMixTargetContract[]
  values: string[]
  privateLegacyNotes: string | null
  sourceRefs: StrategySourceRef[]
  visibility: 'private_only'
}

export type StrategySignalFactor = {
  area: StrategyGoalArea
  state: StrategySignalState
  label: string
  explanation: string
  confidence: StrategyConfidence
  sourceRefs: StrategySourceRef[]
  visibility: StrategyVisibilityLevel
}

export type StrategySignalContract = {
  tenantId: string
  subjectType: StrategyDecisionSubjectType
  subjectId: string | null
  state: StrategySignalState
  factors: StrategySignalFactor[]
  unknownAreas: StrategyGoalArea[]
  staleGoalIds: string[]
  confidence: StrategyConfidence
  chefOnlySummary: string
  clientSafeSummary: ClientSafeStrategySummary | null
}

export type StrategyReviewRitualContract = {
  tenantId: string
  cadence: StrategyReviewCadence
  periodStart: string
  periodEnd: string
  promptAreas: StrategyGoalArea[]
  staleGoalIds: string[]
  recommendedQuestions: string[]
  visibility: 'private_only'
}

export type PrivateRemyStrategySummary = {
  tenantId: string
  summary: string
  signalState: StrategySignalState
  sourceRefs: StrategySourceRef[]
  redactedForClient: true
  visibility: 'private_only'
}

export type ClientSafeStrategySummary = {
  headline: string
  allowedReasons: string[]
  blockedPrivateReasonCount: number
  visibility: 'client_safe_summary'
}

const PRIVATE_STRATEGY_LEAK_TERMS = [
  'family',
  'caregiving',
  'caregiver',
  'child',
  'children',
  'spouse',
  'health',
  'medical',
  'identity',
  'faith',
  'sobriety',
  'values',
  'legacy',
  'exit',
  'debt',
  'cash pressure',
  'burnout',
  'private',
] as const

export function deriveMostRestrictiveStrategySignal(
  states: readonly StrategySignalState[]
): StrategySignalState {
  if (states.length === 0) return 'unknown'
  return states.reduce((current, candidate) =>
    STRATEGY_SIGNAL_RANK[candidate] > STRATEGY_SIGNAL_RANK[current] ? candidate : current
  )
}

export function isPrivateStrategyVisibility(visibility: StrategyVisibilityLevel): boolean {
  return visibility === 'private_only' || visibility === 'chef_internal'
}

export function containsPrivateStrategyLeak(value: string): boolean {
  const lower = value.toLowerCase()
  return PRIVATE_STRATEGY_LEAK_TERMS.some((term) => lower.includes(term))
}

export function buildClientSafeStrategySummary(
  signal: StrategySignalContract
): ClientSafeStrategySummary {
  const allowedReasons = signal.factors
    .filter(
      (factor) =>
        factor.visibility === 'client_safe_summary' &&
        !containsPrivateStrategyLeak(factor.label) &&
        !containsPrivateStrategyLeak(factor.explanation)
    )
    .map((factor) => factor.label)
    .slice(0, 3)

  const blockedPrivateReasonCount = signal.factors.length - allowedReasons.length
  const headline =
    signal.state === 'aligned'
      ? 'This looks like a strong fit.'
      : signal.state === 'neutral'
        ? 'This can be reviewed against current priorities.'
        : signal.state === 'unknown'
          ? 'More context is needed before confirming fit.'
          : 'This may need a different scope, timing, or next step.'

  return {
    headline,
    allowedReasons,
    blockedPrivateReasonCount,
    visibility: 'client_safe_summary',
  }
}
