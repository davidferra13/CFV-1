import {
  createPreferenceSignalEntry,
  derivePreferenceProfile,
  type DerivedPreferenceProfile,
  type PreferencePolarity,
  type PreferenceSignalLedgerEntry,
} from '@/lib/discovery/preference-contract'
import {
  foodTaxonomyTermsOverlap,
  type FoodTaxonomyKind,
} from '@/lib/discovery/preference-taxonomy'

export interface EventPreferenceOverrideInput {
  id?: string
  ownerId: string
  eventId: string
  rawValue: string
  kind?: FoodTaxonomyKind
  polarity: PreferencePolarity
  actorId?: string | null
  observedAt?: string
  label?: string | null
  chefVisible?: boolean
  metadata?: Record<string, unknown>
}

export interface EventPreferenceMergeResult {
  profile: DerivedPreferenceProfile
  eventOverrides: PreferenceSignalLedgerEntry[]
  shadowedGlobalSignals: PreferenceSignalLedgerEntry[]
}

const DEFAULT_OVERRIDE_AT = '1970-01-01T00:00:00.000Z'

export function createEventPreferenceOverrideSignal(
  input: EventPreferenceOverrideInput
): PreferenceSignalLedgerEntry {
  const safetyCritical =
    input.polarity === 'allergy' ||
    input.polarity === 'restriction' ||
    input.polarity === 'never_show'

  return createPreferenceSignalEntry({
    id: input.id,
    ownerId: input.ownerId,
    scope: {
      level: 'event',
      eventId: input.eventId,
      label: input.label ?? 'Event override',
    },
    domain: 'event',
    source: 'user_entered',
    actorId: input.actorId ?? null,
    actorType: 'client',
    rawValue: input.rawValue,
    kind: input.kind,
    polarity: input.polarity,
    strength: safetyCritical ? 1 : 0.85,
    confidence: 1,
    explicit: true,
    reviewState: 'accepted',
    consent: {
      profileUse: true,
      chefSharing: input.chefVisible ?? safetyCritical,
      analyticsUse: false,
    },
    shareCategory: input.chefVisible || safetyCritical ? 'event_visible' : 'private',
    observedAt: input.observedAt ?? DEFAULT_OVERRIDE_AT,
    metadata: {
      eventOverride: true,
      promotedToGlobal: false,
      ...(input.metadata ?? {}),
    },
  })
}

export function mergeEventPreferenceOverrides(
  globalSignals: PreferenceSignalLedgerEntry[],
  eventOverrides: PreferenceSignalLedgerEntry[],
  options: { ownerId: string; eventId: string; generatedAt?: string }
): EventPreferenceMergeResult {
  const activeOverrides = eventOverrides.filter(
    (signal) =>
      signal.reviewState === 'accepted' &&
      signal.scope.level === 'event' &&
      signal.scope.eventId === options.eventId
  )
  const shadowedGlobalSignals = globalSignals.filter((globalSignal) =>
    activeOverrides.some((override) => eventOverrideShadowsGlobalSignal(override, globalSignal))
  )
  const shadowedIds = new Set(shadowedGlobalSignals.map((signal) => signal.id))
  const profile = derivePreferenceProfile(
    [...globalSignals.filter((signal) => !shadowedIds.has(signal.id)), ...activeOverrides],
    {
      ownerId: options.ownerId,
      generatedAt: options.generatedAt,
      includePendingReview: false,
    }
  )

  return {
    profile,
    eventOverrides: activeOverrides,
    shadowedGlobalSignals,
  }
}

export function promoteEventOverrideToGlobalPreference(
  override: PreferenceSignalLedgerEntry,
  options: { actorId?: string | null; observedAt?: string } = {}
): PreferenceSignalLedgerEntry {
  const observedAt = options.observedAt ?? override.observedAt

  return createPreferenceSignalEntry({
    id: `${override.id}:global`,
    ownerId: override.ownerId,
    scope: {
      level: 'account',
      label: 'Global preference',
    },
    domain: 'profile',
    source: 'user_entered',
    actorId: options.actorId ?? override.actorId,
    actorType: 'client',
    rawValue: override.rawValue,
    kind: override.normalizedTerm.kind,
    polarity: override.polarity,
    strength: override.strength,
    confidence: 1,
    explicit: true,
    reviewState: 'accepted',
    consent: {
      ...override.consent,
      chefSharing: false,
    },
    shareCategory: 'private',
    observedAt,
    createdAt: observedAt,
    supersedesSignalIds: [override.id],
    metadata: {
      promotedFromEventId: override.scope.eventId ?? null,
      promotedFromOverrideId: override.id,
    },
  })
}

function eventOverrideShadowsGlobalSignal(
  override: PreferenceSignalLedgerEntry,
  globalSignal: PreferenceSignalLedgerEntry
): boolean {
  if (globalSignal.scope.level === 'event') return false
  if (!foodTaxonomyTermsOverlap(override.normalizedTerm, globalSignal.normalizedTerm)) return false
  if (override.polarity === 'allergy' || override.polarity === 'restriction') return true
  if (override.polarity === 'never_show') return true
  if (override.polarity === 'dislike' && globalSignal.polarity === 'like') return true
  if (override.polarity === 'like' && globalSignal.polarity === 'dislike') return true
  return false
}
