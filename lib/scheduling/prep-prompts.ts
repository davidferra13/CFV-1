// Progressive Preparation Prompts
// Time-aware nudges that surface BEFORE the chef is under pressure.
// Pure computation - no DB calls.
// When prep timeline data is available, uses real component names + computed prep days.

import type { PrepPrompt, SchedulingEvent, ChefPreferences } from './types'
import type { PrepTimeline } from '@/lib/prep-timeline/compute-timeline'
import { daysUntilDate } from '@/lib/utils/format'
import { format } from 'date-fns'

/** Get component names scheduled for a specific day offset from the timeline */
function getComponentsForDay(timeline: PrepTimeline, daysBeforeService: number): string[] {
  const day = timeline.days.find((d) => d.daysBeforeService === daysBeforeService)
  if (!day || day.items.length === 0) return []
  return day.items.map((item) => item.recipeName)
}

/** Get the earliest prep day (most days before service) that has items */
function getEarliestPrepDay(timeline: PrepTimeline): number | null {
  for (const day of timeline.days) {
    if (day.items.length > 0 && !day.isServiceDay) return day.daysBeforeService
  }
  return null
}

/** Format a list of component names for display (max 4, then "+N more") */
function formatComponentList(names: string[]): string {
  if (names.length === 0) return ''
  if (names.length <= 4) return names.join(', ')
  return names.slice(0, 3).join(', ') + ` +${names.length - 3} more`
}

// ============================================
// PROMPT GENERATOR
// ============================================

/**
 * Scan events and return time-aware prep prompts.
 * These are visibility - not guilt trips. Factual tone.
 * When timelineMap is provided, uses real component names and computed prep days.
 */
export function getActivePrompts(
  events: SchedulingEvent[],
  prefs: ChefPreferences | null,
  timelineMap?: Record<string, PrepTimeline>
): PrepPrompt[] {
  const prompts: PrepPrompt[] = []

  for (const event of events) {
    // Only active events (not cancelled, not completed)
    if (event.status === 'cancelled' || event.status === 'completed') continue

    const days = daysUntilDate(event.event_date)
    if (days < -1) continue // Past events

    const clientName = event.client?.full_name ?? 'Unknown Client'
    const occasion = event.occasion ?? 'Event'
    const timeline = timelineMap?.[event.id] ?? null

    // ---- TIMELINE-DRIVEN PREP PROMPTS ----
    // When we have timeline data, generate prompts based on real computed prep days
    if (timeline) {
      // Grocery deadline prompt
      if (timeline.groceryDeadline && !event.shopping_completed_at) {
        const groceryDaysUntil = daysUntilDate(format(timeline.groceryDeadline, 'yyyy-MM-dd'))
        if (groceryDaysUntil === 0) {
          prompts.push({
            eventId: event.id,
            eventOccasion: occasion,
            eventDate: event.event_date,
            clientName,
            urgency: 'actionable',
            message: `Grocery deadline for ${occasion} is today.`,
            action: 'View grocery list',
            actionUrl: `/events/${event.id}?tab=prep`,
            daysUntilEvent: days,
            category: 'shopping',
          })
        } else if (groceryDaysUntil === 1) {
          prompts.push({
            eventId: event.id,
            eventOccasion: occasion,
            eventDate: event.event_date,
            clientName,
            urgency: 'upcoming',
            message: `Shop by tomorrow for ${occasion}.`,
            action: 'View grocery list',
            actionUrl: `/events/${event.id}?tab=prep`,
            daysUntilEvent: days,
            category: 'shopping',
          })
        } else if (groceryDaysUntil < 0 && !event.shopping_completed_at) {
          prompts.push({
            eventId: event.id,
            eventOccasion: occasion,
            eventDate: event.event_date,
            clientName,
            urgency: 'overdue',
            message: `Grocery deadline for ${occasion} was ${Math.abs(groceryDaysUntil)} day${Math.abs(groceryDaysUntil) !== 1 ? 's' : ''} ago.`,
            action: 'Shopping needed',
            actionUrl: `/events/${event.id}?tab=prep`,
            daysUntilEvent: days,
            category: 'shopping',
          })
        }
      }

      // Per-day prep prompts based on real component names
      for (const day of timeline.days) {
        if (day.items.length === 0 || day.isServiceDay) continue

        const dayDaysUntil = daysUntilDate(format(day.date, 'yyyy-MM-dd'))
        const componentNames = day.items.map((i) => i.recipeName)

        if (dayDaysUntil === 0) {
          // Today: specific actionable prompt
          prompts.push({
            eventId: event.id,
            eventOccasion: occasion,
            eventDate: event.event_date,
            clientName,
            urgency: 'actionable',
            message: `Start today for ${occasion}: ${formatComponentList(componentNames)}.`,
            action: 'View prep timeline',
            actionUrl: `/events/${event.id}?tab=prep`,
            daysUntilEvent: days,
            category: 'prep',
            components: componentNames,
          })
        } else if (dayDaysUntil === 1) {
          // Tomorrow
          prompts.push({
            eventId: event.id,
            eventOccasion: occasion,
            eventDate: event.event_date,
            clientName,
            urgency: 'upcoming',
            message: `Prep tomorrow for ${occasion}: ${formatComponentList(componentNames)}.`,
            action: 'View prep timeline',
            actionUrl: `/events/${event.id}?tab=prep`,
            daysUntilEvent: days,
            category: 'prep',
            components: componentNames,
          })
        } else if (dayDaysUntil < 0) {
          // Overdue prep day
          prompts.push({
            eventId: event.id,
            eventOccasion: occasion,
            eventDate: event.event_date,
            clientName,
            urgency: 'overdue',
            message: `Prep was scheduled ${Math.abs(dayDaysUntil)} day${Math.abs(dayDaysUntil) !== 1 ? 's' : ''} ago for ${occasion}: ${formatComponentList(componentNames)}.`,
            action: 'View prep timeline',
            actionUrl: `/events/${event.id}?tab=prep`,
            daysUntilEvent: days,
            category: 'prep',
            components: componentNames,
          })
        }
      }

      // Service day components (day-of items from timeline)
      const serviceDayItems = timeline.days.find((d) => d.isServiceDay)?.items ?? []
      if (serviceDayItems.length > 0 && days === 0) {
        const serviceNames = serviceDayItems.map((i) => i.recipeName)
        prompts.push({
          eventId: event.id,
          eventOccasion: occasion,
          eventDate: event.event_date,
          clientName,
          urgency: 'actionable',
          message: `Day-of prep for ${occasion}: ${formatComponentList(serviceNames)}.`,
          action: 'View prep timeline',
          actionUrl: `/events/${event.id}?tab=prep`,
          daysUntilEvent: 0,
          category: 'prep',
          components: serviceNames,
        })
      }

      // Untimed items nudge (BH14): encourage setting peak windows
      if (timeline.untimedItems.length > 0 && days >= 2) {
        prompts.push({
          eventId: event.id,
          eventOccasion: occasion,
          eventDate: event.event_date,
          clientName,
          urgency: 'upcoming',
          message: `${timeline.untimedItems.length} component${timeline.untimedItems.length !== 1 ? 's' : ''} for ${occasion} need freshness windows for smarter prep timing.`,
          action: 'Set peak windows',
          actionUrl: `/events/${event.id}?tab=prep`,
          daysUntilEvent: days,
          category: 'prep',
        })
      }
    }

    // ---- FALLBACK: NON-TIMELINE PROMPTS ----
    // These fire when no timeline data exists, or for non-prep concerns

    // ---- 5+ DAYS BEFORE ----
    if (days >= 5) {
      if (event.grocery_list_ready && !event.shopping_completed_at && !timeline?.groceryDeadline) {
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
          message: `Menu is confirmed, all documents ready to review for ${occasion}.`,
          action: 'Review documents',
          actionUrl: `/events/${event.id}`,
          daysUntilEvent: days,
          category: 'documents',
        })
      }
    }

    // ---- 48 HOURS (2 DAYS) BEFORE ----
    // Only show hardcoded prep prompt if we have NO timeline data
    if (days === 2 && !timeline) {
      // No timeline = no real component names. Show generic prep nudge.
      prompts.push({
        eventId: event.id,
        eventOccasion: occasion,
        eventDate: event.event_date,
        clientName,
        urgency: 'actionable',
        message: `Prep day for ${occasion}. Check your prep list for make-ahead items.`,
        action: 'View prep list',
        actionUrl: `/events/${event.id}?tab=prep`,
        daysUntilEvent: days,
        category: 'prep',
      })
    }

    // Shopping fallback (only when no timeline grocery deadline is driving prompts)
    if (days === 2 && !timeline?.groceryDeadline) {
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

      if (
        !timeline?.groceryDeadline &&
        prefs?.shop_day_before !== false &&
        !event.shopping_completed_at
      ) {
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

    // Shopping was expected yesterday but not done (fallback only)
    if (
      days === 0 &&
      !timeline?.groceryDeadline &&
      prefs?.shop_day_before !== false &&
      !event.shopping_completed_at
    ) {
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
