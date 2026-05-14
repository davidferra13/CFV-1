import type {
  DerivedPreferenceProfile,
  PreferenceShareCategory,
  PreferenceSignalLedgerEntry,
} from '@/lib/discovery/preference-contract'

export interface ChefClientTasteSummaryItem {
  signalId: string
  label: string
  source: PreferenceSignalLedgerEntry['source']
  confidence: number
  observedAt: string
  scopeLabel: string
}

export interface ChefClientTasteSummary {
  ownerId: string
  generatedAt: string
  access: 'allowed' | 'denied'
  favorites: ChefClientTasteSummaryItem[]
  avoids: ChefClientTasteSummaryItem[]
  safetyCritical: ChefClientTasteSummaryItem[]
  inferredSuggestions: ChefClientTasteSummaryItem[]
  recentChanges: ChefClientTasteSummaryItem[]
  safeMenuDirections: string[]
  warnings: string[]
  redacted: {
    privateSignalCount: number
    privateSafetySignalCount: number
  }
}

export interface ChefClientTasteSummaryOptions {
  generatedAt?: string
  canViewChefSharedProfile?: boolean
  allowedShareCategories?: PreferenceShareCategory[]
  recentLimit?: number
}

const DEFAULT_ALLOWED_CATEGORIES: PreferenceShareCategory[] = ['chef_visible', 'event_visible']

function canShare(
  signal: PreferenceSignalLedgerEntry,
  allowed: PreferenceShareCategory[]
): boolean {
  return signal.consent.chefSharing && allowed.includes(signal.shareCategory)
}

function toSummaryItem(signal: PreferenceSignalLedgerEntry): ChefClientTasteSummaryItem {
  return {
    signalId: signal.id,
    label: signal.normalizedTerm.displayLabel,
    source: signal.source,
    confidence: signal.confidence,
    observedAt: signal.observedAt,
    scopeLabel: signal.scope.label ?? signal.scope.level,
  }
}

function newestFirst(
  left: PreferenceSignalLedgerEntry,
  right: PreferenceSignalLedgerEntry
): number {
  return Date.parse(right.observedAt) - Date.parse(left.observedAt)
}

function uniqueByLabel(items: ChefClientTasteSummaryItem[]): ChefClientTasteSummaryItem[] {
  const seen = new Set<string>()
  const result: ChefClientTasteSummaryItem[] = []

  for (const item of items) {
    const key = item.label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }

  return result
}

export function buildChefClientTasteSummary(
  profile: DerivedPreferenceProfile,
  options?: ChefClientTasteSummaryOptions
): ChefClientTasteSummary {
  const generatedAt = options?.generatedAt ?? new Date().toISOString()
  const allowed = options?.allowedShareCategories ?? DEFAULT_ALLOWED_CATEGORIES

  if (options?.canViewChefSharedProfile === false) {
    return {
      ownerId: profile.ownerId,
      generatedAt,
      access: 'denied',
      favorites: [],
      avoids: [],
      safetyCritical: [],
      inferredSuggestions: [],
      recentChanges: [],
      safeMenuDirections: [],
      warnings: ['Client taste profile is not shared with this chef.'],
      redacted: {
        privateSignalCount: profile.resolved.length,
        privateSafetySignalCount: profile.hardConstraints.length + profile.exclusions.length,
      },
    }
  }

  const visible = profile.resolved.filter((signal) => canShare(signal, allowed))
  const visibleIds = new Set(visible.map((signal) => signal.id))
  const privateSignals = profile.resolved.filter((signal) => !visibleIds.has(signal.id))
  const privateSafety = [...profile.hardConstraints, ...profile.exclusions].filter(
    (signal) => !visibleIds.has(signal.id)
  )

  const favorites = uniqueByLabel(
    profile.positives.filter((signal) => visibleIds.has(signal.id)).map(toSummaryItem)
  )
  const avoids = uniqueByLabel(
    profile.negatives.filter((signal) => visibleIds.has(signal.id)).map(toSummaryItem)
  )
  const safetyCritical = uniqueByLabel(
    [...profile.hardConstraints, ...profile.exclusions]
      .filter((signal) => visibleIds.has(signal.id))
      .map(toSummaryItem)
  )
  const inferredSuggestions = uniqueByLabel(
    profile.inferredForReview.filter((signal) => canShare(signal, allowed)).map(toSummaryItem)
  )
  const recentChanges = visible
    .slice()
    .sort(newestFirst)
    .slice(0, options?.recentLimit ?? 5)
    .map(toSummaryItem)

  const safeMenuDirections = [
    ...favorites.slice(0, 3).map((item) => `Lean into ${item.label}.`),
    ...avoids.slice(0, 3).map((item) => `Avoid ${item.label} when possible.`),
    ...safetyCritical.slice(0, 3).map((item) => `Do not serve ${item.label}.`),
  ]

  const warnings = [
    ...(safetyCritical.length > 0 ? ['Safety-critical restrictions are present.'] : []),
    ...(privateSafety.length > 0
      ? ['Additional private safety constraints exist but are not shared by label.']
      : []),
    ...(inferredSuggestions.length > 0 ? ['Some inferred preferences still need review.'] : []),
  ]

  return {
    ownerId: profile.ownerId,
    generatedAt,
    access: 'allowed',
    favorites,
    avoids,
    safetyCritical,
    inferredSuggestions,
    recentChanges,
    safeMenuDirections,
    warnings,
    redacted: {
      privateSignalCount: privateSignals.length,
      privateSafetySignalCount: privateSafety.length,
    },
  }
}
