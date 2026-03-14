// Dashboard-Specific Data Fetching
// Lightweight aggregation queries designed for the dashboard surface.
// Each function is independently authenticated and safe to call in Promise.all.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { formatMinutesAsDuration } from '@/lib/events/time-tracking'

// ============================================
// 1. Outstanding Payments — events with money owed
// ============================================

export async function getOutstandingPayments() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: summaries, error } = await supabase
    .from('event_financial_summary')
    .select('event_id, outstanding_balance_cents, quoted_price_cents, total_paid_cents')
    .eq('tenant_id', user.tenantId!)
    .gt('outstanding_balance_cents', 0)

  if (error || !summaries || summaries.length === 0) {
    if (error) console.error('[getOutstandingPayments] Error:', error)
    return { events: [] as OutstandingEvent[], totalOutstandingCents: 0 }
  }

  const eventIds = summaries.map((s: any) => s.event_id).filter(Boolean) as string[]

  // Only show non-draft, non-cancelled events where payment is expected
  const { data: events } = await supabase
    .from('events')
    .select('id, occasion, event_date, status, client:clients(id, full_name)')
    .eq('tenant_id', user.tenantId!)
    .in('id', eventIds)
    .not('status', 'in', '("draft","cancelled")')
    .order('event_date', { ascending: true })

  const enriched: OutstandingEvent[] = (events || []).map((event: any) => {
    const fin = summaries.find((s: any) => s.event_id === event.id)
    return {
      eventId: event.id,
      occasion: event.occasion,
      eventDate: event.event_date,
      clientName: (event.client as any)?.full_name ?? 'Unknown',
      outstandingCents: fin?.outstanding_balance_cents ?? 0,
    }
  })

  const totalOutstandingCents = enriched.reduce((sum, e) => sum + e.outstandingCents, 0)

  return { events: enriched, totalOutstandingCents }
}

export type OutstandingEvent = {
  eventId: string
  occasion: string | null
  eventDate: string
  clientName: string
  outstandingCents: number
}

// ============================================
// 2. Quote Pipeline Stats
// ============================================

export async function getDashboardQuoteStats() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('status, valid_until, total_quoted_cents, client:clients(full_name)')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['draft', 'sent'])

  if (error) {
    console.error('[getDashboardQuoteStats] Error:', error)
    return {
      draft: 0,
      sent: 0,
      expiringSoon: 0,
      total: 0,
      expiringDetails: [] as { clientName: string; validUntil: string; amountCents: number }[],
    }
  }

  const allQuotes = quotes || []
  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  const draft = allQuotes.filter((q: any) => q.status === 'draft').length
  const sent = allQuotes.filter((q: any) => q.status === 'sent').length

  const expiringQuotes = allQuotes.filter(
    (q: any) => q.status === 'sent' && q.valid_until && q.valid_until <= threeDaysFromNow
  )

  const expiringDetails = expiringQuotes.map((q: any) => ({
    clientName: (q.client as any)?.full_name ?? 'Unknown',
    validUntil: q.valid_until!,
    amountCents: q.total_quoted_cents ?? 0,
  }))

  return { draft, sent, expiringSoon: expiringQuotes.length, total: draft + sent, expiringDetails }
}

// ============================================
// 3. Inquiry Budget Mix — recent lead quality signal
// ============================================

export type DashboardInquiryBudgetMix = {
  exact: number
  range: number
  notSure: number
  unset: number
  known: number
  knownPercent: number
  total: number
  windowDays: number
}

export async function getDashboardInquiryBudgetMix(windowDays = 90) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const safeWindowDays = Number.isFinite(windowDays) && windowDays > 0 ? Math.floor(windowDays) : 90
  const cutoff = new Date(Date.now() - safeWindowDays * 24 * 60 * 60 * 1000).toISOString()

  const { data: inquiries, error } = await supabase
    .from('inquiries')
    .select('confirmed_budget_cents, unknown_fields, created_at')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', cutoff)

  if (error) {
    console.error('[getDashboardInquiryBudgetMix] Error:', error)
    return {
      exact: 0,
      range: 0,
      notSure: 0,
      unset: 0,
      known: 0,
      knownPercent: 0,
      total: 0,
      windowDays: safeWindowDays,
    } as DashboardInquiryBudgetMix
  }

  let exact = 0
  let range = 0
  let notSure = 0
  let unset = 0

  for (const inquiry of inquiries || []) {
    const exactCents = inquiry.confirmed_budget_cents
    const fields =
      inquiry.unknown_fields && typeof inquiry.unknown_fields === 'object'
        ? (inquiry.unknown_fields as Record<string, unknown>)
        : null

    const modeRaw = fields?.budget_mode
    const mode = typeof modeRaw === 'string' ? modeRaw : null
    const rangeRaw = fields?.budget_range
    const budgetRange = typeof rangeRaw === 'string' ? rangeRaw : null
    const unknownExactRaw = fields?.budget_exact_cents
    const unknownExactCents =
      typeof unknownExactRaw === 'number'
        ? unknownExactRaw
        : typeof unknownExactRaw === 'string'
          ? Number.parseInt(unknownExactRaw, 10)
          : NaN

    if (
      (typeof exactCents === 'number' && exactCents > 0) ||
      (Number.isFinite(unknownExactCents) && unknownExactCents > 0) ||
      mode === 'exact'
    ) {
      exact++
      continue
    }

    if (mode === 'not_sure' || budgetRange === 'not_sure') {
      notSure++
      continue
    }

    if (mode === 'range' || (budgetRange && budgetRange.trim().length > 0)) {
      range++
      continue
    }

    unset++
  }

  const total = exact + range + notSure + unset
  const known = exact + range
  const knownPercent = total > 0 ? Math.round((known / total) * 100) : 0

  return { exact, range, notSure, unset, known, knownPercent, total, windowDays: safeWindowDays }
}

// ============================================
// 4. Event Counts — this month + YTD
// ============================================

export async function getDashboardEventCounts() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const now = new Date()
  const yearStart = `${now.getFullYear()}-01-01`
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const { data: events, error } = await supabase
    .from('events')
    .select('id, event_date, status, guest_count')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', yearStart)
    .not('status', 'eq', 'cancelled')

  if (error) {
    console.error('[getDashboardEventCounts] Error:', error)
    return {
      thisMonth: 0,
      ytd: 0,
      completedThisMonth: 0,
      completedYtd: 0,
      upcomingThisMonth: 0,
      totalGuestsThisMonth: 0,
      totalGuestsYtd: 0,
    }
  }

  const allEvents = events || []
  const thisMonthEvents = allEvents.filter((e: any) => e.event_date >= monthStart)
  const today = new Date().toISOString().split('T')[0]
  const completedThisMonth = thisMonthEvents.filter((e: any) => e.status === 'completed').length
  const upcomingThisMonth = thisMonthEvents.filter(
    (e: any) => e.event_date >= today && e.status !== 'completed'
  ).length

  return {
    thisMonth: thisMonthEvents.length,
    ytd: allEvents.length,
    completedThisMonth,
    completedYtd: allEvents.filter((e: any) => e.status === 'completed').length,
    upcomingThisMonth,
    totalGuestsThisMonth: thisMonthEvents.reduce(
      (sum: any, e: any) => sum + (e.guest_count || 0),
      0
    ),
    totalGuestsYtd: allEvents.reduce((sum: any, e: any) => sum + (e.guest_count || 0), 0),
  }
}

// ============================================
// 4. Month-over-Month Revenue Comparison
// ============================================

export async function getMonthOverMonthRevenue() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear

  const prevMonthStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`
  const currentMonthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
  const nextMonthStart =
    currentMonth === 12
      ? `${currentYear + 1}-01-01`
      : `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`

  // Get events for current and previous months
  const { data: events } = await supabase
    .from('events')
    .select('id, event_date')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', prevMonthStart)
    .lt('event_date', nextMonthStart)
    .not('status', 'eq', 'cancelled')

  if (!events || events.length === 0) {
    return {
      currentMonthRevenueCents: 0,
      previousMonthRevenueCents: 0,
      currentMonthProfitCents: 0,
      changePercent: 0,
    }
  }

  const currentIds = events
    .filter((e: any) => e.event_date >= currentMonthStart)
    .map((e: any) => e.id)
  const prevIds = events.filter((e: any) => e.event_date < currentMonthStart).map((e: any) => e.id)
  const allIds = [...currentIds, ...prevIds]

  if (allIds.length === 0) {
    return {
      currentMonthRevenueCents: 0,
      previousMonthRevenueCents: 0,
      currentMonthProfitCents: 0,
      changePercent: 0,
    }
  }

  const { data: summaries } = await supabase
    .from('event_financial_summary')
    .select('event_id, total_paid_cents, profit_cents')
    .eq('tenant_id', user.tenantId!)
    .in('event_id', allIds)

  let currentRevenue = 0
  let prevRevenue = 0
  let currentProfit = 0

  for (const s of summaries || []) {
    if (s.event_id && currentIds.includes(s.event_id)) {
      currentRevenue += s.total_paid_cents ?? 0
      currentProfit += s.profit_cents ?? 0
    } else if (s.event_id && prevIds.includes(s.event_id)) {
      prevRevenue += s.total_paid_cents ?? 0
    }
  }

  const changePercent =
    prevRevenue > 0
      ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100)
      : currentRevenue > 0
        ? 100
        : 0

  return {
    currentMonthRevenueCents: currentRevenue,
    previousMonthRevenueCents: prevRevenue,
    currentMonthProfitCents: currentProfit,
    changePercent,
  }
}

// ============================================
// 5. Current Month Expense Totals
// ============================================

export async function getCurrentMonthExpenseSummary() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const { data, error } = await supabase
    .from('expenses')
    .select('amount_cents, is_business')
    .eq('tenant_id', user.tenantId!)
    .gte('expense_date', monthStart)

  if (error) {
    console.error('[getCurrentMonthExpenseSummary] Error:', error)
    return { totalCents: 0, businessCents: 0 }
  }

  let businessCents = 0
  let totalCents = 0

  for (const exp of data || []) {
    totalCents += exp.amount_cents
    if (exp.is_business) {
      businessCents += exp.amount_cents
    }
  }

  return { totalCents, businessCents }
}

// ============================================
// 6. Next Upcoming Event (when today is free)
// ============================================

export async function getNextUpcomingEvent() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('events')
    .select('id, occasion, event_date, serve_time, guest_count, client:clients(full_name)')
    .eq('tenant_id', user.tenantId!)
    .gt('event_date', today)
    .not('status', 'in', '("cancelled","completed")')
    .order('event_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[getNextUpcomingEvent] Error:', error)
    return null
  }

  if (!data) return null

  return {
    id: data.id,
    occasion: data.occasion,
    eventDate: data.event_date,
    serveTime: data.serve_time,
    guestCount: data.guest_count,
    clientName: (data.client as any)?.full_name ?? 'Unknown',
  }
}

// ============================================
// 7. Dashboard Hours Snapshot + Manual Hours Log
// ============================================

const MANUAL_LABOR_CATEGORIES = [
  'planning',
  'admin',
  'client_comms',
  'marketing',
  'recipe_dev',
  'shopping_sourcing',
  'prep_work',
  'cooking_service',
  'cleanup',
  'travel',
  'learning',
  'charity',
  'other',
] as const

export type ManualLaborCategory = (typeof MANUAL_LABOR_CATEGORIES)[number]

const LogDashboardHoursSchema = z.object({
  minutes: z
    .number()
    .int()
    .positive()
    .max(24 * 60),
  logged_for: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .refine((val) => val <= new Date().toISOString().slice(0, 10), {
      message: 'Cannot log hours for a future date.',
    })
    .optional(),
  category: z.enum(MANUAL_LABOR_CATEGORIES),
  note: z.string().trim().max(500).optional(),
})

export type LogDashboardHoursInput = z.infer<typeof LogDashboardHoursSchema>

export type DashboardHoursEntry = {
  id: string
  minutes: number
  loggedFor: string
  category: ManualLaborCategory | null
  note: string | null
  createdAt: string
}

export type DashboardHoursActivityKey =
  | 'shopping'
  | 'prep'
  | 'travel'
  | 'service'
  | 'packing'
  | 'planning'
  | 'admin'
  | 'client_comms'
  | 'marketing'
  | 'recipe_dev'
  | 'shopping_sourcing'
  | 'prep_work'
  | 'cooking_service'
  | 'cleanup'
  | 'learning'
  | 'manual'
  | 'charity'
  | 'other'

export type DashboardHoursTopActivity = {
  key: DashboardHoursActivityKey
  label: string
  minutes: number
  sharePercent: number
}

export type DashboardHoursCategoryEntry = {
  key: DashboardHoursActivityKey
  label: string
  minutes: number
}

export type DashboardHoursSnapshot = {
  todayMinutes: number
  weekMinutes: number
  allTimeMinutes: number
  topActivity: DashboardHoursTopActivity | null
  recentEntries: DashboardHoursEntry[]
  trackingStreak: number
  todayLogged: boolean
  weekCategoryBreakdown: DashboardHoursCategoryEntry[]
}

type DashboardEventTimeRow = {
  event_date: string
  time_shopping_minutes: number | null
  time_prep_minutes: number | null
  time_travel_minutes: number | null
  time_service_minutes: number | null
  time_reset_minutes: number | null
}

type DashboardManualHoursRow = {
  id: string
  action: string
  created_at: string
  context: unknown
}

const HOURS_ACTIVITY_LABELS: Record<DashboardHoursActivityKey, string> = {
  shopping: 'Shopping',
  prep: 'Prep',
  travel: 'Travel',
  service: 'Execution',
  packing: 'Packing',
  planning: 'Planning & Menu Design',
  admin: 'Admin & Bookkeeping',
  client_comms: 'Client Communication',
  marketing: 'Marketing & Social Media',
  recipe_dev: 'Recipe Development',
  shopping_sourcing: 'Shopping & Sourcing',
  prep_work: 'Prep Work',
  cooking_service: 'Cooking & Service',
  cleanup: 'Cleanup & Reset',
  learning: 'Learning & Training',
  manual: 'Manual Log',
  charity: 'Charity',
  other: 'Other',
}

function computeTrackingStreak(
  loggedDates: Set<string>,
  todayIso: string
): { streak: number; todayLogged: boolean } {
  const todayLogged = loggedDates.has(todayIso)
  const yesterday = new Date(new Date(`${todayIso}T12:00:00Z`).getTime() - 86400000)
    .toISOString()
    .slice(0, 10)
  const startDate = todayLogged ? todayIso : yesterday

  let streak = 0
  let cursor = new Date(`${startDate}T12:00:00Z`)
  while (true) {
    const dateStr = cursor.toISOString().slice(0, 10)
    if (loggedDates.has(dateStr)) {
      streak++
      cursor = new Date(cursor.getTime() - 86400000)
    } else {
      break
    }
  }
  return { streak, todayLogged }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asPositiveMinutes(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value)
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed)
    }
  }
  return null
}

function coerceIsoDate(value: unknown, fallbackIsoDate: string): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }
  return fallbackIsoDate
}

function getEventMinuteBreakdown(event: DashboardEventTimeRow): {
  shopping: number
  prep: number
  travel: number
  service: number
  packing: number
  total: number
} {
  const shopping = event.time_shopping_minutes ?? 0
  const prep = event.time_prep_minutes ?? 0
  const travel = event.time_travel_minutes ?? 0
  const service = event.time_service_minutes ?? 0
  const packing = event.time_reset_minutes ?? 0

  return {
    shopping,
    prep,
    travel,
    service,
    packing,
    total: shopping + prep + travel + service + packing,
  }
}

function buildTopActivity(
  totals: Record<DashboardHoursActivityKey, number>,
  allTimeMinutes: number
): DashboardHoursTopActivity | null {
  let topKey: DashboardHoursActivityKey | null = null
  let topMinutes = 0

  for (const [key, minutes] of Object.entries(totals) as Array<
    [DashboardHoursActivityKey, number]
  >) {
    if (minutes > topMinutes) {
      topKey = key
      topMinutes = minutes
    }
  }

  if (!topKey || topMinutes <= 0 || allTimeMinutes <= 0) return null

  return {
    key: topKey,
    label: HOURS_ACTIVITY_LABELS[topKey],
    minutes: topMinutes,
    sharePercent: Math.round((topMinutes / allTimeMinutes) * 100),
  }
}

export async function getDashboardHoursSnapshot(): Promise<DashboardHoursSnapshot> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const todayIso = new Date().toISOString().slice(0, 10)
  const sevenDaysAgoIso = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const batchSize = 1000

  const [events, manualRows] = await Promise.all([
    (async () => {
      const rows: DashboardEventTimeRow[] = []
      let from = 0

      while (true) {
        const { data, error } = await supabase
          .from('events')
          .select(
            'event_date, time_shopping_minutes, time_prep_minutes, time_travel_minutes, time_service_minutes, time_reset_minutes'
          )
          .eq('tenant_id', user.tenantId!)
          .range(from, from + batchSize - 1)

        if (error) {
          console.error('[getDashboardHoursSnapshot] Event query error:', error)
          break
        }

        const chunk = (data || []) as DashboardEventTimeRow[]
        rows.push(...chunk)
        if (chunk.length < batchSize) break
        from += batchSize
      }

      return rows
    })(),
    (async () => {
      const rows: DashboardManualHoursRow[] = []
      let from = 0

      while (true) {
        const { data, error } = await supabase
          .from('chef_activity_log')
          .select('id, action, created_at, context')
          .eq('tenant_id', user.tenantId!)
          .in('action', ['hours_logged', 'charity_hours_logged'])
          .order('created_at', { ascending: false })
          .range(from, from + batchSize - 1)

        if (error) {
          console.error('[getDashboardHoursSnapshot] Manual query error:', error)
          break
        }

        const chunk = (data || []) as DashboardManualHoursRow[]
        rows.push(...chunk)
        if (chunk.length < batchSize) break
        from += batchSize
      }

      return rows
    })(),
  ])

  let todayMinutes = 0
  let weekMinutes = 0
  let allTimeMinutes = 0
  const emptyTotals = (): Record<DashboardHoursActivityKey, number> => ({
    shopping: 0,
    prep: 0,
    travel: 0,
    service: 0,
    packing: 0,
    planning: 0,
    admin: 0,
    client_comms: 0,
    marketing: 0,
    recipe_dev: 0,
    shopping_sourcing: 0,
    prep_work: 0,
    cooking_service: 0,
    cleanup: 0,
    learning: 0,
    manual: 0,
    charity: 0,
    other: 0,
  })
  const activityTotals = emptyTotals()
  const weekActivityTotals = emptyTotals()
  const manualLogDates = new Set<string>()

  for (const event of events) {
    const breakdown = getEventMinuteBreakdown(event)
    if (breakdown.total <= 0) continue

    allTimeMinutes += breakdown.total
    activityTotals.shopping += breakdown.shopping
    activityTotals.prep += breakdown.prep
    activityTotals.travel += breakdown.travel
    activityTotals.service += breakdown.service
    activityTotals.packing += breakdown.packing

    const inWeek = event.event_date >= sevenDaysAgoIso && event.event_date <= todayIso
    if (inWeek) {
      weekMinutes += breakdown.total
      weekActivityTotals.shopping += breakdown.shopping
      weekActivityTotals.prep += breakdown.prep
      weekActivityTotals.travel += breakdown.travel
      weekActivityTotals.service += breakdown.service
      weekActivityTotals.packing += breakdown.packing
    }
    if (event.event_date === todayIso) {
      todayMinutes += breakdown.total
    }
  }

  const recentEntries: DashboardHoursEntry[] = []
  for (const row of manualRows) {
    const context = asRecord(row.context)
    const minutes = asPositiveMinutes(context?.minutes)
    if (!minutes) continue

    const fallbackDate = row.created_at.slice(0, 10)
    const loggedFor = coerceIsoDate(context?.logged_for, fallbackDate)
    const note =
      typeof context?.note === 'string' && context.note.trim().length > 0
        ? context.note.trim()
        : null

    const rawCategory = typeof context?.category === 'string' ? context.category : null
    let activityKey: DashboardHoursActivityKey
    if (rawCategory && (MANUAL_LABOR_CATEGORIES as ReadonlyArray<string>).includes(rawCategory)) {
      activityKey = rawCategory as ManualLaborCategory
    } else if (row.action === 'charity_hours_logged') {
      activityKey = 'charity'
    } else {
      activityKey = 'manual'
    }
    activityTotals[activityKey] += minutes

    manualLogDates.add(loggedFor)
    allTimeMinutes += minutes

    const inWeek = loggedFor >= sevenDaysAgoIso && loggedFor <= todayIso
    if (inWeek) {
      weekMinutes += minutes
      weekActivityTotals[activityKey] += minutes
    }
    if (loggedFor === todayIso) {
      todayMinutes += minutes
    }

    const category: ManualLaborCategory | null =
      rawCategory && (MANUAL_LABOR_CATEGORIES as ReadonlyArray<string>).includes(rawCategory)
        ? (rawCategory as ManualLaborCategory)
        : null

    if (recentEntries.length < 5) {
      recentEntries.push({
        id: row.id,
        minutes,
        loggedFor,
        category,
        note,
        createdAt: row.created_at,
      })
    }
  }

  const topActivity = buildTopActivity(activityTotals, allTimeMinutes)
  const { streak: trackingStreak, todayLogged } = computeTrackingStreak(manualLogDates, todayIso)

  const weekCategoryBreakdown: DashboardHoursCategoryEntry[] = (
    Object.entries(weekActivityTotals) as Array<[DashboardHoursActivityKey, number]>
  )
    .filter(([, m]) => m > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([key, minutes]) => ({ key, label: HOURS_ACTIVITY_LABELS[key], minutes }))

  return {
    todayMinutes,
    weekMinutes,
    allTimeMinutes,
    topActivity,
    recentEntries,
    trackingStreak,
    todayLogged,
    weekCategoryBreakdown,
  }
}

// ============================================
// 8. Top Events by Profit — this month's best performers
// ============================================

export type TopProfitEvent = {
  eventId: string
  occasion: string | null
  eventDate: string
  clientName: string
  profitCents: number
  profitMarginPercent: number
  revenueCents: number
}

export async function getTopEventsByProfit(limit = 3): Promise<TopProfitEvent[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const { data: events } = await supabase
    .from('events')
    .select('id, occasion, event_date, client:clients(full_name)')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .gte('event_date', monthStart)
    .order('event_date', { ascending: false })

  if (!events || events.length === 0) return []

  const eventIds = events.map((e: any) => e.id)

  const { data: summaries } = await supabase
    .from('event_financial_summary')
    .select('event_id, profit_cents, profit_margin, total_paid_cents')
    .eq('tenant_id', user.tenantId!)
    .in('event_id', eventIds)

  return events
    .map((event: any) => {
      const fin = (summaries || []).find((s: any) => s.event_id === event.id)
      const profitMarginRaw = fin?.profit_margin ?? 0
      return {
        eventId: event.id,
        occasion: event.occasion,
        eventDate: event.event_date,
        clientName: (event.client as any)?.full_name ?? 'Unknown',
        profitCents: fin?.profit_cents ?? 0,
        profitMarginPercent: Math.round(parseFloat(String(profitMarginRaw)) * 1000) / 10,
        revenueCents: fin?.total_paid_cents ?? 0,
      }
    })
    .sort((a: any, b: any) => b.profitCents - a.profitCents)
    .slice(0, limit)
}

// ============================================
// 9. Monthly Average Hourly Rate
// ============================================

export async function getMonthlyAvgHourlyRate(): Promise<number | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const { data: events } = await supabase
    .from('events')
    .select(
      'id, time_shopping_minutes, time_prep_minutes, time_travel_minutes, time_service_minutes, time_reset_minutes'
    )
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .gte('event_date', monthStart)

  if (!events || events.length === 0) return null

  const eventIds = events.map((e: any) => e.id)

  const { data: summaries } = await supabase
    .from('event_financial_summary')
    .select('event_id, profit_cents, tip_amount_cents')
    .eq('tenant_id', user.tenantId!)
    .in('event_id', eventIds)

  let totalRateCents = 0
  let count = 0

  for (const event of events) {
    const totalMinutes =
      (event.time_shopping_minutes ?? 0) +
      (event.time_prep_minutes ?? 0) +
      (event.time_travel_minutes ?? 0) +
      (event.time_service_minutes ?? 0) +
      (event.time_reset_minutes ?? 0)

    if (totalMinutes <= 0) continue

    const fin = (summaries || []).find((s: any) => s.event_id === event.id)
    const netProfitCents = (fin?.profit_cents ?? 0) + (fin?.tip_amount_cents ?? 0)

    if (netProfitCents <= 0) continue

    totalRateCents += Math.round((netProfitCents / totalMinutes) * 60)
    count++
  }

  return count > 0 ? Math.round(totalRateCents / count) : null
}

export async function logDashboardHours(input: LogDashboardHoursInput) {
  const user = await requireChef()
  const validated = LogDashboardHoursSchema.parse(input)

  const loggedFor = validated.logged_for ?? new Date().toISOString().slice(0, 10)
  const category = validated.category
  const note = validated.note?.trim() || null
  const action = category === 'charity' ? 'charity_hours_logged' : 'hours_logged'
  const categoryLabel = HOURS_ACTIVITY_LABELS[category]

  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action,
      domain: 'operational',
      entityType: 'hours_log',
      summary: `Logged ${formatMinutesAsDuration(validated.minutes)} — ${categoryLabel}`,
      context: {
        minutes: validated.minutes,
        logged_for: loggedFor,
        category,
        note,
      },
    })
  } catch (err) {
    console.error('[logDashboardHours] Activity log failed (non-blocking):', err)
  }

  revalidatePath('/dashboard')
  revalidatePath('/activity')

  return {
    success: true,
    minutes: validated.minutes,
    loggedFor,
    category,
  }
}

// ============================================
// REVENUE PROJECTION (Widget Intelligence)
// ============================================

export interface RevenueProjection {
  confirmedCents: number
  pendingCents: number
  pipelineExpectedCents: number
  conversionRate: number
  linearProjectionCents: number
  goalCents: number
  gapCents: number
  eventsNeeded: number
  daysRemaining: number
}

export async function getRevenueProjection(): Promise<RevenueProjection> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  // Get this month's events
  const { data: bookedEvents } = await supabase
    .from('events')
    .select('quoted_price_cents, status')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', startOfMonth)
    .lte('event_date', endOfMonth)
    .neq('status', 'cancelled')

  const confirmedStatuses = ['paid', 'confirmed', 'in_progress', 'completed']
  const pendingStatuses = ['draft', 'proposed', 'accepted']

  const confirmedCents = (bookedEvents ?? [])
    .filter((e: any) => confirmedStatuses.includes(e.status))
    .reduce((sum: number, e: any) => sum + (e.quoted_price_cents ?? 0), 0)

  const pendingCents = (bookedEvents ?? [])
    .filter((e: any) => pendingStatuses.includes(e.status))
    .reduce((sum: number, e: any) => sum + (e.quoted_price_cents ?? 0), 0)

  // Historical conversion rate (last 6 months)
  const sixMonthsAgo = new Date(now)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const { data: historicalEvents } = await supabase
    .from('events')
    .select('status')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', sixMonthsAgo.toISOString())

  const totalHistorical = Math.max(historicalEvents?.length ?? 1, 1)
  const convertedHistorical = (historicalEvents ?? []).filter((e: any) =>
    confirmedStatuses.includes(e.status)
  ).length
  const conversionRate = convertedHistorical / totalHistorical

  // Linear projection from confirmed revenue
  const dailyRate = confirmedCents / Math.max(dayOfMonth, 1)
  const linearProjectionCents = Math.round(dailyRate * daysInMonth)

  // Pipeline expected value
  const pipelineExpectedCents = Math.round(pendingCents * conversionRate)

  // Monthly goal
  const { data: prefs } = await supabase
    .from('chef_preferences')
    .select('target_monthly_revenue_cents')
    .eq('chef_id', user.entityId ?? user.tenantId!)
    .single()

  const goalCents = prefs?.target_monthly_revenue_cents ?? 0
  const gapCents = Math.max(0, goalCents - confirmedCents - pipelineExpectedCents)

  // Events needed to close the gap
  const confirmedCount = (bookedEvents ?? []).filter((e: any) =>
    confirmedStatuses.includes(e.status)
  ).length
  const avgEventCents = confirmedCount > 0 ? Math.round(confirmedCents / confirmedCount) : 0
  const eventsNeeded = avgEventCents > 0 ? Math.ceil(gapCents / avgEventCents) : 0

  return {
    confirmedCents,
    pendingCents,
    pipelineExpectedCents,
    conversionRate: Math.round(conversionRate * 100),
    linearProjectionCents,
    goalCents,
    gapCents,
    eventsNeeded,
    daysRemaining: daysInMonth - dayOfMonth,
  }
}

// ============================================
// COMPARATIVE PERIODS (Widget Intelligence)
// ============================================

export interface ComparativePeriods {
  thisMonth: MonthMetrics
  vsLastMonth: {
    revenueDelta: number
    revenuePercent: number
    eventsDelta: number
  }
  vsSameMonthLastYear: {
    revenueDelta: number
    revenuePercent: number
    eventsDelta: number
  } | null
}

interface MonthMetrics {
  revenueCents: number
  eventCount: number
  avgEventCents: number
}

export async function getComparativePeriods(): Promise<ComparativePeriods> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const now = new Date()

  const [thisMonth, lastMonth, sameMonthLastYear] = await Promise.all([
    fetchMonthRevenue(supabase, user.tenantId!, now),
    fetchMonthRevenue(supabase, user.tenantId!, new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    fetchMonthRevenue(supabase, user.tenantId!, new Date(now.getFullYear() - 1, now.getMonth(), 1)),
  ])

  function pctChange(from: number, to: number): number {
    if (from === 0) return to > 0 ? 100 : 0
    return Math.round(((to - from) / from) * 100)
  }

  return {
    thisMonth,
    vsLastMonth: {
      revenueDelta: thisMonth.revenueCents - lastMonth.revenueCents,
      revenuePercent: pctChange(lastMonth.revenueCents, thisMonth.revenueCents),
      eventsDelta: thisMonth.eventCount - lastMonth.eventCount,
    },
    vsSameMonthLastYear:
      sameMonthLastYear.eventCount > 0
        ? {
            revenueDelta: thisMonth.revenueCents - sameMonthLastYear.revenueCents,
            revenuePercent: pctChange(sameMonthLastYear.revenueCents, thisMonth.revenueCents),
            eventsDelta: thisMonth.eventCount - sameMonthLastYear.eventCount,
          }
        : null,
  }
}

async function fetchMonthRevenue(
  supabase: any,
  tenantId: string,
  monthDate: Date
): Promise<MonthMetrics> {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
    .toISOString()
    .slice(0, 10)
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10)

  const { data } = await supabase
    .from('events')
    .select('quoted_price_cents, status')
    .eq('tenant_id', tenantId)
    .gte('event_date', start)
    .lte('event_date', end)
    .in('status', ['paid', 'confirmed', 'in_progress', 'completed'])

  const revenueCents = (data ?? []).reduce(
    (s: number, e: any) => s + (e.quoted_price_cents ?? 0),
    0
  )
  const eventCount = data?.length ?? 0

  return {
    revenueCents,
    eventCount,
    avgEventCents: eventCount > 0 ? Math.round(revenueCents / eventCount) : 0,
  }
}

// ============================================
// Unlogged Event Hours Detection
// ============================================

export interface UnloggedEvent {
  id: string
  occasion: string
  date: string
  clientName: string
  guestCount: number
  suggestedHours: {
    service: number
    prep: number
    shopping: number
    travel: number
  }
}

export async function getUnloggedEventHours(): Promise<UnloggedEvent[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const twoDaysAgo = new Date()
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

  const { data: recentEvents } = await supabase
    .from('events')
    .select(
      'id, occasion, event_date, guest_count, service_hours, prep_hours, shopping_hours, travel_hours, client:clients(full_name)'
    )
    .eq('tenant_id', user.tenantId!)
    .in('status', ['completed', 'in_progress'])
    .gte('event_date', twoDaysAgo.toISOString().slice(0, 10))
    .lte('event_date', yesterday.toISOString().slice(0, 10))

  return (recentEvents ?? [])
    .filter((e: any) => {
      const totalLogged =
        (e.service_hours ?? 0) +
        (e.prep_hours ?? 0) +
        (e.shopping_hours ?? 0) +
        (e.travel_hours ?? 0)
      return totalLogged === 0
    })
    .map((e: any) => ({
      id: e.id,
      occasion: e.occasion ?? 'Event',
      date: e.event_date,
      clientName: e.client?.full_name ?? 'Client',
      guestCount: e.guest_count ?? 0,
      suggestedHours: {
        service: 4,
        prep: 2,
        shopping: 1,
        travel: 0.5,
      },
    }))
}

// ============================================
// Events Needing AAR (completed, no AAR filed)
// ============================================

export interface EventNeedingAAR {
  id: string
  occasion: string
  date: string
  clientName: string
  hoursSinceCompletion: number
}

export async function getEventsNeedingAAR(): Promise<EventNeedingAAR[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const twoDaysAgo = new Date()
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

  const { data } = await supabase
    .from('events')
    .select('id, occasion, event_date, completed_at, client:clients(full_name)')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .eq('aar_filed', false)
    .gte('event_date', twoDaysAgo.toISOString().slice(0, 10))
    .order('event_date', { ascending: false })
    .limit(3)

  const now = Date.now()

  return (data ?? []).map((e: any) => ({
    id: e.id,
    occasion: e.occasion ?? 'Event',
    date: e.event_date,
    clientName: e.client?.full_name ?? 'Client',
    hoursSinceCompletion: e.completed_at
      ? Math.round((now - new Date(e.completed_at).getTime()) / 3600000)
      : Math.round((now - new Date(e.event_date + 'T20:00:00').getTime()) / 3600000),
  }))
}
