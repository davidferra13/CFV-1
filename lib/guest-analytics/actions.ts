'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'

/**
 * Get repeat guest analytics — guests who've attended multiple events.
 * Chef only.
 */
export async function getRepeatGuests() {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get all guests across all events for this chef, grouped by email
  const { data: allGuests, error } = await (supabase as any)
    .from('event_guests')
    .select(
      `
      id, full_name, email, rsvp_status,
      event_id,
      events!inner(id, occasion, event_date, tenant_id)
    `
    )
    .eq('events.tenant_id', user.tenantId!)
    .eq('rsvp_status', 'attending')
    .order('full_name')

  if (error || !allGuests) {
    console.error('[getRepeatGuests] Error:', error)
    return []
  }

  // Group by email (or name if no email)
  const guestMap = new Map<
    string,
    {
      name: string
      email: string | null
      events: { id: string; occasion: string | null; event_date: string | null }[]
    }
  >()

  for (const g of allGuests as any[]) {
    const key = g.email?.toLowerCase()?.trim() || `name:${g.full_name.toLowerCase().trim()}`

    if (!guestMap.has(key)) {
      guestMap.set(key, {
        name: g.full_name,
        email: g.email,
        events: [],
      })
    }

    const entry = guestMap.get(key)!
    // Avoid duplicate events
    if (!entry.events.some((e) => e.id === g.event_id)) {
      entry.events.push({
        id: g.events.id,
        occasion: g.events.occasion,
        event_date: g.events.event_date,
      })
    }
  }

  // Only return guests who attended 2+ events
  const repeats = Array.from(guestMap.values())
    .filter((g) => g.events.length >= 2)
    .sort((a, b) => b.events.length - a.events.length)

  return repeats
}

/**
 * Get guest frequency stats for the dashboard.
 * Chef only.
 */
export async function getGuestFrequencyStats() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('event_guests')
    .select(
      `
      full_name, email, rsvp_status,
      events!inner(tenant_id)
    `
    )
    .eq('events.tenant_id', user.tenantId!)
    .eq('rsvp_status', 'attending')

  if (error || !data) {
    return { totalUniqueGuests: 0, repeatGuests: 0, avgEventsPerRepeat: 0, topGuests: [] }
  }

  const guests = data as any[]
  const guestCountMap = new Map<string, number>()

  for (const g of guests) {
    const key = g.email?.toLowerCase()?.trim() || `name:${g.full_name.toLowerCase().trim()}`
    guestCountMap.set(key, (guestCountMap.get(key) || 0) + 1)
  }

  const uniqueGuests = guestCountMap.size
  const repeats = Array.from(guestCountMap.values()).filter((c) => c >= 2)
  const repeatCount = repeats.length
  const avgEvents =
    repeatCount > 0 ? Math.round((repeats.reduce((a, b) => a + b, 0) / repeatCount) * 10) / 10 : 0

  return {
    totalUniqueGuests: uniqueGuests,
    repeatGuests: repeatCount,
    avgEventsPerRepeat: avgEvents,
  }
}

/**
 * Get "dinner groups" — sets of guests who attend together frequently.
 * Chef only.
 */
export async function getDinnerGroups() {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get all events with their attending guests
  const { data, error } = await (supabase as any)
    .from('event_guests')
    .select(
      `
      full_name, email, event_id,
      events!inner(id, occasion, event_date, tenant_id)
    `
    )
    .eq('events.tenant_id', user.tenantId!)
    .eq('rsvp_status', 'attending')

  if (error || !data) return []

  const guests = data as any[]

  // Group guests by event
  const eventGuests = new Map<string, string[]>()
  for (const g of guests) {
    const key = g.email?.toLowerCase()?.trim() || g.full_name.toLowerCase().trim()
    const eventId = g.event_id
    if (!eventGuests.has(eventId)) eventGuests.set(eventId, [])
    eventGuests.get(eventId)!.push(key)
  }

  // Count how often pairs of guests co-attend
  const pairCounts = new Map<string, number>()
  for (const [, guestKeys] of eventGuests) {
    for (let i = 0; i < guestKeys.length; i++) {
      for (let j = i + 1; j < guestKeys.length; j++) {
        const pair = [guestKeys[i], guestKeys[j]].sort().join('|')
        pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1)
      }
    }
  }

  // Find strong pairs (2+ co-attendances)
  const strongPairs = Array.from(pairCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)

  // Resolve names for display
  const nameMap = new Map<string, string>()
  for (const g of guests) {
    const key = g.email?.toLowerCase()?.trim() || g.full_name.toLowerCase().trim()
    nameMap.set(key, g.full_name)
  }

  return strongPairs.map(([pair, count]) => {
    const [a, b] = pair.split('|')
    return {
      guests: [nameMap.get(a) || a, nameMap.get(b) || b],
      coAttendances: count,
    }
  })
}
