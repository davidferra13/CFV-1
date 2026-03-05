/* eslint-disable @next/next/no-img-element */
// Partner Portal â€” Locations list
// Shows all locations the partner manages. Read-only overview;
// click into a location for detail and event history.

import { getPartnerPortalData } from '@/lib/partners/portal-actions'
import Link from 'next/link'
import { MapPin, ChevronRight } from 'lucide-react'

export default async function PartnerLocationsPage() {
  const { locations, recentEvents } = await getPartnerPortalData()

  const activeLocations = locations.filter((l) => l.is_active)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">My Locations</h1>
        <p className="mt-1 text-sm text-stone-500">
          These are the spaces your chef works with under your partnership.
        </p>
      </div>

      {activeLocations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-600 bg-stone-900 p-10 text-center">
          <MapPin size={32} className="mx-auto text-stone-300 mb-3" />
          <p className="text-sm text-stone-500">No locations added yet. Your chef will add them.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeLocations.map((location) => {
            const coverImg = location.partner_images?.[0]?.image_url ?? null
            const eventCount = recentEvents.filter(
              (e) => e.partner_location_id === location.id
            ).length
            const completedCount = recentEvents.filter(
              (e) => e.partner_location_id === location.id && e.status === 'completed'
            ).length

            return (
              <Link
                key={location.id}
                href={`/partner/locations/${location.id}`}
                className="flex items-center gap-4 rounded-xl border border-stone-700 bg-stone-900 p-4 hover:border-stone-600 hover:shadow-sm transition-all"
              >
                {/* Thumbnail */}
                {coverImg ? (
                  <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-stone-800">
                    <img
                      src={coverImg}
                      alt={location.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-stone-800 shrink-0 flex items-center justify-center">
                    <MapPin size={20} className="text-stone-300" />
                  </div>
                )}

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-stone-100 truncate">{location.name}</h3>
                  {(location.city || location.state) && (
                    <p className="text-sm text-stone-500">
                      {[location.city, location.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                  <p className="text-xs text-stone-400 mt-1">
                    {completedCount} completed event{completedCount === 1 ? '' : 's'}
                    {location.max_guest_count ? ` Â· Capacity: ${location.max_guest_count}` : ''}
                  </p>
                </div>

                <ChevronRight size={16} className="text-stone-400 shrink-0" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
