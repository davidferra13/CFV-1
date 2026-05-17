'use server'

// Consumer Discovery Actions (public, no auth gate)
// Occasion-based chef search, availability, cuisine categories, and quick profiles.
// Complements lib/public-consumer/discovery-actions.ts (feed) and menu-actions.ts (spotlight).

import { unstable_cache } from 'next/cache'
import { createServerClient } from '@/lib/db/server'
import { pgClient } from '@/lib/db'
import { getDiscoverableChefs, type DirectoryChef } from '@/lib/directory/actions'
import {
  type DiscoveryFilters,
  type DiscoveryChef,
  type ChefAvailabilityResult,
  type ChefAvailabilitySlot,
  type CuisineCategoryWithCount,
  type PopularOccasion,
  type ChefQuickProfile,
  type OccasionType,
  OCCASION_TYPES,
} from './consumer-discovery-types'

// ---- Occasion metadata ----

const OCCASION_META: Record<
  OccasionType,
  { label: string; description: string; defaultPartySize: number; suggestedStyles: string[] }
> = {
  birthday: {
    label: 'Birthday',
    description: 'Celebrate with a custom menu',
    defaultPartySize: 10,
    suggestedStyles: ['plated', 'family_style'],
  },
  anniversary: {
    label: 'Anniversary',
    description: 'An intimate culinary experience',
    defaultPartySize: 2,
    suggestedStyles: ['plated', 'tasting'],
  },
  date_night: {
    label: 'Date Night',
    description: 'A memorable evening for two',
    defaultPartySize: 2,
    suggestedStyles: ['plated', 'tasting'],
  },
  dinner_party: {
    label: 'Dinner Party',
    description: 'Host friends with a personal chef',
    defaultPartySize: 8,
    suggestedStyles: ['family_style', 'plated'],
  },
  corporate: {
    label: 'Corporate Event',
    description: 'Professional catering for your team',
    defaultPartySize: 20,
    suggestedStyles: ['buffet', 'plated'],
  },
  team_building: {
    label: 'Team Building',
    description: 'Interactive cooking for groups',
    defaultPartySize: 15,
    suggestedStyles: ['interactive', 'buffet'],
  },
  holiday: {
    label: 'Holiday Gathering',
    description: 'Seasonal menus for celebrations',
    defaultPartySize: 12,
    suggestedStyles: ['family_style', 'buffet'],
  },
  bridal_shower: {
    label: 'Bridal Shower',
    description: 'Elegant food for the bride-to-be',
    defaultPartySize: 15,
    suggestedStyles: ['plated', 'cocktail'],
  },
  baby_shower: {
    label: 'Baby Shower',
    description: 'A warm gathering with great food',
    defaultPartySize: 20,
    suggestedStyles: ['buffet', 'family_style'],
  },
  graduation: {
    label: 'Graduation',
    description: 'Celebrate the achievement',
    defaultPartySize: 25,
    suggestedStyles: ['buffet', 'family_style'],
  },
  rehearsal_dinner: {
    label: 'Rehearsal Dinner',
    description: 'The night before, done right',
    defaultPartySize: 20,
    suggestedStyles: ['plated', 'family_style'],
  },
  engagement: {
    label: 'Engagement Party',
    description: 'Toast to the happy couple',
    defaultPartySize: 15,
    suggestedStyles: ['cocktail', 'plated'],
  },
  retirement: {
    label: 'Retirement Party',
    description: 'Honor a career well-served',
    defaultPartySize: 25,
    suggestedStyles: ['buffet', 'family_style'],
  },
  housewarming: {
    label: 'Housewarming',
    description: 'Welcome guests to your new place',
    defaultPartySize: 12,
    suggestedStyles: ['cocktail', 'family_style'],
  },
  game_day: {
    label: 'Game Day',
    description: 'Tailgate-quality food at home',
    defaultPartySize: 12,
    suggestedStyles: ['buffet', 'family_style'],
  },
  family_reunion: {
    label: 'Family Reunion',
    description: 'Feed the whole family',
    defaultPartySize: 30,
    suggestedStyles: ['buffet', 'family_style'],
  },
  wellness_retreat: {
    label: 'Wellness Retreat',
    description: 'Health-conscious menus',
    defaultPartySize: 10,
    suggestedStyles: ['plated', 'family_style'],
  },
  fundraiser: {
    label: 'Fundraiser',
    description: 'Culinary support for a cause',
    defaultPartySize: 50,
    suggestedStyles: ['buffet', 'cocktail'],
  },
  other: {
    label: 'Other Occasion',
    description: 'Something special in mind',
    defaultPartySize: 10,
    suggestedStyles: ['plated', 'family_style'],
  },
}

// ---- Helpers ----

function locationLabel(city: string | null | undefined, state: string | null | undefined) {
  if (city && state) return `${city}, ${state}`
  return state || city || null
}

function directoryChefToDiscoveryChef(
  chef: DirectoryChef,
  relevanceBoost: number = 0
): DiscoveryChef {
  const d = chef.discovery
  let relevance = d.completeness_score + relevanceBoost
  if (d.accepting_inquiries) relevance += 10
  if (chef.profile_image_url || d.hero_image_url) relevance += 8
  if (d.avg_rating && d.avg_rating >= 4.5) relevance += 6

  return {
    id: chef.id,
    slug: chef.slug,
    displayName: chef.display_name,
    tagline: chef.tagline,
    profileImageUrl: chef.profile_image_url,
    heroImageUrl: d.hero_image_url,
    cuisineTypes: d.cuisine_types,
    serviceTypes: d.service_types,
    dietarySpecialties: d.dietary_specialties,
    priceRange: d.price_range,
    locationLabel:
      locationLabel(d.service_area_city, d.service_area_state) ||
      locationLabel(chef.directory_listing_location?.city, chef.directory_listing_location?.state),
    city: d.service_area_city || chef.directory_listing_location?.city || null,
    state: d.service_area_state || chef.directory_listing_location?.state || null,
    avgRating: d.avg_rating,
    reviewCount: d.review_count,
    acceptingInquiries: d.accepting_inquiries,
    nextAvailableDate: d.next_available_date,
    leadTimeDays: d.lead_time_days,
    isInstantBook: chef.booking_model === 'instant_book' && chef.booking_enabled,
    bookingSlug: chef.booking_slug,
    relevanceScore: relevance,
  }
}

function matchesOccasion(chef: DirectoryChef, occasion: OccasionType): boolean {
  const serviceTypes = chef.discovery.service_types || []
  const meta = OCCASION_META[occasion]
  if (!meta) return true

  // Corporate/team occasions prefer catering service types
  if (['corporate', 'team_building', 'fundraiser'].includes(occasion)) {
    return (
      serviceTypes.some((st) => ['catering', 'corporate_events', 'event_catering'].includes(st)) ||
      serviceTypes.length === 0
    )
  }

  // Intimate occasions prefer private dinner types
  if (['date_night', 'anniversary'].includes(occasion)) {
    return (
      serviceTypes.some((st) =>
        ['private_dinner', 'intimate_dinner', 'tasting_menu'].includes(st)
      ) || serviceTypes.length === 0
    )
  }

  // Large party occasions prefer buffet/family style capable
  if (['family_reunion', 'graduation', 'retirement'].includes(occasion)) {
    const maxGuests = chef.discovery.max_guest_count
    return maxGuests == null || maxGuests >= meta.defaultPartySize
  }

  return true
}

function matchesFilters(chef: DirectoryChef, filters: DiscoveryFilters): boolean {
  const d = chef.discovery

  if (filters.acceptingOnly && !d.accepting_inquiries) return false

  if (filters.cuisineType) {
    const cuisine = filters.cuisineType.toLowerCase()
    if (!d.cuisine_types.some((ct) => ct.toLowerCase().includes(cuisine))) return false
  }

  if (filters.serviceType) {
    const service = filters.serviceType.toLowerCase()
    if (!d.service_types.some((st) => st.toLowerCase().includes(service))) return false
  }

  if (filters.location) {
    const loc = filters.location.toLowerCase()
    const chefLoc = [d.service_area_city, d.service_area_state]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    if (chefLoc && !chefLoc.includes(loc) && !loc.includes(chefLoc)) return false
  }

  if (filters.minGuests != null && d.max_guest_count != null) {
    if (d.max_guest_count < filters.minGuests) return false
  }

  if (filters.maxGuests != null && d.min_guest_count != null) {
    if (d.min_guest_count > filters.maxGuests) return false
  }

  if (filters.dietaryNeeds && filters.dietaryNeeds.length > 0) {
    const specialties = d.dietary_specialties.map((s) => s.toLowerCase())
    const hasMatch = filters.dietaryNeeds.some((need) =>
      specialties.some((s) => s.includes(need.toLowerCase()))
    )
    if (!hasMatch && specialties.length > 0) return false
  }

  return true
}

// ---- Server Actions ----

/**
 * Search chefs by occasion and optional location.
 * Public, no auth required.
 */
export async function searchChefsByOccasion(
  occasion: OccasionType,
  location?: string
): Promise<DiscoveryChef[]> {
  const chefs = await getDiscoverableChefs()

  const filters: DiscoveryFilters = { occasion, location, acceptingOnly: false }
  const meta = OCCASION_META[occasion]

  const matched = chefs
    .filter((chef) => matchesOccasion(chef, occasion) && matchesFilters(chef, filters))
    .map((chef) => {
      let boost = 0
      // Boost chefs whose guest range fits the occasion default
      if (meta) {
        const maxG = chef.discovery.max_guest_count
        const minG = chef.discovery.min_guest_count
        if (maxG != null && maxG >= meta.defaultPartySize) boost += 8
        if (minG != null && minG <= meta.defaultPartySize) boost += 4
      }
      return directoryChefToDiscoveryChef(chef, boost)
    })

  matched.sort((a, b) => b.relevanceScore - a.relevanceScore)
  return matched.slice(0, 50)
}

/**
 * Check a chef's availability over a date range.
 * Uses marketplace profile data (next_available_date, lead_time_days) and
 * event calendar to determine blocked dates.
 * Public, no auth required.
 */
export async function getChefAvailability(
  chefId: string,
  dateRange: { from: string; to: string }
): Promise<ChefAvailabilityResult> {
  const db = createServerClient({ admin: true })

  // Fetch marketplace availability info
  const { data: marketplace } = await (db as any)
    .from('chef_marketplace_profiles')
    .select('accepting_inquiries, next_available_date, lead_time_days')
    .eq('chef_id', chefId)
    .maybeSingle()

  const acceptingInquiries = marketplace?.accepting_inquiries ?? true
  const nextAvailableDate = marketplace?.next_available_date ?? null
  const leadTimeDays = marketplace?.lead_time_days ?? null

  // Fetch booked event dates in range
  const bookedDates = new Set<string>()
  try {
    const rows = await pgClient`
      SELECT DISTINCT event_date::text as event_date
      FROM events
      WHERE tenant_id = ${chefId}
        AND event_date >= ${dateRange.from}::date
        AND event_date <= ${dateRange.to}::date
        AND status NOT IN ('cancelled', 'rejected', 'archived')
    `
    for (const row of rows) {
      if (row.event_date) bookedDates.add(row.event_date)
    }
  } catch {
    // events table query may fail if schema differs; degrade gracefully
  }

  // Build slot array
  const slots: ChefAvailabilitySlot[] = []
  const start = new Date(`${dateRange.from}T00:00:00`)
  const end = new Date(`${dateRange.to}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const leadTimeThreshold = leadTimeDays
    ? new Date(today.getTime() + leadTimeDays * 86400000)
    : null

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    let available = true
    let reason: string | undefined

    if (d < today) {
      available = false
      reason = 'past'
    } else if (leadTimeThreshold && d < leadTimeThreshold) {
      available = false
      reason = 'lead_time'
    } else if (nextAvailableDate && dateStr < nextAvailableDate) {
      available = false
      reason = 'not_yet_available'
    } else if (bookedDates.has(dateStr)) {
      available = false
      reason = 'booked'
    } else if (!acceptingInquiries) {
      available = false
      reason = 'not_accepting'
    }

    slots.push({ date: dateStr, available, reason })
  }

  return {
    chefId,
    slots,
    leadTimeDays,
    nextAvailableDate,
    acceptingInquiries,
  }
}

/**
 * Get all cuisine types with a count of discoverable chefs per cuisine.
 * Public, cached 5 minutes.
 */
export const getCuisineCategories = unstable_cache(
  async (): Promise<CuisineCategoryWithCount[]> => {
    const chefs = await getDiscoverableChefs()

    const counts = new Map<string, number>()
    for (const chef of chefs) {
      for (const cuisine of chef.discovery.cuisine_types) {
        const key = cuisine.toLowerCase().trim()
        if (!key) continue
        counts.set(key, (counts.get(key) || 0) + 1)
      }
    }

    const results: CuisineCategoryWithCount[] = []
    counts.forEach((chefCount, value) => {
      const label = value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      results.push({ value, label, chefCount })
    })

    results.sort((a, b) => b.chefCount - a.chefCount)
    return results
  },
  ['consumer-cuisine-categories'],
  { revalidate: 300, tags: ['directory-chefs'] }
)

/**
 * Get popular booking occasions with chef counts.
 * Public, cached 5 minutes.
 */
export const getPopularOccasions = unstable_cache(
  async (): Promise<PopularOccasion[]> => {
    const chefs = await getDiscoverableChefs()
    const totalChefs = chefs.length

    return OCCASION_TYPES.filter((o) => o !== 'other').map((occasionValue) => {
      const meta = OCCASION_META[occasionValue]
      const matchCount = chefs.filter((chef) => matchesOccasion(chef, occasionValue)).length

      return {
        value: occasionValue,
        label: meta.label,
        description: meta.description,
        chefCount: matchCount || totalChefs,
        defaultPartySize: meta.defaultPartySize,
      }
    })
  },
  ['consumer-popular-occasions'],
  { revalidate: 300, tags: ['directory-chefs'] }
)

/**
 * Filtered discovery feed of chefs. Supports location, cuisine, price range,
 * occasion, dietary needs, and pagination.
 * Public, no auth required.
 */
export async function getDiscoveryFeed(
  filters: DiscoveryFilters = {}
): Promise<{ chefs: DiscoveryChef[]; total: number; page: number; totalPages: number }> {
  const page = Math.max(1, filters.page || 1)
  const limit = Math.min(50, Math.max(1, filters.limit || 24))

  const allChefs = await getDiscoverableChefs()

  let matched = allChefs.filter((chef) => matchesFilters(chef, filters))

  // Apply occasion filter if present
  if (filters.occasion) {
    matched = matched.filter((chef) => matchesOccasion(chef, filters.occasion!))
  }

  const discoveryChefs = matched.map((chef) => {
    let boost = 0
    if (filters.occasion) {
      const meta = OCCASION_META[filters.occasion]
      if (meta) {
        const maxG = chef.discovery.max_guest_count
        if (maxG != null && maxG >= meta.defaultPartySize) boost += 6
      }
    }
    if (filters.cuisineType) {
      const ct = filters.cuisineType.toLowerCase()
      if (chef.discovery.cuisine_types.some((c) => c.toLowerCase() === ct)) boost += 10
    }
    return directoryChefToDiscoveryChef(chef, boost)
  })

  discoveryChefs.sort((a, b) => b.relevanceScore - a.relevanceScore)

  const total = discoveryChefs.length
  const totalPages = Math.ceil(total / limit)
  const start = (page - 1) * limit
  const paged = discoveryChefs.slice(start, start + limit)

  return { chefs: paged, total, page, totalPages }
}

/**
 * Get a chef's summary profile for discovery cards.
 * Public, no auth required.
 */
export async function getChefQuickProfile(chefId: string): Promise<ChefQuickProfile | null> {
  const db = createServerClient({ admin: true })

  // Fetch base chef data
  const { data: chef, error } = await db
    .from('chefs')
    .select(
      'id, slug, display_name, tagline, profile_image_url, booking_enabled, booking_slug, booking_model, featured_booking_menu_id'
    )
    .eq('id', chefId)
    .maybeSingle()

  if (error || !chef || !chef.slug) return null

  // Fetch marketplace and directory listing data in parallel
  const [marketplaceResult, listingResult, partnerCountResult, showcaseResult] = await Promise.all([
    (db as any)
      .from('chef_marketplace_profiles')
      .select(
        'cuisine_types, service_types, price_range, avg_rating, review_count, accepting_inquiries, next_available_date, lead_time_days, hero_image_url, highlight_text'
      )
      .eq('chef_id', chefId)
      .maybeSingle(),
    (db as any)
      .from('chef_directory_listings')
      .select(
        'cuisine_types, service_types, dietary_specialties, service_area_city, service_area_state'
      )
      .eq('chef_id', chefId)
      .maybeSingle(),
    (db as any)
      .from('referral_partners')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', chefId),
    chef.featured_booking_menu_id
      ? db
          .from('menus')
          .select('id')
          .eq('id', chef.featured_booking_menu_id)
          .neq('status', 'archived')
          .maybeSingle()
      : (db as any)
          .from('menus')
          .select('id')
          .eq('tenant_id', chefId)
          .eq('is_showcase', true)
          .neq('status', 'archived')
          .limit(1)
          .maybeSingle(),
  ])

  const mp = marketplaceResult?.data
  const dl = listingResult?.data

  const cuisineTypes = mp?.cuisine_types || dl?.cuisine_types || []
  const serviceTypes = mp?.service_types || dl?.service_types || []
  const dietarySpecialties = dl?.dietary_specialties || []

  const city = dl?.service_area_city || null
  const state = dl?.service_area_state || null

  return {
    id: chef.id,
    slug: chef.slug,
    displayName: chef.display_name || 'Private Chef',
    tagline: chef.tagline || null,
    profileImageUrl: chef.profile_image_url || null,
    heroImageUrl: mp?.hero_image_url || null,
    cuisineTypes: Array.isArray(cuisineTypes) ? cuisineTypes : [],
    serviceTypes: Array.isArray(serviceTypes) ? serviceTypes : [],
    dietarySpecialties: Array.isArray(dietarySpecialties) ? dietarySpecialties : [],
    priceRange: mp?.price_range || null,
    locationLabel: locationLabel(city, state),
    avgRating: mp?.avg_rating ?? null,
    reviewCount: mp?.review_count ?? 0,
    acceptingInquiries: mp?.accepting_inquiries ?? true,
    nextAvailableDate: mp?.next_available_date ?? null,
    leadTimeDays: mp?.lead_time_days ?? null,
    isInstantBook: chef.booking_model === 'instant_book' && chef.booking_enabled === true,
    bookingSlug: chef.booking_slug || null,
    highlightText: mp?.highlight_text || null,
    partnerCount: partnerCountResult?.count ?? 0,
    hasMenuSpotlight: showcaseResult?.data != null,
  }
}
