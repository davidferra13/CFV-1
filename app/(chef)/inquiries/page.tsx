// Chef Inquiry Pipeline — Unified inbox for all channels
// Tabs + list view (Option B from spec — simpler and effective)

import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getInquiries } from '@/lib/inquiries/actions'
import { getBookingScoresForOpenInquiries } from '@/lib/analytics/booking-score'
import { BookingScoreBadge } from '@/components/analytics/booking-score-badge'

export const metadata: Metadata = { title: 'Inquiries - ChefFlow' }
import { InquiryStatusBadge, InquiryChannelBadge } from '@/components/inquiries/inquiry-status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDistanceToNow, format } from 'date-fns'
import type { BookingScore } from '@/lib/analytics/booking-score'
import { InquiriesViewWrapper } from '@/components/inquiries/inquiries-view-wrapper'

type InquiryFilter = 'all' | 'new' | 'awaiting_client' | 'awaiting_chef' | 'quoted' | 'confirmed' | 'closed'

const OPEN_STATUSES = new Set(['new', 'awaiting_client', 'awaiting_chef', 'quoted'])

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

  const [allInquiries, bookingScores] = await Promise.all([
    getInquiries(),
    getBookingScoresForOpenInquiries().catch(() => [] as BookingScore[]),
  ])

  let inquiries = allInquiries

  // Apply filter
  if (filter === 'closed') {
    inquiries = inquiries.filter(i => i.status === 'declined' || i.status === 'expired')
  } else if (filter !== 'all') {
    inquiries = inquiries.filter(i => i.status === filter)
  }

  // Build score lookup map
  const scoreMap = new Map<string, BookingScore>()
  for (const score of bookingScores) {
    scoreMap.set(score.inquiryId, score)
  }

  if (inquiries.length === 0) {
    return (
      <Card>
        {filter === 'all' ? (
          <EmptyState
            title="No inquiries yet"
            description="Log your first inquiry to start tracking leads from initial contact through to a booked event."
            action={{ label: 'Log New Inquiry', href: '/inquiries/new' }}
          />
        ) : (
          <EmptyState
            title={`No ${filter.replace(/_/g, ' ')} inquiries`}
            description="There are no inquiries matching this status filter right now."
            secondaryAction={{ label: 'View all inquiries', href: '/inquiries' }}
          />
        )}
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {inquiries.map((inquiry) => {
        const name = getDisplayName(inquiry)
        const isNew = inquiry.status === 'new'
        const score = OPEN_STATUSES.has(inquiry.status) ? scoreMap.get(inquiry.id) : undefined

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
                  {score && <BookingScoreBadge score={score} />}
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

  // Fetch all inquiries for the kanban board (always shows all, unfiltered)
  const allInquiries = await getInquiries()

  // Map to the shape KanbanBoard expects
  const kanbanInquiries = allInquiries.map((inquiry) => ({
    id: inquiry.id,
    status: inquiry.status,
    client_name: getDisplayName(inquiry),
    occasion: inquiry.confirmed_occasion ?? undefined,
    event_date: inquiry.confirmed_date ?? undefined,
    guest_count: inquiry.confirmed_guest_count ?? undefined,
    created_at: inquiry.created_at,
  }))

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

      {/* View wrapper: manages list/kanban toggle */}
      <InquiriesViewWrapper inquiries={kanbanInquiries}>
        {/* Status Tabs + List — unchanged, passed as children slot */}
        <div className="space-y-4">
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
      </InquiriesViewWrapper>
    </div>
  )
}
