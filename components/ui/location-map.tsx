// Location Map Display
// Shows a Google Map with a marker at the given coordinates
'use client'

import { useMemo } from 'react'
import { useJsApiLoader, GoogleMap, MarkerF } from '@react-google-maps/api'

type LocationMapProps = {
  lat: number
  lng: number
  zoom?: number
  className?: string
}

export function LocationMap({ lat, lng, zoom = 15, className = '' }: LocationMapProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  })

  const center = useMemo(() => ({ lat, lng }), [lat, lng])

  if (!isLoaded) {
    return (
      <div
        className={`bg-stone-100 rounded-lg flex items-center justify-center ${className}`}
        style={{ minHeight: 200 }}
      >
        <span className="text-sm text-stone-400">Loading map...</span>
      </div>
    )
  }

  return (
    <div className={`rounded-lg overflow-hidden ${className}`} style={{ minHeight: 200 }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%', minHeight: 200 }}
        center={center}
        zoom={zoom}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        }}
      >
        <MarkerF position={center} />
      </GoogleMap>
    </div>
  )
}
