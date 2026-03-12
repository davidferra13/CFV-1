'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'

type Props = {
  cuisineTypes: string[]
  currentFilters: {
    query?: string
    cuisine?: string
    state?: string
    city?: string
    priceRange?: string
  }
}

const PRICE_RANGES = [
  { value: '', label: 'Any price' },
  { value: 'budget', label: 'Budget-friendly' },
  { value: 'mid', label: 'Mid-range' },
  { value: 'premium', label: 'Premium' },
  { value: 'luxury', label: 'Luxury' },
]

const US_STATES = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
]

export function MarketplaceFilters({ cuisineTypes, currentFilters }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(currentFilters.query ?? '')

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page') // reset to page 1 on filter change
      router.push(`/marketplace?${params.toString()}`)
    },
    [router, searchParams]
  )

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      updateFilter('q', query)
    },
    [query, updateFilter]
  )

  const clearFilters = useCallback(() => {
    setQuery('')
    router.push('/marketplace')
  }, [router])

  const hasActiveFilters =
    currentFilters.query ||
    currentFilters.cuisine ||
    currentFilters.state ||
    currentFilters.city ||
    currentFilters.priceRange

  return (
    <div className="mb-6 space-y-4">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by cuisine, chef name, or location..."
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-orange-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-orange-700"
        >
          Search
        </button>
      </form>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Cuisine filter */}
        {cuisineTypes.length > 0 && (
          <select
            value={currentFilters.cuisine ?? ''}
            onChange={(e) => updateFilter('cuisine', e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
          >
            <option value="">All cuisines</option>
            {cuisineTypes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}

        {/* State filter */}
        <select
          value={currentFilters.state ?? ''}
          onChange={(e) => updateFilter('state', e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
        >
          <option value="">All states</option>
          {US_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* Price range filter */}
        <select
          value={currentFilters.priceRange ?? ''}
          onChange={(e) => updateFilter('price', e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
        >
          {PRICE_RANGES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-sm text-orange-600 hover:text-orange-800">
            Clear all
          </button>
        )}
      </div>
    </div>
  )
}
