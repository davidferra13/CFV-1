import 'server-only'

import type { DirectoryChef, DirectoryPartnerLocation } from '@/lib/directory/actions'
import {
  calculateDistanceMiles,
  formatLocationQueryValue,
  normalizeLocationStateToken,
  resolvePublicLocationQuery,
  resolveUsStateValue,
  type ResolvedPublicLocation,
} from '@/lib/geo/public-location'

type DirectoryCoveragePoint = {
  lat: number
  lng: number
  label: string
}

function buildPartnerLocationQuery(location: DirectoryPartnerLocation) {
  const fullAddress = [location.address, location.city, location.state, location.zip]
    .filter(Boolean)
    .join(', ')
  if (fullAddress) return fullAddress

  return formatLocationQueryValue({
    city: location.city,
    state: location.state,
    zip: location.zip,
  })
}

function buildChefCoverageQueries(chef: DirectoryChef) {
  const queries = new Set<string>()

  const serviceAreaQuery = formatLocationQueryValue({
    city: chef.discovery.service_area_city,
    state: chef.discovery.service_area_state,
    zip: chef.discovery.service_area_zip,
  })
  if (serviceAreaQuery) queries.add(serviceAreaQuery)

  const listingQuery = formatLocationQueryValue({
    city: chef.directory_listing_location?.city,
    state: chef.directory_listing_location?.state,
    zip: chef.directory_listing_location?.zip,
  })
  if (listingQuery) queries.add(listingQuery)

  for (const partner of chef.partners) {
    for (const location of partner.partner_locations) {
      const query = buildPartnerLocationQuery(location)
      if (query) queries.add(query)
    }
  }

  return Array.from(queries)
}

function buildResolvedCoveragePoints(
  chef: DirectoryChef,
  resolvedQueryMap: Map<string, ResolvedPublicLocation>
) {
  const points: DirectoryCoveragePoint[] = []

  if (
    typeof chef.discovery.service_area_lat === 'number' &&
    typeof chef.discovery.service_area_lng === 'number'
  ) {
    points.push({
      lat: chef.discovery.service_area_lat,
      lng: chef.discovery.service_area_lng,
      label:
        formatLocationQueryValue({
          city: chef.discovery.service_area_city,
          state: chef.discovery.service_area_state,
          zip: chef.discovery.service_area_zip,
        }) || 'service area',
    })
  }

  for (const query of buildChefCoverageQueries(chef)) {
    const resolved = resolvedQueryMap.get(query)
    if (!resolved) continue

    points.push({
      lat: resolved.lat,
      lng: resolved.lng,
      label: resolved.displayLabel,
    })
  }

  return points
}

function hasStateFallbackCoverage(chef: DirectoryChef, searchLocation: ResolvedPublicLocation) {
  const searchState = normalizeLocationStateToken(searchLocation.state)
  if (!searchState) return false

  const states = new Set<string | null>([
    normalizeLocationStateToken(chef.discovery.service_area_state),
    normalizeLocationStateToken(chef.directory_listing_location?.state),
  ])

  for (const partner of chef.partners) {
    for (const location of partner.partner_locations) {
      states.add(normalizeLocationStateToken(location.state))
    }
  }

  return states.has(searchState)
}

export function resolveStateOnlyLocationQuery(query: string) {
  return resolveUsStateValue(query)
}

export async function filterChefsByResolvedLocation(
  chefs: DirectoryChef[],
  searchLocation: ResolvedPublicLocation
) {
  const uniqueQueries = new Set<string>()
  for (const chef of chefs) {
    for (const query of buildChefCoverageQueries(chef)) {
      uniqueQueries.add(query)
    }
  }

  const resolvedEntries = await Promise.all(
    Array.from(uniqueQueries).map(
      async (query) => [query, (await resolvePublicLocationQuery(query)).data] as const
    )
  )
  const resolvedQueryMap = new Map(
    resolvedEntries.filter((entry): entry is readonly [string, ResolvedPublicLocation] =>
      Boolean(entry[1])
    )
  )

  return chefs.flatMap((chef): any[] => {
    const points = buildResolvedCoveragePoints(chef, resolvedQueryMap)
    const radiusMiles = chef.discovery.service_area_radius_miles ?? 25

    let bestDistance: number | null = null
    for (const point of points) {
      const distance = calculateDistanceMiles(
        searchLocation.lat,
        searchLocation.lng,
        point.lat,
        point.lng
      )

      if (bestDistance == null || distance < bestDistance) {
        bestDistance = distance
      }
    }

    if (bestDistance != null && bestDistance <= radiusMiles) {
      return [
        {
          ...chef,
          distance_miles: Math.round(bestDistance),
        },
      ]
    }

    if (bestDistance == null && hasStateFallbackCoverage(chef, searchLocation)) {
      return [
        {
          ...chef,
          distance_miles: null,
        },
      ]
    }

    return []
  })
}
