import type { ClientPattern } from './preference-learning-actions'

const RELATIONSHIP_SIGNAL_META = {
  favorite_cuisine: { label: 'Favorite cuisine', order: 10 },
  dietary_need: { label: 'Dietary need', order: 20 },
  allergy: { label: 'Allergy', order: 30 },
  preferred_day: { label: 'Typical booking day', order: 40 },
  guest_count_range: { label: 'Typical party size', order: 50 },
  occasion_type: { label: 'Common occasion', order: 60 },
  service_style: { label: 'Service style', order: 70 },
  time_preference: { label: 'Service time', order: 80 },
} as const

type RelationshipSignalKind = keyof typeof RELATIONSHIP_SIGNAL_META

export interface ClientRelationshipSignal {
  id: string
  kind: RelationshipSignalKind
  label: string
  value: string
  source: 'client_record' | 'learned_pattern'
  sourceLabel: string
  freshness: string | null
  confidence: number | null
  occurrences: number | null
  shadowedByProfile: boolean
}

export interface ClientRelationshipSignalSnapshot {
  canonical: ClientRelationshipSignal[]
  profile: ClientRelationshipSignal[]
  learned: ClientRelationshipSignal[]
  secondaryLearned: ClientRelationshipSignal[]
}

type ProfileSignalSource = {
  favorite_cuisines: string[] | null
  dietary_restrictions: string[] | null
  allergies: string[] | null
  updated_at: string | null
}

function toDisplayValue(value: string): string {
  return value
    .trim()
    .replace(/_/g, ' ')
    .split(/\s+/)
    .map((token) => (token ? token[0].toUpperCase() + token.slice(1) : token))
    .join(' ')
}

function uniqueStrings(values: string[] | null | undefined): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const raw of values ?? []) {
    const value = raw.trim()
    const key = value.toLowerCase()
    if (!value || seen.has(key)) continue
    seen.add(key)
    result.push(value)
  }

  return result
}

function sortSignals(signals: ClientRelationshipSignal[]): ClientRelationshipSignal[] {
  return [...signals].sort((left, right) => {
    const byOrder =
      RELATIONSHIP_SIGNAL_META[left.kind].order - RELATIONSHIP_SIGNAL_META[right.kind].order
    if (byOrder !== 0) return byOrder

    const leftConfidence = left.confidence ?? 2
    const rightConfidence = right.confidence ?? 2
    if (rightConfidence !== leftConfidence) return rightConfidence - leftConfidence

    const leftOccurrences = left.occurrences ?? 0
    const rightOccurrences = right.occurrences ?? 0
    if (rightOccurrences !== leftOccurrences) return rightOccurrences - leftOccurrences

    return left.value.localeCompare(right.value)
  })
}

function buildProfileSignals(client: ProfileSignalSource): ClientRelationshipSignal[] {
  const updatedAt = client.updated_at ?? null
  const signals: ClientRelationshipSignal[] = []

  for (const value of uniqueStrings(client.favorite_cuisines)) {
    signals.push({
      id: `client_record:favorite_cuisine:${value.toLowerCase()}`,
      kind: 'favorite_cuisine',
      label: RELATIONSHIP_SIGNAL_META.favorite_cuisine.label,
      value,
      source: 'client_record',
      sourceLabel: 'Profile',
      freshness: updatedAt,
      confidence: null,
      occurrences: null,
      shadowedByProfile: false,
    })
  }

  for (const value of uniqueStrings(client.dietary_restrictions)) {
    signals.push({
      id: `client_record:dietary_need:${value.toLowerCase()}`,
      kind: 'dietary_need',
      label: RELATIONSHIP_SIGNAL_META.dietary_need.label,
      value,
      source: 'client_record',
      sourceLabel: 'Profile',
      freshness: updatedAt,
      confidence: null,
      occurrences: null,
      shadowedByProfile: false,
    })
  }

  for (const value of uniqueStrings(client.allergies)) {
    signals.push({
      id: `client_record:allergy:${value.toLowerCase()}`,
      kind: 'allergy',
      label: RELATIONSHIP_SIGNAL_META.allergy.label,
      value,
      source: 'client_record',
      sourceLabel: 'Profile',
      freshness: updatedAt,
      confidence: null,
      occurrences: null,
      shadowedByProfile: false,
    })
  }

  return sortSignals(signals)
}

function dedupePatterns(patterns: ClientPattern[]): ClientPattern[] {
  const bestByKey = new Map<string, ClientPattern>()

  for (const pattern of patterns) {
    if (!(pattern.patternType in RELATIONSHIP_SIGNAL_META)) continue
    const key = `${pattern.patternType}:${pattern.patternValue.trim().toLowerCase()}`
    const current = bestByKey.get(key)
    if (!current) {
      bestByKey.set(key, pattern)
      continue
    }

    if (pattern.confidence > current.confidence) {
      bestByKey.set(key, pattern)
      continue
    }

    if (pattern.confidence === current.confidence && pattern.occurrences > current.occurrences) {
      bestByKey.set(key, pattern)
      continue
    }

    if (
      pattern.confidence === current.confidence &&
      pattern.occurrences === current.occurrences &&
      Date.parse(pattern.lastSeenAt) > Date.parse(current.lastSeenAt)
    ) {
      bestByKey.set(key, pattern)
    }
  }

  return [...bestByKey.values()]
}

export function buildClientRelationshipSignalSnapshot(
  client: ProfileSignalSource,
  patterns: ClientPattern[]
): ClientRelationshipSignalSnapshot {
  const profile = buildProfileSignals(client)
  const profileKinds = new Set(profile.map((signal) => signal.kind))

  const learned = sortSignals(
    dedupePatterns(patterns)
      .map((pattern) => {
        const kind = pattern.patternType as RelationshipSignalKind
        return {
          id: `learned_pattern:${kind}:${pattern.patternValue.trim().toLowerCase()}`,
          kind,
          label: RELATIONSHIP_SIGNAL_META[kind].label,
          value: toDisplayValue(pattern.patternValue),
          source: 'learned_pattern' as const,
          sourceLabel: 'Learned',
          freshness: pattern.lastSeenAt,
          confidence: pattern.confidence,
          occurrences: pattern.occurrences,
          shadowedByProfile: profileKinds.has(kind),
        } satisfies ClientRelationshipSignal
      })
      .filter(Boolean)
  )

  const secondaryLearned = learned.filter((signal) => signal.shadowedByProfile)

  return {
    canonical: sortSignals([...profile, ...learned.filter((signal) => !signal.shadowedByProfile)]),
    profile,
    learned,
    secondaryLearned,
  }
}
