'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PrepTimeEstimate {
  estimatedShoppingMinutes: number
  estimatedPrepMinutes: number
  estimatedServiceMinutes: number
  estimatedTravelMinutes: number
  estimatedResetMinutes: number
  estimatedTotalMinutes: number
  confidence: 'high' | 'medium' | 'low'
  basedOnEvents: number
  similarEvents: SimilarEventSummary[]
}

export interface SimilarEventSummary {
  eventId: string
  eventDate: string
  guestCount: number
  occasion: string | null
  totalMinutes: number
}

export interface PhaseAverage {
  phase: string
  avgMinutes: number
  minMinutes: number
  maxMinutes: number
  dataPoints: number
}

export interface PrepTimeIntelligence {
  phaseAverages: PhaseAverage[]
  byGuestCountBracket: { bracket: string; avgTotalMinutes: number; eventCount: number }[]
  byOccasion: { occasion: string; avgTotalMinutes: number; eventCount: number }[]
  efficiencyTrend: 'improving' | 'stable' | 'declining'
  avgMinutesPerGuest: number
  fastestEvent: { eventDate: string; totalMinutes: number; guestCount: number } | null
  slowestEvent: { eventDate: string; totalMinutes: number; guestCount: number } | null
}

// ─── Estimate for a specific event profile ───────────────────────────────────

export async function estimatePrepTime(
  guestCount: number,
  occasion?: string
): Promise<PrepTimeEstimate | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { data: events, error } = await supabase
    .from('events')
    .select(
      `
      id, event_date, guest_count, occasion,
      time_shopping_minutes, time_prep_minutes, time_service_minutes,
      time_travel_minutes, time_reset_minutes
    `
    )
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .not('time_prep_minutes', 'is', null)
    .order('event_date', { ascending: false })

  if (error || !events || events.length < 2) return null

  // Find similar events (same occasion or similar guest count +/- 30%)
  const lowerBound = guestCount * 0.7
  const upperBound = guestCount * 1.3

  let similar = events.filter((e: any) => {
    const guestMatch = e.guest_count >= lowerBound && e.guest_count <= upperBound
    const occasionMatch = occasion ? e.occasion === occasion : true
    return guestMatch && occasionMatch
  })

  // Fallback to just guest count match if occasion is too restrictive
  if (similar.length < 3 && occasion) {
    similar = events.filter((e: any) => e.guest_count >= lowerBound && e.guest_count <= upperBound)
  }

  // Fallback to all events if not enough similar ones
  if (similar.length < 3) {
    similar = events.slice(0, 20)
  }

  const confidence: PrepTimeEstimate['confidence'] =
    similar.length >= 10 ? 'high' : similar.length >= 5 ? 'medium' : 'low'

  const avg = (arr: number[]) =>
    arr.length > 0 ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0

  const shopping = avg(
    similar.map((e: any) => e.time_shopping_minutes || 0).filter((v: number) => v > 0)
  )
  const prep = avg(similar.map((e: any) => e.time_prep_minutes || 0).filter((v: number) => v > 0))
  const service = avg(
    similar.map((e: any) => e.time_service_minutes || 0).filter((v: number) => v > 0)
  )
  const travel = avg(
    similar.map((e: any) => e.time_travel_minutes || 0).filter((v: number) => v > 0)
  )
  const reset = avg(similar.map((e: any) => e.time_reset_minutes || 0).filter((v: number) => v > 0))

  // Scale by guest count ratio if we're extrapolating
  const avgGuestCount = avg(
    similar.map((e: any) => e.guest_count || 0).filter((v: number) => v > 0)
  )
  const scaleFactor = avgGuestCount > 0 ? Math.sqrt(guestCount / avgGuestCount) : 1 // sqrt scaling (sublinear)

  const scaledPrep = Math.round(prep * scaleFactor)
  const scaledService = Math.round(service * scaleFactor)

  const similarEvents: SimilarEventSummary[] = similar.slice(0, 5).map((e: any) => ({
    eventId: e.id,
    eventDate: e.event_date,
    guestCount: e.guest_count || 0,
    occasion: e.occasion,
    totalMinutes:
      (e.time_shopping_minutes || 0) +
      (e.time_prep_minutes || 0) +
      (e.time_service_minutes || 0) +
      (e.time_travel_minutes || 0) +
      (e.time_reset_minutes || 0),
  }))

  return {
    estimatedShoppingMinutes: shopping,
    estimatedPrepMinutes: scaledPrep,
    estimatedServiceMinutes: scaledService,
    estimatedTravelMinutes: travel,
    estimatedResetMinutes: reset,
    estimatedTotalMinutes: shopping + scaledPrep + scaledService + travel + reset,
    confidence,
    basedOnEvents: similar.length,
    similarEvents,
  }
}

// ─── Overall prep time intelligence ──────────────────────────────────────────

export async function getPrepTimeIntelligence(): Promise<PrepTimeIntelligence | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { data: events, error } = await supabase
    .from('events')
    .select(
      `
      id, event_date, guest_count, occasion,
      time_shopping_minutes, time_prep_minutes, time_service_minutes,
      time_travel_minutes, time_reset_minutes
    `
    )
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .not('time_prep_minutes', 'is', null)
    .order('event_date', { ascending: true })

  if (error || !events || events.length < 3) return null

  // Phase averages
  const phases = ['shopping', 'prep', 'service', 'travel', 'reset'] as const
  const phaseAverages: PhaseAverage[] = phases.map((phase) => {
    const key = `time_${phase}_minutes` as string
    const values = events.map((e: any) => e[key] || 0).filter((v: number) => v > 0)
    return {
      phase,
      avgMinutes:
        values.length > 0
          ? Math.round(values.reduce((s: number, v: number) => s + v, 0) / values.length)
          : 0,
      minMinutes: values.length > 0 ? Math.min(...values) : 0,
      maxMinutes: values.length > 0 ? Math.max(...values) : 0,
      dataPoints: values.length,
    }
  })

  // By guest count bracket
  const brackets = [
    { label: '1-6 guests', min: 1, max: 6 },
    { label: '7-12 guests', min: 7, max: 12 },
    { label: '13-20 guests', min: 13, max: 20 },
    { label: '21-40 guests', min: 21, max: 40 },
    { label: '41+ guests', min: 41, max: 9999 },
  ]

  const getTotalMinutes = (e: any) =>
    (e.time_shopping_minutes || 0) +
    (e.time_prep_minutes || 0) +
    (e.time_service_minutes || 0) +
    (e.time_travel_minutes || 0) +
    (e.time_reset_minutes || 0)

  const byGuestCountBracket = brackets
    .map((b) => {
      const matching = events.filter(
        (e: any) => (e.guest_count || 0) >= b.min && (e.guest_count || 0) <= b.max
      )
      const totals = matching.map(getTotalMinutes).filter((v: number) => v > 0)
      return {
        bracket: b.label,
        avgTotalMinutes:
          totals.length > 0
            ? Math.round(totals.reduce((s: number, v: number) => s + v, 0) / totals.length)
            : 0,
        eventCount: matching.length,
      }
    })
    .filter((b) => b.eventCount > 0)

  // By occasion
  const occasionMap = new Map<string, { total: number; count: number }>()
  for (const event of events) {
    if (!event.occasion) continue
    const total = getTotalMinutes(event)
    if (total <= 0) continue
    if (!occasionMap.has(event.occasion)) occasionMap.set(event.occasion, { total: 0, count: 0 })
    const o = occasionMap.get(event.occasion)!
    o.total += total
    o.count++
  }

  const byOccasion = Array.from(occasionMap.entries())
    .map(([occasion, data]) => ({
      occasion,
      avgTotalMinutes: Math.round(data.total / data.count),
      eventCount: data.count,
    }))
    .sort((a, b) => b.eventCount - a.eventCount)

  // Efficiency trend (last 10 vs prior 10 events)
  const withTotals = events
    .map((e: any) => ({ ...e, total: getTotalMinutes(e) }))
    .filter((e: any) => e.total > 0)
  const recent10 = withTotals.slice(-10)
  const prior10 = withTotals.slice(-20, -10)
  const recentAvg =
    recent10.length > 0
      ? recent10.reduce((s: number, e: any) => s + e.total, 0) / recent10.length
      : 0
  const priorAvg =
    prior10.length > 0 ? prior10.reduce((s: number, e: any) => s + e.total, 0) / prior10.length : 0
  const efficiencyTrend: PrepTimeIntelligence['efficiencyTrend'] =
    priorAvg > 0 && recentAvg < priorAvg * 0.9
      ? 'improving'
      : priorAvg > 0 && recentAvg > priorAvg * 1.1
        ? 'declining'
        : 'stable'

  // Minutes per guest
  const withGuests = events.filter((e: any) => (e.guest_count || 0) > 0 && getTotalMinutes(e) > 0)
  const avgMinutesPerGuest =
    withGuests.length > 0
      ? Math.round(
          withGuests.reduce((s: number, e: any) => s + getTotalMinutes(e) / e.guest_count, 0) /
            withGuests.length
        )
      : 0

  // Fastest and slowest
  const sorted = [...withTotals].sort((a: any, b: any) => a.total - b.total)
  const fastest =
    sorted.length > 0
      ? {
          eventDate: sorted[0].event_date,
          totalMinutes: sorted[0].total,
          guestCount: sorted[0].guest_count || 0,
        }
      : null
  const slowest =
    sorted.length > 0
      ? {
          eventDate: sorted[sorted.length - 1].event_date,
          totalMinutes: sorted[sorted.length - 1].total,
          guestCount: sorted[sorted.length - 1].guest_count || 0,
        }
      : null

  return {
    phaseAverages,
    byGuestCountBracket,
    byOccasion,
    efficiencyTrend,
    avgMinutesPerGuest,
    fastestEvent: fastest,
    slowestEvent: slowest,
  }
}
