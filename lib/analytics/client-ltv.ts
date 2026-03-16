// Client Intelligence - LTV and Churn Prediction
// Pure deterministic calculations from existing data. No AI.
// Formula > AI: all calculations are math-based.

'use server'

import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'

// ============================================
// TYPES
// ============================================

export interface ClientLTV {
  clientId: string
  clientName: string
  totalRevenueCents: number
  totalEventCount: number
  avgRevenuPerEventCents: number
  firstEventDate: string | null
  lastEventDate: string | null
  tenureDays: number
  estimatedAnnualValueCents: number // projected from historical average
}

export type ChurnRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface ChurnPrediction {
  clientId: string
  clientName: string
  riskLevel: ChurnRiskLevel
  riskScore: number // 0-100, higher = more likely to churn
  daysSinceLastBooking: number
  totalBookings: number
  avgDaysBetweenBookings: number
  trendDirection: 'increasing' | 'stable' | 'decreasing' // booking frequency trend
  lastEventDate: string | null
  reasoning: string
}

// ============================================
// HELPERS
// ============================================

function daysBetween(a: string, b: string): number {
  const d1 = new Date(a)
  const d2 = new Date(b)
  return Math.abs(Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)))
}

function computeTrend(eventDates: string[]): 'increasing' | 'stable' | 'decreasing' {
  if (eventDates.length < 3) return 'stable'

  // Compare average gap in first half vs second half
  const sorted = [...eventDates].sort()
  const mid = Math.floor(sorted.length / 2)

  const firstHalfGaps: number[] = []
  for (let i = 1; i < mid; i++) {
    firstHalfGaps.push(daysBetween(sorted[i - 1], sorted[i]))
  }

  const secondHalfGaps: number[] = []
  for (let i = mid + 1; i < sorted.length; i++) {
    secondHalfGaps.push(daysBetween(sorted[i - 1], sorted[i]))
  }

  if (firstHalfGaps.length === 0 || secondHalfGaps.length === 0) return 'stable'

  const avgFirst = firstHalfGaps.reduce((a, b) => a + b, 0) / firstHalfGaps.length
  const avgSecond = secondHalfGaps.reduce((a, b) => a + b, 0) / secondHalfGaps.length

  // If gaps are getting smaller, frequency is increasing (good)
  // If gaps are getting larger, frequency is decreasing (churn risk)
  const changeRatio = avgSecond / avgFirst
  if (changeRatio < 0.8) return 'increasing'
  if (changeRatio > 1.3) return 'decreasing'
  return 'stable'
}

function computeChurnRisk(
  daysSinceLast: number,
  avgGapDays: number,
  totalBookings: number,
  trend: 'increasing' | 'stable' | 'decreasing'
): { level: ChurnRiskLevel; score: number; reasoning: string } {
  let score = 0
  const reasons: string[] = []

  // Factor 1: How long since last booking relative to their average gap
  if (avgGapDays > 0) {
    const gapRatio = daysSinceLast / avgGapDays
    if (gapRatio > 3) {
      score += 40
      reasons.push(`${daysSinceLast} days since last booking (3x their average gap)`)
    } else if (gapRatio > 2) {
      score += 25
      reasons.push(`${daysSinceLast} days since last booking (2x their average gap)`)
    } else if (gapRatio > 1.5) {
      score += 10
      reasons.push(`${daysSinceLast} days since last booking (1.5x their average gap)`)
    }
  } else if (daysSinceLast > 180) {
    score += 35
    reasons.push(`${daysSinceLast} days since their only booking`)
  }

  // Factor 2: Absolute time since last booking
  if (daysSinceLast > 365) {
    score += 25
    reasons.push('Over a year since last booking')
  } else if (daysSinceLast > 180) {
    score += 15
    reasons.push('Over 6 months since last booking')
  } else if (daysSinceLast > 90) {
    score += 5
    reasons.push('Over 3 months since last booking')
  }

  // Factor 3: Trend direction
  if (trend === 'decreasing') {
    score += 20
    reasons.push('Booking frequency is declining')
  } else if (trend === 'increasing') {
    score -= 10
    reasons.push('Booking frequency is increasing')
  }

  // Factor 4: Total bookings (more bookings = more established relationship)
  if (totalBookings >= 5) {
    score -= 10
    reasons.push('Strong booking history (5+ events)')
  } else if (totalBookings === 1) {
    score += 10
    reasons.push('Only 1 booking on record')
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score))

  let level: ChurnRiskLevel
  if (score >= 70) level = 'critical'
  else if (score >= 45) level = 'high'
  else if (score >= 20) level = 'medium'
  else level = 'low'

  return { level, score, reasoning: reasons.join('. ') }
}

// ============================================
// ACTIONS
// ============================================

/**
 * Calculate lifetime value for a specific client.
 * Sum of all payment ledger entries, with projected annual value.
 */
export async function calculateClientLTV(clientId: string): Promise<ClientLTV> {
  const user = await requirePro('client-intelligence')
  const supabase = createServerClient()

  // Get client info
  const { data: client } = await supabase
    .from('clients')
    .select('id, full_name, first_event_date, last_event_date, total_events_count')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) throw new Error('Client not found')

  // Get all payment entries for this client
  const { data: ledger } = await supabase
    .from('ledger_entries')
    .select('amount_cents, is_refund')
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', clientId)
    .in('entry_type', ['payment', 'deposit', 'installment', 'final_payment', 'add_on', 'credit'])

  const totalRevenueCents = (ledger ?? []).reduce((sum, e) => {
    return sum + (e.is_refund ? -e.amount_cents : e.amount_cents)
  }, 0)

  const totalEventCount = client.total_events_count ?? 0
  const avgRevenuPerEventCents =
    totalEventCount > 0 ? Math.round(totalRevenueCents / totalEventCount) : 0

  const firstDate = client.first_event_date
  const lastDate = client.last_event_date
  const tenureDays = firstDate && lastDate ? daysBetween(firstDate, lastDate) : 0

  // Project annual value: (total revenue / tenure in days) * 365
  // For clients with less than 90 days of tenure, use event average instead
  let estimatedAnnualValueCents = 0
  if (tenureDays >= 90 && totalRevenueCents > 0) {
    estimatedAnnualValueCents = Math.round((totalRevenueCents / tenureDays) * 365)
  } else if (totalEventCount > 0) {
    // Assume ~4 events per year as baseline for new clients
    estimatedAnnualValueCents = avgRevenuPerEventCents * Math.min(totalEventCount, 4)
  }

  return {
    clientId: client.id,
    clientName: client.full_name,
    totalRevenueCents,
    totalEventCount,
    avgRevenuPerEventCents,
    firstEventDate: firstDate,
    lastEventDate: lastDate,
    tenureDays,
    estimatedAnnualValueCents,
  }
}

/**
 * Predict churn risk for a specific client.
 * Based on recency, frequency, and trend of bookings. Pure math.
 */
export async function predictChurnRisk(clientId: string): Promise<ChurnPrediction> {
  const user = await requirePro('client-intelligence')
  const supabase = createServerClient()

  // Get client info
  const { data: client } = await supabase
    .from('clients')
    .select('id, full_name, last_event_date, total_events_count')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) throw new Error('Client not found')

  // Get all event dates for this client
  const { data: events } = await supabase
    .from('events')
    .select('event_date')
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', clientId)
    .eq('status', 'completed')
    .order('event_date')

  const eventDates = (events ?? []).map((e) => e.event_date).filter(Boolean) as string[]
  const totalBookings = eventDates.length
  const lastEventDate = client.last_event_date

  const now = new Date().toISOString().slice(0, 10)
  const daysSinceLastBooking = lastEventDate ? daysBetween(lastEventDate, now) : 999

  // Calculate average gap between bookings
  let avgDaysBetweenBookings = 0
  if (eventDates.length >= 2) {
    const gaps: number[] = []
    for (let i = 1; i < eventDates.length; i++) {
      gaps.push(daysBetween(eventDates[i - 1], eventDates[i]))
    }
    avgDaysBetweenBookings = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)
  }

  const trendDirection = computeTrend(eventDates)

  const { level, score, reasoning } = computeChurnRisk(
    daysSinceLastBooking,
    avgDaysBetweenBookings,
    totalBookings,
    trendDirection
  )

  return {
    clientId: client.id,
    clientName: client.full_name,
    riskLevel: level,
    riskScore: score,
    daysSinceLastBooking,
    totalBookings,
    avgDaysBetweenBookings,
    trendDirection,
    lastEventDate,
    reasoning,
  }
}

/**
 * Get churn predictions for all active clients, sorted by risk.
 */
export async function getAllChurnPredictions(): Promise<ChurnPrediction[]> {
  const user = await requirePro('client-intelligence')
  const supabase = createServerClient()

  const { data: clients } = await supabase
    .from('clients')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'active')

  if (!clients?.length) return []

  const predictions: ChurnPrediction[] = []
  for (const client of clients) {
    try {
      const prediction = await predictChurnRisk(client.id)
      predictions.push(prediction)
    } catch {
      // Skip clients that fail (e.g. no events)
    }
  }

  return predictions.sort((a, b) => b.riskScore - a.riskScore)
}

/**
 * Get LTV for all active clients, sorted by highest value.
 */
export async function getAllClientLTV(): Promise<ClientLTV[]> {
  const user = await requirePro('client-intelligence')
  const supabase = createServerClient()

  const { data: clients } = await supabase
    .from('clients')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'active')

  if (!clients?.length) return []

  const ltvs: ClientLTV[] = []
  for (const client of clients) {
    try {
      const ltv = await calculateClientLTV(client.id)
      ltvs.push(ltv)
    } catch {
      // Skip clients that fail
    }
  }

  return ltvs.sort((a, b) => b.totalRevenueCents - a.totalRevenueCents)
}
