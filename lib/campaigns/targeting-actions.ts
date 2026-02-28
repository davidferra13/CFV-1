'use server'

// Push Dinner Campaign — Client Targeting
// Returns candidate client lists for each targeting segment.
// All segments automatically exclude marketing_unsubscribed=true clients.

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { subDays, addDays } from 'date-fns'

export type TargetClient = {
  id: string
  full_name: string
  email: string
  last_event_occasion?: string | null
  last_event_date?: string | null
  loyalty_tier?: string | null
}

export type OpenDateSlot = {
  date: string // ISO date YYYY-MM-DD
  day_of_week: string // 'Friday' | 'Saturday' | 'Sunday'
}

// Base query: all subscribed clients for this chef
async function baseClients(chefId: string, supabase: ReturnType<typeof createServerClient>) {
  return supabase
    .from('clients')
    .select('id, full_name, email, loyalty_tier')
    .eq('tenant_id', chefId)
    .eq('marketing_unsubscribed', false)
    .not('email', 'is', null)
}

// ============================================================
// SEGMENTS
// ============================================================

/** Clients who have booked this exact occasion type before */
export async function getClientsByOccasion(occasion: string): Promise<TargetClient[]> {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { data: events } = await supabase
    .from('events')
    .select('client_id, occasion, event_date')
    .eq('tenant_id', chef.entityId)
    .ilike('occasion', `%${occasion}%`)
    .order('event_date', { ascending: false })

  if (!events || events.length === 0) return []

  // Deduplicate — keep most recent event per client
  const clientMap = new Map<string, { occasion: string; date: string }>()
  for (const e of events) {
    if (!clientMap.has(e.client_id)) {
      clientMap.set(e.client_id, { occasion: e.occasion ?? '', date: e.event_date })
    }
  }

  const ids = Array.from(clientMap.keys())
  const { data: clients } = await baseClients(chef.entityId, supabase).in('id', ids)

  return (clients ?? []).map((c) => ({
    id: c.id,
    full_name: c.full_name,
    email: c.email,
    loyalty_tier: c.loyalty_tier,
    last_event_occasion: clientMap.get(c.id)?.occasion ?? null,
    last_event_date: clientMap.get(c.id)?.date ?? null,
  }))
}

/** Clients who haven't booked in N+ days */
export async function getDormantClients(dayThreshold = 90): Promise<TargetClient[]> {
  const chef = await requireChef()
  const supabase = createServerClient()

  const cutoff = subDays(new Date(), dayThreshold).toISOString().slice(0, 10)

  const { data: recentEvents } = await supabase
    .from('events')
    .select('client_id')
    .eq('tenant_id', chef.entityId)
    .gte('event_date', cutoff)

  const activeIds = new Set((recentEvents ?? []).map((r) => r.client_id))

  const { data: clients } = await baseClients(chef.entityId, supabase)
  return (clients ?? [])
    .filter((c) => !activeIds.has(c.id))
    .map((c) => ({
      id: c.id,
      full_name: c.full_name,
      email: c.email,
      loyalty_tier: c.loyalty_tier,
    }))
}

/** VIP / high-tier clients */
export async function getVIPClients(): Promise<TargetClient[]> {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { data } = await baseClients(chef.entityId, supabase).in('loyalty_tier', [
    'vip',
    'gold',
    'premium',
  ])

  return (data ?? []).map((c) => ({
    id: c.id,
    full_name: c.full_name,
    email: c.email,
    loyalty_tier: c.loyalty_tier,
  }))
}

/** All active/subscribed clients */
export async function getAllClients(): Promise<TargetClient[]> {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { data } = await baseClients(chef.entityId, supabase).limit(200)
  return (data ?? []).map((c) => ({
    id: c.id,
    full_name: c.full_name,
    email: c.email,
    loyalty_tier: c.loyalty_tier,
  }))
}

/** Clients who booked events in a given calendar month across any year */
export async function getSeasonalClients(month: number): Promise<TargetClient[]> {
  const chef = await requireChef()
  const supabase = createServerClient()

  // Fetch all events for this chef (limited), then filter by month in JS
  const { data: events } = await supabase
    .from('events')
    .select('client_id, event_date, occasion')
    .eq('tenant_id', chef.entityId)
    .not('event_date', 'is', null)
    .order('event_date', { ascending: false })

  const matchingClients = new Map<string, { occasion: string; date: string }>()
  for (const e of events ?? []) {
    const m = new Date(e.event_date).getMonth() + 1 // 1-indexed
    if (m === month && !matchingClients.has(e.client_id)) {
      matchingClients.set(e.client_id, { occasion: e.occasion ?? '', date: e.event_date })
    }
  }

  if (matchingClients.size === 0) return []

  const ids = Array.from(matchingClients.keys())
  const { data: clients } = await baseClients(chef.entityId, supabase).in('id', ids)

  return (clients ?? []).map((c) => ({
    id: c.id,
    full_name: c.full_name,
    email: c.email,
    loyalty_tier: c.loyalty_tier,
    last_event_occasion: matchingClients.get(c.id)?.occasion ?? null,
    last_event_date: matchingClients.get(c.id)?.date ?? null,
  }))
}

/** Search clients by name or email for handpick mode */
export async function searchClientsForCampaign(query: string): Promise<TargetClient[]> {
  const chef = await requireChef()
  const supabase = createServerClient()

  const q = query.toLowerCase().trim()
  if (!q) return []

  const { data } = await supabase
    .from('clients')
    .select('id, full_name, email, loyalty_tier')
    .eq('tenant_id', chef.entityId)
    .eq('marketing_unsubscribed', false)
    .not('email', 'is', null)
    .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
    .limit(20)

  return (data ?? []).map((c) => ({
    id: c.id,
    full_name: c.full_name,
    email: c.email,
    loyalty_tier: c.loyalty_tier,
  }))
}

// ============================================================
// OPEN DATE SUGGESTIONS ("Fill My Schedule")
// Returns free Fri/Sat/Sun dates in the next 90 days
// where the chef has no booked/confirmed event.
// ============================================================

export async function getOpenDateSuggestions(): Promise<OpenDateSlot[]> {
  const chef = await requireChef()
  const supabase = createServerClient()

  const today = new Date()
  const endDate = addDays(today, 90)

  // Get all booked event dates in window
  const { data: events } = await supabase
    .from('events')
    .select('event_date')
    .eq('tenant_id', chef.entityId)
    .not('status', 'in', '("cancelled")')
    .gte('event_date', today.toISOString().slice(0, 10))
    .lte('event_date', endDate.toISOString().slice(0, 10))

  const bookedDates = new Set((events ?? []).map((e) => e.event_date))

  // Walk the next 90 days, collect Fri/Sat/Sun that are free
  const slots: OpenDateSlot[] = []
  const cursor = new Date(today)
  cursor.setDate(cursor.getDate() + 1) // start tomorrow

  while (cursor <= endDate) {
    const dow = cursor.getDay() // 0=Sun, 5=Fri, 6=Sat
    if (dow === 0 || dow === 5 || dow === 6) {
      const iso = cursor.toISOString().slice(0, 10)
      if (!bookedDates.has(iso)) {
        slots.push({
          date: iso,
          day_of_week: dow === 0 ? 'Sunday' : dow === 5 ? 'Friday' : 'Saturday',
        })
      }
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return slots.slice(0, 24) // max 24 suggestions
}
