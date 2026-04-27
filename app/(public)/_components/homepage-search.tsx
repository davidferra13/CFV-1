'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { NEUTRAL_LOCATION_PLACEHOLDER } from '@/lib/site/national-brand-copy'
import { LocationAutocomplete, type LocationData } from '@/components/ui/location-autocomplete'

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

export function HomepageSearch() {
  const router = useRouter()
  const [location, setLocation] = useState('')
  const [locationGeo, setLocationGeo] = useState<{ lat: number; lng: number } | null>(null)
  const [serviceType, setServiceType] = useState('')

  function handleLocationSelect(data: LocationData) {
    setLocation(data.displayText)
    if (data.lat && data.lng) {
      setLocationGeo({ lat: data.lat, lng: data.lng })
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (location.trim()) params.set('location', location.trim())
    if (serviceType) params.set('serviceType', serviceType)
    // Pass pre-geocoded coordinates when available (skips server-side geocoding)
    if (locationGeo) {
      params.set('lat', String(locationGeo.lat))
      params.set('lng', String(locationGeo.lng))
    }
    const qs = params.toString()
    router.push(`/chefs${qs ? `?${qs}` : ''}`)
  }

  return (
    <form onSubmit={handleSearch} className="flex flex-col gap-4">
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-stone-800/60 bg-stone-900/70 shadow-[0_24px_48px_rgba(0,0,0,0.25)] backdrop-blur-md transition-all duration-200 focus-within:border-brand-600/40 focus-within:shadow-[0_24px_48px_rgba(0,0,0,0.3),0_0_0_1px_rgba(237,168,107,0.12)] sm:flex-row">
        <div className="flex min-h-[54px] flex-1 items-center border-b border-stone-800/30 sm:min-h-0 sm:border-b-0 sm:border-r sm:border-stone-800/30">
          <label htmlFor="homepage-location" className="sr-only">
            Location
          </label>
          <svg
            className="ml-4 h-5 w-5 shrink-0 text-stone-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
            role="presentation"
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
              setLocationGeo(null) // Clear geo when user types manually
            }}
            placeholder={NEUTRAL_LOCATION_PLACEHOLDER}
            className="w-full bg-transparent px-3 py-3.5 text-[15px] text-stone-100 placeholder:text-stone-500 focus:outline-none sm:py-4 sm:text-sm"
          />
        </div>
        <div className="flex min-h-[54px] flex-1 items-center sm:min-h-0">
          <label htmlFor="homepage-service" className="sr-only">
            Service type
          </label>
          <svg
            className="ml-4 h-5 w-5 shrink-0 text-stone-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
            role="presentation"
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
            className="w-full cursor-pointer appearance-none bg-transparent px-3 py-3.5 text-[15px] text-stone-100 focus:outline-none sm:py-4 sm:text-sm"
          >
            {SERVICE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-stone-900 text-stone-100">
                {opt.label}
              </option>
            ))}
          </select>
          <svg
            className="mr-3 h-4 w-4 text-stone-500 flex-shrink-0 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
            role="presentation"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 tracking-[-0.01em] text-stone-500">
          Search by place and service, then compare live profiles.
        </p>
        <button
          type="submit"
          className="inline-flex h-12 items-center justify-center rounded-2xl border border-stone-700/80 bg-stone-900/60 px-7 text-sm font-semibold tracking-[-0.01em] text-stone-200 shadow-lg transition-all duration-200 active:scale-[0.97] touch-manipulation hover:border-stone-600 hover:bg-stone-800 hover:text-stone-100 sm:min-w-[180px]"
        >
          <svg
            className="mr-2 h-4 w-4 text-stone-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
            role="presentation"
          >
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
