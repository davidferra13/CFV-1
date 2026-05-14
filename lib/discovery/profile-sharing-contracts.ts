import type {
  PreferenceSignalLedgerEntry,
  PreferenceSignalSource,
} from '@/lib/discovery/preference-contract'

export type CulinaryProfileShareCategory =
  | 'cuisines'
  | 'ingredients'
  | 'dietary'
  | 'dislikes'
  | 'restaurants'
  | 'dishes'
  | 'budget'
  | 'cravings'
  | 'fatigue'
  | 'service_style'

export const CULINARY_PROFILE_SHARE_CATEGORIES: CulinaryProfileShareCategory[] = [
  'cuisines',
  'ingredients',
  'dietary',
  'dislikes',
  'restaurants',
  'dishes',
  'budget',
  'cravings',
  'fatigue',
  'service_style',
]

export type ProfileSharingGrantScope = 'chef' | 'relationship'

export interface CulinaryProfileSharingGrantRecord {
  id: string
  ownerId: string
  scope: ProfileSharingGrantScope
  granteeChefId?: string | null
  relationshipId?: string | null
  categories: CulinaryProfileShareCategory[]
  grantedAt: string
  expiresAt?: string | null
  revokedAt?: string | null
  revokedReason?: string | null
}

export interface CulinaryProfileAccessContext {
  ownerId: string
  requestingChefId?: string | null
  relationshipId?: string | null
  now?: string
}

export type SharingDenialReason =
  | 'no_active_grant'
  | 'category_not_granted'
  | 'signal_private'
  | 'signal_hidden_from_chef'
  | 'signal_not_reviewed'
  | 'signal_not_consented'
  | 'owner_mismatch'

export interface SignalSharingDecision {
  signal: PreferenceSignalLedgerEntry
  category: CulinaryProfileShareCategory
  allowed: boolean
  reason?: SharingDenialReason
  grantId?: string
}

function timestamp(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function isCulinaryProfileSharingGrantActive(
  grant: CulinaryProfileSharingGrantRecord,
  context: CulinaryProfileAccessContext
): boolean {
  if (grant.ownerId !== context.ownerId) return false
  if (grant.revokedAt) return false

  const now = timestamp(context.now ?? new Date().toISOString()) ?? Date.now()
  const expiresAt = timestamp(grant.expiresAt)
  if (expiresAt !== null && expiresAt <= now) return false

  if (grant.scope === 'chef') {
    return Boolean(grant.granteeChefId && grant.granteeChefId === context.requestingChefId)
  }

  return Boolean(grant.relationshipId && grant.relationshipId === context.relationshipId)
}

export function getCulinaryProfileSignalCategory(
  signal: PreferenceSignalLedgerEntry
): CulinaryProfileShareCategory {
  const metadataCategory = signal.metadata.culinaryProfileCategory

  if (
    typeof metadataCategory === 'string' &&
    CULINARY_PROFILE_SHARE_CATEGORIES.includes(metadataCategory as CulinaryProfileShareCategory)
  ) {
    return metadataCategory as CulinaryProfileShareCategory
  }

  if (signal.polarity === 'allergy' || signal.polarity === 'restriction') return 'dietary'
  if (signal.polarity === 'dislike' || signal.polarity === 'never_show') return 'dislikes'

  switch (signal.normalizedTerm.kind) {
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
      return signal.source === 'repeated_behavior' ? 'fatigue' : 'cravings'
  }
}

export function findActiveCulinaryProfileGrant(input: {
  grants: CulinaryProfileSharingGrantRecord[]
  context: CulinaryProfileAccessContext
  category: CulinaryProfileShareCategory
}): CulinaryProfileSharingGrantRecord | null {
  return (
    input.grants.find(
      (grant) =>
        isCulinaryProfileSharingGrantActive(grant, input.context) &&
        grant.categories.includes(input.category)
    ) ?? null
  )
}

export function decideCulinaryProfileSignalSharing(input: {
  signal: PreferenceSignalLedgerEntry
  grants: CulinaryProfileSharingGrantRecord[]
  context: CulinaryProfileAccessContext
}): SignalSharingDecision {
  const category = getCulinaryProfileSignalCategory(input.signal)

  if (input.signal.ownerId !== input.context.ownerId) {
    return { signal: input.signal, category, allowed: false, reason: 'owner_mismatch' }
  }

  if (input.signal.shareCategory === 'private') {
    return { signal: input.signal, category, allowed: false, reason: 'signal_private' }
  }

  if (input.signal.metadata.hiddenFromChef === true || input.signal.metadata.private === true) {
    return { signal: input.signal, category, allowed: false, reason: 'signal_hidden_from_chef' }
  }

  if (input.signal.reviewState !== 'accepted') {
    return { signal: input.signal, category, allowed: false, reason: 'signal_not_reviewed' }
  }

  if (!input.signal.consent.chefSharing) {
    return { signal: input.signal, category, allowed: false, reason: 'signal_not_consented' }
  }

  const hasAnyActiveGrant = input.grants.some((grant) =>
    isCulinaryProfileSharingGrantActive(grant, input.context)
  )
  const grant = findActiveCulinaryProfileGrant({
    grants: input.grants,
    context: input.context,
    category,
  })

  if (!grant) {
    return {
      signal: input.signal,
      category,
      allowed: false,
      reason: hasAnyActiveGrant ? 'category_not_granted' : 'no_active_grant',
    }
  }

  return { signal: input.signal, category, allowed: true, grantId: grant.id }
}

export function filterShareableCulinaryProfileSignals(input: {
  signals: PreferenceSignalLedgerEntry[]
  grants: CulinaryProfileSharingGrantRecord[]
  context: CulinaryProfileAccessContext
}): {
  allowedSignals: PreferenceSignalLedgerEntry[]
  decisions: SignalSharingDecision[]
  redactionCounts: Record<SharingDenialReason, number>
} {
  const decisions = input.signals.map((signal) =>
    decideCulinaryProfileSignalSharing({
      signal,
      grants: input.grants,
      context: input.context,
    })
  )
  const redactionCounts = Object.create(null) as Record<SharingDenialReason, number>

  for (const decision of decisions) {
    if (!decision.allowed && decision.reason) {
      redactionCounts[decision.reason] = (redactionCounts[decision.reason] ?? 0) + 1
    }
  }

  return {
    allowedSignals: decisions
      .filter((decision) => decision.allowed)
      .map((decision) => decision.signal),
    decisions,
    redactionCounts,
  }
}

export interface SharedProfileReportItem {
  key: string
  label: string
  category: CulinaryProfileShareCategory
  confidence: number
  source: PreferenceSignalSource
  lastObservedAt: string
}

export function toSharedProfileReportItems(
  signals: PreferenceSignalLedgerEntry[]
): SharedProfileReportItem[] {
  const bestByKey = new Map<string, SharedProfileReportItem>()

  for (const signal of signals) {
    const category = getCulinaryProfileSignalCategory(signal)
    const item = {
      key: signal.normalizedTerm.canonicalKey,
      label: signal.normalizedTerm.displayLabel,
      category,
      confidence: signal.confidence,
      source: signal.source,
      lastObservedAt: signal.observedAt,
    }
    const current = bestByKey.get(item.key)

    if (
      !current ||
      item.confidence > current.confidence ||
      Date.parse(item.lastObservedAt) > Date.parse(current.lastObservedAt)
    ) {
      bestByKey.set(item.key, item)
    }
  }

  return [...bestByKey.values()].sort((left, right) => {
    const byCategory = left.category.localeCompare(right.category)
    if (byCategory !== 0) return byCategory
    return right.confidence - left.confidence
  })
}
