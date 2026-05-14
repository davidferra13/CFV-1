import {
  type FoodTaxonomyKind,
  type NormalizedFoodTaxonomyTerm,
  normalizeFoodTaxonomyTerm,
} from '@/lib/discovery/preference-taxonomy'

export type PreferenceSignalSource =
  | 'user_entered'
  | 'chef_entered'
  | 'remy_chat'
  | 'discovery_interaction'
  | 'saved_item'
  | 'menu_choice'
  | 'intake_form'
  | 'past_event'
  | 'search'
  | 'repeated_behavior'
  | 'import'

export type PreferenceSignalDomain =
  | 'discovery'
  | 'profile'
  | 'recipe'
  | 'grocery'
  | 'menu'
  | 'event'
  | 'intake'
  | 'restaurant'
  | 'remy'
  | 'search'

export type PreferencePolarity =
  | 'like'
  | 'dislike'
  | 'allergy'
  | 'restriction'
  | 'never_show'
  | 'context'

export type PreferenceReviewState = 'accepted' | 'pending_review' | 'rejected' | 'superseded'

export type PreferenceShareCategory =
  | 'private'
  | 'chef_visible'
  | 'household_visible'
  | 'event_visible'

export type PreferenceScopeLevel = 'account' | 'household' | 'person' | 'guest' | 'event'

export interface PreferenceScope {
  level: PreferenceScopeLevel
  ownerId: string
  profileId?: string | null
  householdId?: string | null
  householdMemberId?: string | null
  guestId?: string | null
  eventId?: string | null
  label?: string | null
}

export interface PreferenceSignalConsent {
  profileUse: boolean
  chefSharing: boolean
  analyticsUse: boolean
}

export interface PreferenceSignalLedgerEntry {
  id: string
  ownerId: string
  scope: PreferenceScope
  domain: PreferenceSignalDomain
  source: PreferenceSignalSource
  actorId: string | null
  actorType: 'client' | 'chef' | 'system' | 'guest' | 'import'
  rawValue: string
  normalizedTerm: NormalizedFoodTaxonomyTerm
  polarity: PreferencePolarity
  strength: number
  confidence: number
  explicit: boolean
  reviewState: PreferenceReviewState
  consent: PreferenceSignalConsent
  shareCategory: PreferenceShareCategory
  observedAt: string
  createdAt: string
  supersedesSignalIds: string[]
  metadata: Record<string, unknown>
}

export interface DerivedPreferenceProfile {
  ownerId: string
  generatedAt: string
  scopes: PreferenceScope[]
  resolved: PreferenceSignalLedgerEntry[]
  positives: PreferenceSignalLedgerEntry[]
  negatives: PreferenceSignalLedgerEntry[]
  hardConstraints: PreferenceSignalLedgerEntry[]
  exclusions: PreferenceSignalLedgerEntry[]
  context: PreferenceSignalLedgerEntry[]
  inferredForReview: PreferenceSignalLedgerEntry[]
  shadowed: PreferenceSignalLedgerEntry[]
  allSignals: PreferenceSignalLedgerEntry[]
}

export interface PreferenceConsumerReadiness {
  canPersonalize: boolean
  hasPositiveSignals: boolean
  hasNegativeSignals: boolean
  hasHardSafetyConstraints: boolean
  hasEventOverrides: boolean
  hasHouseholdOrGuestScope: boolean
  hasPendingReview: boolean
  downstreamContractVersion: 'preference-profile-v1'
}

const EXPLICIT_SOURCES = new Set<PreferenceSignalSource>([
  'user_entered',
  'chef_entered',
  'intake_form',
  'past_event',
  'import',
])

const DEFAULT_CONSENT: PreferenceSignalConsent = {
  profileUse: true,
  chefSharing: false,
  analyticsUse: false,
}

const SOURCE_CONFIDENCE: Record<PreferenceSignalSource, number> = {
  user_entered: 1,
  chef_entered: 0.9,
  intake_form: 0.9,
  past_event: 0.82,
  import: 0.75,
  menu_choice: 0.68,
  saved_item: 0.62,
  repeated_behavior: 0.58,
  discovery_interaction: 0.48,
  remy_chat: 0.45,
  search: 0.35,
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function scopeKey(scope: PreferenceScope): string {
  return [
    scope.level,
    scope.ownerId,
    scope.profileId,
    scope.householdId,
    scope.householdMemberId,
    scope.guestId,
    scope.eventId,
  ]
    .filter(Boolean)
    .join(':')
}

function signalPrecedence(signal: PreferenceSignalLedgerEntry): number {
  const review =
    signal.reviewState === 'accepted' ? 100 : signal.reviewState === 'pending_review' ? 25 : 0
  const explicit = signal.explicit ? 50 : 0
  const safety =
    signal.polarity === 'allergy' ||
    signal.polarity === 'restriction' ||
    signal.polarity === 'never_show'
      ? 20
      : 0
  return review + explicit + safety + signal.confidence
}

function comparePreferenceSignals(
  left: PreferenceSignalLedgerEntry,
  right: PreferenceSignalLedgerEntry
): number {
  const byPrecedence = signalPrecedence(right) - signalPrecedence(left)
  if (byPrecedence !== 0) return byPrecedence

  return Date.parse(right.observedAt) - Date.parse(left.observedAt)
}

function isSafetyPolarity(polarity: PreferencePolarity): boolean {
  return polarity === 'allergy' || polarity === 'restriction' || polarity === 'never_show'
}

function isOpposedPolarity(left: PreferencePolarity, right: PreferencePolarity): boolean {
  if (left === right) return false
  if (isSafetyPolarity(left) || isSafetyPolarity(right)) return true
  return (left === 'like' && right === 'dislike') || (left === 'dislike' && right === 'like')
}

function generatedSignalId(input: {
  ownerId: string
  domain: PreferenceSignalDomain
  source: PreferenceSignalSource
  polarity: PreferencePolarity
  normalizedTerm: NormalizedFoodTaxonomyTerm
  observedAt: string
}): string {
  return [
    'prefsig',
    input.ownerId,
    input.domain,
    input.source,
    input.polarity,
    input.normalizedTerm.canonicalKey,
    Date.parse(input.observedAt) || normalizeTimestamp(input.observedAt).replace(/\D/g, ''),
  ]
    .join(':')
    .replace(/[^a-zA-Z0-9:_-]/g, '_')
}

function normalizeTimestamp(value: string | null | undefined): string {
  const date = value ? new Date(value) : new Date()
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

export function createPreferenceSignalEntry(input: {
  id?: string
  ownerId: string
  scope?: Partial<PreferenceScope>
  domain: PreferenceSignalDomain
  source: PreferenceSignalSource
  actorId?: string | null
  actorType?: PreferenceSignalLedgerEntry['actorType']
  rawValue: string
  kind?: FoodTaxonomyKind
  polarity: PreferencePolarity
  strength?: number
  confidence?: number
  explicit?: boolean
  reviewState?: PreferenceReviewState
  consent?: Partial<PreferenceSignalConsent>
  shareCategory?: PreferenceShareCategory
  observedAt?: string
  createdAt?: string
  supersedesSignalIds?: string[]
  metadata?: Record<string, unknown>
}): PreferenceSignalLedgerEntry {
  const observedAt = normalizeTimestamp(input.observedAt)
  const createdAt = normalizeTimestamp(input.createdAt ?? observedAt)
  const explicit = input.explicit ?? EXPLICIT_SOURCES.has(input.source)
  const normalizedTerm = normalizeFoodTaxonomyTerm(input.rawValue, input.kind)
  const reviewState = input.reviewState ?? (explicit ? 'accepted' : 'pending_review')
  const confidence = clamp01(input.confidence ?? SOURCE_CONFIDENCE[input.source])

  return {
    id:
      input.id ??
      generatedSignalId({
        ownerId: input.ownerId,
        domain: input.domain,
        source: input.source,
        polarity: input.polarity,
        normalizedTerm,
        observedAt,
      }),
    ownerId: input.ownerId,
    scope: {
      level: input.scope?.level ?? 'account',
      ownerId: input.ownerId,
      profileId: input.scope?.profileId ?? null,
      householdId: input.scope?.householdId ?? null,
      householdMemberId: input.scope?.householdMemberId ?? null,
      guestId: input.scope?.guestId ?? null,
      eventId: input.scope?.eventId ?? null,
      label: input.scope?.label ?? null,
    },
    domain: input.domain,
    source: input.source,
    actorId: input.actorId ?? null,
    actorType: input.actorType ?? (explicit ? 'client' : 'system'),
    rawValue: input.rawValue,
    normalizedTerm,
    polarity: input.polarity,
    strength: clamp01(input.strength ?? 1),
    confidence,
    explicit,
    reviewState,
    consent: { ...DEFAULT_CONSENT, ...(input.consent ?? {}) },
    shareCategory: input.shareCategory ?? 'private',
    observedAt,
    createdAt,
    supersedesSignalIds: input.supersedesSignalIds ?? [],
    metadata: input.metadata ?? {},
  }
}

export function derivePreferenceProfile(
  signals: PreferenceSignalLedgerEntry[],
  options?: {
    ownerId?: string
    generatedAt?: string
    includePendingReview?: boolean
  }
): DerivedPreferenceProfile {
  const activeSignals = signals
    .filter((signal) => signal.reviewState !== 'rejected')
    .filter((signal) => signal.consent.profileUse)
    .sort(comparePreferenceSignals)

  const resolved: PreferenceSignalLedgerEntry[] = []
  const shadowed: PreferenceSignalLedgerEntry[] = []

  for (const signal of activeSignals) {
    if (signal.reviewState === 'pending_review' && !options?.includePendingReview) continue

    const overlapIndex = resolved.findIndex((current) => {
      if (scopeKey(current.scope) !== scopeKey(signal.scope)) return false
      const sameCanonical =
        current.normalizedTerm.canonicalKey === signal.normalizedTerm.canonicalKey
      const overlappingTerm = current.normalizedTerm.matchKeys.some((matchKey) =>
        signal.normalizedTerm.matchKeys.includes(matchKey)
      )
      if (current.polarity === signal.polarity) return sameCanonical
      return overlappingTerm && isOpposedPolarity(current.polarity, signal.polarity)
    })

    if (overlapIndex === -1) {
      resolved.push(signal)
      continue
    }

    const current = resolved[overlapIndex]
    if (isSafetyPolarity(current.polarity) || isSafetyPolarity(signal.polarity)) {
      resolved.push(signal)
      continue
    }

    if (comparePreferenceSignals(signal, current) < 0) {
      resolved.splice(overlapIndex, 1, signal)
      shadowed.push(current)
    } else {
      shadowed.push(signal)
    }
  }

  const pending = activeSignals.filter((signal) => signal.reviewState === 'pending_review')
  const scopesByKey = new Map(resolved.map((signal) => [scopeKey(signal.scope), signal.scope]))

  return {
    ownerId: options?.ownerId ?? signals[0]?.ownerId ?? 'unknown',
    generatedAt: normalizeTimestamp(options?.generatedAt),
    scopes: [...scopesByKey.values()],
    resolved,
    positives: resolved.filter((signal) => signal.polarity === 'like'),
    negatives: resolved.filter((signal) => signal.polarity === 'dislike'),
    hardConstraints: resolved.filter(
      (signal) => signal.polarity === 'allergy' || signal.polarity === 'restriction'
    ),
    exclusions: resolved.filter((signal) => signal.polarity === 'never_show'),
    context: resolved.filter((signal) => signal.polarity === 'context'),
    inferredForReview: pending.filter((signal) => !signal.explicit),
    shadowed,
    allSignals: activeSignals,
  }
}

export function buildPreferenceConsumerReadiness(
  profile: DerivedPreferenceProfile
): PreferenceConsumerReadiness {
  return {
    canPersonalize:
      profile.positives.length > 0 ||
      profile.negatives.length > 0 ||
      profile.hardConstraints.length > 0 ||
      profile.exclusions.length > 0,
    hasPositiveSignals: profile.positives.length > 0,
    hasNegativeSignals: profile.negatives.length > 0,
    hasHardSafetyConstraints: profile.hardConstraints.length > 0 || profile.exclusions.length > 0,
    hasEventOverrides: profile.scopes.some((scope) => scope.level === 'event'),
    hasHouseholdOrGuestScope: profile.scopes.some(
      (scope) => scope.level === 'household' || scope.level === 'person' || scope.level === 'guest'
    ),
    hasPendingReview: profile.inferredForReview.length > 0,
    downstreamContractVersion: 'preference-profile-v1',
  }
}
