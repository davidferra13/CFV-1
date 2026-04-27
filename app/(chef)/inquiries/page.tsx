// Chef Inquiry Pipeline - Unified inbox for all channels
// Tabs + list view (Option B from spec - simpler and effective)

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import {
  getInquiries,
  computeReadinessScoresForInquiries,
  getResponseQueue,
} from '@/lib/inquiries/actions'
import type { ReadinessScore, ResponseQueueItem } from '@/lib/inquiries/types'
import { getBookingScoresForOpenInquiries } from '@/lib/analytics/booking-score'
import { getInquiryStatusCounts } from '@/lib/inquiries/batch-status-update'
import { BatchStatusUpdatePanel } from '@/components/inquiries/batch-status-update-panel'
import { BookingScoreBadge } from '@/components/analytics/booking-score-badge'
import { ReadinessScoreBadge } from '@/components/inquiries/readiness-score-badge'

export const metadata: Metadata = { title: 'Inquiries' }
import {
  InquiryStatusBadge,
  InquiryChannelBadge,
} from '@/components/inquiries/inquiry-status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { InquiryQuickActions } from '@/components/inquiries/inquiry-quick-actions'
import { formatDistanceToNow, format, differenceInHours } from 'date-fns'
import type { BookingScore } from '@/lib/analytics/booking-score'
import { isDemoInquiry } from '@/lib/onboarding/demo-data-utils'
import { EmptyState } from '@/components/ui/empty-state'
import { InquiriesOverflowSelect } from '@/components/inquiries/inquiries-overflow-select'
import { GmailSyncStrip } from '@/components/inquiries/gmail-sync-strip'
import { getGmailSyncStatus } from '@/lib/gmail/actions'
import { QuickLogButton } from '@/components/inquiries/quick-log-button'
import { scoreEventUrgency } from '@/lib/inquiries/event-urgency'
import { EventUrgencyBadge } from '@/components/inquiries/event-urgency-badge'

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
  | 'respond_next'

type InquiryListItem = Awaited<ReturnType<typeof getInquiries>>[number]

const OPEN_STATUSES = new Set(['new', 'awaiting_client', 'awaiting_chef', 'quoted'])

function getDisplayName(inquiry: Pick<InquiryListItem, 'client' | 'unknown_fields'>): string {
  if (inquiry.client?.full_name) return inquiry.client.full_name
  const unknown = inquiry.unknown_fields as Record<string, unknown> | null
  return (unknown?.client_name as string) || 'Unknown Lead'
}

async function InquiryList({ filter }: { filter: InquiryFilter }) {
  await requireChef()

  const [allInquiries, bookingScores, readinessScores] = await Promise.all([
    getInquiries(),
    getBookingScoresForOpenInquiries().catch(() => [] as BookingScore[]),
    computeReadinessScoresForInquiries().catch(() => new Map<string, ReadinessScore>()),
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
      <EmptyState
        remy={filter === 'all' ? 'idle' : 'straight-face'}
        title={filter === 'all' ? 'No inquiries yet' : `No ${filter.replace('_', ' ')} inquiries`}
        description={
          filter === 'all'
            ? 'Log your first inquiry to start tracking leads.'
            : 'Try a different filter or log a new inquiry.'
        }
        action={filter === 'all' ? { label: 'New Inquiry', href: '/inquiries/new' } : undefined}
      />
    )
  }

  return (
    <div className="space-y-2">
      {inquiries.map((inquiry) => {
        const name = getDisplayName(inquiry)
        const isNew = inquiry.status === 'new'
        const score = OPEN_STATUSES.has(inquiry.status) ? scoreMap.get(inquiry.id) : undefined
        const readiness = OPEN_STATUSES.has(inquiry.status)
          ? readinessScores.get(inquiry.id)
          : undefined
        const needsChefAction = CHEF_ACTION_STATUSES.has(inquiry.status)
        const urgency = needsChefAction ? getWaitingUrgency(inquiry.updated_at) : null
        const eventUrgency = scoreEventUrgency(inquiry.confirmed_date)

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
                    <Badge variant="info" className="text-xxs px-1.5 py-0">
                      Sample
                    </Badge>
                  )}
                  {score && <BookingScoreBadge score={score} />}
                  {readiness && <ReadinessScoreBadge score={readiness} />}
                  <EventUrgencyBadge urgency={eventUrgency} />
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
                {/* Quick actions - visible on hover for inquiries needing chef action */}
                {needsChefAction && (
                  <div className="mt-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <InquiryQuickActions
                      inquiryId={inquiry.id}
                      status={inquiry.status}
                      clientName={name}
                    />
                  </div>
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
  const [gmailStatus, statusCounts] = await Promise.all([
    getGmailSyncStatus().catch(() => ({
      connected: false,
      lastSyncedAt: null,
    })),
    getInquiryStatusCounts().catch(() => ({} as Record<string, number>)),
  ])

  // Primary tabs (max 6 visible per interface philosophy Section 6)
  const primaryTabs: { value: InquiryFilter; label: string; count?: number }[] = [
    { value: 'all', label: 'All', count: statusCounts['all'] },
    { value: 'respond_next', label: 'Respond Next', count: statusCounts['respond_next'] },
    { value: 'new', label: 'New', count: statusCounts['new'] },
    { value: 'awaiting_chef', label: 'Your Reply', count: statusCounts['awaiting_chef'] },
    { value: 'quoted', label: 'Quoted', count: statusCounts['quoted'] },
  ]

  // Overflow statuses (waiting/terminal states)
  const overflowTabs: { value: InquiryFilter; label: string }[] = [
    { value: 'awaiting_client', label: 'Client Reply' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'closed', label: 'Closed' },
  ]

  const isOverflowActive = overflowTabs.some((t) => t.value === filter)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Inquiry Pipeline</h1>
          <p className="text-stone-400 mt-1">Track every lead from first contact to booked event</p>
          <div className="mt-2">
            <GmailSyncStrip
              connected={gmailStatus.connected}
              lastSyncedAt={gmailStatus.lastSyncedAt}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <QuickLogButton />
          <Link href="/import?mode=inquiries">
            <Button variant="secondary">Paste from Email</Button>
          </Link>
          <Link href="/inquiries/new">
            <Button>New Inquiry</Button>
          </Link>
        </div>
      </div>

      {/* Status Tabs (5 primary + 1 overflow select = 6 controls) */}
      <Card className="p-4">
        <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          {primaryTabs.map((tab) => (
            <Link key={tab.value} href={`/inquiries?status=${tab.value}`}>
              <Button
                size="sm"
                variant={filter === tab.value ? 'primary' : 'secondary'}
                className="shrink-0 whitespace-nowrap"
              >
                {tab.label}
                {tab.count != null && tab.count > 0 && (
                  <span className={`ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-medium ${
                    filter === tab.value
                      ? 'bg-white/20 text-white'
                      : tab.value === 'respond_next' && tab.count > 0
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-stone-600/50 text-stone-300'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </Button>
            </Link>
          ))}
          <InquiriesOverflowSelect
            isActive={isOverflowActive}
            currentValue={filter}
            options={overflowTabs}
          />
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
          {filter === 'respond_next' ? (
            <ResponseQueueList statusCounts={statusCounts} />
          ) : (
            <InquiryList filter={filter} />
          )}
        </Suspense>
      </WidgetErrorBoundary>
    </div>
  )
}

async function ResponseQueueList({ statusCounts }: { statusCounts: Record<string, number> }) {
  const queue = await getResponseQueue(20).catch(() => [] as ResponseQueueItem[])

  if (queue.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-stone-500">
          No inquiries waiting for your response. You're all caught up!
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      <BatchStatusUpdatePanel queueCount={queue.length} />
      {queue.map((item, index) => {
        const isFirst = index === 0
        const eventUrgency = scoreEventUrgency(item.confirmedDate)
        const urgencyColor =
          item.waitingHours >= 48
            ? 'bg-red-500 animate-pulse'
            : item.waitingHours >= 24
              ? 'bg-amber-500'
              : 'bg-emerald-500'

        const readinessColor =
          item.readiness.level === 'ready'
            ? 'text-emerald-700'
            : item.readiness.level === 'almost'
              ? 'text-amber-700'
              : 'text-stone-500'

        return (
          <Link
            key={item.id}
            href={`/inquiries/${item.id}`}
            className={`group block rounded-lg border p-4 hover:shadow-sm transition-all ${
              isFirst
                ? 'border-l-4 border-l-orange-500 bg-orange-50/50 hover:bg-orange-50'
                : 'border-stone-200 hover:bg-stone-50'
            }`}
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${urgencyColor}`}
                    title={`Waiting ${item.waitingHours}h`}
                  />
                  <span className="font-medium text-stone-900">{item.clientName}</span>
                  {isFirst && (
                    <Badge variant="warning" className="text-xxs px-1.5 py-0">
                      Up Next
                    </Badge>
                  )}
                  <EventUrgencyBadge urgency={eventUrgency} />
                  <span className={`text-xs font-medium ${readinessColor}`}>
                    {item.readiness.percent}% ready
                  </span>
                </div>
                {item.occasion && <p className="text-sm text-stone-600 mt-1">{item.occasion}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                {item.confirmedDate && (
                  <p className="text-sm font-medium text-stone-900">
                    {format(new Date(item.confirmedDate), 'MMM d, yyyy')}
                  </p>
                )}
                {item.guestCount && (
                  <p className="text-xs text-stone-500">{item.guestCount} guests</p>
                )}
                <p className="text-xs text-amber-600 mt-1">waiting {item.waitingHours}h</p>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
