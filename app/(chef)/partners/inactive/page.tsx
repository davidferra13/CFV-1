import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getPartners } from '@/lib/partners/actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'

export const metadata: Metadata = { title: 'Inactive Partners - ChefFlow' }

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

export default async function InactivePartnersPage() {
  await requireChef()

  const partners = await getPartners({ status: 'inactive' })

  return (
    <div className="space-y-6">
      <div>
        <Link href="/partners" className="text-sm text-stone-500 hover:text-stone-300">
          ← All Partners
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Inactive Partners</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {partners.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">
          Partners who are no longer actively generating referrals
        </p>
      </div>

      {partners.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium mb-1">No inactive partners</p>
          <p className="text-stone-400 text-sm mb-4">
            Partners you&apos;ve marked as inactive will appear here
          </p>
          <Link href="/partners">
            <Button variant="secondary" size="sm">
              View All Partners
            </Button>
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
                    <Badge variant="error">Inactive</Badge>
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
