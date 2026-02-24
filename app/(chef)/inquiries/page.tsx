// Chef Inquiry Pipeline — Smart Priority Inbox
// Groups inquiries by urgency to reduce overwhelm after Gmail sync floods
// Sections: Needs Response → Follow-Up Due → Awaiting Client → Everything Else

import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getInquiries } from '@/lib/inquiries/actions'
import { getBookingScoresForOpenInquiries } from '@/lib/analytics/booking-score'
import { BookingScoreBadge } from '@/components/analytics/booking-score-badge'
import { scoreInquiry, type LeadScore } from '@/lib/leads/scoring'
import { LeadScoreBadge } from '@/components/inquiries/lead-score-badge'
import { getInquiryUrgencies } from '@/lib/analytics/response-time-actions'
import { computeCompleteness } from '@/lib/leads/completeness'
import { CompletenessRing } from '@/components/inquiries/completeness-ring'

export const metadata: Metadata = { title: 'Inquiries - ChefFlow' }
import {
  InquiryStatusBadge,
  InquiryChannelBadge,
} from '@/components/inquiries/inquiry-status-badge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { NoInquiriesIllustration } from '@/components/ui/branded-illustrations'
import { formatDistanceToNow, format } from 'date-fns'
import type { BookingScore } from '@/lib/analytics/booking-score'
import type { InquiryUrgency } from '@/lib/analytics/response-time-actions'
import type { CompletenessScore } from '@/lib/leads/completeness'
import { InquiriesViewWrapper } from '@/components/inquiries/inquiries-view-wrapper'
import { AlertTriangle, Clock, TrendingUp, BarChart3 } from 'lucide-react'

type InquiryFilter =
  | 'all'
  | 'new'
  | 'awaiting_client'
  | 'awaiting_chef'
  | 'quoted'
  | 'confirmed'
  | 'closed'

const OPEN_STATUSES = new Set(['new', 'awaiting_client', 'awaiting_chef', 'quoted'])

function getDisplayName(inquiry: {
  client: { id: string; full_name: string; email: string; phone: string | null } | null
  unknown_fields: unknown
}): string {
  if (inquiry.client?.full_name) return inquiry.client.full_name
  const unknown = inquiry.unknown_fields as Record<string, unknown> | null
  return (unknown?.client_name as string) || 'Unknown Lead'
}

// Shared row component for inquiry cards
function InquiryRow({
  inquiry,
  scoreMap,
  leadScoreMap,
  urgencyMap,
  completenessMap,
}: {
  inquiry: any
  scoreMap: Map<string, BookingScore>
  leadScoreMap: Map<string, LeadScore>
  urgencyMap: Map<string, InquiryUrgency>
  completenessMap: Map<string, CompletenessScore>
}) {
  const name = getDisplayName(inquiry)
  const isNew = inquiry.status === 'new'
  const score = OPEN_STATUSES.has(inquiry.status) ? scoreMap.get(inquiry.id) : undefined
  const leadScore = OPEN_STATUSES.has(inquiry.status) ? leadScoreMap.get(inquiry.id) : undefined
  const urgency = urgencyMap.get(inquiry.id)
  const completeness = completenessMap.get(inquiry.id)

  // TakeAChef stagnancy tracking
  const isTacNew = inquiry.channel === 'take_a_chef' && inquiry.status === 'new'
  const ageHours = isTacNew
    ? Math.floor((Date.now() - new Date(inquiry.created_at).getTime()) / 3600000)
    : 0
  const isStale = isTacNew && ageHours > 24
  const isUrgent = isTacNew && ageHours > 12
  const chefLikelihood = (inquiry as any).chef_likelihood as string | null

  return (
    <Link
      key={inquiry.id}
      href={`/inquiries/${inquiry.id}`}
      className={`block rounded-lg border p-4 hover:shadow-sm transition-all ${
        isStale
          ? 'border-l-4 border-l-red-500 bg-red-950/50 hover:bg-red-950'
          : isUrgent
            ? 'border-l-4 border-l-orange-500 bg-orange-950/50 hover:bg-orange-950'
            : urgency?.urgencyLevel === 'overdue'
              ? 'border-l-4 border-l-red-500 bg-red-950/30 hover:bg-red-950/50'
              : urgency?.urgencyLevel === 'urgent'
                ? 'border-l-4 border-l-amber-500 bg-amber-950/30 hover:bg-amber-950/50'
                : isNew
                  ? 'border-l-4 border-l-amber-500 bg-amber-950/50 hover:bg-amber-950'
                  : 'border-stone-700 hover:bg-stone-800'
      }`}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-stone-100">{name}</span>
            <InquiryStatusBadge status={inquiry.status as any} />
            <InquiryChannelBadge channel={inquiry.channel} />
            {urgency && !urgency.hasResponse && (
              <Badge
                variant={
                  urgency.urgencyLevel === 'overdue'
                    ? 'error'
                    : urgency.urgencyLevel === 'urgent'
                      ? 'warning'
                      : 'info'
                }
              >
                {urgency.urgencyLevel === 'overdue'
                  ? `No reply ${Math.floor(urgency.hoursWaiting)}h`
                  : urgency.urgencyLevel === 'urgent'
                    ? `Waiting ${Math.floor(urgency.hoursWaiting)}h`
                    : 'New'}
              </Badge>
            )}
            {isTacNew && (
              <Badge variant={isStale ? 'error' : isUrgent ? 'warning' : 'info'}>
                {isStale
                  ? `Stale — ${Math.floor(ageHours / 24)}d`
                  : isUrgent
                    ? `Untouched — ${ageHours}h`
                    : 'Untouched'}
              </Badge>
            )}
            {chefLikelihood && (
              <Badge
                variant={
                  chefLikelihood === 'hot'
                    ? 'error'
                    : chefLikelihood === 'warm'
                      ? 'warning'
                      : 'info'
                }
              >
                {chefLikelihood.charAt(0).toUpperCase() + chefLikelihood.slice(1)}
              </Badge>
            )}
            {score && <BookingScoreBadge score={score} />}
            {leadScore && <LeadScoreBadge score={leadScore} />}
          </div>
          {inquiry.confirmed_occasion && (
            <p className="text-sm text-stone-400 mt-1">{inquiry.confirmed_occasion}</p>
          )}
          {inquiry.next_action_required && (
            <p className="text-xs text-brand-600 mt-1">Next: {inquiry.next_action_required}</p>
          )}
        </div>
        <div className="text-right flex-shrink-0 flex items-start gap-2">
          {completeness && OPEN_STATUSES.has(inquiry.status) && (
            <CompletenessRing completeness={completeness} />
          )}
          <div>
            {inquiry.confirmed_date && (
              <p className="text-sm font-medium text-stone-100">
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
      </div>
    </Link>
  )
}

async function InquiryList({
  filter,
  channelFilter,
}: {
  filter: InquiryFilter
  channelFilter: string | null
}) {
  await requireChef()

  const [allInquiries, bookingScores, urgencies] = await Promise.all([
    getInquiries(),
    getBookingScoresForOpenInquiries().catch(() => [] as BookingScore[]),
    getInquiryUrgencies().catch(() => [] as InquiryUrgency[]),
  ])

  let inquiries = allInquiries

  // Apply channel filter
  if (channelFilter) {
    inquiries = inquiries.filter((i) => i.channel === channelFilter)
  }

  // Apply status filter
  if (filter === 'closed') {
    inquiries = inquiries.filter((i) => i.status === 'declined' || i.status === 'expired')
  } else if (filter !== 'all') {
    inquiries = inquiries.filter((i) => i.status === filter)
  }

  // Build lookup maps
  const scoreMap = new Map<string, BookingScore>()
  for (const score of bookingScores) scoreMap.set(score.inquiryId, score)

  const urgencyMap = new Map<string, InquiryUrgency>()
  for (const u of urgencies) urgencyMap.set(u.inquiryId, u)

  const leadScoreMap = new Map<string, LeadScore>()
  const completenessMap = new Map<string, CompletenessScore>()
  for (const inquiry of allInquiries) {
    if (OPEN_STATUSES.has(inquiry.status)) {
      const ls = await scoreInquiry({
        id: inquiry.id,
        confirmed_budget_cents: inquiry.confirmed_budget_cents,
        confirmed_guest_count: inquiry.confirmed_guest_count,
        confirmed_date: inquiry.confirmed_date,
        channel: inquiry.channel,
        client_id: inquiry.client_id,
        created_at: inquiry.created_at,
      })
      leadScoreMap.set(inquiry.id, ls)

      const cs = computeCompleteness({
        id: inquiry.id,
        confirmed_date: inquiry.confirmed_date,
        confirmed_guest_count: inquiry.confirmed_guest_count,
        confirmed_budget_cents: inquiry.confirmed_budget_cents,
        confirmed_occasion: inquiry.confirmed_occasion,
        confirmed_location: (inquiry as any).confirmed_location,
        confirmed_dietary_restrictions: (inquiry as any).confirmed_dietary_restrictions,
        client_id: inquiry.client_id,
      })
      completenessMap.set(inquiry.id, cs)
    }
  }

  if (inquiries.length === 0) {
    return (
      <Card>
        {filter === 'all' ? (
          <EmptyState
            illustration={<NoInquiriesIllustration />}
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

  // --- Smart Priority Grouping (only for "all" view) ---
  if (filter === 'all') {
    // Group 1: Needs Your Response — new + awaiting_chef with no outbound message
    const needsResponse = inquiries.filter((i) => {
      const u = urgencyMap.get(i.id)
      return (i.status === 'new' || i.status === 'awaiting_chef') && u && !u.hasResponse
    })

    // Group 2: Follow-Up Due — awaiting_client for 3+ days
    const followUpDue = inquiries.filter((i) => {
      if (i.status !== 'awaiting_client' && i.status !== 'quoted') return false
      const u = urgencyMap.get(i.id)
      // If responded but client hasn't replied in 3+ days
      if (!u || !u.hasResponse) return false
      // Check last update > 3 days
      const daysSinceUpdate = (Date.now() - new Date(i.updated_at).getTime()) / (24 * 3600000)
      return daysSinceUpdate >= 3
    })

    // Group 3: Active — everything else that's open
    const needsResponseIds = new Set(needsResponse.map((i) => i.id))
    const followUpIds = new Set(followUpDue.map((i) => i.id))
    const activeOpen = inquiries.filter(
      (i) => OPEN_STATUSES.has(i.status) && !needsResponseIds.has(i.id) && !followUpIds.has(i.id)
    )

    // Group 4: Closed
    const closed = inquiries.filter(
      (i) => i.status === 'declined' || i.status === 'expired' || i.status === 'confirmed'
    )

    const sharedProps = { scoreMap, leadScoreMap, urgencyMap, completenessMap }

    return (
      <div className="space-y-6">
        {/* Needs Response — most urgent */}
        {needsResponse.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wide">
                Needs Your Response ({needsResponse.length})
              </h2>
            </div>
            <div className="space-y-2">
              {needsResponse.map((inquiry) => (
                <InquiryRow key={inquiry.id} inquiry={inquiry} {...sharedProps} />
              ))}
            </div>
          </section>
        )}

        {/* Follow-Up Due */}
        {followUpDue.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
                Follow-Up Due ({followUpDue.length})
              </h2>
            </div>
            <div className="space-y-2">
              {followUpDue.map((inquiry) => (
                <InquiryRow key={inquiry.id} inquiry={inquiry} {...sharedProps} />
              ))}
            </div>
          </section>
        )}

        {/* Active — on track */}
        {activeOpen.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wide">
                Active Pipeline ({activeOpen.length})
              </h2>
            </div>
            <div className="space-y-2">
              {activeOpen.map((inquiry) => (
                <InquiryRow key={inquiry.id} inquiry={inquiry} {...sharedProps} />
              ))}
            </div>
          </section>
        )}

        {/* Closed — collapsed */}
        {closed.length > 0 && (
          <details className="group">
            <summary className="flex items-center gap-2 mb-3 cursor-pointer select-none">
              <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">
                Closed ({closed.length})
              </h2>
              <span className="text-xs text-stone-600 group-open:hidden">Click to expand</span>
            </summary>
            <div className="space-y-2">
              {closed.map((inquiry) => (
                <InquiryRow key={inquiry.id} inquiry={inquiry} {...sharedProps} />
              ))}
            </div>
          </details>
        )}
      </div>
    )
  }

  // --- Flat list for filtered views ---
  return (
    <div className="space-y-2">
      {inquiries.map((inquiry) => (
        <InquiryRow
          key={inquiry.id}
          inquiry={inquiry}
          scoreMap={scoreMap}
          leadScoreMap={leadScoreMap}
          urgencyMap={urgencyMap}
          completenessMap={completenessMap}
        />
      ))}
    </div>
  )
}

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: { status?: InquiryFilter; channel?: string }
}) {
  await requireChef()

  const filter = (searchParams.status || 'all') as InquiryFilter
  const channelFilter = searchParams.channel || null

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
    budget_cents: inquiry.confirmed_budget_cents ?? undefined,
    updated_at: inquiry.updated_at,
    created_at: inquiry.created_at,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Inquiry Pipeline</h1>
          <p className="text-stone-400 mt-1">Track every lead from first contact to booked event</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/analytics/funnel">
            <Button variant="secondary" size="sm">
              <BarChart3 className="h-4 w-4 mr-1" />
              Funnel Analytics
            </Button>
          </Link>
          <Link href="/inquiries/new">
            <Button>+ Log New Inquiry</Button>
          </Link>
        </div>
      </div>

      {/* View wrapper: manages list/kanban toggle */}
      <InquiriesViewWrapper inquiries={kanbanInquiries}>
        {/* Status Tabs + List — unchanged, passed as children slot */}
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex gap-2 flex-wrap items-center">
              {tabs.map((tab) => {
                const href = channelFilter
                  ? `/inquiries?status=${tab.value}&channel=${channelFilter}`
                  : `/inquiries?status=${tab.value}`
                return (
                  <Link key={tab.value} href={href}>
                    <Button size="sm" variant={filter === tab.value ? 'primary' : 'secondary'}>
                      {tab.label}
                    </Button>
                  </Link>
                )
              })}
              <span className="w-px h-6 bg-stone-300 mx-1" />
              <Link
                href={
                  channelFilter === 'take_a_chef'
                    ? `/inquiries?status=${filter}`
                    : `/inquiries?status=${filter}&channel=take_a_chef`
                }
              >
                <Button
                  size="sm"
                  variant={channelFilter === 'take_a_chef' ? 'primary' : 'secondary'}
                >
                  TakeAChef
                </Button>
              </Link>
              <Link
                href={
                  channelFilter === 'yhangry'
                    ? `/inquiries?status=${filter}`
                    : `/inquiries?status=${filter}&channel=yhangry`
                }
              >
                <Button size="sm" variant={channelFilter === 'yhangry' ? 'primary' : 'secondary'}>
                  Yhangry
                </Button>
              </Link>
            </div>
          </Card>

          {/* Inquiry List */}
          <Suspense
            fallback={
              <Card className="p-8 text-center">
                <p className="text-stone-500">Loading inquiries...</p>
              </Card>
            }
          >
            <InquiryList filter={filter} channelFilter={channelFilter} />
          </Suspense>
        </div>
      </InquiriesViewWrapper>
    </div>
  )
}
