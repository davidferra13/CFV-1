// Google Places Address Autocomplete
// Drop-in replacement for text inputs - returns structured address + lat/lng
'use client'

import {
  useRef,
  useCallback,
  useState,
  type PointerEventHandler,
  type TouchEventHandler,
} from 'react'
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api'
import { useDeferredGoogleMapsLoader } from '@/hooks/use-deferred-google-maps-loader'

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
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  const { shouldLoad, prime } = useDeferredGoogleMapsLoader(Boolean(apiKey))

  if (!apiKey || !shouldLoad) {
    return (
      <AddressTextInput
        label={label}
        required={required}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        helperText={helperText}
        error={error}
        onPointerEnter={prime}
        onTouchStart={prime}
      />
    )
  }

  return (
    <LoadedAddressAutocomplete
      apiKey={apiKey}
      label={label}
      required={required}
      value={value}
      onPlaceSelect={onPlaceSelect}
      onChange={onChange}
      placeholder={placeholder}
      helperText={helperText}
      error={error}
    />
  )
}

type LoadedAddressAutocompleteProps = AddressAutocompleteProps & {
  apiKey: string
}

function LoadedAddressAutocomplete({
  apiKey,
  label,
  required,
  value,
  onPlaceSelect,
  onChange,
  placeholder = 'Start typing an address...',
  helperText,
  error,
}: LoadedAddressAutocompleteProps) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Only load Google Maps script when we have an API key.
  // Empty key triggers an infinite retry loop in the loader.
  const { isLoaded, loadError: sdkError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
    preventGoogleFontsLoading: true,
  })

  // Detect SDK load failures (wrong key, network, referrer restriction)
  if (sdkError && !loadError) {
    console.warn('[address-autocomplete] Google Maps SDK failed to load:', sdkError)
    setLoadError('Address autocomplete unavailable')
  }

  const ready = isLoaded && !!apiKey && !loadError

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
  if (!ready) {
    return (
      <AddressTextInput {...{ label, required, value, onChange, placeholder, helperText, error }} />
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
          fields: ['address_components', 'formatted_address', 'geometry'],
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
      {helperText && !error && <p className="mt-1.5 text-sm text-stone-400">{helperText}</p>}
    </div>
  )
}

type AddressTextInputProps = Pick<
  AddressAutocompleteProps,
  'label' | 'required' | 'value' | 'onChange' | 'placeholder' | 'helperText' | 'error'
> & {
  onPointerEnter?: PointerEventHandler<HTMLInputElement>
  onTouchStart?: TouchEventHandler<HTMLInputElement>
}

function AddressTextInput({
  label,
  required,
  value,
  onChange,
  placeholder,
  helperText,
  error,
  onPointerEnter,
  onTouchStart,
}: AddressTextInputProps) {
  const inputClasses = `
    block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100
    placeholder:text-stone-400
    focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20
    disabled:cursor-not-allowed disabled:bg-stone-800 disabled:text-stone-500
    ${error ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20' : ''}
  `.trim()

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
        onPointerEnter={onPointerEnter}
        onTouchStart={onTouchStart}
        placeholder={placeholder}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-sm text-stone-400">{helperText}</p>}
    </div>
  )
}
