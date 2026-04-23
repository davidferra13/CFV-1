'use client'

import Link from 'next/link'
import { useRef, useState, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { ANALYTICS_EVENTS, trackEvent } from '@/lib/analytics/posthog'
import {
  detectApproximateDirectoryLocation,
  resolveCurrentDirectoryLocation,
} from '@/lib/directory/location-actions'
import type { DirectoryFacetOption, DirectorySortMode } from '@/lib/directory/utils'
import {
  NEUTRAL_DIRECTORY_QUERY_EXAMPLE,
  NEUTRAL_LOCATION_ACCESS_ERROR_TEXT,
  NEUTRAL_LOCATION_HELPER_TEXT,
  NEUTRAL_LOCATION_PLACEHOLDER,
  NEUTRAL_LOCATION_UNAVAILABLE_TEXT,
} from '@/lib/site/national-brand-copy'
import { LocationAutocomplete, type LocationData } from '@/components/ui/location-autocomplete'

type DirectoryLocationSource = 'manual' | 'current' | 'approximate'

type DirectoryFiltersFormProps = {
  query: string
  locationFilter: string
  locationSource: DirectoryLocationSource
  cuisineFilter: string
  serviceTypeFilter: string
  dietaryFilter: string
  priceRangeFilter: string
  partnerTypeFilter: string
  locationExperienceFilter: string
  locationBestForFilter: string
  acceptingOnly: boolean
  sortMode: DirectorySortMode
  maxQueryLength: number
  cuisineOptions: DirectoryFacetOption[]
  serviceTypeOptions: DirectoryFacetOption[]
  partnerTypeOptions: DirectoryFacetOption[]
  locationExperienceOptions: DirectoryFacetOption[]
  locationBestForOptions: DirectoryFacetOption[]
}

type LocationFeedback =
  | { tone: 'muted'; message: string }
  | { tone: 'error'; message: string }
  | null

export function DirectoryFiltersForm({
  query,
  locationFilter,
  locationSource,
  cuisineFilter,
  serviceTypeFilter,
  dietaryFilter,
  priceRangeFilter,
  partnerTypeFilter,
  locationExperienceFilter,
  locationBestForFilter,
  acceptingOnly,
  sortMode,
  maxQueryLength,
  cuisineOptions,
  serviceTypeOptions,
  partnerTypeOptions,
  locationExperienceOptions,
  locationBestForOptions,
}: DirectoryFiltersFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [locationValue, setLocationValue] = useState(locationFilter)
  const [locationSourceValue, setLocationSourceValue] =
    useState<DirectoryLocationSource>(locationSource)
  const [locationFeedback, setLocationFeedback] = useState<LocationFeedback>(
    locationSource === 'approximate' && locationFilter
      ? {
          tone: 'muted',
          message: `Using approximate location: ${locationFilter}.`,
        }
      : null
  )
  const [isLocating, setIsLocating] = useState(false)
  const [isSmartSearching, setIsSmartSearching] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget
    const formData = new FormData(form)
    const nextQuery = `${formData.get('q') || ''}`.trim()
    const nextLocation = `${formData.get('location') || ''}`.trim()
    const nextLocationSource = `${formData.get('locationSource') || 'manual'}`.trim()
    const nextCuisine = `${formData.get('cuisine') || ''}`.trim()
    const nextServiceType = `${formData.get('serviceType') || ''}`.trim()
    const nextPriceRange = `${formData.get('priceRange') || ''}`.trim()
    const nextPartnerType = `${formData.get('partnerType') || ''}`.trim()
    const nextLocationExperience = `${formData.get('locationExperience') || ''}`.trim()
    const nextLocationBestFor = `${formData.get('locationBestFor') || ''}`.trim()
    const nextAcceptingOnly = formData.get('accepting') === '1'
    const nextSort = `${formData.get('sort') || 'featured'}`.trim()

    trackEvent(ANALYTICS_EVENTS.SEARCH_PERFORMED, {
      search_area: 'chef_directory',
      query_length: nextQuery.length,
      has_location_filter: Boolean(nextLocation),
      location_source: nextLocation ? nextLocationSource || 'manual' : 'none',
      has_cuisine_filter: Boolean(nextCuisine),
      has_service_type_filter: Boolean(nextServiceType),
      has_price_range_filter: Boolean(nextPriceRange),
      has_partner_type_filter: Boolean(nextPartnerType),
      has_location_experience_filter: Boolean(nextLocationExperience),
      has_location_best_for_filter: Boolean(nextLocationBestFor),
      accepting_only: nextAcceptingOnly,
      sort_mode: nextSort || 'featured',
    })

    trackEvent(ANALYTICS_EVENTS.FEATURE_USED, {
      feature: 'chef_directory_filters_applied',
      query_length: nextQuery.length,
      location_filter: nextLocation || 'none',
      location_source: nextLocation ? nextLocationSource || 'manual' : 'none',
      cuisine_filter: nextCuisine || 'none',
      service_type_filter: nextServiceType || 'none',
      price_range_filter: nextPriceRange || 'none',
      partner_type_filter: nextPartnerType || 'none',
      location_experience_filter: nextLocationExperience || 'none',
      location_best_for_filter: nextLocationBestFor || 'none',
      accepting_only: nextAcceptingOnly,
      sort_mode: nextSort || 'featured',
    })
  }

  const handleResetClick = () => {
    trackEvent(ANALYTICS_EVENTS.FEATURE_USED, {
      feature: 'chef_directory_filters_reset',
    })
  }

  const handleSmartSearch = async () => {
    const form = formRef.current
    if (!form) return
    const qInput = form.querySelector<HTMLInputElement>('input[name="q"]')
    const text = qInput?.value?.trim()
    if (!text || text.length < 5) return

    setIsSmartSearching(true)
    try {
      const res = await fetch('/api/chefs/parse-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) return

      const filters = await res.json()

      // Build URL params from parsed filters
      const params = new URLSearchParams()
      if (filters.query) params.set('q', filters.query)
      if (filters.cuisine) params.set('cuisine', filters.cuisine)
      if (filters.serviceType) params.set('serviceType', filters.serviceType)
      if (filters.location) params.set('location', filters.location)
      if (filters.priceRange) params.set('priceRange', filters.priceRange)
      if (filters.dietary) params.set('dietary', filters.dietary)

      trackEvent(ANALYTICS_EVENTS.FEATURE_USED, {
        feature: 'chef_directory_smart_search',
        original_query: text,
        parsed_filters: JSON.stringify(filters),
      })

      window.location.href = `/chefs?${params.toString()}`
    } catch {
      // Fall through to normal search
      form.requestSubmit()
    } finally {
      setIsSmartSearching(false)
    }
  }

  const submitResolvedLocation = (nextLocation: string, nextSource: DirectoryLocationSource) => {
    flushSync(() => {
      setLocationValue(nextLocation)
      setLocationSourceValue(nextSource)
    })
    formRef.current?.requestSubmit()
  }

  const handleApproximateFallback = async () => {
    const approximateLocation = await detectApproximateDirectoryLocation()
    if (!approximateLocation) {
      trackEvent(ANALYTICS_EVENTS.FEATURE_USED, {
        feature: 'chef_directory_current_location_failed',
        outcome: 'unavailable',
      })
      setLocationFeedback({
        tone: 'error',
        message: NEUTRAL_LOCATION_UNAVAILABLE_TEXT,
      })
      return
    }

    trackEvent(ANALYTICS_EVENTS.FEATURE_USED, {
      feature: 'chef_directory_current_location_resolved',
      outcome: 'approximate',
      location_label: approximateLocation.label,
    })
    submitResolvedLocation(approximateLocation.query, approximateLocation.source)
  }

  const handleCurrentLocationClick = () => {
    trackEvent(ANALYTICS_EVENTS.FEATURE_USED, {
      feature: 'chef_directory_current_location_requested',
    })

    setIsLocating(true)
    setLocationFeedback({
      tone: 'muted',
      message: 'Finding your location...',
    })

    void (async () => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        await handleApproximateFallback()
        setIsLocating(false)
        return
      }

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 8000,
            maximumAge: 300000,
          })
        })

        const resolvedLocation = await resolveCurrentDirectoryLocation(
          position.coords.latitude,
          position.coords.longitude
        )

        if (!resolvedLocation) {
          await handleApproximateFallback()
          setIsLocating(false)
          return
        }

        trackEvent(ANALYTICS_EVENTS.FEATURE_USED, {
          feature: 'chef_directory_current_location_resolved',
          outcome: resolvedLocation.approximate ? 'approximate' : 'precise',
          location_label: resolvedLocation.label,
        })
        submitResolvedLocation(resolvedLocation.query, resolvedLocation.source)
      } catch (error) {
        const code =
          typeof error === 'object' && error && 'code' in error ? Number(error.code) : null

        if (code === 1 || code === 2 || code === 3) {
          await handleApproximateFallback()
          setIsLocating(false)
          return
        }

        trackEvent(ANALYTICS_EVENTS.FEATURE_USED, {
          feature: 'chef_directory_current_location_failed',
          outcome: 'error',
        })
        setLocationFeedback({
          tone: 'error',
          message: NEUTRAL_LOCATION_ACCESS_ERROR_TEXT,
        })
      } finally {
        setIsLocating(false)
      }
    })()
  }

  return (
    <form
      ref={formRef}
      action="/chefs"
      method="get"
      onSubmit={handleSubmit}
      className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
    >
      <div className="md:col-span-2 xl:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          Search chefs
        </span>
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder={NEUTRAL_DIRECTORY_QUERY_EXAMPLE}
            maxLength={maxQueryLength}
            className="block w-full rounded-xl border border-stone-600 bg-stone-950 px-3 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="button"
            onClick={handleSmartSearch}
            disabled={isSmartSearching}
            title="AI-powered natural language search"
            className="shrink-0 rounded-xl border border-stone-600 px-3 py-2.5 text-xs font-medium text-stone-300 transition-colors hover:border-brand-500 hover:text-brand-300 disabled:opacity-50 disabled:cursor-wait"
          >
            {isSmartSearching ? '...' : 'Smart'}
          </button>
        </div>
      </div>

      <label className="md:col-span-2 xl:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          Location
        </span>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <LocationAutocomplete
            name="location"
            value={locationValue}
            onSelect={(data: LocationData) => {
              setLocationValue(data.displayText)
              setLocationSourceValue('manual')
              setLocationFeedback(null)
            }}
            onChange={(text) => {
              setLocationValue(text)
              setLocationSourceValue('manual')
              setLocationFeedback(null)
            }}
            placeholder={NEUTRAL_LOCATION_PLACEHOLDER}
            className="block w-full rounded-xl border border-stone-600 bg-stone-950 px-3 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="button"
            onClick={handleCurrentLocationClick}
            disabled={isLocating}
            className="rounded-xl border border-stone-600 px-4 py-2.5 text-sm font-medium text-stone-300 transition-colors hover:border-stone-500 hover:text-stone-100 disabled:cursor-wait disabled:opacity-60"
          >
            {isLocating ? 'Locating...' : 'Use current location'}
          </button>
        </div>
        <input type="hidden" name="locationSource" value={locationSourceValue} />
        <p className="mt-2 text-xs text-stone-500">
          {NEUTRAL_LOCATION_HELPER_TEXT} Browser location is only requested when you ask.
        </p>
        {locationFeedback && (
          <p
            className={`mt-2 text-xs ${
              locationFeedback.tone === 'error' ? 'text-amber-300' : 'text-stone-400'
            }`}
          >
            {locationFeedback.message}
          </p>
        )}
      </label>

      <label>
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          Cuisine
        </span>
        <select
          name="cuisine"
          defaultValue={cuisineFilter}
          className="mt-1 block w-full rounded-xl border border-stone-600 bg-stone-950 px-3 py-2.5 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">Any cuisine</option>
          {cuisineOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} ({option.count})
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          Service type
        </span>
        <select
          name="serviceType"
          defaultValue={serviceTypeFilter}
          className="mt-1 block w-full rounded-xl border border-stone-600 bg-stone-950 px-3 py-2.5 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">Any service</option>
          {serviceTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} ({option.count})
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          Dietary fit
        </span>
        <select
          name="dietary"
          defaultValue={dietaryFilter}
          className="mt-1 block w-full rounded-xl border border-stone-600 bg-stone-950 px-3 py-2.5 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">Any dietary</option>
          <option value="vegan">Vegan</option>
          <option value="vegetarian">Vegetarian</option>
          <option value="gluten_free">Gluten-Free</option>
          <option value="dairy_free">Dairy-Free</option>
          <option value="allergy_aware">Allergy-Aware</option>
          <option value="medical_diets">Medical Diets</option>
          <option value="religious_diets">Religious Diets</option>
        </select>
      </label>

      <label>
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          Setting vibe
        </span>
        <select
          name="locationExperience"
          defaultValue={locationExperienceFilter}
          className="mt-1 block w-full rounded-xl border border-stone-600 bg-stone-950 px-3 py-2.5 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">Any vibe</option>
          {locationExperienceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} ({option.count})
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          Best for
        </span>
        <select
          name="locationBestFor"
          defaultValue={locationBestForFilter}
          className="mt-1 block w-full rounded-xl border border-stone-600 bg-stone-950 px-3 py-2.5 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">Any format</option>
          {locationBestForOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} ({option.count})
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">Price</span>
        <select
          name="priceRange"
          defaultValue={priceRangeFilter}
          className="mt-1 block w-full rounded-xl border border-stone-600 bg-stone-950 px-3 py-2.5 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">Any price point</option>
          <option value="budget">Budget-friendly</option>
          <option value="mid">Mid-range</option>
          <option value="premium">Premium</option>
          <option value="luxury">Luxury</option>
        </select>
      </label>

      <label>
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          Partner type
        </span>
        <select
          name="partnerType"
          defaultValue={partnerTypeFilter}
          className="mt-1 block w-full rounded-xl border border-stone-600 bg-stone-950 px-3 py-2.5 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">Any partner type</option>
          {partnerTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} ({option.count})
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">Sort</span>
        <select
          name="sort"
          defaultValue={sortMode}
          className="mt-1 block w-full rounded-xl border border-stone-600 bg-stone-950 px-3 py-2.5 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="featured">Featured first</option>
          <option value="availability">Soonest availability</option>
          <option value="partners">Most partner venues</option>
          <option value="alpha">Name A-Z</option>
        </select>
      </label>

      <label className="flex items-center gap-3 rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 xl:col-span-2">
        <input
          type="checkbox"
          name="accepting"
          value="1"
          defaultChecked={acceptingOnly}
          className="h-4 w-4 rounded border-stone-600 bg-stone-950 text-brand-600 focus:ring-brand-500"
        />
        <span className="text-sm text-stone-300">Accepting inquiries now</span>
      </label>

      <div className="flex items-center gap-3 md:col-span-2 xl:col-span-4">
        <button
          type="submit"
          className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Apply filters
        </button>
        <Link
          href="/chefs"
          onClick={handleResetClick}
          className="rounded-xl border border-stone-600 px-4 py-2.5 text-sm font-medium text-stone-300 transition-colors hover:border-stone-500 hover:text-stone-100"
        >
          Reset
        </Link>
      </div>
    </form>
  )
}
