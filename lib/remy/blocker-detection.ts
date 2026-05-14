import {
  buildCompareMatrix,
  type DiscoveryCompareCandidate,
  type DiscoveryCompareContext,
} from '@/lib/discovery/compare-contracts'
import type { RemyBudgetFit } from '@/lib/remy/budget-realism'
import type { RemyDietarySafetyTriage } from '@/lib/remy/safety-triage'
import type { RemyResearchGap } from '@/lib/remy/source-research-proposals'

export type RemyDecisionBlockerType =
  | 'missing_votes'
  | 'dietary_conflict'
  | 'dietary_confirmation'
  | 'budget_mismatch'
  | 'weak_budget_proof'
  | 'location_disagreement'
  | 'no_date'
  | 'weak_data'
  | 'stale_shortlist'
  | 'too_many_candidates'
  | 'too_few_candidates'
  | 'group_size'

export type RemyDecisionBlocker = {
  type: RemyDecisionBlockerType
  severity: 'blocker' | 'warning'
  label: string
  candidateId?: string
  nextAction: string
}

export type RemyBlockerCandidateState = {
  candidate: DiscoveryCompareCandidate
  budgetFit?: RemyBudgetFit | null
  dietaryTriage?: RemyDietarySafetyTriage | null
  sourceGaps?: RemyResearchGap[]
}

export function buildRemyCompareSummary(input: {
  candidates: readonly DiscoveryCompareCandidate[]
  context?: DiscoveryCompareContext
}): {
  rows: ReturnType<typeof buildCompareMatrix>
  strongestCandidateId: string | null
  proofWarnings: string[]
} {
  const rows = buildCompareMatrix(input.candidates, input.context)
  const strongest = rows.slice().sort((left, right) => right.score - left.score)[0] ?? null
  const proofWarnings = rows.flatMap((row) =>
    row.signals
      .filter((signal) => signal.status === 'weak' || signal.status === 'missing')
      .map((signal) => `${row.label}: ${signal.label} is ${signal.status}.`)
  )

  return {
    rows,
    strongestCandidateId: strongest?.id ?? null,
    proofWarnings,
  }
}

export function detectRemyDecisionBlockers(input: {
  candidates: readonly RemyBlockerCandidateState[]
  group?: {
    expectedVotes?: number
    receivedVotes?: number
    locationDisagreement?: boolean
    dateSelected?: boolean
    requestedGroupSize?: number | null
    shortlistUpdatedAt?: string | Date | null
    currentAt?: string | Date
  }
  maxShortlistSize?: number
}): RemyDecisionBlocker[] {
  const blockers: RemyDecisionBlocker[] = []
  const maxShortlistSize = input.maxShortlistSize ?? 4

  if (input.candidates.length === 0) {
    blockers.push(
      blocker(
        'too_few_candidates',
        'blocker',
        'No candidates are ready to compare.',
        'Add or recover at least one candidate.'
      )
    )
  }
  if (input.candidates.length > maxShortlistSize) {
    blockers.push(
      blocker(
        'too_many_candidates',
        'warning',
        'Too many candidates are still active.',
        'Narrow the shortlist before deciding.'
      )
    )
  }

  const group = input.group
  if (group) {
    if ((group.receivedVotes ?? 0) < (group.expectedVotes ?? 0)) {
      blockers.push(
        blocker(
          'missing_votes',
          'warning',
          'Some group votes are missing.',
          'Ask the remaining diners to vote or choose a host override.'
        )
      )
    }
    if (group.locationDisagreement) {
      blockers.push(
        blocker(
          'location_disagreement',
          'warning',
          'The group has not aligned on location.',
          'Choose a radius or neighborhood before ranking.'
        )
      )
    }
    if (group.dateSelected === false) {
      blockers.push(
        blocker(
          'no_date',
          'blocker',
          'No dinner date is selected.',
          'Pick a date before trusting availability.'
        )
      )
    }
    if (isStale(group.shortlistUpdatedAt, group.currentAt)) {
      blockers.push(
        blocker(
          'stale_shortlist',
          'warning',
          'The shortlist may be stale.',
          'Refresh candidates before making a final call.'
        )
      )
    }
  }

  for (const state of input.candidates) {
    const candidate = state.candidate
    if (
      group?.requestedGroupSize &&
      candidate.supportsGroupSize !== null &&
      candidate.supportsGroupSize !== undefined &&
      candidate.supportsGroupSize < group.requestedGroupSize
    ) {
      blockers.push(
        blocker(
          'group_size',
          'blocker',
          `${candidate.label} may not fit the group size.`,
          'Confirm capacity or remove it from the shortlist.',
          candidate.id
        )
      )
    }
    if (state.dietaryTriage?.label === 'do_not_recommend') {
      blockers.push(
        blocker(
          'dietary_conflict',
          'blocker',
          `${candidate.label} has a dietary safety conflict.`,
          'Do not recommend it unless the hard constraint changes.',
          candidate.id
        )
      )
    } else if (state.dietaryTriage?.label === 'needs_confirmation') {
      blockers.push(
        blocker(
          'dietary_confirmation',
          'warning',
          `${candidate.label} needs dietary confirmation.`,
          state.dietaryTriage.confirmationQuestions[0] ??
            'Ask the operator to confirm dietary safety.',
          candidate.id
        )
      )
    }
    if (state.budgetFit?.status === 'does_not_fit') {
      blockers.push(
        blocker(
          'budget_mismatch',
          'blocker',
          `${candidate.label} does not fit the budget.`,
          'Adjust the budget or remove this candidate.',
          candidate.id
        )
      )
    } else if (
      state.budgetFit &&
      !state.budgetFit.canClaimAllInFit &&
      state.budgetFit.warnings.length > 0
    ) {
      blockers.push(
        blocker(
          'weak_budget_proof',
          'warning',
          `${candidate.label} has weak budget proof.`,
          'Verify current prices and fees before claiming fit.',
          candidate.id
        )
      )
    }
    if ((state.sourceGaps ?? []).some((gap) => gap.severity === 'blocker')) {
      blockers.push(
        blocker(
          'weak_data',
          'blocker',
          `${candidate.label} is missing source proof.`,
          'Run approved source research before promotion.',
          candidate.id
        )
      )
    } else if ((state.sourceGaps ?? []).length > 0) {
      blockers.push(
        blocker(
          'weak_data',
          'warning',
          `${candidate.label} has weak or stale source proof.`,
          'Offer a source upgrade before shortlisting with confidence.',
          candidate.id
        )
      )
    }
  }

  return dedupeBlockers(blockers)
}

function isStale(
  value: string | Date | null | undefined,
  currentAt: string | Date | undefined
): boolean {
  if (!value) return false
  const current = currentAt ? new Date(currentAt) : new Date()
  const updated = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(current.getTime()) || Number.isNaN(updated.getTime())) return false
  return current.getTime() - updated.getTime() > 7 * 24 * 60 * 60 * 1000
}

function blocker(
  type: RemyDecisionBlockerType,
  severity: RemyDecisionBlocker['severity'],
  label: string,
  nextAction: string,
  candidateId?: string
): RemyDecisionBlocker {
  return { type, severity, label, nextAction, candidateId }
}

function dedupeBlockers(blockers: RemyDecisionBlocker[]): RemyDecisionBlocker[] {
  const seen = new Set<string>()
  return blockers.filter((item) => {
    const key = `${item.type}:${item.candidateId ?? 'global'}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
