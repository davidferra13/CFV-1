export type DiscoveryAutocompleteType =
  | 'cuisine'
  | 'dish'
  | 'restaurant'
  | 'chef'
  | 'neighborhood'
  | 'occasion'
  | 'service'
  | 'dietary'

export type DiscoveryAutocompleteSource = {
  type: DiscoveryAutocompleteType
  label: string
  value?: string
  href?: string
  aliases?: string[]
  quality?: number
  boost?: number
}

export type DiscoveryAutocompleteOptions = {
  limit?: number
  favorites?: string[]
  recent?: string[]
  includeEmptyQuerySuggestions?: boolean
}

export type DiscoveryAutocompleteSuggestion = {
  type: DiscoveryAutocompleteType
  label: string
  value: string
  href: string
  score: number
  reason: 'prefix' | 'word_prefix' | 'alias' | 'contains' | 'recent' | 'favorite' | 'default'
}

export const DEFAULT_DISCOVERY_AUTOCOMPLETE_SOURCES: readonly DiscoveryAutocompleteSource[] = [
  source('cuisine', 'Italian', '/chefs?cuisine=italian', ['pasta', 'sicilian']),
  source('cuisine', 'Thai', '/chefs?cuisine=thai', ['pad thai', 'curry']),
  source('cuisine', 'Mexican', '/chefs?cuisine=mexican', ['tacos']),
  source('cuisine', 'Japanese', '/chefs?cuisine=japanese', ['sushi', 'ramen']),
  source('dish', 'Sushi', '/eat?craving=sushi', ['nigiri', 'omakase']),
  source('dish', 'Tacos', '/eat?craving=tacos', ['taqueria']),
  source('dish', 'Birthday cake', '/eat?intent=birthday&craving=cake', ['cake']),
  source('restaurant', 'Neighborhood restaurants', '/nearby?q=restaurants', ['operators']),
  source('chef', 'Private chefs', '/chefs?serviceType=private_dinner', ['chef', 'private dinner']),
  source('neighborhood', 'Brooklyn', '/nearby?location=Brooklyn', ['williamsburg', 'park slope']),
  source('neighborhood', 'Miami Beach', '/nearby?location=Miami%20Beach', ['south beach']),
  source('occasion', 'Birthday dinner', '/eat?intent=birthday_dinner', ['birthday']),
  source('occasion', 'Date night', '/eat?intent=date_night', ['romantic']),
  source('service', 'Meal prep', '/chefs?serviceType=meal_prep', ['weekly meals']),
  source('dietary', 'Vegetarian', '/chefs?dietary=vegetarian', ['veggie']),
]

export function buildDiscoveryAutocompleteSuggestions(
  query: string,
  sources: readonly DiscoveryAutocompleteSource[] = DEFAULT_DISCOVERY_AUTOCOMPLETE_SOURCES,
  options: DiscoveryAutocompleteOptions = {}
): DiscoveryAutocompleteSuggestion[] {
  const normalizedQuery = normalize(query)
  const limit = options.limit ?? 8
  const favoriteSet = new Set((options.favorites ?? []).map(normalize))
  const recentSet = new Set((options.recent ?? []).map(normalize))

  return sources
    .map((entry) => scoreSource(entry, normalizedQuery, favoriteSet, recentSet))
    .filter(
      (entry) => entry.score > 0 || (options.includeEmptyQuerySuggestions && !normalizedQuery)
    )
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .filter(dedupeSuggestion())
    .slice(0, limit)
}

function scoreSource(
  source: DiscoveryAutocompleteSource,
  normalizedQuery: string,
  favorites: Set<string>,
  recent: Set<string>
): DiscoveryAutocompleteSuggestion {
  const label = source.label.trim()
  const value = source.value ?? normalize(label)
  const normalizedLabel = normalize(label)
  const aliasMatch = (source.aliases ?? [])
    .map(normalize)
    .find((alias) => alias.includes(normalizedQuery))
  const favorite = favorites.has(normalizedLabel) || favorites.has(normalize(value))
  const recency = recent.has(normalizedLabel) || recent.has(normalize(value))

  let score = (source.boost ?? 0) + Math.max(0, Math.min(1, source.quality ?? 0.75)) * 10
  let reason: DiscoveryAutocompleteSuggestion['reason'] = 'default'

  if (normalizedQuery) {
    if (normalizedLabel.startsWith(normalizedQuery)) {
      score += 90
      reason = 'prefix'
    } else if (normalizedLabel.split(/\s+/).some((part) => part.startsWith(normalizedQuery))) {
      score += 72
      reason = 'word_prefix'
    } else if (aliasMatch) {
      score += 62
      reason = 'alias'
    } else if (normalizedLabel.includes(normalizedQuery)) {
      score += 42
      reason = 'contains'
    } else {
      score = 0
    }
  }

  if (favorite && score > 0) {
    score += 16
    reason = 'favorite'
  } else if (recency && score > 0) {
    score += 10
    reason = 'recent'
  }

  return {
    type: source.type,
    label,
    value,
    href: source.href ?? hrefFor(source.type, value),
    score: Math.round(score),
    reason,
  }
}

function hrefFor(type: DiscoveryAutocompleteType, value: string): string {
  const encoded = encodeURIComponent(value)
  if (type === 'cuisine') return `/chefs?cuisine=${encoded}`
  if (type === 'dish') return `/eat?craving=${encoded}`
  if (type === 'neighborhood') return `/nearby?location=${encoded}`
  if (type === 'occasion') return `/eat?intent=${encoded}`
  if (type === 'dietary') return `/chefs?dietary=${encoded}`
  if (type === 'service') return `/chefs?serviceType=${encoded}`
  if (type === 'chef') return `/chefs?q=${encoded}`
  return `/nearby?q=${encoded}`
}

function dedupeSuggestion(): (suggestion: DiscoveryAutocompleteSuggestion) => boolean {
  const seen = new Set<string>()
  return (suggestion) => {
    const key = `${suggestion.type}:${normalize(suggestion.value)}:${suggestion.href}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }
}

function source(
  type: DiscoveryAutocompleteType,
  label: string,
  href: string,
  aliases: string[] = []
): DiscoveryAutocompleteSource {
  return { type, label, href, aliases, quality: 0.8 }
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
}
