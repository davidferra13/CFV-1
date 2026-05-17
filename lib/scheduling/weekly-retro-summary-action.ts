'use server'

// Weekly Retro Summary - Lightweight server action for dashboard widget.
// Returns only the headline stats needed for the reflection prompt card,
// avoiding the full generateWeeklyRetro() fetch cost.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type WeeklyRetroSummary = {
  weekStart: string
  weekEnd: string
  eventsCompleted: number
  totalRevenueCents: number
  totalClients: number
  returningClients: number
  repeatClientPercent: number
  totalGuests: number
  hasActivity: boolean
}

function formatDateStr(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function lastWeekMonday(): { start: string; end: string } {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  // Go back one more week
  monday.setDate(monday.getDate() - 7)
  const start = formatDateStr(monday)
  const endDate = new Date(monday)
  endDate.setDate(monday.getDate() + 6)
  const end = formatDateStr(endDate)
  return { start, end }
}

/**
 * Fetches a lightweight summary of last week's activity for the dashboard
 * reflection widget. Three queries max, all parallel.
 */
export async function getWeeklyRetroSummary(): Promise<WeeklyRetroSummary> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!
  const { start, end } = lastWeekMonday()

  const [eventsResult, revenueResult] = await Promise.all([
    // Events + client info
    db
      .from('events')
      .select('id, client_id, guest_count, status, client:clients(created_at)')
      .eq('tenant_id', tenantId)
      .not('status', 'eq', 'cancelled')
      .gte('event_date', start)
      .lte('event_date', end),
    // Revenue
    db
      .from('ledger_entries')
      .select('id, amount_cents, is_refund')
      .eq('tenant_id', tenantId)
      .eq('is_refund', false)
      .gte('created_at', `${start}T00:00:00Z`)
      .lte('created_at', `${end}T23:59:59Z`),
  ])

  const events: any[] = eventsResult.data ?? []
  const entries: any[] = revenueResult.data ?? []

  // Count completed/confirmed events
  const completed = events.filter(
    (e: any) => e.status === 'completed' || e.status === 'in_progress' || e.status === 'confirmed'
  )

  const totalGuests = completed.reduce((sum: number, e: any) => sum + (e.guest_count ?? 0), 0)

  // Revenue
  const totalRevenueCents = entries.reduce((sum: number, e: any) => sum + (e.amount_cents ?? 0), 0)

  // Client breakdown
  const clientMap = new Map<string, boolean>()
  for (const event of completed) {
    if (event.client_id && !clientMap.has(event.client_id)) {
      const createdAt = event.client?.created_at ? event.client.created_at.slice(0, 10) : ''
      const isNew = createdAt >= start && createdAt <= end
      clientMap.set(event.client_id, isNew)
    }
  }

  const totalClients = clientMap.size
  const newClients = Array.from(clientMap.values()).filter(Boolean).length
  const returningClients = totalClients - newClients
  const repeatClientPercent =
    totalClients > 0 ? Math.round((returningClients / totalClients) * 100) : 0

  const hasActivity = completed.length > 0 || totalRevenueCents > 0

  return {
    weekStart: start,
    weekEnd: end,
    eventsCompleted: completed.length,
    totalRevenueCents,
    totalClients,
    returningClients,
    repeatClientPercent,
    totalGuests,
    hasActivity,
  }
}
