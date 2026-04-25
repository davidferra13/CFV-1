'use server'

import { getDirectoryListings, type DirectoryListingSummary } from '@/lib/discover/actions'
import { getDiscoverableChefs, type DirectoryChef } from '@/lib/directory/actions'
import { pgClient } from '@/lib/db'

export type ConsumerIntent =
  | 'tonight'
  | 'dinner_party'
  | 'meal_prep'
  | 'private_chef'
  | 'going_out'
  | 'team_dinner'
  | 'work_lunch'
  | 'visual'

export type FulfillmentMode = 'private_chef' | 'restaurant' | 'meal_prep' | 'any'

export interface ConsumerDiscoveryFilters {
  intent?: ConsumerIntent
  craving?: string
  fulfillment?: FulfillmentMode
  location?: string
  budget?: string
  dietary?: string
  visualMode?: boolean
  dateWindow?: string
  partySize?: number
  eventStyle?: string
  useCase?: string
  page?: number
}

export type ConsumerResultType = 'chef' | 'listing' | 'menu' | 'package' | 'meal_prep_item'

export interface ConsumerResultCard {
  id: string
  type: ConsumerResultType
  title: string
  subtitle: string | null
  imageUrl: string | null
  eyebrow: string
  locationLabel: string | null
  priceLabel: string | null
  dietaryTags: string[]
  serviceModes: string[]
  ctaLabel: string
  ctaHref: string
  rating: number | null
  reviewCount: number | null
  isAvailable: boolean
  relevanceScore: number
  sourceId: string
  sourceType: ConsumerResultType
  chefId?: string | null
}

export interface ConsumerDiscoveryFeed {
  results: ConsumerResultCard[]
  chefs: ConsumerResultCard[]
  listings: ConsumerResultCard[]
  spotlights: ConsumerResultCard[]
  total: number
}

type SpotlightRow = {
  id: string
  kind: 'package' | 'meal_prep_item' | 'menu'
  title: string
  subtitle: string | null
  image_url: string | null
  eyebrow: string
  price_cents: number | null
  dietary_tags: string[] | null
  service_modes: string[] | null
  chef_id: string
  chef_slug: string
  chef_name: string
  city: string | null
  state: string | null
}

const INTENT_TO_FULFILLMENT: Record<ConsumerIntent, FulfillmentMode> = {
  tonight: 'any',
  dinner_party: 'private_chef',
  meal_prep: 'meal_prep',
  private_chef: 'private_chef',
  going_out: 'restaurant',
  team_dinner: 'private_chef',
  work_lunch: 'any',
  visual: 'any',
}

const INTENT_TO_SERVICE_TYPE: Partial<Record<ConsumerIntent, string>> = {
  dinner_party: 'private_dinner',
  meal_prep: 'meal_prep',
  private_chef: 'private_dinner',
  team_dinner: 'catering',
  work_lunch: 'catering',
}

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatPriceRange(range: string): string {
  const map: Record<string, string> = {
    budget: 'Budget-friendly',
    moderate: 'Mid-range',
    premium: 'Premium',
    luxury: 'Luxury',
  }
  return map[range] || range
}

function formatMoney(cents: number | null) {
  if (!cents || cents <= 0) return null
  return `$${Math.round(cents / 100)}`
}

function locationLabel(city: string | null | undefined, state: string | null | undefined) {
  if (city && state) return `${city}, ${state}`
  return state || city || null
}

function matchesText(card: ConsumerResultCard, query: string | undefined) {
  if (!query) return true
  const normalized = query.toLowerCase()
  return [card.title, card.subtitle, card.eyebrow, ...card.dietaryTags, ...card.serviceModes]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(normalized))
}

function chefToCard(chef: DirectoryChef, intent?: ConsumerIntent): ConsumerResultCard {
  const discovery = chef.discovery
  const cuisines = discovery.cuisine_types?.slice(0, 3) || []
  const serviceTypes = discovery.service_types || []
  const isInstantBook = chef.booking_model === 'instant_book' && chef.booking_enabled
  const targetService = intent ? INTENT_TO_SERVICE_TYPE[intent] : null
  let relevance = discovery.completeness_score || 0

  if (targetService && serviceTypes.includes(targetService)) relevance += 22
  if (chef.profile_image_url || discovery.hero_image_url) relevance += 10
  if (discovery.accepting_inquiries) relevance += 14
  if (chef.partners.length > 0) relevance += 5

  return {
    id: `chef-${chef.id}`,
    type: 'chef',
    title: chef.display_name,
    subtitle: chef.tagline || cuisines.join(', ') || null,
    imageUrl: discovery.hero_image_url || chef.profile_image_url || null,
    eyebrow: serviceTypes[0] ? titleCase(serviceTypes[0]) : 'Private Chef',
    locationLabel:
      locationLabel(discovery.service_area_city, discovery.service_area_state) ||
      locationLabel(chef.directory_listing_location?.city, chef.directory_listing_location?.state),
    priceLabel: discovery.price_range ? formatPriceRange(discovery.price_range) : null,
    dietaryTags: discovery.dietary_specialties?.slice(0, 4) || [],
    serviceModes: serviceTypes.slice(0, 3),
    ctaLabel: isInstantBook ? 'Book now' : 'View chef',
    ctaHref:
      isInstantBook && chef.booking_slug ? `/book/${chef.booking_slug}` : `/chef/${chef.slug}`,
    rating: discovery.avg_rating ?? null,
    reviewCount: discovery.review_count ?? null,
    isAvailable: discovery.accepting_inquiries ?? true,
    relevanceScore: relevance,
    sourceId: chef.id,
    sourceType: 'chef',
    chefId: chef.id,
  }
}

function listingToCard(listing: DirectoryListingSummary): ConsumerResultCard {
  const cuisines = listing.cuisine_types?.slice(0, 4) || []
  const photo = listing.photo_urls?.[0] || null
  const linkedChefId = (listing as DirectoryListingSummary & { linked_chef_id?: string | null })
    .linked_chef_id
  let relevance = 0

  if (photo) relevance += 15
  if (listing.website_url) relevance += 8
  if (listing.description) relevance += 5
  if (listing.featured) relevance += 18
  if (listing.lead_score) relevance += Math.min(10, Math.floor(listing.lead_score / 10))

  return {
    id: `listing-${listing.id}`,
    type: 'listing',
    title: listing.name,
    subtitle: listing.description?.slice(0, 140) || null,
    imageUrl: photo,
    eyebrow: listing.business_type ? titleCase(listing.business_type) : 'Food Place',
    locationLabel: locationLabel(listing.city, listing.state),
    priceLabel: listing.price_range || null,
    dietaryTags: cuisines,
    serviceModes: [listing.business_type || 'restaurant'],
    ctaLabel: 'View place',
    ctaHref: `/nearby/${listing.slug}`,
    rating: null,
    reviewCount: null,
    isAvailable: true,
    relevanceScore: relevance,
    sourceId: listing.id,
    sourceType: 'listing',
    chefId: linkedChefId ?? null,
  }
}

function spotlightToCard(row: SpotlightRow): ConsumerResultCard {
  const type = row.kind === 'package' ? 'package' : row.kind
  const price = formatMoney(row.price_cents)

  return {
    id: `${type}-${row.id}`,
    type,
    title: row.title,
    subtitle: row.subtitle || `From ${row.chef_name}`,
    imageUrl: row.image_url,
    eyebrow: row.eyebrow,
    locationLabel: locationLabel(row.city, row.state),
    priceLabel: price ? `From ${price}` : null,
    dietaryTags: row.dietary_tags || [],
    serviceModes: row.service_modes || [],
    ctaLabel: 'View chef',
    ctaHref: `/chef/${row.chef_slug}`,
    rating: null,
    reviewCount: null,
    isAvailable: true,
    relevanceScore: row.image_url ? 26 : 16,
    sourceId: row.id,
    sourceType: type,
    chefId: row.chef_id,
  }
}

async function getSpotlightRows(filters: ConsumerDiscoveryFilters): Promise<SpotlightRow[]> {
  const rows = await pgClient<SpotlightRow[]>`
    (
      SELECT
        ep.id,
        'package'::text as kind,
        ep.name as title,
        ep.description as subtitle,
        NULL::text as image_url,
        replace(initcap(replace(ep.package_type, '_', ' ')), 'Meal Prep', 'Meal prep') as eyebrow,
        ep.base_price_cents as price_cents,
        ep.cuisine_types as dietary_tags,
        ARRAY[ep.package_type]::text[] as service_modes,
        c.id as chef_id,
        c.slug as chef_slug,
        c.display_name as chef_name,
        cdl.service_area_city as city,
        cdl.service_area_state as state
      FROM experience_packages ep
      JOIN chefs c ON c.id = ep.tenant_id
      LEFT JOIN chef_directory_listings cdl ON cdl.chef_id = c.id
      WHERE ep.is_active = true
        AND c.slug IS NOT NULL
      ORDER BY ep.sort_order ASC NULLS LAST, ep.created_at DESC NULLS LAST
      LIMIT 16
    )
    UNION ALL
    (
      SELECT
        mpi.id,
        'meal_prep_item'::text as kind,
        mpi.name as title,
        mpi.description as subtitle,
        mpi.photo_url as image_url,
        replace(initcap(replace(mpi.category, '_', ' ')), 'Meal Prep', 'Meal prep') as eyebrow,
        mpi.price_cents as price_cents,
        mpi.dietary_tags as dietary_tags,
        ARRAY['meal_prep']::text[] as service_modes,
        c.id as chef_id,
        c.slug as chef_slug,
        c.display_name as chef_name,
        cdl.service_area_city as city,
        cdl.service_area_state as state
      FROM meal_prep_items mpi
      JOIN chefs c ON c.id = mpi.chef_id
      LEFT JOIN chef_directory_listings cdl ON cdl.chef_id = c.id
      WHERE mpi.is_available = true
        AND c.slug IS NOT NULL
      ORDER BY mpi.created_at DESC
      LIMIT 16
    )
    UNION ALL
    (
      SELECT
        m.id,
        'menu'::text as kind,
        m.name as title,
        m.description as subtitle,
        NULL::text as image_url,
        'Sample Menu'::text as eyebrow,
        m.price_per_person_cents as price_cents,
        ARRAY_REMOVE(ARRAY[m.cuisine_type], NULL)::text[] as dietary_tags,
        ARRAY_REMOVE(ARRAY[m.service_style::text], NULL)::text[] as service_modes,
        c.id as chef_id,
        c.slug as chef_slug,
        c.display_name as chef_name,
        cdl.service_area_city as city,
        cdl.service_area_state as state
      FROM menus m
      JOIN chefs c ON c.id = m.tenant_id
      LEFT JOIN chef_directory_listings cdl ON cdl.chef_id = c.id
      WHERE m.is_showcase = true
        AND m.status <> 'archived'
        AND c.slug IS NOT NULL
      ORDER BY m.times_used DESC, m.updated_at DESC
      LIMIT 16
    )
  `

  let cards: SpotlightRow[] = [...rows]
  if (filters.intent === 'meal_prep') {
    cards = cards.filter((row) => row.kind === 'meal_prep_item' || row.eyebrow.includes('Meal'))
  } else if (filters.intent === 'dinner_party' || filters.intent === 'private_chef') {
    cards = cards.filter((row) => row.kind !== 'meal_prep_item')
  }

  return cards
}

export async function getConsumerDiscoveryFeed(
  filters: ConsumerDiscoveryFilters = {}
): Promise<ConsumerDiscoveryFeed> {
  const fulfillment = filters.intent
    ? INTENT_TO_FULFILLMENT[filters.intent]
    : filters.fulfillment || 'any'

  const showChefs = fulfillment !== 'restaurant'
  const showListings = fulfillment !== 'private_chef' && fulfillment !== 'meal_prep'
  const showSpotlights = fulfillment !== 'restaurant'

  const [chefs, listingResult, spotlightRows] = await Promise.all([
    showChefs ? getDiscoverableChefs() : Promise.resolve([]),
    showListings
      ? getDirectoryListings({
          query: filters.craving,
          state: filters.location,
          page: 1,
        }).then((result) => result.listings)
      : Promise.resolve([]),
    showSpotlights ? getSpotlightRows(filters) : Promise.resolve([]),
  ])

  let chefCards = chefs.map((chef) => chefToCard(chef, filters.intent))
  let listingCards = listingResult.map(listingToCard)
  let spotlightCards = spotlightRows.map(spotlightToCard)

  if (filters.dietary) {
    const diet = filters.dietary.toLowerCase()
    const matchesDiet = (card: ConsumerResultCard) =>
      card.dietaryTags.some((tag) => tag.toLowerCase().includes(diet))

    chefCards = chefCards.filter((card) => matchesDiet(card) || card.relevanceScore > 35)
    spotlightCards = spotlightCards.filter((card) => matchesDiet(card) || card.type === 'package')
  }

  if (filters.craving) {
    chefCards = chefCards.filter((card) => matchesText(card, filters.craving))
    listingCards = listingCards.filter((card) => matchesText(card, filters.craving))
    spotlightCards = spotlightCards.filter((card) => matchesText(card, filters.craving))
  }

  if (filters.partySize) {
    chefCards = chefCards.map((card) => ({
      ...card,
      relevanceScore: card.relevanceScore + (card.isAvailable ? 4 : 0),
    }))
  }

  chefCards.sort((a, b) => b.relevanceScore - a.relevanceScore)
  listingCards.sort((a, b) => b.relevanceScore - a.relevanceScore)
  spotlightCards.sort((a, b) => b.relevanceScore - a.relevanceScore)

  const results = [
    ...spotlightCards.slice(0, 8),
    ...chefCards.slice(0, 16),
    ...listingCards.slice(0, 12),
  ]
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 32)

  return {
    results,
    chefs: chefCards.slice(0, 24),
    listings: listingCards.slice(0, 24),
    spotlights: spotlightCards.slice(0, 24),
    total: results.length,
  }
}
