import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getInquiries } from '@/lib/inquiries/actions'
import {
  InquiryStatusBadge,
  InquiryChannelBadge,
} from '@/components/inquiries/inquiry-status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatDistanceToNow, format } from 'date-fns'

export const metadata: Metadata = { title: 'Declined Inquiries - ChefFlow' }

function getDisplayName(inquiry: {
  client: { id: string; full_name: string; email: string; phone: string | null } | null
  unknown_fields: unknown
}): string {
  if (inquiry.client?.full_name) return inquiry.client.full_name
  const unknown = inquiry.unknown_fields as Record<string, unknown> | null
  return (unknown?.client_name as string) || 'Unknown Lead'
}

export default async function DeclinedInquiriesPage() {
  await requireChef()

  const allInquiries = await getInquiries()
  const inquiries = allInquiries.filter((i) => i.status === 'declined')

  return (
    <div className="space-y-6">
      <div>
        <Link href="/inquiries" className="text-sm text-stone-500 hover:text-stone-300">
          ← All Inquiries
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Declined</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {inquiries.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">Inquiries that were declined or did not move forward</p>
      </div>

      {inquiries.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium mb-1">No declined inquiries</p>
          <p className="text-stone-400 text-sm mb-4">
            Inquiries you&apos;ve declined will appear here for your records
          </p>
          <Link href="/inquiries">
            <Button variant="secondary" size="sm">
              View All Inquiries
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-2">
          {inquiries.map((inquiry) => {
            const name = getDisplayName(inquiry)
            return (
              <Link
                key={inquiry.id}
                href={`/inquiries/${inquiry.id}`}
                className="block rounded-lg border border-stone-700 p-4 hover:shadow-sm transition-all hover:bg-stone-800"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-stone-100">{name}</span>
                      <InquiryStatusBadge status={inquiry.status as any} />
                      <InquiryChannelBadge channel={inquiry.channel} />
                    </div>
                    {inquiry.confirmed_occasion && (
                      <p className="text-sm text-stone-400 mt-1">{inquiry.confirmed_occasion}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    {inquiry.confirmed_date && (
                      <p className="text-sm font-medium text-stone-100">
                        {format(new Date(inquiry.confirmed_date), 'MMM d, yyyy')}
                      </p>
                    )}
                    {inquiry.confirmed_guest_count && (
                      <p className="text-xs text-stone-500">
                        {inquiry.confirmed_guest_count} guests
                      </p>
                    )}
                    <p className="text-xs text-stone-400 mt-1">
                      {formatDistanceToNow(new Date(inquiry.updated_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
