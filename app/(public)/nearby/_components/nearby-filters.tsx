'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState, useRef } from 'react'
import { Search, SlidersHorizontal, X } from '@/components/ui/icons'
import {
  BUSINESS_TYPES,
  CUISINE_CATEGORIES,
  PRICE_RANGES,
  US_STATES,
} from '@/lib/discover/constants'
import { CategoryPill } from './category-icon'

const PLACEHOLDER_TEXTS = [
  'Thai food in Boston...',
  'Caterers near Austin...',
  'Bakeries in Portland...',
  'Private chefs in Miami...',
  'Food trucks in Denver...',
  'Seafood in Seattle...',
  'Italian in New York...',
]

type Props = {
  query: string
  businessType: string
  cuisine: string
  state: string
  city: string
  priceRange: string
}

export function NearbyFilters({ query, businessType, cuisine, state, city, priceRange }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchInput, setSearchInput] = useState(query)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [showMoreFilters, setShowMoreFilters] = useState(!!(cuisine || state || city || priceRange))
  const [showAllCuisines, setShowAllCuisines] = useState(false)
  const [locationActive, setLocationActive] = useState(
    !!(searchParams?.get('lat') && searchParams?.get('lon'))
  )
  const [locationLoading, setLocationLoading] = useState(false)
  const geoWatchId = useRef<number | null>(null)

  // Rotate placeholder text
  useEffect(() => {
    if (query) return // Don't rotate when user has typed something
    const interval = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDER_TEXTS.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [query])

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams?.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page')
      if (key === 'state') {
        params.delete('city')
      }
      router.push(`/nearby?${params.toString()}`)
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
    router.push('/nearby')
    setSearchInput('')
    setShowMoreFilters(false)
  }, [router])

  const toggleLocation = useCallback(() => {
    if (locationActive) {
      // Turn off location sorting
      if (geoWatchId.current != null) {
        navigator.geolocation.clearWatch(geoWatchId.current)
        geoWatchId.current = null
      }
      const params = new URLSearchParams(searchParams?.toString())
      params.delete('lat')
      params.delete('lon')
      params.delete('page')
      setLocationActive(false)
      router.push(`/nearby?${params.toString()}`)
      return
    }

    if (!navigator.geolocation) return

    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const params = new URLSearchParams(searchParams?.toString())
        params.set('lat', pos.coords.latitude.toFixed(4))
        params.set('lon', pos.coords.longitude.toFixed(4))
        params.delete('page')
        setLocationActive(true)
        setLocationLoading(false)
        router.push(`/nearby?${params.toString()}`)
      },
      () => {
        setLocationLoading(false)
      },
      { enableHighAccuracy: false, timeout: 8000 }
    )
  }, [locationActive, router, searchParams])

  // Cleanup geolocation watch on unmount
  useEffect(() => {
    return () => {
      if (geoWatchId.current != null) {
        navigator.geolocation.clearWatch(geoWatchId.current)
      }
    }
  }, [])

  const hasFilters =
    query || businessType || cuisine || state || city || priceRange || locationActive

  const placeholderText = PLACEHOLDER_TEXTS[placeholderIndex]

  const visibleCuisines = showAllCuisines ? CUISINE_CATEGORIES : CUISINE_CATEGORIES.slice(0, 8)

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={placeholderText}
            className="h-12 w-full rounded-xl border border-stone-700 bg-stone-900/80 pl-11 pr-4 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <button
          type="submit"
          className="h-12 rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Search
        </button>
        <button
          type="button"
          onClick={toggleLocation}
          disabled={locationLoading}
          title={locationActive ? 'Stop sorting by distance' : 'Sort by distance from me'}
          className={`h-12 rounded-xl px-4 text-sm font-medium transition-colors ${
            locationActive
              ? 'bg-brand-600 text-white hover:bg-brand-700'
              : 'border border-stone-700 text-stone-400 hover:border-stone-600 hover:text-stone-200'
          } ${locationLoading ? 'animate-pulse' : ''}`}
        >
          {locationLoading ? '...' : locationActive ? '📍' : '📍 Near me'}
        </button>
      </form>

      {/* Business type pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {BUSINESS_TYPES.map((t) => (
          <CategoryPill
            key={t.value}
            businessType={t.value}
            active={businessType === t.value}
            onClick={() => updateFilter('type', businessType === t.value ? '' : t.value)}
          />
        ))}
      </div>

      {/* Expanded filters toggle */}
      {!showMoreFilters && !hasFilters && (
        <button
          onClick={() => setShowMoreFilters(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-stone-500 transition-colors hover:text-stone-300"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          More filters
        </button>
      )}

      {/* Expanded filter rows */}
      {(showMoreFilters || hasFilters) && (
        <div className="space-y-3">
          {/* Cuisine pills */}
          <div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {visibleCuisines.map((c) => (
                <button
                  key={c.value}
                  onClick={() => updateFilter('cuisine', cuisine === c.value ? '' : c.value)}
                  className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    cuisine === c.value
                      ? 'bg-brand-600 text-white'
                      : 'border border-stone-700/60 bg-stone-900/60 text-stone-400 hover:border-brand-600/50 hover:text-stone-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
              {!showAllCuisines && (
                <button
                  onClick={() => setShowAllCuisines(true)}
                  className="flex-shrink-0 rounded-full border border-dashed border-stone-600 px-3.5 py-1.5 text-xs font-medium text-stone-500 transition-colors hover:border-stone-500 hover:text-stone-300"
                >
                  + More
                </button>
              )}
            </div>
          </div>

          {/* Price + Location row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Price pills */}
            <div className="flex gap-1.5">
              {PRICE_RANGES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => updateFilter('price', priceRange === p.value ? '' : p.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    priceRange === p.value
                      ? 'bg-brand-600 text-white'
                      : 'border border-stone-700/60 bg-stone-900/60 text-stone-400 hover:border-brand-600/50 hover:text-stone-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="h-5 w-px bg-stone-700/50" />

            {/* State dropdown (too many for pills) */}
            <select
              value={state}
              onChange={(e) => updateFilter('state', e.target.value)}
              className="h-9 rounded-lg border border-stone-700 bg-stone-900 px-3 text-xs text-stone-300 focus:border-brand-500 focus:outline-none"
            >
              <option value="">All states</option>
              {Object.entries(US_STATES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>

            {/* City input (only when state selected) */}
            {state && (
              <input
                type="text"
                defaultValue={city}
                onBlur={(e) => updateFilter('city', e.target.value.trim())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateFilter('city', (e.target as HTMLInputElement).value.trim())
                  }
                }}
                placeholder="City name..."
                className="h-9 w-36 rounded-lg border border-stone-700 bg-stone-900 px-3 text-xs text-stone-300 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
              />
            )}

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 rounded-lg border border-stone-600 px-3 py-1.5 text-xs font-medium text-stone-400 transition-colors hover:border-stone-500 hover:text-stone-200"
              >
                <X className="h-3 w-3" />
                Clear all
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
