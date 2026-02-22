'use server'

// DOP Task Digest
// Aggregates all outstanding DOP tasks across upcoming/recent events for the chef dashboard.
// Returns tasks grouped with event context so the chef can see what needs doing at a glance.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { getChefPreferences } from '@/lib/chef/actions'
import { getDOPSchedule } from './dop'
import type { DOPTaskCategory, SchedulingEvent, ChefPreferences } from './types'

// ============================================
// OUTPUT TYPES
// ============================================

export interface DigestTask {
  taskId: string
  taskLabel: string
  taskDescription: string
  taskCategory: DOPTaskCategory
  isOverdue: boolean
  deadline: string | null
  phase: string
  eventId: string
  eventOccasion: string | null
  eventDate: string
  clientName: string
  eventHref: string
  scheduleHref: string
}

export interface DOPTaskDigest {
  tasks: DigestTask[]
  overdueCount: number
  dueTodayCount: number
  upcomingCount: number
  totalIncomplete: number
}

// ============================================
// HELPERS
// ============================================

function mapEventToScheduling(event: any): SchedulingEvent {
  return {
    id: event.id,
    occasion: event.occasion,
    event_date: event.event_date,
    serve_time: event.serve_time ?? '18:00',
    arrival_time: event.arrival_time,
    travel_time_minutes: event.travel_time_minutes ?? null,
    guest_count: event.guest_count ?? 0,
    status: event.status,
    location_address: event.location_address,
    location_city: event.location_city,
    grocery_list_ready: event.grocery_list_ready ?? false,
    prep_list_ready: event.prep_list_ready ?? false,
    packing_list_ready: event.packing_list_ready ?? false,
    equipment_list_ready: event.equipment_list_ready ?? false,
    timeline_ready: event.timeline_ready ?? false,
    execution_sheet_ready: event.execution_sheet_ready ?? false,
    non_negotiables_checked: event.non_negotiables_checked ?? false,
    car_packed: event.car_packed ?? false,
    shopping_completed_at: event.shopping_completed_at,
    prep_completed_at: event.prep_completed_at,
    aar_filed: event.aar_filed ?? false,
    reset_complete: event.reset_complete ?? false,
    follow_up_sent: event.follow_up_sent ?? false,
    financially_closed: event.financially_closed ?? false,
    client: event.client as { full_name: string } | null,
  }
}

const PHASE_LABELS: Record<string, string> = {
  atBooking: 'At Booking',
  dayBefore: 'Day Before',
  morningOf: 'Morning Of',
  preDeparture: 'Pre-Departure',
  postService: 'Post-Service',
}

// ============================================
// SERVER ACTION
// ============================================

/**
 * Get all outstanding DOP tasks across upcoming and recently-completed events.
 * Covers: last 7 days (for post-service tasks) + all future non-cancelled events.
 */
export async function getDOPTaskDigest(): Promise<DOPTaskDigest> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Events from 7 days ago to any future date, excluding cancelled
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

  const { data: events } = await supabase
    .from('events')
    .select(
      `
      id, occasion, event_date, serve_time, arrival_time,
      guest_count, status,
      location_address, location_city,
      grocery_list_ready, prep_list_ready, packing_list_ready,
      equipment_list_ready, timeline_ready, execution_sheet_ready,
      non_negotiables_checked, car_packed,
      shopping_completed_at, prep_completed_at,
      aar_filed, reset_complete, follow_up_sent, financially_closed,
      client:clients(full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .neq('status', 'cancelled')
    .gte('event_date', sevenDaysAgoStr)
    .order('event_date', { ascending: true })
    .limit(20)

  if (!events || events.length === 0) {
    return { tasks: [], overdueCount: 0, dueTodayCount: 0, upcomingCount: 0, totalIncomplete: 0 }
  }

  // Chef preferences for DOP computation (shop_day_before, etc.)
  const prefs = (await getChefPreferences().catch(() => null)) as ChefPreferences | null

  // Fetch all manual completions for these events in one query
  const eventIds = events.map((e: any) => e.id)
  const { data: completionRows } = await supabase
    .from('dop_task_completions')
    .select('event_id, task_key')
    .eq('tenant_id', user.tenantId!)
    .in('event_id', eventIds)

  // Build a map: eventId → Set<taskKey>
  const completionMap = new Map<string, Set<string>>()
  for (const row of completionRows ?? []) {
    if (!completionMap.has(row.event_id)) {
      completionMap.set(row.event_id, new Set())
    }
    completionMap.get(row.event_id)!.add(row.task_key)
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const allTasks: DigestTask[] = []

  for (const event of events) {
    const schedulingEvent = mapEventToScheduling(event)
    const manualCompletions = completionMap.get(event.id) ?? new Set<string>()
    const schedule = getDOPSchedule(schedulingEvent, prefs)
    const clientName = (event.client as any)?.full_name ?? 'Unknown Client'

    for (const [phaseName, phase] of Object.entries(schedule.schedule)) {
      if (phase.status === 'not_applicable') continue

      for (const task of phase.tasks) {
        // Complete if DOP engine says so, OR manually marked
        const isComplete = task.isComplete || manualCompletions.has(task.id)
        if (isComplete) continue

        const isOverdue =
          task.isOverdue || (task.deadline != null && new Date(task.deadline) < new Date())

        allTasks.push({
          taskId: task.id,
          taskLabel: task.label,
          taskDescription: task.description,
          taskCategory: task.category,
          isOverdue,
          deadline: task.deadline,
          phase: PHASE_LABELS[phaseName] ?? phaseName,
          eventId: event.id,
          eventOccasion: event.occasion,
          eventDate: event.event_date,
          clientName,
          eventHref: `/events/${event.id}`,
          scheduleHref: `/events/${event.id}/schedule`,
        })
      }
    }
  }

  // Sort: overdue first, then by event date ascending
  allTasks.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1
    if (!a.isOverdue && b.isOverdue) return 1
    return a.eventDate.localeCompare(b.eventDate)
  })

  const overdueCount = allTasks.filter((t) => t.isOverdue).length
  const dueTodayCount = allTasks.filter(
    (t) => !t.isOverdue && t.deadline?.startsWith(todayStr)
  ).length
  const upcomingCount = allTasks.length - overdueCount - dueTodayCount

  return {
    tasks: allTasks,
    overdueCount,
    dueTodayCount,
    upcomingCount,
    totalIncomplete: allTasks.length,
  }
}
