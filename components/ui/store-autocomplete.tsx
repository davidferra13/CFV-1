// Google Places store autocomplete.
'use client'

import { useCallback, useRef } from 'react'
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api'
import { Input } from '@/components/ui/input'

const LIBRARIES: ['places'] = ['places']

export type StorePlaceData = {
  name: string
  address: string
  place_id: string | null
}

type StoreAutocompleteProps = {
  value: string
  onChange: (value: string) => void
  onPlaceSelect: (data: StorePlaceData) => void
  placeholder?: string
}

export function StoreAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Search store name',
}: StoreAutocompleteProps) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  // Only load Google Maps script when we have an API key.
  // Empty key triggers an infinite retry loop in the loader.
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey || 'SKIP',
    libraries: LIBRARIES,
    preventGoogleFontsLoading: true,
  })
  const ready = isLoaded && !!apiKey

  const onLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete
  }, [])

  const onPlaceChanged = useCallback(() => {
    if (!autocompleteRef.current) return
    const place = autocompleteRef.current.getPlace()
    const selectedName = place.name?.trim()
    const selectedAddress = place.formatted_address?.trim()

    if (!selectedName && !selectedAddress) return

    onPlaceSelect({
      name: selectedName || value.trim(),
      address: selectedAddress || '',
      place_id: place.place_id ?? null,
    })
  }, [onPlaceSelect, value])

  if (!ready) {
    return (
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    )
  }

  return (
    <Autocomplete
      onLoad={onLoad}
      onPlaceChanged={onPlaceChanged}
      options={{
        componentRestrictions: { country: 'us' },
        types: ['establishment'],
        fields: ['name', 'formatted_address', 'place_id'],
      }}
    >
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </Autocomplete>
  )
}
