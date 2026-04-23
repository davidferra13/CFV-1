// Partner Detail Page - Profile, stats, locations, service history, attribution tools
// Shows comprehensive view of a single referral partner

import { requireChef } from '@/lib/auth/get-user'
import {
  getPartnerById,
  getPartnerEvents,
  getPartnerLocationChangeRequests,
  getEventsNotAssignedToPartner,
} from '@/lib/partners/actions'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/ui/stat-card'
import { PartnerDetailClient } from '@/components/partners/partner-detail-client'
import { BulkAssignEvents } from '@/components/partners/bulk-assign-events'
import { SharePartnerReportButton } from '@/components/partners/share-partner-report-button'
import { PartnerInviteButton } from '@/components/partners/partner-invite-button'
import { CopyReferralLinkButton } from '@/components/partners/copy-referral-link-button'
import { PartnerPayoutPanel } from '@/components/partners/partner-payout-panel'
import { LocationChangeRequestReviewForm } from '@/components/partners/location-change-request-review-form'
import { getPartnerPayouts } from '@/lib/partners/payout-actions'
import { Inbox, CalendarCheck, DollarSign, Users, TrendingUp, MapPin } from '@/components/ui/icons'
import { EntityPhotoUpload } from '@/components/entities/entity-photo-upload'
import {
  PARTNER_LOCATION_PROPOSAL_FIELD_LABELS,
  getPartnerLocationProposalChangedFields,
} from '@/lib/partners/location-change-requests'

const TYPE_LABELS: Record<string, string> = {
  airbnb_host: 'Airbnb Host',
  business: 'Business',
  platform: 'Platform',
  individual: 'Individual',
  venue: 'Venue',
  other: 'Other',
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export default async function PartnerDetailPage({ params }: { params: { id: string } }) {
  const chef = await requireChef()
  const db = (await import('@/lib/db/server')).createServerClient()
  const { data: chefRow } = await (db as any)
    .from('chefs')
    .select('public_slug, inquiry_slug')
    .eq('id', chef.entityId)
    .single()
  const chefSlug = chefRow?.inquiry_slug || chefRow?.public_slug || ''

  const [partner, partnerEvents, unassignedEvents, existingPayouts, locationChangeRequests] =
    await Promise.all([
      getPartnerById(params.id),
      getPartnerEvents(params.id).catch(() => [] as Awaited<ReturnType<typeof getPartnerEvents>>),
      getEventsNotAssignedToPartner(params.id).catch(
        () => [] as Awaited<ReturnType<typeof getEventsNotAssignedToPartner>>
      ),
      getPartnerPayouts(params.id).catch(() => []),
      getPartnerLocationChangeRequests(params.id).catch(() => []),
    ])

  if (!partner) notFound()

  // Group events by location for the service history section
  const activeLocations = (partner.partner_locations || []).filter(
    (l: any) => l.is_active !== false
  )
  const eventsByLocation: Record<string, typeof partnerEvents> = {}
  const unspecifiedEvents: typeof partnerEvents = []

  for (const evt of partnerEvents) {
    const key = evt.partner_location_id || 'unspecified'
    if (key === 'unspecified') {
      unspecifiedEvents.push(evt)
    } else {
      if (!eventsByLocation[key]) eventsByLocation[key] = []
      eventsByLocation[key].push(evt)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <EntityPhotoUpload
              entityType="partner"
              entityId={partner.id}
              currentPhotoUrl={(partner as any).cover_image_url ?? null}
              compact
              label="Add image"
            />
            <h1 className="text-3xl font-bold text-stone-100">{partner.name}</h1>
            <Badge variant="info">
              {TYPE_LABELS[partner.partner_type] || partner.partner_type}
            </Badge>
            {partner.is_showcase_visible && <Badge variant="success">Public Showcase</Badge>}
            {partner.status === 'inactive' && <Badge variant="error">Inactive</Badge>}
          </div>
          {partner.contact_name && (
            <p className="text-stone-400 mt-1">Contact: {partner.contact_name}</p>
          )}
          {partner.description && (
            <p className="text-stone-500 mt-2 max-w-2xl">{partner.description}</p>
          )}
        </div>
        <div className="flex flex-col gap-3 flex-wrap items-end">
          <div className="flex gap-2 flex-wrap">
            {chefSlug && (
              <CopyReferralLinkButton
                referralUrl={`${process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'}/chef/${chefSlug}/inquire?ref=${partner.id}`}
              />
            )}
            <SharePartnerReportButton partnerId={partner.id} />
            <Link href={`/partners/${partner.id}/report`}>
              <Button variant="secondary">Print Report</Button>
            </Link>
            <Link href={`/partners/${partner.id}/edit`}>
              <Button>Edit Partner</Button>
            </Link>
          </div>
          {/* Partner portal invite - shown when partner hasn't claimed their account yet */}
          <PartnerInviteButton
            partnerId={partner.id}
            isClaimed={!!(partner as any).claimed_at}
            partnerName={partner.name}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Referrals" value={partner.stats.inquiry_count} icon={Inbox} />
        <StatCard label="Events" value={partner.stats.event_count} icon={CalendarCheck} />
        <StatCard
          label="Completed"
          value={partner.stats.completed_event_count}
          icon={CalendarCheck}
        />
        <StatCard
          label="Revenue"
          value={formatCents(partner.stats.total_revenue_cents)}
          icon={DollarSign}
        />
        <StatCard label="Total Guests" value={partner.stats.total_guests} icon={Users} />
        <StatCard
          label="Conversion"
          value={`${partner.stats.conversion_rate}%`}
          icon={TrendingUp}
        />
      </div>

      {/* Commission Summary - computed from completed events */}
      {(partner as any).commission_type &&
        (partner as any).commission_type !== 'none' &&
        (() => {
          const commType = (partner as any).commission_type as 'percentage' | 'flat_fee'
          const ratePercent = (partner as any).commission_rate_percent as number | null
          const flatCents = (partner as any).commission_flat_cents as number | null
          const completedWithPrice = partnerEvents.filter(
            (e) => e.status === 'completed' && (e.quoted_price_cents ?? 0) > 0
          )
          const totalCommissionCents = completedWithPrice.reduce((sum, e) => {
            if (commType === 'percentage' && ratePercent != null)
              return sum + Math.round(((e.quoted_price_cents ?? 0) * ratePercent) / 100)
            if (commType === 'flat_fee' && flatCents != null) return sum + flatCents
            return sum
          }, 0)
          return (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-stone-100 mb-4">Commission Summary</h2>
              <div className="flex flex-wrap items-start gap-8 mb-4">
                <div>
                  <p className="text-2xl font-bold text-emerald-500">
                    {formatCents(totalCommissionCents)}
                  </p>
                  <p className="text-xs text-stone-500 mt-1">
                    Total earned ({completedWithPrice.length} completed event
                    {completedWithPrice.length !== 1 ? 's' : ''})
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-300">
                    {commType === 'percentage'
                      ? `${ratePercent ?? '?'}% of booking value`
                      : flatCents != null
                        ? `${formatCents(flatCents)} flat fee per event`
                        : 'Flat fee (amount not set)'}
                  </p>
                  <p className="text-xs text-stone-500 mt-1">Commission rate</p>
                </div>
              </div>
              {completedWithPrice.length > 0 ? (
                <table className="w-full text-sm border border-stone-700 rounded-lg overflow-hidden">
                  <thead className="bg-stone-800">
                    <tr>
                      <th className="text-left px-3 py-2 text-stone-500 font-medium">Date</th>
                      <th className="text-left px-3 py-2 text-stone-500 font-medium">Event</th>
                      <th className="text-right px-3 py-2 text-stone-500 font-medium">Booking</th>
                      <th className="text-right px-3 py-2 text-stone-500 font-medium">
                        Commission
                      </th>
                      <th className="text-right px-3 py-2 text-stone-500 font-medium">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {completedWithPrice.map((evt) => {
                      const comm =
                        commType === 'percentage' && ratePercent != null
                          ? Math.round(((evt.quoted_price_cents ?? 0) * ratePercent) / 100)
                          : (flatCents ?? 0)
                      return (
                        <tr key={evt.id} className="hover:bg-stone-800/50">
                          <td className="px-3 py-2 text-stone-300">
                            {format(new Date(evt.event_date), 'MMM d, yyyy')}
                          </td>
                          <td className="px-3 py-2 text-stone-300">{evt.occasion || 'Untitled'}</td>
                          <td className="px-3 py-2 text-right text-stone-300">
                            {formatCents(evt.quoted_price_cents ?? 0)}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-emerald-500">
                            {formatCents(comm)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Link
                              href={`/events/${evt.id}`}
                              className="text-xs text-brand-600 hover:underline"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-stone-400 italic">
                  No completed events with pricing yet.
                </p>
              )}
            </Card>
          )
        })()}

      {/* Payout History - shown when commission type is set */}
      {(partner as any).commission_type &&
        (partner as any).commission_type !== 'none' &&
        (() => {
          const commType = (partner as any).commission_type as 'percentage' | 'flat_fee'
          const ratePercent = (partner as any).commission_rate_percent as number | null
          const flatCents = (partner as any).commission_flat_cents as number | null
          const completedWithPrice = partnerEvents.filter(
            (e) => e.status === 'completed' && (e.quoted_price_cents ?? 0) > 0
          )
          const totalEarnedCents = completedWithPrice.reduce((sum, e) => {
            if (commType === 'percentage' && ratePercent != null)
              return sum + Math.round(((e.quoted_price_cents ?? 0) * ratePercent) / 100)
            if (commType === 'flat_fee' && flatCents != null) return sum + flatCents
            return sum
          }, 0)
          return (
            <PartnerPayoutPanel
              partnerId={partner.id}
              initialPayouts={existingPayouts}
              totalEarnedCents={totalEarnedCents}
            />
          )
        })()}

      {/* Contact & Booking Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-stone-100 mb-4">Contact Info</h2>
          <div className="space-y-2 text-sm">
            {partner.email && (
              <p>
                <span className="text-stone-500">Email:</span>{' '}
                <a href={`mailto:${partner.email}`} className="text-brand-600 hover:underline">
                  {partner.email}
                </a>
              </p>
            )}
            {partner.phone && (
              <p>
                <span className="text-stone-500">Phone:</span> {partner.phone}
              </p>
            )}
            {partner.website && (
              <p>
                <span className="text-stone-500">Website:</span>{' '}
                <a
                  href={partner.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:underline"
                >
                  {partner.website}
                </a>
              </p>
            )}
            {partner.booking_url && (
              <p>
                <span className="text-stone-500">Booking:</span>{' '}
                <a
                  href={partner.booking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:underline"
                >
                  View Listing
                </a>
              </p>
            )}
            {!partner.email && !partner.phone && !partner.website && (
              <p className="text-stone-400 italic">No contact info added</p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-stone-100 mb-4">Internal Notes</h2>
          <div className="space-y-3 text-sm">
            {partner.notes ? (
              <p className="text-stone-300 whitespace-pre-wrap">{partner.notes}</p>
            ) : (
              <p className="text-stone-400 italic">No relationship notes</p>
            )}
            {(partner as any).commission_type && (partner as any).commission_type !== 'none' && (
              <div className="pt-3 border-t border-stone-800">
                <p className="text-xs font-medium text-stone-500 mb-1">Commission</p>
                <p className="text-stone-300 font-medium">
                  {(partner as any).commission_type === 'percentage'
                    ? `${(partner as any).commission_rate_percent ?? '?'}% of booking`
                    : (partner as any).commission_flat_cents != null
                      ? `$${((partner as any).commission_flat_cents / 100).toFixed(2)} flat fee per booking`
                      : 'Flat fee (amount not set)'}
                </p>
              </div>
            )}
            {partner.commission_notes && (
              <div className="pt-3 border-t border-stone-800">
                <p className="text-xs font-medium text-stone-500 mb-1">Commission Notes</p>
                <p className="text-stone-300">{partner.commission_notes}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Acquisition origin - captures the client→event→partner story */}
      {((partner as any).origin_client_id || (partner as any).acquisition_source) && (
        <Card className="p-6">
          <h2 className="text-base font-semibold text-stone-100 mb-3">Partnership Origin</h2>
          <div className="space-y-2 text-sm text-stone-400">
            {(partner as any).acquisition_source && (
              <p>
                <span className="font-medium text-stone-500">Source:</span>{' '}
                {(partner as any).acquisition_source === 'client_event_referral'
                  ? 'Client event referral'
                  : (partner as any).acquisition_source === 'direct_outreach'
                    ? 'Direct outreach'
                    : (partner as any).acquisition_source}
              </p>
            )}
            {(partner as any).claimed_at && (
              <p>
                <span className="font-medium text-stone-500">Portal claimed:</span>{' '}
                {new Date((partner as any).claimed_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Locations */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-stone-100">
            Locations ({partner.partner_locations?.length || 0})
          </h2>
        </div>

        <PartnerDetailClient
          partnerId={partner.id}
          locations={(partner.partner_locations || []).map((loc: any) => ({
            ...loc,
            ...(partner.location_stats[loc.id] || {
              inquiry_click_count: 0,
              booking_click_count: 0,
              inquiry_count: 0,
              event_count: 0,
              completed_event_count: 0,
              total_revenue_cents: 0,
              total_guests: 0,
            }),
          }))}
          images={partner.partner_images || []}
        />
      </Card>

      {locationChangeRequests.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-stone-100">Partner Change Requests</h2>
          <p className="mt-1 text-sm text-stone-500">
            Review partner-authored public location changes before they go live.
          </p>

          <div className="mt-5 space-y-4">
            {locationChangeRequests.map((request) => {
              const location = (partner.partner_locations || []).find(
                (item: any) => item.id === request.location_id
              )
              const changedFields = location
                ? getPartnerLocationProposalChangedFields(
                    location,
                    request.requested_payload as any
                  )
                : []

              return (
                <div
                  key={request.id}
                  className="rounded-2xl border border-stone-800 bg-stone-950/70 p-5"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-stone-100">
                        {location?.name || 'Location request'}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)} ·{' '}
                        {format(new Date(request.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Badge variant={request.status === 'pending' ? 'warning' : 'default'}>
                      {request.status}
                    </Badge>
                  </div>

                  {changedFields.length > 0 && (
                    <p className="mt-3 text-sm text-stone-300">
                      Proposed changes:{' '}
                      {changedFields
                        .map((field) => PARTNER_LOCATION_PROPOSAL_FIELD_LABELS[field] ?? field)
                        .join(', ')}
                    </p>
                  )}

                  {request.partner_note && (
                    <p className="mt-3 text-sm text-stone-300">{request.partner_note}</p>
                  )}

                  {request.review_note && (
                    <p className="mt-3 text-xs text-stone-500">
                      Review note: {request.review_note}
                    </p>
                  )}

                  {request.status === 'pending' && (
                    <LocationChangeRequestReviewForm requestId={request.id} />
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Assign Past Events */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-stone-100">Assign Past Events</h2>
            <p className="text-sm text-stone-500 mt-1">
              Tag historical events to this partner and location for accurate reporting.
            </p>
          </div>
        </div>
        <BulkAssignEvents
          partnerId={partner.id}
          locations={activeLocations.map((l: any) => ({
            id: l.id,
            name: l.name,
            city: l.city,
            state: l.state,
          }))}
          events={unassignedEvents}
        />
      </Card>

      {/* Service History */}
      {partnerEvents.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-stone-100 mb-4">
            Service History ({partnerEvents.length} event{partnerEvents.length === 1 ? '' : 's'})
          </h2>

          {/* Per-location groupings */}
          {activeLocations.map((loc: any) => {
            const evts = eventsByLocation[loc.id] || []
            if (evts.length === 0) return null
            const totalGuests = evts.reduce((s: number, e) => s + e.guest_count, 0)
            const revenue = evts
              .filter((e) => e.status === 'completed')
              .reduce((s, e) => s + (e.quoted_price_cents || 0), 0)
            return (
              <div key={loc.id} className="mb-6 last:mb-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-stone-400" />
                    <span className="font-medium text-stone-200">{loc.name}</span>
                    {(loc.city || loc.state) && (
                      <span className="text-sm text-stone-400">
                        {[loc.city, loc.state].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-stone-500">
                    {evts.length} events · {totalGuests} guests
                    {revenue > 0 && ` · ${formatCents(revenue)}`}
                  </div>
                </div>
                <table className="w-full text-sm border border-stone-700 rounded-lg overflow-hidden">
                  <thead className="bg-stone-800">
                    <tr>
                      <th className="text-left px-3 py-2 text-stone-500 font-medium">Date</th>
                      <th className="text-left px-3 py-2 text-stone-500 font-medium">Occasion</th>
                      <th className="text-right px-3 py-2 text-stone-500 font-medium">Guests</th>
                      <th className="text-left px-3 py-2 text-stone-500 font-medium">Status</th>
                      <th className="text-right px-3 py-2 text-stone-500 font-medium">Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {evts.map((evt) => (
                      <tr key={evt.id} className="hover:bg-stone-800">
                        <td className="px-3 py-2 text-stone-300">
                          {format(new Date(evt.event_date), 'MMM d, yyyy')}
                        </td>
                        <td className="px-3 py-2 text-stone-300">{evt.occasion || '-'}</td>
                        <td className="px-3 py-2 text-right text-stone-300">{evt.guest_count}</td>
                        <td className="px-3 py-2">
                          <Badge variant={evt.status === 'completed' ? 'success' : 'default'}>
                            {evt.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Link
                            href={`/events/${evt.id}`}
                            className="text-xs text-brand-600 hover:underline"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}

          {/* Events with no specific location */}
          {unspecifiedEvents.length > 0 && (
            <div
              className={
                activeLocations.some((l: any) => (eventsByLocation[l.id] || []).length > 0)
                  ? 'mt-6 pt-6 border-t border-stone-700'
                  : ''
              }
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-stone-300 text-sm">
                  {activeLocations.length > 0 ? 'No specific location' : 'All events'}
                </span>
                <span className="text-sm text-stone-500">
                  {unspecifiedEvents.length} event{unspecifiedEvents.length === 1 ? '' : 's'} ·{' '}
                  {unspecifiedEvents.reduce((s, e) => s + e.guest_count, 0)} guests
                </span>
              </div>
              <table className="w-full text-sm border border-stone-700 rounded-lg overflow-hidden">
                <thead className="bg-stone-800">
                  <tr>
                    <th className="text-left px-3 py-2 text-stone-500 font-medium">Date</th>
                    <th className="text-left px-3 py-2 text-stone-500 font-medium">Occasion</th>
                    <th className="text-right px-3 py-2 text-stone-500 font-medium">Guests</th>
                    <th className="text-left px-3 py-2 text-stone-500 font-medium">Status</th>
                    <th className="text-right px-3 py-2 text-stone-500 font-medium">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {unspecifiedEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-stone-800">
                      <td className="px-3 py-2 text-stone-300">
                        {format(new Date(evt.event_date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-3 py-2 text-stone-300">{evt.occasion || '-'}</td>
                      <td className="px-3 py-2 text-right text-stone-300">{evt.guest_count}</td>
                      <td className="px-3 py-2">
                        <Badge variant={evt.status === 'completed' ? 'success' : 'default'}>
                          {evt.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Link
                          href={`/events/${evt.id}`}
                          className="text-xs text-brand-600 hover:underline"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
