'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
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
    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 sm:gap-0">
      <div className="flex flex-1 flex-col sm:flex-row rounded-2xl border border-stone-600/80 bg-stone-900/80 backdrop-blur-sm shadow-lg overflow-hidden focus-within:border-brand-600/60 transition-colors">
        <div className="flex-1 flex items-center border-b sm:border-b-0 sm:border-r border-stone-700/60">
          <svg
            className="ml-4 h-5 w-5 text-stone-500 flex-shrink-0"
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
            value={location}
            onSelect={handleLocationSelect}
            onChange={(text) => {
              setLocation(text)
              setLocationGeo(null) // Clear geo when user types manually
            }}
            placeholder="City, state, or ZIP"
            className="w-full bg-transparent px-3 py-4 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none"
          />
        </div>
        <div className="flex-1 flex items-center">
          <svg
            className="ml-4 h-5 w-5 text-stone-500 flex-shrink-0"
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
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            className="w-full bg-transparent px-3 py-4 text-sm text-stone-100 focus:outline-none appearance-none cursor-pointer"
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
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      <button
        type="submit"
        className="sm:ml-3 inline-flex h-[56px] items-center justify-center rounded-2xl gradient-accent px-8 text-sm font-semibold text-white glow-hover shadow-lg transition-transform active:scale-[0.97] touch-manipulation"
      >
        <svg className="h-5 w-5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <span className="sm:inline">Search</span>
      </button>
    </form>
  )
}
