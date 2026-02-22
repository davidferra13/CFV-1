'use server'

// Per-Client Profitability Analysis
// Computes margin, food cost %, and hourly rate trends for a specific client
// across all their completed events, for display on the client detail page.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export type ClientProfitabilityHistory = {
  avgMarginPercent: number | null
  avgFoodCostPercent: number | null
  avgHourlyRateCents: number | null
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data'
  eventCount: number
  events: Array<{
    eventId: string
    occasion: string | null
    eventDate: string
    marginPercent: number
    foodCostPercent: number
    profitCents: number
  }>
}

export async function getClientProfitabilityHistory(
  clientId: string
): Promise<ClientProfitabilityHistory> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get all completed events for this client
  const { data: events } = await supabase
    .from('events')
    .select(
      'id, occasion, event_date, time_shopping_minutes, time_prep_minutes, time_travel_minutes, time_service_minutes, time_reset_minutes'
    )
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', clientId)
    .eq('status', 'completed')
    .order('event_date', { ascending: true })

  if (!events || events.length === 0) {
    return {
      avgMarginPercent: null,
      avgFoodCostPercent: null,
      avgHourlyRateCents: null,
      trend: 'insufficient_data',
      eventCount: 0,
      events: [],
    }
  }

  const eventIds = events.map((e) => e.id)

  const { data: summaries } = await supabase
    .from('event_financial_summary')
    .select('event_id, profit_margin, food_cost_percentage, profit_cents, tip_amount_cents')
    .eq('tenant_id', user.tenantId!)
    .in('event_id', eventIds)

  const enriched = events
    .map((event) => {
      const fin = (summaries || []).find((s: any) => s.event_id === event.id)
      const marginRaw = fin?.profit_margin ?? 0
      const foodCostRaw = fin?.food_cost_percentage ?? 0
      return {
        eventId: event.id,
        occasion: event.occasion,
        eventDate: event.event_date,
        marginPercent: parseFloat((parseFloat(String(marginRaw)) * 100).toFixed(1)),
        foodCostPercent: parseFloat((parseFloat(String(foodCostRaw)) * 100).toFixed(1)),
        profitCents: fin?.profit_cents ?? 0,
        tipCents: fin?.tip_amount_cents ?? 0,
        totalMinutes:
          (event.time_shopping_minutes ?? 0) +
          (event.time_prep_minutes ?? 0) +
          (event.time_travel_minutes ?? 0) +
          (event.time_service_minutes ?? 0) +
          (event.time_reset_minutes ?? 0),
      }
    })
    .filter((e) => e.profitCents > 0 || e.marginPercent !== 0)

  if (enriched.length === 0) {
    return {
      avgMarginPercent: null,
      avgFoodCostPercent: null,
      avgHourlyRateCents: null,
      trend: 'insufficient_data',
      eventCount: events.length,
      events: [],
    }
  }

  const avgMarginPercent = parseFloat(
    (enriched.reduce((s, e) => s + e.marginPercent, 0) / enriched.length).toFixed(1)
  )
  const avgFoodCostPercent = parseFloat(
    (enriched.reduce((s, e) => s + e.foodCostPercent, 0) / enriched.length).toFixed(1)
  )

  // Hourly rate: events that have time data
  const withTime = enriched.filter((e) => e.totalMinutes > 0)
  const avgHourlyRateCents =
    withTime.length > 0
      ? Math.round(
          withTime.reduce((s, e) => {
            const net = e.profitCents + e.tipCents
            return s + (net > 0 ? Math.round((net / e.totalMinutes) * 60) : 0)
          }, 0) / withTime.length
        )
      : null

  // Trend: compare first half vs second half of events
  let trend: ClientProfitabilityHistory['trend'] = 'stable'
  if (enriched.length >= 4) {
    const mid = Math.floor(enriched.length / 2)
    const firstHalfAvg = enriched.slice(0, mid).reduce((s, e) => s + e.marginPercent, 0) / mid
    const secondHalfAvg =
      enriched.slice(mid).reduce((s, e) => s + e.marginPercent, 0) / (enriched.length - mid)
    const diff = secondHalfAvg - firstHalfAvg
    if (diff >= 3) trend = 'improving'
    else if (diff <= -3) trend = 'declining'
    else trend = 'stable'
  } else {
    trend = 'insufficient_data'
  }

  return {
    avgMarginPercent,
    avgFoodCostPercent,
    avgHourlyRateCents,
    trend,
    eventCount: enriched.length,
    events: enriched.map((e) => ({
      eventId: e.eventId,
      occasion: e.occasion,
      eventDate: e.eventDate,
      marginPercent: e.marginPercent,
      foodCostPercent: e.foodCostPercent,
      profitCents: e.profitCents,
    })),
  }
}
