// TakeAChef Stats — Server actions for querying TakeAChef-specific inquiry stats.
// Used by the dashboard widget and settings pages.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export type TakeAChefStats = {
  newLeads: number
  awaitingResponse: number
  confirmed: number
  totalAllTime: number
  lastSyncAt: string | null
  untouchedCount: number // new leads not yet addressed
  staleCount: number // new leads untouched > 24 hours
}

export type TakeAChefDailyCount = {
  date: string // YYYY-MM-DD
  inquiryCount: number
}

export type TakeAChefDailyStats = {
  today: number
  yesterday: number
  thisWeek: number
  thisMonth: number
  daily: TakeAChefDailyCount[] // last 30 days
}

const EMPTY_STATS: TakeAChefStats = {
  newLeads: 0,
  awaitingResponse: 0,
  confirmed: 0,
  totalAllTime: 0,
  lastSyncAt: null,
  untouchedCount: 0,
  staleCount: 0,
}

export async function getTakeAChefStats(): Promise<TakeAChefStats> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const supabase: any = createServerClient()

    // Run all count queries in parallel for speed
    const [newRes, awaitingRes, confirmedRes, totalRes, syncRes, staleRes] = await Promise.all([
      // New leads: channel = take_a_chef, status = new
      supabase
        .from('inquiries')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('channel', 'take_a_chef')
        .eq('status', 'new'),

      // Awaiting response: channel = take_a_chef, status = awaiting_chef
      supabase
        .from('inquiries')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('channel', 'take_a_chef')
        .eq('status', 'awaiting_chef'),

      // Confirmed: channel = take_a_chef, status = confirmed
      supabase
        .from('inquiries')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('channel', 'take_a_chef')
        .eq('status', 'confirmed'),

      // Total all time: all take_a_chef inquiries
      supabase
        .from('inquiries')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('channel', 'take_a_chef'),

      // Last sync time from google_connections
      supabase
        .from('google_connections')
        .select('gmail_last_sync_at')
        .eq('chef_id', user.entityId)
        .single(),

      // Stale leads: new + take_a_chef + created more than 24 hours ago
      supabase
        .from('inquiries')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('channel', 'take_a_chef')
        .eq('status', 'new')
        .lt('created_at', new Date(Date.now() - 24 * 3600000).toISOString()),
    ])

    const untouched = newRes.count ?? 0
    const stale = staleRes.count ?? 0

    return {
      newLeads: untouched,
      awaitingResponse: awaitingRes.count ?? 0,
      confirmed: confirmedRes.count ?? 0,
      totalAllTime: totalRes.count ?? 0,
      lastSyncAt: syncRes.data?.gmail_last_sync_at ?? null,
      untouchedCount: untouched,
      staleCount: stale,
    }
  } catch (err) {
    console.error('[take-a-chef-stats] Failed to fetch stats:', err)
    return EMPTY_STATS
  }
}

// ─── Daily Inquiry Count ────────────────────────────────────────────────
// Tracks exactly how many TakeAChef inquiries the chef gets per day.
// TakeAChef buries this by spamming duplicate emails — this cuts through.

export async function getTakeAChefDailyStats(): Promise<TakeAChefDailyStats> {
  const empty: TakeAChefDailyStats = {
    today: 0,
    yesterday: 0,
    thisWeek: 0,
    thisMonth: 0,
    daily: [],
  }

  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const supabase: any = createServerClient()

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

    const yesterdayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1
    ).toISOString()

    // Start of this week (Sunday)
    const dayOfWeek = now.getDay()
    const weekStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - dayOfWeek
    ).toISOString()

    // Start of this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // 30 days ago for the daily breakdown
    const thirtyDaysAgo = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 30
    ).toISOString()

    // Run counts in parallel
    const [todayRes, yesterdayRes, weekRes, monthRes, dailyRes] = await Promise.all([
      // Today's count
      supabase
        .from('inquiries')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('channel', 'take_a_chef')
        .gte('first_contact_at', todayStart),

      // Yesterday's count
      supabase
        .from('inquiries')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('channel', 'take_a_chef')
        .gte('first_contact_at', yesterdayStart)
        .lt('first_contact_at', todayStart),

      // This week's count
      supabase
        .from('inquiries')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('channel', 'take_a_chef')
        .gte('first_contact_at', weekStart),

      // This month's count
      supabase
        .from('inquiries')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('channel', 'take_a_chef')
        .gte('first_contact_at', monthStart),

      // Last 30 days — individual records for daily breakdown
      supabase
        .from('inquiries')
        .select('first_contact_at')
        .eq('tenant_id', tenantId)
        .eq('channel', 'take_a_chef')
        .gte('first_contact_at', thirtyDaysAgo)
        .order('first_contact_at', { ascending: true }),
    ])

    // Build daily breakdown from the raw records
    const dailyMap = new Map<string, number>()
    // Pre-fill last 30 days with zeros
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      dailyMap.set(key, 0)
    }
    // Count actual inquiries per day
    if (dailyRes.data) {
      for (const row of dailyRes.data) {
        if (row.first_contact_at) {
          const key = new Date(row.first_contact_at).toISOString().slice(0, 10)
          dailyMap.set(key, (dailyMap.get(key) || 0) + 1)
        }
      }
    }
    // Convert to sorted array (newest first)
    const daily: TakeAChefDailyCount[] = Array.from(dailyMap.entries())
      .map(([date, inquiryCount]) => ({ date, inquiryCount }))
      .sort((a, b) => b.date.localeCompare(a.date))

    return {
      today: todayRes.count ?? 0,
      yesterday: yesterdayRes.count ?? 0,
      thisWeek: weekRes.count ?? 0,
      thisMonth: monthRes.count ?? 0,
      daily,
    }
  } catch (err) {
    console.error('[take-a-chef-stats] Failed to fetch daily stats:', err)
    return empty
  }
}

// ─── Actionable Leads ────────────────────────────────────────────────
// Returns actual inquiry records for the dashboard command center widget.

export type TacActionableLead = {
  id: string
  clientName: string
  status: string
  createdAt: string
  externalLink: string | null
  ageHours: number
}

export async function getTakeAChefActionableLeads(): Promise<{
  untouched: TacActionableLead[]
  awaitingChef: TacActionableLead[]
}> {
  const empty = { untouched: [], awaitingChef: [] }

  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const supabase: any = createServerClient()

    const { data } = await supabase
      .from('inquiries')
      .select('id, status, created_at, external_link, unknown_fields, client:clients(full_name)')
      .eq('tenant_id', tenantId)
      .eq('channel', 'take_a_chef')
      .in('status', ['new', 'awaiting_chef'])
      .order('created_at', { ascending: false })
      .limit(10)

    if (!data) return empty

    const now = Date.now()
    const toLead = (row: any): TacActionableLead => ({
      id: row.id,
      clientName:
        (row.client as any)?.full_name || (row.unknown_fields as any)?.client_name || 'Unknown',
      status: row.status,
      createdAt: row.created_at,
      externalLink: row.external_link,
      ageHours: Math.floor((now - new Date(row.created_at).getTime()) / 3600000),
    })

    return {
      untouched: data.filter((r) => r.status === 'new').map(toLead),
      awaitingChef: data.filter((r) => r.status === 'awaiting_chef').map(toLead),
    }
  } catch (err) {
    console.error('[take-a-chef-stats] Failed to fetch actionable leads:', err)
    return empty
  }
}
