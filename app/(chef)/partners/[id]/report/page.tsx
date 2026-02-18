// Partner Report Page — Print-optimized monthly report
// Shows referral performance, events, and location breakdown

import { requireChef } from '@/lib/auth/get-user'
import { getPartnerReportData } from '@/lib/partners/report'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { PartnerReportActions } from '@/components/partners/partner-report-actions'

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

export default async function PartnerReportPage({
  params,
}: {
  params: { id: string }
}) {
  await requireChef()

  const data = await getPartnerReportData(params.id)
  if (!data) notFound()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Actions (not printed) */}
      <div className="print:hidden flex justify-between items-center">
        <Link href={`/partners/${params.id}`}>
          <Button variant="secondary">Back to Partner</Button>
        </Link>
        <PartnerReportActions />
      </div>

      {/* Report Content */}
      <div className="bg-white print:shadow-none" id="partner-report">
        {/* Header */}
        <Card className="p-8 print:shadow-none print:border-none">
          <div className="text-center border-b border-stone-200 pb-6 mb-6">
            <h1 className="text-3xl font-bold text-stone-900">Partner Performance Report</h1>
            <p className="text-lg text-stone-600 mt-2">{data.period.label}</p>
          </div>

          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-stone-900">{data.partner.name}</h2>
              <Badge variant="info" className="mt-1">
                {TYPE_LABELS[data.partner.partner_type] || data.partner.partner_type}
              </Badge>
              {data.partner.contact_name && (
                <p className="text-stone-600 mt-2">Contact: {data.partner.contact_name}</p>
              )}
            </div>
            <div className="text-right text-sm text-stone-500">
              <p>Report Period</p>
              <p className="font-medium text-stone-900">{data.period.label}</p>
            </div>
          </div>
        </Card>

        {/* Summary Stats */}
        <Card className="p-8 print:shadow-none print:border-none">
          <h3 className="text-lg font-semibold text-stone-900 mb-4">Performance Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-stone-900">{data.summary.total_referrals}</p>
              <p className="text-sm text-stone-500">Referrals</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-stone-900">{data.summary.events_completed}</p>
              <p className="text-sm text-stone-500">Events</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-stone-900">{data.summary.guests_served}</p>
              <p className="text-sm text-stone-500">Guests Served</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-600">{formatCents(data.summary.revenue_cents)}</p>
              <p className="text-sm text-stone-500">Revenue</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-stone-900">{data.summary.conversion_rate}%</p>
              <p className="text-sm text-stone-500">Conversion</p>
            </div>
          </div>
        </Card>

        {/* Events List */}
        {data.events.length > 0 && (
          <Card className="p-8 print:shadow-none print:border-none">
            <h3 className="text-lg font-semibold text-stone-900 mb-4">Events This Period</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left py-2 text-stone-500 font-medium">Date</th>
                  <th className="text-left py-2 text-stone-500 font-medium">Occasion</th>
                  <th className="text-right py-2 text-stone-500 font-medium">Guests</th>
                  <th className="text-left py-2 text-stone-500 font-medium">Location</th>
                  <th className="text-left py-2 text-stone-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map(evt => (
                  <tr key={evt.id} className="border-b border-stone-100">
                    <td className="py-2 text-stone-900">
                      {format(new Date(evt.event_date), 'MMM d, yyyy')}
                    </td>
                    <td className="py-2 text-stone-700">{evt.occasion || '—'}</td>
                    <td className="py-2 text-right text-stone-700">{evt.guest_count}</td>
                    <td className="py-2 text-stone-700">{evt.location_name || '—'}</td>
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

        {/* Location Breakdown */}
        {data.location_breakdown.length > 0 && (
          <Card className="p-8 print:shadow-none print:border-none">
            <h3 className="text-lg font-semibold text-stone-900 mb-4">Location Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.location_breakdown.map(loc => (
                <div key={loc.location_id} className="rounded-lg border border-stone-200 p-4">
                  <p className="font-medium text-stone-900">{loc.location_name}</p>
                  <div className="flex gap-6 mt-2 text-sm">
                    <div>
                      <span className="text-stone-500">Referrals:</span>{' '}
                      <span className="font-medium">{loc.referral_count}</span>
                    </div>
                    <div>
                      <span className="text-stone-500">Events:</span>{' '}
                      <span className="font-medium">{loc.event_count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center py-6 text-xs text-stone-400 print:mt-8">
          <p>Generated by ChefFlow on {format(new Date(), 'MMMM d, yyyy')}</p>
          <p className="mt-1">Thank you for being a valued partner!</p>
        </div>
      </div>
    </div>
  )
}
