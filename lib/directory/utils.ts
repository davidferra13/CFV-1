import {
  DISCOVERY_PRICE_RANGE_LABELS,
  getDiscoveryCuisineLabel,
  getDiscoveryServiceTypeLabel,
} from '@/lib/discovery/constants'
import { getDiscoveryLocationLabel } from '@/lib/discovery/profile'
import type { DirectoryChef } from '@/lib/directory/actions'
import {
  LOCATION_BEST_FOR_LABELS,
  LOCATION_EXPERIENCE_TAG_LABELS,
} from '@/lib/partners/location-experiences'

export type DirectorySortMode = 'featured' | 'alpha' | 'partners' | 'availability'

export type DirectoryFilters = {
  query: string
  stateFilter: string
  cuisineFilter: string
  serviceTypeFilter: string
  dietaryFilter: string
  priceRangeFilter: string
  partnerTypeFilter: string
  locationExperienceFilter: string
  locationBestForFilter: string
  acceptingOnly: boolean
}

export type DirectoryFacetOption = {
  value: string
  label: string
  count: number
}

export const PARTNER_TYPE_LABELS: Record<string, string> = {
  airbnb_host: 'Airbnb',
  business: 'Hotel & Lodging',
  venue: 'Venue',
  platform: 'Platform',
  individual: 'Partner',
  other: 'Partner',
}

export const DIRECTORY_SORT_OPTIONS: Array<{ value: DirectorySortMode; label: string }> = [
  { value: 'featured', label: 'Featured first' },
  { value: 'availability', label: 'Soonest availability' },
  { value: 'partners', label: 'Most partner venues' },
  { value: 'alpha', label: 'Name A-Z' },
]

type DirectoryLocationExperienceLike = {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  zip?: string | null
  description: string | null
  experience_tags: string[]
  best_for: string[]
  service_types: string[]
  is_featured?: boolean | null
  partner: {
    id: string
    name: string
  }
}

export function normalizeDirectoryValue(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase()
}

export function sanitizeDirectoryQuery(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength)
}

export function parseDirectorySortMode(value: string): DirectorySortMode {
  if (value === 'alpha' || value === 'partners' || value === 'availability') return value
  return 'featured'
}

export function parseDirectoryBooleanParam(value: string) {
  return value === '1' || value === 'true'
}

function buildFacetFromValues(
  entries: Array<{ chefId: string; value: string; label: string }>
): DirectoryFacetOption[] {
  const counts = new Map<string, { label: string; chefIds: Set<string> }>()

  for (const entry of entries) {
    const key = normalizeDirectoryValue(entry.value)
    if (!key) continue

    if (!counts.has(key)) {
      counts.set(key, { label: entry.label, chefIds: new Set<string>() })
    }

    counts.get(key)?.chefIds.add(entry.chefId)
  }

  return Array.from(counts.entries())
    .map(([value, details]) => ({
      value,
      label: details.label,
      count: details.chefIds.size,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

function getChefLocationExperiences(chef: DirectoryChef): DirectoryLocationExperienceLike[] {
  if (Array.isArray(chef.location_experiences) && chef.location_experiences.length > 0) {
    return chef.location_experiences
  }

  return chef.partners.flatMap((partner) =>
    partner.partner_locations.map((location) => ({
      id: location.id,
      name: location.name,
      address: location.address,
      city: location.city,
      state: location.state,
      zip: location.zip,
      description: location.description,
      experience_tags: location.experience_tags || [],
      best_for: location.best_for || [],
      service_types: location.service_types || [],
      is_featured: false,
      partner: {
        id: partner.id,
        name: partner.name,
      },
    }))
  )
}

export function buildStateFacets(chefs: DirectoryChef[]) {
  const entries: Array<{ chefId: string; value: string; label: string }> = []

  for (const chef of chefs) {
    const states = new Set<string>()
    const discoveryState = chef.discovery.service_area_state?.trim()
    if (discoveryState) {
      states.add(discoveryState)
      entries.push({ chefId: chef.id, value: discoveryState, label: discoveryState })
    }

    for (const location of getChefLocationExperiences(chef)) {
      const state = location.state?.trim()
      if (!state || states.has(state)) continue
      states.add(state)
      entries.push({ chefId: chef.id, value: state, label: state })
    }
  }

  return buildFacetFromValues(entries)
}

export function buildCuisineFacets(chefs: DirectoryChef[]) {
  return buildFacetFromValues(
    chefs.flatMap((chef) =>
      chef.discovery.cuisine_types.map((value) => ({
        chefId: chef.id,
        value,
        label: getDiscoveryCuisineLabel(value),
      }))
    )
  )
}

export function buildServiceTypeFacets(chefs: DirectoryChef[]) {
  return buildFacetFromValues(
    chefs.flatMap((chef) =>
      chef.discovery.service_types.map((value) => ({
        chefId: chef.id,
        value,
        label: getDiscoveryServiceTypeLabel(value),
      }))
    )
  )
}

export function buildPartnerTypeFacets(chefs: DirectoryChef[]) {
  return buildFacetFromValues(
    chefs.flatMap((chef) => {
      const seen = new Set<string>()
      return chef.partners.flatMap((partner) => {
        const value = normalizeDirectoryValue(partner.partner_type)
        if (!value || seen.has(value)) return []
        seen.add(value)
        return [
          {
            chefId: chef.id,
            value,
            label: PARTNER_TYPE_LABELS[value] ?? 'Partner',
          },
        ]
      })
    })
  )
}

export function buildLocationExperienceFacets(chefs: DirectoryChef[]) {
  return buildFacetFromValues(
    chefs.flatMap((chef) =>
      getChefLocationExperiences(chef).flatMap((location) =>
        location.experience_tags.map((value) => ({
          chefId: chef.id,
          value,
          label:
            LOCATION_EXPERIENCE_TAG_LABELS[value as keyof typeof LOCATION_EXPERIENCE_TAG_LABELS] ??
            value,
        }))
      )
    )
  )
}

export function buildLocationBestForFacets(chefs: DirectoryChef[]) {
  return buildFacetFromValues(
    chefs.flatMap((chef) =>
      getChefLocationExperiences(chef).flatMap((location) =>
        location.best_for.map((value) => ({
          chefId: chef.id,
          value,
          label: LOCATION_BEST_FOR_LABELS[value as keyof typeof LOCATION_BEST_FOR_LABELS] ?? value,
        }))
      )
    )
  )
}

export function getChefCoverage(chef: DirectoryChef) {
  const coverage = new Set<string>()
  const discoveryLocation = getDiscoveryLocationLabel(chef.discovery)
  if (discoveryLocation) coverage.add(discoveryLocation)

  for (const location of getChefLocationExperiences(chef)) {
    const cityState = [location.city, location.state].filter(Boolean).join(', ').trim()
    if (cityState) coverage.add(cityState)
  }

  return Array.from(coverage)
}

export function buildDirectorySearchHaystack(chef: DirectoryChef) {
  const locationText = getChefLocationExperiences(chef).flatMap((location) => [
    location.name,
    location.address,
    location.city,
    location.state,
    location.zip,
    location.description,
    ...location.experience_tags,
    ...location.best_for,
    ...location.service_types,
  ])
  const partnerText = chef.partners.flatMap((partner) => [
    partner.name,
    partner.description,
    PARTNER_TYPE_LABELS[normalizeDirectoryValue(partner.partner_type)] ?? partner.partner_type,
  ])

  return [
    chef.display_name,
    chef.tagline,
    chef.bio,
    chef.discovery.highlight_text,
    chef.discovery.service_area_city,
    chef.discovery.service_area_state,
    chef.discovery.service_area_zip,
    DISCOVERY_PRICE_RANGE_LABELS[chef.discovery.price_range ?? ''] ?? chef.discovery.price_range,
    ...chef.discovery.cuisine_types.map(getDiscoveryCuisineLabel),
    ...chef.discovery.service_types.map(getDiscoveryServiceTypeLabel),
    ...locationText,
    ...partnerText,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase()
}

function hasStateCoverage(chef: DirectoryChef, stateFilter: string) {
  if (!stateFilter) return true

  if (normalizeDirectoryValue(chef.discovery.service_area_state) === stateFilter) return true

  return getChefLocationExperiences(chef).some(
    (location) => normalizeDirectoryValue(location.state) === stateFilter
  )
}

function hasPartnerType(chef: DirectoryChef, partnerTypeFilter: string) {
  if (!partnerTypeFilter) return true

  return chef.partners.some(
    (partner) => normalizeDirectoryValue(partner.partner_type) === partnerTypeFilter
  )
}

function matchesDietaryFilter(chef: DirectoryChef, filter: string): boolean {
  const specialties = (chef.discovery.dietary_specialties ?? []).map((s) =>
    s.toLowerCase().replace(/[-\s]+/g, '_')
  )

  switch (filter) {
    case 'vegan':
      return specialties.includes('vegan')
    case 'vegetarian':
      return specialties.includes('vegetarian')
    case 'gluten_free':
      return specialties.some((s) => s.includes('gluten') && s.includes('free'))
    case 'dairy_free':
      return specialties.some((s) => s.includes('dairy') && s.includes('free'))
    case 'allergy_aware':
      // Matches if chef listed any allergy-related specialty
      return (
        specialties.some((s) => s.includes('allergy') || s.includes('allergen')) ||
        specialties.length > 0
      )
    case 'medical_diets':
      return specialties.some((s) => s.includes('medical'))
    case 'religious_diets':
      return specialties.some(
        (s) => s.includes('kosher') || s.includes('halal') || s.includes('religious')
      )
    default:
      return true
  }
}

function matchesLocationExperienceFilter(chef: DirectoryChef, filter: string): boolean {
  if (!filter) return true

  return getChefLocationExperiences(chef).some((location) =>
    location.experience_tags.some((value) => normalizeDirectoryValue(value) === filter)
  )
}

function matchesLocationBestForFilter(chef: DirectoryChef, filter: string): boolean {
  if (!filter) return true

  return getChefLocationExperiences(chef).some((location) =>
    location.best_for.some((value) => normalizeDirectoryValue(value) === filter)
  )
}

export function filterDirectoryChefs(chefs: DirectoryChef[], filters: DirectoryFilters) {
  const normalizedQuery = filters.query.toLowerCase()

  return chefs.filter((chef) => {
    if (normalizedQuery && !buildDirectorySearchHaystack(chef).includes(normalizedQuery))
      return false
    if (!hasStateCoverage(chef, filters.stateFilter)) return false
    if (
      filters.cuisineFilter &&
      !chef.discovery.cuisine_types.some(
        (value) => normalizeDirectoryValue(value) === filters.cuisineFilter
      )
    ) {
      return false
    }
    if (
      filters.serviceTypeFilter &&
      !chef.discovery.service_types.some(
        (value) => normalizeDirectoryValue(value) === filters.serviceTypeFilter
      )
    ) {
      return false
    }
    if (filters.dietaryFilter && !matchesDietaryFilter(chef, filters.dietaryFilter)) {
      return false
    }
    if (
      filters.locationExperienceFilter &&
      !matchesLocationExperienceFilter(chef, filters.locationExperienceFilter)
    ) {
      return false
    }
    if (
      filters.locationBestForFilter &&
      !matchesLocationBestForFilter(chef, filters.locationBestForFilter)
    ) {
      return false
    }
    if (
      filters.priceRangeFilter &&
      normalizeDirectoryValue(chef.discovery.price_range) !== filters.priceRangeFilter
    ) {
      return false
    }
    if (filters.acceptingOnly && !chef.discovery.accepting_inquiries) return false
    if (!hasPartnerType(chef, filters.partnerTypeFilter)) return false
    return true
  })
}

function nextAvailabilityTimestamp(chef: DirectoryChef) {
  if (!chef.discovery.next_available_date) return Number.MAX_SAFE_INTEGER
  const timestamp = new Date(`${chef.discovery.next_available_date}T00:00:00`).getTime()
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp
}

function compareDistance(a: DirectoryChef, b: DirectoryChef) {
  const aDistance = a.distance_miles ?? Number.MAX_SAFE_INTEGER
  const bDistance = b.distance_miles ?? Number.MAX_SAFE_INTEGER
  return aDistance - bDistance
}

function countPublicLocations(chef: DirectoryChef) {
  return getChefLocationExperiences(chef).length
}

function countFeaturedLocations(chef: DirectoryChef) {
  return getChefLocationExperiences(chef).filter((location) => location.is_featured).length
}

export function sortDirectoryChefs(chefs: DirectoryChef[], sortMode: DirectorySortMode) {
  const sorted = [...chefs]

  if (sortMode === 'alpha') {
    sorted.sort((a, b) => a.display_name.localeCompare(b.display_name))
    return sorted
  }

  if (sortMode === 'partners') {
    sorted.sort((a, b) => {
      const byPartnerCount = b.partners.length - a.partners.length
      if (byPartnerCount !== 0) return byPartnerCount
      return a.display_name.localeCompare(b.display_name)
    })
    return sorted
  }

  if (sortMode === 'availability') {
    sorted.sort((a, b) => {
      if (a.discovery.accepting_inquiries !== b.discovery.accepting_inquiries) {
        return a.discovery.accepting_inquiries ? -1 : 1
      }
      const byAvailability = nextAvailabilityTimestamp(a) - nextAvailabilityTimestamp(b)
      if (byAvailability !== 0) return byAvailability
      return a.display_name.localeCompare(b.display_name)
    })
    return sorted
  }

  sorted.sort((a, b) => {
    const byDistance = compareDistance(a, b)
    if (byDistance !== 0 && (a.distance_miles != null || b.distance_miles != null)) {
      return byDistance
    }
    if (a.is_founder !== b.is_founder) return a.is_founder ? -1 : 1
    if (a.discovery.accepting_inquiries !== b.discovery.accepting_inquiries) {
      return a.discovery.accepting_inquiries ? -1 : 1
    }
    const byFeaturedLocations = countFeaturedLocations(b) - countFeaturedLocations(a)
    if (byFeaturedLocations !== 0) return byFeaturedLocations
    const byLocationCount = countPublicLocations(b) - countPublicLocations(a)
    if (byLocationCount !== 0) return byLocationCount
    const byRating = (b.discovery.avg_rating ?? 0) - (a.discovery.avg_rating ?? 0)
    if (byRating !== 0) return byRating
    const byCompleteness = b.discovery.completeness_score - a.discovery.completeness_score
    if (byCompleteness !== 0) return byCompleteness
    const byPartnerCount = b.partners.length - a.partners.length
    if (byPartnerCount !== 0) return byPartnerCount
    return a.display_name.localeCompare(b.display_name)
  })

  return sorted
}
