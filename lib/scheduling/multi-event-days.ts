'use server'

// Multi-Event Day Detection — finds upcoming days where the chef has 2+ events
// Used to surface scheduling conflicts and capacity warnings on the dashboard.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export interface MultiEventDay {
  date: string // ISO date string, e.g. '2026-03-15'
  events: Array<{
    id: string
    occasion: string | null
    event_date: string
    guest_count: number | null
    status: string
  }>
}

/**
 * Returns upcoming days (within the next 90 days) where the chef has 2+ events.
 * Only considers non-cancelled events.
 */
export async function getMultiEventDays(lookaheadDays = 90): Promise<MultiEventDay[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const future = new Date(today)
  future.setDate(future.getDate() + lookaheadDays)

  const { data: events } = await supabase
    .from('events')
    .select('id, occasion, event_date, guest_count, status')
    .eq('tenant_id', user.entityId)
    .not('status', 'eq', 'cancelled')
    .gte('event_date', today.toISOString())
    .lte('event_date', future.toISOString())
    .order('event_date', { ascending: true })

  if (!events || events.length < 2) return []

  // Group by calendar date (YYYY-MM-DD)
  const byDate = new Map<string, typeof events>()
  for (const ev of events) {
    const key = ev.event_date.slice(0, 10)
    if (!byDate.has(key)) byDate.set(key, [])
    byDate.get(key)!.push(ev)
  }

  // Only return days with 2+ events
  const result: MultiEventDay[] = []
  for (const [date, dayEvents] of byDate.entries()) {
    if (dayEvents.length >= 2) {
      result.push({ date, events: dayEvents })
    }
  }

  return result.sort((a, b) => a.date.localeCompare(b.date))
}
