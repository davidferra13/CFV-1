/* eslint-disable @next/next/no-img-element */
// Partner Portal - Location Detail
// Shows full detail for a single location: photos, description, event history.
// No client PII is shown - events display only occasion, date, guest count, status.

import {
  getPartnerLocationChangeRequests,
  getPartnerLocationEvents,
  getPartnerPortalData,
  requestPartnerLocationChange,
} from '@/lib/partners/portal-actions'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { MapPin, Users, Calendar } from '@/components/ui/icons'
import Link from 'next/link'
import {
  PARTNER_LOCATION_PROPOSAL_FIELD_LABELS,
  getPartnerLocationProposalChangedFields,
} from '@/lib/partners/location-change-requests'
import { PartnerLocationChangeForm } from '@/components/partners/partner-location-change-form'

export default async function PartnerLocationDetailPage({ params }: { params: { id: string } }) {
  const [data, events, changeRequests] = await Promise.all([
    getPartnerPortalData(),
    getPartnerLocationEvents(params.id).catch(() => []),
    getPartnerLocationChangeRequests(params.id).catch(() => []),
  ])

  const location = data.locations.find((l) => l.id === params.id)
  if (!location) notFound()

  async function submitChangeRequest(formData: FormData) {
    'use server'

    await requestPartnerLocationChange(params.id, {
      name: `${formData.get('name') || ''}`,
      address: `${formData.get('address') || ''}`,
      city: `${formData.get('city') || ''}`,
      state: `${formData.get('state') || ''}`,
      zip: `${formData.get('zip') || ''}`,
      booking_url: `${formData.get('booking_url') || ''}`,
      description: `${formData.get('description') || ''}`,
      max_guest_count: formData.get('max_guest_count')
        ? Number(formData.get('max_guest_count'))
        : null,
      experience_tags: formData
        .getAll('experience_tags')
        .map((value) => `${value}`)
        .filter(Boolean) as any,
      best_for: formData
        .getAll('best_for')
        .map((value) => `${value}`)
        .filter(Boolean) as any,
      service_types: formData
        .getAll('service_types')
        .map((value) => `${value}`)
        .filter(Boolean) as any,
      partnerNote: `${formData.get('partner_note') || ''}`,
    })
  }

  const completedEvents = events.filter((e) => e.status === 'completed')
  const totalGuests = completedEvents.reduce((sum, e) => sum + (e.guest_count ?? 0), 0)
  const images = location.partner_images.sort(
    (a, b) => (a.display_order ?? 99) - (b.display_order ?? 99)
  )
  const pendingRequest = changeRequests.find((request) => request.status === 'pending') ?? null
  const proposalValues = (pendingRequest?.requested_payload ?? location) as typeof location
  const pendingChanges = pendingRequest
    ? getPartnerLocationProposalChangedFields(location, pendingRequest.requested_payload)
    : []

  return (
    <div className="space-y-8">
      {/* Back nav */}
      <Link href="/partner/locations" className="text-sm text-stone-500 hover:text-stone-200">
        ← All Locations
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

      <div className="rounded-xl border border-stone-700 bg-stone-900 p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-100">Suggest Public Updates</h2>
            <p className="mt-1 text-sm text-stone-500">
              Your chef approves location-page changes before they go live.
            </p>
          </div>
          {pendingRequest ? (
            <span className="rounded-full border border-amber-700/60 bg-amber-950/40 px-3 py-1 text-xs font-medium text-amber-200">
              Pending review
            </span>
          ) : null}
        </div>

        {pendingRequest ? (
          <div className="mt-4 rounded-xl border border-amber-700/40 bg-amber-950/30 p-4">
            <p className="text-sm font-medium text-amber-100">
              Submitted {format(new Date(pendingRequest.created_at), 'MMM d, yyyy')}
            </p>
            {pendingChanges.length > 0 && (
              <p className="mt-2 text-xs text-amber-200">
                Waiting on review for:{' '}
                {pendingChanges
                  .map((field) => PARTNER_LOCATION_PROPOSAL_FIELD_LABELS[field] ?? field)
                  .join(', ')}
              </p>
            )}
            {pendingRequest.partner_note && (
              <p className="mt-3 text-sm text-stone-200">{pendingRequest.partner_note}</p>
            )}
          </div>
        ) : null}

        <PartnerLocationChangeForm
          proposalValues={proposalValues}
          pendingRequest={pendingRequest}
          hasPendingRequest={Boolean(pendingRequest)}
          submitAction={submitChangeRequest}
        />

        {changeRequests.length > 0 && (
          <div className="mt-6 border-t border-stone-800 pt-4">
            <h3 className="text-sm font-semibold text-stone-200">Review History</h3>
            <div className="mt-3 space-y-3">
              {changeRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-stone-100">
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </p>
                    <p className="text-xs text-stone-500">
                      {format(new Date(request.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  {request.partner_note && (
                    <p className="mt-2 text-sm text-stone-300">{request.partner_note}</p>
                  )}
                  {request.review_note && (
                    <p className="mt-2 text-xs text-stone-500">Chef note: {request.review_note}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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
                    <td className="px-4 py-3 text-stone-300">{evt.occasion ?? '-'}</td>
                    <td className="px-4 py-3 text-right text-stone-300">
                      {evt.guest_count ?? '-'}
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
