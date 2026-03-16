// Chef Inquiry Pipeline - Smart Priority Inbox
// Groups inquiries by urgency to reduce overwhelm after Gmail sync floods
// Sections: Needs Response → Follow-Up Due → Awaiting Client → Everything Else

import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getInquiries } from '@/lib/inquiries/actions'
import { getBookingScoresForOpenInquiries } from '@/lib/analytics/booking-score'
import { BookingScoreBadge } from '@/components/analytics/booking-score-badge'
import { scoreInquiryFields, type LeadScoreData } from '@/lib/gmail/extract-inquiry-fields'
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
import { InquiriesFilterTabs } from '@/components/inquiries/inquiries-filter-tabs'
import {
  InquiriesBulkTable,
  type SerializedInquiry,
} from '@/components/inquiries/inquiries-bulk-table'
import { AlertTriangle, Clock, TrendingUp, BarChart3 } from '@/components/ui/icons'
import { PipelineSummaryBar } from '@/components/intelligence/pipeline-summary-bar'
import { InquiryTriageBar } from '@/components/intelligence/inquiry-triage-bar'
import { getPlatformAnalytics } from '@/lib/inquiries/platform-analytics'
import { PlatformAnalyticsCard } from '@/components/inquiries/platform-analytics-card'
import { getPlatformCPL } from '@/lib/inquiries/platform-cpl'
import { PlatformSpendForm } from '@/components/inquiries/platform-spend-form'
import { getPlatformSLAStats } from '@/lib/analytics/platform-sla'
import { getPlatformRawFeed } from '@/lib/inquiries/platform-raw-feed'
import { PlatformRawFeedTab } from '@/components/inquiries/platform-raw-feed-tab'
import { safeFetch } from '@/lib/utils/safe-fetch'
import { ErrorState } from '@/components/ui/error-state'

type InquiryFilter =
  | 'all'
  | 'new'
  | 'awaiting_client'
  | 'awaiting_chef'
  | 'quoted'
  | 'confirmed'
  | 'closed'

type BudgetModeFilter = 'all' | 'exact' | 'range' | 'not_sure' | 'unset'

const OPEN_STATUSES = new Set(['new', 'awaiting_client', 'awaiting_chef', 'quoted'])

function getDisplayName(inquiry: {
  client: { id: string; full_name: string; email: string; phone: string | null } | null
  unknown_fields: unknown
}): string {
  if (inquiry.client?.full_name) return inquiry.client.full_name
  const unknown = inquiry.unknown_fields as Record<string, unknown> | null
  return (unknown?.client_name as string) || 'Unknown Lead'
}

function getBudgetMode(inquiry: {
  confirmed_budget_cents: number | null
  unknown_fields: unknown
}): Exclude<BudgetModeFilter, 'all'> {
  const exactCents = inquiry.confirmed_budget_cents
  const unknown =
    inquiry.unknown_fields && typeof inquiry.unknown_fields === 'object'
      ? (inquiry.unknown_fields as Record<string, unknown>)
      : null

  const modeRaw = unknown?.budget_mode
  const mode = typeof modeRaw === 'string' ? modeRaw : null
  const rangeRaw = unknown?.budget_range
  const budgetRange = typeof rangeRaw === 'string' ? rangeRaw : null
  const unknownExactRaw = unknown?.budget_exact_cents
  const unknownExactCents =
    typeof unknownExactRaw === 'number'
      ? unknownExactRaw
      : typeof unknownExactRaw === 'string'
        ? Number.parseInt(unknownExactRaw, 10)
        : NaN

  if (
    (typeof exactCents === 'number' && exactCents > 0) ||
    (Number.isFinite(unknownExactCents) && unknownExactCents > 0) ||
    mode === 'exact'
  ) {
    return 'exact'
  }

  if (mode === 'not_sure' || budgetRange === 'not_sure') {
    return 'not_sure'
  }

  if (mode === 'range' || (budgetRange && budgetRange.trim().length > 0)) {
    return 'range'
  }

  return 'unset'
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
  leadScoreMap: Map<string, LeadScoreData>
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
                  ? `Stale - ${Math.floor(ageHours / 24)}d`
                  : isUrgent
                    ? `Untouched - ${ageHours}h`
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

async function PlatformAnalyticsSection() {
  const [analytics, cplData, slaRaw] = await Promise.all([
    getPlatformAnalytics(),
    getPlatformCPL().catch(() => []),
    getPlatformSLAStats().catch(() => []),
  ])
  const slaStats = slaRaw.map((s) => ({
    channelKey: s.channelKey,
    channel: s.channel,
    avgResponseHours: s.avgResponseHours,
    slaHitRate: s.slaHitRate,
    targetHours: s.targetHours,
  }))
  return (
    <div className="space-y-2">
      <PlatformAnalyticsCard analytics={analytics} cplData={cplData} slaStats={slaStats} />
      <PlatformSpendForm />
    </div>
  )
}

async function PlatformRawFeedSection() {
  const items = await getPlatformRawFeed(30)
  return <PlatformRawFeedTab items={items} />
}

async function InquiryList({
  filter,
  channelFilter,
  budgetModeFilter,
}: {
  filter: InquiryFilter
  channelFilter: string | null
  budgetModeFilter: BudgetModeFilter
}) {
  await requireChef()

  const inquiriesResult = await safeFetch(() => getInquiries())
  if (inquiriesResult.error) {
    return <ErrorState title="Could not load inquiries" description={inquiriesResult.error} />
  }

  const [bookingScores, urgencies] = await Promise.all([
    getBookingScoresForOpenInquiries().catch(() => [] as BookingScore[]),
    getInquiryUrgencies().catch(() => [] as InquiryUrgency[]),
  ])

  let inquiries = inquiriesResult.data

  // Apply channel filter
  if (channelFilter) {
    inquiries = inquiries.filter((i: any) => i.channel === channelFilter)
  }

  if (budgetModeFilter !== 'all') {
    inquiries = inquiries.filter((i: any) => getBudgetMode(i) === budgetModeFilter)
  }

  // Apply status filter
  if (filter === 'closed') {
    inquiries = inquiries.filter((i: any) => i.status === 'declined' || i.status === 'expired')
  } else if (filter !== 'all') {
    inquiries = inquiries.filter((i: any) => i.status === filter)
  }

  // Build lookup maps
  const scoreMap = new Map<string, BookingScore>()
  for (const score of bookingScores) scoreMap.set(score.inquiryId, score)

  const urgencyMap = new Map<string, InquiryUrgency>()
  for (const u of urgencies) urgencyMap.set(u.inquiryId, u)

  const leadScoreMap = new Map<string, LeadScoreData>()
  const completenessMap = new Map<string, CompletenessScore>()
  for (const inquiry of inquiries) {
    if (OPEN_STATUSES.has(inquiry.status)) {
      // Read stored GOLDMINE score from unknown_fields (set by Gmail sync)
      const uf = (inquiry as any).unknown_fields as Record<string, unknown> | null
      if (uf?.lead_score != null && uf?.lead_tier) {
        leadScoreMap.set(inquiry.id, {
          lead_score: uf.lead_score as number,
          lead_tier: uf.lead_tier as 'hot' | 'warm' | 'cold',
          lead_score_factors: (uf.lead_score_factors as string[]) || [],
        })
      } else {
        // Fallback: compute GOLDMINE score from confirmed_* fields (pre-GOLDMINE inquiries)
        const ls = scoreInquiryFields({
          confirmed_date: inquiry.confirmed_date ?? null,
          confirmed_guest_count: inquiry.confirmed_guest_count ?? null,
          confirmed_budget_cents: inquiry.confirmed_budget_cents ?? null,
          confirmed_location: (inquiry as any).confirmed_location ?? null,
          confirmed_occasion: inquiry.confirmed_occasion ?? null,
          confirmed_dietary_restrictions: (inquiry as any).confirmed_dietary_restrictions ?? null,
          confirmed_cannabis_preference: null,
        })
        leadScoreMap.set(inquiry.id, ls)
      }

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
    // Group 1: Needs Your Response - new + awaiting_chef with no outbound message
    const needsResponse = inquiries.filter((i: any) => {
      const u = urgencyMap.get(i.id)
      return (i.status === 'new' || i.status === 'awaiting_chef') && u && !u.hasResponse
    })

    // Group 2: Follow-Up Due - awaiting_client for 3+ days
    const followUpDue = inquiries.filter((i: any) => {
      if (i.status !== 'awaiting_client' && i.status !== 'quoted') return false
      const u = urgencyMap.get(i.id)
      // If responded but client hasn't replied in 3+ days
      if (!u || !u.hasResponse) return false
      // Check last update > 3 days
      const daysSinceUpdate = (Date.now() - new Date(i.updated_at).getTime()) / (24 * 3600000)
      return daysSinceUpdate >= 3
    })

    // Group 3: Active - everything else that's open
    const needsResponseIds = new Set(needsResponse.map((i: any) => i.id))
    const followUpIds = new Set(followUpDue.map((i: any) => i.id))
    const activeOpen = inquiries.filter(
      (i: any) =>
        OPEN_STATUSES.has(i.status) && !needsResponseIds.has(i.id) && !followUpIds.has(i.id)
    )

    // Group 4: Closed
    const closed = inquiries.filter(
      (i: any) => i.status === 'declined' || i.status === 'expired' || i.status === 'confirmed'
    )

    const sharedProps = { scoreMap, leadScoreMap, urgencyMap, completenessMap }

    return (
      <div className="space-y-6">
        {/* Needs Response - most urgent */}
        {needsResponse.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wide">
                Needs Your Response ({needsResponse.length})
              </h2>
            </div>
            <div className="space-y-2">
              {needsResponse.map((inquiry: any) => (
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
              {followUpDue.map((inquiry: any) => (
                <InquiryRow key={inquiry.id} inquiry={inquiry} {...sharedProps} />
              ))}
            </div>
          </section>
        )}

        {/* Active - on track */}
        {activeOpen.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wide">
                Active Pipeline ({activeOpen.length})
              </h2>
            </div>
            <div className="space-y-2">
              {activeOpen.map((inquiry: any) => (
                <InquiryRow key={inquiry.id} inquiry={inquiry} {...sharedProps} />
              ))}
            </div>
          </section>
        )}

        {/* Closed - collapsed */}
        {closed.length > 0 && (
          <details className="group">
            <summary className="flex items-center gap-2 mb-3 cursor-pointer select-none">
              <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">
                Closed ({closed.length})
              </h2>
              <span className="text-xs text-stone-600 group-open:hidden">Click to expand</span>
            </summary>
            <div className="space-y-2">
              {closed.map((inquiry: any) => (
                <InquiryRow key={inquiry.id} inquiry={inquiry} {...sharedProps} />
              ))}
            </div>
          </details>
        )}
      </div>
    )
  }

  // --- Table with bulk actions for filtered views ---
  const serializedInquiries: SerializedInquiry[] = inquiries.map((inquiry: any) => ({
    id: inquiry.id,
    status: inquiry.status,
    channel: inquiry.channel,
    client_name: getDisplayName(inquiry),
    confirmed_occasion: inquiry.confirmed_occasion ?? null,
    confirmed_date: inquiry.confirmed_date ?? null,
    confirmed_guest_count: inquiry.confirmed_guest_count ?? null,
    confirmed_budget_cents: inquiry.confirmed_budget_cents ?? null,
    updated_at: inquiry.updated_at,
    created_at: inquiry.created_at,
    next_action_required: inquiry.next_action_required ?? null,
    chef_likelihood: (inquiry as any).chef_likelihood ?? null,
  }))

  return <InquiriesBulkTable inquiries={serializedInquiries} />
}

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: { status?: InquiryFilter; channel?: string; budget_mode?: BudgetModeFilter }
}) {
  await requireChef()

  const filter = (searchParams.status || 'all') as InquiryFilter
  const channelFilter = searchParams.channel || null
  const budgetModeFilter = (searchParams.budget_mode || 'all') as BudgetModeFilter

  // Fetch all inquiries for the kanban board (always shows all, unfiltered)
  const allInquiries = await getInquiries()

  // Map to the shape KanbanBoard expects
  const kanbanInquiries = allInquiries.map((inquiry: any) => ({
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

      {/* Pipeline Intelligence Summary */}
      <Suspense fallback={null}>
        <PipelineSummaryBar />
      </Suspense>

      {/* Inquiry Triage & Communication */}
      <Suspense fallback={null}>
        <InquiryTriageBar />
      </Suspense>

      {/* Platform Analytics */}
      <Suspense fallback={null}>
        <PlatformAnalyticsSection />
      </Suspense>

      {/* Platform Raw Feed */}
      <Suspense fallback={null}>
        <PlatformRawFeedSection />
      </Suspense>

      {/* View wrapper: manages list/kanban toggle */}
      <InquiriesViewWrapper inquiries={kanbanInquiries}>
        {/* Status Tabs + List - unchanged, passed as children slot */}
        <div className="space-y-4">
          <Card className="p-4">
            <InquiriesFilterTabs
              initialStatus={filter}
              initialChannel={channelFilter}
              initialBudgetMode={budgetModeFilter}
            />
          </Card>

          {/* Inquiry List */}
          <Suspense
            fallback={
              <Card className="p-8 text-center">
                <p className="text-stone-500">Loading inquiries...</p>
              </Card>
            }
          >
            <InquiryList
              filter={filter}
              channelFilter={channelFilter}
              budgetModeFilter={budgetModeFilter}
            />
          </Suspense>
        </div>
      </InquiriesViewWrapper>
    </div>
  )
}
