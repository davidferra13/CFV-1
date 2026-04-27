// Partner Portal Dashboard
// The partner's home base - stats, location cards, recent events, and their
// partnership origin story. Tone: pride, warmth, validation.
// No financial data shown here. Exposure IS the value.

import NextImage from 'next/image'
import { getPartnerPortalData, getMyPayouts } from '@/lib/partners/portal-actions'
import { PartnerPayoutHistory } from '@/components/partners/partner-payout-history'
import { format } from 'date-fns'
import { MapPin, CalendarDays, Users, Image, Heart } from '@/components/ui/icons'
import Link from 'next/link'
import { PartnerReferralStats } from '@/components/partners/partner-referral-stats'

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number
  icon: typeof MapPin
}) {
  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={15} className="text-stone-400" />
        <span className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</span>
      </div>
      <p className="text-3xl font-bold text-stone-100">{value}</p>
    </div>
  )
}

export default async function PartnerDashboardPage() {
  const [data, payoutData] = await Promise.all([getPartnerPortalData(), getMyPayouts()])

  const { partner, locations, recentEvents, stats, originClientName, originEventSummary } = data

  // Group events by location for the recent list
  const locationMap = Object.fromEntries(locations.map((l) => [l.id, l]))

  // Recent 10 events
  const displayEvents = recentEvents.slice(0, 10)

  // Cover images across all locations for the photo mosaic
  const allPhotos = locations
    .flatMap((l) => l.partner_images)
    .sort((a, b) => (a.display_order ?? 99) - (b.display_order ?? 99))
    .slice(0, 6)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Welcome back, {partner.name}</h1>
        <p className="mt-1 text-stone-500">
          Here's the impact your space is making - every event below happened because of you.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Locations" value={stats.totalLocations} icon={MapPin} />
        <StatCard label="Events Hosted" value={stats.totalEvents} icon={CalendarDays} />
        <StatCard label="Guests Served" value={stats.totalGuests.toLocaleString()} icon={Users} />
        <StatCard label="Photos" value={stats.totalPhotos} icon={Image} />
      </div>

      {/* Referral impact stats */}
      <PartnerReferralStats />

      {/* Partnership origin story */}
      {(originClientName || originEventSummary) && (
        <div className="rounded-xl border border-amber-200 bg-amber-950 p-5">
          <div className="flex items-start gap-3">
            <Heart size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-amber-900 mb-1">Your partnership story</h2>
              <p className="text-sm text-amber-800">
                {originClientName && originEventSummary
                  ? `This partnership began when a guest (${originClientName}) hosted a ${originEventSummary} at your space. They were so impressed, they reached out about becoming a partner.`
                  : originEventSummary
                    ? `This partnership began with a ${originEventSummary} at your space. One great event changed everything.`
                    : `This partnership began through a client referral - proof that great experiences create lasting relationships.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Locations grid */}
      {locations.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-stone-100">Your Locations</h2>
            <Link href="/partner/locations" className="text-sm text-stone-500 hover:text-stone-200">
              Manage →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {locations
              .filter((l) => l.is_active)
              .map((location) => {
                const coverImg = location.partner_images?.[0]?.image_url ?? null
                const eventCount = recentEvents.filter(
                  (e) => e.partner_location_id === location.id
                ).length

                return (
                  <Link
                    key={location.id}
                    href={`/partner/locations/${location.id}`}
                    className="rounded-xl border border-stone-700 bg-stone-900 overflow-hidden hover:border-stone-600 hover:shadow-sm transition-all"
                  >
                    {/* Cover image */}
                    {coverImg ? (
                      <div className="relative h-36 bg-stone-800 overflow-hidden">
                        <NextImage
                          src={coverImg}
                          alt={location.name}
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-36 bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center">
                        <MapPin size={32} className="text-stone-300" />
                      </div>
                    )}

                    <div className="p-4">
                      <h3 className="font-semibold text-stone-100">{location.name}</h3>
                      {(location.city || location.state) && (
                        <p className="text-sm text-stone-500 mt-0.5">
                          {[location.city, location.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                      <p className="text-xs text-stone-400 mt-2">
                        {eventCount} event{eventCount === 1 ? '' : 's'} hosted
                        {location.max_guest_count
                          ? ` · Up to ${location.max_guest_count} guests`
                          : ''}
                      </p>
                    </div>
                  </Link>
                )
              })}
          </div>
        </div>
      )}

      {/* Recent events */}
      {displayEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-stone-100 mb-4">Recent Events</h2>
          <div className="rounded-xl border border-stone-700 bg-stone-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-800 border-b border-stone-700">
                <tr>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">Occasion</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">Location</th>
                  <th className="text-right px-4 py-3 text-stone-500 font-medium">Guests</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {displayEvents.map((evt) => {
                  const loc = evt.partner_location_id ? locationMap[evt.partner_location_id] : null
                  return (
                    <tr key={evt.id} className="hover:bg-stone-800">
                      <td className="px-4 py-3 text-stone-300">
                        {format(new Date(evt.event_date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3 text-stone-300">{evt.occasion ?? '-'}</td>
                      <td className="px-4 py-3 text-stone-500">{loc?.name ?? '-'}</td>
                      <td className="px-4 py-3 text-right text-stone-300">
                        {evt.guest_count ?? '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payout history */}
      <div>
        <h2 className="text-lg font-semibold text-stone-100 mb-4">Payout History</h2>
        <PartnerPayoutHistory data={payoutData} />
      </div>

      {/* Empty state */}
      {locations.length === 0 && (
        <div className="rounded-xl border border-dashed border-stone-600 bg-stone-900 p-10 text-center">
          <MapPin size={32} className="mx-auto text-stone-300 mb-3" />
          <h3 className="font-semibold text-stone-300 mb-1">No locations yet</h3>
          <p className="text-sm text-stone-500">
            Your chef will add your locations. Check back soon - your showcase is on its way.
          </p>
        </div>
      )}
    </div>
  )
}
