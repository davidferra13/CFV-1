'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RebookingPrediction {
  clientId: string
  clientName: string
  rebookingScore: number // 0-100
  likelihood: 'very_likely' | 'likely' | 'possible' | 'unlikely'
  avgDaysBetweenEvents: number
  daysSinceLastEvent: number
  totalEvents: number
  predictedNextBookingDate: string | null // ISO date
  factors: string[]
}

export interface RebookingInsights {
  predictions: RebookingPrediction[]
  upcomingRebookers: RebookingPrediction[] // likely to rebook within 30 days
  overdueRebookers: RebookingPrediction[] // past their typical interval
  avgRebookingIntervalDays: number
  repeatClientRate: number // % of clients with 2+ events
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getRebookingPredictions(): Promise<RebookingInsights | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch clients with their completed events
  const { data: clients, error } = await db
    .from('clients')
    .select(
      'id, full_name, total_events_count, last_event_date, first_event_date, status, loyalty_tier'
    )
    .eq('tenant_id', tenantId)
    .gt('total_events_count', 0)

  if (error || !clients || clients.length === 0) return null

  // Fetch completed event dates per client for interval calculation
  const { data: events } = await db
    .from('events')
    .select('client_id, event_date')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .order('event_date', { ascending: true })

  const eventsByClient = new Map<string, string[]>()
  for (const event of events || []) {
    if (!event.client_id) continue
    if (!eventsByClient.has(event.client_id)) eventsByClient.set(event.client_id, [])
    eventsByClient.get(event.client_id)!.push(event.event_date)
  }

  const now = Date.now()
  const predictions: RebookingPrediction[] = []
  let totalIntervals = 0
  let intervalCount = 0

  for (const client of clients) {
    const eventDates = eventsByClient.get(client.id) || []
    const totalEvents = eventDates.length || client.total_events_count || 0
    if (totalEvents < 1) continue

    // Calculate average interval between events
    let avgDaysBetween = 0
    if (eventDates.length >= 2) {
      const intervals: number[] = []
      for (let i = 1; i < eventDates.length; i++) {
        const diff =
          (new Date(eventDates[i]).getTime() - new Date(eventDates[i - 1]).getTime()) / 86400000
        intervals.push(diff)
      }
      avgDaysBetween = Math.round(intervals.reduce((s, d) => s + d, 0) / intervals.length)
      totalIntervals += avgDaysBetween
      intervalCount++
    }

    const lastEventDate = client.last_event_date || eventDates[eventDates.length - 1]
    const daysSinceLast = lastEventDate
      ? Math.floor((now - new Date(lastEventDate).getTime()) / 86400000)
      : 999

    // Score calculation (0-100)
    const factors: string[] = []
    let score = 0

    // Repeat history (0-35 pts)
    if (totalEvents >= 5) {
      score += 35
      factors.push(`${totalEvents} past events (strong repeat)`)
    } else if (totalEvents >= 3) {
      score += 25
      factors.push(`${totalEvents} past events (solid repeat)`)
    } else if (totalEvents >= 2) {
      score += 15
      factors.push(`${totalEvents} past events`)
    } else {
      score += 5
      factors.push('First-time client')
    }

    // Recency (0-30 pts) - more recent = higher score
    if (daysSinceLast <= 30) {
      score += 30
      factors.push('Very recent (within 30 days)')
    } else if (daysSinceLast <= 60) {
      score += 25
      factors.push('Recent (within 60 days)')
    } else if (daysSinceLast <= 120) {
      score += 15
      factors.push('Moderately recent')
    } else if (daysSinceLast <= 180) {
      score += 8
      factors.push('6+ months ago')
    } else {
      score += 0
      factors.push(`${daysSinceLast} days since last event`)
    }

    // Regularity (0-20 pts) - consistent interval = higher score
    if (avgDaysBetween > 0 && eventDates.length >= 3) {
      const intervals: number[] = []
      for (let i = 1; i < eventDates.length; i++) {
        intervals.push(
          (new Date(eventDates[i]).getTime() - new Date(eventDates[i - 1]).getTime()) / 86400000
        )
      }
      const variance =
        intervals.reduce((s, d) => s + Math.pow(d - avgDaysBetween, 2), 0) / intervals.length
      const cv = Math.sqrt(variance) / avgDaysBetween // coefficient of variation
      if (cv < 0.3) {
        score += 20
        factors.push('Very regular booking pattern')
      } else if (cv < 0.6) {
        score += 12
        factors.push('Somewhat regular pattern')
      } else {
        score += 5
        factors.push('Irregular booking pattern')
      }
    }

    // Loyalty tier bonus (0-15 pts)
    if (client.loyalty_tier === 'platinum') {
      score += 15
      factors.push('Platinum loyalty')
    } else if (client.loyalty_tier === 'gold') {
      score += 10
      factors.push('Gold loyalty')
    } else if (client.loyalty_tier === 'silver') {
      score += 5
      factors.push('Silver loyalty')
    }

    score = Math.min(100, score)

    // Predict next booking date
    let predictedNextBookingDate: string | null = null
    if (avgDaysBetween > 0 && lastEventDate) {
      const predicted = new Date(new Date(lastEventDate).getTime() + avgDaysBetween * 86400000)
      if (predicted.getTime() > now - 30 * 86400000) {
        // only show if not too far in the past
        predictedNextBookingDate = predicted.toISOString().split('T')[0]
      }
    }

    const likelihood: RebookingPrediction['likelihood'] =
      score >= 75 ? 'very_likely' : score >= 50 ? 'likely' : score >= 30 ? 'possible' : 'unlikely'

    predictions.push({
      clientId: client.id,
      clientName: client.full_name || 'Unknown',
      rebookingScore: score,
      likelihood,
      avgDaysBetweenEvents: avgDaysBetween,
      daysSinceLastEvent: daysSinceLast,
      totalEvents,
      predictedNextBookingDate,
      factors,
    })
  }

  // Sort by score descending
  predictions.sort((a, b) => b.rebookingScore - a.rebookingScore)

  // Identify clients likely to rebook soon (within 30 days of their predicted date)
  const upcomingRebookers = predictions.filter((p) => {
    if (!p.predictedNextBookingDate) return false
    const predicted = new Date(p.predictedNextBookingDate).getTime()
    const daysUntil = (predicted - now) / 86400000
    return daysUntil >= -7 && daysUntil <= 30
  })

  // Identify overdue rebookers (past their typical interval)
  const overdueRebookers = predictions
    .filter((p) => {
      if (p.avgDaysBetweenEvents <= 0) return false
      return p.daysSinceLastEvent > p.avgDaysBetweenEvents * 1.2
    })
    .filter((p) => p.rebookingScore >= 30) // only worth flagging if they're at least possible

  const repeatClients = clients.filter((c: any) => (c.total_events_count || 0) >= 2).length
  const repeatClientRate =
    clients.length > 0 ? Math.round((repeatClients / clients.length) * 100) : 0

  return {
    predictions: predictions.slice(0, 25),
    upcomingRebookers,
    overdueRebookers,
    avgRebookingIntervalDays: intervalCount > 0 ? Math.round(totalIntervals / intervalCount) : 0,
    repeatClientRate,
  }
}
