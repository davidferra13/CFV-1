// Priority Queue - Event Provider
// Converts existing WorkItems from the Work Surface engine into scored QueueItems.
// Stages 1-13 only - post-event stages (14-17) handled by dedicated providers.

import type { QueueItem, ScoreInputs } from '../types'
import type { EventWorkSurface, WorkItem, WorkUrgency } from '@/lib/workflow/types'
import { computeScore, urgencyFromScore } from '../score'

const WORKFLOW_STEP_LABELS: Record<WorkItem['stage'], string> = {
  inquiry_intake: 'Details',
  qualification: 'Details',
  menu_development: 'Menu',
  quote: 'Quote',
  financial_commitment: 'Deposit',
  grocery_list: 'Prepare',
  prep_list: 'Prepare',
  equipment_planning: 'Prepare',
  packing: 'Prepare',
  timeline: 'Prepare',
  travel_arrival: 'Prepare',
  execution: 'Service',
  breakdown: 'Service',
  post_event_capture: 'Close out',
  follow_up: 'Follow up',
  financial_closure: 'Close out',
  inquiry_closure: 'Close out',
}

const WORK_ITEM_ROUTE_SUFFIX: Record<string, string> = {
  assign_client: 'edit',
  set_date: 'edit',
  set_location: 'edit',
  set_guest_count: 'edit',
  set_serve_time: 'edit',
  set_pricing: 'edit',
  set_deposit: 'edit',
  grocery_phase_a: 'grocery-run',
  grocery_phase_b: 'grocery-run',
  grocery_phase_c: 'grocery-run',
  draft_prep_plan: 'prep-plan',
  prep_early_items: 'prep-plan',
  prep_day_of: 'prep-plan',
  equipment_level_1: 'gear',
  equipment_level_2: 'gear',
  equipment_level_3: 'gear',
  build_packing_list: 'pack',
  pack_and_load: 'pack',
  draft_timeline: 'schedule',
  finalize_timeline: 'schedule',
  model_travel: 'travel',
  confirm_travel: 'travel',
  start_event: 'service',
  complete_event: 'service',
}

const WORK_URGENCY_IMPACT: Record<WorkUrgency, number> = {
  fragile: 0.85,
  normal: 0.6,
  low: 0.3,
}

const STAGE_ICONS: Record<string, string> = {
  inquiry_intake: 'MessageSquare',
  qualification: 'ClipboardCheck',
  menu_development: 'UtensilsCrossed',
  quote: 'Receipt',
  financial_commitment: 'DollarSign',
  grocery_list: 'ShoppingCart',
  prep_list: 'ListChecks',
  equipment_planning: 'Wrench',
  packing: 'Package',
  timeline: 'Clock',
  travel_arrival: 'MapPin',
  execution: 'ChefHat',
  breakdown: 'PackageCheck',
}

/**
 * Convert pre-fetched WorkItems (stages 1-13) into scored QueueItems.
 * Called from build.ts which already has the DashboardWorkSurface.
 */
export function convertWorkItemsToQueueItems(
  workItems: WorkItem[],
  eventSurfaces: EventWorkSurface[] = []
): QueueItem[] {
  const now = new Date()

  // Filter to stages 1-13 only - post-event handled by dedicated providers
  const preEventItems = workItems.filter((wi) => wi.stageNumber <= 13)

  const workQueueItems = preEventItems.map((wi) => {
    const actionKey = wi.id.split(':').pop() ?? ''
    const routeSuffix = WORK_ITEM_ROUTE_SUFFIX[actionKey]
    const isSetServeTime = actionKey === 'set_serve_time'
    const eventDate = new Date(wi.eventDate)
    const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / 3600000

    const inputs: ScoreInputs = {
      hoursUntilDue: wi.category === 'blocked' ? null : hoursUntilEvent,
      impactWeight: WORK_URGENCY_IMPACT[wi.urgency],
      isBlocking: wi.category === 'blocked',
      hoursSinceCreated: 0,
      revenueCents: 0,
      isExpiring: false,
    }
    const score = computeScore(inputs)

    return {
      id: `event:work_item:${wi.id}`,
      domain: 'event' as const,
      urgency: urgencyFromScore(score),
      score,
      title: wi.title,
      description: wi.description,
      href: routeSuffix ? `/events/${wi.eventId}/${routeSuffix}` : `/events/${wi.eventId}`,
      icon: STAGE_ICONS[wi.stage] ?? 'CircleDot',
      context: {
        primaryLabel: wi.clientName,
        secondaryLabel: wi.eventOccasion || undefined,
      },
      createdAt: now.toISOString(),
      dueAt: wi.eventDate,
      blocks: wi.blockedBy,
      entityId: wi.eventId,
      entityType: 'event',
      workflowStep: { label: WORKFLOW_STEP_LABELS[wi.stage] },
      inlineAction: isSetServeTime
        ? {
            type: 'set_serve_time' as const,
            prefill: { eventId: wi.eventId },
          }
        : undefined,
    }
  })

  return [...workQueueItems, ...buildLongHorizonReadinessItems(eventSurfaces, now)]
}

type LongHorizonReadinessIssue = {
  label: string
  source: string
  severity: 'medium' | 'high'
}

const LONG_HORIZON_MIN_DAYS = 45
const LONG_HORIZON_MAX_DAYS = 180

function daysUntilEvent(eventDate: string, now: Date): number | null {
  const date = new Date(eventDate)
  if (Number.isNaN(date.getTime())) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const eventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.ceil((eventDay.getTime() - today.getTime()) / 86400000)
}

function isLongHorizonConfirmedEvent(surface: EventWorkSurface, now: Date): boolean {
  const daysUntil = daysUntilEvent(surface.eventDate, now)
  if (daysUntil === null) return false
  if (daysUntil < LONG_HORIZON_MIN_DAYS || daysUntil > LONG_HORIZON_MAX_DAYS) return false
  return surface.facts.eventConfirmed || surface.status === 'paid' || surface.status === 'confirmed'
}

function longHorizonIssues(surface: EventWorkSurface): LongHorizonReadinessIssue[] {
  const issues: LongHorizonReadinessIssue[] = []
  const facts = surface.facts

  if (!facts.hasLocation) {
    issues.push({
      label: 'address, access, or venue details are not source-backed',
      source: 'events.location_address',
      severity: 'high',
    })
  }

  if (!facts.hasServeTimeWindow) {
    issues.push({
      label: 'serve-time window is still unknown',
      source: 'events.serve_time',
      severity: 'high',
    })
  }

  if (!facts.guestCountStable) {
    issues.push({
      label: 'headcount has not reached a stable confirmed state',
      source: 'events.guest_count + events.status',
      severity: 'medium',
    })
  }

  if (!facts.hasMenuAttached || !facts.menuGravityStable) {
    issues.push({
      label: 'menu is missing or not stable enough for a quiet runway',
      source: 'menus.event_id + menus.status',
      severity: 'medium',
    })
  }

  if (!facts.hasPricing || !facts.depositReceived) {
    issues.push({
      label: 'pricing or deposit proof is incomplete',
      source: 'events.quoted_price_cents + event_financial_summary.payment_status',
      severity: 'high',
    })
  }

  return issues
}

function buildLongHorizonReadinessItems(eventSurfaces: EventWorkSurface[], now: Date): QueueItem[] {
  return eventSurfaces
    .filter((surface) => isLongHorizonConfirmedEvent(surface, now))
    .flatMap((surface): QueueItem[] => {
      const issues = longHorizonIssues(surface)
      if (issues.length === 0) return []

      const daysUntil = daysUntilEvent(surface.eventDate, now) ?? LONG_HORIZON_MAX_DAYS
      const highIssueCount = issues.filter((issue) => issue.severity === 'high').length
      const score = computeScore({
        hoursUntilDue: Math.max(24, Math.min(14 * 24, (daysUntil - 30) * 24)),
        impactWeight: highIssueCount > 0 ? 0.55 : 0.35,
        isBlocking: highIssueCount > 0,
        hoursSinceCreated: Math.max(0, (LONG_HORIZON_MAX_DAYS - daysUntil) * 24),
        revenueCents: 0,
        isExpiring: daysUntil <= 60,
      })
      const topIssue = issues[0]
      const issueLabels = issues.map((issue) => issue.label).join('; ')
      const sourceLabels = issues.map((issue) => issue.source).join(', ')

      const item: QueueItem = {
        id: `event:long_horizon_readiness:${surface.eventId}`,
        domain: 'event' as const,
        urgency: urgencyFromScore(score),
        score,
        title: 'Review long-horizon dinner readiness',
        description: `${topIssue.label}. Check ${surface.eventOccasion} while there is still a quiet runway.`,
        href: `/events/${surface.eventId}?tab=ops`,
        icon: 'Clock',
        context: {
          primaryLabel: surface.clientName,
          secondaryLabel: `${surface.eventOccasion} - in ${daysUntil} days`,
        },
        createdAt: now.toISOString(),
        dueAt: new Date(now.getTime() + Math.min(14, Math.max(1, daysUntil - 30)) * 86400000)
          .toISOString()
          .slice(0, 10),
        blocks: highIssueCount > 0 ? `Quiet runway: ${issueLabels}` : undefined,
        entityId: surface.eventId,
        entityType: 'event',
        estimatedMinutes: 10,
        contextLine: `Source-backed checks: ${sourceLabels}. Resolve on the event, snooze if intentionally deferred, or escalate from event ops if the client/host needs a decision.`,
      }

      return [item]
    })
}
