import type { RemyConstraint } from '@/lib/remy/group-decision-contracts'

export type RemyStuckSignal =
  | 'long_dwell'
  | 'repeated_filters'
  | 'repeated_rejects'
  | 'no_results'
  | 'low_diversity'
  | 'similar_cards'
  | 'no_decision_progress'

export type RemyRecoveryAction =
  | 'fresh_mix'
  | 'reset_current_search'
  | 'start_vote'
  | 'shortlist_two'
  | 'broaden_cuisine'
  | 'widen_radius'
  | 'drop_weak_constraint'
  | 'switch_to_occasion_first'

export type RemyDiscoveryLoopInput = {
  dwellSeconds?: number
  repeatedFilterCount?: number
  rejectCount?: number
  resultCount?: number
  diversityScore?: number
  similarCardCount?: number
  decisionProgressCount?: number
  lastRecoveryAt?: string | null
  now?: string
  lockedConstraints?: readonly RemyConstraint[]
}

export type RemyRecoveryProposal = {
  stuck: boolean
  signals: RemyStuckSignal[]
  actions: RemyRecoveryAction[]
  preservesLockedConstraints: true
  cooldownActive: boolean
  reason: string
}

const RECOVERY_COOLDOWN_MS = 12 * 60 * 1000

export function detectDiscoveryLoop(input: RemyDiscoveryLoopInput): RemyRecoveryProposal {
  const signals: RemyStuckSignal[] = []
  const now = Date.parse(input.now ?? new Date(0).toISOString())
  const lastRecovery = input.lastRecoveryAt ? Date.parse(input.lastRecoveryAt) : Number.NaN
  const cooldownActive =
    Number.isFinite(now) &&
    Number.isFinite(lastRecovery) &&
    now - lastRecovery < RECOVERY_COOLDOWN_MS

  if ((input.dwellSeconds ?? 0) >= 180) signals.push('long_dwell')
  if ((input.repeatedFilterCount ?? 0) >= 3) signals.push('repeated_filters')
  if ((input.rejectCount ?? 0) >= 4) signals.push('repeated_rejects')
  if ((input.resultCount ?? 1) === 0) signals.push('no_results')
  if ((input.diversityScore ?? 1) <= 0.3) signals.push('low_diversity')
  if ((input.similarCardCount ?? 0) >= 4) signals.push('similar_cards')
  if ((input.decisionProgressCount ?? 1) === 0 && signals.length >= 2) {
    signals.push('no_decision_progress')
  }

  const actions = cooldownActive
    ? []
    : recoveryActionsForSignals(signals, input.lockedConstraints ?? [])

  return {
    stuck: signals.length >= 2 || signals.includes('no_results'),
    signals,
    actions,
    preservesLockedConstraints: true,
    cooldownActive,
    reason: cooldownActive
      ? 'A recovery prompt was shown recently, so Remy should stay quiet.'
      : actions.length > 0
        ? 'Discovery appears stuck; propose an optional recovery action.'
        : 'Discovery does not need recovery yet.',
  }
}

export function recordRecoveryOutcome(input: {
  proposal: RemyRecoveryProposal
  accepted: boolean
  helped?: boolean
}): {
  analyticsName: 'remy_discovery_recovery_outcome'
  accepted: boolean
  helped: boolean | null
  signals: RemyStuckSignal[]
  actions: RemyRecoveryAction[]
} {
  return {
    analyticsName: 'remy_discovery_recovery_outcome',
    accepted: input.accepted,
    helped: input.helped ?? null,
    signals: input.proposal.signals,
    actions: input.proposal.actions,
  }
}

function recoveryActionsForSignals(
  signals: readonly RemyStuckSignal[],
  lockedConstraints: readonly RemyConstraint[]
): RemyRecoveryAction[] {
  const lockedFields = new Set(
    lockedConstraints.filter((item) => item.locked).map((item) => item.field)
  )
  const actions: RemyRecoveryAction[] = []

  if (signals.includes('no_results')) actions.push('drop_weak_constraint')
  if (signals.includes('low_diversity') || signals.includes('similar_cards'))
    actions.push('fresh_mix')
  if (signals.includes('repeated_filters')) actions.push('switch_to_occasion_first')
  if (signals.includes('repeated_rejects')) actions.push('shortlist_two')
  if (!lockedFields.has('cuisine') && signals.includes('low_diversity'))
    actions.push('broaden_cuisine')
  if (
    !lockedFields.has('distance') &&
    (signals.includes('no_results') || signals.includes('similar_cards'))
  ) {
    actions.push('widen_radius')
  }
  if (signals.includes('no_decision_progress')) actions.push('start_vote')
  if (actions.length === 0 && signals.length > 0) actions.push('fresh_mix')

  return [...new Set(actions)]
}
