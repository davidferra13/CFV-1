import {
  NEARBY_COLLECTIONS,
  type NearbyCollectionDefinition,
  type NearbyCollectionFilters,
} from '@/config/nearby-collections'
import {
  getBusinessTypeLabel,
  getCuisineLabel,
  getStateName,
  normalizeUsStateCode,
} from './constants'

export type NearbyCollectionViewModel = NearbyCollectionDefinition & {
  href: string
  browseHref: string
  filterChips: string[]
  locationLabel: string | null
}

export type NearbyLandingCollectionTone = 'empty' | 'growing' | 'established'

export type NearbyLandingCollectionModule = {
  id: 'business-types' | 'cuisines'
  eyebrow: string
  title: string
  description: string
  collections: NearbyCollectionViewModel[]
}

export type NearbyLandingCollectionModel = {
  tone: NearbyLandingCollectionTone
  eyebrow: string
  title: string
  description: string
  leadCollection: NearbyCollectionViewModel | null
  supportingCollections: NearbyCollectionViewModel[]
  modules: NearbyLandingCollectionModule[]
  lowDensityNote: {
    title: string
    description: string
  } | null
}

const NEARBY_COLLECTION_LOW_DENSITY_THRESHOLD = 18

function normalizeCollectionFilters(filters: NearbyCollectionFilters): NearbyCollectionFilters {
  const query = filters.query?.trim()
  const state = normalizeUsStateCode(filters.state) ?? filters.state?.trim()
  const city = filters.city?.trim()

  return {
    query: query || undefined,
    businessType: filters.businessType,
    cuisine: filters.cuisine,
    state: state || undefined,
    city: city || undefined,
    priceRange: filters.priceRange,
  }
}

function buildCollectionSearchParams(filters: NearbyCollectionFilters) {
  const normalizedFilters = normalizeCollectionFilters(filters)
  const params = new URLSearchParams()

  if (normalizedFilters.query) params.set('q', normalizedFilters.query)
  if (normalizedFilters.businessType) params.set('type', normalizedFilters.businessType)
  if (normalizedFilters.cuisine) params.set('cuisine', normalizedFilters.cuisine)
  if (normalizedFilters.state) params.set('state', normalizedFilters.state)
  if (normalizedFilters.city) params.set('city', normalizedFilters.city)
  if (normalizedFilters.priceRange) params.set('price', normalizedFilters.priceRange)

  return params
}

function buildLocationLabel(filters: NearbyCollectionFilters) {
  const normalizedFilters = normalizeCollectionFilters(filters)
  if (normalizedFilters.city && normalizedFilters.state) {
    return `${normalizedFilters.city}, ${getStateName(normalizedFilters.state)}`
  }

  if (normalizedFilters.city) return normalizedFilters.city
  if (normalizedFilters.state) return getStateName(normalizedFilters.state)
  return null
}

function toCollectionFilters(input: NearbyCollectionDefinition | NearbyCollectionFilters) {
  return 'filters' in input ? input.filters : input
}

export function buildNearbyCollectionBrowseHref(
  input: NearbyCollectionDefinition | NearbyCollectionFilters
) {
  const params = buildCollectionSearchParams(toCollectionFilters(input))
  const queryString = params.toString()
  return queryString ? `/nearby?${queryString}` : '/nearby'
}

export function buildNearbyCollectionFilterChips(
  input: NearbyCollectionDefinition | NearbyCollectionFilters
) {
  const filters = normalizeCollectionFilters(toCollectionFilters(input))
  const chips: string[] = []

  if (filters.businessType) chips.push(getBusinessTypeLabel(filters.businessType))
  if (filters.cuisine) chips.push(getCuisineLabel(filters.cuisine))

  const locationLabel = buildLocationLabel(filters)
  if (locationLabel) chips.push(locationLabel)

  if (filters.priceRange) chips.push(filters.priceRange)
  if (filters.query) chips.push(`Search: ${filters.query}`)

  return chips
}

export function toNearbyCollectionDiscoverFilters(
  collection: NearbyCollectionDefinition | NearbyCollectionViewModel,
  page = 1
) {
  const filters = normalizeCollectionFilters(collection.filters)

  return {
    query: filters.query,
    businessType: filters.businessType,
    cuisine: filters.cuisine,
    state: filters.state,
    city: filters.city,
    priceRange: filters.priceRange,
    page,
    resultMode: 'curated_collection' as const,
  }
}

function resolveCollection(collection: NearbyCollectionDefinition): NearbyCollectionViewModel {
  const filters = normalizeCollectionFilters(collection.filters)

  return {
    ...collection,
    filters,
    href: `/nearby/collections/${collection.slug}`,
    browseHref: buildNearbyCollectionBrowseHref(filters),
    filterChips: buildNearbyCollectionFilterChips(filters),
    locationLabel: buildLocationLabel(filters),
  }
}

const RESOLVED_NEARBY_COLLECTIONS = NEARBY_COLLECTIONS.map(resolveCollection)
const NEARBY_COLLECTIONS_BY_SLUG = new Map(
  RESOLVED_NEARBY_COLLECTIONS.map((collection) => [collection.slug, collection] as const)
)

export function listNearbyCollections() {
  return RESOLVED_NEARBY_COLLECTIONS
}

export function listFeaturedNearbyCollections(limit?: number) {
  const featuredCollections = RESOLVED_NEARBY_COLLECTIONS.filter(
    (collection) => collection.featuredOnLanding
  )

  return typeof limit === 'number' ? featuredCollections.slice(0, limit) : featuredCollections
}

export function getNearbyCollectionBySlug(slug: string) {
  return NEARBY_COLLECTIONS_BY_SLUG.get(slug) ?? null
}

export function buildNearbyLandingCollectionModel({
  totalListings,
}: {
  totalListings: number
}): NearbyLandingCollectionModel {
  const featuredCollections = listFeaturedNearbyCollections()
  const allCollections = listNearbyCollections()
  const leadCollection = featuredCollections[0] ?? allCollections[0] ?? null
  const supportingCollections = [...featuredCollections, ...allCollections].filter((collection) => {
    return collection.slug !== leadCollection?.slug
  })

  const tone: NearbyLandingCollectionTone =
    totalListings === 0
      ? 'empty'
      : totalListings < NEARBY_COLLECTION_LOW_DENSITY_THRESHOLD
        ? 'growing'
        : 'established'

  const modules = [
    {
      id: 'business-types',
      eyebrow: 'Operator Paths',
      title: 'Start with a business model.',
      description:
        'These curated guides keep the current category browse intact, then package it into quicker city-and-type entry points.',
      collections: allCollections
        .filter((collection) => collection.filters.businessType)
        .slice(0, 4),
    },
    {
      id: 'cuisines',
      eyebrow: 'Cuisine Guides',
      title: 'Browse by what you want to eat.',
      description:
        'Cuisine-led guides turn Nearby into a tighter destination browse without replacing the normal filter model underneath.',
      collections: allCollections.filter((collection) => collection.filters.cuisine).slice(0, 4),
    },
  ] satisfies NearbyLandingCollectionModule[]

  const visibleModules: NearbyLandingCollectionModule[] = modules.filter(
    (module) => module.collections.length > 0
  )

  if (tone === 'empty') {
    return {
      tone,
      eyebrow: 'Curated Collection Guides',
      title: 'Use guide paths while the live directory fills in.',
      description:
        'Nearby still opens with editorial city-plus-category entry points, so the landing page stays useful before search even when the live feed is empty.',
      leadCollection,
      supportingCollections: supportingCollections.slice(0, 3),
      modules: visibleModules,
      lowDensityNote: {
        title: 'No filler cards, still a guided landing.',
        description:
          'If live inventory is thin, curated collections stay visible above the feed so visitors still get intentional browse paths instead of a blank directory.',
      },
    }
  }

  if (tone === 'growing') {
    return {
      tone,
      eyebrow: 'Curated Collection Guides',
      title: 'Start with curated guides, then drop into the live feed.',
      description:
        'Collections make the default Nearby state feel more like a destination guide while coverage is still selective. Each guide opens the same filters and live listing model underneath.',
      leadCollection,
      supportingCollections: supportingCollections.slice(0, 3),
      modules: visibleModules,
      lowDensityNote: {
        title: 'Coverage is still selective.',
        description:
          'Collections stay prominent because they narrow the same Nearby browse and live feed instead of inventing a separate content type.',
      },
    }
  }

  return {
    tone,
    eyebrow: 'Curated Collection Guides',
    title: 'Start with a destination guide, not a cold directory.',
    description:
      'Collections give the Nearby landing page stronger editorial entry points before visitors open the broader live feed, city hubs, and category hubs.',
    leadCollection,
    supportingCollections: supportingCollections.slice(0, 3),
    modules: visibleModules,
    lowDensityNote: null,
  }
}

function scoreCollectionSimilarity(
  current: NearbyCollectionViewModel,
  candidate: NearbyCollectionViewModel
) {
  let score = 0

  if (current.filters.state && current.filters.state === candidate.filters.state) score += 3
  if (current.filters.city && current.filters.city === candidate.filters.city) score += 2
  if (
    current.filters.businessType &&
    current.filters.businessType === candidate.filters.businessType
  ) {
    score += 2
  }
  if (current.filters.cuisine && current.filters.cuisine === candidate.filters.cuisine) score += 1

  return score
}

export function listRelatedNearbyCollections(slug: string, limit = 3) {
  const currentCollection = getNearbyCollectionBySlug(slug)
  if (!currentCollection) {
    return RESOLVED_NEARBY_COLLECTIONS.slice(0, limit)
  }

  return RESOLVED_NEARBY_COLLECTIONS.filter((collection) => collection.slug !== slug)
    .sort((a, b) => {
      const scoreDelta =
        scoreCollectionSimilarity(currentCollection, b) -
        scoreCollectionSimilarity(currentCollection, a)
      if (scoreDelta !== 0) return scoreDelta
      return a.title.localeCompare(b.title)
    })
    .slice(0, limit)
}
