/* eslint-disable @next/next/no-img-element */
// Partner Portal â€” Location Detail
// Shows full detail for a single location: photos, description, event history.
// No client PII is shown â€” events display only occasion, date, guest count, status.

import { getPartnerPortalData, getPartnerLocationEvents } from '@/lib/partners/portal-actions'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { MapPin, Users, Calendar } from 'lucide-react'
import Link from 'next/link'

export default async function PartnerLocationDetailPage({ params }: { params: { id: string } }) {
  const [data, events] = await Promise.all([
    getPartnerPortalData(),
    getPartnerLocationEvents(params.id).catch(() => []),
  ])

  const location = data.locations.find((l) => l.id === params.id)
  if (!location) notFound()

  const completedEvents = events.filter((e) => e.status === 'completed')
  const totalGuests = completedEvents.reduce((sum, e) => sum + (e.guest_count ?? 0), 0)
  const images = location.partner_images.sort(
    (a, b) => (a.display_order ?? 99) - (b.display_order ?? 99)
  )

  return (
    <div className="space-y-8">
      {/* Back nav */}
      <Link href="/partner/locations" className="text-sm text-stone-500 hover:text-stone-200">
        â† All Locations
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-100">{location.name}</h1>
        {(location.city || location.state) && (
          <p className="flex items-center gap-1.5 mt-1 text-stone-500">
            <MapPin size={14} />
            {[location.address, location.city, location.state, location.zip]
              .filter(Boolean)
              .join(', ')}
          </p>
        )}
      </div>

      {/* Stats strip */}
      <div className="flex gap-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-stone-100">{completedEvents.length}</p>
          <p className="text-xs text-stone-500">Events</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-stone-100">{totalGuests.toLocaleString()}</p>
          <p className="text-xs text-stone-500">Guests served</p>
        </div>
        {location.max_guest_count && (
          <div className="text-center">
            <p className="text-2xl font-bold text-stone-100">{location.max_guest_count}</p>
            <p className="text-xs text-stone-500">Capacity</p>
          </div>
        )}
      </div>

      {/* Description */}
      {location.description && (
        <div className="rounded-xl border border-stone-700 bg-stone-900 p-5">
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-2">
            About this space
          </h2>
          <p className="text-stone-300 text-sm whitespace-pre-wrap">{location.description}</p>
        </div>
      )}

      {/* Photos */}
      {images.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-stone-100 mb-3">Photos</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {images.map((img) => (
              <div key={img.id} className="rounded-xl overflow-hidden aspect-square bg-stone-800">
                <img
                  src={img.image_url}
                  alt={img.caption ?? location.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event history */}
      <div>
        <h2 className="text-lg font-semibold text-stone-100 mb-4">
          Event History ({completedEvents.length})
        </h2>

        {completedEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-700 p-8 text-center">
            <Calendar size={24} className="mx-auto text-stone-300 mb-2" />
            <p className="text-sm text-stone-500">No completed events yet at this location.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-stone-700 bg-stone-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-800 border-b border-stone-700">
                <tr>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">Occasion</th>
                  <th className="text-right px-4 py-3 text-stone-500 font-medium flex items-center justify-end gap-1">
                    <Users size={13} /> Guests
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {completedEvents.map((evt) => (
                  <tr key={evt.id}>
                    <td className="px-4 py-3 text-stone-300">
                      {format(new Date(evt.event_date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-stone-300">{evt.occasion ?? 'â€”'}</td>
                    <td className="px-4 py-3 text-right text-stone-300">
                      {evt.guest_count ?? 'â€”'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
