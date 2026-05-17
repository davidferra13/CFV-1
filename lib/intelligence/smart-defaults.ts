// Smart Defaults - Pre-fill creation forms from chef's historical patterns
// Queries tenant-scoped event/menu data to suggest defaults. Never forced; always overridable.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EventSmartDefaults {
  guestCount: number | null
  serviceStyle: string | null
  serveTime: string | null
  perHeadRateCents: number | null
  cuisineType: string | null
  totalEventsAnalyzed: number
}

// ─── Main Action ─────────────────────────────────────────────────────────────

/**
 * Compute smart defaults for event creation based on the chef's history.
 * Returns null if the chef has fewer than 3 past events (not enough data).
 * All values are suggestions, never forced.
 */
export async function getEventSmartDefaults(): Promise<EventSmartDefaults | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch completed/confirmed events with relevant fields
  const { data: events, error } = await db
    .from('events')
    .select('guest_count, serve_time, service_style, quoted_price_cents')
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'confirmed', 'paid', 'in_progress'])
    .order('event_date', { ascending: false })
    .limit(100)

  if (error || !events || events.length < 3) return null

  // ─── Guest Count (median) ──────────────────────────────────────────────
  const guestCounts = events
    .map((e: any) => e.guest_count)
    .filter((g: any): g is number => typeof g === 'number' && g > 0)
    .sort((a: number, b: number) => a - b)

  const guestCount = guestCounts.length > 0 ? guestCounts[Math.floor(guestCounts.length / 2)] : null

  // ─── Service Style (mode) ─────────────────────────────────────────────
  const styleCounts: Record<string, number> = {}
  for (const e of events) {
    if (e.service_style) {
      styleCounts[e.service_style] = (styleCounts[e.service_style] || 0) + 1
    }
  }
  const serviceStyle =
    Object.keys(styleCounts).length > 0
      ? Object.entries(styleCounts).sort((a, b) => b[1] - a[1])[0][0]
      : null

  // ─── Serve Time (mode) ────────────────────────────────────────────────
  const timeCounts: Record<string, number> = {}
  for (const e of events) {
    if (e.serve_time) {
      // Normalize to HH:MM (drop seconds if present)
      const normalized = String(e.serve_time).slice(0, 5)
      timeCounts[normalized] = (timeCounts[normalized] || 0) + 1
    }
  }
  const serveTime =
    Object.keys(timeCounts).length > 0
      ? Object.entries(timeCounts).sort((a, b) => b[1] - a[1])[0][0]
      : null

  // ─── Per-Head Rate (average, only where both price & guests exist) ────
  const perHeadRates: number[] = []
  for (const e of events) {
    if (e.quoted_price_cents > 0 && e.guest_count > 0) {
      perHeadRates.push(Math.round(e.quoted_price_cents / e.guest_count))
    }
  }
  const perHeadRateCents =
    perHeadRates.length > 0
      ? Math.round(perHeadRates.reduce((a, b) => a + b, 0) / perHeadRates.length)
      : null

  // ─── Cuisine Type (mode from linked menus) ────────────────────────────
  let cuisineType: string | null = null
  const { data: menus } = await db
    .from('menus')
    .select('cuisine_type')
    .eq('tenant_id', tenantId)
    .not('cuisine_type', 'is', null)
    .limit(100)

  if (menus && menus.length > 0) {
    const cuisineCounts: Record<string, number> = {}
    for (const m of menus) {
      if (m.cuisine_type) {
        cuisineCounts[m.cuisine_type] = (cuisineCounts[m.cuisine_type] || 0) + 1
      }
    }
    if (Object.keys(cuisineCounts).length > 0) {
      cuisineType = Object.entries(cuisineCounts).sort((a, b) => b[1] - a[1])[0][0]
    }
  }

  return {
    guestCount,
    serviceStyle,
    serveTime,
    perHeadRateCents,
    cuisineType,
    totalEventsAnalyzed: events.length,
  }
}
