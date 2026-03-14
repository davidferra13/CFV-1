// Partner Detail Client Component
// Handles interactive parts: add location form toggle, image upload, location list
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { LocationForm } from '@/components/partners/location-form'
import { deletePartnerLocation } from '@/lib/partners/actions'
import { MapPin, ExternalLink, Users, Inbox, CalendarCheck } from '@/components/ui/icons'
import { ConfirmModal } from '@/components/ui/confirm-modal'

type Location = {
  id: string
  partner_id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  booking_url: string | null
  description: string | null
  notes: string | null
  max_guest_count: number | null
  is_active: boolean
  inquiry_count: number
  event_count: number
}

type Image = {
  id: string
  image_url: string
  caption: string | null
  season: string | null
  display_order: number | null
  location_id: string | null
}

export function PartnerDetailClient({
  partnerId,
  locations,
  images,
}: {
  partnerId: string
  locations: Location[]
  images: Image[]
}) {
  const router = useRouter()
  const [showAddLocation, setShowAddLocation] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteLocationId, setDeleteLocationId] = useState<string | null>(null)

  function handleDeleteLocation(id: string) {
    setDeleteLocationId(id)
  }

  async function handleConfirmedDeleteLocation() {
    if (!deleteLocationId) return
    setDeleteLocationId(null)
    setDeletingId(deleteLocationId)
    try {
      await deletePartnerLocation(deleteLocationId)
      router.refresh()
    } catch {
      alert('Failed to remove location')
    } finally {
      setDeletingId(null)
    }
  }

  function getLocationImages(locationId: string) {
    return images.filter((img) => img.location_id === locationId)
  }

  function getGeneralImages() {
    return images.filter((img) => !img.location_id)
  }

  return (
    <div className="space-y-4">
      {/* Location Cards */}
      {locations.length === 0 && !showAddLocation && (
        <p className="text-stone-400 text-sm italic py-4">No locations added yet</p>
      )}

      {locations.map((loc) => {
        const locImages = getLocationImages(loc.id)
        const cityState = [loc.city, loc.state].filter(Boolean).join(', ')

        return (
          <div
            key={loc.id}
            className={`rounded-lg border p-4 ${loc.is_active ? 'border-stone-700' : 'border-stone-800 bg-stone-800 opacity-75'}`}
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-stone-400" />
                  <span className="font-medium text-stone-100">{loc.name}</span>
                  {!loc.is_active && <Badge variant="error">Inactive</Badge>}
                </div>
                {cityState && <p className="text-sm text-stone-500 mt-1 ml-6">{cityState}</p>}
                {loc.description && (
                  <p className="text-sm text-stone-400 mt-1 ml-6">{loc.description}</p>
                )}
                {loc.max_guest_count && (
                  <p className="text-xs text-stone-400 mt-1 ml-6 flex items-center gap-1">
                    <Users className="h-3 w-3" /> Up to {loc.max_guest_count} guests
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="flex gap-3 text-xs text-center">
                  <div>
                    <p className="text-stone-400">Referrals</p>
                    <p className="font-semibold text-stone-300">{loc.inquiry_count}</p>
                  </div>
                  <div>
                    <p className="text-stone-400">Events</p>
                    <p className="font-semibold text-stone-300">{loc.event_count}</p>
                  </div>
                </div>

                <div className="flex gap-1">
                  {loc.booking_url && (
                    <a
                      href={loc.booking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded hover:bg-stone-700"
                      title="Open booking link"
                    >
                      <ExternalLink className="h-4 w-4 text-stone-400" />
                    </a>
                  )}
                  <button
                    onClick={() => handleDeleteLocation(loc.id)}
                    disabled={deletingId === loc.id}
                    className="p-1.5 rounded hover:bg-red-950 text-stone-400 hover:text-red-600 text-xs"
                    title="Remove location"
                  >
                    {deletingId === loc.id ? '...' : 'Remove'}
                  </button>
                </div>
              </div>
            </div>

            {/* Location Images */}
            {locImages.length > 0 && (
              <div className="mt-3 ml-6 flex gap-2 overflow-x-auto">
                {locImages.map((img) => (
                  <div key={img.id} className="flex-shrink-0 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.image_url}
                      alt={img.caption || loc.name}
                      className="h-20 w-28 object-cover rounded-md"
                    />
                    {img.season && (
                      <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                        {img.season}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* General Partner Images */}
      {getGeneralImages().length > 0 && (
        <div className="pt-4 border-t border-stone-800">
          <p className="text-sm font-medium text-stone-300 mb-2">General Images</p>
          <div className="flex gap-2 overflow-x-auto">
            {getGeneralImages().map((img) => (
              <div key={img.id} className="flex-shrink-0 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.image_url}
                  alt={img.caption || 'Partner image'}
                  className="h-20 w-28 object-cover rounded-md"
                />
                {img.season && (
                  <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                    {img.season}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Location */}
      {showAddLocation ? (
        <Card className="p-4 border-dashed">
          <h3 className="text-sm font-semibold text-stone-100 mb-3">Add New Location</h3>
          <LocationForm
            partnerId={partnerId}
            onSuccess={() => {
              setShowAddLocation(false)
              router.refresh()
            }}
          />
        </Card>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => setShowAddLocation(true)}>
          + Add Location
        </Button>
      )}

      <ConfirmModal
        open={deleteLocationId !== null}
        title="Remove this location?"
        description="If it has linked inquiries or events, it will be deactivated instead."
        confirmLabel="Remove"
        variant="danger"
        loading={deletingId !== null}
        onConfirm={handleConfirmedDeleteLocation}
        onCancel={() => setDeleteLocationId(null)}
      />
    </div>
  )
}
