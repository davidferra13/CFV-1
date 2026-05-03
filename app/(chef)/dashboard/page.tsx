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
import { ArrowRight, Plus, Store, UtensilsCrossed } from '@/components/ui/icons'
import type { PriorityQueue } from '@/lib/queue/types'
import { CommandCenterSection } from './_sections/command-center-data'
import { ListCard, type ListCardItem } from '@/components/dashboard/widget-cards/list-card'
import { WidgetCardSkeleton } from '@/components/dashboard/widget-cards/widget-card-shell'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import { OnboardingBanner } from '@/components/onboarding/onboarding-banner'
import UpcomingTouchpoints from '@/components/clients/upcoming-touchpoints'
import { getUpcomingTouchpoints } from '@/lib/clients/touchpoint-actions'
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
  type SurfaceActionTask,
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
import { StaleItemsWidget } from '@/components/dashboard/stale-items-widget'
import { getStaleItems } from '@/lib/actions/stale-items'
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
import { ClientAttentionSection } from './_sections/client-attention-data'
import { NetworkActivitySection } from './_sections/network-activity'
import { OnboardingChecklistWidget } from '@/components/dashboard/onboarding-checklist-widget'
import { getOnboardingProgress } from '@/lib/onboarding/progress-actions'
import { getDashboardWorkSurface } from '@/lib/workflow/actions'
import type { DashboardWorkSurface, WorkStage } from '@/lib/workflow/types'
import { getAllPrepPrompts, getEventDOPProgress, getWeekSchedule } from '@/lib/scheduling/actions'
import { autoSuggestEventBlocks } from '@/lib/scheduling/prep-block-actions'
import { getEventsNeedingClosure } from '@/lib/events/actions'
import { getNextUpcomingEvent, getTodayActionCount } from '@/lib/dashboard/actions'
import { DayTimeline, type TimelineEvent } from '@/components/dashboard/day-timeline'
import { StaggerIn } from '@/components/dashboard/stagger-in'
import { MomentumIndicator } from '@/components/dashboard/momentum-indicator'
import { LiveCountdown } from '@/components/dashboard/live-countdown'
import { AmbientBackground, type WorkloadState } from '@/components/dashboard/ambient-background'
import { KeyboardNav } from '@/components/dashboard/keyboard-nav'
import { TypewriterText } from '@/components/dashboard/typewriter-text'
import { ParticleField } from '@/components/dashboard/particle-field'
import { TimePalette } from '@/components/dashboard/time-palette'
import {
  AmbientContextWidget,
  AmbientContextSkeleton,
} from '@/components/dashboard/ambient-context-widget'
import { getAmbientContext } from '@/lib/ambient/actions'
import { AnimatedCounter } from '@/components/dashboard/animated-counter'
import { WeekStrip } from '@/components/dashboard/week-strip'
import { format } from 'date-fns'
import { getTenantDataPresence } from '@/lib/progressive-disclosure/tenant-data-presence'
import { isBrandNewChef } from '@/lib/progressive-disclosure/nav-visibility'
import { GettingStartedSection } from '@/components/dashboard/getting-started-section'
import { getWorkspaceDensity } from '@/lib/chef/preferences-actions'
import { getDocumentReadiness } from '@/lib/documents/actions'
import { hasAllergyData } from '@/lib/documents/generate-allergy-card'
import { checkMenuAllergenConflicts } from '@/lib/dietary/cross-contamination-check'
import { getEventReadiness } from '@/lib/events/readiness'
import { getLatestGroceryQuote } from '@/lib/grocery/pricing-actions'
import { getEventTrustLoopState } from '@/lib/events/post-event-trust-loop-actions'
import { getNextBestActions } from '@/lib/clients/next-best-action'
import { ChefTipsWidget } from '@/components/dashboard/cheftips-widget'
import {
  getTodaysTips,
  getCachedTipStats,
  getRandomPastTip,
} from '@/lib/chef/knowledge/tip-actions'
import { getReviewQueueCount } from '@/lib/knowledge/review-actions'
import { checkAssignmentConflict, getEventStaffRoster, listStaffMembers } from '@/lib/staff/actions'
import { eventsOverlapInTime } from '@/lib/staff/time-overlap'
import { getSupportStatus } from '@/lib/monetization/status'
import { getDecisionQueue, type DecisionQueueResult } from '@/lib/decision-queue/actions'

export const metadata: Metadata = { title: 'Dashboard' }

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Dashboard] ${label} failed:`, err)
    return fallback
  }
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
  queuePromise,
  onboardingProgress,
  profileGated,
}: {
  queuePromise: Promise<PriorityQueue>
  onboardingProgress: Awaited<ReturnType<typeof getOnboardingProgress>> | null
  profileGated: boolean
}) {
  const queue = await queuePromise
  const task = resolveDashboardNextTask({
    priorityQueue: queue,
    onboardingProgress,
    profileGated,
  })

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
    workSurface,
    prepPrompts,
    menuDecisionCandidates,
    safetyCheckCandidates,
    collectBalanceCandidates,
    receiptCaptureCandidates,
    teamReadyCandidates,
    serviceReadyCandidates,
  ] = await Promise.all([
    safe('workSurface', getDashboardWorkSurface, null),
    safe('prepPrompts', getAllPrepPrompts, []),
    safe('menuDecisionCandidates', getMenuDecisionCandidates, []),
    safe('safetyCheckCandidates', getSafetyCheckCandidates, []),
    safe('collectBalanceCandidates', getCollectBalanceCandidates, []),
    safe('receiptCaptureCandidates', getReceiptCaptureCandidates, []),
    safe('teamReadyCandidates', getTeamReadyCandidates, []),
    safe('serviceReadyCandidates', getServiceReadyCandidates, []),
  ])

  if (!workSurface) return null

  const [
    procurementCandidates,
    prepFlowCandidates,
    travelConfirmCandidates,
    executionNextCandidates,
  ] = await Promise.all([
    safe('procurementCandidates', () => getProcurementCandidates(workSurface), []),
    safe('prepFlowCandidates', () => getPrepFlowCandidates(workSurface), []),
    safe('travelConfirmCandidates', () => getTravelConfirmCandidates(workSurface), []),
    safe('executionNextCandidates', getExecutionNextCandidates, []),
  ])

  const prepareTask = resolvePrepareNextTask({ workSurface, prepPrompts })
  const procurementTask = resolveProcurementNextTask(procurementCandidates)
  const prepFlowTask = resolvePrepFlowTask(prepFlowCandidates)
  const travelTask = resolveTravelConfirmTask(travelConfirmCandidates)
  const blockedTask = resolveFixMissingFactTask(workSurface)
  const commitTask = resolveCommitNextTask(workSurface)
  const menuTask = resolveMenuDecisionTask(menuDecisionCandidates as MenuDecisionCandidate[])
  const safetyTask = resolveSafetyCheckTask(safetyCheckCandidates as SafetyCheckCandidate[])
  const collectBalanceTask = resolveCollectBalanceTask(
    collectBalanceCandidates as CollectBalanceCandidate[]
  )
  const receiptCaptureTask = resolveReceiptCaptureTask(
    receiptCaptureCandidates as ReceiptCaptureCandidate[]
  )
  const teamReadyTask = resolveTeamReadyTask(teamReadyCandidates as TeamReadyCandidate[])
  const serviceTask = resolveServiceReadyTask(serviceReadyCandidates)
  const executionTask = resolveExecutionNextTask(executionNextCandidates)

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
    return null
  }

  return (
    <section className="grid gap-4 xl:grid-cols-2">
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
  const candidates = await safe('relationshipNextCandidates', getRelationshipNextCandidates, [])
  const task = resolveRelationshipNextTask(candidates as RelationshipNextCandidate[])

  if (!task) return null

  return (
    <section>
      <ActionSurfaceCard sectionLabel="Relationship Next" task={task} />
    </section>
  )
}

async function PostEventActionLayerSection() {
  const [eventsNeedingClosure, trustLoopCandidates] = await Promise.all([
    safe('eventsNeedingClosure', getEventsNeedingClosure, []),
    safe('trustLoopCandidates', getTrustLoopCandidates, []),
  ])

  const resetTask = resolveResetNextTask(eventsNeedingClosure as ResetNextCandidate[])
  const task = resolveCloseOutNextTask(eventsNeedingClosure as CloseOutCandidate[])
  const trustTask = resolveTrustLoopNextTask(trustLoopCandidates)

  if (!resetTask && !task && !trustTask) return null

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      {resetTask ? <ActionSurfaceCard sectionLabel="Reset Next" task={resetTask} /> : null}
      {task ? <ActionSurfaceCard sectionLabel="Close Out Next" task={task} /> : null}
      {trustTask ? <ActionSurfaceCard sectionLabel="Trust Loop Next" task={trustTask} /> : null}
    </section>
  )
}

async function WeeklyBriefingSection() {
  const briefing = await safe('weeklyBriefing', getWeeklyPriceBriefing, null)
  if (!briefing) return null
  return <WeeklyBriefingCard briefing={briefing} />
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
  const notes = await safe('quickNotes', () => getQuickNotes({ limit: 20 }), [])
  return <QuickNotesSection initialNotes={notes} />
}

export default async function ChefDashboard() {
  const user = await requireChef()
  const queue = await safe('queue', getPriorityQueue, emptyQueue)

  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const firstName = (user.email ?? '').split('@')[0].split('.')[0]

  const ambientContext = await safe('ambient', getAmbientContext, null)

  const [onboardingProgress, profileGated, presence, todayActionCount] = await Promise.all([
    safe('onboardingProgress', () => getOnboardingProgress(), null),
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
        if (!data?.slug) return false
        const isEmailPrefix =
          data.display_name?.includes('@') || /^[a-z0-9]+$/i.test(data.display_name?.trim() || '')
        return !(data.bio || data.tagline) || isEmailPrefix
      },
      false
    ),
    safe('presence', () => getTenantDataPresence(user.tenantId!), null),
    safe('momentum', getTodayActionCount, 0),
  ])
  const isNewChef = presence ? isBrandNewChef(presence) : false

  // Resolve the ONE primary action
  const heroTask = resolveDashboardNextTask({
    priorityQueue: queue,
    onboardingProgress,
    profileGated,
  })

  // Onboarding graduates out once chef has real data or 4/6 steps done
  const onboardingComplete =
    onboardingProgress &&
    (onboardingProgress.completedSteps >= 4 ||
      (presence && (presence.hasEvents || presence.hasInquiries)))
  const showOnboarding = isNewChef && !onboardingComplete

  // Context-aware greeting based on actual chef state
  const waitingCount =
    queue.summary.byDomain.inquiry + queue.summary.byDomain.message + queue.summary.byDomain.client
  const contextGreeting =
    heroTask.source === 'clear'
      ? 'All clear. Nothing waiting on you.'
      : waitingCount > 5
        ? `${waitingCount} people are waiting on you.`
        : waitingCount > 0
          ? `${waitingCount} ${waitingCount === 1 ? 'person is' : 'people are'} waiting on you.`
          : 'Here\u2019s your next move.'

  // Compute workload state for ambient background
  const criticalCount = queue.summary.byUrgency.critical + queue.summary.byUrgency.high
  const workloadState: WorkloadState = queue.summary.allCaughtUp
    ? 'clear'
    : criticalCount > 0
      ? 'overdue'
      : queue.summary.totalItems > 10
        ? 'busy'
        : 'light'

  return (
    <div className="mx-auto max-w-2xl space-y-12 py-6">
      {/* Ambient mood background + particles */}
      <AmbientBackground state={workloadState} />
      <ParticleField state={workloadState} />

      {/* Invisible SSE listener for admin alerts */}
      <Suspense fallback={null}>
        <OpenClawLiveAlertsSection />
      </Suspense>

      {/* ============================================ */}
      {/* BLOCK 1: HERO - Greeting + One Action        */}
      {/* ============================================ */}
      <StaggerIn index={0}>
        <section className="space-y-8">
          {/* Time-aware accent line + color temperature overlay */}
          <TimePalette />

          {/* Ambient context: location, weather, sun/moon arc */}
          {ambientContext && <AmbientContextWidget context={ambientContext} />}

          <header className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm text-stone-500 font-medium tracking-wide">
                Good {timeOfDay}
                {firstName ? `, ${firstName}` : ''}
              </p>
              <h1 className="text-2xl sm:text-3xl font-display text-stone-100 tracking-tight">
                <TypewriterText text={contextGreeting} speed={20} delay={150} />
              </h1>
            </div>
            <MomentumIndicator count={todayActionCount} />
          </header>

          {/* Count strip */}
          <Suspense fallback={null}>
            <CountStrip queueSummary={queue.summary} />
          </Suspense>

          {/* Hero action card */}
          {heroTask.source !== 'clear' && (
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-stone-900/30 backdrop-blur-xl p-6 sm:p-8 space-y-5 shadow-lg shadow-black/20 hover-lift shimmer-border">
              {/* Subtle glow behind card */}
              <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-brand-500/[0.07] blur-3xl" />
              <div className="relative space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-400/80">
                  {heroTask.badge}
                </p>
                <h2 className="text-xl sm:text-2xl font-display tracking-tight text-stone-50 leading-snug">
                  {heroTask.title}
                </h2>
                <p className="text-sm leading-relaxed text-stone-400 max-w-lg">
                  {heroTask.description}
                </p>
              </div>
              {heroTask.context.length > 0 && (
                <div className="relative flex flex-wrap gap-2">
                  {heroTask.context.map((chip) => (
                    <span
                      key={chip}
                      className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-2.5 py-1 text-xs text-stone-400"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              )}
              <Link
                href={heroTask.href}
                className="relative inline-flex items-center gap-2 rounded-xl gradient-accent px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/20 hover:shadow-lg hover:shadow-brand-500/30 hover:brightness-110 transition-all glow-hover"
              >
                {heroTask.ctaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {/* Onboarding for brand-new chefs only */}
          {showOnboarding && presence && <GettingStartedSection presence={presence} />}
        </section>
      </StaggerIn>

      {/* ============================================ */}
      {/* BLOCK 2: SCHEDULE STRIP + DAY TIMELINE       */}
      {/* ============================================ */}
      <StaggerIn index={1}>
        <WidgetErrorBoundary name="Schedule" compact>
          <Suspense fallback={<ScheduleStripSkeleton />}>
            <ScheduleStripSection />
          </Suspense>
        </WidgetErrorBoundary>
      </StaggerIn>

      {/* ============================================ */}
      {/* BLOCK 2.5: STALE ITEMS (NEEDS ATTENTION)     */}
      {/* ============================================ */}
      <Suspense fallback={null}>
        <StaleItemsSection />
      </Suspense>

      {/* ============================================ */}
      {/* BLOCK 2.7: DIETARY CHANGE ALERTS             */}
      {/* ============================================ */}
      <Suspense fallback={null}>
        <DietaryAlertsBanner />
      </Suspense>

      {/* ============================================ */}
      {/* BLOCK 3: UP NEXT QUEUE                       */}
      {/* ============================================ */}
      <StaggerIn index={2}>
        <WidgetErrorBoundary name="Up Next" compact>
          <Suspense fallback={<UpNextSkeleton />}>
            <UpNextSection />
          </Suspense>
        </WidgetErrorBoundary>
      </StaggerIn>

      {/* Keyboard navigation */}
      <StaggerIn index={3}>
        <KeyboardNav heroHref={heroTask.source !== 'clear' ? heroTask.href : null} />
      </StaggerIn>
    </div>
  )
}

// ─── Count Strip ─────────────────────────────────────────
function CountStrip({ queueSummary }: { queueSummary: PriorityQueue['summary'] }) {
  const waitingCount =
    queueSummary.byDomain.inquiry + queueSummary.byDomain.message + queueSummary.byDomain.client
  const eventCount = queueSummary.byDomain.event
  const financialCount = queueSummary.byDomain.financial + queueSummary.byDomain.quote

  if (queueSummary.allCaughtUp) return null

  const items = [
    waitingCount > 0 && { label: 'people waiting', value: waitingCount },
    eventCount > 0 && { label: 'event actions', value: eventCount },
    financialCount > 0 && { label: 'financial', value: financialCount },
  ].filter(Boolean) as Array<{ label: string; value: number }>

  if (items.length === 0) return null

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {items.map((item, i) => (
        <div key={item.label} className="flex items-center gap-3">
          {i > 0 && <div className="h-4 w-px bg-stone-800" />}
          <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-stone-900/25 backdrop-blur-md px-3 py-1.5">
            <AnimatedCounter
              value={item.value}
              delay={200 + i * 100}
              className="text-base font-semibold tabular-nums text-stone-100"
            />
            <span className="text-xs text-stone-500">{item.label}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Stale Items ────────────────────────────────────────
async function StaleItemsSection() {
  const items = await safe('staleItems', getStaleItems, [])
  if (items.length === 0) return null
  return (
    <StaggerIn index={1}>
      <StaleItemsWidget items={items} />
    </StaggerIn>
  )
}

// ─── Schedule Strip ─────────────────────────────────────
async function ScheduleStripSection() {
  const [weekSchedule, nextEvent] = await Promise.all([
    safe('weekSchedule', () => getWeekSchedule(0), {
      weekStart: '',
      weekEnd: '',
      days: [],
      warnings: [],
    }),
    safe('nextEvent', getNextUpcomingEvent, null),
  ])

  const weekEvents = weekSchedule.days.flatMap((d) => d.events)
  const totalEvents = weekEvents.length
  const totalGuests = weekEvents.reduce((sum, e) => sum + (e.guestCount ?? 0), 0)

  // Today's events for the day timeline
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayDay = weekSchedule.days.find((d) => d.date === todayStr)
  const timelineEvents: TimelineEvent[] = (todayDay?.events ?? [])
    .filter((e) => e.serveTime && e.serveTime !== 'TBD')
    .map((e) => ({
      id: e.id,
      occasion: e.occasion,
      serveTime: e.serveTime,
      guestCount: e.guestCount,
    }))

  // Relative time for next event
  const daysUntilNext = nextEvent ? getDaysUntil(nextEvent.eventDate) : null
  const relativeTime =
    daysUntilNext === null
      ? null
      : daysUntilNext === 0
        ? 'Today'
        : daysUntilNext === 1
          ? 'Tomorrow'
          : `in ${daysUntilNext} days`
  const isUrgent = daysUntilNext !== null && daysUntilNext <= 1

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">Schedule</h2>

      {/* Next event card */}
      <div
        className={`rounded-2xl border p-5 backdrop-blur-xl transition-colors hover-lift ${
          isUrgent ? 'border-amber-500/15 bg-amber-950/15' : 'border-white/[0.06] bg-stone-900/25'
        }`}
      >
        {nextEvent ? (
          <Link
            href={`/events/${nextEvent.id}`}
            className="flex items-center justify-between group"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <p className="text-stone-100 font-medium truncate">
                  {nextEvent.occasion || 'Event'}
                </p>
                <LiveCountdown
                  eventDate={nextEvent.eventDate}
                  serveTime={nextEvent.serveTime ?? null}
                />
              </div>
              <p className="text-sm text-stone-500 mt-0.5">
                {format(new Date(nextEvent.eventDate + 'T12:00:00'), 'EEEE, MMM d')}
                {nextEvent.guestCount ? ` \u00B7 ${nextEvent.guestCount} guests` : ''}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-stone-600 group-hover:text-stone-300 shrink-0 transition-colors" />
          </Link>
        ) : (
          <p className="text-sm text-stone-500">No upcoming events.</p>
        )}
      </div>

      {/* Day timeline - shows when there are events today or this week */}
      {(timelineEvents.length > 0 || totalEvents > 0) && (
        <div className="rounded-2xl border border-white/[0.06] bg-stone-900/20 backdrop-blur-xl p-4 hover-lift">
          <DayTimeline events={timelineEvents} />
        </div>
      )}

      {/* Week summary + strip */}
      {totalEvents > 0 && (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <p className="text-sm text-stone-300">
              {totalEvents} event{totalEvents !== 1 ? 's' : ''} this week
              {totalGuests > 0 ? ` \u00B7 ${totalGuests} guests` : ''}
            </p>
            <Link
              href="/calendar/week"
              className="text-xs font-medium text-stone-500 hover:text-stone-300 transition-colors"
            >
              Full schedule &rarr;
            </Link>
          </div>
          <WeekStrip schedule={weekSchedule} />
        </div>
      )}
    </section>
  )
}

function ScheduleStripSkeleton() {
  return (
    <section className="space-y-4">
      <div className="h-3 w-16 loading-bone loading-bone-muted rounded" />
      <div className="rounded-2xl border border-stone-800 bg-stone-900/40 p-5">
        <div className="h-5 w-48 loading-bone loading-bone-muted rounded" />
        <div className="h-4 w-32 loading-bone loading-bone-muted rounded mt-2" />
      </div>
    </section>
  )
}

// ─── Up Next Queue ──────────────────────────────────────
async function UpNextSection() {
  // Gather all action tasks from every layer
  const [workSurface, prepPrompts] = await Promise.all([
    safe('workSurface', getDashboardWorkSurface, null),
    safe('prepPrompts', getAllPrepPrompts, []),
  ])

  const [
    menuDecisionCandidates,
    safetyCheckCandidates,
    collectBalanceCandidates,
    receiptCaptureCandidates,
    teamReadyCandidates,
    serviceReadyCandidates,
    relationshipCandidates,
    eventsNeedingClosure,
    trustLoopCandidates,
  ] = await Promise.all([
    safe('menuDecisionCandidates', getMenuDecisionCandidates, []),
    safe('safetyCheckCandidates', getSafetyCheckCandidates, []),
    safe('collectBalanceCandidates', getCollectBalanceCandidates, []),
    safe('receiptCaptureCandidates', getReceiptCaptureCandidates, []),
    safe('teamReadyCandidates', getTeamReadyCandidates, []),
    safe('serviceReadyCandidates', getServiceReadyCandidates, []),
    safe('relationshipCandidates', getRelationshipNextCandidates, []),
    safe('eventsNeedingClosure', getEventsNeedingClosure, []),
    safe('trustLoopCandidates', getTrustLoopCandidates, []),
  ])

  // Resolve lifecycle tasks (only if work surface exists)
  const lifecycleTasks: Array<{ label: string; task: SurfaceActionTask }> = []
  if (workSurface) {
    const [
      procurementCandidates,
      prepFlowCandidates,
      travelConfirmCandidates,
      executionNextCandidates,
    ] = await Promise.all([
      safe('procurement', () => getProcurementCandidates(workSurface), []),
      safe('prepFlow', () => getPrepFlowCandidates(workSurface), []),
      safe('travel', () => getTravelConfirmCandidates(workSurface), []),
      safe('execution', getExecutionNextCandidates, []),
    ])

    const pairs: Array<[string, SurfaceActionTask | null]> = [
      ['Prepare', resolvePrepareNextTask({ workSurface, prepPrompts })],
      ['Procurement', resolveProcurementNextTask(procurementCandidates)],
      ['Prep Flow', resolvePrepFlowTask(prepFlowCandidates)],
      ['Travel', resolveTravelConfirmTask(travelConfirmCandidates)],
      ['Blocked', resolveFixMissingFactTask(workSurface)],
      ['Commit', resolveCommitNextTask(workSurface)],
      ['Menu', resolveMenuDecisionTask(menuDecisionCandidates as MenuDecisionCandidate[])],
      ['Safety', resolveSafetyCheckTask(safetyCheckCandidates as SafetyCheckCandidate[])],
      ['Balance', resolveCollectBalanceTask(collectBalanceCandidates as CollectBalanceCandidate[])],
      [
        'Receipts',
        resolveReceiptCaptureTask(receiptCaptureCandidates as ReceiptCaptureCandidate[]),
      ],
      ['Team', resolveTeamReadyTask(teamReadyCandidates as TeamReadyCandidate[])],
      ['Service', resolveServiceReadyTask(serviceReadyCandidates)],
      ['Execution', resolveExecutionNextTask(executionNextCandidates)],
    ]

    for (const [label, task] of pairs) {
      if (task) lifecycleTasks.push({ label, task })
    }
  }

  // Relationship + post-event tasks
  const relationshipTask = resolveRelationshipNextTask(
    relationshipCandidates as RelationshipNextCandidate[]
  )
  const resetTask = resolveResetNextTask(eventsNeedingClosure as ResetNextCandidate[])
  const closeOutTask = resolveCloseOutNextTask(eventsNeedingClosure as CloseOutCandidate[])
  const trustTask = resolveTrustLoopNextTask(trustLoopCandidates)

  if (relationshipTask) lifecycleTasks.push({ label: 'Relationship', task: relationshipTask })
  if (resetTask) lifecycleTasks.push({ label: 'Reset', task: resetTask })
  if (closeOutTask) lifecycleTasks.push({ label: 'Close Out', task: closeOutTask })
  if (trustTask) lifecycleTasks.push({ label: 'Trust Loop', task: trustTask })

  // Show top 4 items
  const visibleTasks = lifecycleTasks.slice(0, 4)

  if (visibleTasks.length === 0) return null

  const URGENCY_DOT: Record<string, string> = {
    rose: 'bg-red-400',
    amber: 'bg-amber-400',
    brand: 'bg-stone-500',
    sky: 'bg-stone-500',
    emerald: 'bg-stone-500',
    slate: 'bg-stone-600',
  }

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-medium uppercase tracking-widest text-stone-500">Up next</h2>
        {lifecycleTasks.length > 4 && (
          <span className="text-xs text-stone-600">+{lifecycleTasks.length - 4} more</span>
        )}
      </div>
      <div className="space-y-0.5 rounded-2xl border border-white/[0.06] bg-stone-900/15 backdrop-blur-xl p-1.5 hover-lift">
        {visibleTasks.map(({ task }, i) => (
          <Link
            key={task.id}
            href={task.href}
            data-upnext-index={i}
            data-upnext-label={task.title}
            className="upnext-item flex items-center gap-3 rounded-xl px-4 py-3.5 hover:bg-stone-800/40 transition-all duration-150 group"
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ring-2 ring-transparent transition-all group-hover:ring-stone-700/50 ${URGENCY_DOT[task.tone] ?? 'bg-stone-600'}`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-stone-300 truncate group-hover:text-stone-50 transition-colors">
                {task.title}
              </p>
              <p className="text-xs text-stone-600 truncate group-hover:text-stone-400 transition-colors">
                {task.description}
              </p>
            </div>
            <ArrowRight className="upnext-arrow h-3.5 w-3.5 text-stone-400 shrink-0" />
          </Link>
        ))}
      </div>
    </section>
  )
}

function UpNextSkeleton() {
  return (
    <section className="space-y-4">
      <div className="h-3 w-14 loading-bone loading-bone-muted rounded" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="h-2 w-2 rounded-full loading-bone loading-bone-muted" />
          <div className="flex-1 space-y-1">
            <div className="h-4 w-48 loading-bone loading-bone-muted rounded" />
            <div className="h-3 w-32 loading-bone loading-bone-muted rounded" />
          </div>
        </div>
      ))}
    </section>
  )
}

// ─── ChefTips Section ──────────────────────────────────
async function ChefTipsSection() {
  const user = await requireChef()
  const [todaysTips, stats, pastTip, reviewCount] = await Promise.all([
    getTodaysTips(),
    getCachedTipStats(user.entityId),
    getRandomPastTip(),
    getReviewQueueCount(),
  ])

  return (
    <ChefTipsWidget
      todaysTips={todaysTips}
      totalCount={stats.total}
      streak={stats.streak}
      pastTip={pastTip}
      reviewCount={reviewCount}
    />
  )
}

// ─── Dietary Change Alerts Banner ─────────────────────
async function DietaryAlertsBanner() {
  try {
    const { getDietaryAlerts } = await import('@/lib/clients/dietary-alert-actions')
    const alerts = await getDietaryAlerts(true)
    if (!alerts || alerts.length === 0) return null

    return (
      <div className="rounded-2xl border border-amber-900/40 bg-amber-950/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-sm font-semibold">Dietary changes</span>
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">
            {alerts.length}
          </span>
        </div>
        <div className="space-y-2">
          {alerts.slice(0, 3).map((a) => (
            <Link
              key={a.id}
              href={`/clients/${a.client_id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-stone-800 bg-stone-900/50 px-3 py-2 text-sm hover:bg-stone-800/50 transition-colors"
            >
              <div className="min-w-0">
                <span className="font-medium text-stone-200">{a.client_name ?? 'Client'}</span>
                <span className="text-stone-500 mx-1.5">{a.change_type}</span>
                <span className="text-stone-400">{a.field_name}</span>
              </div>
              {a.severity === 'critical' && (
                <span className="shrink-0 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-300">
                  critical
                </span>
              )}
            </Link>
          ))}
        </div>
        {alerts.length > 3 && (
          <Link
            href="/clients"
            className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
          >
            +{alerts.length - 3} more changes
          </Link>
        )}
      </div>
    )
  } catch {
    return null
  }
}
