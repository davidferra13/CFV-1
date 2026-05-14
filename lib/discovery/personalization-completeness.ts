import type {
  DerivedPreferenceProfile,
  PreferenceSignalLedgerEntry,
} from '@/lib/discovery/preference-contract'

export type ProfileCompletenessField =
  | 'allergies'
  | 'restrictions'
  | 'favorites'
  | 'dislikes'
  | 'budget'
  | 'location'
  | 'occasions'
  | 'household_or_guest'

export interface ProfileCompletenessNudge {
  field: ProfileCompletenessField
  priority: 'high' | 'medium' | 'low'
  message: string
  dismissed: boolean
  deferredUntil: string | null
}

export interface ProfileCompletenessResult {
  score: number
  completedWeight: number
  totalWeight: number
  sufficientlyComplete: boolean
  fields: Record<
    ProfileCompletenessField,
    {
      complete: boolean
      weight: number
      signalIds: string[]
    }
  >
  nudges: ProfileCompletenessNudge[]
}

export interface ProfileCompletenessOptions {
  dismissedFields?: ProfileCompletenessField[]
  deferredFields?: Partial<Record<ProfileCompletenessField, string>>
  now?: string
  sufficientScore?: number
}

const FIELD_WEIGHTS: Record<ProfileCompletenessField, number> = {
  allergies: 24,
  restrictions: 16,
  favorites: 14,
  dislikes: 12,
  budget: 10,
  location: 10,
  occasions: 8,
  household_or_guest: 6,
}

const FIELD_MESSAGES: Record<ProfileCompletenessField, string> = {
  allergies: 'Add allergies so unsafe recommendations can be hidden.',
  restrictions: 'Add dietary restrictions for safer menu planning.',
  favorites: 'Add favorite cuisines or dishes to improve ranking.',
  dislikes: 'Add dislikes so weak matches can be downranked.',
  budget: 'Add a budget range to tune recommendations.',
  location: 'Add location or travel range for nearby options.',
  occasions: 'Add common occasions to improve event fit.',
  household_or_guest: 'Add household or guest basics for shared meals.',
}

function signalIds(signals: PreferenceSignalLedgerEntry[]): string[] {
  return signals.map((signal) => signal.id)
}

function hasMetadataFlag(signal: PreferenceSignalLedgerEntry, keys: string[]): boolean {
  return keys.some((key) => Boolean(signal.metadata[key]))
}

function deferredIsActive(value: string | null | undefined, now: string): boolean {
  if (!value) return false
  const deferredUntil = Date.parse(value)
  const nowMs = Date.parse(now)
  return Number.isFinite(deferredUntil) && Number.isFinite(nowMs) && deferredUntil > nowMs
}

function priorityFor(field: ProfileCompletenessField): ProfileCompletenessNudge['priority'] {
  if (field === 'allergies' || field === 'restrictions') return 'high'
  if (field === 'favorites' || field === 'dislikes' || field === 'budget') return 'medium'
  return 'low'
}

export function buildProfileCompleteness(
  profile: DerivedPreferenceProfile,
  options?: ProfileCompletenessOptions
): ProfileCompletenessResult {
  const budgetSignals = profile.resolved.filter(
    (signal) =>
      signal.normalizedTerm.kind === 'budget' ||
      hasMetadataFlag(signal, ['budgetCents', 'budgetRange', 'maxBudgetCents'])
  )
  const locationSignals = profile.resolved.filter(
    (signal) =>
      hasMetadataFlag(signal, ['location', 'zipCode', 'distanceMiles', 'maxDistanceMiles']) ||
      signal.normalizedTerm.kind === 'restaurant'
  )
  const occasionSignals = profile.resolved.filter(
    (signal) =>
      signal.normalizedTerm.kind === 'service_style' ||
      hasMetadataFlag(signal, ['occasion', 'occasionTag'])
  )
  const householdSignals = profile.resolved.filter((signal) =>
    ['household', 'person', 'guest', 'event'].includes(signal.scope.level)
  )

  const fields: ProfileCompletenessResult['fields'] = {
    allergies: {
      complete: profile.hardConstraints.some((signal) => signal.polarity === 'allergy'),
      weight: FIELD_WEIGHTS.allergies,
      signalIds: signalIds(
        profile.hardConstraints.filter((signal) => signal.polarity === 'allergy')
      ),
    },
    restrictions: {
      complete: profile.hardConstraints.some((signal) => signal.polarity === 'restriction'),
      weight: FIELD_WEIGHTS.restrictions,
      signalIds: signalIds(
        profile.hardConstraints.filter((signal) => signal.polarity === 'restriction')
      ),
    },
    favorites: {
      complete: profile.positives.length > 0,
      weight: FIELD_WEIGHTS.favorites,
      signalIds: signalIds(profile.positives),
    },
    dislikes: {
      complete: profile.negatives.length > 0,
      weight: FIELD_WEIGHTS.dislikes,
      signalIds: signalIds(profile.negatives),
    },
    budget: {
      complete: budgetSignals.length > 0,
      weight: FIELD_WEIGHTS.budget,
      signalIds: signalIds(budgetSignals),
    },
    location: {
      complete: locationSignals.length > 0,
      weight: FIELD_WEIGHTS.location,
      signalIds: signalIds(locationSignals),
    },
    occasions: {
      complete: occasionSignals.length > 0,
      weight: FIELD_WEIGHTS.occasions,
      signalIds: signalIds(occasionSignals),
    },
    household_or_guest: {
      complete: householdSignals.length > 0,
      weight: FIELD_WEIGHTS.household_or_guest,
      signalIds: signalIds(householdSignals),
    },
  }

  const completedWeight = Object.values(fields).reduce(
    (total, field) => total + (field.complete ? field.weight : 0),
    0
  )
  const totalWeight = Object.values(fields).reduce((total, field) => total + field.weight, 0)
  const score = totalWeight === 0 ? 0 : Math.round((completedWeight / totalWeight) * 100)
  const sufficientScore = options?.sufficientScore ?? 72
  const dismissed = new Set(options?.dismissedFields ?? [])
  const now = options?.now ?? new Date().toISOString()

  const nudges = (Object.keys(fields) as ProfileCompletenessField[])
    .filter((field) => !fields[field].complete)
    .map((field) => {
      const deferredUntil = options?.deferredFields?.[field] ?? null
      return {
        field,
        priority: priorityFor(field),
        message: FIELD_MESSAGES[field],
        dismissed: dismissed.has(field),
        deferredUntil,
      } satisfies ProfileCompletenessNudge
    })
    .filter((nudge) => !nudge.dismissed && !deferredIsActive(nudge.deferredUntil, now))

  return {
    score,
    completedWeight,
    totalWeight,
    sufficientlyComplete: score >= sufficientScore,
    fields,
    nudges,
  }
}
