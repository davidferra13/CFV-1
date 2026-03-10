// Morning Briefing Data Aggregator (Phase 3 + Phase 6)
// Single function that fetches everything the owner needs to see in 60 seconds.
// 100% deterministic (Formula > AI). No Ollama calls.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { getCarriedOverTasks, type CarriedTask } from '@/lib/tasks/carry-forward'
import { getShiftNotes, type ShiftNote } from '@/lib/shifts/actions'
import { getUpcomingMilestones, type UpcomingMilestone } from '@/lib/loyalty/auto-rewards'

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
  // Section G: Overdue Payments
  overduePayments: {
    event_id: string
    client_name: string
    occasion: string
    amount_cents: number
    days_past_due: number
  }[]
  // Section H: Pending Inquiries
  pendingInquiries: {
    id: string
    client_name: string
    occasion: string | null
    days_waiting: number
    lead_score: number | null
  }[]
  // Section I: Unsigned Proposals
  unsignedProposals: {
    event_id: string
    client_name: string
    occasion: string | null
    days_since_sent: number
  }[]
  // Section J: Upcoming Milestones
  upcomingMilestones: UpcomingMilestone[]
  // Section K: Week Ahead
  weekAhead: { date: string; day_label: string; event_count: number }[]
}

// ============================================
// MAIN BRIEFING FUNCTION
// ============================================

export async function getMorningBriefing(): Promise<MorningBriefing> {
  const user = await requireChef()
  const supabase: any = createServerClient()
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
    // New sections
    overduePaymentsResult,
    pendingInquiriesResult,
    unsignedProposalsResult,
    weekAheadEventsResult,
    upcomingMilestonesResult,
  ] = await Promise.all([
    getShiftNotes(today),
    getCarriedOverTasks(today),
    // Today's events
    supabase
      .from('events')
      .select(
        'id, title, event_date, start_time, end_time, guest_count, venue, status, dietary_notes, client_id'
      )
      .eq('chef_id', tenantId)
      .eq('event_date', today)
      .in('status', ['confirmed', 'paid', 'in_progress', 'accepted'])
      .order('start_time', { ascending: true, nullsFirst: false }),
    // Today's tasks
    supabase
      .from('tasks')
      .select(
        'id, title, priority, status, due_time, assigned_to, staff_member:staff_members!tasks_assigned_to_fkey(id, name)'
      )
      .eq('chef_id', tenantId)
      .eq('due_date', today)
      .order('due_time', { ascending: true, nullsFirst: false })
      .order('priority', { ascending: false }),
    // Staff members
    supabase
      .from('staff_members')
      .select('id, name, role')
      .eq('chef_id', tenantId)
      .eq('status', 'active')
      .order('name'),
    // Yesterday's completed events
    supabase
      .from('events')
      .select('id, title')
      .eq('chef_id', tenantId)
      .eq('event_date', yesterdayStr)
      .eq('status', 'completed'),
    // Yesterday's completed tasks
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', tenantId)
      .eq('due_date', yesterdayStr)
      .eq('status', 'done'),
    // Yesterday's missed tasks (not done)
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', tenantId)
      .eq('due_date', yesterdayStr)
      .in('status', ['pending', 'in_progress']),
    // Yesterday's inquiries
    supabase
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', tenantId)
      .gte('created_at', yesterdayStr + 'T00:00:00')
      .lt('created_at', today + 'T00:00:00'),
    // Yesterday's expenses
    supabase
      .from('expenses')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', tenantId)
      .gte('created_at', yesterdayStr + 'T00:00:00')
      .lt('created_at', today + 'T00:00:00'),
    // Unanswered inquiries (open, no response in 24h+)
    supabase
      .from('inquiries')
      .select('id, client_name, occasion, created_at')
      .eq('chef_id', tenantId)
      .eq('status', 'new')
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(10),
    // Stale follow-ups (3+ days quiet)
    supabase
      .from('inquiries')
      .select('id, client_name, occasion, updated_at')
      .eq('chef_id', tenantId)
      .in('status', ['new', 'contacted', 'follow_up'])
      .lt('updated_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
      .limit(10),
    // Prep timers completing today
    supabase
      .from('prep_timeline')
      .select('id, title, end_at, status, station:stations(name), event:events(title)')
      .eq('chef_id', tenantId)
      .eq('status', 'active')
      .gte('end_at', today + 'T00:00:00')
      .lt(
        'end_at',
        new Date(new Date(today + 'T00:00:00').getTime() + 24 * 60 * 60 * 1000).toISOString()
      ),
    // Overdue payments (accepted events past due)
    supabase
      .from('events')
      .select('id, occasion, event_date, quoted_price_cents, client:clients(full_name)')
      .eq('tenant_id', tenantId)
      .eq('status', 'accepted')
      .lt('event_date', today)
      .limit(10),
    // Pending inquiries (open, waiting for response)
    supabase
      .from('inquiries')
      .select('id, client_name, occasion, created_at, unknown_fields')
      .eq('chef_id', tenantId)
      .in('status', ['new', 'contacted'])
      .order('created_at', { ascending: true })
      .limit(10),
    // Unsigned proposals (proposed events, waiting for client)
    supabase
      .from('events')
      .select('id, occasion, created_at, client:clients(full_name)')
      .eq('tenant_id', tenantId)
      .eq('status', 'proposed')
      .order('created_at', { ascending: true })
      .limit(10),
    // Week ahead event counts
    supabase
      .from('events')
      .select('id, event_date')
      .eq('tenant_id', tenantId)
      .gte('event_date', today)
      .lte(
        'event_date',
        new Date(new Date(today + 'T00:00:00').getTime() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]
      )
      .in('status', ['confirmed', 'paid', 'accepted', 'in_progress']),
    // Upcoming milestones
    getUpcomingMilestones(tenantId, 14).catch(() => [] as UpcomingMilestone[]),
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
      supabase
        .from('clients')
        .select('id, name')
        .in('id', (todayEventsResult.data ?? []).map((e: any) => e.client_id).filter(Boolean)),
      supabase.from('event_staff').select('event_id').in('event_id', eventIds),
      supabase
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

  // Build overdue payments
  const overduePayments = ((overduePaymentsResult.data ?? []) as any[]).map((e) => {
    const eventDate = new Date(e.event_date + 'T00:00:00')
    const daysPastDue = Math.floor((Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24))
    return {
      event_id: e.id,
      client_name: e.client?.full_name ?? 'Unknown',
      occasion: e.occasion ?? 'Event',
      amount_cents: e.quoted_price_cents ?? 0,
      days_past_due: daysPastDue,
    }
  })

  // Build pending inquiries
  const pendingInquiries = ((pendingInquiriesResult.data ?? []) as any[]).map((i) => {
    const createdAt = new Date(i.created_at)
    const daysWaiting = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    const unknownFields = i.unknown_fields as Record<string, unknown> | null
    const leadScore = unknownFields?.chef_likelihood ? Number(unknownFields.chef_likelihood) : null
    return {
      id: i.id,
      client_name: i.client_name ?? 'Unknown',
      occasion: i.occasion,
      days_waiting: daysWaiting,
      lead_score: leadScore,
    }
  })

  // Build unsigned proposals
  const unsignedProposals = ((unsignedProposalsResult.data ?? []) as any[]).map((e) => {
    const createdAt = new Date(e.created_at)
    const daysSinceSent = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    return {
      event_id: e.id,
      client_name: e.client?.full_name ?? 'Unknown',
      occasion: e.occasion,
      days_since_sent: daysSinceSent,
    }
  })

  // Build week ahead
  const weekAheadMap: Record<string, number> = {}
  for (const event of (weekAheadEventsResult.data ?? []) as any[]) {
    const d = event.event_date as string
    weekAheadMap[d] = (weekAheadMap[d] ?? 0) + 1
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const weekAhead: { date: string; day_label: string; event_count: number }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(today + 'T00:00:00')
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    weekAhead.push({
      date: dateStr,
      day_label: dayLabels[d.getDay()],
      event_count: weekAheadMap[dateStr] ?? 0,
    })
  }

  // Add overdue payment alerts
  if (overduePayments.length > 0) {
    alerts.push({
      type: 'payment_due',
      title: `${overduePayments.length} overdue payment${overduePayments.length !== 1 ? 's' : ''}`,
      detail: overduePayments
        .slice(0, 3)
        .map((p) => `${p.client_name} (${p.days_past_due}d)`)
        .join(', '),
      href: '/finance',
      severity: 'critical',
    })
  }

  const upcomingMilestones = (upcomingMilestonesResult ?? []) as UpcomingMilestone[]

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
    overduePayments,
    pendingInquiries,
    unsignedProposals,
    upcomingMilestones,
    weekAhead,
  }
}
