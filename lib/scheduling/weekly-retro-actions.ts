'use server'

// Weekly Retro - Server Actions
// Assembles retrospective data from existing tables: events, ledger_entries,
// guest_feedback, menus, prep_tasks, clients. No new migrations required.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  WeeklyRetro,
  RetroEventsCompleted,
  RetroRevenueSummary,
  RetroClientFeedback,
  RetroMenuPerformance,
  RetroTimeManagement,
  RetroClientBreakdown,
  RetroHighlight,
  RetroMetric,
  RetroNote,
  RetroFlag,
  RetroTrendPoint,
  RetroTrends,
} from './weekly-retro-types'

// ============================================
// HELPERS
// ============================================

function formatDateStr(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return formatDateStr(new Date(y, m - 1, d + days))
}

/** Returns ISO date string for the Monday of the current week. */
function currentWeekMonday(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  return formatDateStr(monday)
}

/** Returns ISO date string for the Monday of LAST week (the default retro target). */
function lastWeekMonday(): string {
  return addDays(currentWeekMonday(), -7)
}

function safeAvg(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
}

function trendFlag(current: number | null, previous: number | null): RetroFlag {
  if (current === null || previous === null) return 'neutral'
  if (current > previous) return 'positive'
  if (current < previous) return 'negative'
  return 'neutral'
}

// ============================================
// 1. generateWeeklyRetro
// ============================================

/**
 * Assembles a full weekly retrospective from multiple data sources.
 * Defaults to last week if no weekStart is provided.
 */
export async function generateWeeklyRetro(weekStart?: string): Promise<WeeklyRetro> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const start = weekStart ?? lastWeekMonday()
  const end = addDays(start, 6)
  const generatedAt = new Date().toISOString()

  // Previous week for comparison
  const prevStart = addDays(start, -7)
  const prevEnd = addDays(prevStart, 6)

  // Parallel data fetches
  const [
    eventsCompleted,
    revenueSummary,
    clientFeedback,
    menuPerformance,
    timeManagement,
    clientBreakdown,
  ] = await Promise.all([
    fetchEventsCompleted(db, tenantId, start, end),
    fetchRevenueSummary(db, tenantId, start, end),
    fetchClientFeedback(db, tenantId, start, end),
    fetchMenuPerformance(db, tenantId, start, end),
    fetchTimeManagement(db, tenantId, start, end),
    fetchClientBreakdown(db, tenantId, start, end),
  ])

  // Previous week revenue for comparison metric
  const prevRevenue = await fetchRevenueSummary(db, tenantId, prevStart, prevEnd)

  // Build highlights
  const highlights: RetroHighlight[] = []

  if (clientFeedback.avgOverallRating !== null && clientFeedback.avgOverallRating >= 4.5) {
    highlights.push({
      section: 'client_feedback',
      text: `Outstanding feedback: ${clientFeedback.avgOverallRating}/5 avg rating`,
      flag: 'positive',
      eventId: null,
      clientName: null,
    })
  }

  if (clientBreakdown.newClients > 0) {
    highlights.push({
      section: 'events_completed',
      text: `${clientBreakdown.newClients} new client${clientBreakdown.newClients > 1 ? 's' : ''} this week`,
      flag: 'positive',
      eventId: null,
      clientName: null,
    })
  }

  if (eventsCompleted.cancelledCount > 0) {
    highlights.push({
      section: 'events_completed',
      text: `${eventsCompleted.cancelledCount} event${eventsCompleted.cancelledCount > 1 ? 's' : ''} cancelled`,
      flag: 'negative',
      eventId: null,
      clientName: null,
    })
  }

  if (timeManagement.accuracyPercent !== null && timeManagement.overrunTasks > 0) {
    highlights.push({
      section: 'time_management',
      text: `${timeManagement.overrunTasks} prep task${timeManagement.overrunTasks > 1 ? 's' : ''} ran over estimate`,
      flag: 'negative',
      eventId: null,
      clientName: null,
    })
  }

  for (const suggestion of clientFeedback.suggestions) {
    highlights.push({
      section: 'client_feedback',
      text: suggestion,
      flag: 'neutral',
      eventId: null,
      clientName: null,
    })
  }

  // Build summary metrics
  const metrics: RetroMetric[] = [
    {
      label: 'Events Completed',
      value: eventsCompleted.total,
      unit: null,
      previousValue: null,
      flag: eventsCompleted.total > 0 ? 'positive' : 'neutral',
    },
    {
      label: 'Total Revenue',
      value: revenueSummary.totalRevenueCents,
      unit: 'cents',
      previousValue: prevRevenue.totalRevenueCents || null,
      flag: trendFlag(revenueSummary.totalRevenueCents, prevRevenue.totalRevenueCents || null),
    },
    {
      label: 'Avg Rating',
      value: clientFeedback.avgOverallRating ?? 0,
      unit: '/5',
      previousValue: null,
      flag:
        clientFeedback.avgOverallRating !== null && clientFeedback.avgOverallRating >= 4
          ? 'positive'
          : clientFeedback.avgOverallRating !== null
            ? 'negative'
            : 'neutral',
    },
    {
      label: 'Prep Accuracy',
      value: timeManagement.accuracyPercent ?? 0,
      unit: '%',
      previousValue: null,
      flag:
        timeManagement.accuracyPercent !== null && timeManagement.accuracyPercent >= 90
          ? 'positive'
          : timeManagement.accuracyPercent !== null
            ? 'negative'
            : 'neutral',
    },
    {
      label: 'Total Guests Served',
      value: eventsCompleted.totalGuests,
      unit: null,
      previousValue: null,
      flag: 'neutral',
    },
  ]

  // Fetch any chef notes for this week
  const notes = await fetchRetroNotes(db, tenantId, start)

  return {
    weekStart: start,
    weekEnd: end,
    generatedAt,
    eventsCompleted,
    revenueSummary,
    clientFeedback,
    menuPerformance,
    timeManagement,
    clientBreakdown,
    highlights,
    metrics,
    notes,
  }
}

// ============================================
// 2. getRetroHistory
// ============================================

/**
 * Returns past weekly retros by generating them for recent weeks.
 * limit defaults to 4 (one month of weeks).
 */
export async function getRetroHistory(limit: number = 4): Promise<WeeklyRetro[]> {
  const clampedLimit = Math.min(Math.max(1, limit), 12)
  const retros: WeeklyRetro[] = []

  // Start from last week and go backwards
  let weekStart = lastWeekMonday()

  for (let i = 0; i < clampedLimit; i++) {
    const retro = await generateWeeklyRetro(weekStart)
    // Only include weeks that had any activity
    const hasActivity =
      retro.eventsCompleted.total > 0 ||
      retro.revenueSummary.paymentCount > 0 ||
      retro.clientFeedback.feedbackCount > 0
    if (hasActivity) {
      retros.push(retro)
    }
    weekStart = addDays(weekStart, -7)
  }

  return retros
}

// ============================================
// 3. addRetroNote
// ============================================

/**
 * Adds a personal reflection or lesson to a specific week.
 * Stored in the retro_notes table.
 */
export async function addRetroNote(
  weekStart: string,
  note: string
): Promise<{ success: boolean; note?: RetroNote; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const trimmed = note.trim()
  if (!trimmed) {
    return { success: false, error: 'Note cannot be empty' }
  }
  if (trimmed.length > 2000) {
    return { success: false, error: 'Note must be under 2000 characters' }
  }

  // Validate weekStart format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return { success: false, error: 'Invalid date format. Use YYYY-MM-DD.' }
  }

  try {
    const { data, error } = await db
      .from('retro_notes')
      .insert({
        tenant_id: tenantId,
        week_start: weekStart,
        note: trimmed,
      })
      .select('id, week_start, note, created_at')
      .single()

    if (error) {
      // If retro_notes table does not exist, fall back gracefully
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return {
          success: false,
          error:
            'Retro notes storage is not yet available. Notes will be supported in a future update.',
        }
      }
      return { success: false, error: error.message ?? 'Failed to save note' }
    }

    return {
      success: true,
      note: {
        id: data.id,
        weekStart: data.week_start,
        note: data.note,
        createdAt: data.created_at,
      },
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save note',
    }
  }
}

// ============================================
// 4. getRetroTrends
// ============================================

/**
 * Multi-week comparison: revenue trend, client satisfaction trend, efficiency trend.
 * Defaults to 8 weeks.
 */
export async function getRetroTrends(weeks: number = 8): Promise<RetroTrends> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const clampedWeeks = Math.min(Math.max(2, weeks), 26)
  const points: RetroTrendPoint[] = []

  let weekStart = lastWeekMonday()

  for (let i = 0; i < clampedWeeks; i++) {
    const end = addDays(weekStart, 6)

    const [events, revenue, feedback, timeData, clientData] = await Promise.all([
      fetchEventsCompleted(db, tenantId, weekStart, end),
      fetchRevenueSummary(db, tenantId, weekStart, end),
      fetchClientFeedback(db, tenantId, weekStart, end),
      fetchTimeManagement(db, tenantId, weekStart, end),
      fetchClientBreakdown(db, tenantId, weekStart, end),
    ])

    points.push({
      weekStart,
      weekEnd: end,
      eventCount: events.total,
      totalRevenueCents: revenue.totalRevenueCents,
      avgRating: feedback.avgOverallRating,
      totalGuests: events.totalGuests,
      prepAccuracyPercent: timeData.accuracyPercent,
      newClients: clientData.newClients,
    })

    weekStart = addDays(weekStart, -7)
  }

  // Reverse so oldest is first (chronological order)
  points.reverse()

  // Compute direction flags (compare last 2 points with data)
  const withRevenue = points.filter((p) => p.totalRevenueCents > 0)
  const withRating = points.filter((p) => p.avgRating !== null)
  const withAccuracy = points.filter((p) => p.prepAccuracyPercent !== null)

  const revenueDirection: RetroFlag =
    withRevenue.length >= 2
      ? trendFlag(
          withRevenue[withRevenue.length - 1].totalRevenueCents,
          withRevenue[withRevenue.length - 2].totalRevenueCents
        )
      : 'neutral'

  const satisfactionDirection: RetroFlag =
    withRating.length >= 2
      ? trendFlag(
          withRating[withRating.length - 1].avgRating,
          withRating[withRating.length - 2].avgRating
        )
      : 'neutral'

  const efficiencyDirection: RetroFlag =
    withAccuracy.length >= 2
      ? trendFlag(
          withAccuracy[withAccuracy.length - 1].prepAccuracyPercent,
          withAccuracy[withAccuracy.length - 2].prepAccuracyPercent
        )
      : 'neutral'

  return {
    weeks: clampedWeeks,
    points,
    revenueDirection,
    satisfactionDirection,
    efficiencyDirection,
  }
}

// ============================================
// INTERNAL DATA FETCHERS
// ============================================

async function fetchEventsCompleted(
  db: any,
  tenantId: string,
  start: string,
  end: string
): Promise<RetroEventsCompleted> {
  // All events in the week (including cancelled for stats)
  const { data: allEvents } = await db
    .from('events')
    .select(
      `id, occasion, event_date, guest_count, status,
       client:clients(full_name)`
    )
    .eq('tenant_id', tenantId)
    .gte('event_date', start)
    .lte('event_date', end)
    .order('event_date', { ascending: true })

  const eventList: any[] = allEvents ?? []

  const completed = eventList.filter(
    (e: any) => e.status === 'completed' || e.status === 'in_progress' || e.status === 'confirmed'
  )
  const cancelled = eventList.filter((e: any) => e.status === 'cancelled')

  // "Changed" = events that moved from one status to another during the week
  // We approximate by counting non-draft, non-completed statuses
  const changed = eventList.filter((e: any) => e.status === 'proposed' || e.status === 'accepted')

  const totalGuests = completed.reduce((sum: number, e: any) => sum + (e.guest_count ?? 0), 0)

  return {
    total: completed.length,
    totalGuests,
    cancelledCount: cancelled.length,
    changedCount: changed.length,
    avgGuestsPerEvent: completed.length > 0 ? Math.round(totalGuests / completed.length) : 0,
    events: completed.map((e: any) => ({
      eventId: e.id,
      occasion: e.occasion ?? null,
      eventDate: typeof e.event_date === 'string' ? e.event_date.slice(0, 10) : e.event_date,
      guestCount: e.guest_count ?? 0,
      clientName: e.client?.full_name ?? null,
      status: e.status,
    })),
  }
}

async function fetchRevenueSummary(
  db: any,
  tenantId: string,
  start: string,
  end: string
): Promise<RetroRevenueSummary> {
  const { data: entries } = await db
    .from('ledger_entries')
    .select('id, event_id, amount_cents, entry_type, is_refund, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', `${start}T00:00:00Z`)
    .lte('created_at', `${end}T23:59:59Z`)

  const entryList: any[] = entries ?? []

  let totalRevenueCents = 0
  let eventRevenueCents = 0
  let paymentCount = 0
  let refundCount = 0
  let refundTotalCents = 0

  for (const entry of entryList) {
    const amount = entry.amount_cents ?? 0
    if (entry.is_refund) {
      refundCount++
      refundTotalCents += Math.abs(amount)
    } else {
      paymentCount++
      totalRevenueCents += amount
      if (entry.event_id) {
        eventRevenueCents += amount
      }
    }
  }

  const eventCount = new Set(
    entryList.filter((e: any) => e.event_id && !e.is_refund).map((e: any) => e.event_id)
  ).size

  return {
    totalRevenueCents,
    eventRevenueCents,
    paymentCount,
    refundCount,
    refundTotalCents,
    avgRevenuePerEventCents: eventCount > 0 ? Math.round(eventRevenueCents / eventCount) : 0,
  }
}

async function fetchClientFeedback(
  db: any,
  tenantId: string,
  start: string,
  end: string
): Promise<RetroClientFeedback> {
  const { data: feedback } = await db
    .from('guest_feedback')
    .select(
      `id, overall_rating, food_rating, experience_rating,
       highlight_text, suggestion_text, testimonial_consent, submitted_at`
    )
    .eq('tenant_id', tenantId)
    .not('submitted_at', 'is', null)
    .gte('submitted_at', `${start}T00:00:00Z`)
    .lte('submitted_at', `${end}T23:59:59Z`)

  const feedbackList: any[] = feedback ?? []

  const overallRatings = feedbackList
    .map((f: any) => f.overall_rating)
    .filter((r: any) => r !== null && r !== undefined) as number[]
  const foodRatings = feedbackList
    .map((f: any) => f.food_rating)
    .filter((r: any) => r !== null && r !== undefined) as number[]
  const experienceRatings = feedbackList
    .map((f: any) => f.experience_rating)
    .filter((r: any) => r !== null && r !== undefined) as number[]

  const highlights = feedbackList
    .map((f: any) => f.highlight_text)
    .filter((t: any) => t && t.trim()) as string[]
  const suggestions = feedbackList
    .map((f: any) => f.suggestion_text)
    .filter((t: any) => t && t.trim()) as string[]

  const testimonialCount = feedbackList.filter((f: any) => f.testimonial_consent === true).length

  return {
    feedbackCount: feedbackList.length,
    avgOverallRating: safeAvg(overallRatings),
    avgFoodRating: safeAvg(foodRatings),
    avgExperienceRating: safeAvg(experienceRatings),
    testimonialCount,
    highlights,
    suggestions,
  }
}

async function fetchMenuPerformance(
  db: any,
  tenantId: string,
  start: string,
  end: string
): Promise<RetroMenuPerformance> {
  // Get events in range, then their menus
  const { data: events } = await db
    .from('events')
    .select('id')
    .eq('tenant_id', tenantId)
    .not('status', 'eq', 'cancelled')
    .gte('event_date', start)
    .lte('event_date', end)

  const eventIds = (events ?? []).map((e: any) => e.id)
  if (eventIds.length === 0) {
    return { menusUsed: 0, uniqueMenuNames: [], reusedMenuCount: 0, totalDishes: 0 }
  }

  const { data: menus } = await db
    .from('menus')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  const menuList: any[] = menus ?? []
  const menuNames = menuList.map((m: any) => m.name ?? 'Untitled')
  const uniqueNames = [...new Set(menuNames)]

  // Count reuse: menu names that appear in 2+ events
  const nameCounts = new Map<string, number>()
  for (const name of menuNames) {
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1)
  }
  const reusedMenuCount = Array.from(nameCounts.values()).filter((c) => c >= 2).length

  // Count dishes
  const menuIds = menuList.map((m: any) => m.id)
  let totalDishes = 0
  if (menuIds.length > 0) {
    const { data: dishes } = await db.from('dishes').select('id').in('menu_id', menuIds)
    totalDishes = (dishes ?? []).length
  }

  return {
    menusUsed: menuList.length,
    uniqueMenuNames: uniqueNames,
    reusedMenuCount,
    totalDishes,
  }
}

async function fetchTimeManagement(
  db: any,
  tenantId: string,
  start: string,
  end: string
): Promise<RetroTimeManagement> {
  // Get prep schedules for events in this week
  const { data: schedules } = await db
    .from('event_prep_schedules')
    .select('id, event_id')
    .eq('tenant_id', tenantId)

  const scheduleList: any[] = schedules ?? []
  if (scheduleList.length === 0) {
    return {
      totalPrepTasks: 0,
      completedPrepTasks: 0,
      totalEstimatedMinutes: 0,
      totalActualMinutes: 0,
      accuracyPercent: null,
      overrunTasks: 0,
      underrunTasks: 0,
    }
  }

  // Filter to schedules for events in the date range
  const { data: weekEvents } = await db
    .from('events')
    .select('id')
    .eq('tenant_id', tenantId)
    .gte('event_date', start)
    .lte('event_date', end)

  const weekEventIds = new Set((weekEvents ?? []).map((e: any) => e.id))
  const relevantScheduleIds = scheduleList
    .filter((s: any) => weekEventIds.has(s.event_id))
    .map((s: any) => s.id)

  if (relevantScheduleIds.length === 0) {
    return {
      totalPrepTasks: 0,
      completedPrepTasks: 0,
      totalEstimatedMinutes: 0,
      totalActualMinutes: 0,
      accuracyPercent: null,
      overrunTasks: 0,
      underrunTasks: 0,
    }
  }

  const { data: tasks } = await db
    .from('prep_tasks')
    .select('id, estimated_minutes, actual_minutes, completed_at')
    .in('schedule_id', relevantScheduleIds)

  const taskList: any[] = tasks ?? []
  const completed = taskList.filter((t: any) => t.completed_at)

  let totalEstimated = 0
  let totalActual = 0
  let overrun = 0
  let underrun = 0

  for (const task of taskList) {
    totalEstimated += task.estimated_minutes ?? 0
    if (task.actual_minutes !== null && task.actual_minutes !== undefined) {
      totalActual += task.actual_minutes
      if (task.actual_minutes > (task.estimated_minutes ?? 0)) {
        overrun++
      } else if (task.actual_minutes < (task.estimated_minutes ?? 0)) {
        underrun++
      }
    }
  }

  // Accuracy: how close actual was to estimated (percentage)
  let accuracyPercent: number | null = null
  if (totalEstimated > 0 && totalActual > 0) {
    const ratio = totalActual / totalEstimated
    accuracyPercent = Math.round(Math.min(ratio, 1 / ratio) * 100)
  }

  return {
    totalPrepTasks: taskList.length,
    completedPrepTasks: completed.length,
    totalEstimatedMinutes: totalEstimated,
    totalActualMinutes: totalActual,
    accuracyPercent,
    overrunTasks: overrun,
    underrunTasks: underrun,
  }
}

async function fetchClientBreakdown(
  db: any,
  tenantId: string,
  start: string,
  end: string
): Promise<RetroClientBreakdown> {
  // Get all events in the week with their clients
  const { data: weekEvents } = await db
    .from('events')
    .select('id, client_id, client:clients(full_name, created_at)')
    .eq('tenant_id', tenantId)
    .not('status', 'eq', 'cancelled')
    .gte('event_date', start)
    .lte('event_date', end)

  const eventList: any[] = weekEvents ?? []

  // Deduplicate clients
  const clientMap = new Map<string, { name: string; createdAt: string }>()
  for (const event of eventList) {
    if (event.client_id && !clientMap.has(event.client_id)) {
      clientMap.set(event.client_id, {
        name: event.client?.full_name ?? 'Unknown',
        createdAt: event.client?.created_at ?? '',
      })
    }
  }

  // "New" = client created within this week's date range
  const newClientNames: string[] = []
  let newClients = 0
  for (const [, client] of clientMap) {
    const createdDate = client.createdAt ? client.createdAt.slice(0, 10) : ''
    if (createdDate >= start && createdDate <= end) {
      newClients++
      newClientNames.push(client.name)
    }
  }

  return {
    totalClients: clientMap.size,
    newClients,
    returningClients: clientMap.size - newClients,
    newClientNames,
  }
}

async function fetchRetroNotes(db: any, tenantId: string, weekStart: string): Promise<RetroNote[]> {
  try {
    const { data, error } = await db
      .from('retro_notes')
      .select('id, week_start, note, created_at')
      .eq('tenant_id', tenantId)
      .eq('week_start', weekStart)
      .order('created_at', { ascending: true })

    if (error) {
      // Table may not exist yet; return empty gracefully
      return []
    }

    return (data ?? []).map((row: any) => ({
      id: row.id,
      weekStart: row.week_start,
      note: row.note,
      createdAt: row.created_at,
    }))
  } catch {
    // Table does not exist; silently return empty
    return []
  }
}
