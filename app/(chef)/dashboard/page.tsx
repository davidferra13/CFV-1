// Chef Dashboard - Daily Briefing Layout
// Structured as a morning newspaper: hero metrics up top, today's focus, then details.
// Section headers replace uniform card grid. Content breathes.

import { Suspense } from 'react'
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getPriorityQueue } from '@/lib/queue/actions'
import { getCachedChefArchetype, getCachedIsPrivileged } from '@/lib/chef/layout-data-cache'
import { getDashboardPrimaryAction } from '@/lib/archetypes/ui-copy'
import Link from 'next/link'
import { Plus, Store, UtensilsCrossed } from '@/components/ui/icons'
import type { PriorityQueue } from '@/lib/queue/types'
import { CommandCenterSection } from './_sections/command-center-data'
import { ListCard, type ListCardItem } from '@/components/dashboard/widget-cards/list-card'
import { WidgetCardSkeleton } from '@/components/dashboard/widget-cards/widget-card-shell'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import { OnboardingBanner } from '@/components/onboarding/onboarding-banner'
import UpcomingTouchpoints from '@/components/clients/upcoming-touchpoints'
import GiftSuggestionsWidget from '@/components/dashboard/gift-suggestions-widget'
import { getUpcomingTouchpoints } from '@/lib/clients/touchpoint-actions'
import { getUpcomingCallsLoadState } from '@/lib/calls/actions'
import { getCallIntelligenceSnapshot } from '@/lib/calls/intelligence-actions'
import { UpcomingCallsWidget } from '@/components/calls/upcoming-calls-widget'
import { DashboardCallIntelligenceWidget } from '@/components/calls/dashboard-call-intelligence-widget'
import { ActionSurfaceCard } from '@/components/dashboard/action-surface-card'
import { ResolveNextCard } from '@/components/dashboard/resolve-next-card'
import { DecisionQueueWidget } from '@/components/dashboard/decision-queue-widget'
import {
  type CollectBalanceCandidate,
  type CloseOutCandidate,
  type ExecutionNextCandidate,
  type MenuDecisionCandidate,
  type PrepFlowCandidate,
  type ProcurementCandidate,
  type ReceiptCaptureCandidate,
  type RelationshipNextCandidate,
  type ResetNextCandidate,
  type SafetyCheckCandidate,
  type ServiceReadyCandidate,
  type TeamReadyCandidate,
  type TravelConfirmCandidate,
  type TrustLoopCandidate,
  resolveCollectBalanceTask,
  resolveCommitNextTask,
  resolveCloseOutNextTask,
  resolveDashboardNextTask,
  resolveExecutionNextTask,
  resolveFixMissingFactTask,
  resolveMenuDecisionTask,
  resolvePrepFlowTask,
  resolvePrepareNextTask,
  resolveProcurementNextTask,
  resolveReceiptCaptureTask,
  resolveRelationshipNextTask,
  resolveResetNextTask,
  resolveSafetyCheckTask,
  resolveServiceReadyTask,
  resolveTeamReadyTask,
  resolveTravelConfirmTask,
  resolveTrustLoopNextTask,
} from '@/lib/interface/action-layer'

// New card-based sections
import { ScheduleCards } from './_sections/schedule-cards'
import { PrepPressureCard } from './_sections/prep-pressure-card'
import { SaturationCards } from './_sections/saturation-cards'
import { AlertCards } from './_sections/alerts-cards'
import { CommunicationUrgencyBanner } from './_sections/communication-urgency-banner'
import { RecipeUrgencyBanner } from './_sections/recipe-urgency-banner'
import { BusinessCards } from './_sections/business-cards'
import { IntelligenceCards } from './_sections/intelligence-cards'
import { HeroMetrics } from './_sections/hero-metrics'
import { getWeeklyPriceBriefing } from '@/lib/openclaw/weekly-briefing-actions'
import { WeeklyBriefingCard } from '@/components/pricing/weekly-briefing-card'
import { isAdmin } from '@/lib/auth/admin'
import { CoverageHealthWidget } from '@/components/pricing/coverage-health-widget'
import { DinnerCirclesSection } from './_sections/dinner-circles-cards'
import { DashboardSecondaryInsights } from '@/components/dashboard/dashboard-secondary-insights'
import { QuickNotesSection } from '@/components/dashboard/quick-notes-section'
import { getQuickNotes } from '@/lib/quick-notes/actions'
import { SmartSuggestions, SmartSuggestionsSkeleton } from './_sections/smart-suggestions'
import { MetricsStrip } from './_sections/metrics-strip'
import { PulseSummary } from './_sections/pulse-summary'
import { OpenClawLiveAlerts } from '@/components/pricing/openclaw-live-alerts'
import { PipelineStatusBadge } from '@/components/pricing/pipeline-status-badge'
import { DashboardHeartbeat } from '@/components/dashboard/dashboard-heartbeat'
import { RemyAlertsWidget } from '@/components/dashboard/remy-alerts-widget'
import { getActiveAlerts } from '@/lib/ai/remy-proactive-alerts'
import { RestaurantMetricsSection, RestaurantMetricsSkeleton } from './_sections/restaurant-metrics'
import {
  MultiLocationSummary,
  MultiLocationSummarySkeleton,
} from './_sections/multi-location-summary'
import { CompletionSummaryWidgetServer } from '@/components/completion/completion-summary-server'
import { EventDeadlineAlerts } from './_sections/event-deadline-alerts'
import { NetworkActivitySection } from './_sections/network-activity'
import { NetworkIntelligenceSection } from './_sections/network-intelligence'
import { OnboardingChecklistWidget } from '@/components/dashboard/onboarding-checklist-widget'
import { getOnboardingProgress } from '@/lib/onboarding/progress-actions'
import { getDashboardWorkSurface } from '@/lib/workflow/actions'
import type { DashboardWorkSurface, WorkStage } from '@/lib/workflow/types'
import { getAllPrepPrompts, getEventDOPProgress } from '@/lib/scheduling/actions'
import { autoSuggestEventBlocks } from '@/lib/scheduling/prep-block-actions'
import { getEventsNeedingClosure } from '@/lib/events/actions'
import { getTenantDataPresence } from '@/lib/progressive-disclosure/tenant-data-presence'
import { isBrandNewChef } from '@/lib/progressive-disclosure/nav-visibility'
import { GettingStartedSection } from '@/components/dashboard/getting-started-section'
import { getWorkspaceDensity } from '@/lib/chef/preferences-actions'
import { getDocumentReadiness } from '@/lib/documents/actions'
import { hasAllergyData } from '@/lib/documents/generate-allergy-card'
import { checkMenuAllergenConflicts } from '@/lib/dietary/cross-contamination-check'
import { getEventReadiness } from '@/lib/events/readiness'
import { getLatestGroceryQuote } from '@/lib/grocery/pricing-actions'
import { getEventTrustLoopState } from '@/lib/post-event/trust-loop-actions'
import { getNextBestActions } from '@/lib/clients/next-best-action'
import { checkAssignmentConflict, getEventStaffRoster, listStaffMembers } from '@/lib/staff/actions'
import { eventsOverlapInTime } from '@/lib/staff/time-overlap'
import { getSupportStatus } from '@/lib/monetization/status'
import { getDecisionQueue, type DecisionQueueResult } from '@/lib/decision-queue/actions'
import { OverwhelmTriageBanner } from './_sections/overwhelm-triage-banner'
import { loadContinuityDigest, type ContinuityDigest } from '@/lib/activity/continuity-digest'
import { getResumeItems } from '@/lib/activity/resume'
import { getUnreadCount } from '@/lib/notifications/actions'
import { ReturnToWorkStrip } from '@/components/dashboard/return-to-work-strip'
import { CulinaryRadarWidget } from '@/components/dashboard/culinary-radar-widget'

export const metadata: Metadata = { title: 'Dashboard' }

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Dashboard] ${label} failed:`, err)
    return fallback
  }
}

type DashboardLoadResult<T> =
  | {
      status: 'ok'
      data: T
      error: null
    }
  | {
      status: 'unavailable'
      data: T
      error: string
    }

async function safeResult<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T,
  error: string
): Promise<DashboardLoadResult<T>> {
  try {
    return { status: 'ok', data: await fn(), error: null }
  } catch (err) {
    console.error(`[Dashboard] ${label} failed:`, err)
    return { status: 'unavailable', data: fallback, error }
  }
}

function isUnavailable<T>(result: DashboardLoadResult<T>): boolean {
  return result.status === 'unavailable'
}

function DegradedDataNotice({
  title,
  detail,
  className = '',
}: {
  title: string
  detail: string
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-amber-800/50 bg-amber-950/30 px-4 py-3 ${className}`}>
      <p className="text-sm font-medium text-amber-200">{title}</p>
      <p className="mt-1 text-xs leading-5 text-amber-100/80">{detail}</p>
    </div>
  )
}

const emptyQueue: PriorityQueue = {
  items: [],
  nextAction: null,
  summary: {
    totalItems: 0,
    byDomain: {
      inquiry: 0,
      message: 0,
      quote: 0,
      event: 0,
      task: 0,
      financial: 0,
      post_event: 0,
      client: 0,
      culinary: 0,
      network: 0,
    },
    byUrgency: { critical: 0, high: 0, normal: 0, low: 0 },
    allCaughtUp: true,
  },
  computedAt: new Date().toISOString(),
}

const emptyDecisionQueue: DecisionQueueResult = {
  items: [],
  totalCount: 0,
  criticalCount: 0,
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const output: string[] = []

  for (const raw of values) {
    const value = String(raw ?? '').trim()
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    output.push(value)
  }

  return output
}

function getDaysUntil(dateString: string): number {
  const target = new Date(`${dateString}T00:00:00`)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

function getActionEventIdsFromWorkSurface(
  surface: DashboardWorkSurface,
  stages: WorkStage[]
): string[] {
  const allowedStages = new Set(stages)
  const seen = new Set<string>()
  const eventIds: string[] = []

  for (const item of [...surface.fragile, ...surface.preparable, ...surface.optionalEarly]) {
    if (!allowedStages.has(item.stage) || seen.has(item.eventId)) continue
    seen.add(item.eventId)
    eventIds.push(item.eventId)
  }

  return eventIds
}

// Section loading skeletons
function HeroMetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="py-2">
          <div className="h-3 w-20 loading-bone loading-bone-muted rounded" />
          <div className="h-9 w-24 loading-bone loading-bone-muted rounded mt-2" />
        </div>
      ))}
    </div>
  )
}

function ScheduleCardsSkeleton() {
  return (
    <>
      <WidgetCardSkeleton size="md" />
      <WidgetCardSkeleton size="md" />
      <WidgetCardSkeleton size="sm" />
      <WidgetCardSkeleton size="sm" />
    </>
  )
}

function SaturationCardsSkeleton() {
  return (
    <>
      <WidgetCardSkeleton size="sm" />
      <WidgetCardSkeleton size="md" />
    </>
  )
}

function AlertCardsSkeleton() {
  return (
    <>
      <WidgetCardSkeleton size="sm" />
      <WidgetCardSkeleton size="sm" />
      <WidgetCardSkeleton size="sm" />
      <WidgetCardSkeleton size="sm" />
    </>
  )
}

function BusinessCardsSkeleton() {
  return (
    <>
      <WidgetCardSkeleton size="sm" />
      <WidgetCardSkeleton size="sm" />
      <WidgetCardSkeleton size="sm" />
      <WidgetCardSkeleton size="sm" />
    </>
  )
}

function IntelligenceCardsSkeleton() {
  return <WidgetCardSkeleton size="md" />
}

function CommandCenterSkeleton() {
  return (
    <section>
      <div className="section-label mb-4">Core Areas</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
            <div className="flex items-start justify-between mb-2.5">
              <div className="w-8 h-8 rounded-lg loading-bone loading-bone-muted" />
            </div>
            <div className="h-4 w-20 loading-bone loading-bone-muted rounded mt-1" />
            <div className="h-3 w-28 loading-bone loading-bone-muted rounded mt-1.5" />
          </div>
        ))}
      </div>
    </section>
  )
}

// Streamed priority queue section (deferred behind Suspense so it doesn't block TTFB)
async function PriorityQueueSection({ queuePromise }: { queuePromise: Promise<PriorityQueue> }) {
  const queue = await queuePromise
  const remainingItems = queue.items.slice(1, 6)

  if (queue.summary.totalItems <= 1 || remainingItems.length === 0) return null

  const queueItems: ListCardItem[] = remainingItems.map((item) => ({
    id: item.id,
    label: item.title,
    sublabel:
      item.context.primaryLabel +
      (item.context.secondaryLabel ? ` - ${item.context.secondaryLabel}` : ''),
    href: item.href,
    status:
      item.urgency === 'critical'
        ? ('red' as const)
        : item.urgency === 'high'
          ? ('amber' as const)
          : item.urgency === 'normal'
            ? ('brand' as const)
            : ('stone' as const),
  }))

  return (
    <ListCard
      widgetId="priority_queue"
      title="After This"
      count={queue.summary.totalItems - 1}
      items={queueItems}
      href="/queue"
      emptyMessage="Nothing else queued."
    />
  )
}

// Streamed touchpoints section (deferred behind Suspense)
async function TouchpointsSection() {
  const touchpoints = await safe('touchpoints', getUpcomingTouchpoints, [])
  if (touchpoints.length === 0) return null
  return (
    <div className="col-span-1 sm:col-span-2">
      <UpcomingTouchpoints initialTouchpoints={touchpoints} />
    </div>
  )
}

function TouchpointsSkeleton() {
  return (
    <div className="col-span-1 sm:col-span-2">
      <WidgetCardSkeleton size="md" />
    </div>
  )
}

function PriorityQueueSkeleton() {
  return <WidgetCardSkeleton size="md" />
}

function ResolveNextSkeleton() {
  return (
    <div className="rounded-[28px] border border-stone-800 bg-stone-950/80 px-5 py-6 sm:px-6">
      <div className="h-5 w-28 loading-bone loading-bone-muted rounded" />
      <div className="mt-4 h-10 w-3/4 loading-bone loading-bone-muted rounded" />
      <div className="mt-3 h-4 w-full loading-bone loading-bone-muted rounded" />
      <div className="mt-2 h-4 w-2/3 loading-bone loading-bone-muted rounded" />
      <div className="mt-5 flex gap-2">
        <div className="h-8 w-28 loading-bone loading-bone-muted rounded-full" />
        <div className="h-8 w-36 loading-bone loading-bone-muted rounded-full" />
      </div>
    </div>
  )
}

async function DecisionQueueSection({
  decisionQueuePromise,
}: {
  decisionQueuePromise: Promise<DecisionQueueResult>
}) {
  const decisionQueueData = await decisionQueuePromise
  return <DecisionQueueWidget data={decisionQueueData} />
}

async function ResolveNextSection({
  queueResultPromise,
  onboardingProgress,
  profileGated,
}: {
  queueResultPromise: Promise<DashboardLoadResult<PriorityQueue>>
  onboardingProgress: Awaited<ReturnType<typeof getOnboardingProgress>> | null
  profileGated: boolean
}) {
  const queueResult = await queueResultPromise
  const task = resolveDashboardNextTask({
    priorityQueue: queueResult.data,
    onboardingProgress,
    profileGated,
  })

  if (queueResult.status === 'unavailable' && task.source === 'clear') {
    return (
      <DegradedDataNotice
        title="Resolve Next unavailable"
        detail="Priority queue data could not be loaded, so the dashboard cannot safely confirm that nothing urgent is waiting."
      />
    )
  }

  if (queueResult.status === 'unavailable') {
    return (
      <div className="space-y-3">
        <DegradedDataNotice
          title="Resolve Next is using partial data"
          detail="Priority queue data could not be loaded. Showing the next available setup or profile action instead."
        />
        <ResolveNextCard task={task} />
      </div>
    )
  }

  return <ResolveNextCard task={task} />
}

async function getProcurementCandidates(
  workSurface: DashboardWorkSurface
): Promise<ProcurementCandidate[]> {
  const activeEventIds = getActionEventIdsFromWorkSurface(workSurface, ['grocery_list'])
  const user = await requireChef()
  const db: any = createServerClient()

  const [activeEventsResult, varianceQuotesResult] = await Promise.all([
    activeEventIds.length > 0
      ? db
          .from('events')
          .select(
            `
            id, occasion, event_date,
            client:clients(full_name)
          `
          )
          .eq('tenant_id', user.tenantId!)
          .is('deleted_at' as any, null)
          .in('id', activeEventIds)
      : Promise.resolve({ data: [] }),
    db
      .from('grocery_price_quotes')
      .select('event_id, created_at, actual_grocery_cost_cents, accuracy_delta_pct')
      .eq('tenant_id', user.tenantId!)
      .eq('status', 'complete')
      .not('actual_grocery_cost_cents', 'is', null)
      .order('created_at', { ascending: false })
      .limit(12),
  ])

  const activeEvents = (activeEventsResult.data ?? []) as any[]
  const candidates = new Map<string, ProcurementCandidate>()

  const latestQuotes = await Promise.all(
    activeEvents.map(async (event) => ({
      eventId: event.id as string,
      quote: await getLatestGroceryQuote(event.id).catch(() => null),
    }))
  )

  const latestQuoteByEvent = new Map(latestQuotes.map((entry) => [entry.eventId, entry.quote]))

  for (const event of activeEvents) {
    const quote = latestQuoteByEvent.get(event.id) ?? null
    candidates.set(event.id, {
      id: event.id,
      occasion: event.occasion ?? null,
      event_date: event.event_date,
      client: (event.client as { full_name?: string } | null)?.full_name
        ? { full_name: (event.client as { full_name: string }).full_name }
        : null,
      needs_finalized_list: true,
      latest_quote_created_at: quote?.createdAt ?? null,
      actual_grocery_cost_cents: quote?.actualGroceryCostCents ?? null,
      accuracy_delta_pct: quote?.accuracyDeltaPct ?? null,
    })
  }

  const latestVarianceQuoteByEvent = new Map<
    string,
    {
      created_at: string | null
      actual_grocery_cost_cents: number | null
      accuracy_delta_pct: number | null
    }
  >()

  for (const row of (varianceQuotesResult.data ?? []) as any[]) {
    if (latestVarianceQuoteByEvent.has(row.event_id)) continue
    latestVarianceQuoteByEvent.set(row.event_id, {
      created_at: row.created_at ?? null,
      actual_grocery_cost_cents: row.actual_grocery_cost_cents ?? null,
      accuracy_delta_pct: row.accuracy_delta_pct != null ? Number(row.accuracy_delta_pct) : null,
    })
  }

  const varianceOnlyEventIds = Array.from(latestVarianceQuoteByEvent.keys()).filter(
    (eventId) => !candidates.has(eventId)
  )

  if (varianceOnlyEventIds.length > 0) {
    const { data: varianceEvents } = await db
      .from('events')
      .select(
        `
        id, occasion, event_date,
        client:clients(full_name)
      `
      )
      .eq('tenant_id', user.tenantId!)
      .is('deleted_at' as any, null)
      .in('id', varianceOnlyEventIds)

    for (const event of (varianceEvents ?? []) as any[]) {
      const quote = latestVarianceQuoteByEvent.get(event.id)
      if (!quote) continue

      candidates.set(event.id, {
        id: event.id,
        occasion: event.occasion ?? null,
        event_date: event.event_date,
        client: (event.client as { full_name?: string } | null)?.full_name
          ? { full_name: (event.client as { full_name: string }).full_name }
          : null,
        needs_finalized_list: false,
        latest_quote_created_at: quote.created_at,
        actual_grocery_cost_cents: quote.actual_grocery_cost_cents,
        accuracy_delta_pct: quote.accuracy_delta_pct,
      })
    }
  }

  return Array.from(candidates.values())
}

async function getPrepFlowCandidates(
  workSurface: DashboardWorkSurface
): Promise<PrepFlowCandidate[]> {
  const stageEventIds = getActionEventIdsFromWorkSurface(workSurface, ['prep_list'])
  const stageEventIdSet = new Set(stageEventIds)
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: prepBlocks, error } = await (db as any)
    .from('event_prep_blocks')
    .select('event_id, title, block_date, completed_at')
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[Dashboard] prepFlowCandidates failed:', error)
    return []
  }

  const blocksByEvent = new Map<
    string,
    Array<{
      title: string | null
      block_date: string
      completed_at: string | null
    }>
  >()

  for (const row of (prepBlocks ?? []) as any[]) {
    if (!row.event_id) continue
    const current = blocksByEvent.get(row.event_id) ?? []
    current.push({
      title: row.title ?? null,
      block_date: row.block_date,
      completed_at: row.completed_at ?? null,
    })
    blocksByEvent.set(row.event_id, current)
  }

  const eventIds = Array.from(new Set([...stageEventIds, ...blocksByEvent.keys()]))
  if (eventIds.length === 0) return []

  const { data: events, error: eventsError } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, status,
      client:clients(full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .in('id', eventIds)
    .not('status', 'in', '("cancelled","completed")')

  if (eventsError || !events) {
    console.error('[Dashboard] prepFlowCandidates events failed:', eventsError)
    return []
  }

  const candidates = await Promise.all(
    (events as any[]).map(async (event) => {
      const eventBlocks = (blocksByEvent.get(event.id) ?? []).slice()
      eventBlocks.sort((a, b) => a.block_date.localeCompare(b.block_date))

      const incompleteBlocks = eventBlocks.filter((block) => !block.completed_at)
      const dueIncompleteBlocks = incompleteBlocks.filter(
        (block) => getDaysUntil(block.block_date) <= 0
      )

      let suggestionCount = 0
      if (eventBlocks.length === 0 && stageEventIdSet.has(event.id)) {
        const suggestions = await autoSuggestEventBlocks(event.id).catch(() => ({
          suggestions: [],
        }))
        suggestionCount = suggestions.suggestions.length
      }

      const candidate: PrepFlowCandidate = {
        id: event.id,
        occasion: event.occasion ?? null,
        event_date: event.event_date,
        client: (event.client as { full_name?: string } | null)?.full_name
          ? { full_name: (event.client as { full_name: string }).full_name }
          : null,
        incomplete_block_count: incompleteBlocks.length,
        due_incomplete_block_count: dueIncompleteBlocks.length,
        next_incomplete_block_title: incompleteBlocks[0]?.title ?? null,
        next_incomplete_block_date: incompleteBlocks[0]?.block_date ?? null,
        suggestion_count: suggestionCount,
        has_any_blocks: eventBlocks.length > 0,
      }

      const hasActionablePrepMove =
        candidate.due_incomplete_block_count > 0 ||
        (!candidate.has_any_blocks && candidate.suggestion_count > 0) ||
        candidate.incomplete_block_count > 0 ||
        (!candidate.has_any_blocks && stageEventIdSet.has(event.id))

      return hasActionablePrepMove ? candidate : null
    })
  )

  return candidates.filter((candidate): candidate is PrepFlowCandidate => Boolean(candidate))
}

async function getTravelConfirmCandidates(
  workSurface: DashboardWorkSurface
): Promise<TravelConfirmCandidate[]> {
  const stageEventIds = getActionEventIdsFromWorkSurface(workSurface, ['travel_arrival'])
  const stageEventIdSet = new Set(stageEventIds)
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: travelLegs, error } = await db
    .from('event_travel_legs')
    .select('primary_event_id, linked_event_ids, status, leg_date')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['planned', 'in_progress'])

  if (error) {
    console.error('[Dashboard] travelConfirmCandidates failed:', error)
    return []
  }

  const legsByEvent = new Map<
    string,
    Array<{
      status: string
      leg_date: string
    }>
  >()
  const eventIds = new Set(stageEventIds)

  for (const leg of (travelLegs ?? []) as any[]) {
    const legEventIds = [
      leg.primary_event_id as string | null,
      ...(((leg.linked_event_ids ?? []) as string[]) ?? []),
    ].filter((value): value is string => Boolean(value))

    for (const eventId of legEventIds) {
      eventIds.add(eventId)
      const current = legsByEvent.get(eventId) ?? []
      current.push({
        status: leg.status,
        leg_date: leg.leg_date,
      })
      legsByEvent.set(eventId, current)
    }
  }

  const allEventIds = Array.from(eventIds)
  if (allEventIds.length === 0) return []

  const { data: events, error: eventsError } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, status,
      client:clients(full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .in('id', allEventIds)
    .in('status', ['paid', 'confirmed', 'in_progress'])

  if (eventsError || !events) {
    console.error('[Dashboard] travelConfirmCandidates events failed:', eventsError)
    return []
  }

  return (events as any[])
    .map((event) => {
      const eventLegs = (legsByEvent.get(event.id) ?? []).slice()
      eventLegs.sort((a, b) => a.leg_date.localeCompare(b.leg_date))
      const nextPlannedLegDate = eventLegs.find((leg) => leg.status === 'planned')?.leg_date ?? null

      const candidate: TravelConfirmCandidate = {
        id: event.id,
        occasion: event.occasion ?? null,
        event_date: event.event_date,
        client: (event.client as { full_name?: string } | null)?.full_name
          ? { full_name: (event.client as { full_name: string }).full_name }
          : null,
        leg_count: eventLegs.length,
        has_in_progress_leg: eventLegs.some((leg) => leg.status === 'in_progress'),
        next_planned_leg_date: nextPlannedLegDate,
        printable_route_ready: eventLegs.length > 0,
      }

      const hasActionableTravelMove =
        candidate.has_in_progress_leg ||
        candidate.next_planned_leg_date !== null ||
        candidate.printable_route_ready ||
        (candidate.leg_count === 0 && stageEventIdSet.has(event.id))

      return hasActionableTravelMove ? candidate : null
    })
    .filter((candidate): candidate is TravelConfirmCandidate => Boolean(candidate))
}

async function getExecutionNextCandidates(): Promise<ExecutionNextCandidate[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: events, error } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, status,
      service_started_at, service_completed_at, time_service_minutes,
      client:clients(full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .in('status', ['confirmed', 'in_progress'])
    .order('event_date', { ascending: true })
    .limit(12)

  if (error || !events) {
    console.error('[Dashboard] executionNextCandidates failed:', error)
    return []
  }

  const candidates = await Promise.all(
    (events as any[]).map(async (event) => {
      const readiness =
        event.status === 'confirmed' ? await getEventReadiness(event.id).catch(() => null) : null

      const candidate: ExecutionNextCandidate = {
        id: event.id,
        occasion: event.occasion ?? null,
        event_date: event.event_date,
        guest_count: event.guest_count ?? null,
        status: event.status as ExecutionNextCandidate['status'],
        service_started_at: event.service_started_at ?? null,
        service_completed_at: event.service_completed_at ?? null,
        time_service_minutes: event.time_service_minutes ?? null,
        client: (event.client as { full_name?: string } | null)?.full_name
          ? { full_name: (event.client as { full_name: string }).full_name }
          : null,
        readiness: readiness
          ? {
              ready: readiness.ready,
              hardBlocked: readiness.hardBlocked,
              blockers: readiness.blockers.map((blocker) => ({
                gate: blocker.gate,
                label: blocker.label,
                details: blocker.details,
              })),
            }
          : null,
      }

      const hasActionableExecutionMove =
        candidate.status === 'in_progress' ||
        (candidate.status === 'confirmed' &&
          getDaysUntil(candidate.event_date) <= 0 &&
          candidate.readiness?.ready)

      return hasActionableExecutionMove ? candidate : null
    })
  )

  return candidates.filter((candidate): candidate is ExecutionNextCandidate => Boolean(candidate))
}

async function getServiceReadyCandidates(): Promise<ServiceReadyCandidate[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: events, error } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, status,
      prep_sheet_generated_at, packing_list_generated_at, car_packed,
      client:clients(full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .in('status', ['paid', 'confirmed'])
    .order('event_date', { ascending: true })
    .limit(8)

  if (error || !events) {
    console.error('[Dashboard] serviceReadyCandidates failed:', error)
    return []
  }

  return Promise.all(
    events.map(async (event: any) => {
      const [docReadiness, readiness, dopProgress] = await Promise.all([
        event.status === 'paid'
          ? getDocumentReadiness(event.id).catch(() => null)
          : Promise.resolve(null),
        getEventReadiness(event.id).catch(() => null),
        event.status === 'confirmed'
          ? getEventDOPProgress(event.id).catch(() => null)
          : Promise.resolve(null),
      ])

      return {
        id: event.id,
        occasion: event.occasion ?? null,
        event_date: event.event_date,
        guest_count: event.guest_count ?? null,
        status: event.status as ServiceReadyCandidate['status'],
        prep_sheet_ready: docReadiness?.prepSheet.ready ?? false,
        prep_sheet_generated: Boolean(event.prep_sheet_generated_at),
        packing_list_generated: Boolean(event.packing_list_generated_at),
        car_packed: Boolean(event.car_packed),
        client: (event.client as { full_name?: string } | null)?.full_name
          ? { full_name: (event.client as { full_name: string }).full_name }
          : null,
        dop_progress: dopProgress,
        readiness: readiness
          ? {
              ready: readiness.ready,
              hardBlocked: readiness.hardBlocked,
              blockers: readiness.blockers.map((blocker) => ({
                gate: blocker.gate,
                label: blocker.label,
                details: blocker.details,
              })),
            }
          : null,
      }
    })
  )
}

async function getMenuDecisionCandidates(): Promise<MenuDecisionCandidate[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: events, error } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, menu_approval_status, menu_modified_after_approval,
      client:clients(full_name),
      menus(id)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .in('status', ['proposed', 'accepted', 'paid', 'confirmed'])
    .order('event_date', { ascending: true })
    .limit(12)

  if (error || !events) {
    console.error('[Dashboard] menuDecisionCandidates failed:', error)
    return []
  }

  return (events as any[])
    .filter((event) => Array.isArray(event.menus) && event.menus.length > 0)
    .map((event) => ({
      id: event.id,
      occasion: event.occasion ?? null,
      event_date: event.event_date,
      guest_count: event.guest_count ?? null,
      menu_approval_status: (event.menu_approval_status ??
        'not_sent') as MenuDecisionCandidate['menu_approval_status'],
      menu_modified_after_approval: Boolean(event.menu_modified_after_approval),
      client: (event.client as { full_name?: string } | null)?.full_name
        ? { full_name: (event.client as { full_name: string }).full_name }
        : null,
    }))
}

async function getSafetyCheckCandidates(): Promise<SafetyCheckCandidate[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: events, error } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, client_id, allergies,
      client:clients(full_name, allergies)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .in('status', ['accepted', 'paid', 'confirmed', 'in_progress'])
    .order('event_date', { ascending: true })
    .limit(10)

  if (error || !events) {
    console.error('[Dashboard] safetyCheckCandidates failed:', error)
    return []
  }

  const candidates = await Promise.all(
    (events as any[]).map(async (event) => {
      const clientId = (event.client_id as string | null) ?? null

      const [
        allergyRecordsResult,
        guestsResult,
        checklistResult,
        dietaryConflictResult,
        allergyCardReady,
        allergenConflicts,
      ] = await Promise.all([
        clientId
          ? db
              .from('client_allergy_records')
              .select('allergen, confirmed_by_chef')
              .eq('tenant_id', user.tenantId!)
              .eq('client_id', clientId)
          : Promise.resolve({ data: [] }),
        db.from('event_guests').select('allergies, plus_one_allergies').eq('event_id', event.id),
        db
          .from('event_safety_checklists')
          .select('items')
          .eq('event_id', event.id)
          .eq('tenant_id', user.tenantId!)
          .maybeSingle(),
        db
          .from('dietary_conflict_alerts')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', event.id)
          .eq('chef_id', user.tenantId!)
          .eq('acknowledged', false),
        hasAllergyData(event.id).catch(() => false),
        checkMenuAllergenConflicts(event.id).catch(() => null),
      ])

      const allergyRecords = (allergyRecordsResult.data ?? []) as Array<{
        allergen: string
        confirmed_by_chef: boolean
      }>
      const guests = (guestsResult.data ?? []) as Array<{
        allergies: string[] | null
        plus_one_allergies: string[] | null
      }>
      const checklistItems = (
        ((checklistResult as any)?.data?.items ?? []) as Array<{
          key?: string
          completed?: boolean
        }>
      ).filter((item) => item.key?.startsWith('XC_'))
      const allergens = uniqueStrings([
        ...(((event.allergies ?? []) as string[]) ?? []),
        ...((((event.client as any)?.allergies ?? []) as string[]) ?? []),
        ...allergyRecords.map((record) => record.allergen),
        ...guests.flatMap((guest) => [
          ...(((guest.allergies ?? []) as string[]) ?? []),
          ...(((guest.plus_one_allergies ?? []) as string[]) ?? []),
        ]),
      ])

      const candidate: SafetyCheckCandidate = {
        id: event.id,
        occasion: event.occasion ?? null,
        event_date: event.event_date,
        guest_count: event.guest_count ?? null,
        unconfirmed_allergy_count: allergyRecords.filter((record) => !record.confirmed_by_chef)
          .length,
        allergen_conflict_count: Number(allergenConflicts?.summary.totalConflicts ?? 0),
        dietary_conflict_count: Number((dietaryConflictResult as any)?.count ?? 0),
        allergen_count: allergens.length,
        cross_contamination_completed_count: checklistItems.filter((item) => item.completed).length,
        cross_contamination_total_count:
          checklistItems.length > 0
            ? checklistItems.length
            : allergens.length > 0
              ? allergens.length * 4
              : 0,
        has_allergy_card_data: Boolean(allergyCardReady),
        client: (event.client as { full_name?: string } | null)?.full_name
          ? { full_name: (event.client as { full_name: string }).full_name }
          : null,
      }

      const hasActionableSafetyMove =
        candidate.unconfirmed_allergy_count > 0 ||
        candidate.allergen_conflict_count > 0 ||
        candidate.dietary_conflict_count > 0 ||
        (candidate.allergen_count > 0 &&
          candidate.cross_contamination_completed_count <
            candidate.cross_contamination_total_count) ||
        candidate.has_allergy_card_data

      return hasActionableSafetyMove ? candidate : null
    })
  )

  return candidates.filter((candidate): candidate is SafetyCheckCandidate => Boolean(candidate))
}

async function getCollectBalanceCandidates(): Promise<CollectBalanceCandidate[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: events, error } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, status, financially_closed,
      client:clients(full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .in('status', ['paid', 'confirmed', 'in_progress', 'completed'])
    .order('event_date', { ascending: true })
    .limit(12)

  if (error || !events) {
    console.error('[Dashboard] collectBalanceCandidates failed:', error)
    return []
  }

  const eventIds = (events as any[]).map((event) => event.id)
  const [summaryResult, installmentResult] = await Promise.all([
    db
      .from('event_financial_summary')
      .select('event_id, outstanding_balance_cents')
      .in('event_id', eventIds),
    db
      .from('payment_plan_installments')
      .select('event_id, label, due_date, paid_at')
      .in('event_id', eventIds)
      .is('paid_at', null),
  ])

  const summaryMap = new Map<string, { outstanding_balance_cents: number }>()
  for (const row of (summaryResult.data ?? []) as any[]) {
    summaryMap.set(row.event_id, {
      outstanding_balance_cents: Number(row.outstanding_balance_cents ?? 0),
    })
  }

  const installmentsByEvent = new Map<
    string,
    Array<{ label: string | null; due_date: string | null }>
  >()
  for (const row of (installmentResult.data ?? []) as any[]) {
    const current = installmentsByEvent.get(row.event_id) ?? []
    current.push({ label: row.label ?? null, due_date: row.due_date ?? null })
    installmentsByEvent.set(row.event_id, current)
  }

  return (events as any[])
    .map((event) => {
      const summary = summaryMap.get(event.id)
      const unpaidInstallments = installmentsByEvent.get(event.id) ?? []
      return {
        id: event.id,
        occasion: event.occasion ?? null,
        event_date: event.event_date,
        guest_count: event.guest_count ?? null,
        status: event.status as CollectBalanceCandidate['status'],
        financially_closed: Boolean(event.financially_closed),
        outstanding_balance_cents: Number(summary?.outstanding_balance_cents ?? 0),
        unpaid_installment_count: unpaidInstallments.length,
        next_installment_label: unpaidInstallments[0]?.label ?? null,
        client: (event.client as { full_name?: string } | null)?.full_name
          ? { full_name: (event.client as { full_name: string }).full_name }
          : null,
      } satisfies CollectBalanceCandidate
    })
    .filter(
      (candidate) =>
        candidate.outstanding_balance_cents > 0 ||
        candidate.unpaid_installment_count > 0 ||
        (candidate.status === 'completed' && !candidate.financially_closed)
    )
}

async function getTeamReadyCandidates(): Promise<TeamReadyCandidate[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const [roster, eventsResult] = await Promise.all([
    listStaffMembers(true).catch(() => []),
    db
      .from('events')
      .select(
        `
        id, occasion, event_date, guest_count, serve_time, departure_time,
        client:clients(full_name)
      `
      )
      .eq('tenant_id', user.tenantId!)
      .is('deleted_at' as any, null)
      .in('status', ['paid', 'confirmed'])
      .order('event_date', { ascending: true })
      .limit(10),
  ])

  const events = (eventsResult.data ?? []) as any[]
  if (events.length === 0) return []

  const candidates = await Promise.all(
    events.map(async (event) => {
      const assignments = (await getEventStaffRoster(event.id).catch(() => [])) as any[]
      if (assignments.length === 0 && roster.length === 0) return null

      const taskCountPromise =
        assignments.length > 0
          ? db
              .from('tasks')
              .select('id', { count: 'exact', head: true })
              .eq('event_id', event.id)
              .in(
                'assigned_to',
                assignments.map((assignment) => assignment.staff_member_id)
              )
          : Promise.resolve({ count: 0 })

      const conflicts = await Promise.all(
        assignments.map(async (assignment) => {
          const overlapping = await checkAssignmentConflict(
            assignment.staff_member_id,
            event.event_date,
            event.id
          )
          const timeConflicts = (overlapping ?? []).filter((row: any) =>
            eventsOverlapInTime(row.events, event.serve_time, event.departure_time)
          )

          if (timeConflicts.length === 0) return null

          const eventNames = uniqueStrings(
            timeConflicts.map((row: any) => row.events?.occasion || 'another event')
          )
          return `${assignment.staff_members?.name ?? 'Staff member'} overlaps with ${eventNames.join(', ')}`
        })
      )

      const taskCountResponse = await taskCountPromise
      const conflictSummaries = conflicts.filter((value): value is string => Boolean(value))
      const candidate: TeamReadyCandidate = {
        id: event.id,
        occasion: event.occasion ?? null,
        event_date: event.event_date,
        guest_count: event.guest_count ?? null,
        staff_count: assignments.length,
        has_staff_conflict: conflictSummaries.length > 0,
        conflict_summary: conflictSummaries[0] ?? null,
        has_staff_task: Number((taskCountResponse as any)?.count ?? 0) > 0,
        can_generate_staff_briefing: assignments.length > 0 && getDaysUntil(event.event_date) <= 2,
        client: (event.client as { full_name?: string } | null)?.full_name
          ? { full_name: (event.client as { full_name: string }).full_name }
          : null,
      }

      const hasActionableTeamMove =
        candidate.has_staff_conflict ||
        candidate.staff_count === 0 ||
        !candidate.has_staff_task ||
        candidate.can_generate_staff_briefing

      return hasActionableTeamMove ? candidate : null
    })
  )

  return candidates.filter((candidate): candidate is TeamReadyCandidate => Boolean(candidate))
}

async function getRelationshipNextCandidates(): Promise<RelationshipNextCandidate[]> {
  return await getNextBestActions(12).catch(() => [])
}

async function getReceiptCaptureCandidates(): Promise<ReceiptCaptureCandidate[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: events, error } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, status,
      client:clients(full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .in('status', ['confirmed', 'in_progress', 'completed'])
    .order('event_date', { ascending: false })
    .limit(12)

  if (error || !events) {
    console.error('[Dashboard] receiptCaptureCandidates failed:', error)
    return []
  }

  const eventIds = events
    .map((event: any) => event.id)
    .filter((value: unknown): value is string => typeof value === 'string')
  if (eventIds.length === 0) return []

  const [receiptRowsResult, gateRowsResult] = await Promise.all([
    db
      .from('receipt_photos')
      .select(
        `
        event_id, upload_status,
        receipt_extractions(
          receipt_line_items(id)
        )
      `
      )
      .eq('tenant_id', user.tenantId!)
      .in('event_id', eventIds),
    db
      .from('event_readiness_gates' as any)
      .select('event_id, status')
      .eq('tenant_id', user.tenantId!)
      .eq('gate', 'receipts_uploaded')
      .in('event_id', eventIds),
  ])

  const receiptRows = (receiptRowsResult.data ?? []) as any[]
  const gateRows = (gateRowsResult.data ?? []) as Array<{
    event_id: string
    status: 'pending' | 'passed' | 'overridden'
  }>

  const receiptStatsByEvent = new Map<
    string,
    {
      receiptCount: number
      needsReviewCount: number
      approvableCount: number
    }
  >()

  for (const row of receiptRows) {
    if (!row.event_id) continue

    const current = receiptStatsByEvent.get(row.event_id) ?? {
      receiptCount: 0,
      needsReviewCount: 0,
      approvableCount: 0,
    }

    const extraction = (row.receipt_extractions as any[])?.[0] ?? null
    const lineItemCount = ((extraction?.receipt_line_items as any[]) ?? []).length

    current.receiptCount += 1
    if (row.upload_status === 'needs_review') current.needsReviewCount += 1
    if (row.upload_status === 'extracted' && lineItemCount > 0) current.approvableCount += 1

    receiptStatsByEvent.set(row.event_id, current)
  }

  const gateStatusByEvent = new Map(gateRows.map((row) => [row.event_id, row.status]))

  return events
    .map((event: any) => {
      const receiptStats = receiptStatsByEvent.get(event.id) ?? {
        receiptCount: 0,
        needsReviewCount: 0,
        approvableCount: 0,
      }
      const receiptGateStatus = gateStatusByEvent.get(event.id) ?? null
      const needsUpload =
        event.status === 'completed' &&
        receiptStats.receiptCount === 0 &&
        receiptGateStatus !== 'passed' &&
        receiptGateStatus !== 'overridden'

      const candidate: ReceiptCaptureCandidate = {
        id: event.id,
        occasion: event.occasion ?? null,
        event_date: event.event_date,
        guest_count: event.guest_count ?? null,
        status: event.status,
        needs_upload: needsUpload,
        needs_review_count: receiptStats.needsReviewCount,
        approvable_count: receiptStats.approvableCount,
        client: (event.client as { full_name?: string } | null)?.full_name
          ? { full_name: (event.client as { full_name: string }).full_name }
          : null,
      }

      return candidate.needs_upload ||
        candidate.needs_review_count > 0 ||
        candidate.approvable_count > 0
        ? candidate
        : null
    })
    .filter((candidate: ReceiptCaptureCandidate | null): candidate is ReceiptCaptureCandidate =>
      Boolean(candidate)
    )
}

async function getTrustLoopCandidates(): Promise<TrustLoopCandidate[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: events, error } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, follow_up_sent_at,
      client_id,
      client:clients(full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .eq('status', 'completed')
    .eq('follow_up_sent', true)
    .not('client_id', 'is', null)
    .order('event_date', { ascending: false })
    .limit(10)

  if (error || !events) {
    console.error('[Dashboard] trustLoopCandidates failed:', error)
    return []
  }

  return Promise.all(
    events.map(async (event: any) => {
      const trustLoop = await getEventTrustLoopState(event.id).catch(() => ({ survey: null }))

      return {
        id: event.id,
        occasion: event.occasion ?? null,
        event_date: event.event_date,
        guest_count: event.guest_count ?? null,
        follow_up_sent_at: event.follow_up_sent_at ?? null,
        client: (event.client as { full_name?: string } | null)?.full_name
          ? { full_name: (event.client as { full_name: string }).full_name }
          : null,
        survey: trustLoop.survey,
      }
    })
  )
}

async function LifecycleActionLayerSection() {
  const [
    workSurfaceResult,
    prepPromptsResult,
    menuDecisionCandidatesResult,
    safetyCheckCandidatesResult,
    collectBalanceCandidatesResult,
    receiptCaptureCandidatesResult,
    teamReadyCandidatesResult,
    serviceReadyCandidatesResult,
  ] = await Promise.all([
    safeResult(
      'workSurface',
      getDashboardWorkSurface,
      null,
      'Lifecycle work surface data could not be loaded.'
    ),
    safeResult('prepPrompts', getAllPrepPrompts, [], 'Prep prompt data could not be loaded.'),
    safeResult(
      'menuDecisionCandidates',
      getMenuDecisionCandidates,
      [],
      'Menu decision data could not be loaded.'
    ),
    safeResult(
      'safetyCheckCandidates',
      getSafetyCheckCandidates,
      [],
      'Safety check data could not be loaded.'
    ),
    safeResult(
      'collectBalanceCandidates',
      getCollectBalanceCandidates,
      [],
      'Balance collection data could not be loaded.'
    ),
    safeResult(
      'receiptCaptureCandidates',
      getReceiptCaptureCandidates,
      [],
      'Receipt capture data could not be loaded.'
    ),
    safeResult(
      'teamReadyCandidates',
      getTeamReadyCandidates,
      [],
      'Team readiness data could not be loaded.'
    ),
    safeResult(
      'serviceReadyCandidates',
      getServiceReadyCandidates,
      [],
      'Service readiness data could not be loaded.'
    ),
  ])

  if (!workSurfaceResult.data) {
    if (workSurfaceResult.status === 'unavailable') {
      return (
        <DegradedDataNotice
          title="Lifecycle actions unavailable"
          detail="Core work surface data could not be loaded, so lifecycle actions are paused instead of being hidden."
        />
      )
    }
    return null
  }

  const workSurface = workSurfaceResult.data

  const [
    procurementCandidatesResult,
    prepFlowCandidatesResult,
    travelConfirmCandidatesResult,
    executionNextCandidatesResult,
  ] = await Promise.all([
    safeResult(
      'procurementCandidates',
      () => getProcurementCandidates(workSurface),
      [],
      'Procurement action data could not be loaded.'
    ),
    safeResult(
      'prepFlowCandidates',
      () => getPrepFlowCandidates(workSurface),
      [],
      'Prep flow action data could not be loaded.'
    ),
    safeResult(
      'travelConfirmCandidates',
      () => getTravelConfirmCandidates(workSurface),
      [],
      'Travel confirmation data could not be loaded.'
    ),
    safeResult(
      'executionNextCandidates',
      getExecutionNextCandidates,
      [],
      'Execution action data could not be loaded.'
    ),
  ])

  const degradedLabels = [
    isUnavailable(prepPromptsResult) ? 'prep prompts' : null,
    isUnavailable(menuDecisionCandidatesResult) ? 'menu decisions' : null,
    isUnavailable(safetyCheckCandidatesResult) ? 'safety checks' : null,
    isUnavailable(collectBalanceCandidatesResult) ? 'balances' : null,
    isUnavailable(receiptCaptureCandidatesResult) ? 'receipts' : null,
    isUnavailable(teamReadyCandidatesResult) ? 'team readiness' : null,
    isUnavailable(serviceReadyCandidatesResult) ? 'service readiness' : null,
    isUnavailable(procurementCandidatesResult) ? 'procurement' : null,
    isUnavailable(prepFlowCandidatesResult) ? 'prep flow' : null,
    isUnavailable(travelConfirmCandidatesResult) ? 'travel' : null,
    isUnavailable(executionNextCandidatesResult) ? 'execution' : null,
  ].filter((label): label is string => Boolean(label))

  const prepareTask = resolvePrepareNextTask({ workSurface, prepPrompts: prepPromptsResult.data })
  const procurementTask = resolveProcurementNextTask(procurementCandidatesResult.data)
  const prepFlowTask = resolvePrepFlowTask(prepFlowCandidatesResult.data)
  const travelTask = resolveTravelConfirmTask(travelConfirmCandidatesResult.data)
  const blockedTask = resolveFixMissingFactTask(workSurface)
  const commitTask = resolveCommitNextTask(workSurface)
  const menuTask = resolveMenuDecisionTask(
    menuDecisionCandidatesResult.data as MenuDecisionCandidate[]
  )
  const safetyTask = resolveSafetyCheckTask(
    safetyCheckCandidatesResult.data as SafetyCheckCandidate[]
  )
  const collectBalanceTask = resolveCollectBalanceTask(
    collectBalanceCandidatesResult.data as CollectBalanceCandidate[]
  )
  const receiptCaptureTask = resolveReceiptCaptureTask(
    receiptCaptureCandidatesResult.data as ReceiptCaptureCandidate[]
  )
  const teamReadyTask = resolveTeamReadyTask(teamReadyCandidatesResult.data as TeamReadyCandidate[])
  const serviceTask = resolveServiceReadyTask(serviceReadyCandidatesResult.data)
  const executionTask = resolveExecutionNextTask(executionNextCandidatesResult.data)

  if (
    !prepareTask &&
    !procurementTask &&
    !prepFlowTask &&
    !travelTask &&
    !blockedTask &&
    !commitTask &&
    !menuTask &&
    !safetyTask &&
    !collectBalanceTask &&
    !receiptCaptureTask &&
    !teamReadyTask &&
    !serviceTask &&
    !executionTask
  ) {
    if (degradedLabels.length > 0) {
      return (
        <DegradedDataNotice
          title="Lifecycle actions using partial data"
          detail={`Some action data could not be loaded: ${degradedLabels.join(', ')}.`}
        />
      )
    }
    return null
  }

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      {degradedLabels.length > 0 ? (
        <DegradedDataNotice
          title="Lifecycle actions using partial data"
          detail={`Some action data could not be loaded: ${degradedLabels.join(', ')}.`}
          className="xl:col-span-2"
        />
      ) : null}
      {prepareTask ? <ActionSurfaceCard sectionLabel="Prepare Next" task={prepareTask} /> : null}
      {procurementTask ? (
        <ActionSurfaceCard sectionLabel="Procurement Next" task={procurementTask} />
      ) : null}
      {prepFlowTask ? <ActionSurfaceCard sectionLabel="Prep Flow" task={prepFlowTask} /> : null}
      {travelTask ? <ActionSurfaceCard sectionLabel="Travel Confirm" task={travelTask} /> : null}
      {blockedTask ? (
        <ActionSurfaceCard sectionLabel="Fix Missing Fact" task={blockedTask} />
      ) : null}
      {commitTask ? <ActionSurfaceCard sectionLabel="Commit Next" task={commitTask} /> : null}
      {menuTask ? <ActionSurfaceCard sectionLabel="Menu Decision" task={menuTask} /> : null}
      {safetyTask ? <ActionSurfaceCard sectionLabel="Safety Check" task={safetyTask} /> : null}
      {collectBalanceTask ? (
        <ActionSurfaceCard sectionLabel="Collect Balance" task={collectBalanceTask} />
      ) : null}
      {receiptCaptureTask ? (
        <ActionSurfaceCard sectionLabel="Receipt Capture" task={receiptCaptureTask} />
      ) : null}
      {teamReadyTask ? <ActionSurfaceCard sectionLabel="Team Ready" task={teamReadyTask} /> : null}
      {serviceTask ? <ActionSurfaceCard sectionLabel="Service Ready" task={serviceTask} /> : null}
      {executionTask ? (
        <ActionSurfaceCard sectionLabel="Execution Next" task={executionTask} />
      ) : null}
    </section>
  )
}

async function RelationshipActionLayerSection() {
  const candidatesResult = await safeResult(
    'relationshipNextCandidates',
    getRelationshipNextCandidates,
    [],
    'Relationship action data could not be loaded.'
  )
  const task = resolveRelationshipNextTask(candidatesResult.data as RelationshipNextCandidate[])

  if (!task) {
    if (candidatesResult.status === 'unavailable') {
      return (
        <DegradedDataNotice
          title="Relationship actions unavailable"
          detail="Client relationship data could not be loaded, so the next relationship action is paused instead of being hidden."
        />
      )
    }
    return null
  }

  return (
    <section>
      {candidatesResult.status === 'unavailable' ? (
        <DegradedDataNotice
          title="Relationship actions using partial data"
          detail="Client relationship data could not be fully loaded."
          className="mb-3"
        />
      ) : null}
      <ActionSurfaceCard sectionLabel="Relationship Next" task={task} />
    </section>
  )
}

async function DashboardUpcomingCallsSection() {
  const callsResult = await getUpcomingCallsLoadState(5)

  if (callsResult.status === 'unavailable') {
    return (
      <DegradedDataNotice
        title="Upcoming calls unavailable"
        detail="Call schedule data could not be loaded, so the dashboard cannot safely confirm your next client call."
      />
    )
  }

  if (callsResult.data.length === 0) return null

  return <UpcomingCallsWidget calls={callsResult.data} />
}

async function DashboardCallIntelligenceSection() {
  try {
    const intelligence = await getCallIntelligenceSnapshot()
    return <DashboardCallIntelligenceWidget snapshot={intelligence.snapshot} />
  } catch (err) {
    console.error('[Dashboard] callIntelligence failed:', err)
    return (
      <DegradedDataNotice
        title="Call intelligence unavailable"
        detail="Call intervention data could not be loaded, so the dashboard cannot safely summarize who needs a human call."
      />
    )
  }
}

async function PostEventActionLayerSection() {
  const [eventsNeedingClosureResult, trustLoopCandidatesResult] = await Promise.all([
    safeResult(
      'eventsNeedingClosure',
      getEventsNeedingClosure,
      [],
      'Post-event closeout data could not be loaded.'
    ),
    safeResult(
      'trustLoopCandidates',
      getTrustLoopCandidates,
      [],
      'Client trust loop data could not be loaded.'
    ),
  ])

  const degradedLabels = [
    isUnavailable(eventsNeedingClosureResult) ? 'closeout' : null,
    isUnavailable(trustLoopCandidatesResult) ? 'trust loop' : null,
  ].filter((label): label is string => Boolean(label))

  const resetTask = resolveResetNextTask(eventsNeedingClosureResult.data as ResetNextCandidate[])
  const task = resolveCloseOutNextTask(eventsNeedingClosureResult.data as CloseOutCandidate[])
  const trustTask = resolveTrustLoopNextTask(trustLoopCandidatesResult.data)

  if (!resetTask && !task && !trustTask) {
    if (degradedLabels.length > 0) {
      return (
        <DegradedDataNotice
          title="Post-event actions using partial data"
          detail={`Some post-event data could not be loaded: ${degradedLabels.join(', ')}.`}
        />
      )
    }
    return null
  }

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      {degradedLabels.length > 0 ? (
        <DegradedDataNotice
          title="Post-event actions using partial data"
          detail={`Some post-event data could not be loaded: ${degradedLabels.join(', ')}.`}
          className="xl:col-span-2"
        />
      ) : null}
      {resetTask ? <ActionSurfaceCard sectionLabel="Reset Next" task={resetTask} /> : null}
      {task ? <ActionSurfaceCard sectionLabel="Close Out Next" task={task} /> : null}
      {trustTask ? <ActionSurfaceCard sectionLabel="Trust Loop Next" task={trustTask} /> : null}
    </section>
  )
}

async function WeeklyBriefingSection() {
  const briefingResult = await safeResult(
    'weeklyBriefing',
    getWeeklyPriceBriefing,
    null,
    'Weekly price briefing data could not be loaded.'
  )
  if (!briefingResult.data) {
    if (briefingResult.status === 'unavailable') {
      return (
        <DegradedDataNotice
          title="Weekly price briefing unavailable"
          detail="Latest price briefing data could not be loaded right now."
        />
      )
    }
    return null
  }
  return <WeeklyBriefingCard briefing={briefingResult.data} />
}

async function CoverageHealthSection() {
  const admin = await safe('isAdmin', isAdmin, false)
  if (!admin) return null
  return (
    <section>
      <div className="section-label mb-4">Price Coverage</div>
      <CoverageHealthWidget />
    </section>
  )
}

/** SSE subscriber for OpenClaw alerts (admin-only, renders nothing visible). */
async function OpenClawLiveAlertsSection() {
  const admin = await safe('isAdmin', isAdmin, false)
  if (!admin) return null
  return <OpenClawLiveAlerts />
}

/** Pipeline status badge (admin-only). */
async function PipelineStatusSection() {
  const admin = await safe('isAdmin', isAdmin, false)
  if (!admin) return null
  return <PipelineStatusBadge />
}

async function QuickNotesLoader() {
  const notesResult = await safeResult(
    'quickNotes',
    () => getQuickNotes({ limit: 20 }),
    [],
    'Quick notes could not be loaded.'
  )
  return (
    <>
      {notesResult.status === 'unavailable' ? (
        <DegradedDataNotice
          title="Quick notes using partial data"
          detail="Saved notes could not be loaded. New notes can still be captured."
          className="mb-3"
        />
      ) : null}
      <QuickNotesSection initialNotes={notesResult.data} />
    </>
  )
}

export default async function ChefDashboard() {
  const user = await requireChef()
  const queueResultPromise = safeResult(
    'queue',
    getPriorityQueue,
    emptyQueue,
    'Priority queue data could not be loaded.'
  )
  const queuePromise = queueResultPromise.then((result) => result.data)
  const decisionQueuePromise = safe('decisionQueue', getDecisionQueue, emptyDecisionQueue)

  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  // Resolve chef's display name for greeting (not email prefix)
  const chefGreetingName = await safe(
    'chefName',
    async () => {
      const { createServerClient } = await import('@/lib/db/server')
      const db: any = createServerClient()
      const { data } = await db
        .from('chefs')
        .select('display_name')
        .eq('id', user.tenantId)
        .single()
      const name = (data?.display_name ?? '').trim()
      // If display_name looks like an email or raw username, skip it
      if (!name || name.includes('@') || /^[a-z0-9_]+$/i.test(name)) return null
      // Extract first word (e.g. "Maria's Kitchen" -> "Maria's", "Chef Bob" -> "Chef")
      return name.split(/\s+/)[0] || null
    },
    null
  )
  const firstName = chefGreetingName

  const [
    archetype,
    onboardingProgress,
    remyAlerts,
    profileGated,
    presence,
    supportStatus,
    userIsPrivileged,
    workspaceDensity,
    returnDigestResult,
    resumeItemsResult,
    unreadNotificationResult,
  ] = await Promise.all([
    safe('archetype', () => getCachedChefArchetype(user.entityId), null),
    safe('onboardingProgress', () => getOnboardingProgress(), null),
    safe('remyAlerts', () => getActiveAlerts(10), []),
    safe(
      'profileGated',
      async () => {
        const { createServerClient } = await import('@/lib/db/server')
        const db: any = createServerClient()
        const { data } = await db
          .from('chefs')
          .select('bio, tagline, display_name, slug')
          .eq('id', user.tenantId)
          .single()
        if (!data?.slug) return false // no public page yet
        const isEmailPrefix =
          data.display_name?.includes('@') || /^[a-z0-9]+$/i.test(data.display_name?.trim() || '')
        return !(data.bio || data.tagline) || isEmailPrefix
      },
      false
    ),
    safe('presence', () => getTenantDataPresence(user.tenantId!), null),
    safe('supportStatus', () => getSupportStatus(user.entityId), null),
    safe('privilegedAccess', () => getCachedIsPrivileged(user.id), false),
    safe('workspaceDensity', getWorkspaceDensity, 'standard' as const),
    safeResult<ContinuityDigest | null>(
      'returnContinuity',
      () => loadContinuityDigest(user.tenantId!),
      null,
      'return context'
    ),
    safeResult('resumeItems', () => getResumeItems(), [], 'resume suggestions'),
    safeResult<number | null>('unreadNotifications', () => getUnreadCount(), null, 'notifications'),
  ])
  const isNewChef = presence ? isBrandNewChef(presence) : false
  const bypassProgressiveDisclosure = userIsPrivileged || process.env.DEMO_MODE_ENABLED === 'true'
  const simplifyForNewChef = isNewChef && !bypassProgressiveDisclosure
  const isMinimalDensity = workspaceDensity === 'minimal'
  const primaryAction = getDashboardPrimaryAction(archetype)

  // Time-aware greeting
  const greeting =
    timeOfDay === 'morning'
      ? "Here's your day at a glance."
      : timeOfDay === 'afternoon'
        ? 'Your afternoon overview.'
        : 'End-of-day summary.'

  return (
    <div className="space-y-8">
      {/* OpenClaw SSE listeners (admin-only, no visible UI, just toast alerts) */}
      <Suspense fallback={null}>
        <OpenClawLiveAlertsSection />
      </Suspense>

      {/* ============================================ */}
      {/* GREETING + ACTIONS                          */}
      {/* ============================================ */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-3">
            <p className="text-sm text-stone-500 font-medium">
              Good {timeOfDay}
              {firstName ? `, ${firstName}` : ''}
            </p>
            <DashboardHeartbeat tenantId={user.tenantId!} />
            {supportStatus?.badgeLabel && (
              <span className="inline-flex items-center rounded-full border border-emerald-800 bg-emerald-950/60 px-2.5 py-1 text-xs font-medium text-emerald-300">
                {supportStatus.badgeLabel}
              </span>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-display text-stone-100 mt-1 tracking-tight">
            {greeting}
          </h1>
        </div>
        <div className="flex gap-2 items-center flex-wrap shrink-0">
          <Link
            href="/briefing"
            className="inline-flex items-center justify-center px-4 py-2.5 border border-stone-700 text-stone-300 rounded-xl hover:bg-stone-800 hover:border-stone-600 transition-all font-medium text-sm"
          >
            Briefing
          </Link>
          {!simplifyForNewChef && (
            <>
              <Link
                href="/menus/new"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-stone-700 text-stone-300 rounded-xl hover:bg-stone-800 hover:border-stone-600 transition-all font-medium text-sm"
              >
                <UtensilsCrossed className="h-4 w-4" />
                Create Menu
              </Link>
              <Link
                href="/commerce/storefront"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-stone-700 text-stone-300 rounded-xl hover:bg-stone-800 hover:border-stone-600 transition-all font-medium text-sm"
              >
                <Store className="h-4 w-4" />
                Storefront
              </Link>
            </>
          )}
          <Link
            href={primaryAction.href}
            data-tour="chef-dashboard-home"
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 gradient-accent text-white rounded-xl font-medium text-sm glow-hover"
          >
            <Plus className="h-4 w-4" />
            {primaryAction.label}
          </Link>
        </div>
      </header>

      {!isMinimalDensity && (
        <ReturnToWorkStrip
          digest={returnDigestResult.data}
          resumeItems={resumeItemsResult.data}
          unreadNotificationCount={unreadNotificationResult.data}
          digestUnavailable={isUnavailable(returnDigestResult)}
          resumeItemsUnavailable={isUnavailable(resumeItemsResult)}
          unavailableLabels={[
            returnDigestResult.error,
            resumeItemsResult.error,
            unreadNotificationResult.error,
          ].filter((label): label is string => Boolean(label))}
        />
      )}

      {/* Overwhelm Detection - shows when too many items are stalling */}
      <WidgetErrorBoundary name="Overwhelm Detection" compact>
        <Suspense fallback={null}>
          <OverwhelmTriageBanner />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Communication Urgency Banner - shows when people are waiting for a response */}
      <WidgetErrorBoundary name="Communication Urgency" compact>
        <Suspense fallback={null}>
          <CommunicationUrgencyBanner />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Recipe Urgency Banner - shows when dishes served have no recipes recorded */}
      <WidgetErrorBoundary name="Recipe Urgency" compact>
        <Suspense fallback={null}>
          <RecipeUrgencyBanner />
        </Suspense>
      </WidgetErrorBoundary>

      {!isMinimalDensity && (
        <WidgetErrorBoundary name="Client Pulse" compact>
          <Suspense fallback={null}>
            <PulseSummary />
          </Suspense>
        </WidgetErrorBoundary>
      )}

      {!isMinimalDensity && (
        <WidgetErrorBoundary name="Decision Queue" compact>
          <Suspense fallback={<WidgetCardSkeleton size="md" />}>
            <DecisionQueueSection decisionQueuePromise={decisionQueuePromise} />
          </Suspense>
        </WidgetErrorBoundary>
      )}

      {!isMinimalDensity && (
        <WidgetErrorBoundary name="Resolve Next" compact>
          <Suspense fallback={<ResolveNextSkeleton />}>
            <ResolveNextSection
              queueResultPromise={queueResultPromise}
              onboardingProgress={onboardingProgress}
              profileGated={profileGated}
            />
          </Suspense>
        </WidgetErrorBoundary>
      )}

      {!isMinimalDensity && (
        <WidgetErrorBoundary name="Lifecycle Actions" compact>
          <Suspense fallback={null}>
            <LifecycleActionLayerSection />
          </Suspense>
        </WidgetErrorBoundary>
      )}

      {!isMinimalDensity && (
        <WidgetErrorBoundary name="Relationship Actions" compact>
          <Suspense fallback={null}>
            <RelationshipActionLayerSection />
          </Suspense>
        </WidgetErrorBoundary>
      )}

      {/* Onboarding banner - shows until setup is complete, then auto-hides */}
      {!isMinimalDensity && <OnboardingBanner />}

      {/* Profile gated warning - public profile hidden because bio/tagline missing */}
      {!isMinimalDensity && profileGated && (
        <div className="rounded-xl border border-amber-800/40 bg-amber-950/30 px-5 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-amber-300">
            Your public profile is hidden because it&apos;s missing a bio or tagline.
          </p>
          <Link
            href="/settings/my-profile"
            className="text-sm font-medium text-amber-400 hover:text-amber-300 whitespace-nowrap"
          >
            Complete Profile &rarr;
          </Link>
        </div>
      )}

      {/* Onboarding checklist widget - shows setup progress until all phases complete */}
      {!isMinimalDensity && onboardingProgress && (
        <OnboardingChecklistWidget progress={onboardingProgress} />
      )}

      {/* Getting Started - shown for brand-new chefs, auto-hides as they add data */}
      {!isMinimalDensity && presence && simplifyForNewChef && (
        <GettingStartedSection presence={presence} />
      )}

      {/* Remy proactive alerts - urgent/high priority items needing attention */}
      {!isMinimalDensity && remyAlerts.length > 0 && (
        <div>
          <div className="section-label mb-3">Alerts</div>
          <RemyAlertsWidget alerts={remyAlerts} />
        </div>
      )}

      {!isMinimalDensity && (
        <WidgetErrorBoundary name="Culinary Radar" compact>
          <Suspense fallback={<WidgetCardSkeleton size="md" />}>
            <CulinaryRadarWidget />
          </Suspense>
        </WidgetErrorBoundary>
      )}

      {/* Event Deadline Alerts - approaching events with missing items */}
      {!isMinimalDensity && (
        <WidgetErrorBoundary name="Event Deadlines" compact>
          <Suspense fallback={null}>
            <EventDeadlineAlerts />
          </Suspense>
        </WidgetErrorBoundary>
      )}

      {/* ============================================ */}
      {/* RESTAURANT DAILY OPS - prime cost, labor %  */}
      {/* Shows for restaurant/food-truck/bakery only */}
      {/* ============================================ */}
      {!isMinimalDensity &&
        archetype &&
        ['restaurant', 'food-truck', 'bakery'].includes(archetype) && (
          <WidgetErrorBoundary name="Restaurant Metrics" compact>
            <Suspense fallback={<RestaurantMetricsSkeleton />}>
              <RestaurantMetricsSection />
            </Suspense>
          </WidgetErrorBoundary>
        )}

      {/* ============================================ */}
      {/* MULTI-LOCATION OVERVIEW                      */}
      {/* Shows for operators with 2+ business locations */}
      {/* ============================================ */}
      {!isMinimalDensity && (
        <WidgetErrorBoundary name="Multi-Location Summary" compact>
          <Suspense fallback={<MultiLocationSummarySkeleton />}>
            <MultiLocationSummary />
          </Suspense>
        </WidgetErrorBoundary>
      )}

      {/* ============================================ */}
      {/* TODAY & THIS WEEK - first thing a chef needs */}
      {/* ============================================ */}
      <section>
        <div className="section-label mb-4">Today &amp; This Week</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-grid">
          <WidgetErrorBoundary name="Schedule" compact>
            <Suspense fallback={<ScheduleCardsSkeleton />}>
              <ScheduleCards />
            </Suspense>
          </WidgetErrorBoundary>
          <Suspense fallback={null}>
            <WidgetErrorBoundary name="Prep Pressure">
              <div className="col-span-full">
                <PrepPressureCard />
              </div>
            </WidgetErrorBoundary>
          </Suspense>
          <WidgetErrorBoundary name="Saturation" compact>
            <Suspense fallback={<SaturationCardsSkeleton />}>
              <SaturationCards />
            </Suspense>
          </WidgetErrorBoundary>
        </div>
      </section>

      {/* ============================================ */}
      {/* EVENT READINESS - completion scores           */}
      {/* Hidden until the chef has created events     */}
      {/* ============================================ */}
      {!isMinimalDensity && (bypassProgressiveDisclosure || !presence || presence.hasEvents) && (
        <WidgetErrorBoundary name="Event Readiness" compact>
          <Suspense fallback={null}>
            <CompletionSummaryWidgetServer />
          </Suspense>
        </WidgetErrorBoundary>
      )}

      {/* Network Activity - hidden until network use */}
      {!isMinimalDensity && (bypassProgressiveDisclosure || !presence || presence.hasNetwork) && (
        <WidgetErrorBoundary name="Network Activity" compact>
          <Suspense fallback={null}>
            <NetworkActivitySection />
          </Suspense>
        </WidgetErrorBoundary>
      )}

      {!isMinimalDensity && (
        <WidgetErrorBoundary name="Network Intelligence" compact>
          <Suspense fallback={<WidgetCardSkeleton size="md" />}>
            <NetworkIntelligenceSection />
          </Suspense>
        </WidgetErrorBoundary>
      )}

      {/* Dinner Circles - hidden until circles exist */}
      {!isMinimalDensity && (bypassProgressiveDisclosure || !presence || presence.hasCircles) && (
        <WidgetErrorBoundary name="Dinner Circles" compact>
          <Suspense fallback={null}>
            <DinnerCirclesSection />
          </Suspense>
        </WidgetErrorBoundary>
      )}

      {/* ============================================ */}
      {/* FOCUS: What needs attention now              */}
      {/* ============================================ */}
      {!isMinimalDensity && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-grid">
          {/* PRIORITY QUEUE (streamed, non-blocking) */}
          <WidgetErrorBoundary name="Priority Queue" compact>
            <Suspense fallback={<PriorityQueueSkeleton />}>
              <PriorityQueueSection queuePromise={queuePromise} />
            </Suspense>
          </WidgetErrorBoundary>

          <WidgetErrorBoundary name="Upcoming Calls" compact>
            <Suspense fallback={<WidgetCardSkeleton size="md" />}>
              <DashboardUpcomingCallsSection />
            </Suspense>
          </WidgetErrorBoundary>

          <WidgetErrorBoundary name="Call Intelligence" compact>
            <Suspense fallback={<WidgetCardSkeleton size="md" />}>
              <DashboardCallIntelligenceSection />
            </Suspense>
          </WidgetErrorBoundary>

          {/* POST-EVENT ACTIONS (internal close-out + client trust loop) */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-4">
            <WidgetErrorBoundary name="Post-Event Actions" compact>
              <Suspense fallback={null}>
                <PostEventActionLayerSection />
              </Suspense>
            </WidgetErrorBoundary>
          </div>

          {/* UPCOMING TOUCHPOINTS (streamed, non-blocking) */}
          <WidgetErrorBoundary name="Upcoming Touchpoints" compact>
            <Suspense fallback={<TouchpointsSkeleton />}>
              <TouchpointsSection />
            </Suspense>
          </WidgetErrorBoundary>

          <WidgetErrorBoundary name="Gift Suggestions" compact>
            <Suspense fallback={<WidgetCardSkeleton size="md" />}>
              <GiftSuggestionsWidget />
            </Suspense>
          </WidgetErrorBoundary>
        </div>
      )}

      {/* ============================================ */}
      {/* SMART SUGGESTIONS - actionable data gaps     */}
      {/* ============================================ */}
      {!isMinimalDensity && (
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div className="section-label">Suggestions</div>
            <Suspense fallback={null}>
              <MetricsStrip />
            </Suspense>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-grid">
            <WidgetErrorBoundary name="Smart Suggestions" compact>
              <Suspense fallback={<SmartSuggestionsSkeleton />}>
                <SmartSuggestions />
              </Suspense>
            </WidgetErrorBoundary>
          </div>
        </section>
      )}

      {/* ============================================ */}
      {/* QUICK NOTES - capture pad, below the fold   */}
      {/* ============================================ */}
      <WidgetErrorBoundary name="Quick Notes" compact>
        <Suspense fallback={<WidgetCardSkeleton size="md" />}>
          <QuickNotesLoader />
        </Suspense>
      </WidgetErrorBoundary>

      {/* ============================================ */}
      {/* SECONDARY INSIGHTS (collapsed by default)   */}
      {/* Hidden entirely for brand-new chefs          */}
      {/* ============================================ */}
      {!simplifyForNewChef && !isMinimalDensity && (
        <DashboardSecondaryInsights>
          {/* BUSINESS OVERVIEW - metrics moved here, not above-fold */}
          <section className="px-4 pt-4">
            <div className="section-label mb-4">Business Overview</div>
            <WidgetErrorBoundary name="Hero Metrics" compact>
              <Suspense fallback={<HeroMetricsSkeleton />}>
                <HeroMetrics archetype={archetype} />
              </Suspense>
            </WidgetErrorBoundary>
          </section>

          {/* COMMAND CENTER - feature directory, accessible but not daily-driver */}
          <section className="px-4">
            <WidgetErrorBoundary name="Command Center" compact>
              <Suspense fallback={<CommandCenterSkeleton />}>
                <CommandCenterSection />
              </Suspense>
            </WidgetErrorBoundary>
          </section>

          {/* WEEKLY PRICE BRIEFING */}
          <section className="px-4">
            <WidgetErrorBoundary name="WeeklyBriefing" compact>
              <Suspense fallback={null}>
                <WeeklyBriefingSection />
              </Suspense>
            </WidgetErrorBoundary>
          </section>

          {/* PRICE COVERAGE HEALTH + PIPELINE STATUS (admin only) */}
          <section className="px-4">
            <Suspense fallback={null}>
              <CoverageHealthSection />
            </Suspense>
            <div className="mt-2">
              <Suspense fallback={null}>
                <PipelineStatusSection />
              </Suspense>
            </div>
          </section>

          {/* ALERTS + INTELLIGENCE */}
          <section className="px-4">
            <div className="section-label mb-4">Alerts &amp; Health</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-grid">
              <WidgetErrorBoundary name="Alerts" compact>
                <Suspense fallback={<AlertCardsSkeleton />}>
                  <AlertCards />
                </Suspense>
              </WidgetErrorBoundary>

              <WidgetErrorBoundary name="Intelligence" compact>
                <Suspense fallback={<IntelligenceCardsSkeleton />}>
                  <IntelligenceCards />
                </Suspense>
              </WidgetErrorBoundary>
            </div>
          </section>

          {/* BUSINESS METRICS */}
          <section className="px-4">
            <div className="section-label mb-4">Business</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-grid">
              <WidgetErrorBoundary name="Business" compact>
                <Suspense fallback={<BusinessCardsSkeleton />}>
                  <BusinessCards />
                </Suspense>
              </WidgetErrorBoundary>
            </div>
          </section>
        </DashboardSecondaryInsights>
      )}
    </div>
  )
}
