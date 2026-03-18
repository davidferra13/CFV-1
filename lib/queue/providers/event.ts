// Priority Queue - Event Provider
// Converts existing WorkItems from the Work Surface engine into scored QueueItems.
// Stages 1-13 only - post-event stages (14-17) handled by dedicated providers.

import type { QueueItem, ScoreInputs } from '../types'
import type { WorkItem, WorkUrgency } from '@/lib/workflow/types'
import { computeScore, urgencyFromScore } from '../score'

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
export function convertWorkItemsToQueueItems(workItems: WorkItem[]): QueueItem[] {
  const now = new Date()

  // Filter to stages 1-13 only - post-event handled by dedicated providers
  const preEventItems = workItems.filter((wi) => wi.stageNumber <= 13)

  return preEventItems.map((wi) => {
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
      href: `/events/${wi.eventId}`,
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
    }
  })
}
