import {
  getBusinessTypeLabel,
  getCuisineLabel,
  getStateName,
  normalizeUsStateCode,
} from './constants'
import {
  hasNearbyCoordinates,
  normalizeNearbyLocationInput,
  normalizeNearbyRadius,
} from './nearby-search'

export type NearbySavedSearchInput = {
  query?: string | null
  businessType?: string | null
  cuisine?: string | null
  state?: string | null
  city?: string | null
  priceRange?: string | null
  locationQuery?: string | null
  locationLabel?: string | null
  radiusMiles?: number | null
  userLat?: number | null
  userLon?: number | null
  currentMatchCount?: number | null
}

export type NearbySavedSearchState = {
  query: string | null
  businessType: string | null
  cuisine: string | null
  state: string | null
  city: string | null
  priceRange: string | null
  locationQuery: string | null
  locationLabel: string | null
  radiusMiles: number | null
  userLat: number | null
  userLon: number | null
  baselineMatchCount: number
  searchKey: string
}

type NearbySavedSearchSummary = {
  chips: string[]
  summaryLabel: string
}

function normalizeText(value: string | null | undefined, maxLength = 120) {
  if (typeof value !== 'string') return null

  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return null
  return normalized.slice(0, maxLength)
}

function normalizeCoordinate(value: number | null | undefined) {
  if (!Number.isFinite(value)) return null
  return Math.round(Number(value) * 1000) / 1000
}

function buildSearchKey(input: Omit<NearbySavedSearchState, 'searchKey'>) {
  return JSON.stringify({
    q: input.query,
    type: input.businessType,
    cuisine: input.cuisine,
    state: input.state,
    city: input.city,
    price: input.priceRange,
    location: input.locationQuery,
    radius: input.radiusMiles,
    lat: input.userLat,
    lon: input.userLon,
  })
}

export function normalizeNearbySavedSearch(input: NearbySavedSearchInput): NearbySavedSearchState {
  const query = normalizeText(input.query)
  const businessType = normalizeText(input.businessType, 80)
  const cuisine = normalizeText(input.cuisine, 80)
  const state = normalizeUsStateCode(input.state)
  const city = normalizeText(input.city)
  const priceRange = normalizeText(input.priceRange, 12)
  const locationQuery = normalizeNearbyLocationInput(input.locationQuery) || null
  const locationLabel = normalizeNearbyLocationInput(input.locationLabel) || null
  const radiusMiles =
    input.radiusMiles != null ? normalizeNearbyRadius(input.radiusMiles, input.radiusMiles) : null
  const lat = normalizeCoordinate(input.userLat)
  const lon = normalizeCoordinate(input.userLon)
  const baselineMatchCount = Math.max(0, Math.round(Number(input.currentMatchCount) || 0))
  const hasCoordinates = hasNearbyCoordinates(lat, lon)

  const normalizedBase = {
    query,
    businessType,
    cuisine,
    state,
    city,
    priceRange,
    locationQuery,
    locationLabel,
    radiusMiles: locationQuery || locationLabel || hasCoordinates ? radiusMiles : null,
    userLat: hasCoordinates ? lat : null,
    userLon: hasCoordinates ? lon : null,
    baselineMatchCount,
  }

  return {
    ...normalizedBase,
    searchKey: buildSearchKey(normalizedBase),
  }
}

export function buildNearbySavedSearchSummary(
  input: NearbySavedSearchInput | NearbySavedSearchState
): NearbySavedSearchSummary {
  const search = 'searchKey' in input ? input : normalizeNearbySavedSearch(input)
  const chips: string[] = []
  const seen = new Set<string>()

  function pushChip(value: string | null) {
    if (!value) return
    const normalized = value.trim()
    if (!normalized) return

    const dedupeKey = normalized.toLowerCase()
    if (seen.has(dedupeKey)) return
    seen.add(dedupeKey)
    chips.push(normalized)
  }

  pushChip(search.businessType ? getBusinessTypeLabel(search.businessType) : null)
  pushChip(search.cuisine ? getCuisineLabel(search.cuisine) : null)

  if (search.city && search.state) {
    pushChip(`${search.city}, ${search.state}`)
  } else if (search.city) {
    pushChip(search.city)
  } else if (search.state) {
    pushChip(getStateName(search.state))
  }

  if (search.locationLabel) {
    pushChip(
      search.radiusMiles != null
        ? `Within ${search.radiusMiles} miles of ${search.locationLabel}`
        : `Near ${search.locationLabel}`
    )
  }

  pushChip(search.priceRange)
  pushChip(search.query ? `"${search.query}"` : null)

  return {
    chips,
    summaryLabel: chips.length > 0 ? chips.join(' | ') : 'All live Nearby listings',
  }
}

export function buildNearbySavedSearchSnapshot(state: NearbySavedSearchState) {
  return {
    query: state.query,
    businessType: state.businessType,
    cuisine: state.cuisine,
    state: state.state,
    city: state.city,
    priceRange: state.priceRange,
    locationQuery: state.locationQuery,
    locationLabel: state.locationLabel,
    radiusMiles: state.radiusMiles,
    userLat: state.userLat,
    userLon: state.userLon,
    baselineMatchCount: state.baselineMatchCount,
  }
}
