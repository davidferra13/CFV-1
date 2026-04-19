import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import {
  getDirectoryListings,
  getDirectoryStats,
  type DiscoverFilters,
} from '@/lib/discover/actions'
import { getBusinessTypeLabel, getStateName } from '@/lib/discover/constants'
import {
  PUBLIC_PRIMARY_CONSUMER_CTA,
  PUBLIC_SECONDARY_CONSUMER_CTA,
} from '@/lib/public/public-surface-config'
import { PublicSecondaryEntryCluster } from '@/components/public/public-secondary-entry-cluster'
import { PUBLIC_SECONDARY_ENTRY_CONFIG } from '@/lib/public/public-secondary-entry-config'
import { NearbyFilters } from './_components/nearby-filters'
import { ListingCard } from './_components/listing-card'
// import { NominationForm } from './_components/nomination-form' // Hidden until data quality is ready

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'Nearby - Find Food Near You',
  description:
    'Find restaurants, private chefs, caterers, food trucks, bakeries, and more near you.',
  alternates: {
    canonical: `${APP_URL}/nearby`,
  },
  openGraph: {
    title: 'Nearby - Find Food Near You',
    description:
      'Find restaurants, private chefs, caterers, food trucks, bakeries, and more near you.',
    url: `${APP_URL}/nearby`,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Nearby - Find Food Near You',
    description:
      'Find restaurants, private chefs, caterers, food trucks, bakeries, and more near you.',
  },
}

type PageProps = {
  searchParams?: {
    q?: string | string[]
    type?: string | string[]
    cuisine?: string | string[]
    state?: string | string[]
    city?: string | string[]
    price?: string | string[]
    page?: string | string[]
    lat?: string | string[]
    lon?: string | string[]
  }
}

function firstParam(value?: string | string[]): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

// ─── Types for internal components ───────────────────────────────────────────

type DirectoryStats = {
  totalListings: number
  states: { state: string; count: number }[]
  topCities: { city: string; state: string; count: number }[]
}

// ─── State Grid (collapsible, below the fold) ───────────────────────────────

function StateGrid({ stats }: { stats: DirectoryStats }) {
  if (stats.totalListings === 0) return null

  return (
    <div className="space-y-10">
      {/* Collapsible state grid */}
      <details className="group">
        <summary className="cursor-pointer select-none text-sm font-semibold uppercase tracking-wider text-stone-500 transition-colors hover:text-stone-300">
          Browse by location ({stats.states.length} states)
          <span className="ml-1.5 inline-block transition-transform group-open:rotate-90">
            &#9654;
          </span>
        </summary>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {stats.states.map((s) => (
            <Link
              key={s.state}
              href={`/nearby?state=${s.state}`}
              className="group/state flex flex-col items-center rounded-xl border border-stone-800 bg-stone-900/50 px-2 py-3 text-center transition-all hover:border-brand-600/50 hover:bg-stone-800/50"
            >
              <span className="text-lg font-bold text-stone-200 group-hover/state:text-brand-400">
                {s.state}
              </span>
              <span className="mt-0.5 text-xxs text-stone-500">{s.count.toLocaleString()}</span>
            </Link>
          ))}
        </div>
      </details>

      {/* Top cities */}
      {stats.topCities.length > 0 && (
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-500">
            Popular cities
          </h2>
          <div className="flex flex-wrap gap-2">
            {stats.topCities.slice(0, 12).map((c) => (
              <Link
                key={`${c.city}-${c.state}`}
                href={`/nearby?state=${c.state}&city=${encodeURIComponent(c.city)}`}
                className="rounded-full border border-stone-700/60 bg-stone-900/60 px-3.5 py-1.5 text-xs font-medium text-stone-400 transition-colors hover:border-brand-600/50 hover:text-stone-200"
              >
                {c.city}, {c.state}
                <span className="ml-1.5 text-stone-600">{c.count.toLocaleString()}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Dinner Circles prompt */}
      <div className="rounded-xl border border-amber-800/30 bg-amber-950/10 p-5 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-stone-200">Gather your people</p>
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

// ─── Filtered Results (async, for Suspense streaming) ────────────────────────

async function FilteredResults({
  filters,
  activeFilterLabels,
  currentParams,
  cuisineFilter,
}: {
  filters: DiscoverFilters
  activeFilterLabels: string[]
  currentParams: URLSearchParams
  cuisineFilter?: string
}) {
  const result = await getDirectoryListings(filters)

  return (
    <>
      <div className="mb-6">
        <p className="text-sm font-medium text-stone-400">
          {result.total.toLocaleString()} listing{result.total !== 1 ? 's' : ''}
          {activeFilterLabels.length > 0 && (
            <span className="text-stone-500"> matching {activeFilterLabels.join(', ')}</span>
          )}
        </p>
      </div>

      {result.listings.length === 0 ? (
        <div className="py-24 text-center">
          <h2 className="text-xl font-semibold text-stone-300">No listings match these filters</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
            Try broadening your search or clearing some filters. If the business you are looking for
            is not listed yet, you can add it for free.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/nearby"
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Clear filters
            </Link>
            <Link
              href="/nearby/submit"
              className="rounded-lg border border-stone-700 px-5 py-2.5 text-sm font-medium text-stone-300 transition-colors hover:border-stone-600 hover:bg-stone-800 hover:text-stone-100"
            >
              Add a business
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            searchParams={currentParams}
          />

          {/* Dinner Circle contextual prompt */}
          <div className="mt-10 rounded-xl border border-amber-800/30 bg-amber-950/10 p-5 text-center">
            <p className="text-sm font-semibold text-stone-200">
              {cuisineFilter
                ? `Love ${cuisineFilter} food? Start a circle.`
                : 'Found something good? Gather your people.'}
            </p>
            <p className="mx-auto mt-1.5 max-w-md text-xs text-stone-400">
              Dinner Circles let you coordinate group meals, share recommendations, and keep
              everyone on the same page.
            </p>
            <Link
              href={
                cuisineFilter
                  ? `/hub/circles?topic=${encodeURIComponent(cuisineFilter)}`
                  : '/hub/circles'
              }
              className="mt-3 inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-500"
            >
              {cuisineFilter ? `Browse ${cuisineFilter} circles` : 'Browse Dinner Circles'}
            </Link>
          </div>
        </>
      )}
    </>
  )
}

// ─── Pagination ──────────────────────────────────────────────────────────────

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

  function pageUrl(p: number) {
    const params = new URLSearchParams(searchParams)
    if (p > 1) {
      params.set('page', String(p))
    } else {
      params.delete('page')
    }
    return `/nearby?${params.toString()}`
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

// ─── Main Page ───────────────────────────────────────────────────────────────

export default async function NearbyPage({ searchParams }: PageProps) {
  const query = firstParam(searchParams?.q)
  const businessType = firstParam(searchParams?.type)
  const cuisine = firstParam(searchParams?.cuisine)
  const state = firstParam(searchParams?.state)
  const city = firstParam(searchParams?.city)
  const priceRange = firstParam(searchParams?.price)
  const pageParam = parseInt(firstParam(searchParams?.page)) || 1
  const latParam = parseFloat(firstParam(searchParams?.lat))
  const lonParam = parseFloat(firstParam(searchParams?.lon))
  const hasUserLocation = isFinite(latParam) && isFinite(lonParam)

  const hasFilters =
    query || businessType || cuisine || state || priceRange || city || hasUserLocation
  const isLanding = !hasFilters

  const stats = await getDirectoryStats()

  const filters: DiscoverFilters = {
    query: query || undefined,
    businessType: businessType || undefined,
    cuisine: cuisine || undefined,
    state: state || undefined,
    city: city || undefined,
    priceRange: priceRange || undefined,
    page: pageParam,
    userLat: hasUserLocation ? latParam : undefined,
    userLon: hasUserLocation ? lonParam : undefined,
  }

  // Build active filter labels
  const activeFilterLabels: string[] = []
  if (query) activeFilterLabels.push(`"${query}"`)
  if (businessType) activeFilterLabels.push(getBusinessTypeLabel(businessType))
  if (cuisine) activeFilterLabels.push(cuisine)
  if (state) activeFilterLabels.push(getStateName(state))
  if (city) activeFilterLabels.push(city)
  if (priceRange) activeFilterLabels.push(priceRange)

  // Build URLSearchParams for pagination links
  const currentParams = new URLSearchParams()
  if (query) currentParams.set('q', query)
  if (businessType) currentParams.set('type', businessType)
  if (cuisine) currentParams.set('cuisine', cuisine)
  if (state) currentParams.set('state', state)
  if (city) currentParams.set('city', city)
  if (priceRange) currentParams.set('price', priceRange)

  const heroTitle = state ? `Food in ${getStateName(state)}` : 'Nearby'

  const heroSubtitle =
    state && city
      ? `Browsing ${city}, ${getStateName(state)}`
      : state
        ? `Browsing ${getStateName(state)}`
        : 'Find food near you. Restaurants, private chefs, caterers, food trucks, bakeries, and more.'

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="border-b border-stone-800/50">
        <div className="mx-auto max-w-6xl px-4 pb-8 pt-16 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-stone-100 md:text-5xl">
            {heroTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-stone-400">{heroSubtitle}</p>
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
          {/* Stats line removed - data quality not ready for public display */}
        </div>
      </section>

      {/* Filters */}
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
            />
          </Suspense>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        {isLanding ? (
          <StateGrid stats={stats} />
        ) : (
          <Suspense
            fallback={
              <div className="space-y-6">
                <div className="h-8 w-48 animate-pulse rounded-lg bg-stone-800/50" />
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-80 animate-pulse rounded-2xl bg-stone-800/50" />
                  ))}
                </div>
              </div>
            }
          >
            <FilteredResults
              filters={filters}
              activeFilterLabels={activeFilterLabels}
              currentParams={currentParams}
              cuisineFilter={cuisine || undefined}
            />
          </Suspense>
        )}

        <PublicSecondaryEntryCluster links={PUBLIC_SECONDARY_ENTRY_CONFIG.nearby} theme="dark" />

        {/* ODbL attribution - legal requirement, moved to minimal inline text */}
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
