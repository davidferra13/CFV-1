// Partner Management — List all referral partners with stats
// Shows partner name, type, status, referral count, revenue, and last activity

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getPartners } from '@/lib/partners/actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'

export const metadata: Metadata = { title: 'Partners - ChefFlow' }

const TYPE_LABELS: Record<string, string> = {
  airbnb_host: 'Airbnb Host',
  business: 'Business',
  platform: 'Platform',
  individual: 'Individual',
  venue: 'Venue',
  other: 'Other',
}

const TYPE_VARIANTS: Record<string, 'default' | 'info' | 'success' | 'warning'> = {
  airbnb_host: 'info',
  business: 'success',
  platform: 'warning',
  individual: 'default',
  venue: 'info',
  other: 'default',
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: { type?: string; status?: string }
}) {
  await requireChef()

  const partners = await getPartners({
    partner_type: searchParams.type,
    status: searchParams.status || 'active',
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Partners</h1>
          <p className="text-stone-400 mt-1">
            Track referral sources, manage relationships, and measure partner impact
          </p>
        </div>
        <Link href="/partners/new">
          <Button>+ Add Partner</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-2 flex-wrap">
          <Link href="/partners">
            <Button
              size="sm"
              variant={
                !searchParams.status || searchParams.status === 'active' ? 'primary' : 'secondary'
              }
            >
              Active
            </Button>
          </Link>
          <Link href="/partners?status=inactive">
            <Button
              size="sm"
              variant={searchParams.status === 'inactive' ? 'primary' : 'secondary'}
            >
              Inactive
            </Button>
          </Link>
          <span className="border-l border-stone-700 mx-2" />
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <Link key={value} href={`/partners?type=${value}`}>
              <Button size="sm" variant={searchParams.type === value ? 'primary' : 'secondary'}>
                {label}
              </Button>
            </Link>
          ))}
        </div>
      </Card>

      {/* Partner List */}
      {partners.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-stone-500 mb-4">No partners yet. Add your first referral partner!</p>
          <Link href="/partners/new">
            <Button>+ Add Partner</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-2">
          {partners.map((partner) => (
            <Link
              key={partner.id}
              href={`/partners/${partner.id}`}
              className="block rounded-lg border border-stone-700 p-4 hover:shadow-sm transition-all hover:bg-stone-800"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-stone-100">{partner.name}</span>
                    <Badge variant={TYPE_VARIANTS[partner.partner_type] || 'default'}>
                      {TYPE_LABELS[partner.partner_type] || partner.partner_type}
                    </Badge>
                    {partner.is_showcase_visible && <Badge variant="success">Showcase</Badge>}
                    {partner.status === 'inactive' && <Badge variant="error">Inactive</Badge>}
                  </div>
                  {partner.contact_name && (
                    <p className="text-sm text-stone-500 mt-1">Contact: {partner.contact_name}</p>
                  )}
                  {partner.partner_locations && partner.partner_locations.length > 0 && (
                    <p className="text-xs text-stone-400 mt-1">
                      {partner.partner_locations.length} location
                      {partner.partner_locations.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0 space-y-1">
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="text-stone-400">Referrals</span>
                      <p className="font-semibold text-stone-100">{partner.inquiry_count}</p>
                    </div>
                    <div>
                      <span className="text-stone-400">Events</span>
                      <p className="font-semibold text-stone-100">
                        {partner.completed_event_count}
                      </p>
                    </div>
                    <div>
                      <span className="text-stone-400">Revenue</span>
                      <p className="font-semibold text-stone-100">
                        {formatCents(partner.total_revenue_cents)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-stone-400">
                    Updated {formatDistanceToNow(new Date(partner.updated_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
