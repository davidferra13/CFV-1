// Default Operating Procedures Engine
// Defines WHEN standard actions should happen relative to an event.
// Pure computation - no DB calls.

import type {
  ChefPreferences,
  DOPSchedule,
  DOPTask,
  DOPPhase,
  DOPPhaseStatus,
  SchedulingEvent,
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

function dayBefore(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

function task(
  id: string,
  label: string,
  description: string,
  category: DOPTask['category'],
  isComplete: boolean,
  completedAt: string | null = null,
  deadline: string | null = null,
  dependsOn: string[] = []
): DOPTask {
  const isOverdue = deadline != null && !isComplete && new Date(deadline) < new Date()
  return {
    id,
    label,
    description,
    category,
    isComplete,
    completedAt,
    isOverdue,
    deadline,
    dependsOn,
  }
}

function derivePhaseStatus(tasks: DOPTask[], isFuture: boolean): DOPPhaseStatus {
  if (tasks.length === 0) return 'not_applicable'
  const allComplete = tasks.every((t) => t.isComplete)
  const anyOverdue = tasks.some((t) => t.isOverdue)
  if (allComplete) return 'complete'
  if (anyOverdue) return 'overdue'
  if (isFuture) return 'upcoming'
  return 'pending'
}

// ============================================
// DOP SCHEDULE GENERATOR
// ============================================

/**
 * Generate the full DOP schedule for an event.
 * Evaluates what should be done and what has been done.
 */
export function getDOPSchedule(event: SchedulingEvent, prefs: ChefPreferences | null): DOPSchedule {
  const leadDays = daysUntil(event.event_date)
  const isCompressed = leadDays < 2 // less than 48 hours notice
  const overrides: string[] = []
  const eventDateStr = event.event_date

  if (isCompressed) {
    overrides.push('Compressed timeline - less than 48 hours until event.')
  }

  // ---- AT BOOKING ----
  const atBookingTasks: DOPTask[] = [
    task(
      'doc_menu_sheet',
      'Generate menu sheet',
      'Menu sheet document ready for review and printing.',
      'documents',
      event.execution_sheet_ready
    ),
    task(
      'doc_grocery_list',
      'Generate grocery list',
      'Grocery list skeleton created from menu components.',
      'documents',
      event.grocery_list_ready
    ),
    task(
      'doc_prep_list',
      'Generate prep list',
      'Prep list with task ordering and time estimates.',
      'documents',
      event.prep_list_ready
    ),
    task(
      'doc_equipment_list',
      'Generate equipment list',
      'Equipment and tools needed for this event.',
      'documents',
      event.equipment_list_ready
    ),
    task(
      'doc_packing_list',
      'Generate packing list',
      'Complete packing list organized by category.',
      'documents',
      event.packing_list_ready
    ),
  ]

  const atBooking: DOPPhase = {
    tasks: atBookingTasks,
    status: derivePhaseStatus(atBookingTasks, false),
  }

  // ---- DAY BEFORE ----
  const dayBeforeDate = dayBefore(eventDateStr)
  const isDayBeforePast = daysUntil(dayBeforeDate) < 0
  const isDayBeforeToday = daysUntil(dayBeforeDate) === 0

  const dayBeforeTasks: DOPTask[] = []

  if (prefs?.shop_day_before !== false) {
    dayBeforeTasks.push(
      task(
        'shopping_complete',
        'Complete grocery shopping',
        'All ingredients purchased and in the house.',
        'shopping',
        event.shopping_completed_at != null,
        event.shopping_completed_at,
        dayBeforeDate + 'T20:00:00'
      )
    )
  }

  dayBeforeTasks.push(
    task(
      'early_prep',
      'Complete early prep items',
      'Doughs, marinades, purees, sauces - anything that holds overnight.',
      'prep',
      false, // No direct flag for this - chef tracks mentally
      null,
      dayBeforeDate + 'T22:00:00'
    )
  )

  const dayBeforePhase: DOPPhase = {
    date: dayBeforeDate,
    tasks: dayBeforeTasks,
    status:
      leadDays > 2
        ? derivePhaseStatus(dayBeforeTasks, !isDayBeforePast && !isDayBeforeToday)
        : isCompressed
          ? 'not_applicable'
          : derivePhaseStatus(dayBeforeTasks, !isDayBeforePast && !isDayBeforeToday),
  }

  // ---- MORNING OF ----
  const isEventToday = leadDays <= 0 && leadDays >= -1
  const isEventFuture = leadDays > 0

  const morningOfTasks: DOPTask[] = [
    task(
      'remaining_prep',
      'Complete remaining prep',
      'Portioning, assembly, texture-sensitive items.',
      'prep',
      event.prep_completed_at != null,
      event.prep_completed_at,
      eventDateStr + 'T14:00:00'
    ),
    task(
      'packing_complete',
      'Packing completed',
      'All items packed in coolers, bags, and car.',
      'packing',
      event.car_packed,
      event.car_packed ? null : null,
      eventDateStr + 'T15:00:00',
      ['remaining_prep']
    ),
    task(
      'review_schedule',
      'Review day-of schedule',
      'Check timeline, route, and non-negotiables.',
      'admin',
      event.timeline_ready,
      null,
      eventDateStr + 'T12:00:00'
    ),
  ]

  // If not shopping day before (or compressed), add morning shopping
  if (prefs?.shop_day_before === false || isCompressed) {
    morningOfTasks.unshift(
      task(
        'morning_shopping',
        'Grocery shopping',
        isCompressed
          ? 'Compressed timeline - shopping and prep run back to back.'
          : 'Shopping scheduled for morning of event.',
        'shopping',
        event.shopping_completed_at != null,
        event.shopping_completed_at,
        eventDateStr + 'T11:00:00'
      )
    )
  }

  const morningOf: DOPPhase = {
    date: eventDateStr,
    tasks: morningOfTasks,
    status: derivePhaseStatus(morningOfTasks, isEventFuture),
  }

  // ---- PRE-DEPARTURE ----
  const preDepartureTasks: DOPTask[] = [
    task(
      'non_negotiables',
      'Non-negotiables checklist completed',
      'All items on the non-negotiables list verified.',
      'packing',
      event.non_negotiables_checked,
      null,
      null,
      ['packing_complete']
    ),
    task(
      'final_cooler',
      'Final cooler pack',
      'Last items in cooler, ice packs verified.',
      'packing',
      false, // No direct flag
      null,
      null,
      ['packing_complete']
    ),
    task(
      'depart_on_time',
      'Depart at scheduled time',
      'Leave home at the time calculated in the timeline.',
      'admin',
      event.travel_time_minutes != null ? false : false,
      null,
      null,
      ['non_negotiables']
    ),
  ]

  const preDeparture: DOPPhase = {
    time: event.arrival_time ?? undefined,
    tasks: preDepartureTasks,
    status: derivePhaseStatus(preDepartureTasks, isEventFuture),
  }

  // ---- POST-SERVICE ----
  const postServiceTasks: DOPTask[] = [
    task(
      'equipment_breakdown',
      'Equipment breakdown and car cleared',
      'All equipment broken down, loaded, car cleared.',
      'reset',
      event.reset_complete,
      null
    ),
    task(
      'receipts_uploaded',
      'Receipts uploaded',
      'Upload all receipts from shopping within 24 hours.',
      'admin',
      event.financially_closed,
      null
    ),
    task(
      'follow_up_sent',
      'Client follow-up sent',
      'Thank-you message with specific reference to their event.',
      'admin',
      event.follow_up_sent,
      null
    ),
    task(
      'aar_filed',
      'Event Review filed',
      'Rate calm and preparation. Note what went well, what to improve.',
      'admin',
      event.aar_filed,
      null
    ),
  ]

  const isPostEvent = event.status === 'completed' || event.status === 'in_progress'
  const postService: DOPPhase = {
    tasks: postServiceTasks,
    status: isPostEvent ? derivePhaseStatus(postServiceTasks, false) : 'not_applicable',
  }

  return {
    eventId: event.id,
    eventDate: eventDateStr,
    leadTimeDays: leadDays,
    isCompressed,
    schedule: {
      atBooking: atBooking,
      dayBefore: dayBeforePhase,
      morningOf,
      preDeparture,
      postService,
    },
    overrides,
  }
}

/**
 * Count completed and total DOP tasks.
 */
export function getDOPProgress(schedule: DOPSchedule): { completed: number; total: number } {
  const allTasks = [
    ...schedule.schedule.atBooking.tasks,
    ...schedule.schedule.dayBefore.tasks,
    ...schedule.schedule.morningOf.tasks,
    ...schedule.schedule.preDeparture.tasks,
    ...schedule.schedule.postService.tasks,
  ]

  return {
    completed: allTasks.filter((t) => t.isComplete).length,
    total: allTasks.length,
  }
}
