// Client Inquiry List — /my-inquiries
// Shows the client's active inquiries in order of most recent first.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireClient } from '@/lib/auth/get-user'
import { getClientInquiries, type ClientInquiryListItem } from '@/lib/inquiries/client-actions'
import { Card } from '@/components/ui/card'
import { InquiryStatusBadge } from '@/components/inquiries/inquiry-status-badge'
import { format } from 'date-fns'
import { ChevronRight, ClipboardList } from '@/components/ui/icons'

export const metadata: Metadata = {
  title: 'My Inquiries - ChefFlow',
  description: 'Track the status of your catering inquiries.',
}

function InquiryCard({ inquiry }: { inquiry: ClientInquiryListItem }) {
  return (
    <Link href={`/my-inquiries/${inquiry.id}`}>
      <Card className="p-4 hover:shadow-md hover:border-stone-600 transition-all cursor-pointer group">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <InquiryStatusBadge status={inquiry.status as any} />
            </div>
            <p className="font-semibold text-stone-100 truncate">
              {inquiry.confirmed_occasion || 'Catering Inquiry'}
            </p>
            <p className="text-sm text-stone-500">
              {inquiry.confirmed_date
                ? format(new Date(inquiry.confirmed_date), 'MMMM d, yyyy')
                : 'Date to be confirmed'}
              {inquiry.confirmed_guest_count ? ` · ${inquiry.confirmed_guest_count} guests` : ''}
              {inquiry.confirmed_location ? ` · ${inquiry.confirmed_location}` : ''}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-brand-600 transition-colors shrink-0" />
        </div>
      </Card>
    </Link>
  )
}

export default async function MyInquiriesPage() {
  await requireClient()
  const inquiries = await getClientInquiries()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-100">My Inquiries</h1>
        <p className="text-stone-500 mt-1">Track the status of your catering requests.</p>
      </div>

      {inquiries.length === 0 ? (
        <Card className="p-10 flex flex-col items-center text-center gap-3">
          <ClipboardList className="w-10 h-10 text-stone-300" />
          <p className="text-stone-500 font-medium">No active inquiries</p>
          <p className="text-sm text-stone-400">
            Submit an inquiry from a chef&apos;s page to get started.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {inquiries.map((inquiry) => (
            <InquiryCard key={inquiry.id} inquiry={inquiry} />
          ))}
        </div>
      )}
    </div>
  )
}
