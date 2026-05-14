import {
  createPreferenceSignalEntry,
  type PreferencePolarity,
  type PreferenceReviewState,
  type PreferenceSignalLedgerEntry,
} from '@/lib/discovery/preference-contract'
import type { FoodTaxonomyKind } from '@/lib/discovery/preference-taxonomy'
import type { CulinaryProfileShareCategory } from '@/lib/discovery/profile-sharing-contracts'

export type CulinaryProfileDiscoveryOutcomeType =
  | 'chose'
  | 'skipped'
  | 'liked'
  | 'not_again'
  | 'add_to_profile'
  | 'hide_from_chef'

export interface CulinaryProfileDiscoveryOutcome {
  id: string
  ownerId: string
  itemId: string
  itemLabel: string
  itemKind?: FoodTaxonomyKind
  outcome: CulinaryProfileDiscoveryOutcomeType
  occurredAt: string
  sessionId?: string | null
  actorId?: string | null
  surface?: 'homepage' | 'eat' | 'chef_profile' | 'meal_board' | 'unknown'
}

export interface CulinaryProfileOutcomeMapping {
  decision: CulinaryProfileDiscoveryOutcome
  signals: PreferenceSignalLedgerEntry[]
}

const OUTCOME_CONFIDENCE: Record<CulinaryProfileDiscoveryOutcomeType, number> = {
  chose: 0.78,
  skipped: 0.32,
  liked: 0.86,
  not_again: 0.94,
  add_to_profile: 0.9,
  hide_from_chef: 0.98,
}

function outcomePolarity(outcome: CulinaryProfileDiscoveryOutcomeType): PreferencePolarity {
  switch (outcome) {
    case 'not_again':
      return 'dislike'
    case 'hide_from_chef':
      return 'never_show'
    case 'skipped':
      return 'context'
    case 'chose':
    case 'liked':
    case 'add_to_profile':
      return 'like'
  }
}

function reviewState(outcome: CulinaryProfileDiscoveryOutcomeType): PreferenceReviewState {
  return outcome === 'skipped' ? 'pending_review' : 'accepted'
}

function signalId(input: CulinaryProfileDiscoveryOutcome): string {
  return [
    'culinary-outcome',
    input.ownerId,
    input.itemId,
    input.outcome,
    Date.parse(input.occurredAt) || input.occurredAt.replace(/\D/g, ''),
  ]
    .join(':')
    .replace(/[^a-zA-Z0-9:_-]/g, '_')
}

export function categoryHintForOutcomeItem(
  itemKind: FoodTaxonomyKind | undefined,
  outcome: CulinaryProfileDiscoveryOutcomeType
): CulinaryProfileShareCategory {
  if (outcome === 'not_again' || outcome === 'hide_from_chef') return 'dislikes'

  switch (itemKind) {
    case 'cuisine':
      return 'cuisines'
    case 'ingredient':
      return 'ingredients'
    case 'allergen':
    case 'dietary':
      return 'dietary'
    case 'restaurant':
      return 'restaurants'
    case 'dish':
      return 'dishes'
    case 'budget':
      return 'budget'
    case 'craving':
      return 'cravings'
    case 'service_style':
      return 'service_style'
    case 'tag':
    case undefined:
      return 'cravings'
  }
}

export function mapDiscoveryOutcomeToCulinaryProfileSignals(
  outcome: CulinaryProfileDiscoveryOutcome
): CulinaryProfileOutcomeMapping {
  const hiddenFromChef = outcome.outcome === 'hide_from_chef'
  const category = categoryHintForOutcomeItem(outcome.itemKind, outcome.outcome)
  const signal = createPreferenceSignalEntry({
    id: signalId(outcome),
    ownerId: outcome.ownerId,
    domain: 'discovery',
    source: 'discovery_interaction',
    actorId: outcome.actorId ?? null,
    actorType: 'client',
    rawValue: outcome.itemLabel,
    kind: outcome.itemKind,
    polarity: outcomePolarity(outcome.outcome),
    strength: outcome.outcome === 'skipped' ? 0.25 : 1,
    confidence: OUTCOME_CONFIDENCE[outcome.outcome],
    explicit: outcome.outcome !== 'skipped',
    reviewState: reviewState(outcome.outcome),
    consent: {
      profileUse: true,
      chefSharing: !hiddenFromChef && outcome.outcome !== 'skipped',
      analyticsUse: false,
    },
    shareCategory: hiddenFromChef || outcome.outcome === 'skipped' ? 'private' : 'chef_visible',
    observedAt: outcome.occurredAt,
    createdAt: outcome.occurredAt,
    metadata: {
      culinaryProfileCategory: category,
      discoveryOutcome: outcome.outcome,
      discoveryItemId: outcome.itemId,
      discoverySessionId: outcome.sessionId ?? null,
      discoverySurface: outcome.surface ?? 'unknown',
      hiddenFromChef,
    },
  })

  return { decision: outcome, signals: [signal] }
}

export function mergeCulinaryProfileOutcomeSignals(input: {
  existing: PreferenceSignalLedgerEntry[]
  incoming: PreferenceSignalLedgerEntry[]
}): PreferenceSignalLedgerEntry[] {
  const byId = new Map(input.existing.map((signal) => [signal.id, signal]))

  for (const signal of input.incoming) {
    const current = byId.get(signal.id)
    if (!current || Date.parse(signal.createdAt) >= Date.parse(current.createdAt)) {
      byId.set(signal.id, signal)
    }
  }

  return [...byId.values()].sort(
    (left, right) => Date.parse(left.observedAt) - Date.parse(right.observedAt)
  )
}
