'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

export type EventDayPhase = 'arrival' | 'setup' | 'prep' | 'service' | 'breakdown' | 'depart'

export type PhaseChecklistItem = {
  id: string
  phase: EventDayPhase
  label: string
  completed: boolean
  completedAt: string | null
  sortOrder: number
}

export type ServiceIssue = {
  id: string
  eventId: string
  description: string
  severity: 'low' | 'medium' | 'high'
  resolvedAt: string | null
  createdAt: string
}

export type StaffAssignment = {
  staffId: string
  staffName: string
  stationId: string | null
  stationName: string | null
  role: string | null
}

export type EventDayDashboard = {
  event: {
    id: string
    occasion: string | null
    eventDate: string
    serveTime: string | null
    guestCount: number
    status: string
    clientName: string | null
  }
  phases: {
    phase: EventDayPhase
    label: string
    startedAt: string | null
    completedAt: string | null
    status: 'pending' | 'active' | 'completed'
  }[]
  checklist: PhaseChecklistItem[]
  staffAssignments: StaffAssignment[]
  issues: ServiceIssue[]
  stationGroups: Array<{
    stationId: string
    stationName: string
    dishes: Array<{ id: string; name: string; courseNumber: number }>
    totalEstimatedMinutes: number
  }>
}

const PHASE_CONFIG: { phase: EventDayPhase; label: string; startCol: string; endCol: string }[] = [
  {
    phase: 'arrival',
    label: 'Arrival',
    startCol: 'travel_started_at',
    endCol: 'travel_completed_at',
  },
  {
    phase: 'setup',
    label: 'Setup',
    startCol: 'shopping_started_at',
    endCol: 'shopping_completed_at',
  },
  { phase: 'prep', label: 'Prep', startCol: 'prep_started_at', endCol: 'prep_completed_at' },
  {
    phase: 'service',
    label: 'Service',
    startCol: 'service_started_at',
    endCol: 'service_completed_at',
  },
  {
    phase: 'breakdown',
    label: 'Breakdown',
    startCol: 'reset_started_at',
    endCol: 'reset_completed_at',
  },
  {
    phase: 'depart',
    label: 'Depart',
    startCol: 'travel_completed_at',
    endCol: 'travel_completed_at',
  },
]

/**
 * Get full event day dashboard data.
 */
export async function getEventDayDashboard(eventId: string): Promise<EventDayDashboard | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch event with all timestamp columns
  const { data: event } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, serve_time, guest_count, status,
      travel_started_at, travel_completed_at,
      shopping_started_at, shopping_completed_at,
      prep_started_at, prep_completed_at,
      service_started_at, service_completed_at,
      reset_started_at, reset_completed_at,
      client:clients(full_name)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .maybeSingle()

  if (!event) return null

  // Build phase data from event timestamps
  const phases = PHASE_CONFIG.map((config) => {
    const startedAt = event[config.startCol] ?? null
    const completedAt = event[config.endCol] ?? null
    let status: 'pending' | 'active' | 'completed' = 'pending'
    if (completedAt) status = 'completed'
    else if (startedAt) status = 'active'
    return {
      phase: config.phase,
      label: config.label,
      startedAt,
      completedAt,
      status,
    }
  })

  // Fetch checklist items for this event (from event_checklists table if exists, otherwise generate defaults)
  let checklist: PhaseChecklistItem[] = []
  try {
    const { data: checklistRows } = await db
      .from('event_checklists')
      .select('*')
      .eq('event_id', eventId)
      .eq('chef_id', user.tenantId!)
      .order('sort_order')

    if (checklistRows?.length) {
      checklist = checklistRows.map((row: any) => ({
        id: row.id,
        phase: row.phase as EventDayPhase,
        label: row.label,
        completed: row.completed ?? false,
        completedAt: row.completed_at ?? null,
        sortOrder: row.sort_order ?? 0,
      }))
    }
  } catch {
    // Table may not exist yet, use empty checklist
  }

  // If no checklist exists, generate default items
  if (checklist.length === 0) {
    const defaults: { phase: EventDayPhase; items: string[] }[] = [
      { phase: 'arrival', items: ['Arrive at venue', 'Unload equipment', 'Meet venue contact'] },
      {
        phase: 'setup',
        items: ['Set up kitchen station', 'Check equipment', 'Review menu with staff'],
      },
      { phase: 'prep', items: ['Mise en place', 'Prep cold items', 'Start sauces/stocks'] },
      {
        phase: 'service',
        items: ['Final plating check', 'Fire first course', 'Monitor course pacing'],
      },
      { phase: 'breakdown', items: ['Pack equipment', 'Clean kitchen area', 'Inventory check'] },
      { phase: 'depart', items: ['Final walkthrough', 'Thank venue staff', 'Load vehicle'] },
    ]
    let sortOrder = 0
    checklist = defaults.flatMap(({ phase, items }) =>
      items.map((label) => ({
        id: `default-${phase}-${sortOrder}`,
        phase,
        label,
        completed: false,
        completedAt: null,
        sortOrder: sortOrder++,
      }))
    )
  }

  // Fetch staff assignments
  let staffAssignments: StaffAssignment[] = []
  try {
    const { data: staffRows } = await db
      .from('event_staff')
      .select('staff_members(id, name), station_id, stations(name), role')
      .eq('event_id', eventId)
      .eq('chef_id', user.tenantId!)

    staffAssignments = (staffRows ?? []).map((row: any) => ({
      staffId: row.staff_members?.id ?? '',
      staffName: row.staff_members?.name ?? 'Unknown',
      stationId: row.station_id,
      stationName: row.stations?.name ?? null,
      role: row.role ?? null,
    }))
  } catch {
    // event_staff table may not exist
  }

  // Fetch issues from ops log
  let issues: ServiceIssue[] = []
  try {
    const { data: logEntries } = await db
      .from('ops_log_entries')
      .select('id, description, severity, resolved_at, created_at')
      .eq('chef_id', user.tenantId!)
      .eq('action_type', 'service_issue')
      .order('created_at', { ascending: false })
      .limit(20)

    issues = (logEntries ?? []).map((row: any) => ({
      id: row.id,
      eventId,
      description: row.description,
      severity: row.severity ?? 'medium',
      resolvedAt: row.resolved_at ?? null,
      createdAt: row.created_at,
    }))
  } catch {
    // ops_log_entries may not have these columns
  }

  // Fetch station assignments for this event
  let stationGroups: EventDayDashboard['stationGroups'] = []
  try {
    const { data: assignments } = await db
      .from('event_station_dishes')
      .select(
        'station_id, stations(id, name), dish_id, dishes(id, name, course_number), estimated_minutes'
      )
      .eq('event_id', eventId)
      .eq('chef_id', user.tenantId!)

    // Group by station
    const groupMap = new Map<string, EventDayDashboard['stationGroups'][0]>()
    for (const a of assignments ?? []) {
      const key = a.station_id
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          stationId: a.stations?.id ?? key,
          stationName: a.stations?.name ?? 'Unknown',
          dishes: [],
          totalEstimatedMinutes: 0,
        })
      }
      const group = groupMap.get(key)!
      group.dishes.push({
        id: a.dish_id,
        name: a.dishes?.name ?? 'Unknown',
        courseNumber: a.dishes?.course_number ?? 0,
      })
      group.totalEstimatedMinutes += a.estimated_minutes ?? 0
    }
    stationGroups = Array.from(groupMap.values())
  } catch {
    // Best effort
  }

  return {
    event: {
      id: event.id,
      occasion: event.occasion,
      eventDate: event.event_date,
      serveTime: event.serve_time,
      guestCount: event.guest_count,
      status: event.status,
      clientName: event.client?.full_name ?? null,
    },
    phases,
    checklist,
    staffAssignments,
    issues,
    stationGroups,
  }
}

/**
 * Log a service issue.
 */
export async function logServiceIssue(input: {
  eventId: string
  description: string
  severity: 'low' | 'medium' | 'high'
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  try {
    await db.from('ops_log_entries').insert({
      chef_id: user.tenantId!,
      action_type: 'service_issue',
      description: input.description,
      severity: input.severity,
      metadata: { eventId: input.eventId },
    })
    revalidatePath(`/events/${input.eventId}/ops`)
    return { success: true }
  } catch (error) {
    console.error('[logServiceIssue] Error:', error)
    return { success: false, error: 'Failed to log issue' }
  }
}

/**
 * Toggle a checklist item.
 */
export async function toggleChecklistItem(input: {
  eventId: string
  itemId: string
  completed: boolean
}): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()

  try {
    // For default items (id starts with 'default-'), create a record
    if (input.itemId.startsWith('default-')) {
      // Store completion in a generic completions table or ops log
      await db.from('ops_log_entries').insert({
        chef_id: user.tenantId!,
        action_type: 'checklist_toggle',
        description: input.itemId,
        metadata: { eventId: input.eventId, completed: input.completed },
      })
    } else {
      await db
        .from('event_checklists')
        .update({
          completed: input.completed,
          completed_at: input.completed ? new Date().toISOString() : null,
        })
        .eq('id', input.itemId)
        .eq('chef_id', user.tenantId!)
    }
    revalidatePath(`/events/${input.eventId}/ops`)
    return { success: true }
  } catch {
    return { success: false }
  }
}
