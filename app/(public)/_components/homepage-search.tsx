'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { NEUTRAL_LOCATION_PLACEHOLDER } from '@/lib/site/national-brand-copy'
import { LocationAutocomplete, type LocationData } from '@/components/ui/location-autocomplete'
import type { HomepageLocationContext } from './cuisine-marquee'

const SERVICE_OPTIONS = [
  { value: '', label: 'Any service' },
  { value: 'private_dinner', label: 'Private dinner' },
  { value: 'catering', label: 'Catering' },
  { value: 'meal_prep', label: 'Meal prep' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'corporate', label: 'Corporate dining' },
  { value: 'cooking_class', label: 'Cooking class' },
  { value: 'event_chef', label: 'Event chef' },
  { value: 'personal_chef', label: 'Personal chef' },
]

interface HomepageSearchProps {
  /** Called whenever location text or resolved coordinates change, so sibling components (e.g. CuisineMarquee) can carry location context into their routes. */
  onContextChange?: (context: HomepageLocationContext) => void
}

export function HomepageSearch({ onContextChange }: HomepageSearchProps = {}) {
  const router = useRouter()
  const [location, setLocation] = useState('')
  const [locationGeo, setLocationGeo] = useState<{ lat: number; lng: number } | null>(null)
  const [serviceType, setServiceType] = useState('')

  function handleLocationSelect(data: LocationData) {
    const text = data.displayText
    const geo = data.lat && data.lng ? { lat: data.lat, lng: data.lng } : null
    setLocation(text)
    setLocationGeo(geo)
    onContextChange?.({ location: text, lat: geo?.lat ?? null, lng: geo?.lng ?? null })
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (location.trim()) params.set('location', location.trim())
    if (serviceType) params.set('serviceType', serviceType)
    if (locationGeo) {
      params.set('lat', String(locationGeo.lat))
      params.set('lng', String(locationGeo.lng))
    }
    const qs = params.toString()
    router.push(`/chefs${qs ? `?${qs}` : ''}`)
  }

  return (
    <form onSubmit={handleSearch} className="flex flex-col gap-4">
      <div className="search-premium flex flex-1 flex-col overflow-hidden rounded-2xl border border-stone-700/60 bg-stone-900/70 shadow-[0_24px_48px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:flex-row sm:rounded-[1.5rem]">
        {/* Location input */}
        <div className="flex min-h-[56px] flex-1 items-center border-b border-stone-700/40 sm:min-h-[60px] sm:border-b-0 sm:border-r">
          <label htmlFor="homepage-location" className="sr-only">
            Location
          </label>
          <svg
            className="ml-5 h-5 w-5 shrink-0 text-brand-400/70"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <LocationAutocomplete
            id="homepage-location"
            name="location"
            value={location}
            onSelect={handleLocationSelect}
            onChange={(text) => {
              setLocation(text)
              setLocationGeo(null)
              onContextChange?.({ location: text, lat: null, lng: null })
            }}
            placeholder={NEUTRAL_LOCATION_PLACEHOLDER}
            className="w-full bg-transparent px-3 py-4 text-base text-stone-100 placeholder:text-stone-500 focus:outline-none sm:py-5 sm:text-[15px]"
          />
        </div>

        {/* Service type select */}
        <div className="flex min-h-[56px] flex-1 items-center sm:min-h-[60px]">
          <label htmlFor="homepage-service" className="sr-only">
            Service type
          </label>
          <svg
            className="ml-5 h-5 w-5 shrink-0 text-brand-400/70"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0A1.75 1.75 0 003 15.546"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18z"
            />
          </svg>
          <select
            id="homepage-service"
            name="serviceType"
            aria-label="Service type"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            className="w-full cursor-pointer appearance-none bg-transparent px-3 py-4 text-base text-stone-100 focus:outline-none sm:py-5 sm:text-[15px]"
          >
            {SERVICE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-stone-900 text-stone-100">
                {opt.label}
              </option>
            ))}
          </select>
          <svg
            className="mr-4 h-4 w-4 flex-shrink-0 pointer-events-none text-stone-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Search button - full width on mobile, aligned right on desktop */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-stone-500">
          Search by place and service, then compare live profiles in the directory.
        </p>
        <button
          type="submit"
          className="inline-flex h-14 items-center justify-center rounded-2xl gradient-accent px-8 text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.97] touch-manipulation sm:min-w-[200px]"
        >
          <svg className="mr-2.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          Browse chefs
        </button>
      </div>
    </form>
  )
}
