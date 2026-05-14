export type FavoriteDiscoveryEntityType =
  | 'chef'
  | 'restaurant'
  | 'operator'
  | 'cuisine'
  | 'dish'
  | 'occasion'
  | 'location'

export type FavoriteDiscoveryEntity = {
  id: string
  type: FavoriteDiscoveryEntityType
  label: string
  href?: string | null
  cuisines?: string[]
  dishes?: string[]
  occasions?: string[]
  locations?: string[]
  styles?: string[]
  savedAt?: string | null
}

export type FavoriteDiscoverySignal = {
  type: FavoriteDiscoveryEntityType | 'style'
  value: string
  weight: number
  sourceFavoriteId: string
  direct: boolean
}

export type DiscoverySignalCandidate = {
  id: string
  type: FavoriteDiscoveryEntityType | 'style'
  label: string
  href: string
  baseScore?: number
  tags?: string[]
}

export type DiscoverySignalPolicyOptions = {
  favoritesMode?: boolean
  incognito?: boolean
}

export type RankedDiscoverySignalCandidate<T extends DiscoverySignalCandidate> = T & {
  score: number
  favoriteSignalWeight: number
  influenceAllowed: boolean
  reasons: string[]
}

export function extractFavoriteDiscoverySignals(
  favorites: readonly FavoriteDiscoveryEntity[]
): FavoriteDiscoverySignal[] {
  const signals: FavoriteDiscoverySignal[] = []

  for (const favorite of favorites) {
    signals.push(signal(favorite.type, favorite.label, 12, favorite.id, true))
    for (const cuisine of favorite.cuisines ?? []) {
      signals.push(signal('cuisine', cuisine, 7, favorite.id, false))
    }
    for (const dish of favorite.dishes ?? []) {
      signals.push(signal('dish', dish, 6, favorite.id, false))
    }
    for (const occasion of favorite.occasions ?? []) {
      signals.push(signal('occasion', occasion, 5, favorite.id, false))
    }
    for (const location of favorite.locations ?? []) {
      signals.push(signal('location', location, 4, favorite.id, false))
    }
    for (const style of favorite.styles ?? []) {
      signals.push(signal('style', style, 3, favorite.id, false))
    }
  }

  return dedupeSignals(signals)
}

export function applyDiscoverySignalPolicy<T extends DiscoverySignalCandidate>(
  candidates: readonly T[],
  signals: readonly FavoriteDiscoverySignal[],
  options: DiscoverySignalPolicyOptions = {}
): Array<RankedDiscoverySignalCandidate<T>> {
  const influenceAllowed = options.incognito !== true && options.favoritesMode === true
  const signalMap = new Map(signals.map((entry) => [signalKey(entry.type, entry.value), entry]))

  return candidates
    .map((candidate) => {
      const matched = influenceAllowed ? findSignalsForCandidate(candidate, signalMap) : []
      const favoriteSignalWeight = matched.reduce((sum, entry) => sum + entry.weight, 0)
      const reasons = matched.map((entry) =>
        entry.direct ? `Favorite ${entry.type}` : `Inferred ${entry.type} from favorite`
      )

      return {
        ...candidate,
        score: (candidate.baseScore ?? 0) + favoriteSignalWeight,
        favoriteSignalWeight,
        influenceAllowed,
        reasons,
      }
    })
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
}

function findSignalsForCandidate(
  candidate: DiscoverySignalCandidate,
  signals: Map<string, FavoriteDiscoverySignal>
): FavoriteDiscoverySignal[] {
  const keys = [
    signalKey(candidate.type, candidate.label),
    ...(candidate.tags ?? []).map((tag) => signalKey('cuisine', tag)),
    ...(candidate.tags ?? []).map((tag) => signalKey('dish', tag)),
    ...(candidate.tags ?? []).map((tag) => signalKey('occasion', tag)),
    ...(candidate.tags ?? []).map((tag) => signalKey('location', tag)),
    ...(candidate.tags ?? []).map((tag) => signalKey('style', tag)),
  ]

  return keys
    .map((key) => signals.get(key))
    .filter((entry): entry is FavoriteDiscoverySignal => !!entry)
}

function signal(
  type: FavoriteDiscoverySignal['type'],
  value: string,
  weight: number,
  sourceFavoriteId: string,
  direct: boolean
): FavoriteDiscoverySignal {
  return { type, value, weight, sourceFavoriteId, direct }
}

function dedupeSignals(signals: FavoriteDiscoverySignal[]): FavoriteDiscoverySignal[] {
  const byKey = new Map<string, FavoriteDiscoverySignal>()
  for (const entry of signals) {
    const key = signalKey(entry.type, entry.value)
    const current = byKey.get(key)
    if (!current || entry.weight > current.weight) byKey.set(key, entry)
  }
  return [...byKey.values()]
}

function signalKey(type: string, value: string): string {
  return `${type}:${value.trim().toLowerCase().replace(/\s+/g, '_')}`
}
