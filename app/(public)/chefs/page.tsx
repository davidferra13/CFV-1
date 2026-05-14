import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicSecondaryEntryCluster } from '@/components/public/public-secondary-entry-cluster'
import { PUBLIC_SECONDARY_ENTRY_CONFIG } from '@/lib/public/public-secondary-entry-config'
import { TrackedLink } from '@/components/analytics/tracked-link'
import {
  canonicalizeDiscoveryPriceRange,
  DISCOVERY_SERVICE_TYPE_OPTIONS,
  getDiscoveryPriceRangeLabel,
} from '@/lib/discovery/constants'
import { getDiscoverableChefs } from '@/lib/directory/actions'
import {
  DIRECTORY_SORT_OPTIONS,
  buildCuisineFacets,
  buildLocationBestForFacets,
  buildLocationExperienceFacets,
  buildPartnerTypeFacets,
  buildServiceTypeFacets,
  buildStateFacets,
  filterDirectoryChefs,
  normalizeDirectoryValue,
  parseDirectoryBooleanParam,
  parseDirectorySortMode,
  sanitizeDirectoryQuery,
  sortDirectoryChefs,
  getChefCoverage,
} from '@/lib/directory/utils'
import {
  filterChefsByResolvedLocation,
  resolveStateOnlyLocationQuery,
} from '@/lib/directory/location-search'
import { resolvePublicLocationQuery } from '@/lib/geo/public-location'
import { PUBLIC_PRIMARY_CONSUMER_CTA } from '@/lib/public/public-surface-config'
import { buildPublicDirectorySummary } from '@/lib/public/public-directory-summary'
import { buildMarketingMetadata } from '@/lib/site/public-site'
import { WaitlistCapture } from '@/components/directory/waitlist-capture'
import { ChefDirectoryHeader } from './_components/chef-hero'
import { DirectorySearchBar } from './_components/directory-search-bar'
import { ChefCard } from './_components/chef-card'
import { ResultsHeader } from './_components/results-header'
import { DirectoryResultsTracker } from './_components/directory-results-tracker'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
const MAX_QUERY_LENGTH = 80
const ZERO_RESULT_SUGGESTIONS = DISCOVERY_SERVICE_TYPE_OPTIONS.filter((option) =>
  ['private_dinner', 'catering', 'meal_prep'].includes(option.value)
)

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  ...buildMarketingMetadata({
    title: "Browse ChefFlow's Curated Chef Directory",
    description:
      'Browse the chefs currently live on ChefFlow, filter by service and location, and describe your event if you want matched outreach.',
    path: '/chefs',
    imagePath: '/social/chefflow-home.png',
    imageAlt: 'ChefFlow chef directory preview',
    twitterCard: 'summary_large_image',
  }),
  keywords: [
    'hire private chef',
    'private chef near me',
    'personal chef for hire',
    'private dinner party chef',
    'book a private chef',
    'private chef directory',
    'meal prep chef',
    'catering chef',
  ],
}

type PageProps = {
  searchParams?: {
    q?: string | string[]
    location?: string | string[]
    locationSource?: string | string[]
    state?: string | string[]
    cuisine?: string | string[]
    serviceType?: string | string[]
    dietary?: string | string[]
    priceRange?: string | string[]
    partnerType?: string | string[]
    locationExperience?: string | string[]
    locationBestFor?: string | string[]
    accepting?: string | string[]
    sort?: string | string[]
  }
}

type DirectoryLocationSource = 'manual' | 'current' | 'approximate'

function firstParam(value?: string | string[]): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

function parseDirectoryLocationSource(value: string): DirectoryLocationSource {
  if (value === 'current' || value === 'approximate') return value
  return 'manual'
}

function buildActiveFilterChips(
  params: NonNullable<PageProps['searchParams']>,
  labels: {
    location: string | null
    cuisine: string | null
    serviceType: string | null
    priceRange: string | null
    partnerType: string | null
    locationExperience: string | null
    locationBestFor: string | null
    accepting: boolean
    query: string
  }
): Array<{ label: string; removeHref: string }> {
  const chips: Array<{ label: string; removeHref: string }> = []

  const buildRemoveHref = (paramToRemove: string) => {
    const next = new URLSearchParams()
    for (const [key, rawVal] of Object.entries(params)) {
      if (key === paramToRemove) continue
      const val = firstParam(rawVal)
      if (val) next.set(key, val)
    }
    const qs = next.toString()
    return qs ? `/chefs?${qs}` : '/chefs'
  }

  if (labels.query) chips.push({ label: `"${labels.query}"`, removeHref: buildRemoveHref('q') })
  if (labels.location)
    chips.push({ label: `Location: ${labels.location}`, removeHref: buildRemoveHref('location') })
  if (labels.cuisine)
    chips.push({ label: `Cuisine: ${labels.cuisine}`, removeHref: buildRemoveHref('cuisine') })
  if (labels.serviceType)
    chips.push({
      label: `Service: ${labels.serviceType}`,
      removeHref: buildRemoveHref('serviceType'),
    })
  if (labels.priceRange)
    chips.push({ label: `Price: ${labels.priceRange}`, removeHref: buildRemoveHref('priceRange') })
  if (labels.partnerType)
    chips.push({
      label: `Partner: ${labels.partnerType}`,
      removeHref: buildRemoveHref('partnerType'),
    })
  if (labels.locationExperience)
    chips.push({
      label: `Vibe: ${labels.locationExperience}`,
      removeHref: buildRemoveHref('locationExperience'),
    })
  if (labels.locationBestFor)
    chips.push({
      label: `Best for: ${labels.locationBestFor}`,
      removeHref: buildRemoveHref('locationBestFor'),
    })
  if (labels.accepting)
    chips.push({ label: 'Accepting only', removeHref: buildRemoveHref('accepting') })

  return chips
}

export default async function ChefDirectoryPage({ searchParams }: PageProps) {
  const allChefs = await getDiscoverableChefs()
  const directorySummary = buildPublicDirectorySummary(allChefs)
  const stateFacets = buildStateFacets(allChefs)
  const cuisineFacets = buildCuisineFacets(allChefs)
  const serviceTypeFacets = buildServiceTypeFacets(allChefs)
  const partnerTypeFacets = buildPartnerTypeFacets(allChefs)
  const locationExperienceFacets = buildLocationExperienceFacets(allChefs)
  const locationBestForFacets = buildLocationBestForFacets(allChefs)

  // Parse search params
  const query = sanitizeDirectoryQuery(firstParam(searchParams?.q), MAX_QUERY_LENGTH)
  const requestedLocation = sanitizeDirectoryQuery(
    firstParam(searchParams?.location),
    MAX_QUERY_LENGTH
  )
  const initialLocationSource = requestedLocation
    ? parseDirectoryLocationSource(firstParam(searchParams?.locationSource))
    : 'manual'
  const requestedState = normalizeDirectoryValue(firstParam(searchParams?.state))
  const requestedCuisine = normalizeDirectoryValue(firstParam(searchParams?.cuisine))
  const requestedServiceType = normalizeDirectoryValue(firstParam(searchParams?.serviceType))
  const requestedDietary = normalizeDirectoryValue(firstParam(searchParams?.dietary))
  const requestedPriceRange = normalizeDirectoryValue(firstParam(searchParams?.priceRange))
  const requestedPartnerType = normalizeDirectoryValue(firstParam(searchParams?.partnerType))
  const requestedLocationExperience = normalizeDirectoryValue(
    firstParam(searchParams?.locationExperience)
  )
  const requestedLocationBestFor = normalizeDirectoryValue(
    firstParam(searchParams?.locationBestFor)
  )
  const acceptingOnly = parseDirectoryBooleanParam(firstParam(searchParams?.accepting))
  const requestedSort = firstParam(searchParams?.sort)
  const sortMode = parseDirectorySortMode(requestedSort)

  // Resolve filters
  const legacyStateFilter = stateFacets.some((option) => option.value === requestedState)
    ? requestedState
    : ''
  const cuisineFilter = cuisineFacets.some((option) => option.value === requestedCuisine)
    ? requestedCuisine
    : ''
  const serviceTypeFilter = serviceTypeFacets.some(
    (option) => option.value === requestedServiceType
  )
    ? requestedServiceType
    : ''
  const partnerTypeFilter = partnerTypeFacets.some(
    (option) => option.value === requestedPartnerType
  )
    ? requestedPartnerType
    : ''
  const locationExperienceFilter = locationExperienceFacets.some(
    (option) => option.value === requestedLocationExperience
  )
    ? requestedLocationExperience
    : ''
  const locationBestForFilter = locationBestForFacets.some(
    (option) => option.value === requestedLocationBestFor
  )
    ? requestedLocationBestFor
    : ''
  const allowedDietaryFilters = new Set([
    'vegan',
    'vegetarian',
    'gluten_free',
    'dairy_free',
    'allergy_aware',
    'medical_diets',
    'religious_diets',
  ])
  const dietaryFilter = allowedDietaryFilters.has(requestedDietary) ? requestedDietary : ''
  const priceRangeFilter = canonicalizeDiscoveryPriceRange(requestedPriceRange) ?? ''

  // Resolve location
  const legacyStateLabel =
    stateFacets.find((option) => option.value === legacyStateFilter)?.label ?? null
  const locationInputValue = requestedLocation || legacyStateLabel || ''
  const stateOnlyLocation = locationInputValue
    ? resolveStateOnlyLocationQuery(locationInputValue)
    : null

  let resolvedLocation = null
  let locationError: string | null = null
  let locationFilteredChefs = allChefs

  if (requestedLocation && !stateOnlyLocation) {
    const locResult = await resolvePublicLocationQuery(requestedLocation)
    resolvedLocation = locResult.data
    if (resolvedLocation) {
      locationFilteredChefs = await filterChefsByResolvedLocation(allChefs, resolvedLocation)
    } else {
      locationError =
        locResult.error || 'We could not place that location. Try a ZIP code or city, state.'
    }
  }

  const stateFilter = requestedLocation
    ? stateOnlyLocation
      ? normalizeDirectoryValue(stateOnlyLocation.name)
      : ''
    : legacyStateFilter

  const filteredChefs = filterDirectoryChefs(locationFilteredChefs, {
    query,
    stateFilter,
    cuisineFilter,
    serviceTypeFilter,
    dietaryFilter,
    priceRangeFilter,
    partnerTypeFilter,
    locationExperienceFilter,
    locationBestForFilter,
    acceptingOnly,
  })
  const chefs = sortDirectoryChefs(filteredChefs, sortMode)

  // Resolve labels for display
  const selectedCuisineLabel =
    cuisineFacets.find((option) => option.value === cuisineFilter)?.label ?? null
  const selectedServiceTypeLabel =
    serviceTypeFacets.find((option) => option.value === serviceTypeFilter)?.label ?? null
  const selectedPriceRangeLabel = priceRangeFilter
    ? getDiscoveryPriceRangeLabel(priceRangeFilter)
    : null
  const selectedPartnerTypeLabel =
    partnerTypeFacets.find((option) => option.value === partnerTypeFilter)?.label ?? null
  const selectedLocationExperienceLabel =
    locationExperienceFacets.find((option) => option.value === locationExperienceFilter)?.label ??
    null
  const selectedLocationBestForLabel =
    locationBestForFacets.find((option) => option.value === locationBestForFilter)?.label ?? null
  const selectedSortLabel =
    DIRECTORY_SORT_OPTIONS.find((option) => option.value === sortMode)?.label ?? 'Featured first'
  const activeLocationLabel = requestedLocation
    ? (stateOnlyLocation?.name ?? resolvedLocation?.displayLabel ?? null)
    : legacyStateLabel
  const effectiveLocationSource = activeLocationLabel ? initialLocationSource : 'manual'

  // Build active filter chips for ResultsHeader
  const activeFilterChips = buildActiveFilterChips(searchParams ?? {}, {
    location: activeLocationLabel,
    cuisine: selectedCuisineLabel,
    serviceType: selectedServiceTypeLabel,
    priceRange: selectedPriceRangeLabel,
    partnerType: selectedPartnerTypeLabel,
    locationExperience: selectedLocationExperienceLabel,
    locationBestFor: selectedLocationBestForLabel,
    accepting: acceptingOnly,
    query,
  })

  // SEO structured data
  const directoryStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'ChefFlow Private Chef Directory',
    url: `${APP_URL}/chefs`,
    numberOfItems: allChefs.length,
    itemListElement: allChefs.slice(0, 50).map((chef, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Person',
        name: chef.display_name,
        url: `${APP_URL}/chef/${chef.slug}`,
        description:
          chef.discovery.highlight_text ||
          chef.tagline ||
          chef.bio ||
          'Private chef listed on ChefFlow',
        areaServed: getChefCoverage(chef)
          .slice(0, 3)
          .map((coverage) => ({
            '@type': 'Place',
            name: coverage,
          })),
      },
    })),
  }

  return (
    <div className="min-h-screen bg-stone-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(directoryStructuredData) }}
      />
      <DirectoryResultsTracker
        query={query}
        locationFilter={activeLocationLabel || ''}
        locationSource={effectiveLocationSource}
        cuisineFilter={cuisineFilter}
        serviceTypeFilter={serviceTypeFilter}
        priceRangeFilter={priceRangeFilter}
        partnerTypeFilter={partnerTypeFilter}
        locationExperienceFilter={locationExperienceFilter}
        locationBestForFilter={locationBestForFilter}
        discoveryIntent=""
        acceptingOnly={acceptingOnly}
        sortMode={sortMode}
        resultCount={chefs.length}
        totalCount={allChefs.length}
      />

      {/* Compact header */}
      <ChefDirectoryHeader
        totalChefs={directorySummary.totalChefs}
        acceptingChefs={directorySummary.acceptingChefs}
        topCoverage={directorySummary.topCoverage.slice(0, 6)}
      />

      {/* Sticky filter bar */}
      <section className="sticky top-0 z-30 border-b border-stone-800 bg-stone-900/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
          <DirectorySearchBar
            query={query}
            locationFilter={locationInputValue}
            locationSource={initialLocationSource}
            cuisineFilter={cuisineFilter}
            serviceTypeFilter={serviceTypeFilter}
            dietaryFilter={dietaryFilter}
            priceRangeFilter={priceRangeFilter}
            partnerTypeFilter={partnerTypeFilter}
            locationExperienceFilter={locationExperienceFilter}
            locationBestForFilter={locationBestForFilter}
            acceptingOnly={acceptingOnly}
            sortMode={sortMode}
            maxQueryLength={MAX_QUERY_LENGTH}
            cuisineOptions={cuisineFacets}
            serviceTypeOptions={serviceTypeFacets}
            partnerTypeOptions={partnerTypeFacets}
            locationExperienceOptions={locationExperienceFacets}
            locationBestForOptions={locationBestForFacets}
          />
        </div>
      </section>

      {/* Results */}
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <ResultsHeader
          resultCount={chefs.length}
          totalCount={allChefs.length}
          activeFilters={activeFilterChips}
          sortLabel={selectedSortLabel}
          hasFilters={activeFilterChips.length > 0}
        />

        {locationError && (
          <p className="mb-4 rounded-xl border border-amber-700/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
            {locationError}
          </p>
        )}

        {chefs.length === 0 ? (
          <div className="py-20 text-center">
            <h2 className="text-xl font-semibold text-stone-300">
              {allChefs.length === 0
                ? 'The directory is accepting nationwide requests'
                : 'No chefs match these filters'}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
              {allChefs.length === 0
                ? 'Chef onboarding is underway. Describe your event and we will match you when coverage expands.'
                : 'Try a broader search, or describe your event so matched chefs can review the request directly.'}
            </p>

            <div className="mt-6 flex items-center justify-center gap-4">
              <TrackedLink
                href={PUBLIC_PRIMARY_CONSUMER_CTA.href}
                analyticsName="directory_primary_cta"
                analyticsProps={{ section: 'zero_results' }}
                className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                {PUBLIC_PRIMARY_CONSUMER_CTA.label}
              </TrackedLink>
              <Link
                href="/chefs"
                className="rounded-xl border border-stone-600 px-5 py-2.5 text-sm font-medium text-stone-300 transition-colors hover:border-stone-500 hover:text-stone-100"
              >
                Reset filters
              </Link>
            </div>

            <WaitlistCapture location={activeLocationLabel || requestedLocation || undefined} />

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {ZERO_RESULT_SUGGESTIONS.map((option) => (
                <Link
                  key={option.value}
                  href={`/chefs?serviceType=${option.value}`}
                  className="rounded-full border border-stone-600 bg-stone-900 px-4 py-2 text-sm text-stone-300 transition-colors hover:border-brand-500 hover:text-stone-100"
                >
                  {option.label}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {chefs.map((chef) => (
              <ChefCard key={chef.id} chef={chef} />
            ))}
          </div>
        )}

        {/* Trust line */}
        <p className="mt-12 text-center text-xs text-stone-600">
          Every chef profile is reviewed before listing.
        </p>

        <PublicSecondaryEntryCluster links={PUBLIC_SECONDARY_ENTRY_CONFIG.directory} theme="dark" />
      </section>
    </div>
  )
}
