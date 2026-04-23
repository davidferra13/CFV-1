import type { DirectoryStats } from './actions'
import {
  getBusinessTypeCollectionLabel,
  getCuisineLabel,
  getStateName,
  normalizeUsStateCode,
} from './constants'
import { NEARBY_RADIUS_OPTIONS } from './nearby-search'

export type NearbyFallbackAction = {
  href: string
  label: string
  description: string
  variant?: 'primary' | 'secondary' | 'subtle'
}

export type NearbyFallbackFilters = {
  query?: string | null
  businessType?: string | null
  cuisine?: string | null
  state?: string | null
  city?: string | null
  priceRange?: string | null
  locationQuery?: string | null
  radiusMiles?: number | null
  lat?: string | null
  lon?: string | null
}

type BuildNearbyBrowseFallbackActionsOptions = {
  filters: NearbyFallbackFilters
  stats?: DirectoryStats | null
  maxActions?: number
}

type NormalizedNearbyFallbackFilters = {
  query: string
  businessType: string
  cuisine: string
  state: string
  city: string
  priceRange: string
  locationQuery: string
  radiusMiles: number | null
  lat: string
  lon: string
}

function cleanText(value?: string | null) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeFilters(filters: NearbyFallbackFilters): NormalizedNearbyFallbackFilters {
  return {
    query: cleanText(filters.query),
    businessType: cleanText(filters.businessType),
    cuisine: cleanText(filters.cuisine),
    state: normalizeUsStateCode(filters.state) ?? '',
    city: cleanText(filters.city),
    priceRange: cleanText(filters.priceRange),
    locationQuery: cleanText(filters.locationQuery),
    radiusMiles:
      typeof filters.radiusMiles === 'number' && Number.isFinite(filters.radiusMiles)
        ? Math.max(1, Math.round(filters.radiusMiles))
        : null,
    lat: cleanText(filters.lat),
    lon: cleanText(filters.lon),
  }
}

function hasCoordinateLocation(filters: NormalizedNearbyFallbackFilters) {
  return filters.lat.length > 0 && filters.lon.length > 0
}

function buildLocationAnchorLabel(filters: NormalizedNearbyFallbackFilters) {
  if (filters.locationQuery) return filters.locationQuery
  if (hasCoordinateLocation(filters)) return 'this location'
  return null
}

export function buildNearbyBrowseHrefFromFilters(filters: NearbyFallbackFilters) {
  const normalized = normalizeFilters(filters)
  const params = new URLSearchParams()

  if (normalized.query) params.set('q', normalized.query)
  if (normalized.businessType) params.set('type', normalized.businessType)
  if (normalized.cuisine) params.set('cuisine', normalized.cuisine)
  if (normalized.state) params.set('state', normalized.state)
  if (normalized.city) params.set('city', normalized.city)
  if (normalized.priceRange) params.set('price', normalized.priceRange)
  if (normalized.locationQuery) params.set('location', normalized.locationQuery)
  if (normalized.radiusMiles != null && (normalized.locationQuery || hasCoordinateLocation(normalized))) {
    params.set('radius', String(normalized.radiusMiles))
  }
  if (hasCoordinateLocation(normalized)) {
    params.set('lat', normalized.lat)
    params.set('lon', normalized.lon)
  }

  const queryString = params.toString()
  return queryString ? `/nearby?${queryString}` : '/nearby'
}

export function dedupeNearbyFallbackActions(
  actions: NearbyFallbackAction[],
  maxActions = actions.length
) {
  const deduped: NearbyFallbackAction[] = []
  const seenHrefs = new Set<string>()

  for (const action of actions) {
    if (!action?.href || seenHrefs.has(action.href)) continue
    seenHrefs.add(action.href)
    deduped.push(action)

    if (deduped.length >= maxActions) {
      break
    }
  }

  return deduped
}

function pluralizeListings(count: number) {
  return count === 1 ? 'listing' : 'listings'
}

function getNextRadiusOption(radiusMiles: number | null) {
  if (radiusMiles == null) return null
  return NEARBY_RADIUS_OPTIONS.find((option) => option > radiusMiles) ?? null
}

function findBestTypeCity(
  stats: DirectoryStats,
  businessType: string,
  currentState: string,
  currentCity: string
) {
  const matches = stats.topCityBusinessTypes.filter(
    (entry) =>
      entry.businessType === businessType &&
      !(entry.state === currentState && entry.city.toLowerCase() === currentCity.toLowerCase())
  )

  if (matches.length === 0) return null

  return (
    matches.find(
      (entry) =>
        entry.state === currentState && entry.city.toLowerCase() !== currentCity.toLowerCase()
    ) ??
    matches[0] ??
    null
  )
}

function findBestStateCity(stats: DirectoryStats, state: string, currentCity: string) {
  return (
    stats.topCities.find(
      (entry) => entry.state === state && entry.city.toLowerCase() !== currentCity.toLowerCase()
    ) ?? null
  )
}

export function buildNearbyBrowseFallbackActions({
  filters,
  stats,
  maxActions = 3,
}: BuildNearbyBrowseFallbackActionsOptions): NearbyFallbackAction[] {
  const normalized = normalizeFilters(filters)
  const currentHref = buildNearbyBrowseHrefFromFilters(normalized)
  const stateName = normalized.state ? getStateName(normalized.state) : ''
  const typeCollectionLabel = normalized.businessType
    ? getBusinessTypeCollectionLabel(normalized.businessType)
    : ''
  const cuisineLabel = normalized.cuisine ? getCuisineLabel(normalized.cuisine) : ''
  const locationAnchorLabel = buildLocationAnchorLabel(normalized)
  const actions: NearbyFallbackAction[] = []

  function pushAction(action: NearbyFallbackAction) {
    if (!action.href || action.href === currentHref) return
    actions.push(action)
  }

  const nextRadius = getNextRadiusOption(normalized.radiusMiles)
  if (locationAnchorLabel && nextRadius != null) {
    pushAction({
      href: buildNearbyBrowseHrefFromFilters({
        ...normalized,
        radiusMiles: nextRadius,
      }),
      label: `Widen to ${nextRadius} miles`,
      description: `Keep ${locationAnchorLabel} as the anchor and broaden the radius.`,
      variant: 'primary',
    })
  }

  if (locationAnchorLabel && normalized.radiusMiles != null) {
    pushAction({
      href: buildNearbyBrowseHrefFromFilters({
        ...normalized,
        radiusMiles: null,
      }),
      label: 'Any distance',
      description: 'Keep the location anchor and remove the radius cap.',
      variant: nextRadius == null ? 'primary' : 'secondary',
    })
  }

  if (normalized.city && normalized.state) {
    const cityLabel = `${normalized.city}, ${stateName}`

    if (normalized.businessType || normalized.cuisine || normalized.query || normalized.priceRange) {
      pushAction({
        href: buildNearbyBrowseHrefFromFilters({
          state: normalized.state,
          city: normalized.city,
        }),
        label: `All food in ${normalized.city}`,
        description: `Keep ${cityLabel} as the anchor and drop the narrower filters.`,
        variant: 'primary',
      })
    }

    if (normalized.businessType && typeCollectionLabel) {
      pushAction({
        href: buildNearbyBrowseHrefFromFilters({
          state: normalized.state,
          businessType: normalized.businessType,
        }),
        label: `${typeCollectionLabel} across ${stateName}`,
        description: `Keep the category and widen from ${normalized.city} to the full state.`,
        variant: 'secondary',
      })
    }

    if (normalized.cuisine && cuisineLabel) {
      pushAction({
        href: buildNearbyBrowseHrefFromFilters({
          state: normalized.state,
          cuisine: normalized.cuisine,
        }),
        label: `${cuisineLabel} across ${stateName}`,
        description: `Keep the cuisine and widen from ${normalized.city} to the full state.`,
        variant: 'secondary',
      })
    }
  }

  if (normalized.query) {
    pushAction({
      href: buildNearbyBrowseHrefFromFilters({
        ...normalized,
        query: null,
      }),
      label: 'Remove search text',
      description: 'Keep the current geography and category filters without requiring a keyword match.',
      variant: 'secondary',
    })
  }

  if (normalized.priceRange) {
    pushAction({
      href: buildNearbyBrowseHrefFromFilters({
        ...normalized,
        priceRange: null,
      }),
      label: 'All prices',
      description: 'Keep the rest of the browse and remove the price band.',
      variant: 'secondary',
    })
  }

  if (normalized.state && !normalized.city && normalized.businessType && typeCollectionLabel) {
    pushAction({
      href: buildNearbyBrowseHrefFromFilters({
        businessType: normalized.businessType,
      }),
      label: `All ${typeCollectionLabel.toLowerCase()}`,
      description: 'Drop the state filter and keep the category only.',
      variant: 'secondary',
    })
  }

  if (normalized.state && !normalized.city && normalized.cuisine && cuisineLabel) {
    pushAction({
      href: buildNearbyBrowseHrefFromFilters({
        cuisine: normalized.cuisine,
      }),
      label: `All ${cuisineLabel} food`,
      description: 'Drop the state filter and keep the cuisine only.',
      variant: 'secondary',
    })
  }

  if (stats && normalized.businessType && typeCollectionLabel && (normalized.state || normalized.city)) {
    const typeCity = findBestTypeCity(stats, normalized.businessType, normalized.state, normalized.city)
    if (typeCity) {
      pushAction({
        href: buildNearbyBrowseHrefFromFilters({
          state: typeCity.state,
          city: typeCity.city,
          businessType: normalized.businessType,
        }),
        label: `Try ${typeCollectionLabel} in ${typeCity.city}`,
        description: `This city-and-category path already has ${typeCity.count.toLocaleString()} live ${pluralizeListings(typeCity.count)}.`,
        variant: 'secondary',
      })
    }
  }

  if (stats && normalized.state && normalized.city) {
    const stateCity = findBestStateCity(stats, normalized.state, normalized.city)
    if (stateCity) {
      pushAction({
        href: buildNearbyBrowseHrefFromFilters({
          state: normalized.state,
          city: stateCity.city,
          businessType: normalized.businessType || null,
          cuisine: normalized.cuisine || null,
        }),
        label: `Try ${stateCity.city}, ${stateName}`,
        description: `${stateCity.city}, ${stateName} already has ${stateCity.count.toLocaleString()} live ${pluralizeListings(stateCity.count)}.`,
        variant: 'secondary',
      })
    }
  }

  if (!normalized.state && !normalized.city) {
    pushAction({
      href: '/nearby/collections',
      label: 'Browse collections',
      description:
        'Start with curated city-and-category paths instead of jumping into a default market.',
      variant: 'secondary',
    })
  }

  pushAction({
    href: '/nearby',
    label: 'Browse all Nearby',
    description: 'Reset to the live directory and start from the strongest current coverage.',
    variant: actions.length === 0 ? 'primary' : 'subtle',
  })

  return dedupeNearbyFallbackActions(actions, maxActions)
}
