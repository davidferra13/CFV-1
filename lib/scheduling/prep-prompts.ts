// Progressive Preparation Prompts
// Time-aware nudges that surface BEFORE the chef is under pressure.
// Pure computation — no DB calls.

import type {
  PrepPrompt,
  SchedulingEvent,
  ChefPreferences,
} from './types'

// ============================================
// HELPERS
// ============================================

function daysUntil(dateStr: string): number {
  const eventDate = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// ============================================
// PROMPT GENERATOR
// ============================================

/**
 * Scan events and return time-aware prep prompts.
 * These are visibility — not guilt trips. Factual tone.
 */
export function getActivePrompts(
  events: SchedulingEvent[],
  prefs: ChefPreferences | null
): PrepPrompt[] {
  const prompts: PrepPrompt[] = []

  for (const event of events) {
    // Only active events (not cancelled, not completed)
    if (event.status === 'cancelled' || event.status === 'completed') continue

    const days = daysUntil(event.event_date)
    if (days < -1) continue // Past events

    const clientName = event.client?.full_name ?? 'Unknown Client'
    const occasion = event.occasion ?? 'Event'

    // ---- 5+ DAYS BEFORE ----
    if (days >= 5) {
      if (event.grocery_list_ready && !event.shopping_completed_at) {
        prompts.push({
          eventId: event.id,
          eventOccasion: occasion,
          eventDate: event.event_date,
          clientName,
          urgency: 'upcoming',
          message: `Grocery list is ready for ${occasion}. You could shop anytime this week.`,
          action: 'Review grocery list',
          actionUrl: `/events/${event.id}`,
          daysUntilEvent: days,
          category: 'shopping',
        })
      }

      if (event.execution_sheet_ready && event.grocery_list_ready && event.prep_list_ready) {
        prompts.push({
          eventId: event.id,
          eventOccasion: occasion,
          eventDate: event.event_date,
          clientName,
          urgency: 'upcoming',
          message: `Menu is confirmed - all documents are available to review for ${occasion}.`,
          action: 'Review documents',
          actionUrl: `/events/${event.id}`,
          daysUntilEvent: days,
          category: 'documents',
        })
      }
    }

    // ---- 48 HOURS (2 DAYS) BEFORE ----
    if (days === 2) {
      prompts.push({
        eventId: event.id,
        eventOccasion: occasion,
        eventDate: event.event_date,
        clientName,
        urgency: 'actionable',
        message: `These prep items are safe to do now for ${occasion}: pasta dough, ice cream base, vinaigrette, marinades.`,
        action: 'View prep list',
        actionUrl: `/events/${event.id}`,
        daysUntilEvent: days,
        category: 'prep',
      })

      if (prefs?.shop_day_before !== false && !event.shopping_completed_at) {
        prompts.push({
          eventId: event.id,
          eventOccasion: occasion,
          eventDate: event.event_date,
          clientName,
          urgency: 'actionable',
          message: `Grocery shopping for ${occasion} - your DOP says shop today.`,
          action: 'View grocery list',
          actionUrl: `/events/${event.id}`,
          daysUntilEvent: days,
          category: 'shopping',
        })
      }
    }

    // ---- 24 HOURS (1 DAY) BEFORE ----
    if (days === 1) {
      if (event.packing_list_ready) {
        prompts.push({
          eventId: event.id,
          eventOccasion: occasion,
          eventDate: event.event_date,
          clientName,
          urgency: 'actionable',
          message: `Packing list is ready to review for ${occasion}.`,
          action: 'View packing list',
          actionUrl: `/events/${event.id}`,
          daysUntilEvent: days,
          category: 'packing',
        })
      }

      if (prefs?.shop_day_before !== false && !event.shopping_completed_at) {
        prompts.push({
          eventId: event.id,
          eventOccasion: occasion,
          eventDate: event.event_date,
          clientName,
          urgency: 'overdue',
          message: `Have you shopped for ${occasion}? DOP expected shopping complete by today.`,
          action: 'Mark shopping complete',
          actionUrl: `/events/${event.id}`,
          daysUntilEvent: days,
          category: 'shopping',
        })
      }
    }

    // ---- MORNING OF (DAY 0) ----
    if (days === 0) {
      prompts.push({
        eventId: event.id,
        eventOccasion: occasion,
        eventDate: event.event_date,
        clientName,
        urgency: 'actionable',
        message: `Today is ${occasion}. View your day schedule.`,
        action: 'View schedule',
        actionUrl: `/events/${event.id}/schedule`,
        daysUntilEvent: 0,
        category: 'admin',
      })

      if (!event.car_packed) {
        prompts.push({
          eventId: event.id,
          eventOccasion: occasion,
          eventDate: event.event_date,
          clientName,
          urgency: 'actionable',
          message: `Non-negotiables checklist ready for ${occasion}.`,
          action: 'View checklist',
          actionUrl: `/events/${event.id}/schedule`,
          daysUntilEvent: 0,
          category: 'packing',
        })
      }
    }

    // ---- OVERDUE PROMPTS ----

    // No menu confirmed for tomorrow's event
    if (days === 1 && !event.execution_sheet_ready) {
      prompts.push({
        eventId: event.id,
        eventOccasion: occasion,
        eventDate: event.event_date,
        clientName,
        urgency: 'overdue',
        message: `No menu confirmed for ${occasion} tomorrow. This blocks grocery list, prep list, and timeline.`,
        action: 'Confirm menu',
        actionUrl: `/events/${event.id}`,
        daysUntilEvent: days,
        category: 'documents',
      })
    }

    // Shopping was expected yesterday but not done
    if (days === 0 && prefs?.shop_day_before !== false && !event.shopping_completed_at) {
      prompts.push({
        eventId: event.id,
        eventOccasion: occasion,
        eventDate: event.event_date,
        clientName,
        urgency: 'overdue',
        message: `Grocery shopping for ${occasion} was expected yesterday. Shopping today means less buffer for substitutions.`,
        action: 'Shopping needed',
        actionUrl: `/events/${event.id}`,
        daysUntilEvent: 0,
        category: 'shopping',
      })
    }
  }

  // Sort: overdue first, then actionable, then upcoming. Within same urgency, by days until event.
  const urgencyOrder = { overdue: 0, actionable: 1, upcoming: 2 }
  prompts.sort((a, b) => {
    const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
    if (urgencyDiff !== 0) return urgencyDiff
    return a.daysUntilEvent - b.daysUntilEvent
  })

  return prompts
}
