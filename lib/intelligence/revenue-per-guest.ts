'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GuestRevenueDataPoint {
  eventId: string
  eventDate: string
  guestCount: number
  revenueCents: number
  revenuePerGuestCents: number
  occasion: string | null
  serviceStyle: string | null
}

export interface GuestRevenueByOccasion {
  occasion: string
  avgRevenuePerGuestCents: number
  medianRevenuePerGuestCents: number
  eventCount: number
  totalGuestCount: number
  trend: 'rising' | 'stable' | 'falling'
}

export interface OptimalGuestRange {
  minGuests: number
  maxGuests: number
  avgRevenuePerGuestCents: number
  avgTotalRevenueCents: number
  eventCount: number
}

export interface RevenuePerGuestResult {
  dataPoints: GuestRevenueDataPoint[]
  byOccasion: GuestRevenueByOccasion[]
  overallAvgPerGuestCents: number
  overallMedianPerGuestCents: number
  optimalRange: OptimalGuestRange | null
  sweetSpotGuests: number | null // guest count with highest per-guest revenue
  volumeVsValueInsight: string | null
  topPerGuestEvent: GuestRevenueDataPoint | null
  trend: 'rising' | 'stable' | 'falling'
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getRevenuePerGuest(): Promise<RevenuePerGuestResult | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { data: events, error } = await supabase
    .from('events')
    .select('id, event_date, guest_count, quoted_price_cents, occasion, service_style')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .not('quoted_price_cents', 'is', null)
    .gt('quoted_price_cents', 0)
    .not('guest_count', 'is', null)
    .gt('guest_count', 0)
    .order('event_date', { ascending: true })

  if (error || !events || events.length < 5) return null

  // Build data points
  const dataPoints: GuestRevenueDataPoint[] = events.map((e: any) => ({
    eventId: e.id,
    eventDate: e.event_date,
    guestCount: e.guest_count,
    revenueCents: e.quoted_price_cents,
    revenuePerGuestCents: Math.round(e.quoted_price_cents / e.guest_count),
    occasion: e.occasion,
    serviceStyle: e.service_style,
  }))

  const allPerGuest = dataPoints.map((d) => d.revenuePerGuestCents).sort((a, b) => a - b)

  // Overall stats
  const overallAvg = Math.round(allPerGuest.reduce((s, v) => s + v, 0) / allPerGuest.length)
  const overallMedian = allPerGuest[Math.floor(allPerGuest.length / 2)]

  // By occasion
  const occasionMap = new Map<
    string,
    { perGuest: number[]; totalGuests: number; recentPerGuest: number[]; olderPerGuest: number[] }
  >()
  const midpoint = Math.floor(dataPoints.length / 2)

  for (let i = 0; i < dataPoints.length; i++) {
    const d = dataPoints[i]
    const occ = d.occasion || 'unspecified'
    if (!occasionMap.has(occ))
      occasionMap.set(occ, { perGuest: [], totalGuests: 0, recentPerGuest: [], olderPerGuest: [] })
    const o = occasionMap.get(occ)!
    o.perGuest.push(d.revenuePerGuestCents)
    o.totalGuests += d.guestCount
    if (i >= midpoint) o.recentPerGuest.push(d.revenuePerGuestCents)
    else o.olderPerGuest.push(d.revenuePerGuestCents)
  }

  const byOccasion: GuestRevenueByOccasion[] = Array.from(occasionMap.entries())
    .filter(([, o]) => o.perGuest.length >= 2)
    .map(([occasion, o]) => {
      const sorted = [...o.perGuest].sort((a, b) => a - b)
      const avg = Math.round(o.perGuest.reduce((s, v) => s + v, 0) / o.perGuest.length)
      const median = sorted[Math.floor(sorted.length / 2)]

      const recentAvg =
        o.recentPerGuest.length > 0
          ? o.recentPerGuest.reduce((s, v) => s + v, 0) / o.recentPerGuest.length
          : 0
      const olderAvg =
        o.olderPerGuest.length > 0
          ? o.olderPerGuest.reduce((s, v) => s + v, 0) / o.olderPerGuest.length
          : 0

      let trend: GuestRevenueByOccasion['trend'] = 'stable'
      if (olderAvg > 0 && recentAvg > olderAvg * 1.1) trend = 'rising'
      else if (olderAvg > 0 && recentAvg < olderAvg * 0.9) trend = 'falling'

      return {
        occasion,
        avgRevenuePerGuestCents: avg,
        medianRevenuePerGuestCents: median,
        eventCount: o.perGuest.length,
        totalGuestCount: o.totalGuests,
        trend,
      }
    })
    .sort((a, b) => b.avgRevenuePerGuestCents - a.avgRevenuePerGuestCents)

  // Find optimal guest count range (bracket with highest per-guest revenue)
  const guestBrackets = [
    { min: 1, max: 4 },
    { min: 5, max: 8 },
    { min: 9, max: 15 },
    { min: 16, max: 25 },
    { min: 26, max: 40 },
    { min: 41, max: 9999 },
  ]

  let bestBracket: OptimalGuestRange | null = null
  let bestPerGuest = 0

  for (const b of guestBrackets) {
    const matching = dataPoints.filter((d) => d.guestCount >= b.min && d.guestCount <= b.max)
    if (matching.length < 3) continue

    const avgPerGuest = Math.round(
      matching.reduce((s, d) => s + d.revenuePerGuestCents, 0) / matching.length
    )
    const avgTotal = Math.round(matching.reduce((s, d) => s + d.revenueCents, 0) / matching.length)

    if (avgPerGuest > bestPerGuest) {
      bestPerGuest = avgPerGuest
      bestBracket = {
        minGuests: b.min,
        maxGuests: Math.min(b.max, Math.max(...matching.map((d) => d.guestCount))),
        avgRevenuePerGuestCents: avgPerGuest,
        avgTotalRevenueCents: avgTotal,
        eventCount: matching.length,
      }
    }
  }

  // Sweet spot — individual guest count with highest per-guest revenue (need 2+ events)
  const guestCountMap = new Map<number, number[]>()
  for (const d of dataPoints) {
    if (!guestCountMap.has(d.guestCount)) guestCountMap.set(d.guestCount, [])
    guestCountMap.get(d.guestCount)!.push(d.revenuePerGuestCents)
  }

  let sweetSpotGuests: number | null = null
  let sweetSpotAvg = 0
  for (const [count, values] of guestCountMap.entries()) {
    if (values.length < 2) continue
    const avg = values.reduce((s, v) => s + v, 0) / values.length
    if (avg > sweetSpotAvg) {
      sweetSpotAvg = avg
      sweetSpotGuests = count
    }
  }

  // Volume vs value insight
  const smallEvents = dataPoints.filter((d) => d.guestCount <= 8)
  const largeEvents = dataPoints.filter((d) => d.guestCount > 15)
  let volumeVsValueInsight: string | null = null

  if (smallEvents.length >= 3 && largeEvents.length >= 3) {
    const smallAvgPerGuest = Math.round(
      smallEvents.reduce((s, d) => s + d.revenuePerGuestCents, 0) / smallEvents.length
    )
    const largeAvgPerGuest = Math.round(
      largeEvents.reduce((s, d) => s + d.revenuePerGuestCents, 0) / largeEvents.length
    )
    const smallAvgTotal = Math.round(
      smallEvents.reduce((s, d) => s + d.revenueCents, 0) / smallEvents.length
    )
    const largeAvgTotal = Math.round(
      largeEvents.reduce((s, d) => s + d.revenueCents, 0) / largeEvents.length
    )

    if (smallAvgPerGuest > largeAvgPerGuest * 1.2) {
      volumeVsValueInsight = `Small events (≤8 guests) earn $${Math.round(smallAvgPerGuest / 100)}/guest vs $${Math.round(largeAvgPerGuest / 100)}/guest for large events. But large events total $${Math.round(largeAvgTotal / 100)} vs $${Math.round(smallAvgTotal / 100)}.`
    } else if (largeAvgPerGuest > smallAvgPerGuest * 1.2) {
      volumeVsValueInsight = `Large events (15+ guests) earn more per guest ($${Math.round(largeAvgPerGuest / 100)}) than small events ($${Math.round(smallAvgPerGuest / 100)}). Scale economics working in your favor.`
    }
  }

  // Top per-guest event
  const sorted = [...dataPoints].sort((a, b) => b.revenuePerGuestCents - a.revenuePerGuestCents)
  const topPerGuest = sorted[0] || null

  // Trend (recent half vs older half)
  const recentHalf = dataPoints.slice(midpoint)
  const olderHalf = dataPoints.slice(0, midpoint)
  const recentAvg =
    recentHalf.length > 0
      ? recentHalf.reduce((s, d) => s + d.revenuePerGuestCents, 0) / recentHalf.length
      : 0
  const olderAvg =
    olderHalf.length > 0
      ? olderHalf.reduce((s, d) => s + d.revenuePerGuestCents, 0) / olderHalf.length
      : 0
  const trend: RevenuePerGuestResult['trend'] =
    olderAvg > 0 && recentAvg > olderAvg * 1.1
      ? 'rising'
      : olderAvg > 0 && recentAvg < olderAvg * 0.9
        ? 'falling'
        : 'stable'

  return {
    dataPoints: dataPoints.slice(-30),
    byOccasion,
    overallAvgPerGuestCents: overallAvg,
    overallMedianPerGuestCents: overallMedian,
    optimalRange: bestBracket,
    sweetSpotGuests,
    volumeVsValueInsight,
    topPerGuestEvent: topPerGuest,
    trend,
  }
}
