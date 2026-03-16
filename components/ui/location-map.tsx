// Location Map Display
// Shows Google Maps when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is configured,
// falls back to an OpenStreetMap embed (free, no key) otherwise.
'use client'

import { useMemo } from 'react'
import { useJsApiLoader, GoogleMap, MarkerF } from '@react-google-maps/api'

type LocationMapProps = {
  lat: number
  lng: number
  zoom?: number
  className?: string
}

// ─── OpenStreetMap fallback (no API key required) ─────────────────────────

function OsmMap({ lat, lng, className = '' }: { lat: number; lng: number; className?: string }) {
  const delta = 0.006
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`
  const largerMapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`

  return (
    <div className={`rounded-lg overflow-hidden min-h-[200px] ${className}`}>
      <iframe
        src={src}
        className="w-full min-h-[200px] border-0 block"
        title="Event location map"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin"
      />
      <div className="text-right px-1 py-0.5 bg-stone-800 border-t border-stone-700">
        <a
          href={largerMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-stone-400 hover:text-stone-400"
        >
          View on OpenStreetMap ↗
        </a>
      </div>
    </div>
  )
}

// ─── Google Maps (requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) ───────────────

function GoogleMapEmbed({ lat, lng, zoom, className = '' }: LocationMapProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  })

  const center = useMemo(() => ({ lat, lng }), [lat, lng])

  if (!isLoaded) {
    return (
      <div
        className={`bg-stone-800 rounded-lg flex items-center justify-center min-h-[200px] ${className}`}
      >
        <span className="text-sm text-stone-400">Loading map...</span>
      </div>
    )
  }

  return (
    <div className={`rounded-lg overflow-hidden min-h-[200px] ${className}`}>
      <GoogleMap
        mapContainerClassName="w-full min-h-[200px]"
        center={center}
        zoom={zoom ?? 15}
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

// ─── Public component - picks implementation based on env config ──────────

export function LocationMap({ lat, lng, zoom = 15, className = '' }: LocationMapProps) {
  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return <OsmMap lat={lat} lng={lng} className={className} />
  }
  return <GoogleMapEmbed lat={lat} lng={lng} zoom={zoom} className={className} />
}
