import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { getDirectoryListings, type DiscoverFilters } from '@/lib/discover/actions'
import { getBusinessTypeLabel } from '@/lib/discover/constants'
import { DiscoverFilters as DiscoverFiltersForm } from './_components/discover-filters'
import { ListingCard } from './_components/listing-card'
import { NominationForm } from './_components/nomination-form'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'Discover Restaurants, Chefs & Food Near You - ChefFlow',
  description:
    'Browse restaurants, private chefs, caterers, food trucks, bakeries, and more. Find great food in your area and connect directly.',
  openGraph: {
    title: 'Discover Food Near You | ChefFlow',
    description:
      'Browse restaurants, private chefs, caterers, food trucks, bakeries, and more near you.',
    url: `${APP_URL}/discover`,
    type: 'website',
  },
  alternates: {
    canonical: `${APP_URL}/discover`,
  },
}

type PageProps = {
  searchParams?: {
    q?: string | string[]
    type?: string | string[]
    cuisine?: string | string[]
    state?: string | string[]
    price?: string | string[]
  }
}

function firstParam(value?: string | string[]): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  const query = firstParam(searchParams?.q)
  const businessType = firstParam(searchParams?.type)
  const cuisine = firstParam(searchParams?.cuisine)
  const state = firstParam(searchParams?.state)
  const priceRange = firstParam(searchParams?.price)

  const filters: DiscoverFilters = {
    query: query || undefined,
    businessType: businessType || undefined,
    cuisine: cuisine || undefined,
    state: state || undefined,
    priceRange: priceRange || undefined,
  }

  const listings = await getDirectoryListings(filters)

  const activeFilterLabels: string[] = []
  if (query) activeFilterLabels.push(`"${query}"`)
  if (businessType) activeFilterLabels.push(getBusinessTypeLabel(businessType))
  if (cuisine) activeFilterLabels.push(cuisine)
  if (state) activeFilterLabels.push(state)
  if (priceRange) activeFilterLabels.push(priceRange)

  return (
    <div className="min-h-screen bg-stone-950">
      {/* Hero */}
      <section className="border-b border-stone-800/50">
        <div className="mx-auto max-w-6xl px-4 pb-8 pt-16 sm:px-6 lg:px-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-brand-400">
            Food Directory
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-stone-100 md:text-4xl">
            Discover great food near you
          </h1>
          <p className="mt-3 max-w-2xl text-base text-stone-400">
            Browse restaurants, private chefs, caterers, food trucks, and bakeries. Every listing
            links directly to the business. No middleman, no commission.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b border-stone-800/30">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <Suspense>
            <DiscoverFiltersForm
              query={query}
              businessType={businessType}
              cuisine={cuisine}
              state={state}
              priceRange={priceRange}
            />
          </Suspense>
        </div>
      </section>

      {/* Results */}
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-stone-400">
              {listings.length} listing{listings.length !== 1 ? 's' : ''}
              {activeFilterLabels.length > 0 && (
                <span className="text-stone-500"> matching {activeFilterLabels.join(', ')}</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/discover/submit"
              className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Add your business
            </Link>
          </div>
        </div>

        {listings.length === 0 ? (
          <div className="py-24 text-center">
            <h2 className="text-xl font-semibold text-stone-300">
              {activeFilterLabels.length > 0
                ? 'No listings match these filters'
                : 'The directory is just getting started'}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
              {activeFilterLabels.length > 0
                ? 'Try broadening your search or clearing some filters.'
                : 'Be one of the first businesses listed. Add your business or nominate one you love.'}
            </p>
            <div className="mt-6 flex items-center justify-center gap-4">
              {activeFilterLabels.length > 0 && (
                <Link
                  href="/discover"
                  className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  Clear filters
                </Link>
              )}
              <Link
                href="/discover/submit"
                className="rounded-lg border border-stone-600 px-5 py-2.5 text-sm font-medium text-stone-300 transition-colors hover:border-stone-500 hover:text-stone-100"
              >
                Add your business
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        {/* Nomination CTA */}
        <div className="mt-16 text-center">
          <NominationForm />
        </div>

        {/* Trust footer */}
        <div className="mt-12 text-center">
          <div className="mx-auto max-w-lg rounded-2xl border border-stone-800 bg-stone-900/50 p-5">
            <p className="text-xs font-semibold text-stone-300">How this directory works</p>
            <p className="mt-1.5 text-xs-tight leading-relaxed text-stone-500">
              Discovered listings show the business name, city, and a link to their website.
              Businesses can claim their listing to add photos, menus, and verified details. Anyone
              can request removal of their listing at any time.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
