// Partner Detail Page — Profile, stats, locations, service history, attribution tools
// Shows comprehensive view of a single referral partner

import { requireChef } from '@/lib/auth/get-user'
import { getPartnerById, getPartnerEvents, getEventsNotAssignedToPartner } from '@/lib/partners/actions'
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
import { Inbox, CalendarCheck, DollarSign, Users, TrendingUp, MapPin } from 'lucide-react'

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

export default async function PartnerDetailPage({
  params,
}: {
  params: { id: string }
}) {
  await requireChef()

  const [partner, partnerEvents, unassignedEvents] = await Promise.all([
    getPartnerById(params.id),
    getPartnerEvents(params.id).catch(() => [] as Awaited<ReturnType<typeof getPartnerEvents>>),
    getEventsNotAssignedToPartner(params.id).catch(() => [] as Awaited<ReturnType<typeof getEventsNotAssignedToPartner>>),
  ])

  if (!partner) notFound()

  // Group events by location for the service history section
  const activeLocations = (partner.partner_locations || []).filter((l: any) => l.is_active !== false)
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
            <h1 className="text-3xl font-bold text-stone-900">{partner.name}</h1>
            <Badge variant="info">{TYPE_LABELS[partner.partner_type] || partner.partner_type}</Badge>
            {partner.is_showcase_visible && <Badge variant="success">Public Showcase</Badge>}
            {partner.status === 'inactive' && <Badge variant="error">Inactive</Badge>}
          </div>
          {partner.contact_name && (
            <p className="text-stone-600 mt-1">Contact: {partner.contact_name}</p>
          )}
          {partner.description && (
            <p className="text-stone-500 mt-2 max-w-2xl">{partner.description}</p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <SharePartnerReportButton partnerId={partner.id} />
          <Link href={`/partners/${partner.id}/report`}>
            <Button variant="secondary">Print Report</Button>
          </Link>
          <Link href={`/partners/${partner.id}/edit`}>
            <Button>Edit Partner</Button>
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Referrals"
          value={partner.stats.inquiry_count}
          icon={Inbox}
        />
        <StatCard
          label="Events"
          value={partner.stats.event_count}
          icon={CalendarCheck}
        />
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
        <StatCard
          label="Total Guests"
          value={partner.stats.total_guests}
          icon={Users}
        />
        <StatCard
          label="Conversion"
          value={`${partner.stats.conversion_rate}%`}
          icon={TrendingUp}
        />
      </div>

      {/* Contact & Booking Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Contact Info</h2>
          <div className="space-y-2 text-sm">
            {partner.email && (
              <p><span className="text-stone-500">Email:</span> <a href={`mailto:${partner.email}`} className="text-brand-600 hover:underline">{partner.email}</a></p>
            )}
            {partner.phone && (
              <p><span className="text-stone-500">Phone:</span> {partner.phone}</p>
            )}
            {partner.website && (
              <p><span className="text-stone-500">Website:</span> <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">{partner.website}</a></p>
            )}
            {partner.booking_url && (
              <p><span className="text-stone-500">Booking:</span> <a href={partner.booking_url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">View Listing</a></p>
            )}
            {!partner.email && !partner.phone && !partner.website && (
              <p className="text-stone-400 italic">No contact info added</p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Internal Notes</h2>
          <div className="space-y-3 text-sm">
            {partner.notes ? (
              <p className="text-stone-700 whitespace-pre-wrap">{partner.notes}</p>
            ) : (
              <p className="text-stone-400 italic">No relationship notes</p>
            )}
            {partner.commission_notes && (
              <div className="pt-3 border-t border-stone-100">
                <p className="text-xs font-medium text-stone-500 mb-1">Commission / Referral Arrangement</p>
                <p className="text-stone-700">{partner.commission_notes}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Locations */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-stone-900">
            Locations ({partner.partner_locations?.length || 0})
          </h2>
        </div>

        <PartnerDetailClient
          partnerId={partner.id}
          locations={(partner.partner_locations || []).map((loc: any) => ({
            ...loc,
            inquiry_count: partner.location_stats[loc.id]?.inquiry_count || 0,
            event_count: partner.location_stats[loc.id]?.event_count || 0,
          }))}
          images={partner.partner_images || []}
        />
      </Card>

      {/* Assign Past Events */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Assign Past Events</h2>
            <p className="text-sm text-stone-500 mt-1">
              Tag historical events to this partner and location for accurate reporting.
            </p>
          </div>
        </div>
        <BulkAssignEvents
          partnerId={partner.id}
          locations={activeLocations.map((l: any) => ({ id: l.id, name: l.name, city: l.city, state: l.state }))}
          events={unassignedEvents}
        />
      </Card>

      {/* Service History */}
      {partnerEvents.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">
            Service History ({partnerEvents.length} event{partnerEvents.length === 1 ? '' : 's'})
          </h2>

          {/* Per-location groupings */}
          {activeLocations.map((loc: any) => {
            const evts = eventsByLocation[loc.id] || []
            if (evts.length === 0) return null
            const totalGuests = evts.reduce((s: number, e) => s + e.guest_count, 0)
            const revenue = evts.filter(e => e.status === 'completed').reduce((s, e) => s + (e.quoted_price_cents || 0), 0)
            return (
              <div key={loc.id} className="mb-6 last:mb-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-stone-400" />
                    <span className="font-medium text-stone-800">{loc.name}</span>
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
                <table className="w-full text-sm border border-stone-200 rounded-lg overflow-hidden">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-stone-500 font-medium">Date</th>
                      <th className="text-left px-3 py-2 text-stone-500 font-medium">Occasion</th>
                      <th className="text-right px-3 py-2 text-stone-500 font-medium">Guests</th>
                      <th className="text-left px-3 py-2 text-stone-500 font-medium">Status</th>
                      <th className="text-right px-3 py-2 text-stone-500 font-medium">Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {evts.map(evt => (
                      <tr key={evt.id} className="hover:bg-stone-50">
                        <td className="px-3 py-2 text-stone-700">
                          {format(new Date(evt.event_date), 'MMM d, yyyy')}
                        </td>
                        <td className="px-3 py-2 text-stone-700">{evt.occasion || '—'}</td>
                        <td className="px-3 py-2 text-right text-stone-700">{evt.guest_count}</td>
                        <td className="px-3 py-2">
                          <Badge variant={evt.status === 'completed' ? 'success' : 'default'}>
                            {evt.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Link href={`/events/${evt.id}`} className="text-xs text-brand-600 hover:underline">
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
            <div className={activeLocations.some((l: any) => (eventsByLocation[l.id] || []).length > 0) ? 'mt-6 pt-6 border-t border-stone-200' : ''}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-stone-700 text-sm">
                  {activeLocations.length > 0 ? 'No specific location' : 'All events'}
                </span>
                <span className="text-sm text-stone-500">
                  {unspecifiedEvents.length} event{unspecifiedEvents.length === 1 ? '' : 's'} · {unspecifiedEvents.reduce((s, e) => s + e.guest_count, 0)} guests
                </span>
              </div>
              <table className="w-full text-sm border border-stone-200 rounded-lg overflow-hidden">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-stone-500 font-medium">Date</th>
                    <th className="text-left px-3 py-2 text-stone-500 font-medium">Occasion</th>
                    <th className="text-right px-3 py-2 text-stone-500 font-medium">Guests</th>
                    <th className="text-left px-3 py-2 text-stone-500 font-medium">Status</th>
                    <th className="text-right px-3 py-2 text-stone-500 font-medium">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {unspecifiedEvents.map(evt => (
                    <tr key={evt.id} className="hover:bg-stone-50">
                      <td className="px-3 py-2 text-stone-700">
                        {format(new Date(evt.event_date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-3 py-2 text-stone-700">{evt.occasion || '—'}</td>
                      <td className="px-3 py-2 text-right text-stone-700">{evt.guest_count}</td>
                      <td className="px-3 py-2">
                        <Badge variant={evt.status === 'completed' ? 'success' : 'default'}>
                          {evt.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Link href={`/events/${evt.id}`} className="text-xs text-brand-600 hover:underline">
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
