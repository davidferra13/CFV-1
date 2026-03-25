'use server'

import { z } from 'zod'
import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import type { RevenueGoalSnapshot } from './types'
import {
  applyPipelineWeight,
  buildRangeProgress,
  buildRevenueGoalRecommendations,
  computeAnnualRunRate,
  computeDinnersNeeded,
  computePaceRatio,
  computeTrend,
  computeYoY,
  filterSmartOpenDates,
  getTypicalBookingDays,
  paceRatioToStatus,
} from './engine'

const RevenueGoalCustomSchema = z
  .object({
    id: z.string().uuid(),
    label: z.string().trim().min(1).max(80),
    target_cents: z.number().int().min(0),
    period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    enabled: z.boolean(),
  })
  .refine((goal) => goal.period_start <= goal.period_end, {
    message: 'period_start must be <= period_end',
  })

type RevenueGoalCustom = z.infer<typeof RevenueGoalCustomSchema>

type RevenueGoalPreferences = {
  revenue_goal_program_enabled: boolean
  target_monthly_revenue_cents: number
  target_annual_revenue_cents: number | null
  revenue_goal_nudge_level: 'gentle' | 'standard' | 'aggressive'
  revenue_goal_custom: RevenueGoalCustom[]
}

type RevenueRangeSignals = {
  eventIds: string[]
  bookedDates: string[]
  realizedCents: number
  quotedCents: number
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function dateRanges(now: Date) {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
  const yearEnd = new Date(Date.UTC(now.getUTCFullYear(), 11, 31))
  return {
    monthStart: isoDate(monthStart),
    monthEnd: isoDate(monthEnd),
    yearStart: isoDate(yearStart),
    yearEnd: isoDate(yearEnd),
  }
}

function parseRevenueGoalCustom(raw: unknown): RevenueGoalCustom[] {
  if (!Array.isArray(raw)) return []
  const parsed = z.array(RevenueGoalCustomSchema).safeParse(raw)
  if (!parsed.success) return []
  return parsed.data
}

function normalizePreferences(row: Record<string, unknown> | null): RevenueGoalPreferences {
  return {
    revenue_goal_program_enabled: (row?.revenue_goal_program_enabled as boolean) ?? false,
    target_monthly_revenue_cents: Number(row?.target_monthly_revenue_cents ?? 1000000),
    target_annual_revenue_cents:
      row?.target_annual_revenue_cents == null ? null : Number(row.target_annual_revenue_cents),
    revenue_goal_nudge_level: (row?.revenue_goal_nudge_level === 'standard' ||
    row?.revenue_goal_nudge_level === 'aggressive'
      ? row.revenue_goal_nudge_level
      : 'gentle') as RevenueGoalPreferences['revenue_goal_nudge_level'],
    revenue_goal_custom: parseRevenueGoalCustom(row?.revenue_goal_custom),
  }
}

async function getPreferencesForTenant(db: any, tenantId: string): Promise<RevenueGoalPreferences> {
  const { data } = await db
    .from('chef_preferences')
    .select(
      'revenue_goal_program_enabled, target_monthly_revenue_cents, target_annual_revenue_cents, revenue_goal_nudge_level, revenue_goal_custom'
    )
    .eq('tenant_id', tenantId)
    .maybeSingle()

  return normalizePreferences((data as Record<string, unknown> | null) ?? null)
}

async function getRangeSignals(
  db: any,
  tenantId: string,
  start: string,
  end: string
): Promise<RevenueRangeSignals> {
  const { data: events } = await db
    .from('events')
    .select('id, event_date, quoted_price_cents')
    .eq('tenant_id', tenantId)
    .gte('event_date', start)
    .lte('event_date', end)
    .not('status', 'eq', 'cancelled')

  const eventRows = (events || []) as Array<{
    id: string
    event_date: string
    quoted_price_cents: number | null
  }>
  const eventIds = eventRows.map((event) => event.id)

  if (eventIds.length === 0) {
    return { eventIds: [], bookedDates: [], realizedCents: 0, quotedCents: 0 }
  }

  const { data: summaries } = await db
    .from('event_financial_summary')
    .select('event_id, total_paid_cents')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  const paidByEvent = new Map<string, number>()
  for (const summary of (summaries || []) as Array<{
    event_id: string | null
    total_paid_cents: number | null
  }>) {
    if (!summary.event_id) continue
    paidByEvent.set(summary.event_id, Math.max(0, summary.total_paid_cents ?? 0))
  }

  let realizedCents = 0
  let quotedCents = 0
  for (const event of eventRows) {
    realizedCents += paidByEvent.get(event.id) ?? 0
    quotedCents += Math.max(0, event.quoted_price_cents ?? 0)
  }

  return {
    eventIds,
    bookedDates: Array.from(new Set(eventRows.map((event) => event.event_date))),
    realizedCents,
    quotedCents,
  }
}

async function getAverageBookingValueCents(db: any, tenantId: string, now: Date): Promise<number> {
  const lookbackStart = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
  const { data: recentEvents } = await db
    .from('events')
    .select('id, quoted_price_cents')
    .eq('tenant_id', tenantId)
    .gte('event_date', isoDate(lookbackStart))
    .lte('event_date', isoDate(now))
    .not('status', 'eq', 'cancelled')

  const events = (recentEvents || []) as Array<{ id: string; quoted_price_cents: number | null }>
  if (events.length === 0) return 150000

  const eventIds = events.map((event) => event.id)
  const { data: summaries } = await db
    .from('event_financial_summary')
    .select('event_id, total_paid_cents')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  const paidValues = (summaries || [])
    .map((summary: { total_paid_cents: number | null }) => summary.total_paid_cents ?? 0)
    .filter((value: number) => value > 0)

  if (paidValues.length > 0) {
    return Math.max(
      1,
      Math.round(
        paidValues.reduce((sum: number, value: number) => sum + value, 0) / paidValues.length
      )
    )
  }

  const quotedValues = events
    .map((event) => event.quoted_price_cents ?? 0)
    .filter((value) => value > 0)

  if (quotedValues.length > 0) {
    return Math.max(
      1,
      Math.round(quotedValues.reduce((sum, value) => sum + value, 0) / quotedValues.length)
    )
  }

  return 150000
}

async function getPipelineSignals(
  db: any,
  tenantId: string,
  start: string,
  end: string
): Promise<{ quotesTotalCents: number; inquiriesTotalCents: number }> {
  const endDateTime = `${end}T23:59:59.999Z`

  const [quotesRes, inquiriesRes] = await Promise.all([
    db
      .from('quotes')
      .select('total_quoted_cents')
      .eq('tenant_id', tenantId)
      .in('status', ['sent', 'viewed'])
      .gte('created_at', `${start}T00:00:00.000Z`)
      .lte('created_at', endDateTime),
    db
      .from('inquiries')
      .select('confirmed_budget_cents')
      .eq('tenant_id', tenantId)
      .in('status', ['new', 'awaiting_client', 'awaiting_chef', 'quoted'])
      .gte('created_at', `${start}T00:00:00.000Z`)
      .lte('created_at', endDateTime),
  ])

  const quotesTotalCents = (quotesRes.data || []).reduce(
    (sum: number, quote: { total_quoted_cents: number | null }) =>
      sum + Math.max(0, quote.total_quoted_cents ?? 0),
    0
  )
  const inquiriesTotalCents = (inquiriesRes.data || []).reduce(
    (sum: number, inquiry: { confirmed_budget_cents: number | null }) =>
      sum + Math.max(0, inquiry.confirmed_budget_cents ?? 0),
    0
  )

  return { quotesTotalCents, inquiriesTotalCents }
}

async function getOpenDatesThisMonth(
  db: any,
  tenantId: string,
  start: string,
  end: string
): Promise<string[]> {
  const { data: events } = await db
    .from('events')
    .select('event_date')
    .eq('tenant_id', tenantId)
    .gte('event_date', start)
    .lte('event_date', end)
    .not('status', 'eq', 'cancelled')

  const booked = new Set<string>(
    (events || []).map((event: { event_date: string }) => event.event_date)
  )
  const openDates: string[] = []

  let cursor = new Date(`${start}T12:00:00.000Z`)
  const last = new Date(`${end}T12:00:00.000Z`)
  while (cursor <= last) {
    const dateStr = isoDate(cursor)
    if (!booked.has(dateStr)) {
      openDates.push(dateStr)
    }
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  }

  return openDates
}

async function getDormantClientNames(db: any, tenantId: string): Promise<string[]> {
  const { data: rows } = await db
    .from('client_financial_summary')
    .select('client_id, lifetime_value_cents')
    .eq('tenant_id', tenantId)
    .eq('is_dormant', true)
    .order('lifetime_value_cents', { ascending: false })
    .limit(5)

  const clientIds = (rows || [])
    .map((row: { client_id: string | null }) => row.client_id)
    .filter(Boolean) as string[]

  if (clientIds.length === 0) return []

  const { data: clients } = await db
    .from('clients')
    .select('id, full_name')
    .eq('tenant_id', tenantId)
    .in('id', clientIds)

  return (clients || []).map((client: { full_name: string }) => client.full_name)
}

// ── Previous month realized revenue (for trend) ──────────────────────────────

async function getPreviousMonthRealizedCents(
  db: any,
  tenantId: string,
  now: Date
): Promise<number> {
  const prevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const prevEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))
  const signals = await getRangeSignals(db, tenantId, isoDate(prevMonth), isoDate(prevEnd))
  return signals.realizedCents
}

// ── Same month last year (for YoY) ───────────────────────────────────────────

async function getLastYearSameMonthRealizedCents(
  db: any,
  tenantId: string,
  now: Date
): Promise<number> {
  const lastYearStart = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1))
  const lastYearEnd = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth() + 1, 0))
  const signals = await getRangeSignals(db, tenantId, isoDate(lastYearStart), isoDate(lastYearEnd))
  return signals.realizedCents
}

// ── Historical event dates (for smart open dates) ────────────────────────────

async function getHistoricalEventDates(db: any, tenantId: string, now: Date): Promise<string[]> {
  const lookbackStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
  const { data } = await db
    .from('events')
    .select('event_date')
    .eq('tenant_id', tenantId)
    .gte('event_date', isoDate(lookbackStart))
    .lte('event_date', isoDate(now))
    .not('status', 'eq', 'cancelled')

  return ((data || []) as Array<{ event_date: string }>).map((e) => e.event_date)
}

async function buildRevenueGoalSnapshotForTenant(
  db: any,
  tenantId: string,
  now: Date,
  prefs: RevenueGoalPreferences
): Promise<RevenueGoalSnapshot> {
  const { monthStart, monthEnd, yearStart, yearEnd } = dateRanges(now)
  const annualTargetCents = prefs.target_annual_revenue_cents ?? null

  const [
    monthlySignals,
    annualSignals,
    monthlyPipeline,
    averageBookingCents,
    openDatesThisMonth,
    dormantClientNames,
    prevMonthRealized,
    lastYearSameMonth,
    historicalDates,
  ] = await Promise.all([
    getRangeSignals(db, tenantId, monthStart, monthEnd),
    getRangeSignals(db, tenantId, yearStart, yearEnd),
    getPipelineSignals(db, tenantId, monthStart, monthEnd),
    getAverageBookingValueCents(db, tenantId, now),
    getOpenDatesThisMonth(db, tenantId, isoDate(now), monthEnd),
    getDormantClientNames(db, tenantId),
    getPreviousMonthRealizedCents(db, tenantId, now),
    getLastYearSameMonthRealizedCents(db, tenantId, now),
    getHistoricalEventDates(db, tenantId, now),
  ])

  const monthlyPipelineWeighted = applyPipelineWeight(
    monthlyPipeline.quotesTotalCents,
    monthlyPipeline.inquiriesTotalCents,
    prefs.revenue_goal_nudge_level
  )
  const monthlyProjectedCents = monthlySignals.realizedCents + monthlyPipelineWeighted

  const monthly = buildRangeProgress({
    start: monthStart,
    end: monthEnd,
    targetCents: prefs.target_monthly_revenue_cents,
    realizedCents: monthlySignals.realizedCents,
    projectedCents: monthlyProjectedCents,
  })

  // Annual run-rate: extrapolate from year-to-date pace
  const annualRunRateCents = computeAnnualRunRate(annualSignals.realizedCents, yearStart, now)

  const annual =
    annualTargetCents == null
      ? null
      : buildRangeProgress({
          start: yearStart,
          end: yearEnd,
          targetCents: annualTargetCents,
          realizedCents: annualSignals.realizedCents,
          projectedCents: Math.max(
            annualSignals.realizedCents + monthlyPipelineWeighted,
            annualRunRateCents
          ),
        })

  const custom = [] as Array<{
    id: string
    label: string
    enabled: boolean
    range: ReturnType<typeof buildRangeProgress>
  }>
  for (const goal of prefs.revenue_goal_custom) {
    const customSignals = await getRangeSignals(db, tenantId, goal.period_start, goal.period_end)
    custom.push({
      id: goal.id,
      label: goal.label,
      enabled: goal.enabled,
      range: buildRangeProgress({
        start: goal.period_start,
        end: goal.period_end,
        targetCents: goal.target_cents,
        realizedCents: customSignals.realizedCents,
        projectedCents: customSignals.realizedCents,
      }),
    })
  }

  const dinnersNeededThisMonth = computeDinnersNeeded(monthly.gapCents, averageBookingCents)

  // Pace tracking
  const monthlyPaceRatio = computePaceRatio(
    monthlySignals.realizedCents,
    prefs.target_monthly_revenue_cents,
    monthStart,
    monthEnd,
    now
  )
  const monthlyPaceStatus = paceRatioToStatus(monthlyPaceRatio)

  // Trend (month-over-month)
  const trend = computeTrend(monthlySignals.realizedCents, prevMonthRealized)

  // Year-over-year same month
  const yoy = computeYoY(monthlySignals.realizedCents, lastYearSameMonth)

  // Smart open dates (filter by chef's typical booking days)
  const typicalBookingDays = getTypicalBookingDays(historicalDates)
  const smartOpenDatesThisMonth = filterSmartOpenDates(openDatesThisMonth, typicalBookingDays)

  return {
    enabled: prefs.revenue_goal_program_enabled,
    nudgeLevel: prefs.revenue_goal_nudge_level,
    monthly,
    annual,
    custom,
    avgBookingValueCents: averageBookingCents,
    dinnersNeededThisMonth,
    openDatesThisMonth,
    smartOpenDatesThisMonth,
    typicalBookingDays,
    recommendations: buildRevenueGoalRecommendations({
      monthlyGapCents: monthly.gapCents,
      monthlyTargetCents: monthly.targetCents,
      dinnersNeededThisMonth,
      avgBookingValueCents: averageBookingCents,
      openDatesThisMonth: smartOpenDatesThisMonth,
      dormantClientNames,
      customGoals: custom,
    }),
    monthlyPaceStatus,
    monthlyPaceRatio,
    annualRunRateCents: annualTargetCents != null ? annualRunRateCents : null,
    trend,
    yoy,
    computedAt: new Date().toISOString(),
  }
}

export async function getRevenueGoalSnapshot(now = new Date()): Promise<RevenueGoalSnapshot> {
  const user = await requireChef()
  const db: any = createServerClient()
  const prefs = await getPreferencesForTenant(db, user.tenantId!)
  return buildRevenueGoalSnapshotForTenant(db, user.tenantId!, now, prefs)
}

export async function getRevenueGoalSnapshotForTenantAdmin(
  tenantId: string,
  now = new Date(),
  dbClient?: any
): Promise<RevenueGoalSnapshot> {
  const db = dbClient ?? createServerClient({ admin: true })
  const prefs = await getPreferencesForTenant(db, tenantId)
  return buildRevenueGoalSnapshotForTenant(db, tenantId, now, prefs)
}
