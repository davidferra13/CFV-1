// Daily Briefing Server Actions
// Generates and retrieves daily briefing summaries for chefs.
// Table: chef_daily_briefings - chef_id FK, briefing_date DATE, content JSONB, sent_at TIMESTAMPTZ

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// --- Types ---

export type BriefingEvent = {
  eventId: string
  occasion: string | null
  clientName: string
  serveTime: string
  guestCount: number
  status: string
}

export type BriefingTask = {
  eventId: string
  occasion: string | null
  taskDescription: string
  dueDate: string
}

export type BriefingDeadline = {
  eventId: string
  occasion: string | null
  deadlineType: string
  dueDate: string
  daysUntil: number
}

export type BriefingContent = {
  eventsToday: BriefingEvent[]
  tasksDue: BriefingTask[]
  revenueThisWeekCents: number
  upcomingDeadlines: BriefingDeadline[]
}

export type DailyBriefing = {
  id: string
  chefId: string
  briefingDate: string
  content: BriefingContent
  sentAt: string | null
  createdAt: string
}

// --- Schemas ---

const DateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()

// --- Actions ---

/**
 * Generate (or regenerate) the daily briefing for a given date.
 * Computes events, tasks, revenue, and upcoming deadlines, then upserts
 * into chef_daily_briefings.
 */
export async function generateDailyBriefing(date?: string): Promise<DailyBriefing> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const briefingDate = DateSchema.parse(date) ?? new Date().toISOString().split('T')[0]

  // 1. Events today
  const { data: todayEvents } = await supabase
    .from('events')
    .select(
      `
      id, occasion, serve_time, guest_count, status,
      client:clients(full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .eq('event_date', briefingDate)
    .not('status', 'eq', 'cancelled')
    .order('serve_time', { ascending: true })

  const eventsToday: BriefingEvent[] = (todayEvents || []).map((e: any) => ({
    eventId: e.id,
    occasion: e.occasion,
    clientName: e.client?.full_name ?? 'Unknown',
    serveTime: e.serve_time,
    guestCount: e.guest_count,
    status: e.status,
  }))

  // 2. Tasks due - events needing closure items or upcoming prep
  const { data: closureEvents } = await supabase
    .from('events')
    .select(
      'id, occasion, event_date, aar_filed, reset_complete, follow_up_sent, financially_closed'
    )
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .or(
      'aar_filed.eq.false,reset_complete.eq.false,follow_up_sent.eq.false,financially_closed.eq.false'
    )
    .order('event_date', { ascending: true })
    .limit(10)

  const tasksDue: BriefingTask[] = []
  for (const event of closureEvents || []) {
    if (!event.aar_filed) {
      tasksDue.push({
        eventId: event.id,
        occasion: event.occasion,
        taskDescription: 'File After-Action Review',
        dueDate: event.event_date,
      })
    }
    if (!event.reset_complete) {
      tasksDue.push({
        eventId: event.id,
        occasion: event.occasion,
        taskDescription: 'Complete post-service reset',
        dueDate: event.event_date,
      })
    }
    if (!event.follow_up_sent) {
      tasksDue.push({
        eventId: event.id,
        occasion: event.occasion,
        taskDescription: 'Send follow-up to client',
        dueDate: event.event_date,
      })
    }
    if (!event.financially_closed) {
      tasksDue.push({
        eventId: event.id,
        occasion: event.occasion,
        taskDescription: 'Close out financials',
        dueDate: event.event_date,
      })
    }
  }

  // 3. Revenue this week - sum of ledger payments in the 7-day window
  const weekStart = new Date(briefingDate)
  const dayOfWeek = weekStart.getDay()
  weekStart.setDate(weekStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const weekStartStr = weekStart.toISOString().split('T')[0]
  const weekEndStr = weekEnd.toISOString().split('T')[0]

  const { data: weekEvents } = await supabase
    .from('events')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', weekStartStr)
    .lte('event_date', weekEndStr)
    .not('status', 'eq', 'cancelled')

  let revenueThisWeekCents = 0

  if (weekEvents && weekEvents.length > 0) {
    const weekEventIds = weekEvents.map((e: any) => e.id)

    const { data: summaries } = await supabase
      .from('event_financial_summary')
      .select('total_paid_cents')
      .eq('tenant_id', user.tenantId!)
      .in('event_id', weekEventIds)

    for (const s of summaries || []) {
      revenueThisWeekCents += s.total_paid_cents ?? 0
    }
  }

  // 4. Upcoming deadlines - events within 7 days needing prep
  const sevenDaysOut = new Date(briefingDate)
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7)
  const sevenDaysOutStr = sevenDaysOut.toISOString().split('T')[0]

  const { data: upcomingEvents } = await supabase
    .from('events')
    .select('id, occasion, event_date, grocery_list_ready, prep_list_ready, packing_list_ready')
    .eq('tenant_id', user.tenantId!)
    .gt('event_date', briefingDate)
    .lte('event_date', sevenDaysOutStr)
    .not('status', 'in', '("cancelled","completed")')
    .order('event_date', { ascending: true })

  const upcomingDeadlines: BriefingDeadline[] = []
  const briefingDateObj = new Date(briefingDate)

  for (const event of upcomingEvents || []) {
    const eventDateObj = new Date(event.event_date)
    const daysUntil = Math.ceil(
      (eventDateObj.getTime() - briefingDateObj.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (!event.grocery_list_ready) {
      upcomingDeadlines.push({
        eventId: event.id,
        occasion: event.occasion,
        deadlineType: 'Grocery list',
        dueDate: event.event_date,
        daysUntil,
      })
    }
    if (!event.prep_list_ready) {
      upcomingDeadlines.push({
        eventId: event.id,
        occasion: event.occasion,
        deadlineType: 'Prep list',
        dueDate: event.event_date,
        daysUntil,
      })
    }
    if (!event.packing_list_ready) {
      upcomingDeadlines.push({
        eventId: event.id,
        occasion: event.occasion,
        deadlineType: 'Packing list',
        dueDate: event.event_date,
        daysUntil,
      })
    }
  }

  const content: BriefingContent = {
    eventsToday,
    tasksDue,
    revenueThisWeekCents,
    upcomingDeadlines,
  }

  // Upsert the briefing
  const { data: briefing, error } = await supabase
    .from('chef_daily_briefings')
    .upsert(
      {
        chef_id: user.tenantId!,
        briefing_date: briefingDate,
        content,
      },
      { onConflict: 'chef_id,briefing_date' }
    )
    .select()
    .single()

  if (error) {
    console.error('[generateDailyBriefing] Error:', error)
    throw new Error('Failed to generate daily briefing')
  }

  revalidatePath('/dashboard')

  return {
    id: briefing.id,
    chefId: briefing.chef_id,
    briefingDate: briefing.briefing_date,
    content: briefing.content as BriefingContent,
    sentAt: briefing.sent_at,
    createdAt: briefing.created_at,
  }
}

/**
 * Get the daily briefing for a given date. Defaults to today.
 */
export async function getDailyBriefing(date?: string): Promise<DailyBriefing | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const briefingDate = DateSchema.parse(date) ?? new Date().toISOString().split('T')[0]

  const { data: briefing, error } = await supabase
    .from('chef_daily_briefings')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('briefing_date', briefingDate)
    .maybeSingle()

  if (error) {
    console.error('[getDailyBriefing] Error:', error)
    return null
  }

  if (!briefing) return null

  return {
    id: briefing.id,
    chefId: briefing.chef_id,
    briefingDate: briefing.briefing_date,
    content: briefing.content as BriefingContent,
    sentAt: briefing.sent_at,
    createdAt: briefing.created_at,
  }
}
