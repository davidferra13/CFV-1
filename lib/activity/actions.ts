// Activity Dashboard Server Actions
// Chef-facing queries for engagement visibility.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import type { ActivityEvent, ActiveClient } from './types'

// ─── Get Active Clients (Who's Online) ───────────────────────────────────

export async function getActiveClients(minutesWindow = 15): Promise<ActiveClient[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const since = new Date(Date.now() - minutesWindow * 60 * 1000).toISOString()

  // Get the most recent activity per client in the time window
  const { data, error } = await supabase
    .from('activity_events' as any)
    .select(`
      client_id,
      event_type,
      entity_type,
      created_at,
      clients:client_id(full_name)
    `)
    .eq('tenant_id', user.tenantId!)
    .eq('actor_type', 'client')
    .not('client_id', 'is', null)
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getActiveClients] Error:', error)
    return []
  }

  // Deduplicate: keep only the latest activity per client
  const clientMap = new Map<string, ActiveClient>()
  for (const row of data || []) {
    if (!row.client_id || clientMap.has(row.client_id)) continue
    const clientData = row.clients as { full_name: string } | null
    clientMap.set(row.client_id, {
      client_id: row.client_id,
      client_name: clientData?.full_name || 'Unknown',
      last_activity: row.created_at,
      event_type: row.event_type as ActiveClient['event_type'],
      entity_type: row.entity_type,
    })
  }

  return Array.from(clientMap.values())
}

// ─── Get Recent Activity Feed ────────────────────────────────────────────

export async function getRecentActivity(limit = 20): Promise<ActivityEvent[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('activity_events' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getRecentActivity] Error:', error)
    return []
  }

  return (data || []) as ActivityEvent[]
}

// ─── Get Client Timeline ─────────────────────────────────────────────────

export async function getClientTimeline(clientId: string, limit = 30): Promise<ActivityEvent[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('activity_events' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getClientTimeline] Error:', error)
    return []
  }

  return (data || []) as ActivityEvent[]
}

// ─── Get Engagement Stats ────────────────────────────────────────────────

export async function getEngagementStats(): Promise<{
  activeToday: number
  activeThisWeek: number
  totalEventsThisWeek: number
}> {
  const user = await requireChef()
  const supabase = createServerClient()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Active unique clients today
  const { data: todayData } = await supabase
    .from('activity_events' as any)
    .select('client_id')
    .eq('tenant_id', user.tenantId!)
    .eq('actor_type', 'client')
    .not('client_id', 'is', null)
    .gte('created_at', todayStart.toISOString())

  const uniqueToday = new Set((todayData || []).map(r => r.client_id).filter(Boolean))

  // Active unique clients this week
  const { data: weekData } = await supabase
    .from('activity_events' as any)
    .select('client_id')
    .eq('tenant_id', user.tenantId!)
    .eq('actor_type', 'client')
    .not('client_id', 'is', null)
    .gte('created_at', weekAgo.toISOString())

  const uniqueWeek = new Set((weekData || []).map(r => r.client_id).filter(Boolean))

  // Total events this week
  const { count } = await supabase
    .from('activity_events' as any)
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', weekAgo.toISOString())

  return {
    activeToday: uniqueToday.size,
    activeThisWeek: uniqueWeek.size,
    totalEventsThisWeek: count || 0,
  }
}
