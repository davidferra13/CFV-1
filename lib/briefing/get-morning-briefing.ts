// Morning Briefing Data Aggregator (Phase 3 + Phase 6)
// Single function that fetches everything the owner needs to see in 60 seconds.
// 100% deterministic (Formula > AI). No Ollama calls.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getCarriedOverTasks, type CarriedTask } from '@/lib/tasks/carry-forward'
import { getShiftNotes, type ShiftNote } from '@/lib/shifts/actions'

// ============================================
// TYPES
// ============================================

export type BriefingEvent = {
  id: string
  title: string
  client_name: string | null
  event_date: string
  start_time: string | null
  end_time: string | null
  guest_count: number | null
  venue: string | null
  status: string
  dietary_notes: string | null
  staff_count: number
  prep_tasks_total: number
  prep_tasks_done: number
}

export type BriefingTask = {
  id: string
  title: string
  priority: string
  status: string
  due_time: string | null
  assigned_to: string | null
  staff_name: string | null
}

export type StaffOnDuty = {
  id: string
  name: string
  role: string
  station_name: string | null
  tasks_assigned: number
  tasks_done: number
}

export type BriefingAlert = {
  type:
    | 'overdue_task'
    | 'unanswered_inquiry'
    | 'stale_followup'
    | 'payment_due'
    | '86d'
    | 'expiring'
    | 'low_stock'
  title: string
  detail: string
  href: string
  severity: 'critical' | 'high' | 'medium'
}

export type YesterdayRecap = {
  eventsCompleted: number
  eventNames: string[]
  revenueCents: number
  tasksCompleted: number
  tasksMissed: number
  inquiriesReceived: number
  expensesLogged: number
  wasteEntries: number
}

export type MorningBriefing = {
  today: string
  shiftLabel: string
  // Section A: Yesterday's Recap
  yesterdayRecap: YesterdayRecap
  // Section B: Shift Handoff Notes
  shiftNotes: {
    todayNotes: ShiftNote[]
    pinnedNotes: ShiftNote[]
    yesterdayClosingNotes: ShiftNote[]
  }
  // Section C: Today's Events
  todayEvents: BriefingEvent[]
  // Section D: Today's Tasks + Carried Over
  todayTasks: BriefingTask[]
  carriedOverTasks: CarriedTask[]
  // Section E: Staff Schedule
  staffOnDuty: StaffOnDuty[]
  // Section F: Alerts
  alerts: BriefingAlert[]
  // Prep timers completing today
  prepTimersToday: {
    id: string
    title: string
    end_at: string
    station_name: string | null
    event_title: string | null
    status: string
  }[]
}

// ============================================
// MAIN BRIEFING FUNCTION
// ============================================

export async function getMorningBriefing(): Promise<MorningBriefing> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const hour = new Date().getHours()
  const shiftLabel = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'

  // Fetch everything in parallel
  const [
    shiftNotes,
    carriedOverTasks,
    todayEventsResult,
    todayTasksResult,
    staffResult,
    // Yesterday's recap queries
    yesterdayEventsResult,
    yesterdayTasksDoneResult,
    yesterdayTasksMissedResult,
    yesterdayInquiriesResult,
    yesterdayExpensesResult,
    // Alerts
    unansweredInquiriesResult,
    staleFollowupsResult,
    // Prep timers
    prepTimersResult,
  ] = await Promise.all([
    getShiftNotes(today),
    getCarriedOverTasks(today),
    // Today's events
    db
      .from('events')
      .select(
        'id, title, event_date, start_time, end_time, guest_count, venue, status, dietary_notes, client_id'
      )
      .eq('chef_id', tenantId)
      .eq('event_date', today)
      .in('status', ['confirmed', 'paid', 'in_progress', 'accepted'])
      .order('start_time', { ascending: true, nullsFirst: false }),
    // Today's tasks
    db
      .from('tasks')
      .select(
        'id, title, priority, status, due_time, assigned_to, staff_member:staff_members!tasks_assigned_to_fkey(id, name)'
      )
      .eq('chef_id', tenantId)
      .eq('due_date', today)
      .order('due_time', { ascending: true, nullsFirst: false })
      .order('priority', { ascending: false }),
    // Staff members
    db
      .from('staff_members')
      .select('id, name, role')
      .eq('chef_id', tenantId)
      .eq('status', 'active')
      .order('name'),
    // Yesterday's completed events
    db
      .from('events')
      .select('id, title')
      .eq('chef_id', tenantId)
      .eq('event_date', yesterdayStr)
      .eq('status', 'completed'),
    // Yesterday's completed tasks
    db
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', tenantId)
      .eq('due_date', yesterdayStr)
      .eq('status', 'done'),
    // Yesterday's missed tasks (not done)
    db
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', tenantId)
      .eq('due_date', yesterdayStr)
      .in('status', ['pending', 'in_progress']),
    // Yesterday's inquiries
    db
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', tenantId)
      .gte('created_at', yesterdayStr + 'T00:00:00')
      .lt('created_at', today + 'T00:00:00'),
    // Yesterday's expenses
    db
      .from('expenses')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', tenantId)
      .gte('created_at', yesterdayStr + 'T00:00:00')
      .lt('created_at', today + 'T00:00:00'),
    // Unanswered inquiries (open, no response in 24h+)
    db
      .from('inquiries')
      .select('id, client_name, occasion, created_at')
      .eq('chef_id', tenantId)
      .eq('status', 'new')
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(10),
    // Stale follow-ups (3+ days quiet)
    db
      .from('inquiries')
      .select('id, client_name, occasion, updated_at')
      .eq('chef_id', tenantId)
      .in('status', ['new', 'contacted', 'follow_up'])
      .lt('updated_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
      .limit(10),
    // Prep timers completing today
    db
      .from('prep_timeline')
      .select('id, title, end_at, status, station:stations(name), event:events(title)')
      .eq('chef_id', tenantId)
      .eq('status', 'active')
      .gte('end_at', today + 'T00:00:00')
      .lt(
        'end_at',
        new Date(new Date(today + 'T00:00:00').getTime() + 24 * 60 * 60 * 1000).toISOString()
      ),
  ])

  // Build today's events with client names and staff counts
  const todayEvents: BriefingEvent[] = []
  const eventIds = (todayEventsResult.data ?? []).map((e: any) => e.id)

  // Get client names and staff counts for today's events
  let clientMap: Record<string, string> = {}
  let eventStaffCounts: Record<string, number> = {}
  let eventPrepCounts: Record<string, { total: number; done: number }> = {}

  if (eventIds.length > 0) {
    const [clientsResult, staffCountResult, prepCountResult] = await Promise.all([
      db
        .from('clients')
        .select('id, name')
        .in('id', (todayEventsResult.data ?? []).map((e: any) => e.client_id).filter(Boolean)),
      db.from('event_staff').select('event_id').in('event_id', eventIds),
      db
        .from('tasks')
        .select('id, status')
        .eq('chef_id', tenantId)
        .eq('due_date', today)
        .in('station_id', eventIds), // tasks linked to events via station
    ])

    for (const c of clientsResult.data ?? []) {
      clientMap[c.id] = c.name
    }
    for (const s of staffCountResult.data ?? []) {
      eventStaffCounts[s.event_id] = (eventStaffCounts[s.event_id] ?? 0) + 1
    }
  }

  for (const event of todayEventsResult.data ?? []) {
    todayEvents.push({
      id: event.id,
      title: event.title ?? 'Untitled Event',
      client_name: event.client_id ? (clientMap[event.client_id] ?? null) : null,
      event_date: event.event_date,
      start_time: event.start_time,
      end_time: event.end_time,
      guest_count: event.guest_count,
      venue: event.venue,
      status: event.status,
      dietary_notes: event.dietary_notes,
      staff_count: eventStaffCounts[event.id] ?? 0,
      prep_tasks_total: 0,
      prep_tasks_done: 0,
    })
  }

  // Build today's tasks
  const todayTasks: BriefingTask[] = ((todayTasksResult.data ?? []) as any[]).map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    status: t.status,
    due_time: t.due_time,
    assigned_to: t.assigned_to,
    staff_name: t.staff_member?.name ?? null,
  }))

  // Build staff on duty (staff with tasks today or event assignments)
  const staffList = (staffResult.data ?? []) as any[]
  const staffOnDuty: StaffOnDuty[] = staffList
    .map((s) => {
      const staffTasks = todayTasks.filter((t) => t.assigned_to === s.id)
      return {
        id: s.id,
        name: s.name,
        role: s.role,
        station_name: null,
        tasks_assigned: staffTasks.length,
        tasks_done: staffTasks.filter((t) => t.status === 'done').length,
      }
    })
    .filter((s) => s.tasks_assigned > 0) // Only show staff with tasks today

  // Build alerts
  const alerts: BriefingAlert[] = []

  // Overdue tasks
  if (carriedOverTasks.length > 0) {
    alerts.push({
      type: 'overdue_task',
      title: `${carriedOverTasks.length} overdue task${carriedOverTasks.length !== 1 ? 's' : ''}`,
      detail: carriedOverTasks
        .slice(0, 3)
        .map((t) => t.title)
        .join(', '),
      href: '/tasks',
      severity: 'high',
    })
  }

  // Unanswered inquiries (24h+)
  const unanswered = unansweredInquiriesResult.data ?? []
  if (unanswered.length > 0) {
    alerts.push({
      type: 'unanswered_inquiry',
      title: `${unanswered.length} unanswered inquir${unanswered.length !== 1 ? 'ies' : 'y'}`,
      detail: unanswered
        .slice(0, 3)
        .map((i: any) => i.client_name ?? 'Unknown')
        .join(', '),
      href: '/inquiries?status=new',
      severity: 'critical',
    })
  }

  // Stale follow-ups (3+ days)
  const stale = staleFollowupsResult.data ?? []
  if (stale.length > 0) {
    alerts.push({
      type: 'stale_followup',
      title: `${stale.length} stale follow-up${stale.length !== 1 ? 's' : ''}`,
      detail: stale
        .slice(0, 3)
        .map((i: any) => i.client_name ?? 'Unknown')
        .join(', '),
      href: '/inquiries',
      severity: 'medium',
    })
  }

  // Yesterday's recap
  const yesterdayEvents = yesterdayEventsResult.data ?? []
  const yesterdayRecap: YesterdayRecap = {
    eventsCompleted: yesterdayEvents.length,
    eventNames: yesterdayEvents.map((e: any) => e.title ?? 'Untitled'),
    revenueCents: 0, // Would need ledger query, keeping simple for now
    tasksCompleted: yesterdayTasksDoneResult.count ?? 0,
    tasksMissed: yesterdayTasksMissedResult.count ?? 0,
    inquiriesReceived: yesterdayInquiriesResult.count ?? 0,
    expensesLogged: yesterdayExpensesResult.count ?? 0,
    wasteEntries: 0,
  }

  // Prep timers
  const prepTimersToday = ((prepTimersResult.data ?? []) as any[]).map((p) => ({
    id: p.id,
    title: p.title,
    end_at: p.end_at,
    station_name: p.station?.name ?? null,
    event_title: p.event?.title ?? null,
    status: p.status,
  }))

  return {
    today,
    shiftLabel,
    yesterdayRecap,
    shiftNotes,
    todayEvents,
    todayTasks,
    carriedOverTasks,
    staffOnDuty,
    alerts,
    prepTimersToday,
  }
}
