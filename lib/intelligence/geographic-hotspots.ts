'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GeographicHotspot {
  location: string
  eventCount: number
  avgRevenueCents: number
  avgMarginPercent: number
  avgTravelMinutes: number
  topOccasion: string | null
  revenuePerTravelMinute: number // efficiency metric
  trend: 'growing' | 'stable' | 'declining'
}

export interface TravelEfficiency {
  avgTravelMinutes: number
  avgRevenuePerTravelMinute: number
  longestTravelEvent: { location: string; minutes: number; revenueCents: number } | null
  shortestTravelEvent: { location: string; minutes: number; revenueCents: number } | null
  eventsWithNoTravel: number
}

export interface GeographicIntelligence {
  hotspots: GeographicHotspot[]
  travelEfficiency: TravelEfficiency
  topRevenueLocation: string | null
  topEfficiencyLocation: string | null
  totalLocations: number
  avgEventsPerLocation: number
  locationConcentration: number // % of events in top 3 locations
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getGeographicIntelligence(): Promise<GeographicIntelligence | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { data: events, error } = await supabase
    .from('events')
    .select(
      'id, location_text, event_date, occasion, quoted_price_cents, guest_count, time_travel_minutes, status'
    )
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'confirmed', 'in_progress', 'paid', 'accepted'])
    .not('location_text', 'is', null)
    .order('event_date', { ascending: true })

  if (error || !events || events.length < 3) return null

  // Fetch expenses
  const completedIds = events.filter((e: any) => e.status === 'completed').map((e: any) => e.id)
  const { data: expenses } =
    completedIds.length > 0
      ? await supabase
          .from('expenses')
          .select('event_id, amount_cents')
          .in('event_id', completedIds)
      : { data: [] }

  const expenseByEvent = new Map<string, number>()
  for (const exp of expenses || []) {
    expenseByEvent.set(
      exp.event_id,
      (expenseByEvent.get(exp.event_id) || 0) + (exp.amount_cents || 0)
    )
  }

  const sixMonthsAgo = new Date(Date.now() - 180 * 86400000).toISOString().split('T')[0]

  // Normalize location text (trim, lowercase for grouping, preserve original for display)
  const normalizeLocation = (loc: string) => loc.trim().toLowerCase().replace(/\s+/g, ' ')

  const locationMap = new Map<
    string,
    {
      displayName: string
      events: any[]
      revenueCents: number
      profitCents: number
      travelMinutes: number[]
      occasions: Map<string, number>
      recentCount: number
      olderCount: number
    }
  >()

  for (const event of events) {
    const raw = event.location_text?.trim()
    if (!raw) continue
    const key = normalizeLocation(raw)

    if (!locationMap.has(key)) {
      locationMap.set(key, {
        displayName: raw,
        events: [],
        revenueCents: 0,
        profitCents: 0,
        travelMinutes: [],
        occasions: new Map(),
        recentCount: 0,
        olderCount: 0,
      })
    }

    const loc = locationMap.get(key)!
    loc.events.push(event)
    const revenue = event.quoted_price_cents || 0
    loc.revenueCents += revenue
    loc.profitCents += revenue - (expenseByEvent.get(event.id) || 0)

    if (event.time_travel_minutes && event.time_travel_minutes > 0) {
      loc.travelMinutes.push(event.time_travel_minutes)
    }

    if (event.occasion) {
      loc.occasions.set(event.occasion, (loc.occasions.get(event.occasion) || 0) + 1)
    }

    if (event.event_date >= sixMonthsAgo) loc.recentCount++
    else loc.olderCount++
  }

  // Build hotspots
  const hotspots: GeographicHotspot[] = Array.from(locationMap.entries())
    .filter(([, loc]) => loc.events.length >= 2)
    .map(([, loc]) => {
      const count = loc.events.length
      const avgRevenue = Math.round(loc.revenueCents / count)
      const avgMargin =
        loc.revenueCents > 0 ? Math.round((loc.profitCents / loc.revenueCents) * 1000) / 10 : 0
      const avgTravel =
        loc.travelMinutes.length > 0
          ? Math.round(loc.travelMinutes.reduce((s, t) => s + t, 0) / loc.travelMinutes.length)
          : 0
      const topOccasion =
        loc.occasions.size > 0
          ? Array.from(loc.occasions.entries()).sort((a, b) => b[1] - a[1])[0][0]
          : null
      const revenuePerTravel = avgTravel > 0 ? Math.round(avgRevenue / avgTravel) : 0

      let trend: GeographicHotspot['trend'] = 'stable'
      if (loc.recentCount > loc.olderCount * 1.3) trend = 'growing'
      else if (loc.recentCount < loc.olderCount * 0.5 && loc.olderCount >= 2) trend = 'declining'

      return {
        location: loc.displayName,
        eventCount: count,
        avgRevenueCents: avgRevenue,
        avgMarginPercent: avgMargin,
        avgTravelMinutes: avgTravel,
        topOccasion,
        revenuePerTravelMinute: revenuePerTravel,
        trend,
      }
    })
    .sort((a, b) => b.eventCount - a.eventCount)

  // Travel efficiency
  const allTravel = events
    .filter((e: any) => e.time_travel_minutes && e.time_travel_minutes > 0 && e.quoted_price_cents)
    .map((e: any) => ({
      location: e.location_text,
      minutes: e.time_travel_minutes,
      revenueCents: e.quoted_price_cents,
    }))

  const avgTravelMinutes =
    allTravel.length > 0
      ? Math.round(allTravel.reduce((s: number, t: any) => s + t.minutes, 0) / allTravel.length)
      : 0

  const avgRevenuePerTravel =
    allTravel.length > 0
      ? Math.round(
          allTravel.reduce((s: number, t: any) => s + t.revenueCents / t.minutes, 0) /
            allTravel.length
        )
      : 0

  const sortedByTravel = [...allTravel].sort((a, b) => a.minutes - b.minutes)
  const eventsWithNoTravel = events.filter(
    (e: any) => !e.time_travel_minutes || e.time_travel_minutes === 0
  ).length

  const travelEfficiency: TravelEfficiency = {
    avgTravelMinutes,
    avgRevenuePerTravelMinute: avgRevenuePerTravel,
    longestTravelEvent:
      sortedByTravel.length > 0 ? sortedByTravel[sortedByTravel.length - 1] : null,
    shortestTravelEvent: sortedByTravel.length > 0 ? sortedByTravel[0] : null,
    eventsWithNoTravel,
  }

  // Summary
  const topRevenue =
    hotspots.length > 0
      ? [...hotspots].sort((a, b) => b.avgRevenueCents - a.avgRevenueCents)[0].location
      : null
  const topEfficiency =
    hotspots.filter((h) => h.revenuePerTravelMinute > 0).length > 0
      ? [...hotspots]
          .filter((h) => h.revenuePerTravelMinute > 0)
          .sort((a, b) => b.revenuePerTravelMinute - a.revenuePerTravelMinute)[0].location
      : null

  const totalEvents = events.length
  const top3Events = hotspots.slice(0, 3).reduce((s, h) => s + h.eventCount, 0)
  const concentration = totalEvents > 0 ? Math.round((top3Events / totalEvents) * 100) : 0

  return {
    hotspots: hotspots.slice(0, 15),
    travelEfficiency,
    topRevenueLocation: topRevenue,
    topEfficiencyLocation: topEfficiency,
    totalLocations: hotspots.length,
    avgEventsPerLocation:
      hotspots.length > 0 ? Math.round((totalEvents / hotspots.length) * 10) / 10 : 0,
    locationConcentration: concentration,
  }
}
