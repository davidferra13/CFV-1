import { Suspense } from 'react'
import {
  searchMarketplaceChefs,
  getMarketplaceCuisineTypes,
} from '@/lib/marketplace/chef-search-actions'
import { MarketplaceGrid } from './marketplace-grid'
import { MarketplaceFilters } from './marketplace-filters'

export const metadata = {
  title: 'Browse Private Chefs | ChefFlow Marketplace',
  description:
    'Find and book talented private chefs for your next event. Browse by cuisine, location, and availability.',
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function MarketplacePage({ searchParams }: Props) {
  const params = await searchParams
  const query = typeof params.q === 'string' ? params.q : undefined
  const cuisine = typeof params.cuisine === 'string' ? params.cuisine : undefined
  const state = typeof params.state === 'string' ? params.state : undefined
  const city = typeof params.city === 'string' ? params.city : undefined
  const priceRange = typeof params.price === 'string' ? params.price : undefined
  const page = typeof params.page === 'string' ? parseInt(params.page, 10) : 1

  const [results, cuisineTypes] = await Promise.all([
    searchMarketplaceChefs({
      query,
      cuisineType: cuisine,
      state,
      city,
      priceRange,
      page,
    }),
    getMarketplaceCuisineTypes(),
  ])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Find Your Private Chef</h1>
        <p className="mt-2 text-lg text-gray-600">
          Browse talented chefs in your area. Filter by cuisine, location, and budget.
        </p>
      </div>

      <MarketplaceFilters
        cuisineTypes={cuisineTypes}
        currentFilters={{ query, cuisine, state, city, priceRange }}
      />

      <Suspense fallback={<MarketplaceGridSkeleton />}>
        <MarketplaceGrid
          chefs={results.chefs}
          total={results.total}
          page={results.page}
          pageSize={results.pageSize}
        />
      </Suspense>
    </div>
  )
}

function MarketplaceGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border bg-white p-4">
          <div className="h-48 rounded-lg bg-gray-200" />
          <div className="mt-4 h-5 w-3/4 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-1/2 rounded bg-gray-200" />
          <div className="mt-3 flex gap-2">
            <div className="h-6 w-16 rounded-full bg-gray-200" />
            <div className="h-6 w-16 rounded-full bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  )
}
