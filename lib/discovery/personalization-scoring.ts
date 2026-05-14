import {
  type DerivedPreferenceProfile,
  type PreferenceShareCategory,
  type PreferenceSignalDomain,
  type PreferenceSignalLedgerEntry,
} from '@/lib/discovery/preference-contract'
import {
  type FoodTaxonomyKind,
  type NormalizedFoodTaxonomyTerm,
  foodTaxonomyTermsOverlap,
  normalizeFoodTaxonomyTerm,
} from '@/lib/discovery/preference-taxonomy'

export type PersonalizationConsumerDomain = PreferenceSignalDomain | 'chef_client'

export type PersonalizationVisibility = 'client_private' | 'chef_shared'

export type RecommendationReasonKind =
  | 'positive_match'
  | 'negative_match'
  | 'safety_exclusion'
  | 'budget_fit'
  | 'distance_fit'
  | 'occasion_fit'
  | 'source_confidence'
  | 'editorial'

export interface PersonalizationCandidateTerm {
  value: string
  kind?: FoodTaxonomyKind
}

export interface PersonalizationCandidate {
  id: string
  label: string
  domain: PersonalizationConsumerDomain
  terms: PersonalizationCandidateTerm[]
  budgetCents?: number | null
  distanceMiles?: number | null
  occasionTags?: string[]
  source?: string | null
  confidence?: number | null
}

export interface TasteScoreContext {
  maxBudgetCents?: number | null
  maxDistanceMiles?: number | null
  occasionTags?: string[]
  visibility?: PersonalizationVisibility
  allowedShareCategories?: PreferenceShareCategory[]
}

export interface RecommendationReason {
  kind: RecommendationReasonKind
  message: string
  signalId: string | null
  signalLabel: string | null
  source: PreferenceSignalLedgerEntry['source'] | null
  confidence: number | null
  redacted: boolean
}

export interface TasteHardExclusion {
  signalId: string | null
  label: string
  reason: string
  redacted: boolean
}

export interface TasteScoreComponents {
  positive: number
  negative: number
  safety: number
  budget: number
  distance: number
  occasion: number
  confidence: number
}

export interface TasteMatchScore {
  candidateId: string
  candidateLabel: string
  domain: PersonalizationConsumerDomain
  totalScore: number
  normalizedScore: number
  hidden: boolean
  components: TasteScoreComponents
  hardExclusions: TasteHardExclusion[]
  reasons: RecommendationReason[]
  matchedSignalIds: string[]
  redactedSignalCount: number
}

const DEFAULT_ALLOWED_CHEF_CATEGORIES: PreferenceShareCategory[] = ['chef_visible', 'event_visible']

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function normalizeTag(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function candidateTerms(candidate: PersonalizationCandidate): NormalizedFoodTaxonomyTerm[] {
  return candidate.terms
    .map((term) => normalizeFoodTaxonomyTerm(term.value, term.kind))
    .filter((term) => term.slug !== 'unknown')
}

function termOverlapsSignal(
  term: NormalizedFoodTaxonomyTerm,
  signal: PreferenceSignalLedgerEntry
): boolean {
  return foodTaxonomyTermsOverlap(term, signal.normalizedTerm)
}

function scoreSignal(signal: PreferenceSignalLedgerEntry, weight: number): number {
  return signal.strength * signal.confidence * weight
}

function isChefVisible(
  signal: PreferenceSignalLedgerEntry,
  allowedCategories: PreferenceShareCategory[]
): boolean {
  return signal.consent.chefSharing && allowedCategories.includes(signal.shareCategory)
}

function visibleSignals(
  profile: DerivedPreferenceProfile,
  context: TasteScoreContext | undefined
): PreferenceSignalLedgerEntry[] {
  if (context?.visibility !== 'chef_shared') return profile.resolved

  const allowedCategories = context.allowedShareCategories ?? DEFAULT_ALLOWED_CHEF_CATEGORIES
  return profile.resolved.filter((signal) => isChefVisible(signal, allowedCategories))
}

function redactedChefHardSignals(
  profile: DerivedPreferenceProfile,
  terms: NormalizedFoodTaxonomyTerm[],
  context: TasteScoreContext | undefined
): PreferenceSignalLedgerEntry[] {
  if (context?.visibility !== 'chef_shared') return []

  const visibleIds = new Set(visibleSignals(profile, context).map((signal) => signal.id))
  return [...profile.hardConstraints, ...profile.exclusions].filter(
    (signal) => !visibleIds.has(signal.id) && terms.some((term) => termOverlapsSignal(term, signal))
  )
}

function reasonForSignal(
  kind: RecommendationReasonKind,
  message: string,
  signal: PreferenceSignalLedgerEntry
): RecommendationReason {
  return {
    kind,
    message,
    signalId: signal.id,
    signalLabel: signal.normalizedTerm.displayLabel,
    source: signal.source,
    confidence: signal.confidence,
    redacted: false,
  }
}

function redactedReason(kind: RecommendationReasonKind, message: string): RecommendationReason {
  return {
    kind,
    message,
    signalId: null,
    signalLabel: null,
    source: null,
    confidence: null,
    redacted: true,
  }
}

function staticReason(kind: RecommendationReasonKind, message: string): RecommendationReason {
  return {
    kind,
    message,
    signalId: null,
    signalLabel: null,
    source: null,
    confidence: null,
    redacted: false,
  }
}

function budgetScore(candidate: PersonalizationCandidate, context?: TasteScoreContext): number {
  if (!candidate.budgetCents || !context?.maxBudgetCents) return 0
  if (candidate.budgetCents <= context.maxBudgetCents) return 8

  const overage = candidate.budgetCents - context.maxBudgetCents
  return -clamp((overage / context.maxBudgetCents) * 14, 2, 14)
}

function distanceScore(candidate: PersonalizationCandidate, context?: TasteScoreContext): number {
  if (candidate.distanceMiles == null || !context?.maxDistanceMiles) return 0
  if (candidate.distanceMiles <= context.maxDistanceMiles) return 6

  const overage = candidate.distanceMiles - context.maxDistanceMiles
  return -clamp((overage / context.maxDistanceMiles) * 10, 1, 10)
}

function occasionScore(candidate: PersonalizationCandidate, context?: TasteScoreContext): number {
  const requested = new Set((context?.occasionTags ?? []).map(normalizeTag).filter(Boolean))
  if (requested.size === 0) return 0

  const candidateTags = new Set((candidate.occasionTags ?? []).map(normalizeTag).filter(Boolean))
  return [...requested].some((tag) => candidateTags.has(tag)) ? 7 : 0
}

export function scoreTasteCandidate(
  profile: DerivedPreferenceProfile,
  candidate: PersonalizationCandidate,
  context?: TasteScoreContext
): TasteMatchScore {
  const terms = candidateTerms(candidate)
  const signals = visibleSignals(profile, context)
  const reasons: RecommendationReason[] = []
  const matchedSignalIds = new Set<string>()
  const hardExclusions: TasteHardExclusion[] = []

  let positive = 0
  let negative = 0
  let safety = 0

  for (const signal of signals) {
    if (!terms.some((term) => termOverlapsSignal(term, signal))) continue

    if (signal.polarity === 'like') {
      const value = scoreSignal(signal, 30)
      positive += value
      matchedSignalIds.add(signal.id)
      reasons.push(
        reasonForSignal('positive_match', `Matches ${signal.normalizedTerm.displayLabel}.`, signal)
      )
    }

    if (signal.polarity === 'dislike') {
      const value = scoreSignal(signal, 22)
      negative -= value
      matchedSignalIds.add(signal.id)
      reasons.push(
        reasonForSignal(
          'negative_match',
          `Demoted by ${signal.normalizedTerm.displayLabel}.`,
          signal
        )
      )
    }

    if (
      signal.polarity === 'allergy' ||
      signal.polarity === 'restriction' ||
      signal.polarity === 'never_show'
    ) {
      safety -= 100
      matchedSignalIds.add(signal.id)
      hardExclusions.push({
        signalId: signal.id,
        label: signal.normalizedTerm.displayLabel,
        reason: `${candidate.label} conflicts with ${signal.normalizedTerm.displayLabel}.`,
        redacted: false,
      })
      reasons.push(
        reasonForSignal(
          'safety_exclusion',
          `Hidden because of ${signal.normalizedTerm.displayLabel}.`,
          signal
        )
      )
    }
  }

  const redactedHardSignals = redactedChefHardSignals(profile, terms, context)
  for (const _signal of redactedHardSignals) {
    safety -= 100
    hardExclusions.push({
      signalId: null,
      label: 'Private safety constraint',
      reason: `${candidate.label} conflicts with a private safety constraint.`,
      redacted: true,
    })
    reasons.push(redactedReason('safety_exclusion', 'Hidden by a private safety constraint.'))
  }

  const budget = budgetScore(candidate, context)
  if (budget > 0) {
    reasons.push(staticReason('budget_fit', 'Fits the stated budget.'))
  } else if (budget < 0) {
    reasons.push(staticReason('budget_fit', 'Outside the stated budget.'))
  }

  const distance = distanceScore(candidate, context)
  if (distance > 0) {
    reasons.push(staticReason('distance_fit', 'Within the preferred distance.'))
  } else if (distance < 0) {
    reasons.push(staticReason('distance_fit', 'Outside the preferred distance.'))
  }

  const occasion = occasionScore(candidate, context)
  if (occasion > 0) reasons.push(staticReason('occasion_fit', 'Fits the occasion.'))

  const confidence = candidate.confidence == null ? 0 : clamp(candidate.confidence, 0, 1) * 5
  if (confidence > 0) {
    reasons.push(staticReason('source_confidence', 'Backed by a higher-confidence source.'))
  }

  const components = {
    positive: round(positive),
    negative: round(negative),
    safety: round(safety),
    budget: round(budget),
    distance: round(distance),
    occasion: round(occasion),
    confidence: round(confidence),
  }
  const totalScore = round(
    components.positive +
      components.negative +
      components.safety +
      components.budget +
      components.distance +
      components.occasion +
      components.confidence
  )

  return {
    candidateId: candidate.id,
    candidateLabel: candidate.label,
    domain: candidate.domain,
    totalScore,
    normalizedScore: round(clamp((totalScore + 100) / 200, 0, 1)),
    hidden: hardExclusions.length > 0,
    components,
    hardExclusions,
    reasons,
    matchedSignalIds: [...matchedSignalIds],
    redactedSignalCount: redactedHardSignals.length,
  }
}

export function scoreTasteCandidates(
  profile: DerivedPreferenceProfile,
  candidates: PersonalizationCandidate[],
  context?: TasteScoreContext
): TasteMatchScore[] {
  return candidates
    .map((candidate) => scoreTasteCandidate(profile, candidate, context))
    .sort((left, right) => {
      if (left.hidden !== right.hidden) return left.hidden ? 1 : -1
      return right.totalScore - left.totalScore
    })
}
