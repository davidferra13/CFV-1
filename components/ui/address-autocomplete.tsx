// Google Places Address Autocomplete
// Drop-in replacement for text inputs — returns structured address + lat/lng
'use client'

import { useRef, useCallback } from 'react'
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api'

const LIBRARIES: ['places'] = ['places']

export type AddressData = {
  address: string
  city: string
  state: string
  zip: string
  lat: number | null
  lng: number | null
  formattedAddress: string
}

type AddressAutocompleteProps = {
  label?: string
  required?: boolean
  value?: string
  onPlaceSelect: (data: AddressData) => void
  onChange?: (value: string) => void
  placeholder?: string
  helperText?: string
  error?: string
}

function extractAddressComponents(place: google.maps.places.PlaceResult): AddressData {
  const components = place.address_components || []

  let streetNumber = ''
  let route = ''
  let city = ''
  let state = ''
  let zip = ''

  for (const component of components) {
    const types = component.types
    if (types.includes('street_number')) streetNumber = component.long_name
    if (types.includes('route')) route = component.short_name
    if (types.includes('locality')) city = component.long_name
    if (types.includes('sublocality_level_1') && !city) city = component.long_name
    if (types.includes('administrative_area_level_1')) state = component.short_name
    if (types.includes('postal_code')) zip = component.long_name
  }

  return {
    address: streetNumber ? `${streetNumber} ${route}` : route,
    city,
    state,
    zip,
    lat: place.geometry?.location?.lat() ?? null,
    lng: place.geometry?.location?.lng() ?? null,
    formattedAddress: place.formatted_address || '',
  }
}

export function AddressAutocomplete({
  label,
  required,
  value,
  onPlaceSelect,
  onChange,
  placeholder = 'Start typing an address...',
  helperText,
  error,
}: AddressAutocompleteProps) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  })

  const onLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete
  }, [])

  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace()
      if (place.address_components) {
        const data = extractAddressComponents(place)
        onPlaceSelect(data)
      }
    }
  }, [onPlaceSelect])

  const inputClasses = `
    block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100
    placeholder:text-stone-400
    focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20
    disabled:cursor-not-allowed disabled:bg-stone-800 disabled:text-stone-500
    ${error ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20' : ''}
  `.trim()

  // Plain input fallback while Google Maps JS loads (or if no API key)
  if (!isLoaded) {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-stone-300 mb-1.5">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          type="text"
          className={inputClasses}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
        />
        {helperText && <p className="mt-1.5 text-sm text-stone-500">{helperText}</p>}
      </div>
    )
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-stone-300 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <Autocomplete
        onLoad={onLoad}
        onPlaceChanged={onPlaceChanged}
        options={{
          componentRestrictions: { country: 'us' },
          types: ['address'],
        }}
      >
        <input
          type="text"
          className={inputClasses}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
        />
      </Autocomplete>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-sm text-stone-500">{helperText}</p>}
    </div>
  )
}
