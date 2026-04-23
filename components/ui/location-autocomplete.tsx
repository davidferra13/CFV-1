// Google Places Location Autocomplete for city/region/ZIP inputs
// Uses types: ['(regions)'] for broader location matches (not street addresses)
// Falls back to plain text input if Google Maps API is unavailable
'use client'

import React, { useRef, useCallback, useEffect, useState } from 'react'
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api'
import { useDeferredGoogleMapsLoader } from '@/hooks/use-deferred-google-maps-loader'
import { useGoogleMapsAuthFailure } from '@/hooks/use-google-maps-auth-failure'

const LIBRARIES: ['places'] = ['places']

export type LocationData = {
  city: string
  state: string // two-letter abbreviation
  zip: string
  lat: number | null
  lng: number | null
  displayText: string // "Boston, MA" or "02115"
}

type LocationAutocompleteProps = {
  value: string
  onSelect: (data: LocationData) => void
  onChange?: (text: string) => void
  placeholder?: string
  className?: string
  types?: string[]
  id?: string
  required?: boolean
  name?: string
}

function extractLocationData(place: google.maps.places.PlaceResult): LocationData {
  const components = place.address_components || []

  let city = ''
  let state = ''
  let zip = ''

  for (const component of components) {
    const types = component.types
    if (types.includes('locality')) city = component.long_name
    if (types.includes('sublocality_level_1') && !city) city = component.long_name
    if (types.includes('administrative_area_level_1')) state = component.short_name
    if (types.includes('postal_code')) zip = component.long_name
  }

  // Build display text
  let displayText = ''
  if (city && state) {
    displayText = `${city}, ${state}`
  } else if (zip) {
    displayText = zip
  } else if (place.formatted_address) {
    displayText = place.formatted_address
  }

  return {
    city,
    state,
    zip,
    lat: place.geometry?.location?.lat() ?? null,
    lng: place.geometry?.location?.lng() ?? null,
    displayText,
  }
}

export function LocationAutocomplete({
  value,
  onSelect,
  onChange,
  placeholder = 'City, state, or ZIP code',
  className,
  types = ['(regions)'],
  id,
  required,
  name,
}: LocationAutocompleteProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  const { shouldLoad, prime } = useDeferredGoogleMapsLoader(Boolean(apiKey))

  if (!apiKey || !shouldLoad) {
    return (
      <input
        type="text"
        id={id}
        name={name}
        required={required}
        className={className || defaultInputClass}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onPointerEnter={prime}
        onTouchStart={prime}
        placeholder={placeholder}
      />
    )
  }

  return (
    <LoadedLocationAutocomplete
      apiKey={apiKey}
      value={value}
      onSelect={onSelect}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      types={types}
      id={id}
      required={required}
      name={name}
    />
  )
}

type LoadedLocationAutocompleteProps = LocationAutocompleteProps & {
  apiKey: string
}

function LoadedLocationAutocomplete({
  apiKey,
  value,
  onSelect,
  onChange,
  placeholder = 'City, state, or ZIP code',
  className,
  types = ['(regions)'],
  id,
  required,
  name,
}: LoadedLocationAutocompleteProps) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const authFailed = useGoogleMapsAuthFailure(true)

  // Only load the Google Maps script when we have an API key.
  // Calling useJsApiLoader with an empty key triggers an infinite retry loop.
  const { isLoaded, loadError: sdkError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
    preventGoogleFontsLoading: true,
  })

  useEffect(() => {
    if (!sdkError) return
    console.warn('[location-autocomplete] Google Maps SDK failed to load:', sdkError)
    setLoadError((current) => current ?? 'Location autocomplete unavailable')
  }, [sdkError])

  useEffect(() => {
    if (!authFailed) return
    console.warn('[location-autocomplete] Google Maps authentication failed.')
    setLoadError((current) => current ?? 'Location autocomplete unavailable')
  }, [authFailed])

  const ready = isLoaded && !!apiKey && !loadError

  const onLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete
  }, [])

  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace()
      if (place.address_components || place.geometry) {
        const data = extractLocationData(place)
        onSelect(data)
        onChange?.(data.displayText)
      }
    }
  }, [onSelect, onChange])

  const inputClass = className || defaultInputClass

  // Plain input fallback (no API key or still loading)
  if (!ready) {
    return (
      <input
        type="text"
        id={id}
        name={name}
        required={required}
        className={inputClass}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
      />
    )
  }

  return (
    <Autocomplete
      onLoad={onLoad}
      onPlaceChanged={onPlaceChanged}
      options={{
        componentRestrictions: { country: 'us' },
        fields: ['address_components', 'formatted_address', 'geometry'],
        types,
      }}
    >
      <input
        type="text"
        id={id}
        name={name}
        required={required}
        className={inputClass}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
      />
    </Autocomplete>
  )
}

const defaultInputClass =
  'w-full bg-transparent px-3 py-4 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none'
