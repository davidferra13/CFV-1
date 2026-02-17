// Chef Inquiry Pipeline — Unified inbox for all channels
// Tabs + list view (Option B from spec — simpler and effective)

import { Suspense } from 'react'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getInquiries } from '@/lib/inquiries/actions'
import { InquiryStatusBadge, InquiryChannelBadge } from '@/components/inquiries/inquiry-status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatDistanceToNow, format } from 'date-fns'

type InquiryFilter = 'all' | 'new' | 'awaiting_client' | 'awaiting_chef' | 'quoted' | 'confirmed' | 'closed'

function getDisplayName(inquiry: {
  client: { id: string; full_name: string; email: string; phone: string | null } | null
  unknown_fields: unknown
}): string {
  if (inquiry.client?.full_name) return inquiry.client.full_name
  const unknown = inquiry.unknown_fields as Record<string, unknown> | null
  return (unknown?.client_name as string) || 'Unknown Lead'
}

async function InquiryList({ filter }: { filter: InquiryFilter }) {
  await requireChef()

  let inquiries = await getInquiries()

  // Apply filter
  if (filter === 'closed') {
    inquiries = inquiries.filter(i => i.status === 'declined' || i.status === 'expired')
  } else if (filter !== 'all') {
    inquiries = inquiries.filter(i => i.status === filter)
  }

  if (inquiries.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-stone-500 mb-4">
          {filter === 'all'
            ? 'No inquiries yet. Log your first inquiry!'
            : `No inquiries with status "${filter.replace('_', ' ')}"`}
        </p>
        {filter === 'all' && (
          <Link href="/inquiries/new">
            <Button>Log New Inquiry</Button>
          </Link>
        )}
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {inquiries.map((inquiry) => {
        const name = getDisplayName(inquiry)
        const isNew = inquiry.status === 'new'

        return (
          <Link
            key={inquiry.id}
            href={`/inquiries/${inquiry.id}`}
            className={`block rounded-lg border p-4 hover:shadow-sm transition-all ${
              isNew
                ? 'border-l-4 border-l-amber-500 bg-amber-50/50 hover:bg-amber-50'
                : 'border-stone-200 hover:bg-stone-50'
            }`}
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-stone-900">{name}</span>
                  <InquiryStatusBadge status={inquiry.status as any} />
                  <InquiryChannelBadge channel={inquiry.channel} />
                </div>
                {inquiry.confirmed_occasion && (
                  <p className="text-sm text-stone-600 mt-1">{inquiry.confirmed_occasion}</p>
                )}
                {inquiry.next_action_required && (
                  <p className="text-xs text-brand-600 mt-1">Next: {inquiry.next_action_required}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                {inquiry.confirmed_date && (
                  <p className="text-sm font-medium text-stone-900">
                    {format(new Date(inquiry.confirmed_date), 'MMM d, yyyy')}
                  </p>
                )}
                {inquiry.confirmed_guest_count && (
                  <p className="text-xs text-stone-500">{inquiry.confirmed_guest_count} guests</p>
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
  )
}

export default async function InquiriesPage({
  searchParams
}: {
  searchParams: { status?: InquiryFilter }
}) {
  await requireChef()

  const filter = (searchParams.status || 'all') as InquiryFilter

  const tabs: { value: InquiryFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'new', label: 'New' },
    { value: 'awaiting_client', label: 'Awaiting Client' },
    { value: 'awaiting_chef', label: 'Awaiting Chef' },
    { value: 'quoted', label: 'Quoted' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'closed', label: 'Declined / Expired' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Inquiry Pipeline</h1>
          <p className="text-stone-600 mt-1">Track every lead from first contact to booked event</p>
        </div>
        <Link href="/inquiries/new">
          <Button>+ Log New Inquiry</Button>
        </Link>
      </div>

      {/* Status Tabs */}
      <Card className="p-4">
        <div className="flex gap-2 flex-wrap">
          {tabs.map((tab) => (
            <Link key={tab.value} href={`/inquiries?status=${tab.value}`}>
              <Button
                size="sm"
                variant={filter === tab.value ? 'primary' : 'secondary'}
              >
                {tab.label}
              </Button>
            </Link>
          ))}
        </div>
      </Card>

      {/* Inquiry List */}
      <Suspense fallback={
        <Card className="p-8 text-center">
          <p className="text-stone-500">Loading inquiries...</p>
        </Card>
      }>
        <InquiryList filter={filter} />
      </Suspense>
    </div>
  )
}
