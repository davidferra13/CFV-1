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
import { LocationAutocomplete, type LocationData } from '@/components/ui/location-autocomplete'

type DirectoryLocationSource = 'manual' | 'current' | 'approximate'

type DirectoryFiltersFormProps = {
  query: string
  locationFilter: string
  locationSource: DirectoryLocationSource
  cuisineFilter: string
  serviceTypeFilter: string
  priceRangeFilter: string
  partnerTypeFilter: string
  acceptingOnly: boolean
  sortMode: DirectorySortMode
  maxQueryLength: number
  cuisineOptions: DirectoryFacetOption[]
  serviceTypeOptions: DirectoryFacetOption[]
  partnerTypeOptions: DirectoryFacetOption[]
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
  priceRangeFilter,
  partnerTypeFilter,
  acceptingOnly,
  sortMode,
  maxQueryLength,
  cuisineOptions,
  serviceTypeOptions,
  partnerTypeOptions,
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
      accepting_only: nextAcceptingOnly,
      sort_mode: nextSort || 'featured',
    })
  }

  const handleResetClick = () => {
    trackEvent(ANALYTICS_EVENTS.FEATURE_USED, {
      feature: 'chef_directory_filters_reset',
    })
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
        message: 'We could not determine your location. Enter a ZIP code or city, state.',
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
          message: 'We could not access your location. Enter a ZIP code or city, state.',
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
      <label className="md:col-span-2 xl:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          Search chefs
        </span>
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Name, cuisine, service type, city, venue"
          maxLength={maxQueryLength}
          className="mt-1 block w-full rounded-xl border border-stone-600 bg-stone-950 px-3 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </label>

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
            placeholder="ZIP code or city, state"
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
          Enter a ZIP code or city, state. Browser location is only requested when you ask.
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
