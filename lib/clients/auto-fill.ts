// Client Auto-Fill for Event Form
// Fetches a returning client's recent event history to pre-fill form fields.
// Pure deterministic logic: no AI, just database queries and averages.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export type ClientAutoFillData = {
  /** Most common dietary restrictions across recent events */
  dietary_restrictions: string[]
  /** Most common allergies across recent events */
  allergies: string[]
  /** Average guest count from recent events (rounded) */
  typical_guest_count: number | null
  /** Most recent location used */
  last_location: {
    address: string | null
    city: string | null
    state: string | null
    zip: string | null
  } | null
  /** Median quoted price from recent events */
  typical_price_cents: number | null
  /** Most common occasion label */
  typical_occasion: string | null
  /** Most common service style */
  typical_service_style: string | null
  /** Number of past events used to derive these defaults */
  event_count: number
}

/**
 * Get auto-fill suggestions for a returning client.
 * Returns null if the client has no past events.
 */
export async function getClientAutoFill(clientId: string): Promise<ClientAutoFillData | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch last 10 events for this client (most recent first)
  const { data: events, error } = await supabase
    .from('events')
    .select(
      'guest_count, dietary_restrictions, allergies, location_address, location_city, location_state, location_zip, quoted_price_cents, occasion, service_style'
    )
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .order('event_date', { ascending: false })
    .limit(10)

  if (error || !events || events.length === 0) {
    return null
  }

  // Aggregate dietary restrictions (union of all)
  const dietarySet = new Set<string>()
  const allergySet = new Set<string>()
  for (const e of events) {
    for (const d of e.dietary_restrictions || []) dietarySet.add(d)
    for (const a of e.allergies || []) allergySet.add(a)
  }

  // Average guest count
  const guestCounts = events
    .map((e: any) => e.guest_count)
    .filter((g: any): g is number => typeof g === 'number' && g > 0)
  const avgGuestCount =
    guestCounts.length > 0
      ? Math.round(guestCounts.reduce((a: number, b: number) => a + b, 0) / guestCounts.length)
      : null

  // Most recent location (from the latest event that has one)
  const eventWithLocation = events.find((e: any) => e.location_address || e.location_city)
  const lastLocation = eventWithLocation
    ? {
        address: eventWithLocation.location_address,
        city: eventWithLocation.location_city,
        state: eventWithLocation.location_state,
        zip: eventWithLocation.location_zip,
      }
    : null

  // Median price
  const prices = events
    .map((e: any) => e.quoted_price_cents)
    .filter((p: any): p is number => typeof p === 'number' && p > 0)
    .sort((a: number, b: number) => a - b)
  const medianPrice = prices.length > 0 ? prices[Math.floor(prices.length / 2)] : null

  // Most common occasion (mode)
  const occasionCounts = new Map<string, number>()
  for (const e of events) {
    if (e.occasion) {
      // Strip "(copy)" and recurrence suffixes for cleaner matching
      const clean = e.occasion
        .replace(/\s*\(copy\).*$/, '')
        .replace(/\s*\(.*#\d+\)$/, '')
        .trim()
      if (clean) occasionCounts.set(clean, (occasionCounts.get(clean) || 0) + 1)
    }
  }
  const typicalOccasion =
    occasionCounts.size > 0 ? [...occasionCounts.entries()].sort((a, b) => b[1] - a[1])[0][0] : null

  // Most common service style (mode)
  const styleCounts = new Map<string, number>()
  for (const e of events) {
    if (e.service_style)
      styleCounts.set(e.service_style, (styleCounts.get(e.service_style) || 0) + 1)
  }
  const typicalStyle =
    styleCounts.size > 0 ? [...styleCounts.entries()].sort((a, b) => b[1] - a[1])[0][0] : null

  return {
    dietary_restrictions: [...dietarySet],
    allergies: [...allergySet],
    typical_guest_count: avgGuestCount,
    last_location: lastLocation,
    typical_price_cents: medianPrice,
    typical_occasion: typicalOccasion,
    typical_service_style: typicalStyle,
    event_count: events.length,
  }
}
