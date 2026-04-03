import {
  canonicalizeDiscoveryCuisine,
  canonicalizeDiscoveryPriceRange,
  canonicalizeDiscoveryServiceType,
} from '@/lib/discovery/constants'

export type DiscoveryProfileSource = 'marketplace' | 'listing' | 'legacy'

export type DiscoveryProfile = {
  cuisine_types: string[]
  service_types: string[]
  dietary_specialties: string[]
  price_range: string | null
  min_guest_count: number | null
  max_guest_count: number | null
  service_area_city: string | null
  service_area_state: string | null
  service_area_zip: string | null
  service_area_radius_miles: number | null
  service_area_lat: number | null
  service_area_lng: number | null
  avg_rating: number | null
  review_count: number
  accepting_inquiries: boolean
  next_available_date: string | null
  lead_time_days: number | null
  hero_image_url: string | null
  highlight_text: string | null
  source: DiscoveryProfileSource
}

export const DEFAULT_DISCOVERY_PROFILE: DiscoveryProfile = {
  cuisine_types: [],
  service_types: [],
  dietary_specialties: [],
  price_range: null,
  min_guest_count: null,
  max_guest_count: null,
  service_area_city: null,
  service_area_state: null,
  service_area_zip: null,
  service_area_radius_miles: 25,
  service_area_lat: null,
  service_area_lng: null,
  avg_rating: null,
  review_count: 0,
  accepting_inquiries: true,
  next_available_date: null,
  lead_time_days: 3,
  hero_image_url: null,
  highlight_text: null,
  source: 'legacy',
}

function normalizeText(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || null
}

function normalizePositiveInt(value: unknown) {
  if (value == null || value === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  const rounded = Math.round(parsed)
  return rounded >= 0 ? rounded : null
}

function normalizeDecimal(value: unknown) {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function dedupe(values: Array<string | null>) {
  const seen = new Set<string>()
  const items: string[] = []

  for (const value of values) {
    if (!value || seen.has(value)) continue
    seen.add(value)
    items.push(value)
  }

  return items
}

function normalizeCanonicalArray(
  values: unknown,
  canonicalize: (value: string | null | undefined) => string | null
) {
  if (!Array.isArray(values)) return []
  return dedupe(values.map((value) => canonicalize(typeof value === 'string' ? value : null)))
}

export function inferPriceRangeFromPriceCents(
  minPriceCents: number | null | undefined,
  maxPriceCents: number | null | undefined
) {
  const candidates = [minPriceCents, maxPriceCents].filter((value): value is number =>
    Number.isFinite(value)
  )
  if (candidates.length === 0) return null

  const pricePerPerson = Math.max(...candidates) / 100
  if (pricePerPerson < 100) return 'budget'
  if (pricePerPerson < 175) return 'mid'
  if (pricePerPerson < 275) return 'premium'
  return 'luxury'
}

export function marketplaceRowToDiscoveryProfile(row: any): Partial<DiscoveryProfile> {
  if (!row) return {}

  return {
    cuisine_types: normalizeCanonicalArray(row.cuisine_types, canonicalizeDiscoveryCuisine),
    service_types: normalizeCanonicalArray(row.service_types, canonicalizeDiscoveryServiceType),
    price_range: canonicalizeDiscoveryPriceRange(row.price_range),
    min_guest_count: normalizePositiveInt(row.min_guest_count),
    max_guest_count: normalizePositiveInt(row.max_guest_count),
    service_area_city: normalizeText(row.service_area_city),
    service_area_state: normalizeText(row.service_area_state),
    service_area_zip: normalizeText(row.service_area_zip),
    service_area_radius_miles: normalizePositiveInt(row.service_area_radius_miles),
    service_area_lat: normalizeDecimal(row.service_area_lat),
    service_area_lng: normalizeDecimal(row.service_area_lng),
    avg_rating: normalizeDecimal(row.avg_rating),
    review_count: normalizePositiveInt(row.review_count) ?? 0,
    accepting_inquiries: row.accepting_inquiries !== false,
    next_available_date: normalizeText(row.next_available_date),
    lead_time_days: normalizePositiveInt(row.lead_time_days),
    hero_image_url: normalizeText(row.hero_image_url),
    highlight_text: normalizeText(row.highlight_text),
    source: 'marketplace',
  }
}

export function directoryListingToDiscoveryProfile(row: any): Partial<DiscoveryProfile> {
  if (!row) return {}

  const dietarySpecialties = Array.isArray(row.dietary_specialties)
    ? dedupe(row.dietary_specialties.filter((s: unknown) => typeof s === 'string' && s.trim()))
    : []

  return {
    cuisine_types: normalizeCanonicalArray(row.cuisines, canonicalizeDiscoveryCuisine),
    service_types: normalizeCanonicalArray(row.service_types, canonicalizeDiscoveryServiceType),
    dietary_specialties: dietarySpecialties,
    price_range: inferPriceRangeFromPriceCents(row.min_price_cents, row.max_price_cents),
    service_area_city: normalizeText(row.city),
    service_area_state: normalizeText(row.state),
    service_area_zip: normalizeText(row.zip_code),
    service_area_radius_miles: normalizePositiveInt(row.service_radius_miles),
    avg_rating: normalizeDecimal(row.rating_avg),
    review_count: normalizePositiveInt(row.review_count) ?? 0,
    hero_image_url: normalizeText(row.profile_photo_url),
    source: 'listing',
  }
}

export function legacyChefToDiscoveryProfile(row: any): Partial<DiscoveryProfile> {
  if (!row) return {}

  return {
    hero_image_url: normalizeText(row.profile_image_url),
    highlight_text: normalizeText(row.tagline),
    source: 'legacy',
  }
}

export function mergeDiscoveryProfile(
  ...profiles: Array<Partial<DiscoveryProfile> | null | undefined>
) {
  const merged: DiscoveryProfile = { ...DEFAULT_DISCOVERY_PROFILE }

  for (const profile of profiles) {
    if (!profile) continue

    if (profile.cuisine_types?.length) merged.cuisine_types = [...profile.cuisine_types]
    if (profile.service_types?.length) merged.service_types = [...profile.service_types]
    if (profile.dietary_specialties?.length)
      merged.dietary_specialties = [...profile.dietary_specialties]
    if (profile.price_range) merged.price_range = profile.price_range
    if (profile.min_guest_count != null) merged.min_guest_count = profile.min_guest_count
    if (profile.max_guest_count != null) merged.max_guest_count = profile.max_guest_count
    if (profile.service_area_city) merged.service_area_city = profile.service_area_city
    if (profile.service_area_state) merged.service_area_state = profile.service_area_state
    if (profile.service_area_zip) merged.service_area_zip = profile.service_area_zip
    if (profile.service_area_radius_miles != null) {
      merged.service_area_radius_miles = profile.service_area_radius_miles
    }
    if (profile.service_area_lat != null) merged.service_area_lat = profile.service_area_lat
    if (profile.service_area_lng != null) merged.service_area_lng = profile.service_area_lng
    if (profile.avg_rating != null) merged.avg_rating = profile.avg_rating
    if (profile.review_count != null) merged.review_count = profile.review_count
    if (profile.accepting_inquiries != null)
      merged.accepting_inquiries = profile.accepting_inquiries
    if (profile.next_available_date) merged.next_available_date = profile.next_available_date
    if (profile.lead_time_days != null) merged.lead_time_days = profile.lead_time_days
    if (profile.hero_image_url) merged.hero_image_url = profile.hero_image_url
    if (profile.highlight_text) merged.highlight_text = profile.highlight_text
    if (profile.source) merged.source = profile.source
  }

  return merged
}

export function computeDiscoveryCompleteness(profile: DiscoveryProfile) {
  const checks = [
    profile.cuisine_types.length > 0,
    profile.service_types.length > 0,
    Boolean(profile.price_range),
    Boolean(profile.service_area_city || profile.service_area_state),
    profile.min_guest_count != null || profile.max_guest_count != null,
    Boolean(profile.highlight_text),
    Boolean(profile.hero_image_url),
    profile.next_available_date != null,
  ]

  const completed = checks.filter(Boolean).length
  return completed / checks.length
}

export function getDiscoveryLocationLabel(profile: DiscoveryProfile) {
  const location =
    [profile.service_area_city, profile.service_area_state].filter(Boolean).join(', ') ||
    profile.service_area_zip
  if (!location) return null
  if (profile.service_area_radius_miles == null) return location
  return `${location} + ${profile.service_area_radius_miles} mi`
}

export function getDiscoveryGuestCountLabel(profile: DiscoveryProfile) {
  if (profile.min_guest_count != null && profile.max_guest_count != null) {
    return `${profile.min_guest_count}-${profile.max_guest_count} guests`
  }
  if (profile.min_guest_count != null) return `${profile.min_guest_count}+ guests`
  if (profile.max_guest_count != null) return `Up to ${profile.max_guest_count} guests`
  return null
}

export function getDiscoveryLeadTimeLabel(profile: DiscoveryProfile) {
  if (profile.lead_time_days == null) return null
  if (profile.lead_time_days <= 1) return 'Books 1 day ahead'
  return `Books ${profile.lead_time_days} days ahead`
}

export function getDiscoveryAvailabilityLabel(profile: DiscoveryProfile) {
  if (!profile.accepting_inquiries) return 'Not accepting new inquiries'
  if (!profile.next_available_date) return 'Accepting new inquiries'

  const date = new Date(`${profile.next_available_date}T00:00:00`)
  if (Number.isNaN(date.getTime())) return 'Accepting new inquiries'

  const formatted = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return `Next opening ${formatted}`
}
