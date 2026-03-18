// GET_PREPARABLE_ACTIONS - The Core Engine
// Deterministic. Pure. No database calls.
//
// Input:  EventContext[]  (pre-fetched event data)
// Output: DashboardWorkSurface (categorized, sorted work items)

import type { EventContext, EventWorkSurface, DashboardWorkSurface, WorkItem } from './types'
import { deriveConfirmedFacts } from './confirmed-facts'
import { STAGE_EVALUATORS } from './stage-definitions'

/**
 * Evaluate a single event and return its work surface.
 * Pure function - no side effects.
 */
export function getEventWorkSurface(ctx: EventContext): EventWorkSurface {
  const facts = deriveConfirmedFacts(ctx)

  // Terminal events produce no work items
  if (facts.isTerminal) {
    // Exception: completed events may have post-event work
    if (!facts.isCompleted) {
      return {
        eventId: ctx.event.id,
        eventOccasion: ctx.event.occasion ?? '',
        eventDate: ctx.event.event_date,
        clientName: ctx.event.client?.full_name ?? 'Unknown Client',
        status: ctx.event.status,
        facts,
        items: [],
      }
    }
  }

  // Run all stage evaluators and collect items
  const items: WorkItem[] = []
  for (const evaluator of STAGE_EVALUATORS) {
    const stageItems = evaluator(ctx, facts)
    items.push(...stageItems)
  }

  return {
    eventId: ctx.event.id,
    eventOccasion: ctx.event.occasion ?? '',
    eventDate: ctx.event.event_date,
    clientName: ctx.event.client?.full_name ?? 'Unknown Client',
    status: ctx.event.status,
    facts,
    items,
  }
}

/**
 * GET_PREPARABLE_ACTIONS
 *
 * The deterministic function required by the Process Master Document.
 *
 * Evaluates confirmed facts only.
 * Ignores blocked dependencies for preparable items.
 * Surfaces actions that reduce future stress.
 * Excludes irreversible actions until legally actionable.
 * Separates: BLOCKED, PREPARABLE, OPTIONAL EARLY.
 */
export function getPreparableActions(contexts: EventContext[]): DashboardWorkSurface {
  const byEvent: EventWorkSurface[] = contexts.map(getEventWorkSurface)

  const allItems = byEvent.flatMap((e) => e.items)

  // Categorize
  const blocked = allItems.filter((i) => i.category === 'blocked')
  const preparable = allItems.filter((i) => i.category === 'preparable')
  const optionalEarly = allItems.filter((i) => i.category === 'optional_early')
  const fragile = allItems.filter((i) => i.urgency === 'fragile')

  // Sort each category: fragile first, then by event date (soonest first), then by stage number
  const sortItems = (items: WorkItem[]): WorkItem[] =>
    [...items].sort((a, b) => {
      // Fragile items float to top
      if (a.urgency === 'fragile' && b.urgency !== 'fragile') return -1
      if (a.urgency !== 'fragile' && b.urgency === 'fragile') return 1

      // Then by event date (soonest first)
      const dateA = new Date(a.eventDate).getTime()
      const dateB = new Date(b.eventDate).getTime()
      if (dateA !== dateB) return dateA - dateB

      // Then by stage number (earlier stages first)
      return a.stageNumber - b.stageNumber
    })

  return {
    blocked: sortItems(blocked),
    preparable: sortItems(preparable),
    optionalEarly: sortItems(optionalEarly),
    fragile: sortItems(fragile),
    byEvent,
    summary: {
      totalActiveEvents: byEvent.filter((e) => !e.facts.isTerminal).length,
      totalPreparableActions: preparable.length,
      totalBlockedActions: blocked.length,
      totalFragileActions: fragile.length,
    },
  }
}
