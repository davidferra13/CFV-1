'use client'

/**
 * Vendor Map View
 *
 * Renders national vendors on a Leaflet + OpenStreetMap map.
 * Uses dynamic import with SSR: false because Leaflet requires window/document.
 *
 * DEPENDENCY: requires `leaflet` and `react-leaflet` packages.
 * Install with: npm install leaflet react-leaflet @types/leaflet
 */

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createVendor } from '@/lib/vendors/actions'
import { toast } from 'sonner'
import { Plus, Check } from '@/components/ui/icons'
import { AddressHandoff, ExternalUrlHandoff, PhoneHandoff } from '@/components/ui/handoff-actions'

// Leaflet CSS must be imported for proper rendering
import 'leaflet/dist/leaflet.css'

import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'

type MapVendor = {
  id: string
  name: string
  vendor_type: string
  address: string | null
  city: string
  state: string
  zip: string | null
  phone: string | null
  website: string | null
  lat: number | null
  lng: number | null
}

const VENDOR_TYPE_LABELS: Record<string, string> = {
  butcher: 'Butcher',
  fishmonger: 'Fishmonger',
  greengrocer: 'Produce',
  farm: 'Farm',
  deli: 'Deli',
  cheese: 'Cheese',
  organic: 'Organic',
  specialty: 'Specialty',
  liquor: 'Liquor',
  bakery: 'Bakery',
  other: 'Other',
}

const VENDOR_TYPE_TO_DB: Record<string, string> = {
  butcher: 'butcher',
  fishmonger: 'fishmonger',
  greengrocer: 'produce',
  farm: 'farm',
  deli: 'specialty',
  cheese: 'specialty',
  organic: 'specialty',
  specialty: 'specialty',
  liquor: 'liquor',
  bakery: 'bakery',
  other: 'other',
}

/** Marker fill colors per vendor type */
const TYPE_MARKER_COLORS: Record<string, string> = {
  butcher: '#dc2626', // red-600
  fishmonger: '#2563eb', // blue-600
  greengrocer: '#16a34a', // green-600
  farm: '#65a30d', // lime-600
  deli: '#ea580c', // orange-600
  cheese: '#ca8a04', // yellow-600
  organic: '#059669', // emerald-600
  specialty: '#7c3aed', // violet-600
  liquor: '#9333ea', // purple-600
  bakery: '#d97706', // amber-600
  other: '#78716c', // stone-500
}

/** Badge colors for the popup type label */
const TYPE_BADGE_COLORS: Record<string, string> = {
  butcher: 'bg-red-900/30 text-red-400',
  fishmonger: 'bg-blue-900/30 text-blue-400',
  greengrocer: 'bg-green-900/30 text-green-400',
  farm: 'bg-lime-900/30 text-lime-400',
  deli: 'bg-orange-900/30 text-orange-400',
  cheese: 'bg-yellow-900/30 text-yellow-400',
  organic: 'bg-emerald-900/30 text-emerald-400',
  specialty: 'bg-violet-900/30 text-violet-400',
  liquor: 'bg-purple-900/30 text-purple-400',
  bakery: 'bg-amber-900/30 text-amber-400',
}

/** Fit the map bounds to the current set of vendors */
function FitBounds({ vendors }: { vendors: MapVendor[] }) {
  const map = useMap()
  const fitted = useRef(false)

  useEffect(() => {
    const withCoords = vendors.filter((v) => v.lat != null && v.lng != null)
    if (withCoords.length === 0 || fitted.current) return

    const bounds = withCoords.map((v) => [v.lat!, v.lng!] as [number, number])
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 })
    fitted.current = true
  }, [vendors, map])

  // Reset when vendors change (new search)
  useEffect(() => {
    fitted.current = false
  }, [vendors])

  return null
}

export function VendorMap({
  vendors,
  addedVendorIds,
}: {
  vendors: MapVendor[]
  addedVendorIds?: Set<string>
}) {
  const router = useRouter()
  const [added, setAdded] = useState<Set<string>>(new Set(addedVendorIds))
  const [adding, setAdding] = useState<Record<string, boolean>>({})

  const mappableVendors = vendors.filter((v) => v.lat != null && v.lng != null)
  const unmappableCount = vendors.length - mappableVendors.length

  async function handleAdd(vendor: MapVendor) {
    setAdding((prev) => ({ ...prev, [vendor.id]: true }))
    try {
      await createVendor({
        name: vendor.name,
        vendor_type: VENDOR_TYPE_TO_DB[vendor.vendor_type] || 'other',
        phone: vendor.phone || '',
        email: '',
        address: [vendor.address, vendor.city, vendor.state, vendor.zip].filter(Boolean).join(', '),
        website: vendor.website || '',
        notes: 'Added from national directory. OSM source.',
        is_preferred: false,
      })
      setAdded((prev) => new Set([...prev, vendor.id]))
      toast.success(`${vendor.name} added to your vendors`)
      router.refresh()
    } catch {
      toast.error('Failed to add vendor')
    } finally {
      setAdding((prev) => ({ ...prev, [vendor.id]: false }))
    }
  }

  if (vendors.length === 0) {
    return (
      <div className="bg-stone-900 border border-stone-700 rounded-lg p-8 text-center">
        <p className="text-sm text-stone-500">Search for vendors above to see them on the map.</p>
      </div>
    )
  }

  if (mappableVendors.length === 0) {
    return (
      <div className="bg-stone-900 border border-stone-700 rounded-lg p-8 text-center">
        <p className="text-sm text-stone-500">
          {vendors.length} vendor{vendors.length !== 1 ? 's' : ''} found, but none have location
          coordinates. Switch to list view to see them.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {unmappableCount > 0 && (
        <p className="text-xs text-stone-500">
          Showing {mappableVendors.length} of {vendors.length} on map ({unmappableCount} missing
          coordinates)
        </p>
      )}
      <div
        className="rounded-lg overflow-hidden border border-stone-700"
        style={{ height: '480px' }}
      >
        <MapContainer
          center={[39.8, -98.5]}
          zoom={4}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds vendors={mappableVendors} />
          {mappableVendors.map((vendor) => {
            const color = TYPE_MARKER_COLORS[vendor.vendor_type] || TYPE_MARKER_COLORS.other
            const isAdded = added.has(vendor.id)
            const isAdding = adding[vendor.id]
            const badgeColor =
              TYPE_BADGE_COLORS[vendor.vendor_type] || 'bg-stone-800 text-stone-400'
            const vendorAddress = [vendor.address, vendor.city, vendor.state, vendor.zip]
              .filter(Boolean)
              .join(', ')

            return (
              <CircleMarker
                key={vendor.id}
                center={[vendor.lat!, vendor.lng!]}
                radius={8}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: 0.85,
                  color: '#1c1917',
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="min-w-[200px] text-sm">
                    <div className="font-semibold text-stone-900 mb-1">{vendor.name}</div>
                    <span
                      className={`inline-block text-xs px-1.5 py-0.5 rounded font-medium mb-2 ${badgeColor}`}
                    >
                      {VENDOR_TYPE_LABELS[vendor.vendor_type] || vendor.vendor_type}
                    </span>
                    <div className="text-xs text-stone-600 space-y-0.5">
                      {vendorAddress && (
                        <AddressHandoff address={vendorAddress} lat={vendor.lat} lng={vendor.lng} />
                      )}
                      {vendor.phone && <PhoneHandoff phone={vendor.phone} />}
                      {vendor.website && (
                        <ExternalUrlHandoff href={vendor.website} label="Open website" />
                      )}
                    </div>
                    <button
                      onClick={() => !isAdded && handleAdd(vendor)}
                      disabled={isAdded || isAdding}
                      className={`mt-2 w-full flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                        isAdded
                          ? 'bg-emerald-100 text-emerald-700 cursor-default'
                          : isAdding
                            ? 'bg-stone-200 text-stone-500 cursor-wait'
                            : 'bg-violet-100 text-violet-700 hover:bg-violet-200 cursor-pointer'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3 h-3" /> Added
                        </>
                      ) : isAdding ? (
                        'Adding...'
                      ) : (
                        <>
                          <Plus className="w-3 h-3" /> Add to My Vendors
                        </>
                      )}
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500">
        {Object.entries(TYPE_MARKER_COLORS)
          .filter(([type]) => type !== 'other')
          .filter(([type]) => mappableVendors.some((v) => v.vendor_type === type))
          .map(([type, color]) => (
            <span key={type} className="flex items-center gap-1">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              {VENDOR_TYPE_LABELS[type] || type}
            </span>
          ))}
      </div>
    </div>
  )
}
