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
import { toast } from 'sonner'
import { useDeferredAction } from '@/lib/hooks/use-deferred-action'
import {
  CHEF_LOCATION_RELATIONSHIP_LABELS,
  LOCATION_BEST_FOR_LABELS,
  LOCATION_EXPERIENCE_TAG_LABELS,
  LOCATION_SERVICE_TYPE_LABELS,
} from '@/lib/partners/location-experiences'

const READINESS_BLOCKER_LABELS: Record<string, string> = {
  missing_name: 'name',
  missing_location: 'address or city/state',
  missing_context: 'description, imagery, or structured context',
}

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
  experience_tags: string[]
  best_for: string[]
  service_types: string[]
  relationship_type: keyof typeof CHEF_LOCATION_RELATIONSHIP_LABELS
  is_public: boolean
  is_featured: boolean
  sort_order: number
  is_active: boolean
  public_readiness?: {
    isReady: boolean
    blockers: string[]
  }
  inquiry_click_count: number
  booking_click_count: number
  inquiry_count: number
  event_count: number
  completed_event_count: number
  total_revenue_cents: number
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
  const [deletedLocationId, setDeletedLocationId] = useState<string | null>(null)
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null)

  const { execute: deferLocationDelete } = useDeferredAction({
    delay: 8000,
    toastMessage: 'Location removed',
    onExecute: async () => {
      if (deletedLocationId) await deletePartnerLocation(deletedLocationId)
      router.refresh()
    },
    onUndo: () => {
      setDeletedLocationId(null)
    },
    onError: (err) => {
      setDeletedLocationId(null)
      toast.error('Failed to remove location')
    },
  })

  function handleDeleteLocation(id: string) {
    setDeletedLocationId(id)
    deferLocationDelete()
  }

  function getLocationImages(locationId: string) {
    return images.filter((img) => img.location_id === locationId)
  }

  function getGeneralImages() {
    return images.filter((img) => !img.location_id)
  }

  function formatCurrency(cents: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
      cents / 100
    )
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
                  {loc.is_featured && <Badge>Featured</Badge>}
                  {!loc.is_public && <Badge variant="warning">Hidden</Badge>}
                  {!loc.is_active && <Badge variant="error">Inactive</Badge>}
                </div>
                {cityState && <p className="text-sm text-stone-500 mt-1 ml-6">{cityState}</p>}
                {loc.description && (
                  <p className="text-sm text-stone-400 mt-1 ml-6">{loc.description}</p>
                )}
                <div className="ml-6 mt-2 flex flex-wrap gap-2">
                  <Badge>{CHEF_LOCATION_RELATIONSHIP_LABELS[loc.relationship_type]}</Badge>
                  {loc.best_for.slice(0, 2).map((value) => (
                    <Badge key={value}>
                      {LOCATION_BEST_FOR_LABELS[value as keyof typeof LOCATION_BEST_FOR_LABELS] ??
                        value}
                    </Badge>
                  ))}
                  {loc.service_types.slice(0, 2).map((value) => (
                    <Badge key={value}>
                      {LOCATION_SERVICE_TYPE_LABELS[
                        value as keyof typeof LOCATION_SERVICE_TYPE_LABELS
                      ] ?? value}
                    </Badge>
                  ))}
                  {loc.experience_tags.slice(0, 2).map((value) => (
                    <Badge key={value}>
                      {LOCATION_EXPERIENCE_TAG_LABELS[
                        value as keyof typeof LOCATION_EXPERIENCE_TAG_LABELS
                      ] ?? value}
                    </Badge>
                  ))}
                </div>
                {loc.max_guest_count && (
                  <p className="text-xs text-stone-400 mt-1 ml-6 flex items-center gap-1">
                    <Users className="h-3 w-3" /> Up to {loc.max_guest_count} guests
                  </p>
                )}
                {loc.public_readiness && !loc.public_readiness.isReady && (
                  <p className="ml-6 mt-2 text-xs text-amber-300">
                    Public location page blocked until this setting has{' '}
                    {loc.public_readiness.blockers
                      .map((blocker) => READINESS_BLOCKER_LABELS[blocker] ?? blocker)
                      .join(', ')}
                    .
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-center">
                  <div>
                    <p className="text-stone-400">Inquiry Clicks</p>
                    <p className="font-semibold text-stone-300">{loc.inquiry_click_count}</p>
                  </div>
                  <div>
                    <p className="text-stone-400">Booking Clicks</p>
                    <p className="font-semibold text-stone-300">{loc.booking_click_count}</p>
                  </div>
                  <div>
                    <p className="text-stone-400">Referrals</p>
                    <p className="font-semibold text-stone-300">{loc.inquiry_count}</p>
                  </div>
                  <div>
                    <p className="text-stone-400">Events</p>
                    <p className="font-semibold text-stone-300">{loc.event_count}</p>
                  </div>
                  <div>
                    <p className="text-stone-400">Completed</p>
                    <p className="font-semibold text-stone-300">{loc.completed_event_count}</p>
                  </div>
                  <div>
                    <p className="text-stone-400">Revenue</p>
                    <p className="font-semibold text-stone-300">
                      {formatCurrency(loc.total_revenue_cents)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingLocationId((current) => (current === loc.id ? null : loc.id))
                    }
                    className="p-1.5 rounded hover:bg-stone-700 text-stone-400 hover:text-stone-200 text-xs"
                    title="Edit location"
                  >
                    {editingLocationId === loc.id ? 'Close' : 'Edit'}
                  </button>
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
                    disabled={deletedLocationId === loc.id}
                    className="p-1.5 rounded hover:bg-red-950 text-stone-400 hover:text-red-600 text-xs"
                    title="Remove location"
                  >
                    {deletedLocationId === loc.id ? '...' : 'Remove'}
                  </button>
                </div>
              </div>
            </div>

            {editingLocationId === loc.id && (
              <Card className="mt-4 border-stone-800 bg-stone-900/70 p-4">
                <h4 className="mb-3 text-sm font-semibold text-stone-100">Edit location</h4>
                <LocationForm
                  partnerId={partnerId}
                  location={loc}
                  onSuccess={() => {
                    setEditingLocationId(null)
                    router.refresh()
                  }}
                />
              </Card>
            )}

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
                      <span className="absolute bottom-1 left-1 text-xxs bg-black/60 text-white px-1.5 py-0.5 rounded">
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
                  <span className="absolute bottom-1 left-1 text-xxs bg-black/60 text-white px-1.5 py-0.5 rounded">
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
    </div>
  )
}
