import {
  type DerivedPreferenceProfile,
  type PreferenceShareCategory,
  type PreferenceSignalLedgerEntry,
} from '@/lib/discovery/preference-contract'

export interface CulinaryProfileSharingGrant {
  id: string
  granteeChefId?: string | null
  relationshipId?: string | null
  allowedCategories: PreferenceShareCategory[]
  grantedAt: string
  expiresAt?: string | null
  revokedAt?: string | null
}

export interface CulinaryProfileSnapshotBlock {
  title: string
  items: Array<{
    key: string
    label: string
    source: PreferenceSignalLedgerEntry['source']
    confidence: number
    lastObservedAt: string
  }>
}

export interface CulinaryProfileSnapshot {
  ownerId: string
  version: 'culinary-profile-v1'
  generatedAt: string
  sourceWindow: {
    startsAt: string | null
    endsAt: string | null
    signalCount: number
  }
  privateSummary: CulinaryProfileSnapshotBlock[]
  shareableSummary: CulinaryProfileSnapshotBlock[]
  readiness: {
    hasShareableContent: boolean
    hasHardConstraints: boolean
    needsReview: boolean
  }
}

function isGrantActive(
  grant: CulinaryProfileSharingGrant | null | undefined,
  now: string
): boolean {
  if (!grant) return false
  if (grant.revokedAt) return false
  if (grant.expiresAt && Date.parse(grant.expiresAt) <= Date.parse(now)) return false
  return true
}

function entryToItem(
  signal: PreferenceSignalLedgerEntry
): CulinaryProfileSnapshotBlock['items'][number] {
  return {
    key: signal.normalizedTerm.canonicalKey,
    label: signal.normalizedTerm.displayLabel,
    source: signal.source,
    confidence: signal.confidence,
    lastObservedAt: signal.observedAt,
  }
}

function uniqueItems(
  signals: PreferenceSignalLedgerEntry[]
): CulinaryProfileSnapshotBlock['items'] {
  const bestByKey = new Map<string, PreferenceSignalLedgerEntry>()

  for (const signal of signals) {
    const current = bestByKey.get(signal.normalizedTerm.canonicalKey)
    if (!current || signal.confidence > current.confidence) {
      bestByKey.set(signal.normalizedTerm.canonicalKey, signal)
    }
  }

  return [...bestByKey.values()].map(entryToItem)
}

function buildBlocks(profile: DerivedPreferenceProfile, signals: PreferenceSignalLedgerEntry[]) {
  const signalIds = new Set(signals.map((signal) => signal.id))
  const within = (items: PreferenceSignalLedgerEntry[]) =>
    items.filter((signal) => signalIds.has(signal.id))

  return [
    { title: 'Favorites', items: uniqueItems(within(profile.positives)) },
    { title: 'Dislikes', items: uniqueItems(within(profile.negatives)) },
    { title: 'Dietary Constraints', items: uniqueItems(within(profile.hardConstraints)) },
    { title: 'Never Show', items: uniqueItems(within(profile.exclusions)) },
    { title: 'Context', items: uniqueItems(within(profile.context)) },
  ].filter((block) => block.items.length > 0)
}

function sourceWindow(signals: PreferenceSignalLedgerEntry[]) {
  const timestamps = signals
    .map((signal) => Date.parse(signal.observedAt))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right)

  return {
    startsAt: timestamps[0] ? new Date(timestamps[0]).toISOString() : null,
    endsAt: timestamps[timestamps.length - 1]
      ? new Date(timestamps[timestamps.length - 1]).toISOString()
      : null,
    signalCount: signals.length,
  }
}

export function buildCulinaryProfileSnapshot(input: {
  profile: DerivedPreferenceProfile
  generatedAt?: string
  sharingGrant?: CulinaryProfileSharingGrant | null
}): CulinaryProfileSnapshot {
  const generatedAt = input.generatedAt ?? new Date().toISOString()
  const privateSignals = input.profile.resolved
  const shareableSignals = isGrantActive(input.sharingGrant, generatedAt)
    ? privateSignals.filter(
        (signal) =>
          signal.consent.chefSharing &&
          input.sharingGrant?.allowedCategories.includes(signal.shareCategory)
      )
    : []

  return {
    ownerId: input.profile.ownerId,
    version: 'culinary-profile-v1',
    generatedAt,
    sourceWindow: sourceWindow(privateSignals),
    privateSummary: buildBlocks(input.profile, privateSignals),
    shareableSummary: buildBlocks(input.profile, shareableSignals),
    readiness: {
      hasShareableContent: shareableSignals.length > 0,
      hasHardConstraints: input.profile.hardConstraints.length > 0,
      needsReview: input.profile.inferredForReview.length > 0,
    },
  }
}
