import type { SchedulingRules } from '@/lib/availability/rules-actions'
import type { BookingSettings } from '@/lib/booking/booking-settings-actions'
import {
  getRelationshipActionLayerCopy,
  type RelationshipActionLayerSource,
} from '@/lib/clients/action-vocabulary'
import { getClientInteractionSignalShortLabel } from '@/lib/clients/interaction-signal-utils'
import type { NextBestAction } from '@/lib/clients/next-best-action'
import type { GoogleConnectionStatus } from '@/lib/google/types'
import type { OnboardingProgress } from '@/lib/onboarding/progress-actions'
import { getReviewRequestGate } from '@/lib/post-event/trust-loop-helpers'
import type { PriorityQueue, QueueItem } from '@/lib/queue/types'
import type { PrepPrompt } from '@/lib/scheduling/types'
import type { DashboardWorkSurface, WorkItem, WorkStage } from '@/lib/workflow/types'
import type { WixConnectionStatus } from '@/lib/wix/types'

export type SurfaceActionTone = 'brand' | 'sky' | 'emerald' | 'rose' | 'amber' | 'slate'

export type SurfaceActionTask = {
  id: string
  badge: string
  title: string
  description: string
  href: string
  ctaLabel: string
  tone: SurfaceActionTone
  context: string[]
  remainingCount: number
  remainingLabel?: string | null
}

export type DashboardResolveNextTask = SurfaceActionTask & {
  source: 'queue' | 'onboarding' | 'profile' | 'clear'
}

export type SettingsProfileState = {
  slug: string | null
  tagline: string | null
  bio: string | null
  profileImageUrl: string | null
  publicProfileHidden: boolean
}

export type SettingsFixTask = {
  id: string
  title: string
  description: string
  currentState: string
  impact: string
  href: string
  ctaLabel: string
  tone: SurfaceActionTone
}

export type PrepareNextTask = SurfaceActionTask & {
  source: 'work_surface' | 'prep_prompt'
}

export type ProcurementNextTask = SurfaceActionTask & {
  source: 'get_quote' | 'refresh_prices' | 'review_variance' | 'finalize_list'
}

export type PrepFlowTask = SurfaceActionTask & {
  source: 'confirm_suggestions' | 'add_block' | 'complete_block' | 'start_early_prep'
}

export type FixMissingFactTask = SurfaceActionTask & {
  source: 'blocked'
}

export type MenuDecisionTask = SurfaceActionTask & {
  source: 'send' | 'revise' | 'resend'
}

export type SafetyCheckTask = SurfaceActionTask & {
  source: 'confirm_allergies' | 'resolve_conflict' | 'cross_contamination' | 'print_allergy_card'
}

export type CollectBalanceTask = SurfaceActionTask & {
  source: 'record_payment' | 'mark_installment_paid' | 'close_financials'
}

export type ReceiptCaptureTask = SurfaceActionTask & {
  source: 'upload' | 'review_extraction' | 'approve'
}

export type TeamReadyTask = SurfaceActionTask & {
  source: 'assign_staff' | 'resolve_staff_conflict' | 'generate_staff_briefing' | 'add_staff_task'
}

export type RelationshipNextTask = SurfaceActionTask & {
  source: RelationshipActionLayerSource
}

export type CloseOutNextTask = SurfaceActionTask & {
  source: 'wizard' | 'aar' | 'follow_up'
}

export type ResetNextTask = SurfaceActionTask & {
  source: 'checklist'
}

export type CommitNextTask = SurfaceActionTask & {
  source: 'quote' | 'financial_commitment'
}

export type ServiceReadyTask = SurfaceActionTask & {
  source: 'documents' | 'packing' | 'dop' | 'service'
}

export type TravelConfirmTask = SurfaceActionTask & {
  source: 'build_plan' | 'start_trip' | 'mark_trip_complete' | 'print_route'
}

export type ExecutionNextTask = SurfaceActionTask & {
  source: 'mark_in_progress' | 'start_timer' | 'stop_timer' | 'mark_completed'
}

export type TrustLoopNextTask = SurfaceActionTask & {
  source: 'survey' | 'review_request'
}

export type ProcurementCandidate = {
  id: string
  occasion: string | null
  event_date: string
  client: {
    full_name: string
  } | null
  needs_finalized_list: boolean
  latest_quote_created_at: string | null
  actual_grocery_cost_cents: number | null
  accuracy_delta_pct: number | null
}

export type PrepFlowCandidate = {
  id: string
  occasion: string | null
  event_date: string
  client: {
    full_name: string
  } | null
  incomplete_block_count: number
  due_incomplete_block_count: number
  next_incomplete_block_title: string | null
  next_incomplete_block_date: string | null
  suggestion_count: number
  has_any_blocks: boolean
}

export type CloseOutCandidate = {
  id: string
  occasion: string | null
  event_date: string
  guest_count: number | null
  aar_filed: boolean
  reset_complete: boolean
  follow_up_sent: boolean
  financially_closed: boolean
  client: {
    id?: string
    full_name: string
  } | null
}

export type ReceiptCaptureCandidate = {
  id: string
  occasion: string | null
  event_date: string
  guest_count: number | null
  status: 'confirmed' | 'in_progress' | 'completed'
  needs_upload: boolean
  needs_review_count: number
  approvable_count: number
  client: {
    full_name: string
  } | null
}

export type ResetNextCandidate = {
  id: string
  occasion: string | null
  event_date: string
  guest_count: number | null
  reset_complete: boolean
  client: {
    full_name: string
  } | null
}

export type ServiceReadyCandidate = {
  id: string
  occasion: string | null
  event_date: string
  guest_count: number | null
  status: 'paid' | 'confirmed'
  prep_sheet_ready: boolean
  prep_sheet_generated: boolean
  packing_list_generated: boolean
  car_packed: boolean
  client: {
    full_name: string
  } | null
  dop_progress: {
    completed: number
    total: number
  } | null
  readiness: {
    ready: boolean
    hardBlocked: boolean
    blockers: Array<{
      gate: string
      label: string
      details?: string
    }>
  } | null
}

export type TravelConfirmCandidate = {
  id: string
  occasion: string | null
  event_date: string
  client: {
    full_name: string
  } | null
  leg_count: number
  has_in_progress_leg: boolean
  next_planned_leg_date: string | null
  printable_route_ready: boolean
}

export type ExecutionNextCandidate = {
  id: string
  occasion: string | null
  event_date: string
  guest_count: number | null
  status: 'confirmed' | 'in_progress'
  service_started_at: string | null
  service_completed_at: string | null
  time_service_minutes: number | null
  client: {
    full_name: string
  } | null
  readiness: {
    ready: boolean
    hardBlocked: boolean
    blockers: Array<{
      gate: string
      label: string
      details?: string
    }>
  } | null
}

export type TrustLoopCandidate = {
  id: string
  occasion: string | null
  event_date: string
  guest_count: number | null
  follow_up_sent_at: string | null
  client: {
    full_name: string
  } | null
  survey: {
    id: string
    token: string
    sent_at: string | null
    completed_at: string | null
    overall: number | null
    what_they_loved: string | null
    review_request_eligible: boolean
    review_request_sent_at: string | null
    public_review_shared: boolean
  } | null
}

export type MenuDecisionCandidate = {
  id: string
  occasion: string | null
  event_date: string
  guest_count: number | null
  menu_approval_status: 'not_sent' | 'sent' | 'approved' | 'revision_requested'
  menu_modified_after_approval: boolean
  client: {
    full_name: string
  } | null
}

export type SafetyCheckCandidate = {
  id: string
  occasion: string | null
  event_date: string
  guest_count: number | null
  unconfirmed_allergy_count: number
  allergen_conflict_count: number
  dietary_conflict_count: number
  allergen_count: number
  cross_contamination_completed_count: number
  cross_contamination_total_count: number
  has_allergy_card_data: boolean
  client: {
    full_name: string
  } | null
}

export type CollectBalanceCandidate = {
  id: string
  occasion: string | null
  event_date: string
  guest_count: number | null
  status: 'paid' | 'confirmed' | 'in_progress' | 'completed'
  financially_closed: boolean
  outstanding_balance_cents: number
  unpaid_installment_count: number
  next_installment_label: string | null
  client: {
    full_name: string
  } | null
}

export type TeamReadyCandidate = {
  id: string
  occasion: string | null
  event_date: string
  guest_count: number | null
  staff_count: number
  has_staff_conflict: boolean
  conflict_summary: string | null
  has_staff_task: boolean
  can_generate_staff_briefing: boolean
  client: {
    full_name: string
  } | null
}

export type RelationshipNextCandidate = Pick<
  NextBestAction,
  | 'clientId'
  | 'clientName'
  | 'href'
  | 'actionType'
  | 'label'
  | 'description'
  | 'urgency'
  | 'tier'
  | 'primarySignal'
  | 'interventionLabel'
>

const PREPARE_NEXT_STAGES = new Set<WorkStage>([
  'qualification',
  'menu_development',
  'equipment_planning',
  'packing',
  'timeline',
])

function buildQueueResolveTask(
  priorityQueue: PriorityQueue,
  item: QueueItem
): DashboardResolveNextTask {
  const badge =
    item.urgency === 'critical'
      ? 'Focus lock'
      : item.urgency === 'high'
        ? 'Next action'
        : 'Active work'
  const tone = item.urgency === 'critical' ? 'rose' : item.urgency === 'high' ? 'amber' : 'brand'
  const title = item.urgency === 'critical' ? `Do this now: ${item.title}` : `Next: ${item.title}`
  const description =
    item.urgency === 'critical'
      ? `This blocks lower-priority work. ${item.description}`
      : item.description
  const context = [
    item.context.primaryLabel,
    item.context.secondaryLabel ?? null,
    item.blocks ? `Blocks ${item.blocks}` : (item.contextLine ?? null),
    item.estimatedMinutes ? `~${item.estimatedMinutes} min` : null,
  ].filter((value): value is string => Boolean(value))

  return {
    id: item.id,
    source: 'queue',
    badge,
    title,
    description,
    href: item.href,
    ctaLabel: item.urgency === 'critical' ? 'Do This Now' : 'Resolve Next',
    tone,
    context,
    remainingCount: Math.max(priorityQueue.summary.totalItems - 1, 0),
    remainingLabel: 'more waiting after this',
  }
}

function resolveOnboardingTask(progress: OnboardingProgress): DashboardResolveNextTask | null {
  if (!progress.nextStep) return null

  return {
    id: `onboarding-${progress.nextStep.key}`,
    source: 'onboarding',
    badge: 'Activation gap',
    title: progress.nextStep.label,
    description: progress.nextStep.description,
    href: progress.nextStep.href,
    ctaLabel: 'Resolve Next',
    tone: 'sky',
    context: [progress.nextStep.evidenceLabel ?? 'First-week activation is still incomplete'],
    remainingCount: Math.max(progress.totalSteps - progress.completedSteps - 1, 0),
    remainingLabel: 'more activation steps after this',
  }
}

export function resolveDashboardNextTask(input: {
  priorityQueue: PriorityQueue
  onboardingProgress: OnboardingProgress | null
  profileGated: boolean
}): DashboardResolveNextTask {
  if (input.priorityQueue.nextAction) {
    return buildQueueResolveTask(input.priorityQueue, input.priorityQueue.nextAction)
  }

  const onboardingTask = input.onboardingProgress
    ? resolveOnboardingTask(input.onboardingProgress)
    : null
  if (onboardingTask) return onboardingTask

  if (input.profileGated) {
    return {
      id: 'profile-gated',
      source: 'profile',
      badge: 'Public surface blocked',
      title: 'Finish your public profile',
      description: 'Your live profile stays hidden until the basic public-facing copy is complete.',
      href: '/settings/my-profile',
      ctaLabel: 'Fix Profile',
      tone: 'rose',
      context: ['Bio or tagline is still missing'],
      remainingCount: 0,
      remainingLabel: null,
    }
  }

  return {
    id: 'queue-clear',
    source: 'clear',
    badge: 'Queue clear',
    title: 'Nothing urgent is blocking you.',
    description:
      'The active queue is clear, so you can choose the next planned move instead of reacting.',
    href: '/queue',
    ctaLabel: 'Open Queue',
    tone: 'slate',
    context: ['No urgent triage items detected'],
    remainingCount: 0,
    remainingLabel: null,
  }
}

function uniqueWorkItems(items: WorkItem[]): WorkItem[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

function compareWorkItemsLikeSurface(a: WorkItem, b: WorkItem): number {
  if (a.urgency === 'fragile' && b.urgency !== 'fragile') return -1
  if (a.urgency !== 'fragile' && b.urgency === 'fragile') return 1

  const dateA = new Date(a.eventDate).getTime()
  const dateB = new Date(b.eventDate).getTime()
  if (dateA !== dateB) return dateA - dateB

  return a.stageNumber - b.stageNumber
}

function getEventStatus(surface: DashboardWorkSurface, eventId: string): string | null {
  return surface.byEvent.find((event) => event.eventId === eventId)?.status ?? null
}

function isEditableEventStatus(status: string | null): boolean {
  return status === 'draft' || status === 'proposed'
}

function formatDaysUntilLabel(daysUntilEvent: number): string {
  if (daysUntilEvent < 0) {
    const days = Math.abs(daysUntilEvent)
    return `${days} day${days === 1 ? '' : 's'} overdue`
  }
  if (daysUntilEvent === 0) return 'Today'
  if (daysUntilEvent === 1) return 'Tomorrow'
  return `In ${daysUntilEvent} days`
}

function formatEventTimingLabel(eventDate: string, pastTense = false): string {
  return pastTense
    ? formatDaysSinceEventLabel(eventDate)
    : formatDaysUntilLabel(getDaysUntilEvent(eventDate))
}

function formatGuestCount(guestCount: number | null): string | null {
  return guestCount ? `${guestCount} guests` : null
}

function compareEventDates(a: { event_date: string }, b: { event_date: string }): number {
  return new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
}

function compareRecentEventDates(a: { event_date: string }, b: { event_date: string }): number {
  return new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
}

function getPlanningActionRoute(
  item: WorkItem,
  eventStatus: string | null
): Pick<SurfaceActionTask, 'href' | 'ctaLabel'> {
  const key = item.id.split(':').slice(-1)[0] ?? ''

  switch (item.stage) {
    case 'qualification':
      if (key === 'set_serve_time') {
        return {
          href: isEditableEventStatus(eventStatus)
            ? `/events/${item.eventId}/edit`
            : `/events/${item.eventId}`,
          ctaLabel: 'Set Serve Time',
        }
      }
      return { href: `/events/${item.eventId}?tab=money`, ctaLabel: 'Attach Menu' }
    case 'menu_development':
      return {
        href: `/events/${item.eventId}?tab=money`,
        ctaLabel: key === 'stabilize_menu' ? 'Finalize Menu' : 'Edit Menu',
      }
    case 'quote':
      if (key === 'propose_to_client') {
        return { href: `/events/${item.eventId}?tab=ops`, ctaLabel: 'Propose Event' }
      }
      if (key === 'set_pricing' || key === 'set_deposit') {
        return {
          href: isEditableEventStatus(eventStatus)
            ? `/events/${item.eventId}/edit`
            : `/events/${item.eventId}?tab=money`,
          ctaLabel: key === 'set_pricing' ? 'Set Pricing' : 'Set Deposit',
        }
      }
      return { href: `/events/${item.eventId}?tab=money`, ctaLabel: 'Open Event Pricing' }
    case 'financial_commitment':
      if (key === 'confirm_event') {
        return { href: `/events/${item.eventId}?tab=ops`, ctaLabel: 'Confirm Event' }
      }
      return { href: `/events/${item.eventId}?tab=money`, ctaLabel: 'Record Deposit' }
    case 'grocery_list':
      return { href: `/events/${item.eventId}/grocery-quote`, ctaLabel: 'Open Grocery List' }
    case 'prep_list':
      return { href: `/events/${item.eventId}?tab=prep`, ctaLabel: 'Open Prep Timeline' }
    case 'equipment_planning':
      return { href: `/events/${item.eventId}?tab=ops`, ctaLabel: 'Plan Equipment' }
    case 'packing':
      return { href: `/events/${item.eventId}/pack`, ctaLabel: 'Open Pack List' }
    case 'timeline':
      return { href: `/events/${item.eventId}/schedule`, ctaLabel: 'Open Schedule' }
    case 'travel_arrival':
      return { href: `/events/${item.eventId}/travel`, ctaLabel: 'Open Travel Plan' }
    default:
      return { href: `/events/${item.eventId}`, ctaLabel: 'Open Event' }
  }
}

function getCommitmentActionRoute(
  item: WorkItem,
  eventStatus: string | null
): Pick<SurfaceActionTask, 'href' | 'ctaLabel'> {
  const key = item.id.split(':').slice(-1)[0] ?? ''

  if (item.stage === 'quote') {
    if (key === 'set_pricing') {
      return {
        href: isEditableEventStatus(eventStatus)
          ? `/events/${item.eventId}/edit`
          : `/events/${item.eventId}?tab=money`,
        ctaLabel: 'Set Pricing',
      }
    }

    if (key === 'set_deposit') {
      return {
        href: isEditableEventStatus(eventStatus)
          ? `/events/${item.eventId}/edit`
          : `/events/${item.eventId}?tab=money`,
        ctaLabel: 'Define Deposit',
      }
    }

    if (key === 'propose_to_client') {
      return {
        href: `/events/${item.eventId}?tab=ops`,
        ctaLabel: 'Propose to Client',
      }
    }

    return {
      href: `/events/${item.eventId}?tab=money`,
      ctaLabel: 'Open Pricing',
    }
  }

  if (key === 'confirm_event') {
    return {
      href: `/events/${item.eventId}?tab=ops`,
      ctaLabel: 'Confirm Event',
    }
  }

  return {
    href: `/events/${item.eventId}?tab=money`,
    ctaLabel: 'Record Payment',
  }
}

function getBlockedActionRoute(
  item: WorkItem,
  eventStatus: string | null
): Pick<SurfaceActionTask, 'href' | 'ctaLabel'> {
  if (item.stage === 'financial_commitment') {
    return {
      href: `/events/${item.eventId}?tab=money`,
      ctaLabel: 'Record Deposit',
    }
  }

  return {
    href: isEditableEventStatus(eventStatus)
      ? `/events/${item.eventId}/edit`
      : `/events/${item.eventId}`,
    ctaLabel: isEditableEventStatus(eventStatus) ? 'Fix Missing Fact' : 'Unblock This',
  }
}

function getPromptTone(prompt: PrepPrompt): SurfaceActionTone {
  if (prompt.urgency === 'overdue') return 'rose'
  if (prompt.urgency === 'actionable') return 'amber'
  return 'sky'
}

function getPromptBadge(prompt: PrepPrompt): string {
  if (prompt.urgency === 'overdue') return 'Prep overdue'
  if (prompt.urgency === 'actionable') return 'Prep today'
  return 'Prep ahead'
}

function getPromptTitle(prompt: PrepPrompt): string {
  const occasion = prompt.eventOccasion || 'this event'
  if (prompt.category === 'shopping') return `Shop for ${occasion}`
  if (prompt.category === 'packing') return `Pack for ${occasion}`
  if (prompt.action === 'Set peak windows') return `Set freshness windows for ${occasion}`
  return `Prepare ${occasion}`
}

function getPlanningCandidates(surface: DashboardWorkSurface): WorkItem[] {
  return uniqueWorkItems([
    ...surface.fragile,
    ...surface.preparable,
    ...surface.optionalEarly,
  ]).filter((item) => PREPARE_NEXT_STAGES.has(item.stage))
}

export function resolveCommitNextTask(surface: DashboardWorkSurface): CommitNextTask | null {
  const commitmentCandidates = uniqueWorkItems([
    ...surface.fragile,
    ...surface.preparable,
    ...surface.blocked,
  ])
    .filter((item) => item.stage === 'quote' || item.stage === 'financial_commitment')
    .sort(compareWorkItemsLikeSurface)

  if (commitmentCandidates.length === 0) return null

  const item = commitmentCandidates[0]
  const eventStatus = getEventStatus(surface, item.eventId)
  const route = getCommitmentActionRoute(item, eventStatus)
  const isFinancialCommitment = item.stage === 'financial_commitment'

  return {
    id: `commit-${item.id}`,
    source: isFinancialCommitment ? 'financial_commitment' : 'quote',
    badge: isFinancialCommitment ? 'Commitment still open' : 'Quote step ready',
    title: item.title,
    description: item.description,
    href: route.href,
    ctaLabel: route.ctaLabel,
    tone: isFinancialCommitment || item.urgency === 'fragile' ? 'amber' : 'brand',
    context: [
      item.eventOccasion || null,
      item.clientName,
      item.blockedBy ? `Needs: ${item.blockedBy}` : null,
      item.stageLabel,
    ].filter((value): value is string => Boolean(value)),
    remainingCount: Math.max(commitmentCandidates.length - 1, 0),
    remainingLabel: 'more commitment moves after this',
  }
}

export function resolvePrepareNextTask(input: {
  workSurface: DashboardWorkSurface
  prepPrompts: PrepPrompt[]
}): PrepareNextTask | null {
  const planningCandidates = getPlanningCandidates(input.workSurface)
  const prepPrompts = input.prepPrompts.filter(
    (prompt) => prompt.category !== 'shopping' && prompt.category !== 'prep'
  )

  if (planningCandidates.length > 0) {
    const item = planningCandidates[0]
    const eventStatus = getEventStatus(input.workSurface, item.eventId)
    const route = getPlanningActionRoute(item, eventStatus)
    const matchingPrompt = prepPrompts.find((prompt) => prompt.eventId === item.eventId)

    return {
      id: `prepare-${item.id}`,
      source: 'work_surface',
      badge:
        item.urgency === 'fragile'
          ? 'Prepare now'
          : item.category === 'optional_early'
            ? 'Prepare ahead'
            : 'Prep ready',
      title: item.title,
      description: item.description,
      href: route.href,
      ctaLabel: route.ctaLabel,
      tone:
        item.urgency === 'fragile' ? 'amber' : item.category === 'optional_early' ? 'sky' : 'brand',
      context: [
        item.eventOccasion || null,
        item.clientName,
        `${item.stageLabel}`,
        matchingPrompt ? formatDaysUntilLabel(matchingPrompt.daysUntilEvent) : null,
      ].filter((value): value is string => Boolean(value)),
      remainingCount: Math.max(planningCandidates.length - 1, 0),
      remainingLabel: 'more prep moves after this',
    }
  }

  if (prepPrompts.length === 0) return null

  const prompt = prepPrompts[0]

  return {
    id: `prepare-prompt-${prompt.eventId}-${prompt.category}`,
    source: 'prep_prompt',
    badge: getPromptBadge(prompt),
    title: getPromptTitle(prompt),
    description: prompt.message,
    href: prompt.actionUrl,
    ctaLabel: prompt.action,
    tone: getPromptTone(prompt),
    context: [
      prompt.clientName,
      formatDaysUntilLabel(prompt.daysUntilEvent),
      ...(prompt.components?.slice(0, 2) ?? []),
    ],
    remainingCount: Math.max(prepPrompts.length - 1, 0),
    remainingLabel: 'more prep prompts after this',
  }
}

const PROCUREMENT_QUOTE_STALE_HOURS = 8

function isGroceryQuoteStale(createdAt: string): boolean {
  return (Date.now() - new Date(createdAt).getTime()) / 3600000 >= PROCUREMENT_QUOTE_STALE_HOURS
}

function compareDateStrings(a: string, b: string): number {
  return new Date(a).getTime() - new Date(b).getTime()
}

function compareNullableDateStrings(
  a: string | null,
  b: string | null,
  fallbackA: string,
  fallbackB: string
): number {
  return compareDateStrings(a ?? fallbackA, b ?? fallbackB)
}

function formatVarianceDelta(deltaPct: number): string {
  const rounded = Number(deltaPct.toFixed(1))
  if (rounded === 0) return 'Variance held on estimate'
  return `${Math.abs(rounded)}% ${rounded > 0 ? 'over quote' : 'under quote'}`
}

function getProcurementBucket(candidate: ProcurementCandidate): number {
  if (candidate.needs_finalized_list && !candidate.latest_quote_created_at) return 0
  if (
    candidate.needs_finalized_list &&
    candidate.latest_quote_created_at &&
    isGroceryQuoteStale(candidate.latest_quote_created_at)
  ) {
    return 1
  }
  if (candidate.needs_finalized_list) return 2
  if (candidate.actual_grocery_cost_cents !== null && candidate.accuracy_delta_pct !== null) {
    return 3
  }
  return 4
}

function getProcurementAction(
  candidate: ProcurementCandidate
): Omit<ProcurementNextTask, 'remainingCount' | 'remainingLabel'> | null {
  const eventLabel = candidate.occasion || 'this event'
  const isPastEvent = getDaysUntilEvent(candidate.event_date) < 0
  const baseContext = [
    candidate.client?.full_name ?? 'Client',
    formatEventTimingLabel(candidate.event_date, isPastEvent),
  ].filter((value): value is string => Boolean(value))
  const href = `/events/${candidate.id}/procurement`

  // Procurement precedence stays anchored to active shopping truth:
  // missing quote -> stale quote -> active list finalization -> post-event variance review.
  if (candidate.needs_finalized_list && !candidate.latest_quote_created_at) {
    return {
      id: `procurement-${candidate.id}-get-quote`,
      source: 'get_quote',
      badge: 'Procurement quote missing',
      title: `Get a grocery quote for ${eventLabel}`,
      description:
        'The grocery list is active, but there is no live market quote attached to the event yet. Pull the quote from the focused procurement surface before you lock the list or head out to shop.',
      href,
      ctaLabel: 'Get Grocery Quote',
      tone: 'amber',
      context: [...baseContext, 'No completed grocery quote yet'],
    }
  }

  if (
    candidate.needs_finalized_list &&
    candidate.latest_quote_created_at &&
    isGroceryQuoteStale(candidate.latest_quote_created_at)
  ) {
    return {
      id: `procurement-${candidate.id}-refresh-prices`,
      source: 'refresh_prices',
      badge: 'Market quote stale',
      title: `Refresh grocery prices for ${eventLabel}`,
      description:
        'A quote exists, but the saved market snapshot is old enough that price drift could distort the shopping decision. Refresh live prices from the focused procurement route before you rely on this estimate.',
      href,
      ctaLabel: 'Refresh Prices',
      tone: 'amber',
      context: [...baseContext, 'Saved quote needs fresher market data'],
    }
  }

  if (candidate.needs_finalized_list) {
    return {
      id: `procurement-${candidate.id}-finalize-list`,
      source: 'finalize_list',
      badge: 'Procurement ready',
      title: `Finalize the grocery list for ${eventLabel}`,
      description:
        'The current quote is usable and the event is inside the real shopping window. Review the consolidated list in the focused procurement route and lock the exact shopping move there.',
      href,
      ctaLabel: 'Finalize Grocery List',
      tone: 'brand',
      context: [...baseContext, 'Quote and list are ready for final review'],
    }
  }

  if (candidate.actual_grocery_cost_cents !== null && candidate.accuracy_delta_pct !== null) {
    const varianceLabel = formatVarianceDelta(candidate.accuracy_delta_pct)
    return {
      id: `procurement-${candidate.id}-review-variance`,
      source: 'review_variance',
      badge: 'Variance ready',
      title: `Review grocery variance for ${eventLabel}`,
      description:
        'Actual grocery spend is logged against the saved quote. Review the event-specific variance in the procurement route so shopping accuracy stays attached to the real event instead of disappearing into close-out notes.',
      href,
      ctaLabel: 'Review Grocery Variance',
      tone: Math.abs(candidate.accuracy_delta_pct) >= 10 ? 'amber' : 'sky',
      context: [...baseContext, varianceLabel],
    }
  }

  return null
}

function compareProcurementCandidates(a: ProcurementCandidate, b: ProcurementCandidate): number {
  const bucketDelta = getProcurementBucket(a) - getProcurementBucket(b)
  if (bucketDelta !== 0) return bucketDelta
  return compareEventDates(a, b)
}

export function resolveProcurementNextTask(
  candidates: ProcurementCandidate[]
): ProcurementNextTask | null {
  const actionable = candidates
    .slice()
    .sort(compareProcurementCandidates)
    .map((candidate) => getProcurementAction(candidate))
    .filter((task): task is Omit<ProcurementNextTask, 'remainingCount' | 'remainingLabel'> =>
      Boolean(task)
    )

  if (actionable.length === 0) return null

  return {
    ...actionable[0],
    remainingCount: Math.max(actionable.length - 1, 0),
    remainingLabel: 'more procurement moves after this',
  }
}

function getPrepFlowBucket(candidate: PrepFlowCandidate): number {
  if (candidate.due_incomplete_block_count > 0) return 0
  if (!candidate.has_any_blocks && candidate.suggestion_count > 0) return 1
  if (candidate.incomplete_block_count > 0) return 2
  if (!candidate.has_any_blocks) return 3
  return 4
}

function getPrepFlowAction(
  candidate: PrepFlowCandidate
): Omit<PrepFlowTask, 'remainingCount' | 'remainingLabel'> | null {
  const eventLabel = candidate.occasion || 'this event'
  const nextBlockTiming = candidate.next_incomplete_block_date
    ? formatDaysUntilLabel(getDaysUntilEvent(candidate.next_incomplete_block_date))
    : formatEventTimingLabel(candidate.event_date)
  const baseContext = [candidate.client?.full_name ?? 'Client', nextBlockTiming].filter(
    (value): value is string => Boolean(value)
  )
  const href = `/events/${candidate.id}/prep-plan`

  if (candidate.due_incomplete_block_count > 0) {
    return {
      id: `prep-flow-${candidate.id}-complete-block`,
      source: 'complete_block',
      badge: 'Prep block due',
      title: `Complete the next prep block for ${eventLabel}`,
      description:
        'A scheduled prep block is already due for this event. Use the focused prep-plan route to close the real block instead of dropping back into the broad prep tab.',
      href,
      ctaLabel: 'Complete Prep Block',
      tone: 'rose',
      context: [
        ...baseContext,
        candidate.next_incomplete_block_title ?? 'An incomplete prep block is due now',
      ],
    }
  }

  if (!candidate.has_any_blocks && candidate.suggestion_count > 0) {
    return {
      id: `prep-flow-${candidate.id}-confirm-suggestions`,
      source: 'confirm_suggestions',
      badge: 'Suggested prep ready',
      title: `Confirm suggested blocks for ${eventLabel}`,
      description:
        'ChefFlow has event-specific prep block suggestions ready, but none are on the schedule yet. Confirm the suggested blocks from the focused prep-plan route so prep work becomes real calendar truth.',
      href,
      ctaLabel: 'Confirm Suggested Blocks',
      tone: 'brand',
      context: [
        ...baseContext,
        `${candidate.suggestion_count} suggested prep block${candidate.suggestion_count === 1 ? '' : 's'}`,
      ],
    }
  }

  if (candidate.incomplete_block_count > 0) {
    return {
      id: `prep-flow-${candidate.id}-start-early-prep`,
      source: 'start_early_prep',
      badge: 'Prep block scheduled',
      title: `Start early prep for ${eventLabel}`,
      description:
        'Prep blocks already exist for this event, and the next one is ready to be worked. Open the focused prep-plan route and begin from the real scheduled block instead of improvising from the shell.',
      href,
      ctaLabel: 'Start Early Prep',
      tone: 'sky',
      context: [
        ...baseContext,
        candidate.next_incomplete_block_title ?? 'Next prep block is ready',
      ],
    }
  }

  if (!candidate.has_any_blocks) {
    return {
      id: `prep-flow-${candidate.id}-add-block`,
      source: 'add_block',
      badge: 'Prep schedule empty',
      title: `Add a prep block for ${eventLabel}`,
      description:
        'This event is in the prep-planning window, but no event-specific block exists yet. Add the first real prep block from the focused prep-plan route so the schedule stops depending on memory.',
      href,
      ctaLabel: 'Add Prep Block',
      tone: 'amber',
      context: [...baseContext, 'No prep blocks scheduled yet'],
    }
  }

  return null
}

function comparePrepFlowCandidates(a: PrepFlowCandidate, b: PrepFlowCandidate): number {
  const bucketDelta = getPrepFlowBucket(a) - getPrepFlowBucket(b)
  if (bucketDelta !== 0) return bucketDelta
  return compareNullableDateStrings(
    a.next_incomplete_block_date,
    b.next_incomplete_block_date,
    a.event_date,
    b.event_date
  )
}

export function resolvePrepFlowTask(candidates: PrepFlowCandidate[]): PrepFlowTask | null {
  const actionable = candidates
    .slice()
    .sort(comparePrepFlowCandidates)
    .map((candidate) => getPrepFlowAction(candidate))
    .filter((task): task is Omit<PrepFlowTask, 'remainingCount' | 'remainingLabel'> =>
      Boolean(task)
    )

  if (actionable.length === 0) return null

  return {
    ...actionable[0],
    remainingCount: Math.max(actionable.length - 1, 0),
    remainingLabel: 'more prep-flow moves after this',
  }
}

function getTravelConfirmBucket(candidate: TravelConfirmCandidate): number {
  if (candidate.has_in_progress_leg) return 0
  if (candidate.next_planned_leg_date && getDaysUntilEvent(candidate.next_planned_leg_date) <= 0) {
    return 1
  }
  if (candidate.leg_count === 0) return 2
  if (candidate.printable_route_ready) return 3
  return 4
}

function getTravelConfirmAction(
  candidate: TravelConfirmCandidate
): Omit<TravelConfirmTask, 'remainingCount' | 'remainingLabel'> | null {
  const eventLabel = candidate.occasion || 'this event'
  const routeTiming = candidate.next_planned_leg_date
    ? formatDaysUntilLabel(getDaysUntilEvent(candidate.next_planned_leg_date))
    : formatEventTimingLabel(candidate.event_date)
  const baseContext = [candidate.client?.full_name ?? 'Client', routeTiming].filter(
    (value): value is string => Boolean(value)
  )
  const href = `/events/${candidate.id}/travel`

  if (candidate.has_in_progress_leg) {
    return {
      id: `travel-confirm-${candidate.id}-complete`,
      source: 'mark_trip_complete',
      badge: 'Trip in progress',
      title: `Mark the trip complete for ${eventLabel}`,
      description:
        'A travel leg is already underway for this event. Finish that live leg from the dedicated travel route so travel progression stays truthful and attached to the route itself.',
      href,
      ctaLabel: 'Mark Trip Complete',
      tone: 'amber',
      context: [...baseContext, 'At least one travel leg is underway'],
    }
  }

  if (candidate.next_planned_leg_date && getDaysUntilEvent(candidate.next_planned_leg_date) <= 0) {
    return {
      id: `travel-confirm-${candidate.id}-start`,
      source: 'start_trip',
      badge: 'Trip ready to start',
      title: `Start the trip for ${eventLabel}`,
      description:
        'The next planned travel leg is due now. Use the focused travel route to start the real leg instead of opening the broad event shell and hunting for the right control.',
      href,
      ctaLabel: 'Start Trip',
      tone: 'brand',
      context: [
        ...baseContext,
        `${candidate.leg_count} travel leg${candidate.leg_count === 1 ? '' : 's'} planned`,
      ],
    }
  }

  if (candidate.leg_count === 0) {
    return {
      id: `travel-confirm-${candidate.id}-build`,
      source: 'build_plan',
      badge: 'Travel plan missing',
      title: `Build the travel plan for ${eventLabel}`,
      description:
        'The event is in its travel window, but there are no saved travel legs yet. Open the focused travel planner and create the real route there instead of routing through a generic event surface.',
      href,
      ctaLabel: 'Build Travel Plan',
      tone: 'amber',
      context: [...baseContext, 'No travel legs saved yet'],
    }
  }

  if (candidate.printable_route_ready) {
    return {
      id: `travel-confirm-${candidate.id}-print`,
      source: 'print_route',
      badge: 'Travel route ready',
      title: `Print the travel route for ${eventLabel}`,
      description:
        'The travel plan exists and is ready for a route handoff. Open the focused travel route and print the generated travel packet from there.',
      href,
      ctaLabel: 'Print Travel Route',
      tone: 'sky',
      context: [
        ...baseContext,
        `${candidate.leg_count} travel leg${candidate.leg_count === 1 ? '' : 's'} saved`,
      ],
    }
  }

  return null
}

function compareTravelConfirmCandidates(
  a: TravelConfirmCandidate,
  b: TravelConfirmCandidate
): number {
  const bucketDelta = getTravelConfirmBucket(a) - getTravelConfirmBucket(b)
  if (bucketDelta !== 0) return bucketDelta
  return compareNullableDateStrings(
    a.next_planned_leg_date,
    b.next_planned_leg_date,
    a.event_date,
    b.event_date
  )
}

export function resolveTravelConfirmTask(
  candidates: TravelConfirmCandidate[]
): TravelConfirmTask | null {
  const actionable = candidates
    .slice()
    .sort(compareTravelConfirmCandidates)
    .map((candidate) => getTravelConfirmAction(candidate))
    .filter((task): task is Omit<TravelConfirmTask, 'remainingCount' | 'remainingLabel'> =>
      Boolean(task)
    )

  if (actionable.length === 0) return null

  return {
    ...actionable[0],
    remainingCount: Math.max(actionable.length - 1, 0),
    remainingLabel: 'more travel confirmations after this',
  }
}

function getExecutionNextBucket(candidate: ExecutionNextCandidate): number {
  if (
    candidate.status === 'in_progress' &&
    candidate.service_started_at &&
    !candidate.service_completed_at
  ) {
    return 0
  }
  if (candidate.status === 'in_progress' && candidate.service_completed_at) return 1
  if (candidate.status === 'in_progress' && !candidate.service_started_at) return 2
  if (
    candidate.status === 'confirmed' &&
    getDaysUntilEvent(candidate.event_date) <= 0 &&
    candidate.readiness?.ready
  ) {
    return 3
  }
  return 4
}

function getExecutionNextAction(
  candidate: ExecutionNextCandidate
): Omit<ExecutionNextTask, 'remainingCount' | 'remainingLabel'> | null {
  const eventLabel = candidate.occasion || 'this event'
  const isPastEvent = getDaysUntilEvent(candidate.event_date) < 0
  const baseContext = [
    candidate.client?.full_name ?? 'Client',
    formatGuestCount(candidate.guest_count),
    formatEventTimingLabel(candidate.event_date, isPastEvent),
  ].filter((value): value is string => Boolean(value))
  const href = `/events/${candidate.id}/execution`

  if (
    candidate.status === 'in_progress' &&
    candidate.service_started_at &&
    !candidate.service_completed_at
  ) {
    return {
      id: `execution-next-${candidate.id}-stop-timer`,
      source: 'stop_timer',
      badge: 'Service timer running',
      title: `Stop the service timer for ${eventLabel}`,
      description:
        'Live execution is already underway and the service timer is running. Open the focused execution route to stop the timer the moment service actually ends.',
      href,
      ctaLabel: 'Stop Service Timer',
      tone: 'brand',
      context: [...baseContext, 'Service time is actively being tracked'],
    }
  }

  if (candidate.status === 'in_progress' && candidate.service_completed_at) {
    return {
      id: `execution-next-${candidate.id}-mark-completed`,
      source: 'mark_completed',
      badge: 'Execution ready to close',
      title: `Mark ${eventLabel} completed`,
      description:
        'Service timing is already closed, but the event status is still in progress. Finish the status transition from the focused execution route so post-event surfaces inherit the truth.',
      href,
      ctaLabel: 'Mark Completed',
      tone: 'emerald',
      context: [...baseContext, 'Service timing is already closed'],
    }
  }

  if (candidate.status === 'in_progress' && !candidate.service_started_at) {
    return {
      id: `execution-next-${candidate.id}-start-timer`,
      source: 'start_timer',
      badge: 'Execution live',
      title: `Start the service timer for ${eventLabel}`,
      description:
        'The event is already marked in progress, but service time has not started tracking yet. Use the focused execution route to start the timer from the live event record.',
      href,
      ctaLabel: 'Start Service Timer',
      tone: 'amber',
      context: [...baseContext, 'Event is live but service timing has not started'],
    }
  }

  if (
    candidate.status === 'confirmed' &&
    getDaysUntilEvent(candidate.event_date) <= 0 &&
    candidate.readiness?.ready
  ) {
    return {
      id: `execution-next-${candidate.id}-mark-in-progress`,
      source: 'mark_in_progress',
      badge: 'Execution ready',
      title: `Mark ${eventLabel} in progress`,
      description:
        'Readiness gates are clear and the event is now in its live service window. Move it into execution from the focused execution route instead of burying the handoff in the broad ops tab.',
      href,
      ctaLabel: 'Mark In Progress',
      tone: 'emerald',
      context: [...baseContext, 'Transition gates are clear'],
    }
  }

  return null
}

function compareExecutionNextCandidates(
  a: ExecutionNextCandidate,
  b: ExecutionNextCandidate
): number {
  const bucketDelta = getExecutionNextBucket(a) - getExecutionNextBucket(b)
  if (bucketDelta !== 0) return bucketDelta
  return compareEventDates(a, b)
}

export function resolveExecutionNextTask(
  candidates: ExecutionNextCandidate[]
): ExecutionNextTask | null {
  const actionable = candidates
    .slice()
    .sort(compareExecutionNextCandidates)
    .map((candidate) => getExecutionNextAction(candidate))
    .filter((task): task is Omit<ExecutionNextTask, 'remainingCount' | 'remainingLabel'> =>
      Boolean(task)
    )

  if (actionable.length === 0) return null

  return {
    ...actionable[0],
    remainingCount: Math.max(actionable.length - 1, 0),
    remainingLabel: 'more execution moves after this',
  }
}

export function resolveFixMissingFactTask(
  surface: DashboardWorkSurface
): FixMissingFactTask | null {
  const missingFactCandidates = surface.blocked.filter(
    (item) => item.stage !== 'financial_commitment'
  )
  if (missingFactCandidates.length === 0) return null

  const item = missingFactCandidates[0]
  const eventStatus = getEventStatus(surface, item.eventId)
  const route = getBlockedActionRoute(item, eventStatus)
  const missingFact = item.blockedBy ?? 'Required information'

  return {
    id: `blocked-${item.id}`,
    source: 'blocked',
    badge: item.stage === 'financial_commitment' ? 'Payment blocking prep' : 'Missing fact',
    title: item.title,
    description: item.description,
    href: route.href,
    ctaLabel: route.ctaLabel,
    tone: item.stage === 'financial_commitment' ? 'amber' : 'rose',
    context: [
      item.eventOccasion || null,
      item.clientName,
      `Missing: ${missingFact}`,
      `${item.stageLabel}`,
    ].filter((value): value is string => Boolean(value)),
    remainingCount: Math.max(missingFactCandidates.length - 1, 0),
    remainingLabel: 'more blockers after this',
  }
}

function getMenuDecisionAction(
  candidate: MenuDecisionCandidate
): Omit<MenuDecisionTask, 'remainingCount' | 'remainingLabel'> | null {
  const eventLabel = candidate.occasion || 'this event'
  const baseContext = [
    candidate.client?.full_name ?? 'Client',
    formatGuestCount(candidate.guest_count),
    formatEventTimingLabel(candidate.event_date),
  ].filter((value): value is string => Boolean(value))

  if (candidate.menu_approval_status === 'revision_requested') {
    return {
      id: `menu-decision-${candidate.id}-revise`,
      source: 'revise',
      badge: 'Client revision requested',
      title: `Revise the menu for ${eventLabel}`,
      description:
        'The client requested changes. Update the live menu in the approval workspace, then send the revised version back through the same approval loop.',
      href: `/events/${candidate.id}/menu-approval`,
      ctaLabel: 'Revise Menu',
      tone: 'amber',
      context: [...baseContext, 'Revision notes waiting'],
    }
  }

  if (candidate.menu_approval_status === 'approved' && candidate.menu_modified_after_approval) {
    return {
      id: `menu-decision-${candidate.id}-resend`,
      source: 'resend',
      badge: 'Approval needs refresh',
      title: `Resend the updated menu for ${eventLabel}`,
      description:
        'The approved menu changed after sign-off. Resend the current version so the client-approved menu stays aligned with the live event plan.',
      href: `/events/${candidate.id}/menu-approval`,
      ctaLabel: 'Resend Updated Menu',
      tone: 'amber',
      context: [...baseContext, 'Menu changed after approval'],
    }
  }

  if (candidate.menu_approval_status === 'not_sent') {
    return {
      id: `menu-decision-${candidate.id}-send`,
      source: 'send',
      badge: 'Approval loop not started',
      title: `Send the menu for ${eventLabel}`,
      description:
        'The menu is ready for a client decision, but the approval loop has not been opened yet. Send the current menu from the focused approval surface instead of dropping back into the event shell.',
      href: `/events/${candidate.id}/menu-approval`,
      ctaLabel: 'Send Menu for Approval',
      tone: 'brand',
      context: [...baseContext, 'Client sign-off still missing'],
    }
  }

  return null
}

const MENU_DECISION_PRIORITY: Record<MenuDecisionTask['source'], number> = {
  revise: 0,
  resend: 1,
  send: 2,
}

export function resolveMenuDecisionTask(
  candidates: MenuDecisionCandidate[]
): MenuDecisionTask | null {
  const actionable = candidates
    .slice()
    .sort(compareEventDates)
    .map((candidate) => getMenuDecisionAction(candidate))
    .filter((task): task is Omit<MenuDecisionTask, 'remainingCount' | 'remainingLabel'> =>
      Boolean(task)
    )
    .sort((a, b) => MENU_DECISION_PRIORITY[a.source] - MENU_DECISION_PRIORITY[b.source])

  if (actionable.length === 0) return null

  return {
    ...actionable[0],
    remainingCount: Math.max(actionable.length - 1, 0),
    remainingLabel: 'more menu decisions after this',
  }
}

function getSafetyCheckAction(
  candidate: SafetyCheckCandidate
): Omit<SafetyCheckTask, 'remainingCount' | 'remainingLabel'> | null {
  const eventLabel = candidate.occasion || 'this event'
  const baseContext = [
    candidate.client?.full_name ?? 'Client',
    formatGuestCount(candidate.guest_count),
    formatEventTimingLabel(candidate.event_date),
  ].filter((value): value is string => Boolean(value))

  if (candidate.unconfirmed_allergy_count > 0) {
    return {
      id: `safety-check-${candidate.id}-confirm-allergies`,
      source: 'confirm_allergies',
      badge: 'Allergy verification waiting',
      title: `Confirm allergies for ${eventLabel}`,
      description:
        'Structured allergy records still need chef confirmation. Verify them in the focused safety surface before they turn into hidden readiness debt.',
      href: `/events/${candidate.id}/safety`,
      ctaLabel: 'Confirm Allergies',
      tone: 'rose',
      context: [
        ...baseContext,
        `${candidate.unconfirmed_allergy_count} unconfirmed record${candidate.unconfirmed_allergy_count === 1 ? '' : 's'}`,
      ],
    }
  }

  if (candidate.allergen_conflict_count > 0 || candidate.dietary_conflict_count > 0) {
    const conflictCount = candidate.allergen_conflict_count + candidate.dietary_conflict_count
    return {
      id: `safety-check-${candidate.id}-resolve-conflict`,
      source: 'resolve_conflict',
      badge: 'Safety conflict detected',
      title: `Resolve the safety conflict for ${eventLabel}`,
      description:
        'The current menu conflicts with recorded allergen or dietary data. Resolve the live conflict in the dedicated safety surface before it gets buried under broader readiness work.',
      href: `/events/${candidate.id}/safety`,
      ctaLabel: 'Resolve Allergen Conflict',
      tone: 'rose',
      context: [
        ...baseContext,
        `${conflictCount} active conflict${conflictCount === 1 ? '' : 's'}`,
      ],
    }
  }

  if (
    candidate.allergen_count > 0 &&
    candidate.cross_contamination_completed_count < candidate.cross_contamination_total_count
  ) {
    return {
      id: `safety-check-${candidate.id}-cross-contamination`,
      source: 'cross_contamination',
      badge: 'Protocol still open',
      title: `Complete cross-contamination protocol for ${eventLabel}`,
      description:
        'Allergen handling is in play for this event, but the dedicated prevention checklist is not complete yet. Finish that protocol in the safety surface before service.',
      href: `/events/${candidate.id}/safety`,
      ctaLabel: 'Complete Cross-Contamination Checklist',
      tone: 'amber',
      context: [
        ...baseContext,
        `${candidate.cross_contamination_completed_count}/${candidate.cross_contamination_total_count} protocol items complete`,
      ],
    }
  }

  if (candidate.has_allergy_card_data) {
    return {
      id: `safety-check-${candidate.id}-allergy-card`,
      source: 'print_allergy_card',
      badge: 'Safety handoff ready',
      title: `Print the allergy card for ${eventLabel}`,
      description:
        'The allergy and dietary data is already in place. Open the focused safety surface and print the kitchen-ready allergy card from there.',
      href: `/events/${candidate.id}/safety`,
      ctaLabel: 'Print Allergy Card',
      tone: 'sky',
      context: [...baseContext, 'Allergy card data ready'],
    }
  }

  return null
}

const SAFETY_CHECK_PRIORITY: Record<SafetyCheckTask['source'], number> = {
  confirm_allergies: 0,
  resolve_conflict: 1,
  cross_contamination: 2,
  print_allergy_card: 3,
}

export function resolveSafetyCheckTask(candidates: SafetyCheckCandidate[]): SafetyCheckTask | null {
  const actionable = candidates
    .slice()
    .sort(compareEventDates)
    .map((candidate) => getSafetyCheckAction(candidate))
    .filter((task): task is Omit<SafetyCheckTask, 'remainingCount' | 'remainingLabel'> =>
      Boolean(task)
    )
    .sort((a, b) => SAFETY_CHECK_PRIORITY[a.source] - SAFETY_CHECK_PRIORITY[b.source])

  if (actionable.length === 0) return null

  return {
    ...actionable[0],
    remainingCount: Math.max(actionable.length - 1, 0),
    remainingLabel: 'more safety checks after this',
  }
}

function getCollectBalanceAction(
  candidate: CollectBalanceCandidate
): Omit<CollectBalanceTask, 'remainingCount' | 'remainingLabel'> | null {
  const eventLabel = candidate.occasion || 'this event'
  const baseContext = [
    candidate.client?.full_name ?? 'Client',
    formatGuestCount(candidate.guest_count),
    formatEventTimingLabel(candidate.event_date, candidate.status === 'completed'),
  ].filter((value): value is string => Boolean(value))

  if (candidate.outstanding_balance_cents > 0) {
    return {
      id: `collect-balance-${candidate.id}-record-payment`,
      source: 'record_payment',
      badge: candidate.status === 'completed' ? 'Balance still open' : 'Payment still due',
      title: `Record payment for ${eventLabel}`,
      description:
        'An event-specific balance is still outstanding. Use the focused billing route to record the payment instead of dropping back into the broad money tab.',
      href: `/events/${candidate.id}/billing`,
      ctaLabel: 'Record Payment',
      tone: candidate.status === 'completed' ? 'rose' : 'amber',
      context: [...baseContext, 'Outstanding balance remains'],
    }
  }

  if (candidate.unpaid_installment_count > 0) {
    return {
      id: `collect-balance-${candidate.id}-installment`,
      source: 'mark_installment_paid',
      badge: 'Installment tracking open',
      title: `Mark the installment paid for ${eventLabel}`,
      description:
        'The balance may already be settled, but the event payment plan is still out of sync. Update the installment record from the focused billing surface.',
      href: `/events/${candidate.id}/billing`,
      ctaLabel: 'Mark Installment Paid',
      tone: 'sky',
      context: [
        ...baseContext,
        candidate.next_installment_label
          ? `Next installment: ${candidate.next_installment_label}`
          : null,
        `${candidate.unpaid_installment_count} installment${candidate.unpaid_installment_count === 1 ? '' : 's'} still open`,
      ].filter((value): value is string => Boolean(value)),
    }
  }

  if (candidate.status === 'completed' && !candidate.financially_closed) {
    return {
      id: `collect-balance-${candidate.id}-close-financials`,
      source: 'close_financials',
      badge: 'Ready to close',
      title: `Close financials for ${eventLabel}`,
      description:
        'The money is settled, but the event still is not financially closed. Finish the dedicated financial summary so this close-out step stops leaking into the broader event loop.',
      href: `/events/${candidate.id}/financial`,
      ctaLabel: 'Close Financials',
      tone: 'emerald',
      context: [...baseContext, 'Balance settled, closure still open'],
    }
  }

  return null
}

const COLLECT_BALANCE_PRIORITY: Record<CollectBalanceTask['source'], number> = {
  record_payment: 0,
  mark_installment_paid: 1,
  close_financials: 2,
}

export function resolveCollectBalanceTask(
  candidates: CollectBalanceCandidate[]
): CollectBalanceTask | null {
  const actionable = candidates
    .slice()
    .sort(compareEventDates)
    .map((candidate) => getCollectBalanceAction(candidate))
    .filter((task): task is Omit<CollectBalanceTask, 'remainingCount' | 'remainingLabel'> =>
      Boolean(task)
    )
    .sort((a, b) => COLLECT_BALANCE_PRIORITY[a.source] - COLLECT_BALANCE_PRIORITY[b.source])

  if (actionable.length === 0) return null

  return {
    ...actionable[0],
    remainingCount: Math.max(actionable.length - 1, 0),
    remainingLabel: 'more balance actions after this',
  }
}

function getReceiptCaptureAction(
  candidate: ReceiptCaptureCandidate
): Omit<ReceiptCaptureTask, 'remainingCount' | 'remainingLabel'> | null {
  const eventLabel = candidate.occasion || 'this event'
  const baseContext = [
    candidate.client?.full_name ?? 'Client',
    formatGuestCount(candidate.guest_count),
    formatEventTimingLabel(candidate.event_date, candidate.status === 'completed'),
  ].filter((value): value is string => Boolean(value))

  if (candidate.needs_review_count > 0) {
    return {
      id: `receipt-capture-${candidate.id}-review`,
      source: 'review_extraction',
      badge: 'Extraction needs review',
      title: `Review the receipt extraction for ${eventLabel}`,
      description:
        'Low-confidence receipt OCR is waiting on manual review. Use the focused receipts route so the corrections stay attached to the event instead of getting lost in the broader financial shell.',
      href: `/events/${candidate.id}/receipts`,
      ctaLabel: 'Review Receipt Extraction',
      tone: candidate.status === 'completed' ? 'amber' : 'brand',
      context: [
        ...baseContext,
        `${candidate.needs_review_count} receipt${candidate.needs_review_count === 1 ? '' : 's'} need manual review`,
      ],
    }
  }

  if (candidate.approvable_count > 0) {
    return {
      id: `receipt-capture-${candidate.id}-approve`,
      source: 'approve',
      badge: 'Receipt ready to approve',
      title: `Approve the receipt for ${eventLabel}`,
      description:
        'The extraction is ready, but the receipt has not been approved into event expenses yet. Finish that handoff from the focused receipts route so the event cost loop becomes real.',
      href: `/events/${candidate.id}/receipts`,
      ctaLabel: 'Approve Receipt',
      tone: 'brand',
      context: [
        ...baseContext,
        `${candidate.approvable_count} receipt${candidate.approvable_count === 1 ? '' : 's'} ready to approve`,
      ],
    }
  }

  if (candidate.needs_upload) {
    return {
      id: `receipt-capture-${candidate.id}-upload`,
      source: 'upload',
      badge: 'Receipt intake open',
      title: `Upload a receipt for ${eventLabel}`,
      description:
        'This event still has an unresolved receipt-upload requirement and no recorded receipt photos. Start intake from the focused receipts route instead of the broad money shell.',
      href: `/events/${candidate.id}/receipts`,
      ctaLabel: 'Upload Receipt',
      tone: 'amber',
      context: [...baseContext, 'No receipt uploads recorded'],
    }
  }

  return null
}

const RECEIPT_CAPTURE_PRIORITY: Record<ReceiptCaptureTask['source'], number> = {
  review_extraction: 0,
  approve: 1,
  upload: 2,
}

export function resolveReceiptCaptureTask(
  candidates: ReceiptCaptureCandidate[]
): ReceiptCaptureTask | null {
  const actionable = candidates
    .slice()
    .sort(compareRecentEventDates)
    .map((candidate) => getReceiptCaptureAction(candidate))
    .filter((task): task is Omit<ReceiptCaptureTask, 'remainingCount' | 'remainingLabel'> =>
      Boolean(task)
    )
    .sort((a, b) => RECEIPT_CAPTURE_PRIORITY[a.source] - RECEIPT_CAPTURE_PRIORITY[b.source])

  if (actionable.length === 0) return null

  return {
    ...actionable[0],
    remainingCount: Math.max(actionable.length - 1, 0),
    remainingLabel: 'more receipt actions after this',
  }
}

function getTeamReadyAction(
  candidate: TeamReadyCandidate
): Omit<TeamReadyTask, 'remainingCount' | 'remainingLabel'> | null {
  const eventLabel = candidate.occasion || 'this event'
  const baseContext = [
    candidate.client?.full_name ?? 'Client',
    formatGuestCount(candidate.guest_count),
    formatEventTimingLabel(candidate.event_date),
  ].filter((value): value is string => Boolean(value))

  if (candidate.has_staff_conflict) {
    return {
      id: `team-ready-${candidate.id}-resolve-conflict`,
      source: 'resolve_staff_conflict',
      badge: 'Staff conflict detected',
      title: `Resolve the staffing conflict for ${eventLabel}`,
      description:
        'At least one assigned team member overlaps with another event. Use the focused staffing route to resolve that event-specific conflict before execution day.',
      href: `/events/${candidate.id}/staff`,
      ctaLabel: 'Resolve Staff Conflict',
      tone: 'rose',
      context: [...baseContext, candidate.conflict_summary ?? 'Overlapping assignment detected'],
    }
  }

  if (candidate.staff_count === 0) {
    return {
      id: `team-ready-${candidate.id}-assign-staff`,
      source: 'assign_staff',
      badge: 'Team still missing',
      title: `Assign staff for ${eventLabel}`,
      description:
        'Execution support is still unassigned for this event. Open the focused staffing route and put named people on the event instead of scanning the broader ops shell.',
      href: `/events/${candidate.id}/staff`,
      ctaLabel: 'Assign Staff',
      tone: 'amber',
      context: [...baseContext, 'No staff assigned yet'],
    }
  }

  if (!candidate.has_staff_task) {
    return {
      id: `team-ready-${candidate.id}-add-task`,
      source: 'add_staff_task',
      badge: 'Staff handoff still thin',
      title: `Add a staff task for ${eventLabel}`,
      description:
        'The roster exists, but nobody has an event-linked task yet. Add the first real handoff task from the staffing route so execution expectations are explicit.',
      href: `/events/${candidate.id}/staff`,
      ctaLabel: 'Add Staff Task',
      tone: 'brand',
      context: [...baseContext, `${candidate.staff_count} staff assigned`],
    }
  }

  if (candidate.can_generate_staff_briefing) {
    return {
      id: `team-ready-${candidate.id}-briefing`,
      source: 'generate_staff_briefing',
      badge: 'Briefing ready',
      title: `Generate the staff briefing for ${eventLabel}`,
      description:
        'Assignments and tasks are in place. Generate the event-specific staff briefing from the focused team route so the handoff stays attached to the event context.',
      href: `/events/${candidate.id}/staff`,
      ctaLabel: 'Generate Staff Briefing',
      tone: 'sky',
      context: [...baseContext, `${candidate.staff_count} staff assigned`],
    }
  }

  return null
}

const TEAM_READY_PRIORITY: Record<TeamReadyTask['source'], number> = {
  resolve_staff_conflict: 0,
  assign_staff: 1,
  add_staff_task: 2,
  generate_staff_briefing: 3,
}

export function resolveTeamReadyTask(candidates: TeamReadyCandidate[]): TeamReadyTask | null {
  const actionable = candidates
    .slice()
    .sort(compareEventDates)
    .map((candidate) => getTeamReadyAction(candidate))
    .filter((task): task is Omit<TeamReadyTask, 'remainingCount' | 'remainingLabel'> =>
      Boolean(task)
    )
    .sort((a, b) => TEAM_READY_PRIORITY[a.source] - TEAM_READY_PRIORITY[b.source])

  if (actionable.length === 0) return null

  return {
    ...actionable[0],
    remainingCount: Math.max(actionable.length - 1, 0),
    remainingLabel: 'more team-ready actions after this',
  }
}

function getRelationshipTone(urgency: RelationshipNextCandidate['urgency']): SurfaceActionTone {
  if (urgency === 'critical') return 'rose'
  if (urgency === 'high') return 'amber'
  if (urgency === 'normal') return 'brand'
  return 'sky'
}

function getRelationshipBadge(urgency: RelationshipNextCandidate['urgency']): string {
  if (urgency === 'critical') return 'Relationship urgent'
  if (urgency === 'high') return 'Relationship ready'
  if (urgency === 'normal') return 'Portfolio move'
  return 'Relationship follow-through'
}

function getRelationshipPrimarySignalLabel(
  signal: RelationshipNextCandidate['primarySignal']
): string {
  switch (signal) {
    case 'booking_blocker_active':
      return 'Booking blocker active'
    case 'quote_revision_ready':
      return 'Quote revision ready'
    default:
      return getClientInteractionSignalShortLabel(signal)
  }
}

export function resolveRelationshipNextTask(
  candidates: RelationshipNextCandidate[]
): RelationshipNextTask | null {
  const actionable = candidates
    .map((candidate) => ({
      candidate,
      copy: getRelationshipActionLayerCopy(candidate),
    }))
    .filter(
      (
        item
      ): item is {
        candidate: RelationshipNextCandidate
        copy: NonNullable<ReturnType<typeof getRelationshipActionLayerCopy>>
      } => Boolean(item.copy)
    )
  if (actionable.length === 0) return null

  const { candidate, copy } = actionable[0]

  return {
    id: `relationship-next-${candidate.clientId}-${candidate.actionType}`,
    source: copy.source,
    badge: getRelationshipBadge(candidate.urgency),
    title: copy.title,
    description: candidate.description,
    href: candidate.href ?? `/clients/${candidate.clientId}/relationship`,
    ctaLabel: copy.ctaLabel,
    tone: getRelationshipTone(candidate.urgency),
    context: [
      candidate.clientName,
      candidate.tier.replace(/_/g, ' '),
      getRelationshipPrimarySignalLabel(candidate.primarySignal),
      ('interventionLabel' in candidate ? candidate.interventionLabel : null) ?? null,
    ].filter((value): value is string => Boolean(value)),
    remainingCount: Math.max(actionable.length - 1, 0),
    remainingLabel: 'more relationship moves after this',
  }
}

function getDaysUntilEvent(eventDate: string): number {
  const event = new Date(`${eventDate}T00:00:00`)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.ceil((event.getTime() - today.getTime()) / 86400000)
}

function formatDaysSinceEventLabel(eventDate: string): string {
  const daysUntil = getDaysUntilEvent(eventDate)
  if (daysUntil >= 0) {
    return formatDaysUntilLabel(daysUntil)
  }

  const ageDays = Math.abs(daysUntil)
  if (ageDays === 1) return '1 day ago'
  return `${ageDays} days ago`
}

function hasReadinessBlocker(candidate: ServiceReadyCandidate, gate: string): boolean {
  return candidate.readiness?.blockers.some((blocker) => blocker.gate === gate) ?? false
}

function getServiceReadyAction(
  candidate: ServiceReadyCandidate
): Omit<ServiceReadyTask, 'remainingCount' | 'remainingLabel'> | null {
  const eventLabel = candidate.occasion || 'this event'
  const clientName = candidate.client?.full_name ?? 'Client'
  const dayLabel = formatDaysUntilLabel(getDaysUntilEvent(candidate.event_date))
  const baseContext = [
    clientName,
    candidate.guest_count ? `${candidate.guest_count} guests` : null,
    dayLabel,
  ].filter((value): value is string => Boolean(value))
  const isToday = getDaysUntilEvent(candidate.event_date) === 0

  if (candidate.status === 'paid') {
    if (
      hasReadinessBlocker(candidate, 'documents_generated') &&
      candidate.prep_sheet_ready &&
      !candidate.prep_sheet_generated
    ) {
      return {
        id: `service-ready-${candidate.id}-documents`,
        source: 'documents',
        badge: 'Docs blocking confirmation',
        title: `Generate the prep sheet for ${eventLabel}`,
        description:
          'Confirmation is waiting on the service packet. Generate the prep sheet now so readiness resolves on the real event instead of a hidden document gap.',
        href: `/events/${candidate.id}/documents`,
        ctaLabel: 'Generate Prep Sheet',
        tone: 'amber',
        context: [...baseContext, 'Prep sheet still missing'],
      }
    }

    if (
      hasReadinessBlocker(candidate, 'documents_generated') &&
      !candidate.packing_list_generated
    ) {
      return {
        id: `service-ready-${candidate.id}-packing`,
        source: 'packing',
        badge: 'Docs blocking confirmation',
        title: `Review packing for ${eventLabel}`,
        description:
          'The packing workflow is still unresolved before this event can cleanly move forward. Open the packing surface and finish the service-side checklist there.',
        href: `/events/${candidate.id}/pack`,
        ctaLabel: 'Review Packing',
        tone: 'amber',
        context: [...baseContext, 'Packing list still missing'],
      }
    }

    return null
  }

  const dopIncomplete =
    candidate.dop_progress !== null &&
    candidate.dop_progress.completed < candidate.dop_progress.total

  if (hasReadinessBlocker(candidate, 'packing_reviewed') || !candidate.car_packed) {
    return {
      id: `service-ready-${candidate.id}-review-packing`,
      source: 'packing',
      badge: isToday ? 'Service starts today' : 'Packing still open',
      title: `Review packing for ${eventLabel}`,
      description:
        'Packing is the next operational blocker before service. Use the dedicated pack surface instead of scanning the broader event shell for what is still missing.',
      href: `/events/${candidate.id}/pack`,
      ctaLabel: 'Review Packing',
      tone: isToday ? 'rose' : 'amber',
      context: [
        ...baseContext,
        candidate.car_packed ? 'Packed load needs review' : 'Car not marked packed',
      ],
    }
  }

  if (dopIncomplete && candidate.dop_progress) {
    return {
      id: `service-ready-${candidate.id}-dop`,
      source: 'dop',
      badge: isToday ? 'Day-of protocol open' : 'DOP still open',
      title: `Finish the DOP for ${eventLabel}`,
      description:
        'The service runbook is still incomplete. Close the remaining protocol tasks in the schedule surface before service starts stacking live decisions.',
      href: `/events/${candidate.id}/schedule`,
      ctaLabel: 'Finish DOP',
      tone: isToday ? 'amber' : 'sky',
      context: [
        ...baseContext,
        `${candidate.dop_progress.completed}/${candidate.dop_progress.total} DOP tasks complete`,
      ],
    }
  }

  return null
}

export function resolveServiceReadyTask(
  candidates: ServiceReadyCandidate[]
): ServiceReadyTask | null {
  const actionable = candidates
    .map((candidate) => getServiceReadyAction(candidate))
    .filter((task): task is Omit<ServiceReadyTask, 'remainingCount' | 'remainingLabel'> =>
      Boolean(task)
    )

  if (actionable.length === 0) return null

  return {
    ...actionable[0],
    remainingCount: Math.max(actionable.length - 1, 0),
    remainingLabel: 'more service-readiness moves after this',
  }
}

function getResetNextAction(
  candidate: ResetNextCandidate
): Omit<ResetNextTask, 'remainingCount' | 'remainingLabel'> | null {
  if (candidate.reset_complete) return null

  const eventLabel = candidate.occasion || 'this event'
  const ageDays = Math.abs(Math.min(getDaysUntilEvent(candidate.event_date), 0))

  return {
    id: `reset-next-${candidate.id}`,
    source: 'checklist',
    badge: ageDays >= 2 ? 'Reset overdue' : 'Reset still open',
    title: `Open the reset checklist for ${eventLabel}`,
    description:
      'Service is complete, but the operational reset is still unfinished. Use the focused reset route to work the checklist and mark completion on the actual event record.',
    href: `/events/${candidate.id}/reset`,
    ctaLabel: 'Open Reset Checklist',
    tone: ageDays >= 2 ? 'rose' : 'amber',
    context: [
      candidate.client?.full_name ?? 'Client',
      formatGuestCount(candidate.guest_count),
      formatDaysSinceEventLabel(candidate.event_date),
      'Reset still incomplete',
    ].filter((value): value is string => Boolean(value)),
  }
}

export function resolveResetNextTask(candidates: ResetNextCandidate[]): ResetNextTask | null {
  const actionable = candidates
    .slice()
    .sort(compareRecentEventDates)
    .map((candidate) => getResetNextAction(candidate))
    .filter((task): task is Omit<ResetNextTask, 'remainingCount' | 'remainingLabel'> =>
      Boolean(task)
    )

  if (actionable.length === 0) return null

  return {
    ...actionable[0],
    remainingCount: Math.max(actionable.length - 1, 0),
    remainingLabel: 'more reset actions after this',
  }
}

function getCloseOutPendingLabels(candidate: CloseOutCandidate): string[] {
  return [
    !candidate.financially_closed ? 'Financial close' : null,
    !candidate.aar_filed ? 'Event review' : null,
    !candidate.follow_up_sent ? 'Client follow-up' : null,
  ].filter((value): value is string => Boolean(value))
}

function getCloseOutTone(candidate: CloseOutCandidate): SurfaceActionTone {
  const eventDate = new Date(`${candidate.event_date}T00:00:00`)
  const ageMs = Date.now() - eventDate.getTime()
  const ageDays = Math.floor(ageMs / 86400000)

  if (ageDays >= 3) return 'rose'
  if (!candidate.financially_closed) return 'amber'
  return 'sky'
}

function isFinancialOnlyCloseOutCandidate(candidate: CloseOutCandidate): boolean {
  return (
    !candidate.financially_closed &&
    candidate.aar_filed &&
    candidate.follow_up_sent &&
    candidate.reset_complete
  )
}

export function resolveCloseOutNextTask(events: CloseOutCandidate[]): CloseOutNextTask | null {
  const actionableEvents = events.filter(
    (candidate) => !isFinancialOnlyCloseOutCandidate(candidate)
  )
  if (actionableEvents.length === 0) return null

  const candidate = actionableEvents[0]
  const pendingLabels = getCloseOutPendingLabels(candidate)
  const eventLabel = candidate.occasion || 'recent event'
  const clientName = candidate.client?.full_name ?? 'Client'
  const tone = getCloseOutTone(candidate)

  if (!candidate.financially_closed) {
    return {
      id: `close-out-${candidate.id}`,
      source: 'wizard',
      badge: pendingLabels.length > 1 ? 'Post-event work open' : 'Financial close open',
      title: `Close out ${eventLabel}`,
      description:
        pendingLabels.length > 1
          ? 'The post-event pass is still open. Finish the close-out flow so the review, receipts, and final margin resolve on the actual event instead of drifting into history.'
          : 'The close-out flow is still open. Finish the receipts, mileage, reflection, and final financial close while the service is still fresh.',
      href: `/events/${candidate.id}/close-out`,
      ctaLabel: 'Open Close-Out',
      tone,
      context: [
        clientName,
        candidate.guest_count ? `${candidate.guest_count} guests` : null,
        ...pendingLabels.map((label) => `${label} pending`),
      ].filter((value): value is string => Boolean(value)),
      remainingCount: Math.max(actionableEvents.length - 1, 0),
      remainingLabel: 'more completed events still open',
    }
  }

  if (!candidate.aar_filed) {
    return {
      id: `close-out-aar-${candidate.id}`,
      source: 'aar',
      badge: 'Review still missing',
      title: `File the event review for ${eventLabel}`,
      description:
        'Capture the after-action details now so the lesson stays attached to the event instead of becoming another loose memory.',
      href: `/events/${candidate.id}/aar`,
      ctaLabel: 'File Review',
      tone,
      context: [
        clientName,
        candidate.guest_count ? `${candidate.guest_count} guests` : null,
        ...pendingLabels.map((label) => `${label} pending`),
      ].filter((value): value is string => Boolean(value)),
      remainingCount: Math.max(actionableEvents.length - 1, 0),
      remainingLabel: 'more completed events still open',
    }
  }

  if (!candidate.follow_up_sent) {
    return {
      id: `close-out-follow-up-${candidate.id}`,
      source: 'follow_up',
      badge: 'Client loop still open',
      title: `Send the client follow-up for ${eventLabel}`,
      description:
        'The dinner is complete, but the thank-you and review request path is still unresolved on the event record.',
      href: `/events/${candidate.id}?tab=wrap`,
      ctaLabel: 'Open Follow-Up',
      tone,
      context: [
        clientName,
        candidate.guest_count ? `${candidate.guest_count} guests` : null,
        ...pendingLabels.map((label) => `${label} pending`),
      ].filter((value): value is string => Boolean(value)),
      remainingCount: Math.max(actionableEvents.length - 1, 0),
      remainingLabel: 'more completed events still open',
    }
  }

  return null
}

function getTrustLoopAction(
  candidate: TrustLoopCandidate
): Omit<TrustLoopNextTask, 'remainingCount' | 'remainingLabel'> | null {
  const eventLabel = candidate.occasion || 'this event'
  const clientName = candidate.client?.full_name ?? 'Client'
  const ageLabel = formatDaysSinceEventLabel(candidate.event_date)
  const baseContext = [
    clientName,
    candidate.guest_count ? `${candidate.guest_count} guests` : null,
    ageLabel,
  ].filter((value): value is string => Boolean(value))

  if (!candidate.survey?.sent_at) {
    return {
      id: `trust-loop-${candidate.id}-survey`,
      source: 'survey',
      badge: 'Trust loop open',
      title: `Send the survey for ${eventLabel}`,
      description:
        'Internal follow-up is complete, but the client satisfaction loop has not been opened yet. Send the canonical survey while the dinner is still fresh.',
      href: `/events/${candidate.id}?tab=wrap`,
      ctaLabel: 'Send Survey',
      tone: getDaysUntilEvent(candidate.event_date) <= -3 ? 'amber' : 'sky',
      context: [...baseContext, 'Follow-up already sent'],
    }
  }

  const reviewGate = getReviewRequestGate({
    completedAt: candidate.survey.completed_at,
    reviewRequestEligible: candidate.survey.review_request_eligible,
    reviewRequestSentAt: candidate.survey.review_request_sent_at,
  })

  if (reviewGate.ok && !candidate.survey.public_review_shared) {
    return {
      id: `trust-loop-${candidate.id}-review-request`,
      source: 'review_request',
      badge: 'Public review ready',
      title: `Request a public review for ${eventLabel}`,
      description:
        'The client already gave a positive response. Send the public-review ask now so trust proof stays attached to the event while consent and context are current.',
      href: `/events/${candidate.id}?tab=wrap`,
      ctaLabel: 'Request Public Review',
      tone: 'brand',
      context: [
        ...baseContext,
        candidate.survey.overall ? `${candidate.survey.overall}/5 overall` : null,
        candidate.survey.what_they_loved ? 'Survey highlight ready' : null,
      ].filter((value): value is string => Boolean(value)),
    }
  }

  return null
}

export function resolveTrustLoopNextTask(
  candidates: TrustLoopCandidate[]
): TrustLoopNextTask | null {
  const actionable = candidates
    .map((candidate) => getTrustLoopAction(candidate))
    .filter((task): task is Omit<TrustLoopNextTask, 'remainingCount' | 'remainingLabel'> =>
      Boolean(task)
    )

  if (actionable.length === 0) return null

  return {
    ...actionable[0],
    remainingCount: Math.max(actionable.length - 1, 0),
    remainingLabel: 'more trust-loop moves after this',
  }
}

export function hasSchedulingRulesConfigured(rules: SchedulingRules | null): boolean {
  if (!rules) return false

  return (
    rules.blocked_days_of_week.length > 0 ||
    rules.preferred_days_of_week.length > 0 ||
    rules.min_buffer_days > 0 ||
    rules.min_lead_days > 0 ||
    rules.max_events_per_week !== null ||
    rules.max_events_per_month !== null
  )
}

function describeBookingGaps(settings: BookingSettings): string[] {
  const gaps: string[] = []

  if (!settings.booking_slug) gaps.push('booking URL')
  if (!settings.booking_headline) gaps.push('headline')
  if (!settings.booking_bio_short) gaps.push('short description')

  return gaps
}

export function resolveSettingsFixTasks(input: {
  profile: SettingsProfileState
  googleConnection: GoogleConnectionStatus
  schedulingRules: SchedulingRules | null
  bookingSettings: BookingSettings | null
  googleReviewUrl: string | null
  wixConnection: WixConnectionStatus | null
}): SettingsFixTask[] {
  const tasks: SettingsFixTask[] = []

  if (!input.profile.slug) {
    tasks.push({
      id: 'profile-url',
      title: 'Give your profile a live URL',
      description:
        'Set the public profile basics so clients have a real surface to land on and share.',
      currentState: 'Current state: no public profile URL is saved yet.',
      impact: 'Without it, your public surface cannot act like a dependable front door.',
      href: '/settings/my-profile',
      ctaLabel: 'Fix This Setting',
      tone: 'rose',
    })
  } else if (input.profile.publicProfileHidden) {
    tasks.push({
      id: 'profile-copy',
      title: 'Unhide your public profile',
      description:
        'Finish the missing public-facing copy so your profile can be shown with confidence.',
      currentState:
        'Current state: the live profile is hidden because the bio or tagline is missing.',
      impact: 'Clients cannot trust or share a profile that never fully resolves.',
      href: '/settings/my-profile',
      ctaLabel: 'Fix This Setting',
      tone: 'rose',
    })
  }

  if (input.googleConnection.gmail.connected && input.googleConnection.gmail.errorCount > 0) {
    tasks.push({
      id: 'gmail-repair',
      title: 'Repair inbox capture',
      description:
        'Gmail is connected, but recent sync failures mean inquiry capture may drift or stall.',
      currentState: `Current state: ${input.googleConnection.gmail.errorCount} recent Gmail sync error(s).`,
      impact: 'New leads can sit outside the triage flow until this connection is healthy again.',
      href: '/settings#connected-accounts-integrations',
      ctaLabel: 'Fix This Setting',
      tone: 'emerald',
    })
  } else if (!input.googleConnection.gmail.connected) {
    tasks.push({
      id: 'gmail-connect',
      title: 'Connect Gmail capture',
      description:
        'Connect the inbox ChefFlow is supposed to read so inquiry triage stops depending on manual copy-paste.',
      currentState: 'Current state: Gmail capture is disconnected.',
      impact: 'Inbox-driven inquiry flow stays incomplete until this account is connected.',
      href: '/settings#connected-accounts-integrations',
      ctaLabel: 'Fix This Setting',
      tone: 'emerald',
    })
  }

  if (!input.googleConnection.calendar.connected) {
    tasks.push({
      id: 'calendar-connect',
      title: 'Connect Google Calendar',
      description:
        'Wire up the calendar ChefFlow should respect before booking and schedule surfaces drift from reality.',
      currentState: 'Current state: live calendar availability is disconnected.',
      impact: 'Availability warnings and booking context stay weaker until the calendar is synced.',
      href: '/settings#connected-accounts-integrations',
      ctaLabel: 'Fix This Setting',
      tone: 'emerald',
    })
  }

  if (!hasSchedulingRulesConfigured(input.schedulingRules)) {
    tasks.push({
      id: 'availability-rules',
      title: 'Define your availability rules',
      description:
        'Save your lead time, buffers, or capacity limits so ChefFlow can warn before double-booking.',
      currentState: 'Current state: no active scheduling rules are saved yet.',
      impact:
        'Booking and event flows cannot protect your real operating limits until rules exist.',
      href: '/settings#availability-rules',
      ctaLabel: 'Fix This Setting',
      tone: 'sky',
    })
  }

  if (input.bookingSettings?.booking_enabled) {
    const bookingGaps = describeBookingGaps(input.bookingSettings)
    if (bookingGaps.length > 0) {
      tasks.push({
        id: 'booking-page',
        title: 'Finish your booking page',
        description:
          'Complete the shared booking surface so the public link resolves to something clients can actually understand.',
        currentState: `Current state: missing ${bookingGaps.join(', ')} on the booking page.`,
        impact:
          'A half-configured booking link adds friction right at the handoff from interest to inquiry.',
        href: '/settings#booking-page',
        ctaLabel: 'Fix This Setting',
        tone: 'sky',
      })
    }
  }

  if (!input.googleReviewUrl) {
    tasks.push({
      id: 'review-link',
      title: 'Add your Google review link',
      description:
        'Set the review destination ChefFlow should send clients to after service is complete.',
      currentState: 'Current state: no Google review URL is saved.',
      impact:
        'Review collection stays fragmented when the post-event path has nowhere concrete to point.',
      href: '/settings#client-reviews',
      ctaLabel: 'Fix This Setting',
      tone: 'amber',
    })
  }

  if (input.wixConnection?.connected && input.wixConnection.errorCount > 0) {
    tasks.push({
      id: 'wix-repair',
      title: 'Repair Wix form intake',
      description:
        'Your Wix intake is connected, but recent delivery failures mean website leads may not land cleanly in ChefFlow.',
      currentState: `Current state: ${input.wixConnection.errorCount} Wix delivery error(s) recorded.`,
      impact:
        'Website-originated inquiries can fall out of the operating queue until this is stable.',
      href: '/settings#connected-accounts-integrations',
      ctaLabel: 'Fix This Setting',
      tone: 'emerald',
    })
  }

  return tasks
}
