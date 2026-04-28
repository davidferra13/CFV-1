'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowUpRight,
  CheckCircle,
  ExternalLink,
  MapPin,
  Phone,
  Share2,
  Star,
  X,
} from '@/components/ui/icons'
import { DirectoryFavoriteButton, type DirectoryFavoriteMode } from './directory-favorite-button'
import { getBusinessTypeLabel, getCuisineLabel } from '@/lib/discover/constants'
import { formatDistanceMiles } from '@/lib/discover/nearby-search'
import type { DirectoryListingSummary } from '@/lib/discover/actions'

import 'leaflet/dist/leaflet.css'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'

type Props = {
  listings: DirectoryListingSummary[]
  total: number
  currentParams: string
  favoriteMode: DirectoryFavoriteMode
  locationContextText: string | null
}

type MapCenter = {
  lat: number
  lon: number
  zoom: number
}

const DEFAULT_CENTER: [number, number] = [39.5, -98.35]

function listingAddress(listing: DirectoryListingSummary) {
  const cityState = [
    listing.city && listing.city !== 'unknown' ? listing.city : null,
    listing.state,
  ]
    .filter(Boolean)
    .join(', ')
  return listing.address?.trim() || cityState || 'Location details pending'
}

function listingSummary(listing: DirectoryListingSummary) {
  return (
    listing.description?.trim() ||
    `${getBusinessTypeLabel(listing.business_type)}${listing.city ? ` in ${listing.city}` : ''}.`
  )
}

function firstPhoto(listing: DirectoryListingSummary) {
  return Array.isArray(listing.photo_urls)
    ? listing.photo_urls.find((url) => typeof url === 'string' && url.trim().length > 0) || null
    : null
}

function cuisineLine(listing: DirectoryListingSummary) {
  const cuisines = Array.isArray(listing.cuisine_types)
    ? listing.cuisine_types
        .filter((cuisine) => cuisine !== 'other')
        .slice(0, 2)
        .map(getCuisineLabel)
    : []

  return [getBusinessTypeLabel(listing.business_type), ...cuisines].filter(Boolean).join(' · ')
}

function directionsHref(listing: DirectoryListingSummary) {
  if (listing.lat != null && listing.lon != null) {
    return `https://www.google.com/maps/search/?api=1&query=${listing.lat},${listing.lon}`
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [listing.name, listing.address, listing.city, listing.state].filter(Boolean).join(', ')
  )}`
}

function mapBounds(listings: DirectoryListingSummary[]) {
  return listings
    .filter((listing) => listing.lat != null && listing.lon != null)
    .map((listing) => [listing.lat!, listing.lon!] as [number, number])
}

function FitListingBounds({ listings }: { listings: DirectoryListingSummary[] }) {
  const map = useMap()
  const fitKey = listings.map((listing) => `${listing.id}:${listing.lat}:${listing.lon}`).join('|')

  useEffect(() => {
    const bounds = mapBounds(listings)
    if (bounds.length === 0) return
    if (bounds.length === 1) {
      map.setView(bounds[0], 13)
      return
    }
    map.fitBounds(bounds, { padding: [38, 38], maxZoom: 13 })
  }, [fitKey, listings, map])

  return null
}

function MapMoveTracker({ onMove }: { onMove: (center: MapCenter) => void }) {
  useMapEvents({
    moveend(event) {
      const map = event.target
      const center = map.getCenter()
      onMove({
        lat: Number(center.lat.toFixed(4)),
        lon: Number(center.lng.toFixed(4)),
        zoom: map.getZoom(),
      })
    },
    zoomend(event) {
      const map = event.target
      const center = map.getCenter()
      onMove({
        lat: Number(center.lat.toFixed(4)),
        lon: Number(center.lng.toFixed(4)),
        zoom: map.getZoom(),
      })
    },
  })

  return null
}

function SearchThisAreaButton({
  movedCenter,
  currentParams,
}: {
  movedCenter: MapCenter | null
  currentParams: string
}) {
  const router = useRouter()

  if (!movedCenter) return null

  return (
    <button
      type="button"
      onClick={() => {
        const params = new URLSearchParams(currentParams)
        params.delete('page')
        params.delete('location')
        params.set('lat', movedCenter.lat.toFixed(4))
        params.set('lon', movedCenter.lon.toFixed(4))
        if (!params.get('radius')) {
          params.set('radius', movedCenter.zoom >= 13 ? '5' : '15')
        }
        router.push(`/nearby?${params.toString()}`)
      }}
      className="absolute left-1/2 top-4 z-[500] -translate-x-1/2 rounded-full border border-stone-700 bg-stone-950 px-4 py-2 text-xs font-semibold text-stone-100 shadow-lg shadow-black/30 transition-colors hover:border-brand-500 hover:text-white"
    >
      Search this area
    </button>
  )
}

function ListingRow({
  listing,
  selected,
  favoriteMode,
  onSelect,
}: {
  listing: DirectoryListingSummary
  selected: boolean
  favoriteMode: DirectoryFavoriteMode
  onSelect: () => void
}) {
  const photo = firstPhoto(listing)
  const distance = formatDistanceMiles(listing.distance_miles)

  return (
    <article
      className={`border-b border-stone-800/80 p-4 transition-colors ${
        selected
          ? 'bg-brand-950/40 ring-1 ring-inset ring-brand-500/40'
          : 'bg-stone-950 hover:bg-stone-900/80'
      }`}
    >
      <div className="flex gap-3">
        <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 gap-3 text-left">
          <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-stone-900">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-stone-600">
                <MapPin className="h-6 w-6" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-1 text-sm font-semibold text-stone-100">{listing.name}</h3>
            </div>
            <p className="mt-1 text-xs text-stone-400">{cuisineLine(listing)}</p>
            <p className="mt-1 line-clamp-1 text-xs text-stone-500">
              {[distance, listingAddress(listing)].filter(Boolean).join(' · ')}
            </p>
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-stone-400">
              {listingSummary(listing)}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-stone-700 px-2 py-0.5 text-[10px] font-medium text-stone-400">
                {listing.status === 'verified'
                  ? 'Verified'
                  : listing.status === 'claimed'
                    ? 'Claimed'
                    : 'Public source'}
              </span>
              {listing.price_range && (
                <span className="rounded-full border border-stone-700 px-2 py-0.5 text-[10px] font-medium text-stone-400">
                  {listing.price_range}
                </span>
              )}
            </div>
          </div>
        </button>
        <div className="flex-shrink-0">
          <DirectoryFavoriteButton
            listingId={listing.id}
            listingName={listing.name}
            initialFavorited={listing.is_favorited}
            mode={favoriteMode}
          />
        </div>
      </div>
    </article>
  )
}

function PlaceDrawer({
  listing,
  favoriteMode,
  onClose,
}: {
  listing: DirectoryListingSummary
  favoriteMode: DirectoryFavoriteMode
  onClose: () => void
}) {
  const photo = firstPhoto(listing)
  const distance = formatDistanceMiles(listing.distance_miles)
  const cuisines = Array.isArray(listing.cuisine_types)
    ? listing.cuisine_types
        .filter((cuisine) => cuisine !== 'other')
        .slice(0, 4)
        .map(getCuisineLabel)
    : []

  return (
    <aside className="absolute inset-y-0 right-0 z-[550] flex w-full max-w-md flex-col border-l border-stone-800 bg-stone-950 shadow-2xl shadow-black/50 md:rounded-l-2xl">
      <div className="flex items-center justify-between border-b border-stone-800 px-4 py-3">
        <div className="min-w-0">
          <h2 className="line-clamp-1 text-lg font-semibold text-stone-100">{listing.name}</h2>
          <p className="text-xs text-stone-500">{cuisineLine(listing)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-stone-500 transition-colors hover:bg-stone-900 hover:text-stone-200"
          aria-label="Close listing details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="h-56 bg-stone-900">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-stone-600">
              <MapPin className="h-10 w-10" />
            </div>
          )}
        </div>

        <div className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            <a
              href={directionsHref(listing)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-brand-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              Directions
            </a>
            {listing.website_url && (
              <a
                href={listing.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-stone-700 px-4 text-xs font-semibold text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-900"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Website
              </a>
            )}
            {listing.phone && (
              <a
                href={`tel:${listing.phone}`}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-stone-700 px-4 text-xs font-semibold text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-900"
              >
                <Phone className="h-3.5 w-3.5" />
                Call
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(
                  `${window.location.origin}/nearby/${listing.slug}`
                )
              }}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-stone-700 px-4 text-xs font-semibold text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-900"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
            <DirectoryFavoriteButton
              listingId={listing.id}
              listingName={listing.name}
              initialFavorited={listing.is_favorited}
              mode={favoriteMode}
            />
          </div>

          <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
            <p className="text-sm leading-relaxed text-stone-300">{listingSummary(listing)}</p>
          </div>

          <div className="divide-y divide-stone-800 rounded-2xl border border-stone-800 bg-stone-950">
            <div className="flex items-start gap-3 p-4">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-400" />
              <div>
                <p className="text-xs font-semibold text-stone-100">{listingAddress(listing)}</p>
                {distance && (
                  <p className="mt-1 text-xs text-stone-500">{distance} from search point</p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3 p-4">
              <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
              <div>
                <p className="text-xs font-semibold text-stone-100">
                  {listing.status === 'verified'
                    ? 'Owner verified'
                    : listing.status === 'claimed'
                      ? 'Owner claimed'
                      : 'Public-source listing'}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  ChefFlow keeps trust state visible before a guest follows through.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4">
              <Star className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
              <div>
                <p className="text-xs font-semibold text-stone-100">
                  {listing.price_range || 'Price not published'}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {cuisines.length > 0
                    ? cuisines.join(', ')
                    : getBusinessTypeLabel(listing.business_type)}
                </p>
              </div>
            </div>
          </div>

          <Link
            href={`/nearby/${listing.slug}`}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-stone-700 text-sm font-semibold text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-900"
          >
            Review full listing
          </Link>
        </div>
      </div>
    </aside>
  )
}

export function NearbyMapDiscovery({
  listings,
  total,
  currentParams,
  favoriteMode,
  locationContextText,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(listings[0]?.id ?? null)
  const [movedCenter, setMovedCenter] = useState<MapCenter | null>(null)
  const lastAutoSelection = useRef(listings[0]?.id ?? null)
  const gridParams = useMemo(() => {
    const params = new URLSearchParams(currentParams)
    params.delete('map')
    const next = params.toString()
    return next ? `/nearby?${next}` : '/nearby'
  }, [currentParams])
  const mappableListings = listings.filter((listing) => listing.lat != null && listing.lon != null)
  const selectedListing =
    listings.find((listing) => listing.id === selectedId) ?? listings[0] ?? null
  const initialCenter = mappableListings[0]
    ? ([mappableListings[0].lat!, mappableListings[0].lon!] as [number, number])
    : DEFAULT_CENTER

  useEffect(() => {
    if (lastAutoSelection.current === listings[0]?.id) return
    lastAutoSelection.current = listings[0]?.id ?? null
    setSelectedId(listings[0]?.id ?? null)
  }, [listings])

  return (
    <section className="overflow-hidden rounded-2xl border border-stone-800 bg-stone-950 shadow-2xl shadow-black/20">
      <div className="flex flex-col border-b border-stone-800 bg-stone-950/95 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
            Map discovery
          </p>
          <h2 className="mt-1 text-lg font-semibold text-stone-100">
            {total.toLocaleString()} live listing{total === 1 ? '' : 's'}
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            {locationContextText ||
              'Move the map, compare cards, and open details without losing context.'}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 md:mt-0">
          <Link
            href="/nearby"
            className="inline-flex h-9 items-center rounded-full border border-stone-700 px-3 text-xs font-semibold text-stone-300 transition-colors hover:border-stone-600 hover:bg-stone-900"
          >
            Reset
          </Link>
          <Link
            href={gridParams}
            className="inline-flex h-9 items-center rounded-full border border-stone-700 px-3 text-xs font-semibold text-stone-300 transition-colors hover:border-stone-600 hover:bg-stone-900"
          >
            Card grid
          </Link>
        </div>
      </div>

      <div className="grid min-h-[720px] lg:grid-cols-[420px_minmax(0,1fr)]">
        <div className="max-h-[720px] overflow-y-auto border-b border-stone-800 lg:border-b-0 lg:border-r">
          {listings.map((listing) => (
            <ListingRow
              key={listing.id}
              listing={listing}
              selected={selectedListing?.id === listing.id}
              favoriteMode={favoriteMode}
              onSelect={() => setSelectedId(listing.id)}
            />
          ))}
        </div>

        <div className="relative min-h-[640px] bg-stone-900">
          {mappableListings.length > 0 ? (
            <>
              <SearchThisAreaButton movedCenter={movedCenter} currentParams={currentParams} />
              <MapContainer
                center={initialCenter}
                zoom={12}
                scrollWheelZoom
                className="h-full min-h-[640px] w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitListingBounds listings={mappableListings} />
                <MapMoveTracker onMove={setMovedCenter} />
                {mappableListings.map((listing) => {
                  const selected = selectedListing?.id === listing.id
                  return (
                    <CircleMarker
                      key={listing.id}
                      center={[listing.lat!, listing.lon!]}
                      radius={selected ? 11 : 7}
                      eventHandlers={{ click: () => setSelectedId(listing.id) }}
                      pathOptions={{
                        color: selected ? '#f5f5f4' : '#1c1917',
                        fillColor:
                          listing.status === 'verified'
                            ? '#059669'
                            : listing.status === 'claimed'
                              ? '#0284c7'
                              : '#ea580c',
                        fillOpacity: 0.95,
                        weight: selected ? 3 : 2,
                      }}
                    >
                      <Popup>
                        <button
                          type="button"
                          onClick={() => setSelectedId(listing.id)}
                          className="min-w-[180px] text-left"
                        >
                          <span className="block text-sm font-semibold text-stone-900">
                            {listing.name}
                          </span>
                          <span className="mt-1 block text-xs text-stone-600">
                            {cuisineLine(listing)}
                          </span>
                        </button>
                      </Popup>
                    </CircleMarker>
                  )
                })}
              </MapContainer>
            </>
          ) : (
            <div className="flex h-full min-h-[640px] items-center justify-center p-8 text-center">
              <div>
                <MapPin className="mx-auto h-8 w-8 text-stone-600" />
                <p className="mt-3 text-sm font-semibold text-stone-200">
                  These results need coordinates before they can appear on the map.
                </p>
                <p className="mt-2 max-w-sm text-xs leading-relaxed text-stone-500">
                  The list still shows real listings. Open a card to review the available address
                  and trust details.
                </p>
              </div>
            </div>
          )}

          {selectedListing && (
            <PlaceDrawer
              listing={selectedListing}
              favoriteMode={favoriteMode}
              onClose={() => setSelectedId(null)}
            />
          )}
        </div>
      </div>
    </section>
  )
}
