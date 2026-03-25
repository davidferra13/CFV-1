'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PostEventTask {
  eventId: string
  eventDate: string
  clientName: string
  taskType:
    | 'thank_you'
    | 'feedback_request'
    | 'rebooking_nudge'
    | 'aar_reminder'
    | 'receipt_followup'
    | 'review_request'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  daysOverdue: number // 0 = due today, negative = not yet due, positive = overdue
  dueDate: string
}

export interface PostEventTriggersResult {
  tasks: PostEventTask[]
  overdueCount: number
  dueTodayCount: number
  upcomingCount: number
  completionRate: number // % of past events that have all post-event tasks done
}

// Task timing rules (days after event)
const TASK_TIMING: Record<
  PostEventTask['taskType'],
  { daysAfter: number; title: string; description: string }
> = {
  thank_you: {
    daysAfter: 1,
    title: 'Send thank-you message',
    description: 'Personal thank-you within 24 hours makes a lasting impression',
  },
  aar_reminder: {
    daysAfter: 1,
    title: 'Complete after-action review',
    description: 'Capture what went well and lessons learned while fresh',
  },
  receipt_followup: {
    daysAfter: 2,
    title: 'Submit outstanding receipts',
    description: 'Ensure all expense receipts are uploaded for accurate financials',
  },
  feedback_request: {
    daysAfter: 3,
    title: 'Request client feedback',
    description: 'Send satisfaction survey while the experience is still fresh',
  },
  review_request: {
    daysAfter: 7,
    title: 'Ask for a review',
    description: 'Happy clients are most receptive to review requests within a week',
  },
  rebooking_nudge: {
    daysAfter: 14,
    title: 'Send rebooking suggestion',
    description: 'Gentle nudge about booking their next event while momentum is high',
  },
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getPostEventTriggers(): Promise<PostEventTriggersResult | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch recently completed events (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  const { data: events, error } = await db
    .from('events')
    .select(
      `
      id, event_date, client_id, status,
      client:clients(full_name)
    `
    )
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .gte('event_date', thirtyDaysAgo)
    .order('event_date', { ascending: false })

  if (error || !events) return null

  // Check what post-event work is already done
  const eventIds = events.map((e: any) => e.id)

  const [aarsResult, surveysResult, reviewsResult] = await Promise.all([
    eventIds.length > 0
      ? db.from('after_action_reviews').select('event_id').in('event_id', eventIds)
      : { data: [] },
    eventIds.length > 0
      ? db.from('client_satisfaction_surveys').select('event_id').in('event_id', eventIds)
      : { data: [] },
    eventIds.length > 0
      ? db.from('client_reviews').select('event_id').in('event_id', eventIds)
      : { data: [] },
  ])

  const completedAARs = new Set((aarsResult.data || []).map((a: any) => a.event_id))
  const completedSurveys = new Set((surveysResult.data || []).map((s: any) => s.event_id))
  const completedReviews = new Set((reviewsResult.data || []).map((r: any) => r.event_id))

  // Check receipt completion
  const { data: expenses } =
    eventIds.length > 0
      ? await db.from('expenses').select('event_id, receipt_uploaded').in('event_id', eventIds)
      : { data: [] }

  const eventsWithReceipts = new Set<string>()
  const eventsWithMissingReceipts = new Set<string>()
  for (const expense of expenses || []) {
    if (expense.receipt_uploaded) eventsWithReceipts.add(expense.event_id)
    else eventsWithMissingReceipts.add(expense.event_id)
  }

  const now = Date.now()
  const tasks: PostEventTask[] = []

  for (const event of events) {
    const eventDate = new Date(event.event_date)
    const daysSinceEvent = Math.floor((now - eventDate.getTime()) / 86400000)
    const clientName = (event.client as any)?.full_name || 'Client'

    // AAR reminder
    if (!completedAARs.has(event.id)) {
      const timing = TASK_TIMING.aar_reminder
      const dueDate = new Date(eventDate.getTime() + timing.daysAfter * 86400000)
      tasks.push({
        eventId: event.id,
        eventDate: event.event_date,
        clientName,
        taskType: 'aar_reminder',
        priority:
          daysSinceEvent > timing.daysAfter + 3
            ? 'high'
            : daysSinceEvent >= timing.daysAfter
              ? 'medium'
              : 'low',
        title: timing.title,
        description: timing.description,
        daysOverdue: daysSinceEvent - timing.daysAfter,
        dueDate: dueDate.toISOString().split('T')[0],
      })
    }

    // Receipt followup (only if there are expenses without receipts)
    if (eventsWithMissingReceipts.has(event.id)) {
      const timing = TASK_TIMING.receipt_followup
      const dueDate = new Date(eventDate.getTime() + timing.daysAfter * 86400000)
      tasks.push({
        eventId: event.id,
        eventDate: event.event_date,
        clientName,
        taskType: 'receipt_followup',
        priority: daysSinceEvent > timing.daysAfter + 5 ? 'high' : 'medium',
        title: timing.title,
        description: timing.description,
        daysOverdue: daysSinceEvent - timing.daysAfter,
        dueDate: dueDate.toISOString().split('T')[0],
      })
    }

    // Feedback request (only if no survey exists)
    if (!completedSurveys.has(event.id) && daysSinceEvent >= 2) {
      const timing = TASK_TIMING.feedback_request
      const dueDate = new Date(eventDate.getTime() + timing.daysAfter * 86400000)
      tasks.push({
        eventId: event.id,
        eventDate: event.event_date,
        clientName,
        taskType: 'feedback_request',
        priority:
          daysSinceEvent > timing.daysAfter + 5
            ? 'high'
            : daysSinceEvent >= timing.daysAfter
              ? 'medium'
              : 'low',
        title: `${timing.title} - ${clientName}`,
        description: timing.description,
        daysOverdue: daysSinceEvent - timing.daysAfter,
        dueDate: dueDate.toISOString().split('T')[0],
      })
    }

    // Review request (only if no review + enough time has passed)
    if (!completedReviews.has(event.id) && daysSinceEvent >= 5) {
      const timing = TASK_TIMING.review_request
      const dueDate = new Date(eventDate.getTime() + timing.daysAfter * 86400000)
      tasks.push({
        eventId: event.id,
        eventDate: event.event_date,
        clientName,
        taskType: 'review_request',
        priority: daysSinceEvent > timing.daysAfter + 7 ? 'medium' : 'low',
        title: `${timing.title} - ${clientName}`,
        description: timing.description,
        daysOverdue: daysSinceEvent - timing.daysAfter,
        dueDate: dueDate.toISOString().split('T')[0],
      })
    }

    // Rebooking nudge (only for events 10+ days ago, if client has booked before)
    if (daysSinceEvent >= 10) {
      const timing = TASK_TIMING.rebooking_nudge
      const dueDate = new Date(eventDate.getTime() + timing.daysAfter * 86400000)
      tasks.push({
        eventId: event.id,
        eventDate: event.event_date,
        clientName,
        taskType: 'rebooking_nudge',
        priority: 'low',
        title: `${timing.title} - ${clientName}`,
        description: timing.description,
        daysOverdue: daysSinceEvent - timing.daysAfter,
        dueDate: dueDate.toISOString().split('T')[0],
      })
    }
  }

  // Sort: overdue first, then by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  tasks.sort((a, b) => {
    if (a.daysOverdue > 0 && b.daysOverdue <= 0) return -1
    if (a.daysOverdue <= 0 && b.daysOverdue > 0) return 1
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  const overdueCount = tasks.filter((t) => t.daysOverdue > 0).length
  const dueTodayCount = tasks.filter((t) => t.daysOverdue === 0).length
  const upcomingCount = tasks.filter((t) => t.daysOverdue < 0).length

  // Completion rate: how many events have all key tasks done (AAR + survey)
  const totalCompleted = events.length
  const fullyDone = events.filter(
    (e: any) => completedAARs.has(e.id) && completedSurveys.has(e.id)
  ).length
  const completionRate = totalCompleted > 0 ? Math.round((fullyDone / totalCompleted) * 100) : 0

  return {
    tasks: tasks.slice(0, 30),
    overdueCount,
    dueTodayCount,
    upcomingCount,
    completionRate,
  }
}
