import 'server-only'

import { getDiscoverableChefs, type DirectoryChef } from '@/lib/directory/actions'
import {
  calculateDistanceMiles,
  resolvePublicLocationQuery,
  type ResolvedPublicLocation,
} from '@/lib/geo/public-location'
import { canonicalizeBookingServiceType } from '@/lib/booking/service-types'

export type MatchedChef = DirectoryChef & {
  distance_miles: number | null
  match_score: number
}

// Match chefs based on location proximity, service type, and availability.
// Returns chefs sorted by best match (closest + most relevant).
export async function matchChefsForBooking(options: {
  location: string
  serviceType?: string | null
  guestCount?: number | null
}): Promise<{ chefs: MatchedChef[]; resolvedLocation: ResolvedPublicLocation | null }> {
  const { location, serviceType, guestCount } = options
  const canonicalServiceType = canonicalizeBookingServiceType(serviceType)

  // Resolve the client's location to coordinates
  const locationResult = await resolvePublicLocationQuery(location)
  const resolvedLocation = locationResult.data
  if (!resolvedLocation) {
    return { chefs: [], resolvedLocation: null }
  }

  // Get all discoverable chefs
  const allChefs = await getDiscoverableChefs()

  // Filter and score chefs
  const matched: MatchedChef[] = []

  for (const chef of allChefs) {
    // Must be accepting inquiries
    if (!chef.discovery.accepting_inquiries) continue

    // Calculate distance if chef has coordinates
    let distance: number | null = null
    if (
      typeof chef.discovery.service_area_lat === 'number' &&
      typeof chef.discovery.service_area_lng === 'number'
    ) {
      distance = calculateDistanceMiles(
        resolvedLocation.lat,
        resolvedLocation.lng,
        chef.discovery.service_area_lat,
        chef.discovery.service_area_lng
      )
      distance = Math.round(distance)

      // Check radius (default 50mi for open bookings, more generous than directory search)
      const radius = chef.discovery.service_area_radius_miles ?? 50
      if (distance > radius) continue
    } else {
      // No coordinates: fall back to state matching
      const chefState = (chef.discovery.service_area_state || '').toLowerCase().trim()
      const searchState = (resolvedLocation.state || '').toLowerCase().trim()
      if (!chefState || !searchState || chefState !== searchState) continue
    }

    // Service type filter (if specified)
    if (canonicalServiceType && chef.discovery.service_types.length > 0) {
      const chefTypes = chef.discovery.service_types.map((t: string) =>
        canonicalizeBookingServiceType(t)
      )
      const typeMatches =
        chefTypes.includes(canonicalServiceType) ||
        (canonicalServiceType === 'private_dinner' && chefTypes.includes('personal_chef'))
      if (!typeMatches) continue
    }

    // Guest count filter (if specified and chef has limits)
    if (guestCount) {
      const min = chef.discovery.min_guest_count
      const max = chef.discovery.max_guest_count
      if (min != null && guestCount < min) continue
      if (max != null && guestCount > max) continue
    }

    // Score: closer is better, reviewed/rated chefs get a boost
    let score = 100
    if (distance != null) {
      // Closer chefs score higher (distance penalty)
      score -= Math.min(distance, 100)
    }
    if (chef.discovery.review_count > 0) score += 10
    if (chef.discovery.avg_rating != null && chef.discovery.avg_rating >= 4.5) score += 10

    matched.push({
      ...chef,
      distance_miles: distance,
      match_score: score,
    })
  }

  // Sort by score (highest first)
  matched.sort((a, b) => b.match_score - a.match_score)

  return { chefs: matched, resolvedLocation }
}
