'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ClientIntelligenceContext {
  // Churn risk assessment
  churnRisk: {
    level: 'low' | 'moderate' | 'high' | 'critical'
    score: number // 0-100 (higher = more at risk)
    daysSinceLastEvent: number | null
    avgBookingIntervalDays: number | null
    isOverdue: boolean // past their normal booking interval
    factors: string[]
  }
  // Rebooking prediction
  rebookingPrediction: {
    likelyToRebook: boolean
    predictedNextBookingDays: number | null
    seasonalPattern: string | null // e.g., "books mostly in Q4"
    preferredOccasion: string | null
  }
  // Revenue trajectory
  revenueTrajectory: {
    trend: 'growing' | 'stable' | 'declining' | 'new'
    avgEventValueCents: number
    lastEventValueCents: number | null
    lifetimeValueCents: number
    eventsPerYear: number | null
  }
  // Key insights
  insights: string[]
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getClientIntelligenceContext(
  clientId: string
): Promise<ClientIntelligenceContext | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { data: events, error } = await supabase
    .from('events')
    .select('id, event_date, occasion, quoted_price_cents, guest_count, status, service_style')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .in('status', ['completed', 'confirmed', 'paid', 'in_progress'])
    .not('event_date', 'is', null)
    .order('event_date', { ascending: true })

  if (error || !events || events.length < 2) return null

  const now = Date.now()
  const insights: string[] = []
  const completedEvents = events.filter((e: any) => e.status === 'completed')

  // ─── Booking Interval Analysis ───
  const dates = events
    .map((e: any) => new Date(e.event_date).getTime())
    .sort((a: number, b: number) => a - b)
  const intervals: number[] = []
  for (let i = 1; i < dates.length; i++) {
    const gap = Math.round((dates[i] - dates[i - 1]) / 86400000)
    if (gap > 0 && gap < 365) intervals.push(gap)
  }
  const avgInterval =
    intervals.length >= 2
      ? Math.round(intervals.reduce((s, d) => s + d, 0) / intervals.length)
      : null

  const lastEventDate = dates[dates.length - 1]
  const daysSinceLast = Math.round((now - lastEventDate) / 86400000)
  const isOverdue = avgInterval ? daysSinceLast > avgInterval * 1.5 : daysSinceLast > 120

  // ─── Churn Risk ───
  let churnScore = 0
  const churnFactors: string[] = []

  // Recency factor (0-40)
  if (daysSinceLast > 365) {
    churnScore += 40
    churnFactors.push('No events in over a year')
  } else if (daysSinceLast > 180) {
    churnScore += 30
    churnFactors.push(`${daysSinceLast} days since last event`)
  } else if (daysSinceLast > 90) {
    churnScore += 15
    churnFactors.push(`${daysSinceLast} days since last event`)
  } else {
    churnScore += 5
  }

  // Interval deviation (0-30)
  if (avgInterval && isOverdue) {
    const overdueBy = daysSinceLast - avgInterval
    const overdueRatio = overdueBy / avgInterval
    churnScore += Math.min(30, Math.round(overdueRatio * 20))
    churnFactors.push(`${overdueBy} days past typical booking interval (${avgInterval}d)`)
  }

  // Frequency decline (0-20)
  if (events.length >= 4) {
    const firstHalf = events.slice(0, Math.floor(events.length / 2))
    const secondHalf = events.slice(Math.floor(events.length / 2))
    const firstSpan =
      (new Date(firstHalf[firstHalf.length - 1].event_date).getTime() -
        new Date(firstHalf[0].event_date).getTime()) /
      86400000
    const secondSpan =
      (new Date(secondHalf[secondHalf.length - 1].event_date).getTime() -
        new Date(secondHalf[0].event_date).getTime()) /
      86400000
    const firstRate = firstSpan > 0 ? firstHalf.length / firstSpan : 0
    const secondRate = secondSpan > 0 ? secondHalf.length / secondSpan : 0

    if (firstRate > 0 && secondRate < firstRate * 0.5) {
      churnScore += 20
      churnFactors.push('Booking frequency has declined significantly')
    }
  }

  // Value decline (0-10)
  if (completedEvents.length >= 3) {
    const recent = completedEvents.slice(-2)
    const older = completedEvents.slice(0, -2)
    const recentAvg =
      recent.reduce((s: number, e: any) => s + (e.quoted_price_cents || 0), 0) / recent.length
    const olderAvg =
      older.reduce((s: number, e: any) => s + (e.quoted_price_cents || 0), 0) / older.length
    if (olderAvg > 0 && recentAvg < olderAvg * 0.6) {
      churnScore += 10
      churnFactors.push('Recent event values declining')
    }
  }

  let churnLevel: ClientIntelligenceContext['churnRisk']['level'] = 'low'
  if (churnScore >= 60) churnLevel = 'critical'
  else if (churnScore >= 40) churnLevel = 'high'
  else if (churnScore >= 20) churnLevel = 'moderate'

  if (churnLevel === 'critical') insights.push('High churn risk — consider re-engagement outreach')
  else if (churnLevel === 'high') insights.push('Elevated churn risk — client may be drifting')

  // ─── Rebooking Prediction ───
  const months = events.map((e: any) => new Date(e.event_date).getMonth() + 1)
  const quarterCounts = [0, 0, 0, 0]
  months.forEach((m: number) => quarterCounts[Math.floor((m - 1) / 3)]++)
  const topQuarter = quarterCounts.indexOf(Math.max(...quarterCounts))
  const seasonNames = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)']
  const seasonalPattern = Math.max(...quarterCounts) >= 2 ? seasonNames[topQuarter] : null

  const occasions = events.map((e: any) => e.occasion?.toLowerCase()).filter(Boolean)
  const occasionCounts = new Map<string, number>()
  occasions.forEach((o: string) => occasionCounts.set(o, (occasionCounts.get(o) || 0) + 1))
  let preferredOccasion: string | null = null
  let maxCount = 0
  for (const [occ, count] of occasionCounts) {
    if (count > maxCount && count >= 2) {
      maxCount = count
      preferredOccasion = occ
    }
  }

  const predictedNextDays =
    avgInterval && !isOverdue
      ? Math.max(0, avgInterval - daysSinceLast)
      : avgInterval
        ? Math.round(avgInterval * 0.8)
        : null

  if (seasonalPattern) insights.push(`Tends to book during ${seasonalPattern}`)
  if (preferredOccasion) insights.push(`Most common event type: ${preferredOccasion}`)

  // ─── Revenue Trajectory ───
  const eventValues = completedEvents
    .filter((e: any) => e.quoted_price_cents > 0)
    .map((e: any) => e.quoted_price_cents)

  const avgEventValue =
    eventValues.length > 0
      ? Math.round(eventValues.reduce((s: number, v: number) => s + v, 0) / eventValues.length)
      : 0
  const lastEventValue = eventValues.length > 0 ? eventValues[eventValues.length - 1] : null
  const lifetimeValue = eventValues.reduce((s: number, v: number) => s + v, 0)

  // Trend: compare first half vs second half averages
  let trend: ClientIntelligenceContext['revenueTrajectory']['trend'] = 'new'
  if (eventValues.length >= 4) {
    const half = Math.floor(eventValues.length / 2)
    const firstAvg = eventValues.slice(0, half).reduce((s: number, v: number) => s + v, 0) / half
    const secondAvg =
      eventValues.slice(half).reduce((s: number, v: number) => s + v, 0) /
      (eventValues.length - half)
    if (secondAvg > firstAvg * 1.15) trend = 'growing'
    else if (secondAvg < firstAvg * 0.85) trend = 'declining'
    else trend = 'stable'
  } else if (eventValues.length >= 2) {
    trend = 'stable'
  }

  // Events per year
  const totalSpanDays = dates.length >= 2 ? (dates[dates.length - 1] - dates[0]) / 86400000 : null
  const eventsPerYear =
    totalSpanDays && totalSpanDays > 30
      ? Math.round((events.length / totalSpanDays) * 365 * 10) / 10
      : null

  if (trend === 'growing') insights.push('Revenue per event is trending upward')
  else if (trend === 'declining') insights.push('Revenue per event is declining — review pricing')

  return {
    churnRisk: {
      level: churnLevel,
      score: Math.min(100, churnScore),
      daysSinceLastEvent: daysSinceLast,
      avgBookingIntervalDays: avgInterval,
      isOverdue,
      factors: churnFactors,
    },
    rebookingPrediction: {
      likelyToRebook: churnScore < 40 && events.length >= 2,
      predictedNextBookingDays: predictedNextDays,
      seasonalPattern,
      preferredOccasion,
    },
    revenueTrajectory: {
      trend,
      avgEventValueCents: avgEventValue,
      lastEventValueCents: lastEventValue,
      lifetimeValueCents: lifetimeValue,
      eventsPerYear,
    },
    insights,
  }
}
