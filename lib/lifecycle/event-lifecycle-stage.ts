// Maps event FSM status to lifecycle workspace stages for the event detail page.
// Each stage groups sections that are most relevant during that phase.

import type { EventStatus } from '@/lib/events/fsm'

/**
 * Lifecycle workspace stages for the event detail page.
 * These are broader groupings than EventStatus, designed for UI organization.
 */
export type LifecycleWorkspaceStage = 'planning' | 'confirmed' | 'active' | 'closeout'

/**
 * Which workspace stage an event is currently in, based on its FSM status.
 */
export function getLifecycleWorkspaceStage(status: EventStatus): LifecycleWorkspaceStage {
  switch (status) {
    case 'draft':
    case 'proposed':
    case 'accepted':
      return 'planning'
    case 'paid':
    case 'confirmed':
      return 'confirmed'
    case 'in_progress':
      return 'active'
    case 'completed':
      return 'closeout'
    case 'cancelled':
      // Cancelled events show closeout view (wrap, audit trail, refund info)
      return 'closeout'
    default:
      return 'planning'
  }
}

export interface LifecycleStageConfig {
  key: LifecycleWorkspaceStage
  label: string
  description: string
}

/**
 * Ordered stage definitions for the workspace panel headers.
 */
export const LIFECYCLE_STAGE_CONFIGS: LifecycleStageConfig[] = [
  {
    key: 'planning',
    label: 'Planning',
    description: 'Menu, discovery, beverages, pricing, and client details',
  },
  {
    key: 'confirmed',
    label: 'Confirmed',
    description: 'Prep schedule, packing, gear check, tickets, and logistics',
  },
  {
    key: 'active',
    label: 'Service Day',
    description: 'Live operations, temperature logs, staff, and execution',
  },
  {
    key: 'closeout',
    label: 'Wrap-up',
    description: 'Debrief, follow-up, audit trail, and financial closeout',
  },
]

/**
 * Which tab keys belong to each lifecycle stage.
 * Sections are assigned to the stage where they are most relevant.
 */
export const STAGE_TAB_MAPPING: Record<LifecycleWorkspaceStage, string[]> = {
  planning: ['overview', 'popup', 'money'],
  confirmed: ['prep', 'tickets'],
  active: ['ops'],
  closeout: ['wrap'],
}

/**
 * Determine the stage ordering index (0-based) for comparison.
 */
const STAGE_ORDER: Record<LifecycleWorkspaceStage, number> = {
  planning: 0,
  confirmed: 1,
  active: 2,
  closeout: 3,
}

/**
 * Returns 'past', 'current', or 'future' for a target stage relative to current.
 */
export function getStageRelation(
  currentStage: LifecycleWorkspaceStage,
  targetStage: LifecycleWorkspaceStage
): 'past' | 'current' | 'future' {
  const currentIdx = STAGE_ORDER[currentStage]
  const targetIdx = STAGE_ORDER[targetStage]
  if (targetIdx < currentIdx) return 'past'
  if (targetIdx === currentIdx) return 'current'
  return 'future'
}
