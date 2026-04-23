import type { Metadata } from 'next'
import type { DirectoryListingSummary } from './actions'
import {
  BUSINESS_TYPES,
  CUISINE_CATEGORIES,
  getBusinessTypeCollectionLabel,
  getCuisineLabel,
  getStateName,
  normalizeUsStateCode,
} from './constants'
import { normalizeNearbyLocationInput } from './nearby-search'

const DEFAULT_TITLE =
  'Nearby Food Directory | Restaurants, Private Chefs, Caterers, Bakeries, and More'
const DEFAULT_DESCRIPTION =
  'Browse curated collection guides, live listings, restaurants, private chefs, caterers, food trucks, bakeries, and meal prep operators by city, state, cuisine, or category.'
const DEFAULT_OG_TITLE = 'Nearby Food Directory | Browse Food Businesses Near You'
const DEFAULT_OG_DESCRIPTION =
  'Start with curated guides, browse hubs, and live listings, then narrow by category, city, state, or cuisine across the Nearby directory.'
const DEFAULT_TWITTER_DESCRIPTION =
  'Curated guides, live listings, private chefs, caterers, food trucks, bakeries, and more in one browseable directory.'

const BUSINESS_TYPE_VALUES = new Set<string>(BUSINESS_TYPES.map((type) => type.value))
const CUISINE_VALUES = new Set<string>(CUISINE_CATEGORIES.map((category) => category.value))

export type NearbyBrowseSearchParams = {
  q?: string | string[]
  type?: string | string[]
  cuisine?: string | string[]
  state?: string | string[]
  city?: string | string[]
  price?: string | string[]
  page?: string | string[]
  location?: string | string[]
  radius?: string | string[]
  lat?: string | string[]
  lon?: string | string[]
}

export type NearbyBrowseSeoBase = {
  businessType: string | null
  businessTypeCollectionLabel: string | null
  canonicalPath: string
  canonicalQueryString: string
  chips: string[]
  city: string | null
  cuisine: string | null
  cuisineLabel: string | null
  hasMeaningfulFilters: boolean
  hasPagination: boolean
  hasSearchText: boolean
  hasUnsupportedFilters: boolean
  hasVolatileLocationFilters: boolean
  heading: string
  isLanding: boolean
  locationLabel: string | null
  requestedPage: number
  stateCode: string | null
  stateName: string | null
  subjectPhrase: string
}

export type NearbyBrowseSeoEvaluation = {
  isEmpty: boolean
  isLowData: boolean
  minResultsForIndexing: number
  resultTotal: number
  shouldIndex: boolean
  shouldRenderItemList: boolean
}

type CollectionJsonLdOptions = {
  appUrl: string
  base: NearbyBrowseSeoBase
  previewListings: DirectoryListingSummary[]
  total: number
}

function firstParam(value?: string | string[]): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

function normalizePositivePage(value: string) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

function normalizeDisplayText(value: string) {
  const normalized = normalizeNearbyLocationInput(value)
  if (!normalized) return ''

  if (normalized !== normalized.toLowerCase() && normalized !== normalized.toUpperCase()) {
    return normalized
  }

  return normalized.toLowerCase().replace(/\b\p{L}/gu, (match) => match.toUpperCase())
}

function buildCanonicalPath(params: URLSearchParams) {
  const queryString = params.toString()
  return queryString ? `/nearby?${queryString}` : '/nearby'
}

function buildHeading({
  businessTypeCollectionLabel,
  cuisineLabel,
  locationLabel,
}: Pick<NearbyBrowseSeoBase, 'businessTypeCollectionLabel' | 'cuisineLabel' | 'locationLabel'>) {
  if (businessTypeCollectionLabel && cuisineLabel) {
    return locationLabel
      ? `${cuisineLabel} ${businessTypeCollectionLabel} in ${locationLabel}`
      : `${cuisineLabel} ${businessTypeCollectionLabel}`
  }

  if (businessTypeCollectionLabel) {
    return locationLabel
      ? `${businessTypeCollectionLabel} in ${locationLabel}`
      : businessTypeCollectionLabel
  }

  if (cuisineLabel) {
    return locationLabel ? `${cuisineLabel} Food in ${locationLabel}` : `${cuisineLabel} Food`
  }

  if (locationLabel) {
    return `Food in ${locationLabel}`
  }

  return 'Nearby Food Directory'
}

function buildSubjectPhrase({
  businessTypeCollectionLabel,
  cuisineLabel,
  locationLabel,
}: Pick<NearbyBrowseSeoBase, 'businessTypeCollectionLabel' | 'cuisineLabel' | 'locationLabel'>) {
  const businessTypePhrase = businessTypeCollectionLabel?.toLowerCase() ?? null
  const cuisinePhrase = cuisineLabel?.toLowerCase() ?? null

  if (businessTypePhrase && cuisinePhrase) {
    return locationLabel
      ? `${cuisinePhrase} ${businessTypePhrase} in ${locationLabel}`
      : `${cuisinePhrase} ${businessTypePhrase}`
  }

  if (businessTypePhrase) {
    return locationLabel ? `${businessTypePhrase} in ${locationLabel}` : businessTypePhrase
  }

  if (cuisinePhrase) {
    return locationLabel ? `${cuisinePhrase} food in ${locationLabel}` : `${cuisinePhrase} food`
  }

  if (locationLabel) {
    return `food businesses in ${locationLabel}`
  }

  return 'food businesses'
}

function buildNearbyDescription(
  base: NearbyBrowseSeoBase,
  evaluation?: NearbyBrowseSeoEvaluation | null
) {
  if (base.isLanding) {
    if (base.hasUnsupportedFilters) {
      return DEFAULT_OG_DESCRIPTION
    }

    return DEFAULT_DESCRIPTION
  }

  if (evaluation?.shouldIndex) {
    return `Browse ${evaluation.resultTotal.toLocaleString()} ${base.subjectPhrase} on ChefFlow's Nearby directory. Review live listings, menus, websites, and contact details.`
  }

  return `Explore current coverage for ${base.subjectPhrase} on ChefFlow's Nearby directory. Broaden the filters to see more live listings if this slice is still thin.`
}

function buildSocialImageUrl(appUrl: string, base: NearbyBrowseSeoBase) {
  return base.canonicalQueryString
    ? `${appUrl}/api/og/nearby?${base.canonicalQueryString}`
    : `${appUrl}/api/og/nearby`
}

function buildSocialImageAlt(base: NearbyBrowseSeoBase) {
  return base.isLanding ? 'Nearby food directory by ChefFlow' : `${base.heading} on ChefFlow Nearby`
}

function buildBreadcrumbLabel(
  base: NearbyBrowseSeoBase,
  key: 'state' | 'city' | 'type' | 'cuisine'
) {
  if (key === 'state') return base.stateName ?? 'Nearby'
  if (key === 'city') return base.locationLabel ?? base.city ?? 'Nearby'
  if (key === 'type') {
    return base.locationLabel && base.businessTypeCollectionLabel
      ? `${base.businessTypeCollectionLabel} in ${base.locationLabel}`
      : (base.businessTypeCollectionLabel ?? 'Nearby')
  }

  if (base.cuisineLabel && base.businessTypeCollectionLabel) {
    return base.locationLabel
      ? `${base.cuisineLabel} ${base.businessTypeCollectionLabel} in ${base.locationLabel}`
      : `${base.cuisineLabel} ${base.businessTypeCollectionLabel}`
  }

  return base.locationLabel && base.cuisineLabel
    ? `${base.cuisineLabel} Food in ${base.locationLabel}`
    : `${base.cuisineLabel ?? 'Nearby'} Food`
}

function getMinimumResultsForIndexing(base: NearbyBrowseSeoBase) {
  if (base.city && base.stateCode && (base.businessType || base.cuisine)) return 3
  if (base.city && base.stateCode) return 4
  if (base.stateCode && (base.businessType || base.cuisine)) return 4
  if (base.stateCode) return 8
  if (base.businessType && base.cuisine) return 6
  return 8
}

export function buildNearbyBrowseSeoBase(
  searchParams: NearbyBrowseSearchParams | undefined
): NearbyBrowseSeoBase {
  const query = normalizeNearbyLocationInput(firstParam(searchParams?.q))
  const rawBusinessType = firstParam(searchParams?.type)
  const rawCuisine = firstParam(searchParams?.cuisine)
  const rawState = firstParam(searchParams?.state)
  const rawCity = firstParam(searchParams?.city)
  const price = firstParam(searchParams?.price)
  const locationQuery = normalizeNearbyLocationInput(firstParam(searchParams?.location))
  const radius = firstParam(searchParams?.radius)
  const lat = firstParam(searchParams?.lat)
  const lon = firstParam(searchParams?.lon)
  const requestedPage = normalizePositivePage(firstParam(searchParams?.page))

  const businessType = BUSINESS_TYPE_VALUES.has(rawBusinessType) ? rawBusinessType : null
  const cuisine = CUISINE_VALUES.has(rawCuisine) ? rawCuisine : null
  const stateCode = normalizeUsStateCode(rawState)
  const stateName = stateCode ? getStateName(stateCode) : null
  const cityCandidate = normalizeDisplayText(rawCity)
  const city = stateCode && cityCandidate ? cityCandidate : null
  const locationLabel = city && stateName ? `${city}, ${stateName}` : stateName
  const businessTypeCollectionLabel = businessType
    ? getBusinessTypeCollectionLabel(businessType)
    : null
  const cuisineLabel = cuisine ? getCuisineLabel(cuisine) : null

  const canonicalParams = new URLSearchParams()
  if (stateCode) canonicalParams.set('state', stateCode)
  if (city) canonicalParams.set('city', city)
  if (businessType) canonicalParams.set('type', businessType)
  if (cuisine) canonicalParams.set('cuisine', cuisine)

  const hasVolatileLocationFilters = Boolean(locationQuery || radius || lat || lon)
  const hasUnsupportedFilters =
    Boolean(query) ||
    Boolean(price) ||
    hasVolatileLocationFilters ||
    requestedPage > 1 ||
    Boolean(cityCandidate && !stateCode)

  const chips = [stateName, city, businessTypeCollectionLabel, cuisineLabel].filter(
    Boolean
  ) as string[]
  const hasMeaningfulFilters = canonicalParams.size > 0

  const base: NearbyBrowseSeoBase = {
    businessType,
    businessTypeCollectionLabel,
    canonicalPath: buildCanonicalPath(canonicalParams),
    canonicalQueryString: canonicalParams.toString(),
    chips,
    city,
    cuisine,
    cuisineLabel,
    hasMeaningfulFilters,
    hasPagination: requestedPage > 1,
    hasSearchText: Boolean(query),
    hasUnsupportedFilters,
    hasVolatileLocationFilters,
    heading: '',
    isLanding: !hasMeaningfulFilters,
    locationLabel,
    requestedPage,
    stateCode,
    stateName,
    subjectPhrase: '',
  }

  base.heading = buildHeading(base)
  base.subjectPhrase = buildSubjectPhrase(base)

  return base
}

export function evaluateNearbyBrowseSeo(
  base: NearbyBrowseSeoBase,
  resultTotal: number
): NearbyBrowseSeoEvaluation {
  if (base.isLanding) {
    return {
      isEmpty: resultTotal === 0,
      isLowData: false,
      minResultsForIndexing: 1,
      resultTotal,
      shouldIndex: !base.hasUnsupportedFilters,
      shouldRenderItemList: !base.hasUnsupportedFilters && resultTotal > 0,
    }
  }

  const minResultsForIndexing = getMinimumResultsForIndexing(base)
  const shouldIndex =
    !base.hasUnsupportedFilters && base.hasMeaningfulFilters && resultTotal >= minResultsForIndexing

  return {
    isEmpty: resultTotal === 0,
    isLowData: resultTotal > 0 && resultTotal < minResultsForIndexing,
    minResultsForIndexing,
    resultTotal,
    shouldIndex,
    shouldRenderItemList: shouldIndex && resultTotal > 0,
  }
}

export function buildNearbyBrowseMetadata({
  appUrl,
  base,
  evaluation,
}: {
  appUrl: string
  base: NearbyBrowseSeoBase
  evaluation?: NearbyBrowseSeoEvaluation | null
}): Metadata {
  const canonicalUrl = `${appUrl}${base.canonicalPath}`
  const description = buildNearbyDescription(base, evaluation)
  const socialImageUrl = buildSocialImageUrl(appUrl, base)
  const socialImageAlt = buildSocialImageAlt(base)
  const shouldIndex = base.isLanding
    ? !base.hasUnsupportedFilters
    : Boolean(evaluation?.shouldIndex) && !base.hasUnsupportedFilters
  const title = base.isLanding ? DEFAULT_TITLE : `${base.heading} | Nearby Food Directory`
  const ogTitle = base.isLanding ? DEFAULT_OG_TITLE : `${base.heading} | Nearby`
  const twitterTitle = ogTitle
  const twitterDescription = base.isLanding ? DEFAULT_TWITTER_DESCRIPTION : description

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: shouldIndex,
      follow: true,
    },
    openGraph: {
      title: ogTitle,
      description,
      url: canonicalUrl,
      siteName: 'ChefFlow',
      type: 'website',
      images: [
        {
          url: socialImageUrl,
          width: 1200,
          height: 630,
          alt: socialImageAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: twitterTitle,
      description: twitterDescription,
      images: [socialImageUrl],
    },
  }
}

export function buildNearbyBrowseBreadcrumbItems({
  appUrl,
  base,
}: {
  appUrl: string
  base: NearbyBrowseSeoBase
}) {
  const items = [
    { name: 'Home', url: appUrl },
    { name: 'Nearby', url: `${appUrl}/nearby` },
  ]

  const params = new URLSearchParams()

  if (base.stateCode && base.stateName) {
    params.set('state', base.stateCode)
    items.push({
      name: buildBreadcrumbLabel(base, 'state'),
      url: `${appUrl}${buildCanonicalPath(params)}`,
    })
  }

  if (base.city) {
    params.set('city', base.city)
    items.push({
      name: buildBreadcrumbLabel(base, 'city'),
      url: `${appUrl}${buildCanonicalPath(params)}`,
    })
  }

  if (base.businessType && base.businessTypeCollectionLabel) {
    params.set('type', base.businessType)
    items.push({
      name: buildBreadcrumbLabel(base, 'type'),
      url: `${appUrl}${buildCanonicalPath(params)}`,
    })
  }

  if (base.cuisine && base.cuisineLabel) {
    params.set('cuisine', base.cuisine)
    items.push({
      name: buildBreadcrumbLabel(base, 'cuisine'),
      url: `${appUrl}${buildCanonicalPath(params)}`,
    })
  }

  return items
}

export function buildNearbyBrowseCollectionJsonLd({
  appUrl,
  base,
  previewListings,
  total,
}: CollectionJsonLdOptions) {
  const canonicalUrl = `${appUrl}${base.canonicalPath}`

  const about = [
    base.stateName
      ? {
          '@type': 'Place',
          name: base.stateName,
        }
      : null,
    base.city && base.locationLabel
      ? {
          '@type': 'Place',
          name: base.locationLabel,
        }
      : null,
    base.businessTypeCollectionLabel
      ? {
          '@type': 'Thing',
          name: base.businessTypeCollectionLabel,
        }
      : null,
    base.cuisineLabel
      ? {
          '@type': 'Thing',
          name: base.cuisineLabel,
        }
      : null,
  ].filter(Boolean)

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: base.isLanding ? 'Nearby Food Directory' : base.heading,
    description: buildNearbyDescription(base, {
      isEmpty: total === 0,
      isLowData: false,
      minResultsForIndexing: 1,
      resultTotal: total,
      shouldIndex: true,
      shouldRenderItemList: total > 0,
    }),
    url: canonicalUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: 'ChefFlow',
      url: appUrl,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${appUrl}/nearby?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }

  if (about.length > 0) {
    data.about = about
  }

  if (previewListings.length > 0) {
    data.mainEntity = {
      '@type': 'ItemList',
      itemListOrder: 'https://schema.org/ItemListUnordered',
      numberOfItems: total,
      itemListElement: previewListings.map((listing, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${appUrl}/nearby/${listing.slug}`,
        name: listing.name,
      })),
    }
  }

  return data
}
