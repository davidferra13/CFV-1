'use client'

import { useEffect, useRef, useState } from 'react'
import { NEUTRAL_LOCATION_PLACEHOLDER } from '@/lib/site/national-brand-copy'
import { LocationAutocomplete, type LocationData } from '@/components/ui/location-autocomplete'
import type { HomepageLocationContext } from '@/lib/discovery/homepage-discovery-rail'
import { useUserLocation, type SavedLocation } from '@/lib/location/use-user-location'
import { trackDiscoverySearchSubmit } from '@/lib/discovery/track-discovery-click'

const PLACEHOLDER_PHRASES = [
  'City, state, or ZIP code',
  'Private chef in Miami...',
  'Italian dinner in NYC...',
  'Catering for 50 in Austin...',
  'Personal chef in Chicago...',
  'Wedding chef in LA...',
  'Meal prep in San Francisco...',
]

const CHAR_INTERVAL = 55 // ms per character typed
const ERASE_INTERVAL = 30 // ms per character erased
const HOLD_MS = 2200 // ms to hold before erasing

function useTypingPlaceholder(phrases: string[], active: boolean) {
  const [display, setDisplay] = useState(phrases[0])
  const phraseIdx = useRef(0)
  const charIdx = useRef(phrases[0].length)
  const erasing = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!active) return
    // Delay start so initial focus is on the hero, not the cycling text
    const startDelay = setTimeout(() => {
      phraseIdx.current = 1
      charIdx.current = 0
      erasing.current = false

      function tick() {
        const phrase = phrases[phraseIdx.current]
        if (!erasing.current) {
          charIdx.current += 1
          setDisplay(phrase.slice(0, charIdx.current))
          if (charIdx.current >= phrase.length) {
            erasing.current = true
            timer.current = setTimeout(tick, HOLD_MS)
            return
          }
          timer.current = setTimeout(tick, CHAR_INTERVAL)
        } else {
          charIdx.current -= 1
          setDisplay(phrase.slice(0, charIdx.current))
          if (charIdx.current <= 0) {
            phraseIdx.current = (phraseIdx.current + 1) % phrases.length
            charIdx.current = 0
            erasing.current = false
            timer.current = setTimeout(tick, 200)
            return
          }
          timer.current = setTimeout(tick, ERASE_INTERVAL)
        }
      }
      tick()
    }, 3500)

    return () => {
      clearTimeout(startDelay)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [active, phrases])

  return display
}

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
  const [location, setLocation] = useState('')
  const [locationGeo, setLocationGeo] = useState<{ lat: number; lng: number } | null>(null)
  const [serviceType, setServiceType] = useState('')
  const typingPlaceholder = useTypingPlaceholder(PLACEHOLDER_PHRASES, location === '')

  const { savedLocation, saveLocation, clearLocation, hydrated } = useUserLocation()

  useEffect(() => {
    if (!hydrated || !savedLocation) return
    setLocation(savedLocation.displayLabel)
    setLocationGeo({ lat: savedLocation.lat, lng: savedLocation.lng })
    onContextChange?.({
      location: savedLocation.displayLabel,
      lat: savedLocation.lat,
      lng: savedLocation.lng,
    })
  }, [hydrated, savedLocation, onContextChange])

  function handleLocationSelect(data: LocationData) {
    const text = data.displayText
    const geo = data.lat && data.lng ? { lat: data.lat, lng: data.lng } : null
    setLocation(text)
    setLocationGeo(geo)
    onContextChange?.({ location: text, lat: geo?.lat ?? null, lng: geo?.lng ?? null })
    if (geo) {
      saveLocation({
        query: text,
        city: null,
        state: null,
        zip: null,
        lat: geo.lat,
        lng: geo.lng,
        displayLabel: text,
        savedAt: new Date().toISOString(),
      })
    }
  }

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const submittedLocation = String(formData.get('location') ?? location).trim()
    const submittedServiceType = String(formData.get('serviceType') ?? serviceType)
    const params = new URLSearchParams()
    if (submittedLocation) params.set('location', submittedLocation)
    if (submittedServiceType) params.set('serviceType', submittedServiceType)
    if (locationGeo) {
      params.set('lat', String(locationGeo.lat))
      params.set('lng', String(locationGeo.lng))
    }
    const qs = params.toString()
    const href = `/chefs${qs ? `?${qs}` : ''}`
    try {
      trackDiscoverySearchSubmit({
        location: submittedLocation || undefined,
        serviceType: submittedServiceType || undefined,
        href,
      })
    } finally {
      window.location.assign(href)
    }
  }

  return (
    <form action="/chefs" method="get" onSubmit={handleSearch} className="flex flex-col gap-2.5">
      <div className="search-premium flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/15 bg-white/5 shadow-[0_18px_40px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl sm:flex-row sm:items-stretch sm:rounded-[1.25rem]">
        {/* Location input */}
        <div className="flex min-h-[54px] flex-1 items-center border-b border-stone-700/40 sm:min-h-[56px] sm:border-b-0 sm:border-r">
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
            placeholder={typingPlaceholder}
            className="w-full bg-transparent px-3 py-3.5 text-base text-stone-100 placeholder:text-stone-500 focus:outline-none sm:py-4 sm:text-[15px]"
            googlePlacesEnabled={false}
          />
        </div>

        {/* Service type select */}
        <div className="flex min-h-[54px] flex-1 items-center sm:min-h-[56px]">
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
            className="w-full cursor-pointer appearance-none bg-transparent px-3 py-3.5 text-base text-stone-100 focus:outline-none sm:py-4 sm:text-[15px]"
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
        <button
          type="submit"
          className="hidden min-h-[56px] items-center justify-center gradient-accent px-7 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl active:scale-[0.98] sm:inline-flex"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Search button - full width on mobile, aligned right on desktop */}
      <div className="flex flex-col gap-2 sm:items-center">
        {savedLocation && location === savedLocation.displayLabel && (
          <p className="text-xs text-stone-500">
            Browsing near {savedLocation.displayLabel} &middot;{' '}
            <button
              type="button"
              onClick={() => {
                clearLocation()
                setLocation('')
                setLocationGeo(null)
              }}
              className="text-brand-400 underline-offset-2 hover:underline"
            >
              change
            </button>
          </p>
        )}
        <p className="text-xs leading-5 text-stone-500">
          Search by place and service, then compare live profiles in the directory.
        </p>
        <button
          type="submit"
          className="inline-flex min-h-[52px] items-center justify-center rounded-2xl gradient-accent px-8 text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.97] touch-manipulation sm:hidden"
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
