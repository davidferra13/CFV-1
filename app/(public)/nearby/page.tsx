import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth/get-user'
import { BreadcrumbJsonLd, JsonLd } from '@/components/seo/json-ld'
import {
  getDirectoryListings,
  getDirectoryStats,
  resolveDirectoryLocationQuery,
  type DirectoryStats,
  type DiscoverFilters,
  type PaginatedListings,
} from '@/lib/discover/actions'
import {
  getBusinessTypeLabel,
  getCuisineLabel,
  getStateName,
  normalizeUsStateCode,
} from '@/lib/discover/constants'
import {
  buildNearbyBrowseBreadcrumbItems,
  buildNearbyBrowseCollectionJsonLd,
  buildNearbyBrowseMetadata,
  buildNearbyBrowseSeoBase,
  evaluateNearbyBrowseSeo,
  type NearbyBrowseSearchParams,
} from '@/lib/discover/nearby-browse-seo'
import {
  buildNearbyBrowseFallbackActions,
  dedupeNearbyFallbackActions,
  type NearbyFallbackAction,
} from '@/lib/discover/nearby-fallbacks'
import {
  hasNearbyCoordinates,
  normalizeNearbyLocationInput,
  normalizeNearbyRadius,
} from '@/lib/discover/nearby-search'
import {
  PUBLIC_CONSUMER_DISCOVERY_ENTRY,
  PUBLIC_PRIMARY_CONSUMER_CTA,
  PUBLIC_SECONDARY_CONSUMER_CTA,
} from '@/lib/public/public-surface-config'
import {
  NEARBY_LOW_DENSITY_WAITLIST_SOURCE,
  NEARBY_NO_RESULTS_WAITLIST_SOURCE,
} from '@/lib/directory/waitlist-shared'
import { PublicSecondaryEntryCluster } from '@/components/public/public-secondary-entry-cluster'
import { PUBLIC_SECONDARY_ENTRY_CONFIG } from '@/lib/public/public-secondary-entry-config'
import { NearbyBrowseHubs } from './_components/nearby-browse-hubs'
import { NearbyCollectionModules } from './_components/nearby-collection-modules'
import { NearbyFallbackActions } from './_components/nearby-fallback-actions'
import { ListingCard } from './_components/listing-card'
import type { DirectoryFavoriteMode } from './_components/directory-favorite-button'
import { NearbyFilters } from './_components/nearby-filters'
import { NearbyMapDiscovery } from './_components/nearby-map-discovery-dynamic'
import { NearbyTrustGuide } from './_components/nearby-trust-guide'
import { UnmetDemandCapture } from './_components/unmet-demand-capture'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

type PageProps = {
  searchParams?: Promise<NearbyBrowseSearchParams> | NearbyBrowseSearchParams
}

type UnmetDemandCaptureDefaults = {
  city: string
  state: string
  businessType: string
  cuisine: string
  searchQuery: string
  locationQuery: string
  locationLabel: string
  radiusMiles: number | null
  userLat: number | null
  userLon: number | null
  currentMatchCount: number
}

function firstParam(value?: string | string[]): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const resolvedSearchParams = ((await searchParams) ?? {}) as NearbyBrowseSearchParams
  const seoBase = buildNearbyBrowseSeoBase(resolvedSearchParams)

  if (seoBase.isLanding || seoBase.hasUnsupportedFilters || !seoBase.hasMeaningfulFilters) {
    return buildNearbyBrowseMetadata({ appUrl: APP_URL, base: seoBase })
  }

  const result = await getDirectoryListings({
    businessType: seoBase.businessType ?? undefined,
    cuisine: seoBase.cuisine ?? undefined,
    state: seoBase.stateCode ?? undefined,
    city: seoBase.city ?? undefined,
    page: 1,
  })

  return buildNearbyBrowseMetadata({
    appUrl: APP_URL,
    base: seoBase,
    evaluation: evaluateNearbyBrowseSeo(seoBase, result.total),
  })
}

function nearbyHref(params: URLSearchParams) {
  const queryString = params.toString()
  return queryString ? `/nearby?${queryString}` : '/nearby'
}

function CityLinkCluster({ stats, limit = 8 }: { stats: DirectoryStats; limit?: number }) {
  if (stats.topCities.length === 0) return null

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {stats.topCities.slice(0, limit).map((city) => (
        <Link
          key={`${city.city}-${city.state}`}
          href={`/nearby?state=${city.state}&city=${encodeURIComponent(city.city)}`}
          className="rounded-full border border-stone-700/60 bg-stone-950/70 px-3.5 py-1.5 text-xs font-medium text-stone-300 transition-colors hover:border-brand-600/50 hover:text-stone-100"
        >
          {city.city}, {city.state}
        </Link>
      ))}
    </div>
  )
}

function LowDensityBanner() {
  return (
    <div className="mb-6 rounded-2xl border border-brand-700/30 bg-brand-950/20 p-4">
      <p className="text-sm font-semibold text-stone-100">Coverage is still selective here.</p>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-400">
        Nearby does not pad the page with filler matches. The landing page still shows every live
        card we can stand behind, then leans on the curated collections and browse hubs above so
        visitors can jump into stronger city, category, and city-plus-category paths without
        starting from scratch.
      </p>
    </div>
  )
}

function LandingEmptyState({ captureDefaults }: { captureDefaults: UnmetDemandCaptureDefaults }) {
  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-900/45 p-6">
      <h2 className="text-2xl font-semibold text-stone-100">No live cards here yet.</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-400">
        This page avoids weak filler entries. Nearby only surfaces cards once there is enough
        public-source or owner-backed information to make browsing useful, so the better next step
        is to use the curated collections and browse hubs above or add the missing business.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/nearby/submit"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Add a business
        </Link>
        <Link
          href={PUBLIC_PRIMARY_CONSUMER_CTA.href}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-700 px-4 text-sm font-medium text-stone-300 transition-colors hover:border-stone-600 hover:bg-stone-800 hover:text-stone-100"
        >
          {PUBLIC_PRIMARY_CONSUMER_CTA.label}
        </Link>
      </div>

      <UnmetDemandCapture
        source={NEARBY_NO_RESULTS_WAITLIST_SOURCE}
        defaultCity={captureDefaults.city}
        defaultState={captureDefaults.state}
        defaultBusinessType={captureDefaults.businessType}
        defaultCuisine={captureDefaults.cuisine}
        searchQuery={captureDefaults.searchQuery}
        locationQuery={captureDefaults.locationQuery}
        locationLabel={captureDefaults.locationLabel}
        radiusMiles={captureDefaults.radiusMiles}
        userLat={captureDefaults.userLat}
        userLon={captureDefaults.userLon}
        currentMatchCount={captureDefaults.currentMatchCount}
        className="mt-8"
      />
    </div>
  )
}

function SparseResultsBanner({ actions }: { actions: NearbyFallbackAction[] }) {
  if (actions.length === 0) return null

  return (
    <NearbyFallbackActions
      eyebrow="Still Thin"
      title="Small result set, still intentional."
      description="These are the current cards that match this filter set. Keep the same intent if the list is useful, or widen the market, add the missing business, or switch paths without starting over."
      actions={actions}
      className="mb-6"
    />
  )
}

function FilteredEmptyState({
  stats,
  fallbackActions,
  emptyStateMessage,
  captureDefaults,
  showCapture,
}: {
  stats: DirectoryStats
  fallbackActions: NearbyFallbackAction[]
  emptyStateMessage: string
  captureDefaults: UnmetDemandCaptureDefaults
  showCapture: boolean
}) {
  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-900/45 p-6 text-center">
      <h2 className="text-xl font-semibold text-stone-100">No listings match these filters.</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-stone-400">
        {emptyStateMessage}
      </p>
      <NearbyFallbackActions
        eyebrow="No Dead Ends"
        title="Use a broader path that already has coverage."
        description="Nearby only keeps live, supportable cards on the page. The fastest next move is to widen geography or category, add the missing business, or switch into a stronger path."
        actions={fallbackActions}
        className="mt-8 text-left"
      />
      {stats.topCities.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Try a city that already has listings
          </p>
          <CityLinkCluster stats={stats} limit={8} />
        </div>
      )}

      {showCapture && (
        <UnmetDemandCapture
          source={NEARBY_NO_RESULTS_WAITLIST_SOURCE}
          defaultCity={captureDefaults.city}
          defaultState={captureDefaults.state}
          defaultBusinessType={captureDefaults.businessType}
          defaultCuisine={captureDefaults.cuisine}
          searchQuery={captureDefaults.searchQuery}
          locationQuery={captureDefaults.locationQuery}
          locationLabel={captureDefaults.locationLabel}
          radiusMiles={captureDefaults.radiusMiles}
          userLat={captureDefaults.userLat}
          userLon={captureDefaults.userLon}
          currentMatchCount={captureDefaults.currentMatchCount}
          className="mt-8 text-left"
        />
      )}
    </div>
  )
}

function StateGrid({ stats }: { stats: DirectoryStats }) {
  if (stats.totalListings === 0) return null

  return (
    <div className="space-y-10">
      <details className="group">
        <summary className="cursor-pointer select-none text-sm font-semibold uppercase tracking-wider text-stone-500 transition-colors hover:text-stone-300">
          Browse by location ({stats.states.length} states)
          <span className="ml-1.5 inline-block transition-transform group-open:rotate-90">
            &#9654;
          </span>
        </summary>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {stats.states.map((state) => (
            <Link
              key={state.state}
              href={`/nearby?state=${state.state}`}
              className="group/state flex flex-col items-center rounded-xl border border-stone-800 bg-stone-900/50 px-2 py-3 text-center transition-all hover:border-brand-600/50 hover:bg-stone-800/50"
            >
              <span className="text-lg font-bold text-stone-200 group-hover/state:text-brand-400">
                {state.state}
              </span>
              <span className="mt-0.5 text-xxs text-stone-500">{state.count.toLocaleString()}</span>
            </Link>
          ))}
        </div>
      </details>

      {stats.topCities.length > 0 && (
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-500">
            Popular cities
          </h2>
          <div className="flex flex-wrap gap-2">
            {stats.topCities.slice(0, 12).map((city) => (
              <Link
                key={`${city.city}-${city.state}`}
                href={`/nearby?state=${city.state}&city=${encodeURIComponent(city.city)}`}
                className="rounded-full border border-stone-700/60 bg-stone-900/60 px-3.5 py-1.5 text-xs font-medium text-stone-400 transition-colors hover:border-brand-600/50 hover:text-stone-200"
              >
                {city.city}, {city.state}
                <span className="ml-1.5 text-stone-600">{city.count.toLocaleString()}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-amber-800/30 bg-amber-950/10 p-5 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-stone-200">Gather your people.</p>
          <p className="mt-1 text-xs text-stone-400">
            Dinner Circles let you coordinate group meals and join food conversations near you.
          </p>
        </div>
        <Link
          href="/hub/circles"
          className="mt-3 inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-500 sm:mt-0 sm:ml-4 sm:flex-shrink-0"
        >
          Browse Circles
        </Link>
      </div>
    </div>
  )
}

function Pagination({
  page,
  totalPages,
  total,
  searchParams,
}: {
  page: number
  totalPages: number
  total: number
  searchParams: URLSearchParams
}) {
  if (totalPages <= 1) return null

  const start = (page - 1) * 24 + 1
  const end = Math.min(page * 24, total)

  function pageUrl(nextPage: number) {
    const params = new URLSearchParams(searchParams)
    if (nextPage > 1) {
      params.set('page', String(nextPage))
    } else {
      params.delete('page')
    }
    return nearbyHref(params)
  }

  return (
    <div className="mt-8 flex items-center justify-between">
      <p className="text-xs text-stone-500">
        Showing {start.toLocaleString()} - {end.toLocaleString()} of {total.toLocaleString()}
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={pageUrl(page - 1)}
            className="rounded-lg border border-stone-700 px-4 py-2 text-xs font-medium text-stone-300 transition-colors hover:border-stone-600 hover:bg-stone-800"
          >
            Previous
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={pageUrl(page + 1)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  )
}

function ResultsSection({
  result,
  activeFilterLabels,
  currentParams,
  cuisineFilter,
  isLanding,
  stats,
  emptyStateMessage,
  fallbackActions,
  locationContextText,
  captureDefaults,
  showCapture,
  favoriteMode,
  visualMode,
  mapMode,
}: {
  result: PaginatedListings
  activeFilterLabels: string[]
  currentParams: URLSearchParams
  cuisineFilter?: string
  isLanding: boolean
  stats: DirectoryStats
  emptyStateMessage: string
  fallbackActions: NearbyFallbackAction[]
  locationContextText: string | null
  captureDefaults: UnmetDemandCaptureDefaults
  showCapture: boolean
  favoriteMode: DirectoryFavoriteMode
  visualMode: boolean
  mapMode: boolean
}) {
  if (result.listings.length === 0) {
    return isLanding ? (
      <LandingEmptyState captureDefaults={captureDefaults} />
    ) : (
      <FilteredEmptyState
        stats={stats}
        fallbackActions={fallbackActions}
        emptyStateMessage={emptyStateMessage}
        captureDefaults={captureDefaults}
        showCapture={showCapture}
      />
    )
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          {isLanding ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Live Right Now
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-stone-100">
                Browse current public listings without typing anything.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-400">
                {result.total.toLocaleString()} live listing{result.total === 1 ? '' : 's'} are
                available in Nearby right now. The curated collections and browse hubs above act as
                guide rails first, then this raw feed preserves the full default browse with the
                same trust and freshness cues on every card.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-stone-300">
                {locationContextText
                  ? `${result.total.toLocaleString()} listing${result.total !== 1 ? 's' : ''} ${locationContextText}`
                  : `${result.total.toLocaleString()} listing${result.total !== 1 ? 's' : ''}`}
                {activeFilterLabels.length > 0 && (
                  <span className="text-stone-500"> matching {activeFilterLabels.join(', ')}</span>
                )}
              </p>
              <p className="mt-1 text-sm text-stone-500">
                {locationContextText
                  ? locationContextText.startsWith('within ')
                    ? 'Distances are calculated from the active location search and update when the radius changes. Trust and freshness cues remain visible as you widen or tighten the radius.'
                    : 'Listings are currently ordered by distance from the active location search, with trust and freshness cues preserved on every card.'
                  : 'Adjust the filters above to broaden or narrow the directory. Trust states and freshness notes stay visible so the page is easier to judge at a glance.'}
              </p>
            </>
          )}
        </div>

        {isLanding && (
          <Link
            href="/nearby/submit"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-stone-700 px-4 text-sm font-medium text-stone-300 transition-colors hover:border-stone-600 hover:bg-stone-800 hover:text-stone-100"
          >
            Add a missing business
          </Link>
        )}
      </div>

      <NearbyTrustGuide listings={result.listings} />

      {isLanding && result.total < 18 && (
        <>
          <LowDensityBanner />
          {showCapture && (
            <UnmetDemandCapture
              source={NEARBY_LOW_DENSITY_WAITLIST_SOURCE}
              defaultCity={captureDefaults.city}
              defaultState={captureDefaults.state}
              defaultBusinessType={captureDefaults.businessType}
              defaultCuisine={captureDefaults.cuisine}
              searchQuery={captureDefaults.searchQuery}
              locationQuery={captureDefaults.locationQuery}
              locationLabel={captureDefaults.locationLabel}
              radiusMiles={captureDefaults.radiusMiles}
              userLat={captureDefaults.userLat}
              userLon={captureDefaults.userLon}
              currentMatchCount={captureDefaults.currentMatchCount}
              className="mb-8"
            />
          )}
        </>
      )}
      {!isLanding && result.total < 6 && (
        <>
          <SparseResultsBanner actions={fallbackActions} />
          {showCapture && (
            <UnmetDemandCapture
              source={NEARBY_LOW_DENSITY_WAITLIST_SOURCE}
              defaultCity={captureDefaults.city}
              defaultState={captureDefaults.state}
              defaultBusinessType={captureDefaults.businessType}
              defaultCuisine={captureDefaults.cuisine}
              searchQuery={captureDefaults.searchQuery}
              locationQuery={captureDefaults.locationQuery}
              locationLabel={captureDefaults.locationLabel}
              radiusMiles={captureDefaults.radiusMiles}
              userLat={captureDefaults.userLat}
              userLon={captureDefaults.userLon}
              currentMatchCount={captureDefaults.currentMatchCount}
              className="mb-8"
            />
          )}
        </>
      )}

      {mapMode ? (
        <NearbyMapDiscovery
          listings={result.listings}
          total={result.total}
          currentParams={currentParams.toString()}
          favoriteMode={favoriteMode}
          locationContextText={locationContextText}
        />
      ) : (
        <div
          className={
            visualMode
              ? 'grid gap-6 sm:grid-cols-2 xl:grid-cols-3'
              : 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3'
          }
        >
          {result.listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              favoriteMode={favoriteMode}
              visualMode={visualMode}
            />
          ))}
        </div>
      )}

      {!mapMode && (
        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          total={result.total}
          searchParams={currentParams}
        />
      )}

      <div className="mt-10 rounded-xl border border-amber-800/30 bg-amber-950/10 p-5 text-center">
        <p className="text-sm font-semibold text-stone-200">
          {cuisineFilter
            ? `Love ${getCuisineLabel(cuisineFilter)} food? Start a circle.`
            : 'Found something good? Gather your people.'}
        </p>
        <p className="mx-auto mt-1.5 max-w-md text-xs text-stone-400">
          Dinner Circles let you coordinate group meals, share recommendations, and keep everyone on
          the same page.
        </p>
        <Link
          href={
            cuisineFilter
              ? `/hub/circles?topic=${encodeURIComponent(cuisineFilter)}`
              : '/hub/circles'
          }
          className="mt-3 inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-500"
        >
          {cuisineFilter
            ? `Browse ${getCuisineLabel(cuisineFilter)} circles`
            : 'Browse Dinner Circles'}
        </Link>
      </div>
    </>
  )
}

export default async function NearbyPage({ searchParams }: PageProps) {
  const resolvedSearchParams = ((await searchParams) ?? {}) as NearbyBrowseSearchParams
  const user = await getCurrentUser()
  const favoriteMode: DirectoryFavoriteMode =
    user?.role === 'client' ? 'active' : user ? 'hidden' : 'signin'
  const query = firstParam(resolvedSearchParams.q)
  const businessType = firstParam(resolvedSearchParams.type)
  const cuisine = firstParam(resolvedSearchParams.cuisine)
  const state = firstParam(resolvedSearchParams.state)
  const city = firstParam(resolvedSearchParams.city)
  const priceRange = firstParam(resolvedSearchParams.price)
  const locationQuery = normalizeNearbyLocationInput(firstParam(resolvedSearchParams.location))
  const radiusRaw = firstParam(resolvedSearchParams.radius)
  const latRaw = firstParam(resolvedSearchParams.lat)
  const lonRaw = firstParam(resolvedSearchParams.lon)
  const pageParam = parseInt(firstParam(resolvedSearchParams.page), 10) || 1
  const visualMode =
    firstParam((resolvedSearchParams as Record<string, string | string[]>).visual) === '1'
  const mapMode =
    firstParam((resolvedSearchParams as Record<string, string | string[]>).map) === '1'
  const seoBase = buildNearbyBrowseSeoBase(resolvedSearchParams)
  const latParam = parseFloat(latRaw)
  const lonParam = parseFloat(lonRaw)
  const hasCoordinateLocation = hasNearbyCoordinates(latParam, lonParam)
  const requestedRadiusMiles = radiusRaw ? normalizeNearbyRadius(radiusRaw) : null

  let activeLocation: {
    displayLabel: string
    lat: number
    lon: number
    city: string | null
    state: string | null
  } | null = null
  let locationError: string | null = null

  if (locationQuery) {
    if (hasCoordinateLocation) {
      activeLocation = {
        displayLabel: locationQuery,
        lat: latParam,
        lon: lonParam,
        city: null,
        state: null,
      }
    } else {
      const locationResult = await resolveDirectoryLocationQuery(locationQuery)
      if (locationResult.data) {
        activeLocation = {
          displayLabel: locationResult.data.displayLabel,
          lat: locationResult.data.lat,
          lon: locationResult.data.lon,
          city: locationResult.data.city,
          state: locationResult.data.state,
        }
      } else if (locationResult.error) {
        locationError =
          locationResult.error === 'Geocoding service unavailable'
            ? 'Location search is temporarily unavailable. Try a ZIP code or use current location.'
            : 'Could not find that location. Try a ZIP code or city, state.'
      }
    }
  } else if (hasCoordinateLocation) {
    activeLocation = {
      displayLabel: 'your current location',
      lat: latParam,
      lon: lonParam,
      city: null,
      state: null,
    }
  }

  const hasUserLocation = activeLocation !== null
  const usingBrowserLocation = hasCoordinateLocation && !locationQuery

  const hasFilters =
    query ||
    businessType ||
    cuisine ||
    state ||
    priceRange ||
    city ||
    locationQuery ||
    hasUserLocation
  const isLanding = !hasFilters

  const filters: DiscoverFilters = {
    query: query || undefined,
    businessType: businessType || undefined,
    cuisine: cuisine || undefined,
    state: state || undefined,
    city: city || undefined,
    priceRange: priceRange || undefined,
    page: pageParam,
    radiusMiles: hasUserLocation ? (requestedRadiusMiles ?? undefined) : undefined,
    userLat: hasUserLocation ? activeLocation?.lat : undefined,
    userLon: hasUserLocation ? activeLocation?.lon : undefined,
  }

  const shouldBlockResultsForInvalidLocation = Boolean(locationQuery) && !hasUserLocation

  const [stats, result] = await Promise.all([
    getDirectoryStats(),
    shouldBlockResultsForInvalidLocation
      ? Promise.resolve({
          listings: [],
          total: 0,
          page: pageParam,
          totalPages: 1,
        } satisfies PaginatedListings)
      : getDirectoryListings(filters, { includeViewerState: favoriteMode === 'active' }),
  ])

  const activeFilterLabels: string[] = []
  if (query) activeFilterLabels.push(`"${query}"`)
  if (businessType) activeFilterLabels.push(getBusinessTypeLabel(businessType))
  if (cuisine) activeFilterLabels.push(getCuisineLabel(cuisine))
  if (state) activeFilterLabels.push(getStateName(state))
  if (city) activeFilterLabels.push(city)
  if (priceRange) activeFilterLabels.push(priceRange)
  if (hasUserLocation && activeLocation) {
    activeFilterLabels.push(
      requestedRadiusMiles != null
        ? `within ${requestedRadiusMiles} miles of ${activeLocation.displayLabel}`
        : `near ${activeLocation.displayLabel}`
    )
  }

  const currentParams = new URLSearchParams()
  if (query) currentParams.set('q', query)
  if (businessType) currentParams.set('type', businessType)
  if (cuisine) currentParams.set('cuisine', cuisine)
  if (state) currentParams.set('state', state)
  if (city) currentParams.set('city', city)
  if (priceRange) currentParams.set('price', priceRange)
  if (visualMode) currentParams.set('visual', '1')
  if (mapMode) currentParams.set('map', '1')
  if (locationQuery) currentParams.set('location', locationQuery)
  if (requestedRadiusMiles != null) {
    currentParams.set('radius', String(requestedRadiusMiles))
  }
  if (hasCoordinateLocation) {
    currentParams.set('lat', latRaw)
    currentParams.set('lon', lonRaw)
  }
  const visualParams = new URLSearchParams(currentParams)
  if (visualMode) {
    visualParams.delete('visual')
  } else {
    visualParams.set('visual', '1')
  }
  const visualToggleHref = nearbyHref(visualParams)
  const mapParams = new URLSearchParams(currentParams)
  if (mapMode) {
    mapParams.delete('map')
  } else {
    mapParams.set('map', '1')
    mapParams.delete('page')
  }
  const mapToggleHref = nearbyHref(mapParams)

  const heroTitle = state ? `Nearby Food in ${getStateName(state)}` : 'Nearby'
  const heroSubtitle =
    hasUserLocation && activeLocation
      ? requestedRadiusMiles != null
        ? `Browse live listings within ${requestedRadiusMiles} miles of ${activeLocation.displayLabel}.`
        : `Browse live listings sorted by distance from ${activeLocation.displayLabel}.`
      : state && city
        ? `Browse live listings in ${city}, ${getStateName(state)}.`
        : state
          ? `Browse live listings across ${getStateName(state)}.`
          : 'Find food near you. Restaurants, private chefs, caterers, food trucks, bakeries, and more.'

  const seoEvaluation = evaluateNearbyBrowseSeo(seoBase, result.total)
  const breadcrumbItems = buildNearbyBrowseBreadcrumbItems({ appUrl: APP_URL, base: seoBase })
  const shouldRenderCollectionJsonLd = pageParam === 1 && seoEvaluation.shouldRenderItemList
  const showChefMatchCta = businessType === 'private_chef'
  const broadeningActions = buildNearbyBrowseFallbackActions({
    filters: {
      query,
      businessType,
      cuisine,
      state,
      city,
      priceRange,
      locationQuery,
      radiusMiles: requestedRadiusMiles,
      lat: hasCoordinateLocation ? latRaw : null,
      lon: hasCoordinateLocation ? lonRaw : null,
    },
    stats,
  })
  const fallbackActions = dedupeNearbyFallbackActions(
    [
      ...broadeningActions,
      {
        href: '/nearby/submit',
        label: 'Add a business',
        description: 'Know the missing operator? Submit it so this market can get stronger.',
        variant: 'secondary',
      },
      ...(showChefMatchCta
        ? [
            {
              href: PUBLIC_PRIMARY_CONSUMER_CTA.href,
              label: PUBLIC_PRIMARY_CONSUMER_CTA.label,
              description:
                'Use the chef-booking path for a direct private-chef request instead of waiting on thin browse coverage.',
              variant: 'primary' as const,
            },
          ]
        : []),
    ],
    4
  )
  const emptyStateMessage = showChefMatchCta
    ? 'This slice of Nearby does not have current browseable private-chef cards yet. Broaden the browse, add the missing chef, or switch into the chef-booking path for a direct match.'
    : 'This filter slice does not have current browseable listings yet. Nearby avoids padding the directory with weak matches, so the better next step is to widen the browse or add the missing business.'
  const locationContextText =
    hasUserLocation && activeLocation
      ? requestedRadiusMiles != null
        ? `within ${requestedRadiusMiles} miles of ${activeLocation.displayLabel}`
        : `sorted by distance from ${activeLocation.displayLabel}`
      : null
  const captureDefaults: UnmetDemandCaptureDefaults = {
    city: city || activeLocation?.city || '',
    state: normalizeUsStateCode(state) || activeLocation?.state || '',
    businessType: businessType || '',
    cuisine: cuisine || '',
    searchQuery: query || '',
    locationQuery,
    locationLabel: activeLocation?.displayLabel || '',
    radiusMiles: hasUserLocation ? requestedRadiusMiles : null,
    userLat: hasUserLocation ? (activeLocation?.lat ?? null) : null,
    userLon: hasUserLocation ? (activeLocation?.lon ?? null) : null,
    currentMatchCount: result.total,
  }

  return (
    <div className="min-h-screen">
      <BreadcrumbJsonLd items={breadcrumbItems} />
      {shouldRenderCollectionJsonLd && (
        <JsonLd
          data={buildNearbyBrowseCollectionJsonLd({
            appUrl: APP_URL,
            base: seoBase,
            previewListings: result.listings.slice(0, 12),
            total: result.total,
          })}
        />
      )}

      <section className="border-b border-stone-800/30">
        <div className="mx-auto max-w-6xl px-4 pb-8 pt-16 sm:px-6 lg:px-8">
          <nav
            aria-label="Breadcrumb"
            className="mb-4 flex items-center gap-2 text-xs text-stone-500"
          >
            <Link href="/" className="transition-colors hover:text-stone-300">
              Home
            </Link>
            <span>/</span>
            <span className="text-stone-400">Nearby</span>
          </nav>

          <h1 className="text-4xl font-bold tracking-[-0.04em] text-stone-100 md:text-5xl">
            {heroTitle}
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-stone-400">{heroSubtitle}</p>
          <p className="mt-3 text-sm font-medium text-stone-500">
            {stats.totalListings.toLocaleString()} food businesses across{' '}
            {stats.states.length.toLocaleString()} states
          </p>

          <div className="mt-5 flex flex-col items-start gap-3 rounded-2xl border border-stone-800/60 bg-stone-900/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-200">
                Looking specifically for a private chef?
              </p>
              <p className="mt-1 text-sm text-stone-400">
                Use the chef-booking path for matched private-chef requests, or browse chef profiles
                directly.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={PUBLIC_PRIMARY_CONSUMER_CTA.href}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                {PUBLIC_PRIMARY_CONSUMER_CTA.label}
              </Link>
              <Link
                href={PUBLIC_SECONDARY_CONSUMER_CTA.href}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-700 px-4 text-sm font-medium text-stone-300 transition-colors hover:border-stone-600 hover:bg-stone-800 hover:text-stone-100"
              >
                {PUBLIC_SECONDARY_CONSUMER_CTA.label}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-stone-800/30">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <Suspense>
            <NearbyFilters
              query={query}
              businessType={businessType}
              cuisine={cuisine}
              state={state}
              city={city}
              priceRange={priceRange}
              location={locationQuery}
              radiusMiles={requestedRadiusMiles}
              locationError={locationError}
              locationLabel={activeLocation?.displayLabel ?? null}
              usingBrowserLocation={usingBrowserLocation}
            />
          </Suspense>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-800 pt-4">
            <p className="text-xs leading-relaxed text-stone-500">
              Looking across chefs, sample menus, meal prep, and listings?
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
              <Link
                href={mapToggleHref}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-stone-700 bg-stone-950 px-4 text-xs font-medium text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-900"
              >
                {mapMode ? 'Card grid' : 'Map view'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        {isLanding && (
          <>
            <NearbyCollectionModules stats={stats} />
            <NearbyBrowseHubs stats={stats} />
          </>
        )}

        <ResultsSection
          result={result}
          activeFilterLabels={activeFilterLabels}
          currentParams={currentParams}
          cuisineFilter={cuisine || undefined}
          isLanding={isLanding}
          stats={stats}
          emptyStateMessage={emptyStateMessage}
          fallbackActions={fallbackActions}
          locationContextText={locationContextText}
          captureDefaults={captureDefaults}
          showCapture={!shouldBlockResultsForInvalidLocation}
          favoriteMode={favoriteMode}
          visualMode={visualMode}
          mapMode={mapMode}
        />

        {isLanding && stats.totalListings > 0 && (
          <div className="mt-12">
            <StateGrid stats={stats} />
          </div>
        )}

        <PublicSecondaryEntryCluster links={PUBLIC_SECONDARY_ENTRY_CONFIG.nearby} theme="dark" />

        <p className="mt-16 text-center text-[10px] text-stone-600">
          Listing data includes information from{' '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-stone-500"
          >
            OpenStreetMap
          </a>{' '}
          under the{' '}
          <a
            href="https://opendatacommons.org/licenses/odbl/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-stone-500"
          >
            ODbL
          </a>
          .
        </p>
      </section>
    </div>
  )
}
