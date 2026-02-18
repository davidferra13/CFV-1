// Partner Detail Page — Profile, stats, locations, activity
// Shows comprehensive view of a single referral partner

import { requireChef } from '@/lib/auth/get-user'
import { getPartnerById } from '@/lib/partners/actions'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/ui/stat-card'
import { PartnerDetailClient } from '@/components/partners/partner-detail-client'
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

  const partner = await getPartnerById(params.id)
  if (!partner) notFound()

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
        <div className="flex gap-2">
          <Link href={`/partners/${partner.id}/report`}>
            <Button variant="secondary">View Report</Button>
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
    </div>
  )
}
