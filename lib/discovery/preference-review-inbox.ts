import {
  createPreferenceSignalEntry,
  type PreferenceReviewState,
  type PreferenceSignalLedgerEntry,
} from '@/lib/discovery/preference-contract'

export type PreferenceReviewDecision = 'accept' | 'reject' | 'ignore' | 'never_ask_again'

export interface PreferenceReviewDecisionRecord {
  suggestionId: string
  decision: PreferenceReviewDecision
  decidedAt: string
  actorId: string | null
  nextReviewState: PreferenceReviewState
  suppressUntil: string | null
  neverAskAgain: boolean
  promotedSignalId: string | null
}

export interface PreferenceReviewDecisionResult {
  decision: PreferenceReviewDecisionRecord
  suggestion: PreferenceSignalLedgerEntry
  promotedSignal: PreferenceSignalLedgerEntry | null
}

export interface PreferenceReviewDecisionOptions {
  actorId?: string | null
  decidedAt?: string
  ignoreDays?: number
}

const DEFAULT_DECIDED_AT = '1970-01-01T00:00:00.000Z'

export function applyPreferenceReviewDecision(
  suggestion: PreferenceSignalLedgerEntry,
  decision: PreferenceReviewDecision,
  options: PreferenceReviewDecisionOptions = {}
): PreferenceReviewDecisionResult {
  const decidedAt = normalizeTimestamp(options.decidedAt ?? DEFAULT_DECIDED_AT)
  const nextReviewState = reviewStateForDecision(decision)
  const suppressUntil = decision === 'ignore' ? addDays(decidedAt, options.ignoreDays ?? 30) : null
  const promotedSignal =
    decision === 'accept'
      ? promoteReviewedSuggestion(suggestion, options.actorId ?? null, decidedAt)
      : null
  const reviewedSuggestion = {
    ...suggestion,
    reviewState: nextReviewState,
    metadata: {
      ...suggestion.metadata,
      reviewDecision: decision,
      reviewedAt: decidedAt,
      suppressUntil,
      neverAskAgain: decision === 'never_ask_again',
      promotedSignalId: promotedSignal?.id ?? null,
    },
  }

  return {
    decision: {
      suggestionId: suggestion.id,
      decision,
      decidedAt,
      actorId: options.actorId ?? null,
      nextReviewState,
      suppressUntil,
      neverAskAgain: decision === 'never_ask_again',
      promotedSignalId: promotedSignal?.id ?? null,
    },
    suggestion: reviewedSuggestion,
    promotedSignal,
  }
}

export function filterReviewInboxSuggestions(
  suggestions: PreferenceSignalLedgerEntry[],
  options: { now?: string; includeIgnored?: boolean } = {}
): PreferenceSignalLedgerEntry[] {
  const now = Date.parse(normalizeTimestamp(options.now ?? DEFAULT_DECIDED_AT))

  return suggestions
    .filter((suggestion) => suggestion.reviewState === 'pending_review')
    .filter((suggestion) => !suggestion.explicit)
    .filter((suggestion) => {
      if (suggestion.metadata.neverAskAgain === true) return false
      if (options.includeIgnored) return true

      const suppressUntil = suggestion.metadata.suppressUntil
      if (typeof suppressUntil !== 'string') return true

      return Date.parse(suppressUntil) <= now
    })
    .sort((left, right) => {
      const byConfidence = right.confidence - left.confidence
      if (byConfidence !== 0) return byConfidence
      return Date.parse(right.observedAt) - Date.parse(left.observedAt)
    })
}

function promoteReviewedSuggestion(
  suggestion: PreferenceSignalLedgerEntry,
  actorId: string | null,
  decidedAt: string
): PreferenceSignalLedgerEntry {
  return createPreferenceSignalEntry({
    id: `${suggestion.id}:accepted`,
    ownerId: suggestion.ownerId,
    scope: suggestion.scope,
    domain: suggestion.domain,
    source: 'user_entered',
    actorId,
    actorType: 'client',
    rawValue: suggestion.rawValue,
    kind: suggestion.normalizedTerm.kind,
    polarity: suggestion.polarity,
    strength: suggestion.strength,
    confidence: Math.max(0.9, suggestion.confidence),
    explicit: true,
    reviewState: 'accepted',
    consent: suggestion.consent,
    shareCategory: suggestion.shareCategory,
    observedAt: decidedAt,
    createdAt: decidedAt,
    supersedesSignalIds: [suggestion.id],
    metadata: {
      acceptedFromSuggestionId: suggestion.id,
      acceptedFromSource: suggestion.source,
      acceptedFromConfidence: suggestion.confidence,
    },
  })
}

function reviewStateForDecision(decision: PreferenceReviewDecision): PreferenceReviewState {
  if (decision === 'accept') return 'superseded'
  if (decision === 'ignore') return 'pending_review'
  return 'rejected'
}

function addDays(isoTimestamp: string, days: number): string {
  const date = new Date(isoTimestamp)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString()
}

function normalizeTimestamp(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? DEFAULT_DECIDED_AT : date.toISOString()
}
