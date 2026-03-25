'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EventProfitability {
  eventId: string
  eventDate: string
  clientName: string
  occasion: string | null
  guestCount: number
  revenueCents: number
  expensesCents: number
  profitCents: number
  marginPercent: number
  totalMinutes: number
  effectiveHourlyRateCents: number // profit / hours worked
  perGuestProfitCents: number
}

export interface ProfitabilityByDimension {
  dimension: string
  avgMarginPercent: number
  avgHourlyRateCents: number
  avgProfitCents: number
  eventCount: number
}

export interface EventProfitabilityResult {
  events: EventProfitability[] // sorted by profitability
  topPerformers: EventProfitability[]
  bottomPerformers: EventProfitability[]
  byOccasion: ProfitabilityByDimension[]
  byServiceStyle: ProfitabilityByDimension[]
  byGuestBracket: ProfitabilityByDimension[]
  avgMarginPercent: number
  avgEffectiveHourlyRateCents: number
  totalProfitCents: number
  mostProfitableOccasion: string | null
  leastProfitableOccasion: string | null
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getEventProfitability(): Promise<EventProfitabilityResult | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch completed events with time data
  const { data: events, error } = await db
    .from('events')
    .select(
      `
      id, event_date, quoted_price_cents, guest_count, occasion, service_style,
      time_shopping_minutes, time_prep_minutes, time_service_minutes,
      time_travel_minutes, time_reset_minutes,
      client:clients(full_name)
    `
    )
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .not('quoted_price_cents', 'is', null)
    .gt('quoted_price_cents', 0)
    .order('event_date', { ascending: false })

  if (error || !events || events.length < 3) return null

  // Fetch expenses for all these events
  const eventIds = events.map((e: any) => e.id)
  const { data: expenses } = await db
    .from('expenses')
    .select('event_id, amount_cents')
    .in('event_id', eventIds)

  const expenseByEvent = new Map<string, number>()
  for (const exp of expenses || []) {
    expenseByEvent.set(
      exp.event_id,
      (expenseByEvent.get(exp.event_id) || 0) + (exp.amount_cents || 0)
    )
  }

  // Build profitability records
  const profitRecords: EventProfitability[] = []

  for (const event of events) {
    const revenue = event.quoted_price_cents || 0
    const expenseCents = expenseByEvent.get(event.id) || 0
    const profit = revenue - expenseCents
    const margin = revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0

    const totalMinutes =
      (event.time_shopping_minutes || 0) +
      (event.time_prep_minutes || 0) +
      (event.time_service_minutes || 0) +
      (event.time_travel_minutes || 0) +
      (event.time_reset_minutes || 0)

    const totalHours = totalMinutes / 60
    const hourlyRate = totalHours > 0 ? Math.round(profit / totalHours) : 0
    const guestCount = event.guest_count || 1
    const perGuestProfit = Math.round(profit / guestCount)

    profitRecords.push({
      eventId: event.id,
      eventDate: event.event_date,
      clientName: (event.client as any)?.full_name || 'Unknown',
      occasion: event.occasion,
      guestCount,
      revenueCents: revenue,
      expensesCents: expenseCents,
      profitCents: profit,
      marginPercent: margin,
      totalMinutes,
      effectiveHourlyRateCents: hourlyRate,
      perGuestProfitCents: perGuestProfit,
    })
  }

  // Sort by margin for top/bottom
  const byMargin = [...profitRecords].sort((a, b) => b.marginPercent - a.marginPercent)
  const topPerformers = byMargin.slice(0, 5)
  const bottomPerformers = byMargin.slice(-5).reverse()

  // By occasion
  const byOccasion = aggregateByDimension(profitRecords, (e) => e.occasion || 'unspecified')
  // By guest bracket
  const byGuestBracket = aggregateByDimension(profitRecords, (e) => {
    if (e.guestCount <= 6) return '1-6 guests'
    if (e.guestCount <= 12) return '7-12 guests'
    if (e.guestCount <= 20) return '13-20 guests'
    if (e.guestCount <= 40) return '21-40 guests'
    return '41+ guests'
  })

  // Averages
  const avgMargin =
    profitRecords.length > 0
      ? Math.round(
          (profitRecords.reduce((s, e) => s + e.marginPercent, 0) / profitRecords.length) * 10
        ) / 10
      : 0

  const withHourly = profitRecords.filter((e) => e.totalMinutes > 0)
  const avgHourly =
    withHourly.length > 0
      ? Math.round(
          withHourly.reduce((s, e) => s + e.effectiveHourlyRateCents, 0) / withHourly.length
        )
      : 0

  const totalProfit = profitRecords.reduce((s, e) => s + e.profitCents, 0)

  const sortedOccasions = [...byOccasion].sort((a, b) => b.avgMarginPercent - a.avgMarginPercent)
  const mostProfitable = sortedOccasions.length > 0 ? sortedOccasions[0].dimension : null
  const leastProfitable =
    sortedOccasions.length > 1 ? sortedOccasions[sortedOccasions.length - 1].dimension : null

  return {
    events: profitRecords.slice(0, 30),
    topPerformers,
    bottomPerformers,
    byOccasion,
    byServiceStyle: [], // populated below if data exists
    byGuestBracket,
    avgMarginPercent: avgMargin,
    avgEffectiveHourlyRateCents: avgHourly,
    totalProfitCents: totalProfit,
    mostProfitableOccasion: mostProfitable,
    leastProfitableOccasion: leastProfitable,
  }
}

function aggregateByDimension(
  records: EventProfitability[],
  getKey: (e: EventProfitability) => string
): ProfitabilityByDimension[] {
  const map = new Map<string, { margins: number[]; hourlyRates: number[]; profits: number[] }>()

  for (const r of records) {
    const key = getKey(r)
    if (!map.has(key)) map.set(key, { margins: [], hourlyRates: [], profits: [] })
    const bucket = map.get(key)!
    bucket.margins.push(r.marginPercent)
    if (r.totalMinutes > 0) bucket.hourlyRates.push(r.effectiveHourlyRateCents)
    bucket.profits.push(r.profitCents)
  }

  return Array.from(map.entries())
    .filter(([, v]) => v.margins.length >= 2)
    .map(([dimension, v]) => ({
      dimension,
      avgMarginPercent:
        Math.round((v.margins.reduce((s, m) => s + m, 0) / v.margins.length) * 10) / 10,
      avgHourlyRateCents:
        v.hourlyRates.length > 0
          ? Math.round(v.hourlyRates.reduce((s, r) => s + r, 0) / v.hourlyRates.length)
          : 0,
      avgProfitCents: Math.round(v.profits.reduce((s, p) => s + p, 0) / v.profits.length),
      eventCount: v.margins.length,
    }))
    .sort((a, b) => b.avgMarginPercent - a.avgMarginPercent)
}
