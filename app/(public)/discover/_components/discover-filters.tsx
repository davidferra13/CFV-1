'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Search } from 'lucide-react'
import {
  BUSINESS_TYPES,
  CUISINE_CATEGORIES,
  PRICE_RANGES,
  getBusinessTypeLabel,
} from '@/lib/discover/constants'

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

type Props = {
  query: string
  businessType: string
  cuisine: string
  state: string
  priceRange: string
}

export function DiscoverFilters({ query, businessType, cuisine, state, priceRange }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchInput, setSearchInput] = useState(query)

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams?.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      router.push(`/discover?${params.toString()}`)
    },
    [router, searchParams]
  )

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      updateFilter('q', searchInput.trim())
    },
    [searchInput, updateFilter]
  )

  const clearFilters = useCallback(() => {
    router.push('/discover')
    setSearchInput('')
  }, [router])

  const hasFilters = query || businessType || cuisine || state || priceRange

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, city, or cuisine..."
            className="h-11 w-full rounded-lg border border-stone-700 bg-stone-900/80 pl-10 pr-4 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <button
          type="submit"
          className="h-11 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Search
        </button>
      </form>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Business type */}
        <select
          value={businessType}
          onChange={(e) => updateFilter('type', e.target.value)}
          className="h-9 rounded-lg border border-stone-700 bg-stone-900 px-3 text-xs text-stone-300 focus:border-brand-500 focus:outline-none"
        >
          <option value="">All types</option>
          {BUSINESS_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        {/* Cuisine */}
        <select
          value={cuisine}
          onChange={(e) => updateFilter('cuisine', e.target.value)}
          className="h-9 rounded-lg border border-stone-700 bg-stone-900 px-3 text-xs text-stone-300 focus:border-brand-500 focus:outline-none"
        >
          <option value="">All cuisines</option>
          {CUISINE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        {/* State */}
        <select
          value={state}
          onChange={(e) => updateFilter('state', e.target.value)}
          className="h-9 rounded-lg border border-stone-700 bg-stone-900 px-3 text-xs text-stone-300 focus:border-brand-500 focus:outline-none"
        >
          <option value="">All states</option>
          {US_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* Price range */}
        <select
          value={priceRange}
          onChange={(e) => updateFilter('price', e.target.value)}
          className="h-9 rounded-lg border border-stone-700 bg-stone-900 px-3 text-xs text-stone-300 focus:border-brand-500 focus:outline-none"
        >
          <option value="">Any price</option>
          {PRICE_RANGES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="h-9 rounded-lg border border-stone-600 px-3 text-xs font-medium text-stone-400 transition-colors hover:border-stone-500 hover:text-stone-200"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Business type pills (quick select) */}
      <div className="flex flex-wrap gap-2">
        {BUSINESS_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => updateFilter('type', businessType === t.value ? '' : t.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              businessType === t.value
                ? 'bg-brand-600 text-white'
                : 'border border-stone-700/60 bg-stone-900/60 text-stone-400 hover:border-brand-600/50 hover:text-stone-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
