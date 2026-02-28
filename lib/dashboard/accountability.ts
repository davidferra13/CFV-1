'use server'

// Weekly Accountability Stats and Follow-Up Overdue
// Powers the accountability sections on the chef dashboard:
// - "Follow-ups overdue" list (events completed >24h ago with no follow-up sent)
// - "This Week" accountability summary
//
// No ledger writes, no lifecycle transitions — read-only queries only.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export type OverdueFollowUpEvent = {
  eventId: string
  occasion: string | null
  clientName: string
  clientId: string
  completedAt: string // ISO date string
  hoursOverdue: number
}

export type WeeklyAccountabilityStats = {
  eventsCompletedThisWeek: number
  followUpsSentThisWeek: number
  receiptsUploadedThisWeek: number
  overdueFollowUps: number
  closedOnTimeCount: number // events financially closed within 48h
}

/**
 * Get events that have been completed (in_progress → completed) for more than
 * 24 hours but have not had a follow-up sent. Used for the overdue reminders widget.
 */
export async function getOverdueFollowUps(limit = 5): Promise<OverdueFollowUpEvent[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const cutoff = new Date()
  cutoff.setHours(cutoff.getHours() - 24)
  const cutoffStr = cutoff.toISOString()

  // Events that are completed, have no follow-up, and were completed >24h ago
  const { data: events } = await supabase
    .from('events')
    .select('id, occasion, event_date, updated_at, client:clients(id, full_name)')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .eq('follow_up_sent', false)
    .lt('updated_at', cutoffStr)
    .order('updated_at', { ascending: true })
    .limit(limit)

  if (!events || events.length === 0) return []

  const now = new Date()
  return events.map((e: any) => {
    const client = Array.isArray(e.client) ? e.client[0] : e.client
    const completedAt = e.updated_at ?? e.event_date
    const hrs = Math.floor((now.getTime() - new Date(completedAt).getTime()) / (1000 * 60 * 60))
    return {
      eventId: e.id,
      occasion: e.occasion ?? null,
      clientName: (client as any)?.full_name ?? 'Unknown',
      clientId: (client as any)?.id ?? '',
      completedAt,
      hoursOverdue: Math.max(0, hrs - 24),
    }
  })
}

/**
 * Get accountability stats for the current week (Mon–Sun).
 */
export async function getWeeklyAccountabilityStats(): Promise<WeeklyAccountabilityStats> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay() + 1) // Monday
  weekStart.setHours(0, 0, 0, 0)
  const weekStartStr = weekStart.toISOString()

  // Events completed this week
  const { data: completedEvents } = await supabase
    .from('events')
    .select('id, follow_up_sent, financial_closed, financial_closed_at, updated_at')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .gte('updated_at', weekStartStr)

  const eventsCompletedThisWeek = completedEvents?.length ?? 0
  const followUpsSentThisWeek = completedEvents?.filter((e: any) => e.follow_up_sent).length ?? 0
  const closedOnTimeCount =
    completedEvents?.filter((e: any) => {
      if (!e.financial_closed || !e.financial_closed_at || !e.updated_at) return false
      const closeHrs =
        (new Date(e.financial_closed_at).getTime() - new Date(e.updated_at).getTime()) /
        (1000 * 60 * 60)
      return Math.abs(closeHrs) <= 48
    }).length ?? 0

  // Receipts uploaded this week (expenses with receipt_uploaded = true)
  const eventIds = completedEvents?.map((e: any) => e.id) ?? []
  let receiptsUploadedThisWeek = 0
  if (eventIds.length > 0) {
    const { count } = await supabase
      .from('expenses')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', user.tenantId!)
      .eq('receipt_uploaded', true)
      .in('event_id', eventIds)
    receiptsUploadedThisWeek = count ?? 0
  }

  // Total overdue follow-ups across all time
  const cutoff24h = new Date()
  cutoff24h.setHours(cutoff24h.getHours() - 24)
  const { count: overdueCount } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .eq('follow_up_sent', false)
    .lt('updated_at', cutoff24h.toISOString())

  return {
    eventsCompletedThisWeek,
    followUpsSentThisWeek,
    receiptsUploadedThisWeek,
    overdueFollowUps: overdueCount ?? 0,
    closedOnTimeCount,
  }
}
