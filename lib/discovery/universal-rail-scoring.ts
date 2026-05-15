import type {
  UniversalRailItem,
  UniversalRailItemDefinition,
  UniversalRailWeightProfile,
  UniversalRailScoreBreakdown,
  UniversalRailRole,
  UniversalRailDecayFn,
} from './universal-rail-types'

export const ROLE_WEIGHT_PROFILES: Record<UniversalRailRole, UniversalRailWeightProfile> = {
  public: {
    urgency: 0.15,
    relevance: 0.25,
    freshness: 0.2,
    userAffinity: 0.25,
    fatigue: 0.1,
    boost: 1.0,
  },
  guest: {
    urgency: 0.15,
    relevance: 0.3,
    freshness: 0.15,
    userAffinity: 0.25,
    fatigue: 0.1,
    boost: 1.0,
  },
  client: {
    urgency: 0.25,
    relevance: 0.2,
    freshness: 0.2,
    userAffinity: 0.15,
    fatigue: 0.1,
    boost: 1.0,
  },
  chef: {
    urgency: 0.3,
    relevance: 0.15,
    freshness: 0.15,
    userAffinity: 0.1,
    fatigue: 0.05,
    boost: 1.5,
  },
  staff: {
    urgency: 0.35,
    relevance: 0.15,
    freshness: 0.2,
    userAffinity: 0.1,
    fatigue: 0.05,
    boost: 1.0,
  },
  partner: {
    urgency: 0.25,
    relevance: 0.2,
    freshness: 0.15,
    userAffinity: 0.15,
    fatigue: 0.1,
    boost: 1.0,
  },
  admin: {
    urgency: 0.35,
    relevance: 0.1,
    freshness: 0.25,
    userAffinity: 0.05,
    fatigue: 0.05,
    boost: 1.5,
  },
}

function clamp(value: number, min = 0, max = 100): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(min, Math.min(max, value))
}

export function computeDecay(
  decayFn: UniversalRailDecayFn,
  baseUrgency: number,
  ageMs: number,
  windowMs: number
): number {
  if (windowMs <= 0) return baseUrgency
  const ratio = Math.min(1, ageMs / windowMs)

  switch (decayFn) {
    case 'deadline':
      return baseUrgency * (0.5 + 0.5 * ratio)
    case 'linear':
      return baseUrgency * (1 - ratio * 0.8)
    case 'step':
      if (ratio < 0.5) return baseUrgency
      if (ratio < 0.8) return baseUrgency * 0.6
      return baseUrgency * 0.3
    case 'inverse':
      return baseUrgency * (1 + ratio * 0.5)
    case 'none':
      return baseUrgency
  }
}

export function computeFatigue(
  impressionCount: number,
  maxImpressions: number,
  cooldownMinutes: number,
  lastSeenAt: Date | null,
  now: Date
): number {
  if (maxImpressions === -1 && cooldownMinutes === 0) return 0

  let penalty = 0

  if (maxImpressions > 0 && impressionCount > 0) {
    const ratio = impressionCount / maxImpressions
    if (ratio >= 1) return 100
    penalty += ratio * 40
  }

  if (cooldownMinutes > 0 && lastSeenAt) {
    const elapsedMs = now.getTime() - lastSeenAt.getTime()
    const cooldownMs = cooldownMinutes * 60_000
    if (elapsedMs < cooldownMs) {
      const cooldownRatio = 1 - elapsedMs / cooldownMs
      penalty += cooldownRatio * 30
    }
  }

  return clamp(penalty)
}

export function computePageAffinity(
  pageAffinity: string,
  pageAffinityBoost: number,
  currentPage: string | null
): number {
  if (!currentPage || !pageAffinity) return 0
  if (currentPage === pageAffinity) return pageAffinityBoost
  if (currentPage.startsWith(pageAffinity + '/')) return pageAffinityBoost * 0.5
  return 0
}

export function computeUniversalRailScore(params: {
  definition: UniversalRailItemDefinition
  weights: UniversalRailWeightProfile
  now: Date
  ageMs: number
  windowMs: number
  relevanceScore: number
  userAffinityScore: number
  impressionCount: number
  lastSeenAt: Date | null
  currentPage: string | null
  boostValue: number
}): UniversalRailScoreBreakdown {
  const {
    definition,
    weights,
    now,
    ageMs,
    windowMs,
    relevanceScore,
    userAffinityScore,
    impressionCount,
    lastSeenAt,
    currentPage,
    boostValue,
  } = params

  const urgency = computeDecay(definition.urgencyDecayFn, definition.baseUrgency, ageMs, windowMs)

  const freshness = windowMs > 0 ? clamp(100 * (1 - Math.min(1, ageMs / windowMs))) : 50

  const fatigue = computeFatigue(
    impressionCount,
    definition.maxImpressions,
    definition.cooldownMinutes,
    lastSeenAt,
    now
  )

  const pageBoost = computePageAffinity(
    definition.pageAffinity,
    definition.pageAffinityBoost,
    currentPage
  )

  const relevance = clamp(relevanceScore)
  const userAffinity = clamp(userAffinityScore + pageBoost)
  const boost = clamp(boostValue, 0, 30) * weights.boost

  const final = clamp(
    urgency * weights.urgency +
      relevance * weights.relevance +
      freshness * weights.freshness +
      userAffinity * weights.userAffinity -
      fatigue * weights.fatigue +
      boost
  )

  return {
    urgency,
    relevance,
    freshness,
    userAffinity,
    fatigue,
    boost,
    final,
    weights,
  }
}

export function rankUniversalRailItems(items: UniversalRailItem[]): UniversalRailItem[] {
  return [...items].sort((a, b) => b.score - a.score)
}

export function filterSuppressedItems(items: UniversalRailItem[]): UniversalRailItem[] {
  return items.filter((item) => {
    if (item.dismissedAt) return false
    if (item.maxImpressions > 0 && item.impressionCount >= item.maxImpressions) return false
    return true
  })
}

export function applySlotPolicy(
  items: UniversalRailItem[],
  policy: {
    maxNonPracticalRatio: number
    maxPromotionalCount: number
    minPracticalCount: number
    maxEditorialCount: number
  },
  slotClassifier: (
    item: UniversalRailItem
  ) => 'practical' | 'ambient' | 'editorial' | 'promotional' | 'planned'
): UniversalRailItem[] {
  const classified = items.map((item) => ({ item, slot: slotClassifier(item) }))
  const practical = classified.filter((c) => c.slot === 'practical')
  const nonPractical = classified.filter((c) => c.slot !== 'practical')

  if (practical.length < policy.minPracticalCount) return items

  const maxNonPractical = Math.floor(items.length * policy.maxNonPracticalRatio)
  const cappedNonPractical = nonPractical.slice(0, maxNonPractical)

  let promoCount = 0
  let editorialCount = 0
  const filtered = cappedNonPractical.filter((c) => {
    if (c.slot === 'promotional') {
      promoCount++
      return promoCount <= policy.maxPromotionalCount
    }
    if (c.slot === 'editorial') {
      editorialCount++
      return editorialCount <= policy.maxEditorialCount
    }
    return true
  })

  return [...practical.map((c) => c.item), ...filtered.map((c) => c.item)].sort(
    (a, b) => b.score - a.score
  )
}
