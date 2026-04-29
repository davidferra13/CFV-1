'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LocationAutocomplete, type LocationData } from '@/components/ui/location-autocomplete'
import { canonicalizeBookingServiceType } from '@/lib/booking/service-types'
import { NEUTRAL_LOCATION_PLACEHOLDER } from '@/lib/site/national-brand-copy'

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

  function handleSearch(event: React.FormEvent) {
    event.preventDefault()
    const params = new URLSearchParams()
    const canonicalServiceType = canonicalizeBookingServiceType(serviceType)

    if (location.trim()) params.set('location', location.trim())
    if (canonicalServiceType) {
      params.set('serviceType', canonicalServiceType)
      params.set('service_type', canonicalServiceType)
    }
    if (locationGeo) {
      params.set('lat', String(locationGeo.lat))
      params.set('lng', String(locationGeo.lng))
    }

    const query = params.toString()
    router.push(`/chefs${query ? `?${query}` : ''}`)
  }

  return (
    <form
      onSubmit={handleSearch}
      className="flex flex-col overflow-hidden rounded-2xl border border-stone-800/60 bg-stone-900/70 shadow-[0_24px_48px_rgba(0,0,0,0.25)] backdrop-blur-md transition-all duration-200 focus-within:border-brand-600/40 sm:flex-row"
    >
      <div className="flex min-h-[54px] flex-1 items-center border-b border-stone-800/30 sm:border-b-0 sm:border-r">
        <label htmlFor="homepage-location" className="sr-only">
          Location
        </label>
        <LocationAutocomplete
          id="homepage-location"
          name="location"
          value={location}
          onSelect={handleLocationSelect}
          onChange={(text) => {
            setLocation(text)
            setLocationGeo(null)
          }}
          placeholder={NEUTRAL_LOCATION_PLACEHOLDER}
          className="w-full bg-transparent px-4 py-3.5 text-[15px] text-stone-100 placeholder:text-stone-500 focus:outline-none"
        />
      </div>

      <div className="flex min-h-[54px] flex-1 items-center border-b border-stone-800/30 sm:border-b-0 sm:border-r">
        <label htmlFor="homepage-service" className="sr-only">
          Service type
        </label>
        <select
          id="homepage-service"
          name="serviceType"
          aria-label="Service type"
          value={serviceType}
          onChange={(event) => setServiceType(event.target.value)}
          className="w-full cursor-pointer appearance-none bg-transparent px-4 py-3.5 text-[15px] text-stone-100 focus:outline-none"
        >
          {SERVICE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value} className="bg-stone-900 text-stone-100">
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="min-h-[54px] shrink-0 bg-amber-600 px-6 text-sm font-semibold tracking-[-0.01em] text-white transition-colors hover:bg-amber-500 active:bg-amber-700"
      >
        Browse chefs
      </button>
    </form>
  )
}
