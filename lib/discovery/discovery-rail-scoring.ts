import type {
  RankedDiscoveryPreference,
  UserScrollSignals,
} from '@/lib/discovery/user-scroll-signals'

export type DiscoveryRailScoringItem = {
  type: string
  label: string
  href: string
}

export type DiscoveryRailDebugScore = {
  score: number
  preferenceScore: number
  editorialScore: number
  reason: string
}

export type DiscoveryRailScoredItem<T extends DiscoveryRailScoringItem> = {
  item: T
  debug: DiscoveryRailDebugScore
}

export type DiscoveryRailScoringContext = {
  role: 'cuisine' | 'mobile' | 'craving' | 'intent'
  locationActive?: boolean
  algorithmVersion?: string
}

const HARD_NEGATIVE_THRESHOLD = -8
const SOFT_NEGATIVE_THRESHOLD = -2

export function scoreDiscoveryRailItems<T extends DiscoveryRailScoringItem>(
  items: T[],
  userSignals: UserScrollSignals | null | undefined,
  context: DiscoveryRailScoringContext
): Array<DiscoveryRailScoredItem<T>> {
  const preferences = userSignals?.rankedPreferences ?? []
  const suppressed = new Set(
    (userSignals?.suppressedItems ?? []).map((item) => signalKey(item.itemType, item.itemValue))
  )

  return items
    .map((item, index) => {
      const preference = findBestPreference(item, preferences)
      const preferenceScore = preference?.score ?? 0
      const editorialScore = getEditorialScore(item, index, context)
      const negativePenalty =
        suppressed.has(signalKey(item.type, getItemSignalValue(item))) ||
        suppressed.has(signalKey(item.type, item.label))
          ? Math.abs(Math.min(preferenceScore, SOFT_NEGATIVE_THRESHOLD))
          : 0
      const score = editorialScore + preferenceScore - negativePenalty
      const reason = buildReason(item, preference, context, negativePenalty)

      return {
        item,
        debug: {
          score: round(score),
          preferenceScore: round(preferenceScore),
          editorialScore: round(editorialScore),
          reason,
        },
      }
    })
    .filter(({ debug }) => debug.preferenceScore > HARD_NEGATIVE_THRESHOLD)
    .sort((a, b) => b.debug.score - a.debug.score)
}

export function applyDiscoveryRailScores<T extends DiscoveryRailScoringItem>(
  items: T[],
  userSignals: UserScrollSignals | null | undefined,
  context: DiscoveryRailScoringContext,
  attachDebug: (item: T, debug: DiscoveryRailDebugScore) => T
): T[] {
  return scoreDiscoveryRailItems(items, userSignals, context).map(({ item, debug }) =>
    attachDebug(item, debug)
  )
}

function findBestPreference(
  item: DiscoveryRailScoringItem,
  preferences: RankedDiscoveryPreference[]
): RankedDiscoveryPreference | null {
  const itemValue = getItemSignalValue(item)
  const candidates = [
    signalKey(item.type, itemValue),
    signalKey(item.type, item.label),
    signalKey('search', itemValue),
  ]

  let best: RankedDiscoveryPreference | null = null
  for (const preference of preferences) {
    if (!candidates.includes(signalKey(preference.itemType, preference.itemValue))) continue
    if (!best || Math.abs(preference.score) > Math.abs(best.score)) best = preference
  }

  return best
}

function getEditorialScore(
  item: DiscoveryRailScoringItem,
  index: number,
  context: DiscoveryRailScoringContext
): number {
  let score = Math.max(0, 3 - index * 0.03)

  if (context.locationActive && item.type === 'location') score += 3
  if (item.type === 'culinary_signal' || item.type === 'seasonal') score += 1.4
  if (item.type === 'featured_chef') score += 1.2
  if (item.type === 'saved') score += 0.8
  if (context.role === 'cuisine' && item.type === 'cuisine') score += 0.6
  if (context.role === 'craving' && ['food_type', 'craving', 'mood'].includes(item.type)) {
    score += 0.6
  }
  if (
    context.role === 'intent' &&
    ['service', 'occasion', 'group_size', 'time'].includes(item.type)
  ) {
    score += 0.6
  }

  return score
}

function buildReason(
  item: DiscoveryRailScoringItem,
  preference: RankedDiscoveryPreference | null,
  context: DiscoveryRailScoringContext,
  negativePenalty: number
): string {
  if (preference && preference.score > 0) return `Matched learned ${preference.itemType} signal`
  if (preference && preference.score < 0) return `Demoted by learned ${preference.itemType} signal`
  if (negativePenalty > 0) return 'Suppressed by less-like-this feedback'
  if (context.locationActive && item.type === 'location') return 'Boosted by current location'
  if (item.type === 'culinary_signal' || item.type === 'seasonal')
    return 'Boosted by seasonal discovery'
  return 'Editorial discovery mix'
}

function getItemSignalValue(item: DiscoveryRailScoringItem): string {
  try {
    const url = new URL(item.href, 'https://chef.test')
    return (
      url.searchParams.get('cuisine') ??
      url.searchParams.get('serviceType') ??
      url.searchParams.get('dietary') ??
      url.searchParams.get('q') ??
      url.searchParams.get('type') ??
      url.searchParams.get('intent') ??
      url.searchParams.get('craving') ??
      url.searchParams.get('eventStyle') ??
      url.searchParams.get('location') ??
      normalize(item.label)
    )
  } catch {
    return normalize(item.label)
  }
}

function signalKey(type: string, value: string): string {
  return `${normalize(type)}:${normalize(value)}`
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_')
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}
