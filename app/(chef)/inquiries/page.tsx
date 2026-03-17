// Chef Inquiry Pipeline — Unified inbox for all channels
// Tabs + list view (Option B from spec — simpler and effective)

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getInquiries } from '@/lib/inquiries/actions'
import { getBookingScoresForOpenInquiries } from '@/lib/analytics/booking-score'
import { BookingScoreBadge } from '@/components/analytics/booking-score-badge'

export const metadata: Metadata = { title: 'Inquiries - ChefFlow' }
import {
  InquiryStatusBadge,
  InquiryChannelBadge,
} from '@/components/inquiries/inquiry-status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatDistanceToNow, format, differenceInHours } from 'date-fns'
import type { BookingScore } from '@/lib/analytics/booking-score'
import { isDemoInquiry } from '@/lib/onboarding/demo-data-utils'

const CHEF_ACTION_STATUSES = new Set(['new', 'awaiting_chef'])

/** Returns urgency level based on hours waiting for chef action */
function getWaitingUrgency(updatedAt: string): 'ok' | 'warm' | 'hot' {
  const hours = differenceInHours(new Date(), new Date(updatedAt))
  if (hours >= 48) return 'hot'
  if (hours >= 24) return 'warm'
  return 'ok'
}

const URGENCY_STYLES = {
  ok: 'bg-emerald-500',
  warm: 'bg-amber-500',
  hot: 'bg-red-500 animate-pulse',
} as const

const URGENCY_LABELS = {
  ok: 'Responded recently',
  warm: 'Waiting 24h+, respond soon',
  hot: 'Waiting 48h+, urgent',
} as const

type InquiryFilter =
  | 'all'
  | 'new'
  | 'awaiting_client'
  | 'awaiting_chef'
  | 'quoted'
  | 'confirmed'
  | 'closed'

type InquiryListItem = Awaited<ReturnType<typeof getInquiries>>[number]

const OPEN_STATUSES = new Set(['new', 'awaiting_client', 'awaiting_chef', 'quoted'])

function getDisplayName(inquiry: Pick<InquiryListItem, 'client' | 'unknown_fields'>): string {
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

  let inquiries: InquiryListItem[] = allInquiries

  // Apply filter
  if (filter === 'closed') {
    inquiries = inquiries.filter((i) => i.status === 'declined' || i.status === 'expired')
  } else if (filter !== 'all') {
    inquiries = inquiries.filter((i) => i.status === filter)
  }

  // Build score lookup map
  const scoreMap = new Map<string, BookingScore>()
  for (const score of bookingScores) {
    scoreMap.set(score.inquiryId, score)
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
            <Button>New Inquiry</Button>
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
        const score = OPEN_STATUSES.has(inquiry.status) ? scoreMap.get(inquiry.id) : undefined
        const needsChefAction = CHEF_ACTION_STATUSES.has(inquiry.status)
        const urgency = needsChefAction ? getWaitingUrgency(inquiry.updated_at) : null

        return (
          <Link
            key={inquiry.id}
            href={`/inquiries/${inquiry.id}`}
            className={`group block rounded-lg border p-4 hover:shadow-sm transition-all ${
              isNew
                ? 'border-l-4 border-l-amber-500 bg-amber-50/50 hover:bg-amber-50'
                : 'border-stone-200 hover:bg-stone-50'
            }`}
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {urgency && (
                    <span
                      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${URGENCY_STYLES[urgency]}`}
                      title={URGENCY_LABELS[urgency]}
                    />
                  )}
                  <span className="font-medium text-stone-900">{name}</span>
                  <InquiryStatusBadge status={inquiry.status as any} />
                  <InquiryChannelBadge channel={inquiry.channel} />
                  {isDemoInquiry(inquiry) && (
                    <Badge variant="info" className="text-[10px] px-1.5 py-0">
                      Sample
                    </Badge>
                  )}
                  {score && <BookingScoreBadge score={score} />}
                </div>
                {inquiry.confirmed_occasion && (
                  <p className="text-sm text-stone-600 mt-1">{inquiry.confirmed_occasion}</p>
                )}
                {inquiry.next_action_required && (
                  <p className="text-xs text-brand-600 mt-1">
                    Next: {inquiry.next_action_required}
                  </p>
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
                {/* Quick action hints on hover */}
                {needsChefAction && (
                  <p className="text-xs text-brand-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to respond →
                  </p>
                )}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: { status?: InquiryFilter }
}) {
  await requireChef()

  const filter = (searchParams.status || 'all') as InquiryFilter

  const tabs: { value: InquiryFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'new', label: 'New' },
    { value: 'awaiting_client', label: 'Client Reply' },
    { value: 'awaiting_chef', label: 'Your Reply' },
    { value: 'quoted', label: 'Quoted' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'closed', label: 'Closed' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Inquiry Pipeline</h1>
          <p className="text-stone-600 mt-1">Track every lead from first contact to booked event</p>
        </div>
        <Link href="/inquiries/new">
          <Button>New Inquiry</Button>
        </Link>
      </div>

      {/* Status Tabs */}
      <Card className="p-4">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          {tabs.map((tab) => (
            <Link key={tab.value} href={`/inquiries?status=${tab.value}`}>
              <Button
                size="sm"
                variant={filter === tab.value ? 'primary' : 'secondary'}
                className="shrink-0 whitespace-nowrap"
              >
                {tab.label}
              </Button>
            </Link>
          ))}
        </div>
      </Card>

      {/* Inquiry List */}
      <WidgetErrorBoundary name="Inquiry List">
        <Suspense
          fallback={
            <Card className="p-8 text-center">
              <p className="text-stone-500">Loading inquiries...</p>
            </Card>
          }
        >
          <InquiryList filter={filter} />
        </Suspense>
      </WidgetErrorBoundary>
    </div>
  )
}
