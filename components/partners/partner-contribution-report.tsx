// Partner Contribution Report — shared layout
// Used by:
//   - app/(chef)/partners/[id]/report/page.tsx (chef, authenticated)
//   - app/(public)/partner-report/[token]/page.tsx (partner, public)

import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

const TYPE_LABELS: Record<string, string> = {
  airbnb_host: 'Airbnb Host',
  business: 'Business',
  platform: 'Platform',
  individual: 'Individual',
  venue: 'Venue',
  other: 'Other',
}

type ReportEvent = {
  id: string
  occasion: string | null
  event_date: string
  guest_count: number
  status: string
  quoted_price_cents: number | null
  partner_location_id: string | null
}

type ReportLocation = {
  id: string
  name: string
  city: string | null
  state: string | null
  description?: string | null
  max_guest_count?: number | null
}

type PartnerContributionReportProps = {
  partner: {
    name: string
    partner_type: string
    contact_name: string | null
    description: string | null
    cover_image_url: string | null
    locations: ReportLocation[]
  }
  chef: {
    name: string
    profile_image_url: string | null
  } | null
  stats: {
    total_events: number
    total_guests: number
    total_revenue_cents: number
    completed_events: number
  }
  events: ReportEvent[]
  location_map: Record<string, { id: string; name: string; city: string | null; state: string | null }>
  by_location: Record<string, ReportEvent[]>
}

export function PartnerContributionReport({
  partner,
  chef,
  stats,
  events,
  location_map,
  by_location,
}: PartnerContributionReportProps) {
  const unspecified = by_location['unspecified'] || []

  return (
    <div className="space-y-6 max-w-3xl mx-auto" id="partner-contribution-report">
      {/* Header */}
      <Card className="p-8 print:shadow-none print:border-none">
        <div className="text-center border-b border-stone-200 pb-6 mb-6">
          {chef?.profile_image_url && (
            <img
              src={chef.profile_image_url}
              alt={chef.name}
              className="w-16 h-16 rounded-full object-cover mx-auto mb-3"
            />
          )}
          <p className="text-sm font-medium text-stone-500 mb-1">Service Contribution Report</p>
          <h1 className="text-2xl font-bold text-stone-900">
            {chef?.name || 'Your Private Chef'}
          </h1>
          <p className="text-stone-500 mt-1">for {partner.name}</p>
        </div>

        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-stone-900">{partner.name}</h2>
            <Badge variant="info" className="mt-1">
              {TYPE_LABELS[partner.partner_type] || partner.partner_type}
            </Badge>
            {partner.contact_name && (
              <p className="text-stone-600 mt-2 text-sm">Contact: {partner.contact_name}</p>
            )}
            {partner.description && (
              <p className="text-stone-500 mt-2 text-sm max-w-md">{partner.description}</p>
            )}
          </div>
          <div className="text-right text-sm text-stone-500">
            <p>Generated</p>
            <p className="font-medium text-stone-900">{format(new Date(), 'MMMM d, yyyy')}</p>
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      <Card className="p-8 print:shadow-none print:border-none">
        <h3 className="text-lg font-semibold text-stone-900 mb-5">Our Contribution to Your Venue</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <p className="text-3xl font-bold text-stone-900">{stats.total_events}</p>
            <p className="text-sm text-stone-500 mt-1">Events Served</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-stone-900">{stats.completed_events}</p>
            <p className="text-sm text-stone-500 mt-1">Completed</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-stone-900">{stats.total_guests}</p>
            <p className="text-sm text-stone-500 mt-1">Guests Hosted</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-emerald-600">{formatCents(stats.total_revenue_cents)}</p>
            <p className="text-sm text-stone-500 mt-1">Catering Value</p>
          </div>
        </div>
      </Card>

      {/* Per-location breakdown */}
      {partner.locations.length > 0 && (
        <Card className="p-8 print:shadow-none print:border-none">
          <h3 className="text-lg font-semibold text-stone-900 mb-4">By Location</h3>
          <div className="space-y-6">
            {partner.locations.map((loc) => {
              const locEvents = by_location[loc.id] || []
              if (locEvents.length === 0) return null
              const locGuests = locEvents.reduce((s, e) => s + (e.guest_count || 0), 0)
              const locRevenue = locEvents
                .filter((e) => e.status === 'completed')
                .reduce((s, e) => s + (e.quoted_price_cents || 0), 0)

              return (
                <div key={loc.id} className="border border-stone-200 rounded-lg p-5">
                  <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
                    <div>
                      <h4 className="font-semibold text-stone-900">{loc.name}</h4>
                      {(loc.city || loc.state) && (
                        <p className="text-sm text-stone-500">
                          {[loc.city, loc.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium text-stone-900">{locEvents.length} events · {locGuests} guests</p>
                      {locRevenue > 0 && (
                        <p className="text-emerald-600 font-medium">{formatCents(locRevenue)} in catering value</p>
                      )}
                    </div>
                  </div>

                  <table className="w-full text-sm mt-3">
                    <thead>
                      <tr className="border-b border-stone-200">
                        <th className="text-left py-1.5 text-stone-500 font-medium">Date</th>
                        <th className="text-left py-1.5 text-stone-500 font-medium">Occasion</th>
                        <th className="text-right py-1.5 text-stone-500 font-medium">Guests</th>
                        <th className="text-left py-1.5 text-stone-500 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {locEvents.map((evt) => (
                        <tr key={evt.id} className="border-b border-stone-100 last:border-0">
                          <td className="py-1.5 text-stone-700">
                            {format(new Date(evt.event_date), 'MMM d, yyyy')}
                          </td>
                          <td className="py-1.5 text-stone-700">{evt.occasion || '—'}</td>
                          <td className="py-1.5 text-right text-stone-700">{evt.guest_count}</td>
                          <td className="py-1.5">
                            <Badge variant={evt.status === 'completed' ? 'success' : 'default'}>
                              {evt.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Events with no specific location */}
      {unspecified.length > 0 && (
        <Card className="p-8 print:shadow-none print:border-none">
          <h3 className="text-lg font-semibold text-stone-900 mb-4">
            {partner.locations.length > 0 ? 'Additional Events' : 'All Events'}
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="text-left py-2 text-stone-500 font-medium">Date</th>
                <th className="text-left py-2 text-stone-500 font-medium">Occasion</th>
                <th className="text-right py-2 text-stone-500 font-medium">Guests</th>
                <th className="text-left py-2 text-stone-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {unspecified.map((evt) => (
                <tr key={evt.id} className="border-b border-stone-100 last:border-0">
                  <td className="py-2 text-stone-700">
                    {format(new Date(evt.event_date), 'MMM d, yyyy')}
                  </td>
                  <td className="py-2 text-stone-700">{evt.occasion || '—'}</td>
                  <td className="py-2 text-right text-stone-700">{evt.guest_count}</td>
                  <td className="py-2">
                    <Badge variant={evt.status === 'completed' ? 'success' : 'default'}>
                      {evt.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Footer */}
      <div className="text-center py-6 text-xs text-stone-400 print:mt-8">
        <p>Thank you for being a valued partner.</p>
        <p className="mt-1">Generated by ChefFlow · {format(new Date(), 'MMMM d, yyyy')}</p>
      </div>
    </div>
  )
}
