import {
  createPreferenceSignalEntry,
  type PreferencePolarity,
  type PreferenceScope,
  type PreferenceSignalConsent,
  type PreferenceSignalLedgerEntry,
} from '@/lib/discovery/preference-contract'
import type { FoodTaxonomyKind } from '@/lib/discovery/preference-taxonomy'

export type NegativeFeedbackReason =
  | 'generic_hide'
  | 'not_for_me'
  | 'too_expensive'
  | 'too_far'
  | 'wrong_cuisine'
  | 'dietary_issue'
  | 'already_tried'
  | 'poor_timing'
  | 'not_available'
  | 'never_show_again'

export interface NegativeFeedbackInput {
  ownerId: string
  itemId: string
  itemLabel: string
  itemValue?: string
  itemKind?: FoodTaxonomyKind
  reason: NegativeFeedbackReason
  scope?: Partial<PreferenceScope>
  actorId?: string | null
  observedAt?: string
  consent?: Partial<PreferenceSignalConsent>
  metadata?: Record<string, unknown>
}

export interface NegativeFeedbackReasonPolicy {
  reason: NegativeFeedbackReason
  createsPreferenceSignal: boolean
  polarity: PreferencePolarity | null
  reviewRequired: boolean
  hardExclusion: boolean
  rankingPenalty: number
  safetyEscalation: boolean
}

const DEFAULT_FEEDBACK_AT = '1970-01-01T00:00:00.000Z'

const REASON_POLICIES: Record<NegativeFeedbackReason, NegativeFeedbackReasonPolicy> = {
  generic_hide: {
    reason: 'generic_hide',
    createsPreferenceSignal: false,
    polarity: null,
    reviewRequired: false,
    hardExclusion: false,
    rankingPenalty: 0.15,
    safetyEscalation: false,
  },
  not_for_me: {
    reason: 'not_for_me',
    createsPreferenceSignal: true,
    polarity: 'dislike',
    reviewRequired: false,
    hardExclusion: false,
    rankingPenalty: 0.45,
    safetyEscalation: false,
  },
  too_expensive: {
    reason: 'too_expensive',
    createsPreferenceSignal: true,
    polarity: 'context',
    reviewRequired: false,
    hardExclusion: false,
    rankingPenalty: 0.35,
    safetyEscalation: false,
  },
  too_far: {
    reason: 'too_far',
    createsPreferenceSignal: true,
    polarity: 'context',
    reviewRequired: false,
    hardExclusion: false,
    rankingPenalty: 0.3,
    safetyEscalation: false,
  },
  wrong_cuisine: {
    reason: 'wrong_cuisine',
    createsPreferenceSignal: true,
    polarity: 'dislike',
    reviewRequired: false,
    hardExclusion: false,
    rankingPenalty: 0.4,
    safetyEscalation: false,
  },
  dietary_issue: {
    reason: 'dietary_issue',
    createsPreferenceSignal: true,
    polarity: 'restriction',
    reviewRequired: true,
    hardExclusion: false,
    rankingPenalty: 0.8,
    safetyEscalation: true,
  },
  already_tried: {
    reason: 'already_tried',
    createsPreferenceSignal: true,
    polarity: 'context',
    reviewRequired: false,
    hardExclusion: false,
    rankingPenalty: 0.25,
    safetyEscalation: false,
  },
  poor_timing: {
    reason: 'poor_timing',
    createsPreferenceSignal: true,
    polarity: 'context',
    reviewRequired: false,
    hardExclusion: false,
    rankingPenalty: 0.25,
    safetyEscalation: false,
  },
  not_available: {
    reason: 'not_available',
    createsPreferenceSignal: false,
    polarity: null,
    reviewRequired: false,
    hardExclusion: false,
    rankingPenalty: 0.2,
    safetyEscalation: false,
  },
  never_show_again: {
    reason: 'never_show_again',
    createsPreferenceSignal: true,
    polarity: 'never_show',
    reviewRequired: false,
    hardExclusion: true,
    rankingPenalty: 1,
    safetyEscalation: false,
  },
}

export function getNegativeFeedbackReasonPolicy(
  reason: NegativeFeedbackReason
): NegativeFeedbackReasonPolicy {
  return REASON_POLICIES[reason]
}

export function createNegativeFeedbackPreferenceSignal(
  input: NegativeFeedbackInput
): PreferenceSignalLedgerEntry | null {
  const policy = getNegativeFeedbackReasonPolicy(input.reason)
  if (!policy.createsPreferenceSignal || !policy.polarity) return null

  return createPreferenceSignalEntry({
    ownerId: input.ownerId,
    scope: input.scope,
    domain: 'discovery',
    source: 'discovery_interaction',
    actorId: input.actorId ?? null,
    actorType: 'client',
    rawValue: input.itemValue ?? input.itemLabel,
    kind: kindForReason(input.reason, input.itemKind),
    polarity: policy.polarity,
    strength: policy.hardExclusion ? 1 : policy.rankingPenalty,
    confidence: policy.reviewRequired ? 0.5 : 0.76,
    explicit: input.reason === 'never_show_again',
    reviewState: policy.reviewRequired ? 'pending_review' : 'accepted',
    consent: {
      profileUse: true,
      chefSharing: false,
      analyticsUse: false,
      ...(input.consent ?? {}),
    },
    shareCategory: policy.safetyEscalation ? 'chef_visible' : 'private',
    observedAt: input.observedAt ?? DEFAULT_FEEDBACK_AT,
    metadata: {
      feedbackReason: input.reason,
      itemId: input.itemId,
      itemLabel: input.itemLabel,
      hardExclusion: policy.hardExclusion,
      safetyEscalation: policy.safetyEscalation,
      ...(input.metadata ?? {}),
    },
  })
}

function kindForReason(
  reason: NegativeFeedbackReason,
  fallback: FoodTaxonomyKind | undefined
): FoodTaxonomyKind {
  if (reason === 'too_expensive') return 'budget'
  if (reason === 'wrong_cuisine') return 'cuisine'
  if (reason === 'dietary_issue') return fallback ?? 'dietary'
  return fallback ?? 'tag'
}
