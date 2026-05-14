import type { PreferenceSignalLedgerEntry } from '@/lib/discovery/preference-contract'

export type RemyMemoryScope = 'personal' | 'circle'
export type RemyMemoryProposalStatus = 'pending_confirmation' | 'declined' | 'accepted'

export type RemyMemoryProposal = {
  id: string
  scope: RemyMemoryScope
  statement: string
  source:
    | 'explicit_remember_request'
    | 'post_decision_feedback'
    | 'taste_interview'
    | 'group_summary'
  requiresConfirmation: true
  status: RemyMemoryProposalStatus
  visibleToCircle: boolean
  sourceSignalIds: string[]
}

export type RemyGroupMemorySummary = {
  scope: 'circle'
  labels: string[]
  redactedPrivateSignalCount: number
  sourceSignalIds: string[]
  explanation: string
}

export function createMemoryProposal(input: {
  id?: string
  scope: RemyMemoryScope
  statement: string
  source: RemyMemoryProposal['source']
  sourceSignalIds?: readonly string[]
}): RemyMemoryProposal {
  const statement = input.statement.trim()
  if (!statement) throw new Error('Memory proposal statement is required.')

  return {
    id: input.id ?? `remy-memory:${input.scope}:${slugify(statement)}`,
    scope: input.scope,
    statement,
    source: input.source,
    requiresConfirmation: true,
    status: 'pending_confirmation',
    visibleToCircle: input.scope === 'circle',
    sourceSignalIds: [...(input.sourceSignalIds ?? [])],
  }
}

export function applyMemoryConsent(
  proposal: RemyMemoryProposal,
  consent: 'accept' | 'decline'
): RemyMemoryProposal {
  return {
    ...proposal,
    status: consent === 'accept' ? 'accepted' : 'declined',
  }
}

export function summarizeAllowedGroupMemory(
  signals: readonly PreferenceSignalLedgerEntry[]
): RemyGroupMemorySummary {
  const allowed = signals.filter(
    (signal) =>
      signal.shareCategory !== 'private' &&
      signal.consent.profileUse &&
      signal.reviewState === 'accepted' &&
      signal.metadata.private !== true
  )
  const labels = [...new Set(allowed.map((signal) => signal.normalizedTerm.displayLabel))].slice(
    0,
    8
  )

  return {
    scope: 'circle',
    labels,
    redactedPrivateSignalCount: signals.length - allowed.length,
    sourceSignalIds: allowed.map((signal) => signal.id),
    explanation:
      signals.length === allowed.length
        ? 'Group memory summary uses accepted shared signals.'
        : 'Group memory summary omits private, unreviewed, or non-consented signals.',
  }
}

export function buildPostDecisionFeedbackMemory(input: {
  decisionLabel: string
  outcome: 'win' | 'miss'
  reasons?: readonly string[]
  scope: RemyMemoryScope
}): RemyMemoryProposal {
  const reasons = input.reasons?.filter(Boolean).join(', ')
  const statement =
    input.outcome === 'win'
      ? `${input.decisionLabel} worked${reasons ? ` because ${reasons}` : ''}`
      : `${input.decisionLabel} should be avoided next time${reasons ? ` because ${reasons}` : ''}`

  return createMemoryProposal({
    scope: input.scope,
    statement,
    source: 'post_decision_feedback',
  })
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}
