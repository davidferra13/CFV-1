export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { TrackedLink } from '@/components/analytics/tracked-link'
import {
  DISCOVERY_SERVICE_TYPE_OPTIONS,
  getDiscoveryCuisineLabel,
  getDiscoveryPriceRangeLabel,
  getDiscoveryServiceTypeLabel,
} from '@/lib/discovery/constants'
import {
  getDiscoveryAvailabilityLabel,
  getDiscoveryGuestCountLabel,
  getDiscoveryLocationLabel,
} from '@/lib/discovery/profile'
import {
  getDiscoverableChefs,
  type DirectoryChef,
  type DirectoryPartner,
} from '@/lib/directory/actions'
import {
  DIRECTORY_SORT_OPTIONS,
  PARTNER_TYPE_LABELS,
  buildCuisineFacets,
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
import { getOptimizedGalleryImage } from '@/lib/images/cloudinary'
import { ChefHero } from './_components/chef-hero'
import { DirectoryFiltersForm } from './_components/directory-filters-form'
import { DirectoryResultsTracker } from './_components/directory-results-tracker'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
const MAX_QUERY_LENGTH = 80
const ZERO_RESULT_SUGGESTIONS = DISCOVERY_SERVICE_TYPE_OPTIONS.filter((option) =>
  ['private_dinner', 'catering', 'meal_prep'].includes(option.value)
)

export const metadata: Metadata = {
  title: 'Hire a Private Chef Near You - ChefFlow Chef Directory',
  description:
    'Search vetted private chefs by cuisine, service type, location, and availability, then send an inquiry in minutes.',
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
  openGraph: {
    title: 'Hire a Private Chef | ChefFlow',
    description: 'Browse vetted chefs by cuisine, service type, and availability.',
    url: `${APP_URL}/chefs`,
    type: 'website',
  },
  alternates: {
    canonical: `${APP_URL}/chefs`,
  },
}

type PageProps = {
  searchParams?: {
    q?: string | string[]
    location?: string | string[]
    locationSource?: string | string[]
    state?: string | string[]
    cuisine?: string | string[]
    serviceType?: string | string[]
    priceRange?: string | string[]
    partnerType?: string | string[]
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

function PartnerPill({ partner }: { partner: DirectoryPartner }) {
  const firstLocation = partner.partner_locations[0]
  const cityState = [firstLocation?.city, firstLocation?.state].filter(Boolean).join(', ')

  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-stone-800 px-3 py-2">
      {partner.cover_image_url ? (
        <Image
          src={partner.cover_image_url}
          alt={partner.name}
          width={32}
          height={32}
          className="h-8 w-8 rounded-md object-cover flex-shrink-0"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-stone-700 flex-shrink-0">
          <svg
            className="h-4 w-4 text-stone-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-stone-200 truncate">{partner.name}</p>
        {cityState && <p className="text-xs-tight text-stone-300 truncate">{cityState}</p>}
      </div>
      <span className="flex-shrink-0 rounded-full bg-stone-700/70 px-2 py-0.5 text-xxs font-medium text-stone-300">
        {PARTNER_TYPE_LABELS[normalizeDirectoryValue(partner.partner_type)] || 'Partner'}
      </span>
    </div>
  )
}

function DiscoveryChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-stone-700 bg-stone-950 px-2.5 py-1 text-xs-tight font-medium text-stone-300">
      {label}
    </span>
  )
}

function ChefTile({ chef }: { chef: DirectoryChef }) {
  const hasPartners = chef.partners.length > 0
  const visiblePartners = chef.partners.slice(0, 3)
  const extraCount = chef.partners.length - visiblePartners.length
  const coverage = getChefCoverage(chef)
  const heroImage = chef.discovery.hero_image_url || chef.profile_image_url
  const availabilityLabel = getDiscoveryAvailabilityLabel(chef.discovery)
  const guestCountLabel = getDiscoveryGuestCountLabel(chef.discovery)
  const locationLabel = getDiscoveryLocationLabel(chef.discovery)
  const primaryCuisines = chef.discovery.cuisine_types.slice(0, 2).map(getDiscoveryCuisineLabel)
  const primaryServices = chef.discovery.service_types.slice(0, 2).map(getDiscoveryServiceTypeLabel)
  const priceRangeLabel = chef.discovery.price_range
    ? getDiscoveryPriceRangeLabel(chef.discovery.price_range)
    : null
  const distanceLabel =
    typeof chef.distance_miles === 'number' ? `${chef.distance_miles} mi away` : null
  const summary = chef.discovery.highlight_text || chef.bio
  const primaryHref = chef.discovery.accepting_inquiries
    ? `/chef/${chef.slug}/inquire`
    : `/chef/${chef.slug}`
  const primaryLabel = chef.discovery.accepting_inquiries ? 'Inquire' : 'View profile'

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-stone-900 shadow-[0_2px_20px_rgb(0,0,0,0.06)] ring-1 ring-stone-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_40px_rgb(0,0,0,0.25)] hover:ring-brand-600">
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-brand-100 to-brand-50">
        {heroImage ? (
          <Image
            src={getOptimizedGalleryImage(heroImage, 800, 600)}
            alt={chef.display_name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
            {chef.discovery.review_count > 0 && chef.discovery.avg_rating != null && (
              <span className="rounded-full bg-stone-900/90 px-3 py-1 text-xs-tight font-semibold text-stone-200 backdrop-blur-sm">
                {chef.discovery.avg_rating.toFixed(1)} stars - {chef.discovery.review_count} reviews
              </span>
            )}
          </div>

          {chef.is_founder && (
            <div className="rounded-full bg-stone-900/90 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-brand-400 shadow-sm">
              Featured
            </div>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5">
          <h2 className="text-xl font-bold text-white drop-shadow-sm">{chef.display_name}</h2>
          {chef.tagline && (
            <p className="mt-0.5 text-sm text-white/85 truncate drop-shadow-sm">{chef.tagline}</p>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        {summary && (
          <p className="text-sm leading-relaxed text-stone-300 line-clamp-3">{summary}</p>
        )}

        {(primaryCuisines.length > 0 || primaryServices.length > 0) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {primaryCuisines.map((label) => (
              <DiscoveryChip key={`cuisine-${label}`} label={label} />
            ))}
            {primaryServices.map((label) => (
              <DiscoveryChip key={`service-${label}`} label={label} />
            ))}
          </div>
        )}

        {(locationLabel || guestCountLabel || priceRangeLabel || distanceLabel) && (
          <div className="mt-4 grid gap-2 text-xs text-stone-400 sm:grid-cols-2">
            {locationLabel && (
              <div className="rounded-xl border border-stone-800 bg-stone-950 px-3 py-2">
                <p className="font-medium text-stone-200">Service area</p>
                <p className="mt-1">{locationLabel}</p>
              </div>
            )}
            {distanceLabel && (
              <div className="rounded-xl border border-stone-800 bg-stone-950 px-3 py-2">
                <p className="font-medium text-stone-200">Distance</p>
                <p className="mt-1">{distanceLabel}</p>
              </div>
            )}
            {guestCountLabel && (
              <div className="rounded-xl border border-stone-800 bg-stone-950 px-3 py-2">
                <p className="font-medium text-stone-200">Guest range</p>
                <p className="mt-1">{guestCountLabel}</p>
              </div>
            )}
            {priceRangeLabel && (
              <div className="rounded-xl border border-stone-800 bg-stone-950 px-3 py-2">
                <p className="font-medium text-stone-200">Positioning</p>
                <p className="mt-1">{priceRangeLabel}</p>
              </div>
            )}
          </div>
        )}

        {coverage.length > 0 && (
          <p className="mt-3 text-xs text-stone-500">
            Serves {coverage.slice(0, 2).join(', ')}
            {coverage.length > 2 ? ` +${coverage.length - 2} more` : ''}
          </p>
        )}

        {hasPartners && (
          <div className="mt-4">
            <p className="mb-2 text-xs-tight font-semibold uppercase tracking-wider text-stone-300">
              Where I Cook
            </p>
            <div className="space-y-1.5">
              {visiblePartners.map((partner) => (
                <PartnerPill key={partner.id} partner={partner} />
              ))}
              {extraCount > 0 && (
                <p className="text-center text-xs-tight text-stone-300">
                  + {extraCount} more venue{extraCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex-1" />

        <div className="mt-5 flex gap-3">
          <TrackedLink
            href={primaryHref}
            analyticsName={
              chef.discovery.accepting_inquiries ? 'directory_inquire' : 'directory_view_profile'
            }
            analyticsProps={{
              chef_slug: chef.slug,
              accepting_inquiries: chef.discovery.accepting_inquiries,
            }}
            className="flex-1 rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md active:scale-[0.98]"
          >
            {primaryLabel}
          </TrackedLink>
          <TrackedLink
            href={chef.discovery.accepting_inquiries ? `/chef/${chef.slug}` : '/contact'}
            analyticsName={
              chef.discovery.accepting_inquiries ? 'directory_profile_view' : 'directory_contact'
            }
            analyticsProps={{ chef_slug: chef.slug }}
            className="rounded-xl border border-stone-700 px-4 py-3 text-center text-sm font-medium text-stone-300 transition-colors hover:bg-stone-800 hover:text-stone-100 hover:border-stone-600"
          >
            {chef.discovery.accepting_inquiries ? 'Profile' : 'Contact'}
          </TrackedLink>
        </div>
      </div>
    </article>
  )
}

export default async function ChefDirectoryPage({ searchParams }: PageProps) {
  const allChefs = await getDiscoverableChefs()
  const stateFacets = buildStateFacets(allChefs)
  const cuisineFacets = buildCuisineFacets(allChefs)
  const serviceTypeFacets = buildServiceTypeFacets(allChefs)
  const partnerTypeFacets = buildPartnerTypeFacets(allChefs)

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
  const requestedPriceRange = normalizeDirectoryValue(firstParam(searchParams?.priceRange))
  const requestedPartnerType = normalizeDirectoryValue(firstParam(searchParams?.partnerType))
  const acceptingOnly = parseDirectoryBooleanParam(firstParam(searchParams?.accepting))
  const sortMode = parseDirectorySortMode(firstParam(searchParams?.sort))

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
  const allowedPriceRanges = new Set(['budget', 'mid', 'premium', 'luxury'])
  const priceRangeFilter = allowedPriceRanges.has(requestedPriceRange) ? requestedPriceRange : ''

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
    priceRangeFilter,
    partnerTypeFilter,
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
  if (acceptingOnly) activeFilters.push('Accepting inquiries only')
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
            priceRangeFilter={priceRangeFilter}
            partnerTypeFilter={partnerTypeFilter}
            acceptingOnly={acceptingOnly}
            sortMode={sortMode}
            maxQueryLength={MAX_QUERY_LENGTH}
            cuisineOptions={cuisineFacets}
            serviceTypeOptions={serviceTypeFacets}
            partnerTypeOptions={partnerTypeFacets}
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-widest text-brand-500">
            Showing {chefs.length} of {allChefs.length} vetted chef
            {allChefs.length !== 1 ? 's' : ''}
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
                ? 'The directory is opening city by city'
                : 'No chefs match these filters yet'}
            </h2>
            <p className="mt-2 text-stone-500 max-w-md mx-auto">
              {allChefs.length === 0
                ? 'Tell us what you are planning and ChefFlow can help source the right chef while the public directory expands.'
                : 'Try a broader occasion, reset the filters, or jump into a high-intent category below.'}
            </p>
            <div className="mt-6 flex items-center justify-center gap-4">
              <Link
                href="/chefs"
                className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Reset filters
              </Link>
              <Link
                href="/contact"
                className="rounded-xl border border-stone-600 px-5 py-2.5 text-sm font-medium text-stone-300 transition-colors hover:border-stone-500 hover:text-stone-100"
              >
                Contact ChefFlow
              </Link>
            </div>
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
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {chefs.map((chef) => (
              <ChefTile key={chef.id} chef={chef} />
            ))}
          </div>
        )}

        <div className="mt-16 text-center">
          <div className="mx-auto max-w-lg rounded-2xl border border-stone-700 bg-stone-900 p-6 shadow-sm">
            <p className="text-sm font-semibold text-stone-200">Every chef on ChefFlow is vetted</p>
            <p className="mt-1.5 text-xs leading-relaxed text-stone-500">
              We only list experienced chefs with clear service positioning and reviewable
              availability.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
