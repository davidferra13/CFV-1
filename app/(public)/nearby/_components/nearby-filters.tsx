'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { MapPin, Search, SlidersHorizontal, X } from '@/components/ui/icons'
import {
  BUSINESS_TYPES,
  CUISINE_CATEGORIES,
  PRICE_RANGES,
  US_STATES,
} from '@/lib/discover/constants'
import { NEARBY_RADIUS_OPTIONS } from '@/lib/discover/nearby-search'
import {
  NEUTRAL_CITY_PLACEHOLDER,
  NEUTRAL_LOCATION_PLACEHOLDER,
  NEUTRAL_NEARBY_QUERY_EXAMPLES,
} from '@/lib/site/national-brand-copy'
import { CategoryPill } from './category-icon'

const LOCAL_INTENT_CHIPS = [
  { label: 'Open now', query: 'open food near me' },
  { label: 'Top rated', query: 'top rated food near me' },
  { label: 'Cheap', query: 'cheap food near me' },
  { label: 'Upscale', query: 'upscale food near me' },
  { label: 'Delivery', query: 'delivery food near me' },
  { label: 'Good for kids', query: 'family food near me' },
  { label: 'Accepts reservations', query: 'reservations food near me' },
]

const POPULAR_AREAS = [
  'New York, NY',
  'Brooklyn, NY',
  'Manhattan, NY',
  'SoHo, New York',
  'West Village, New York',
  'East Village, New York',
]

type Props = {
  query: string
  businessType: string
  cuisine: string
  state: string
  city: string
  priceRange: string
  location: string
  radiusMiles: number | null
  locationError: string | null
  locationLabel: string | null
  usingBrowserLocation: boolean
}

export function NearbyFilters({
  query,
  businessType,
  cuisine,
  state,
  city,
  priceRange,
  location,
  radiusMiles,
  locationError,
  locationLabel,
  usingBrowserLocation,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchInput, setSearchInput] = useState(query)
  const [locationInput, setLocationInput] = useState(location)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [showMoreFilters, setShowMoreFilters] = useState(
    !!(cuisine || state || city || priceRange || location || radiusMiles != null)
  )
  const [showAllCuisines, setShowAllCuisines] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [showAreaPicker, setShowAreaPicker] = useState(false)

  useEffect(() => {
    setSearchInput(query)
  }, [query])

  useEffect(() => {
    setLocationInput(location)
  }, [location])

  useEffect(() => {
    if (query) return
    const interval = setInterval(() => {
      setPlaceholderIndex((index) => (index + 1) % NEUTRAL_NEARBY_QUERY_EXAMPLES.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [query])

  const applyParams = useCallback(
    (params: URLSearchParams) => {
      const queryString = params.toString()
      router.push(queryString ? `/nearby?${queryString}` : '/nearby')
    },
    [router]
  )

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

      applyParams(params)
    },
    [applyParams, searchParams]
  )

  const handleSearch = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault()
      updateFilter('q', searchInput.trim())
    },
    [searchInput, updateFilter]
  )

  const handleLocationSearch = useCallback(
    (event?: React.FormEvent) => {
      event?.preventDefault()
      const params = new URLSearchParams(searchParams?.toString())
      const nextLocation = locationInput.trim()

      params.delete('page')
      params.delete('lat')
      params.delete('lon')

      if (nextLocation) {
        params.set('location', nextLocation)
      } else {
        params.delete('location')
        params.delete('radius')
      }

      applyParams(params)
    },
    [applyParams, locationInput, searchParams]
  )

  const applyIntentQuery = useCallback(
    (intentQuery: string) => {
      const params = new URLSearchParams(searchParams?.toString())
      if (query === intentQuery) {
        params.delete('q')
        setSearchInput('')
      } else {
        params.set('q', intentQuery)
        setSearchInput(intentQuery)
      }
      params.delete('page')
      applyParams(params)
    },
    [applyParams, query, searchParams]
  )

  const applySuggestedArea = useCallback(
    (area: string) => {
      const params = new URLSearchParams(searchParams?.toString())
      params.set('location', area)
      params.delete('lat')
      params.delete('lon')
      params.delete('page')
      setLocationInput(area)
      setShowAreaPicker(false)
      applyParams(params)
    },
    [applyParams, searchParams]
  )

  const clearFilters = useCallback(() => {
    setSearchInput('')
    setLocationInput('')
    setShowMoreFilters(false)
    router.push('/nearby')
  }, [router])

  const toggleBrowserLocation = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString())
    const hasCoordinateLocation = !!(searchParams?.get('lat') && searchParams?.get('lon'))
    const usingCurrentLocation = usingBrowserLocation && hasCoordinateLocation

    if (usingCurrentLocation) {
      params.delete('lat')
      params.delete('lon')
      params.delete('radius')
      params.delete('page')
      applyParams(params)
      return
    }

    if (!navigator.geolocation) return

    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        params.delete('location')
        params.delete('page')
        params.set('lat', position.coords.latitude.toFixed(4))
        params.set('lon', position.coords.longitude.toFixed(4))
        setShowAreaPicker(false)
        applyParams(params)
        setLocationLoading(false)
      },
      () => {
        setLocationLoading(false)
      },
      { enableHighAccuracy: false, timeout: 8000 }
    )
  }, [applyParams, searchParams, usingBrowserLocation])

  const hasActiveLocation = !!location || usingBrowserLocation || !!locationLabel
  const hasFilters =
    query ||
    businessType ||
    cuisine ||
    state ||
    city ||
    priceRange ||
    location ||
    usingBrowserLocation ||
    radiusMiles != null

  const placeholderText = NEUTRAL_NEARBY_QUERY_EXAMPLES[placeholderIndex]
  const visibleCuisines = showAllCuisines ? CUISINE_CATEGORIES : CUISINE_CATEGORIES.slice(0, 8)
  const locationStatus = usingBrowserLocation
    ? 'Using your current location.'
    : locationLabel
      ? `Searching near ${locationLabel}.`
      : null

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
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
          onClick={toggleBrowserLocation}
          disabled={locationLoading}
          aria-pressed={usingBrowserLocation}
          title={
            usingBrowserLocation
              ? 'Stop sorting by your current location'
              : 'Use my current location'
          }
          className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors ${
            usingBrowserLocation
              ? 'bg-brand-600 text-white hover:bg-brand-700'
              : 'border border-stone-700 text-stone-400 hover:border-stone-600 hover:text-stone-200'
          } ${locationLoading ? 'animate-pulse' : ''}`}
        >
          <MapPin className="h-4 w-4" />
          {locationLoading ? 'Locating...' : usingBrowserLocation ? 'Using location' : 'Near me'}
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowAreaPicker(true)}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-brand-700/60 bg-brand-950/30 px-3 text-xs font-semibold text-brand-100 transition-colors hover:border-brand-500 hover:bg-brand-950/50"
        >
          <MapPin className="h-3.5 w-3.5" />
          {locationLabel || (usingBrowserLocation ? 'Current location' : 'Choose area')}
        </button>
        {LOCAL_INTENT_CHIPS.map((chip) => {
          const active = query === chip.query
          return (
            <button
              key={chip.label}
              type="button"
              onClick={() => applyIntentQuery(chip.query)}
              className={`inline-flex h-9 items-center rounded-full px-3 text-xs font-semibold transition-colors ${
                active
                  ? 'bg-brand-600 text-white'
                  : 'border border-stone-700 bg-stone-950 text-stone-300 hover:border-stone-600 hover:bg-stone-900'
              }`}
            >
              {active ? `X ${chip.label}` : chip.label}
            </button>
          )
        })}
      </div>

      {showAreaPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="w-full max-w-md rounded-2xl border border-stone-800 bg-stone-950 shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between border-b border-stone-800 px-5 py-4">
              <h2 className="text-base font-semibold text-stone-100">Choose an area</h2>
              <button
                type="button"
                onClick={() => setShowAreaPicker(false)}
                className="rounded-full p-2 text-stone-500 transition-colors hover:bg-stone-900 hover:text-stone-200"
                aria-label="Close area picker"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-5 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                  For you
                </p>
                <p className="mt-2 text-sm text-stone-300">
                  Find food closer to a specific area, or use precise location for distance-based
                  sorting.
                </p>
                <button
                  type="button"
                  onClick={toggleBrowserLocation}
                  disabled={locationLoading}
                  className="mt-3 inline-flex h-10 items-center gap-2 rounded-full border border-stone-700 px-4 text-sm font-semibold text-stone-100 transition-colors hover:border-brand-500 hover:text-white disabled:cursor-wait disabled:opacity-70"
                >
                  <MapPin className="h-4 w-4" />
                  {locationLoading ? 'Locating...' : 'Use precise location'}
                </button>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Popular
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {POPULAR_AREAS.map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => applySuggestedArea(area)}
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-stone-700 bg-stone-900 px-3 text-sm font-medium text-stone-200 transition-colors hover:border-brand-500 hover:text-white"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      {area.replace(', New York', '')}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleLocationSearch} className="flex gap-2">
                <input
                  type="text"
                  value={locationInput}
                  onChange={(event) => setLocationInput(event.target.value)}
                  placeholder={NEUTRAL_LOCATION_PLACEHOLDER}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-stone-700 bg-stone-900 px-3 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
                />
                <button
                  type="submit"
                  onClick={() => setShowAreaPicker(false)}
                  className="h-11 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  Apply
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {BUSINESS_TYPES.map((type) => (
          <CategoryPill
            key={type.value}
            businessType={type.value}
            active={businessType === type.value}
            onClick={() => updateFilter('type', businessType === type.value ? '' : type.value)}
          />
        ))}
      </div>

      {!showMoreFilters && !hasFilters && (
        <button
          type="button"
          onClick={() => setShowMoreFilters(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-stone-500 transition-colors hover:text-stone-300"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          More filters
        </button>
      )}

      {(showMoreFilters || hasFilters) && (
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {visibleCuisines.map((category) => (
              <button
                key={category.value}
                type="button"
                onClick={() =>
                  updateFilter('cuisine', cuisine === category.value ? '' : category.value)
                }
                className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  cuisine === category.value
                    ? 'bg-brand-600 text-white'
                    : 'border border-stone-700/60 bg-stone-900/60 text-stone-400 hover:border-brand-600/50 hover:text-stone-200'
                }`}
              >
                {category.label}
              </button>
            ))}
            {!showAllCuisines && (
              <button
                type="button"
                onClick={() => setShowAllCuisines(true)}
                className="flex-shrink-0 rounded-full border border-dashed border-stone-600 px-3.5 py-1.5 text-xs font-medium text-stone-500 transition-colors hover:border-stone-500 hover:text-stone-300"
              >
                + More
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1.5">
              {PRICE_RANGES.map((range) => (
                <button
                  key={range.value}
                  type="button"
                  onClick={() =>
                    updateFilter('price', priceRange === range.value ? '' : range.value)
                  }
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    priceRange === range.value
                      ? 'bg-brand-600 text-white'
                      : 'border border-stone-700/60 bg-stone-900/60 text-stone-400 hover:border-brand-600/50 hover:text-stone-200'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>

            <div className="h-5 w-px bg-stone-700/50" />

            <select
              value={state}
              onChange={(event) => updateFilter('state', event.target.value)}
              className="h-9 rounded-lg border border-stone-700 bg-stone-900 px-3 text-xs text-stone-300 focus:border-brand-500 focus:outline-none"
            >
              <option value="">All states</option>
              {Object.entries(US_STATES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>

            {state && (
              <input
                type="text"
                defaultValue={city}
                onBlur={(event) => updateFilter('city', event.target.value.trim())}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    updateFilter('city', (event.target as HTMLInputElement).value.trim())
                  }
                }}
                placeholder={NEUTRAL_CITY_PLACEHOLDER}
                className="h-9 w-36 rounded-lg border border-stone-700 bg-stone-900 px-3 text-xs text-stone-300 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
              />
            )}
          </div>

          <form
            onSubmit={handleLocationSearch}
            className="flex flex-col gap-3 md:flex-row md:items-center"
          >
            <div className="relative flex-1">
              <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
              <input
                type="text"
                value={locationInput}
                onChange={(event) => setLocationInput(event.target.value)}
                placeholder={NEUTRAL_LOCATION_PLACEHOLDER}
                className="h-11 w-full rounded-xl border border-stone-700 bg-stone-900/80 pl-11 pr-4 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <button
              type="submit"
              className="h-11 rounded-xl border border-stone-700 px-4 text-sm font-medium text-stone-300 transition-colors hover:border-stone-600 hover:bg-stone-800 hover:text-stone-100"
            >
              Set location
            </button>
            {hasActiveLocation && (
              <select
                value={radiusMiles != null ? String(radiusMiles) : ''}
                onChange={(event) => updateFilter('radius', event.target.value)}
                className="h-11 rounded-xl border border-stone-700 bg-stone-900 px-3 text-sm text-stone-300 focus:border-brand-500 focus:outline-none"
              >
                <option value="">Any distance</option>
                {NEARBY_RADIUS_OPTIONS.map((radiusOption) => (
                  <option key={radiusOption} value={radiusOption}>
                    Within {radiusOption} miles
                  </option>
                ))}
              </select>
            )}
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-11 items-center justify-center gap-1 rounded-xl border border-stone-600 px-4 text-sm font-medium text-stone-400 transition-colors hover:border-stone-500 hover:text-stone-200"
              >
                <X className="h-3.5 w-3.5" />
                Clear all
              </button>
            )}
          </form>

          {(locationStatus || locationError) && (
            <div className="space-y-1">
              {locationStatus && <p className="text-xs text-stone-500">{locationStatus}</p>}
              {locationError && <p className="text-xs text-amber-300">{locationError}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
