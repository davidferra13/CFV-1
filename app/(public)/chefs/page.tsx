import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicSecondaryEntryCluster } from '@/components/public/public-secondary-entry-cluster'
import { PUBLIC_SECONDARY_ENTRY_CONFIG } from '@/lib/public/public-secondary-entry-config'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { PublicSeasonalMarketPulse } from '@/components/seasonal/public-seasonal-market-pulse'
import { CloudinaryFetchImage } from '@/components/ui/cloudinary-fetch-image'
import {
  DISCOVERY_SERVICE_TYPE_OPTIONS,
  getDiscoveryPriceRangeLabel,
  getDiscoveryServiceTypeLabel,
} from '@/lib/discovery/constants'
import { getDiscoveryAvailabilityLabel, getDiscoveryGuestCountLabel } from '@/lib/discovery/profile'
import { getDiscoverableChefs, type DirectoryChef } from '@/lib/directory/actions'
import {
  DIRECTORY_SORT_OPTIONS,
  buildCuisineFacets,
  buildLocationBestForFacets,
  buildLocationExperienceFacets,
  buildPartnerTypeFacets,
  buildServiceTypeFacets,
  buildStateFacets,
  filterDirectoryChefs,
  getChefCoverage,
  normalizeDirectoryValue,
  parseDirectoryBooleanParam,
  parseDirectorySortMode,
  sanitizeDirectoryQuery,
  sortDirectoryChefs,
} from '@/lib/directory/utils'
import {
  filterChefsByResolvedLocation,
  resolveStateOnlyLocationQuery,
} from '@/lib/directory/location-search'
import { resolvePublicLocationQuery } from '@/lib/geo/public-location'
import {
  PUBLIC_CONSUMER_DISCOVERY_ENTRY,
  PUBLIC_MATCHED_CHEF_FOLLOWUP,
  PUBLIC_MATCHED_CHEF_HELPER,
  PUBLIC_PRIMARY_CONSUMER_CTA,
} from '@/lib/public/public-surface-config'
import {
  PUBLIC_DIRECTORY_LIVE_COVERAGE_COPY,
  PUBLIC_MATCHING_SCOPE_COPY,
} from '@/lib/public/public-market-copy'
import {
  buildPublicDirectorySummary,
  type PublicDirectorySummary,
} from '@/lib/public/public-directory-summary'
import { resolvePublicMarketScope } from '@/lib/public/public-market-scope'
import { getPublicSeasonalMarketPulse } from '@/lib/public/public-seasonal-market-pulse'
import { buildMarketingMetadata } from '@/lib/site/public-site'
import { HomepageLiveSignal } from '../_components/homepage-live-signal'
import { HomepageSearch } from '../_components/homepage-search'
import { ChefHero } from './_components/chef-hero'
import { DirectoryFiltersForm } from './_components/directory-filters-form'
import { DirectoryResultsTracker } from './_components/directory-results-tracker'
import { WaitlistCapture } from '@/components/directory/waitlist-capture'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
const MAX_QUERY_LENGTH = 80
const ZERO_RESULT_SUGGESTIONS = DISCOVERY_SERVICE_TYPE_OPTIONS.filter((option) =>
  ['private_dinner', 'catering', 'meal_prep'].includes(option.value)
)

const MARKETPLACE_COLLECTIONS = [
  {
    label: 'Private dinners',
    countLabel: 'Private dinner',
    href: '/chefs?serviceType=private_dinner',
    description: 'Tasting menus, dinner parties, and at-home restaurant nights.',
  },
  {
    label: 'Catering',
    countLabel: 'Catering',
    href: '/chefs?serviceType=catering',
    description: 'Drop-off, staffed events, and larger-format service.',
  },
  {
    label: 'Meal prep',
    countLabel: 'Meal prep',
    href: '/chefs?serviceType=meal_prep',
    description: 'Recurring household cooking and weekly fridge resets.',
  },
  {
    label: 'Event chefs',
    countLabel: 'Event chef',
    href: '/chefs?serviceType=event_chef',
    description: 'Chef support for launches, pop-ups, and hosted events.',
  },
] as const

const REQUEST_FLOW_STEPS = [
  {
    step: '01',
    title: 'Tell us the occasion',
    body: 'Date, guest count, location, and service style are enough to start.',
  },
  {
    step: '02',
    title: 'Compare real chef options',
    body: 'Browse live profiles yourself, or let matched chefs respond to the request.',
  },
  {
    step: '03',
    title: 'Book the fit',
    body: 'Final pricing, terms, and menu direction come from the chef before you commit.',
  },
] as const

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
    visual?: string | string[]
  }
}

type DirectoryLocationSource = 'manual' | 'current' | 'approximate'

function firstParam(value?: string | string[]): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

function formatLiveSignalList(values: string[]) {
  if (values.length === 0) return ''
  if (values.length === 1) return values[0]
  if (values.length === 2) return `${values[0]} and ${values[1]}`
  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`
}

function lowercaseFirstLetter(value: string) {
  if (!value) return value
  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`
}

function buildDirectoryLiveSignals(input: {
  chefs: DirectoryChef[]
  directorySummary: PublicDirectorySummary
}) {
  const { chefs, directorySummary } = input
  const signals = new Set<string>()
  const hasLiveProfiles = directorySummary.totalChefs > 0
  const hasAcceptingProfiles = directorySummary.acceptingChefs > 0
  const hasPartnerCoverage = chefs.some((chef) => chef.partners.length > 0)
  const marketLabels = directorySummary.topStates.slice(0, 2).map((state) => state.label)
  const serviceLabels = directorySummary.topServices
    .slice(0, 2)
    .map((service) => lowercaseFirstLetter(service.label))

  signals.add(
    hasLiveProfiles
      ? 'Early access: chef profiles are live now. Coverage is still expanding.'
      : 'Early access: chef onboarding is underway. Coverage is still expanding.'
  )

  if (hasAcceptingProfiles) {
    signals.add('Some live profiles are already accepting inquiries.')
  }

  if (marketLabels.length > 1) {
    signals.add(`Chef coverage is expanding across ${formatLiveSignalList(marketLabels)}.`)
  } else if (marketLabels.length === 1) {
    signals.add(`Chef coverage is expanding in ${marketLabels[0]}.`)
  } else {
    signals.add('Chef coverage is expanding across active markets.')
  }

  if (hasPartnerCoverage) {
    signals.add('Now onboarding chefs and culinary partners.')
  } else if (serviceLabels.length > 0) {
    signals.add(`Live profiles cover ${formatLiveSignalList(serviceLabels)} services.`)
  }

  return Array.from(signals).slice(0, 4)
}

function parseDirectoryLocationSource(value: string): DirectoryLocationSource {
  if (value === 'current' || value === 'approximate') return value
  return 'manual'
}

function DiscoveryChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-stone-700 bg-stone-950 px-2.5 py-1 text-xs-tight font-medium text-stone-300">
      {label}
    </span>
  )
}

function ChefTile({ chef, visualMode = false }: { chef: DirectoryChef; visualMode?: boolean }) {
  const visiblePartners = chef.partners.slice(0, 3)
  const hasPartners = visiblePartners.length > 0
  const extraCount = chef.partners.length - visiblePartners.length
  const coverage = getChefCoverage(chef)
  const publicLocations = (chef.location_experiences || []).slice(0, 3)
  const featuredLocation = publicLocations[0] ?? null
  const additionalLocations = publicLocations.slice(1)
  const heroImage = chef.discovery.hero_image_url || chef.profile_image_url
  const availabilityLabel = getDiscoveryAvailabilityLabel(chef.discovery)
  const guestCountLabel = getDiscoveryGuestCountLabel(chef.discovery)
  const primaryServices = chef.discovery.service_types.slice(0, 2).map(getDiscoveryServiceTypeLabel)
  const priceRangeLabel = chef.discovery.price_range
    ? getDiscoveryPriceRangeLabel(chef.discovery.price_range)
    : null
  const distanceLabel =
    typeof chef.distance_miles === 'number' ? `${chef.distance_miles} mi away` : null
  const hasInstantBook = chef.booking_enabled && chef.booking_slug
  const primaryHref = hasInstantBook
    ? `/book/${chef.booking_slug}`
    : chef.discovery.accepting_inquiries
      ? `/chef/${chef.slug}/inquire`
      : `/chef/${chef.slug}`
  const primaryLabel = hasInstantBook
    ? chef.booking_model === 'instant_book'
      ? 'Book instantly'
      : 'Book now'
    : chef.discovery.accepting_inquiries
      ? 'Inquire'
      : 'View profile'
  const secondaryHref = featuredLocation
    ? `/chef/${chef.slug}/locations/${featuredLocation.id}`
    : `/chef/${chef.slug}`
  const secondaryLabel = featuredLocation ? 'Explore settings' : 'Profile'
  const featuredLocationPlace = [featuredLocation?.city, featuredLocation?.state]
    .filter(Boolean)
    .join(', ')

  const imageAspectClass = visualMode ? 'aspect-[3/4]' : 'aspect-[4/3]'

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-stone-900 shadow-[0_2px_20px_rgb(0,0,0,0.06)] ring-1 ring-stone-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_40px_rgb(0,0,0,0.25)] hover:ring-brand-600">
      <div
        className={`relative ${imageAspectClass} overflow-hidden bg-gradient-to-br from-brand-100 to-brand-50`}
      >
        {heroImage ? (
          <CloudinaryFetchImage
            src={heroImage}
            alt={chef.display_name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            aspectRatio={4 / 3}
            fit="fill"
            gravity="auto"
            defaultQuality={90}
            maxWidth={1600}
            quality={90}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-7xl font-display text-brand-300">
              {chef.display_name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/70 via-black/35 to-transparent" />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs-tight font-semibold backdrop-blur-sm ${
                chef.discovery.accepting_inquiries
                  ? 'bg-emerald-900/85 text-emerald-300'
                  : 'bg-amber-950/90 text-amber-300'
              }`}
            >
              {availabilityLabel}
            </span>
            {chef.booking_enabled && chef.booking_slug && chef.booking_model === 'instant_book' && (
              <span className="rounded-full bg-emerald-900/85 px-3 py-1 text-xs-tight font-semibold text-emerald-300 backdrop-blur-sm">
                Instant book
              </span>
            )}
            {chef.discovery.review_count > 0 && chef.discovery.avg_rating != null && (
              <span className="rounded-full bg-stone-900/90 px-3 py-1 text-xs-tight font-semibold text-stone-200 backdrop-blur-sm">
                {chef.discovery.avg_rating.toFixed(1)} stars - {chef.discovery.review_count} reviews
              </span>
            )}
          </div>

        </div>

        <div className="absolute inset-x-0 bottom-0 p-5">
          <h2 className="text-xl font-bold text-white drop-shadow-sm">{chef.display_name}</h2>
          {chef.tagline && (
            <p className="mt-0.5 text-sm text-white/85 truncate drop-shadow-sm">{chef.tagline}</p>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        {primaryServices.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {primaryServices.map((label) => (
              <DiscoveryChip key={`service-${label}`} label={label} />
            ))}
          </div>
        )}

        {/* Compact detail line: location, distance, price */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-400">
          {distanceLabel && <span>{distanceLabel}</span>}
          {!distanceLabel && coverage.length > 0 && (
            <span>
              Serves {coverage.slice(0, 2).join(', ')}
              {coverage.length > 2 ? ` +${coverage.length - 2}` : ''}
            </span>
          )}
          {priceRangeLabel && (
            <>
              <span className="text-stone-600">&middot;</span>
              <span>{priceRangeLabel}</span>
            </>
          )}
          {guestCountLabel && (
            <>
              <span className="text-stone-600">&middot;</span>
              <span>{guestCountLabel}</span>
            </>
          )}
        </div>

        {hasPartners && (
          <p className="mt-2 text-xs text-stone-500">
            Cooks at {visiblePartners.map((p) => p.name).join(', ')}
            {extraCount > 0 ? ` +${extraCount} more` : ''}
          </p>
        )}

        {featuredLocation && (
          <div className="mt-4 rounded-2xl border border-stone-800 bg-stone-950/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-400">
                Published setting
              </p>
              <span className="text-[11px] text-stone-500">
                {publicLocations.length} setting{publicLocations.length === 1 ? '' : 's'}
              </span>
            </div>
            <Link
              href={`/chef/${chef.slug}/locations/${featuredLocation.id}`}
              className="mt-2 block text-sm font-semibold text-stone-100 transition-colors hover:text-brand-300"
            >
              {featuredLocation.name}
            </Link>
            <p className="mt-1 text-xs text-stone-400">
              {featuredLocation.partner.name}
              {featuredLocationPlace ? ` · ${featuredLocationPlace}` : ''}
            </p>
            {featuredLocation.best_for.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {featuredLocation.best_for.slice(0, 2).map((value) => (
                  <DiscoveryChip
                    key={`${featuredLocation.id}-${value}`}
                    label={value.replace(/_/g, ' ')}
                  />
                ))}
              </div>
            )}
            {additionalLocations.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-400">
                {additionalLocations.map((location) => (
                  <Link
                    key={location.id}
                    href={`/chef/${chef.slug}/locations/${location.id}`}
                    className="rounded-full border border-stone-800 px-2.5 py-1 transition-colors hover:border-stone-700 hover:text-stone-200"
                  >
                    {location.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1" />

        <div className="mt-5 flex gap-3">
          <TrackedLink
            href={primaryHref}
            analyticsName={
              hasInstantBook
                ? 'directory_instant_book'
                : chef.discovery.accepting_inquiries
                  ? 'directory_inquire'
                  : 'directory_view_profile'
            }
            analyticsProps={{
              chef_slug: chef.slug,
              accepting_inquiries: chef.discovery.accepting_inquiries,
              booking_enabled: chef.booking_enabled,
            }}
            className="flex-1 rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md active:scale-[0.98]"
          >
            {primaryLabel}
          </TrackedLink>
          <TrackedLink
            href={secondaryHref}
            analyticsName={
              featuredLocation ? 'directory_view_location_page' : 'directory_profile_view'
            }
            analyticsProps={{
              chef_slug: chef.slug,
              ...(featuredLocation ? { location_id: featuredLocation.id } : {}),
            }}
            className="rounded-xl border border-stone-700 px-4 py-3 text-center text-sm font-medium text-stone-300 transition-colors hover:bg-stone-800 hover:text-stone-100 hover:border-stone-600"
          >
            {secondaryLabel}
          </TrackedLink>
        </div>
      </div>
    </article>
  )
}

export default async function ChefDirectoryPage({ searchParams }: PageProps) {
  const allChefs = await getDiscoverableChefs()
  const directorySummary = buildPublicDirectorySummary(allChefs)
  const coveragePreview = directorySummary.topCoverage.slice(0, 6)
  const liveSignals = buildDirectoryLiveSignals({ chefs: allChefs, directorySummary })
  const topServiceCounts = new Map(
    directorySummary.topServices.map((service) => [service.label, service.count] as const)
  )
  const featuredPreview = sortDirectoryChefs(allChefs, 'featured').slice(0, 3)
  const stateFacets = buildStateFacets(allChefs)
  const cuisineFacets = buildCuisineFacets(allChefs)
  const serviceTypeFacets = buildServiceTypeFacets(allChefs)
  const partnerTypeFacets = buildPartnerTypeFacets(allChefs)
  const locationExperienceFacets = buildLocationExperienceFacets(allChefs)
  const locationBestForFacets = buildLocationBestForFacets(allChefs)

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
  const sortMode = parseDirectorySortMode(firstParam(searchParams?.sort))
  const visualMode = firstParam(searchParams?.visual) === '1'

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
  const allowedPriceRanges = new Set(['budget', 'mid', 'premium', 'luxury'])
  const priceRangeFilter = allowedPriceRanges.has(requestedPriceRange) ? requestedPriceRange : ''

  const legacyStateLabel =
    stateFacets.find((option) => option.value === legacyStateFilter)?.label ?? null
  const locationInputValue = requestedLocation || legacyStateLabel || ''
  const marketScope = resolvePublicMarketScope({
    explicitLabel: locationInputValue || undefined,
    source: locationInputValue ? 'query' : 'default',
  })
  const seasonalPulse = await getPublicSeasonalMarketPulse({ scope: marketScope })
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

  const activeFilters: string[] = []
  if (query) activeFilters.push(`Query: "${query}"`)
  if (activeLocationLabel) {
    activeFilters.push(
      `Location: ${activeLocationLabel}${
        effectiveLocationSource === 'approximate' ? ' (approximate)' : ''
      }`
    )
  }
  if (selectedCuisineLabel) activeFilters.push(`Cuisine: ${selectedCuisineLabel}`)
  if (selectedServiceTypeLabel) activeFilters.push(`Service: ${selectedServiceTypeLabel}`)
  if (selectedPriceRangeLabel) activeFilters.push(`Price: ${selectedPriceRangeLabel}`)
  if (selectedPartnerTypeLabel) activeFilters.push(`Partner type: ${selectedPartnerTypeLabel}`)
  if (selectedLocationExperienceLabel)
    activeFilters.push(`Setting vibe: ${selectedLocationExperienceLabel}`)
  if (selectedLocationBestForLabel) activeFilters.push(`Best for: ${selectedLocationBestForLabel}`)
  if (acceptingOnly) activeFilters.push('Accepting inquiries only')
  if (visualMode) activeFilters.push('Visual mode')
  if (sortMode !== 'featured') activeFilters.push(`Sort: ${selectedSortLabel}`)

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
  const visualParams = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    const firstValue = firstParam(value)
    if (firstValue) visualParams.set(key, firstValue)
  }
  if (visualMode) {
    visualParams.delete('visual')
  } else {
    visualParams.set('visual', '1')
  }
  const visualToggleHref = `/chefs${visualParams.toString() ? `?${visualParams.toString()}` : ''}`

  return (
    <div className="min-h-screen bg-stone-800">
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
        acceptingOnly={acceptingOnly}
        sortMode={sortMode}
        resultCount={chefs.length}
        totalCount={allChefs.length}
      />
      <ChefHero />

      <section className="mx-auto -mt-8 max-w-6xl px-4 pb-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-stone-700 bg-stone-900/95 p-4 shadow-lg backdrop-blur-sm sm:p-6">
          <DirectoryFiltersForm
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
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-800 pt-4">
            <p className="text-xs leading-relaxed text-stone-500">
              Want a craving-first path across chefs, menus, meal prep, and places?
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={PUBLIC_CONSUMER_DISCOVERY_ENTRY.href}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-stone-700 bg-stone-950 px-4 text-xs font-medium text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-900"
              >
                {PUBLIC_CONSUMER_DISCOVERY_ENTRY.label}
              </Link>
              <Link
                href={visualToggleHref}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-stone-700 bg-stone-950 px-4 text-xs font-medium text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-900"
              >
                {visualMode ? 'Compact cards' : 'Picture-first cards'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
          <div className="rounded-[1.75rem] border border-stone-700 bg-stone-900/70 p-6 shadow-[var(--shadow-card)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
              Browse the live marketplace
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-[-0.04em] text-stone-100">
              Search by city and service type, then compare live profiles.
            </h2>
            <p className="mt-3 text-sm leading-6 text-stone-300 md:text-base">
              This marketplace search moved here from the homepage so the directory can carry the
              browsing workflow while the homepage stays focused on operator proof.
            </p>
            <div className="mt-5">
              <HomepageSearch />
            </div>
            <HomepageLiveSignal messages={liveSignals} className="mt-5" />
          </div>

          <div className="rounded-[1.75rem] border border-stone-700 bg-stone-900/70 p-6 shadow-[var(--shadow-card)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
              Popular starting points
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {MARKETPLACE_COLLECTIONS.map((collection) => (
                <TrackedLink
                  key={collection.label}
                  href={collection.href}
                  analyticsName="directory_marketplace_collection"
                  analyticsProps={{
                    section: 'relocated_home_marketplace',
                    label: collection.label,
                  }}
                  className="rounded-[1.25rem] border border-stone-700 bg-stone-950/70 p-4 transition-colors hover:border-brand-700/40 hover:bg-stone-950"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-stone-100">{collection.label}</p>
                      <p className="mt-1 text-sm leading-6 text-stone-400">
                        {collection.description}
                      </p>
                    </div>
                    <span className="rounded-full border border-stone-700 px-2.5 py-1 text-[11px] font-medium text-stone-300">
                      {topServiceCounts.get(collection.countLabel) ?? 'Live'}
                    </span>
                  </div>
                </TrackedLink>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[1.75rem] border border-stone-700 bg-stone-900/60 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
            How booking works
          </p>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {REQUEST_FLOW_STEPS.map((step) => (
              <div key={step.step} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-700/40 bg-brand-950/30 text-xs font-semibold text-brand-200">
                  {step.step}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-stone-100">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-stone-400">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="rounded-[1.75rem] border border-stone-700 bg-stone-900/70 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
              Best fallback when the right profile is not here yet
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-[-0.04em] text-stone-100">
              Describe your event once, not chef by chef.
            </h2>
            <p className="mt-3 text-sm leading-6 text-stone-300 md:text-base">
              {PUBLIC_MATCHED_CHEF_HELPER}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-stone-800/60 bg-stone-950/70 p-4">
                <p className="text-xs uppercase tracking-wide text-stone-500">Shared carefully</p>
                <p className="mt-2 text-sm font-semibold text-stone-100">Up to 10 chefs</p>
                <p className="mt-2 text-xs leading-relaxed text-stone-400">
                  Open requests are capped so they go to matched chefs instead of a limitless list.
                </p>
              </div>
              <div className="rounded-2xl border border-stone-800/60 bg-stone-950/70 p-4">
                <p className="text-xs uppercase tracking-wide text-stone-500">Reply path</p>
                <p className="mt-2 text-sm font-semibold text-stone-100">
                  Chefs contact you directly
                </p>
                <p className="mt-2 text-xs leading-relaxed text-stone-400">
                  Replies arrive by email, and by phone only if you choose to include it.
                </p>
              </div>
              <div className="rounded-2xl border border-stone-800/60 bg-stone-950/70 p-4">
                <p className="text-xs uppercase tracking-wide text-stone-500">If nothing matches</p>
                <p className="mt-2 text-sm font-semibold text-stone-100">
                  The request still matters
                </p>
                <p className="mt-2 text-xs leading-relaxed text-stone-400">
                  ChefFlow can save the request and follow up when coverage expands in your area.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <TrackedLink
                href={PUBLIC_PRIMARY_CONSUMER_CTA.href}
                analyticsName="directory_primary_cta"
                analyticsProps={{ section: 'request_fallback' }}
                className="inline-flex items-center justify-center rounded-xl gradient-accent px-5 py-3 text-sm font-semibold text-white"
              >
                {PUBLIC_PRIMARY_CONSUMER_CTA.label}
              </TrackedLink>
              <TrackedLink
                href="/how-it-works"
                analyticsName="directory_how_it_works"
                analyticsProps={{ section: 'request_fallback' }}
                className="inline-flex items-center justify-center rounded-xl border border-stone-700 bg-stone-950 px-5 py-3 text-sm font-medium text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-900"
              >
                How matching works
              </TrackedLink>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-stone-700 bg-stone-900/70 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
              Directory shape today
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-[-0.04em] text-stone-100">
              {directorySummary.acceptingChefs} of {directorySummary.totalChefs} listed chefs are
              accepting inquiries.
            </h2>
            <p className="mt-3 text-sm leading-6 text-stone-300">
              {PUBLIC_DIRECTORY_LIVE_COVERAGE_COPY}
            </p>
            {coveragePreview.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {coveragePreview.map((coverage) => (
                  <span
                    key={coverage.label}
                    className="rounded-full border border-stone-700 bg-stone-950/80 px-3 py-1 text-xs text-stone-300"
                  >
                    {coverage.label}
                    {coverage.count > 1 ? ` · ${coverage.count}` : ''}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-4 text-xs leading-relaxed text-stone-500">
              {PUBLIC_MATCHED_CHEF_FOLLOWUP}
            </p>
          </div>
        </div>
      </section>

      <PublicSeasonalMarketPulse pulse={seasonalPulse} />

      {featuredPreview.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
                Featured chefs
              </p>
              <h2 className="mt-3 font-display text-3xl tracking-[-0.04em] text-stone-100">
                Real profiles, not generic placeholders.
              </h2>
              <p className="mt-3 text-sm leading-7 text-stone-300 md:text-base">
                The featured preview moved from the homepage into the directory, where browsing and
                filtering already belong.
              </p>
            </div>
            <TrackedLink
              href="/chefs"
              analyticsName="directory_featured_reset"
              analyticsProps={{ section: 'relocated_featured_chefs' }}
              className="inline-flex items-center justify-center rounded-2xl border border-stone-700 bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-900"
            >
              Browse full marketplace
            </TrackedLink>
          </div>

          <div
            className={
              visualMode
                ? 'mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3'
                : 'mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3'
            }
          >
            {featuredPreview.map((chef) => (
              <ChefTile key={`featured-${chef.id}`} chef={chef} visualMode={visualMode} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-widest text-brand-500">
            Showing {chefs.length} of {allChefs.length} live chef profile
            {allChefs.length !== 1 ? 's' : ''}
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-400">
            Browse the live directory when you see the fit. If your search turns up thin coverage,
            the request path is usually the clearer next step because matched chefs can review the
            event instead of you guessing chef by chef.
          </p>
          {activeFilters.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {activeFilters.map((filterValue) => (
                <span
                  key={filterValue}
                  className="rounded-full border border-stone-600 bg-stone-900 px-3 py-1 text-xs text-stone-300"
                >
                  {filterValue}
                </span>
              ))}
            </div>
          )}
          {locationError && (
            <p className="mt-3 rounded-xl border border-amber-700/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
              {locationError}
            </p>
          )}
        </div>

        {chefs.length === 0 ? (
          <div className="text-center py-24">
            <h2 className="text-xl font-semibold text-stone-300">
              {allChefs.length === 0
                ? 'The directory is accepting nationwide requests'
                : 'No chefs match these filters yet'}
            </h2>
            <p className="mt-2 text-stone-500 max-w-md mx-auto">
              {allChefs.length === 0
                ? PUBLIC_MATCHING_SCOPE_COPY
                : 'These filters did not leave a live fit. Try a broader search, or use Book Now so matched chefs can review the request directly.'}
            </p>
            {allChefs.length > 0 && (
              <p className="mt-1 text-xs text-stone-600">
                Open requests are shared with up to 10 matched chefs, and if none match yet ChefFlow
                can save the request for follow-up.
              </p>
            )}
            <div className="mt-6 flex items-center justify-center gap-4">
              <Link
                href={PUBLIC_PRIMARY_CONSUMER_CTA.href}
                className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                {PUBLIC_PRIMARY_CONSUMER_CTA.label}
              </Link>
              <Link
                href="/chefs"
                className="rounded-xl border border-stone-600 px-5 py-2.5 text-sm font-medium text-stone-300 transition-colors hover:border-stone-500 hover:text-stone-100"
              >
                Reset filters
              </Link>
            </div>
            <p className="mt-4 text-sm text-stone-500">
              Looking for restaurants, caterers, or food trucks instead?{' '}
              <Link
                href="/nearby"
                className="font-medium text-brand-400 transition-colors hover:text-brand-300"
              >
                Browse all food operators nearby
              </Link>
            </p>
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
          <div
            className={
              visualMode
                ? 'grid gap-6 sm:grid-cols-2 xl:grid-cols-3'
                : 'grid gap-8 sm:grid-cols-2 lg:grid-cols-3'
            }
          >
            {chefs.map((chef) => (
              <ChefTile key={chef.id} chef={chef} visualMode={visualMode} />
            ))}
          </div>
        )}

        <div className="mt-16 text-center">
          <div className="mx-auto max-w-lg rounded-2xl border border-stone-700 bg-stone-900 p-6 shadow-sm">
            <p className="text-sm font-semibold text-stone-200">
              Every profile on ChefFlow is reviewed
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-stone-500">
              We review each chef for experience, clear service positioning, and availability before
              listing them in the public directory.
            </p>
          </div>
        </div>

        <PublicSecondaryEntryCluster links={PUBLIC_SECONDARY_ENTRY_CONFIG.directory} theme="dark" />
      </section>
    </div>
  )
}
