'use server'

// Saturation Tracking - Server Actions
// Computes daily/weekly/monthly capacity saturation from events and capacity config.
// Auth-gated via requireChef(), tenant-scoped.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type {
  SaturationDay,
  SaturationWeek,
  SaturationMonth,
  CapacityConfig,
  CapacityConfigInput,
  SaturationWarning,
  SaturationTrends,
  SaturationTrendPoint,
} from './saturation-types'

// ── Helpers ──────────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatDate(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return formatDate(new Date(y, m - 1, d + days))
}

function getDayName(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return DAY_NAMES[d.getDay()]
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function deriveStatus(percent: number): 'low' | 'moderate' | 'high' | 'critical' {
  if (percent >= 85) return 'critical'
  if (percent >= 65) return 'high'
  if (percent >= 35) return 'moderate'
  return 'low'
}

function deriveDayStatus(
  eventCount: number,
  maxEvents: number,
  isBlocked: boolean
): SaturationDay['status'] {
  if (isBlocked) return 'blocked'
  if (eventCount > maxEvents) return 'overbooked'
  if (eventCount === maxEvents) return 'at_capacity'
  if (eventCount >= maxEvents * 0.75) return 'busy'
  if (eventCount >= maxEvents * 0.5) return 'moderate'
  if (eventCount > 0) return 'light'
  return 'available'
}

// ── Default config values ────────────────────────────────────────────────────────

const DEFAULT_MAX_EVENTS_PER_DAY = 2
const DEFAULT_MAX_EVENTS_PER_WEEK = 7
const DEFAULT_PREP_DAYS_BEFORE = 1
const DEFAULT_REST_DAYS_AFTER = 0

// ── Get or create capacity config ────────────────────────────────────────────────

async function getOrCreateConfig(db: any, tenantId: string): Promise<CapacityConfig> {
  const { data, error } = await db
    .from('chef_capacity_configs')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) {
    console.error('[saturation] Failed to load capacity config:', error)
    throw new Error('Failed to load capacity configuration')
  }

  if (data) {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      maxEventsPerDay: data.max_events_per_day,
      maxEventsPerWeek: data.max_events_per_week,
      prepDaysBefore: data.prep_days_before,
      restDaysAfter: data.rest_days_after,
      blackoutDays: data.blackout_days_json ?? [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  }

  // Create defaults
  const { data: created, error: insertError } = await db
    .from('chef_capacity_configs')
    .insert({
      tenant_id: tenantId,
      max_events_per_day: DEFAULT_MAX_EVENTS_PER_DAY,
      max_events_per_week: DEFAULT_MAX_EVENTS_PER_WEEK,
      prep_days_before: DEFAULT_PREP_DAYS_BEFORE,
      rest_days_after: DEFAULT_REST_DAYS_AFTER,
      blackout_days_json: [],
    })
    .select()
    .single()

  if (insertError) {
    console.error('[saturation] Failed to create default config:', insertError)
    throw new Error('Failed to create default capacity configuration')
  }

  return {
    id: created.id,
    tenantId: created.tenant_id,
    maxEventsPerDay: created.max_events_per_day,
    maxEventsPerWeek: created.max_events_per_week,
    prepDaysBefore: created.prep_days_before,
    restDaysAfter: created.rest_days_after,
    blackoutDays: created.blackout_days_json ?? [],
    createdAt: created.created_at,
    updatedAt: created.updated_at,
  }
}

// ── Fetch event counts for a date range ──────────────────────────────────────────

async function fetchEventCountsByDate(
  db: any,
  tenantId: string,
  start: string,
  end: string
): Promise<Map<string, number>> {
  const { data: events } = await db
    .from('events')
    .select('event_date')
    .eq('tenant_id', tenantId)
    .gte('event_date', start)
    .lte('event_date', end)
    .not('status', 'in', '("cancelled","draft")')
    .eq('is_demo', false)

  const eventList: Array<{ event_date: string }> = events ?? []
  const counts = new Map<string, number>()
  for (const e of eventList) {
    counts.set(e.event_date, (counts.get(e.event_date) ?? 0) + 1)
  }
  return counts
}

// ── Build SaturationDay for a single date ────────────────────────────────────────

function buildDay(date: string, eventCount: number, config: CapacityConfig): SaturationDay {
  const dayName = getDayName(date)
  const isBlocked = config.blackoutDays.includes(dayName)
  const maxEvents = config.maxEventsPerDay
  const percent = maxEvents > 0 ? clamp(Math.round((eventCount / maxEvents) * 100), 0, 100) : 0

  return {
    date,
    dayName,
    eventCount,
    maxEvents,
    saturationPercent: percent,
    status: deriveDayStatus(eventCount, maxEvents, isBlocked),
    isBlocked,
  }
}

// ── Public Actions ───────────────────────────────────────────────────────────────

/**
 * Get saturation data for each day of the week containing weekStart.
 * weekStart should be a Monday (YYYY-MM-DD). If not, the containing week's Monday is used.
 */
export async function getWeeklySaturation(weekStart: string): Promise<SaturationWeek> {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = chef.tenantId!

  const config = await getOrCreateConfig(db, tenantId)

  // Normalize to Monday
  const d = new Date(weekStart + 'T00:00:00')
  const dayOfWeek = d.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(d)
  monday.setDate(d.getDate() + mondayOffset)
  const start = formatDate(monday)
  const end = addDays(start, 6)

  const counts = await fetchEventCountsByDate(db, tenantId, start, end)

  const days: SaturationDay[] = []
  let totalEvents = 0
  for (let i = 0; i < 7; i++) {
    const date = addDays(start, i)
    const count = counts.get(date) ?? 0
    totalEvents += count
    days.push(buildDay(date, count, config))
  }

  const maxWeeklyEvents = config.maxEventsPerWeek
  const weekPercent =
    maxWeeklyEvents > 0 ? clamp(Math.round((totalEvents / maxWeeklyEvents) * 100), 0, 100) : 0

  return {
    weekStart: start,
    weekEnd: end,
    days,
    totalEvents,
    maxWeeklyEvents,
    weekSaturationPercent: weekPercent,
    status: deriveStatus(weekPercent),
  }
}

/**
 * Get saturation data for each day of the given month.
 * month is 1-based (1 = January).
 */
export async function getMonthlySaturation(year: number, month: number): Promise<SaturationMonth> {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = chef.tenantId!

  const config = await getOrCreateConfig(db, tenantId)

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const counts = await fetchEventCountsByDate(db, tenantId, startDate, endDate)

  const days: SaturationDay[] = []
  let totalEvents = 0
  let availableDays = 0

  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const count = counts.get(dateStr) ?? 0
    totalEvents += count

    const dayName = getDayName(dateStr)
    if (!config.blackoutDays.includes(dayName)) {
      availableDays++
    }

    days.push(buildDay(dateStr, count, config))
  }

  // Monthly saturation: events / (available days * max per day)
  const maxMonthlyEvents = availableDays * config.maxEventsPerDay
  const monthPercent =
    maxMonthlyEvents > 0 ? clamp(Math.round((totalEvents / maxMonthlyEvents) * 100), 0, 100) : 0

  return {
    year,
    month,
    days,
    totalEvents,
    availableDays,
    monthSaturationPercent: monthPercent,
    status: deriveStatus(monthPercent),
  }
}

/**
 * Get the chef's configured capacity limits.
 * Creates defaults if none exist.
 */
export async function getChefCapacity(): Promise<CapacityConfig> {
  const chef = await requireChef()
  const db: any = createServerClient()
  return getOrCreateConfig(db, chef.tenantId!)
}

/**
 * Set the chef's capacity limits.
 * Only provided fields are updated; others remain unchanged.
 */
export async function setChefCapacity(
  input: CapacityConfigInput
): Promise<{ success: boolean; config: CapacityConfig }> {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = chef.tenantId!

  // Ensure config row exists
  await getOrCreateConfig(db, tenantId)

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (input.maxEventsPerDay !== undefined) updateData.max_events_per_day = input.maxEventsPerDay
  if (input.maxEventsPerWeek !== undefined) updateData.max_events_per_week = input.maxEventsPerWeek
  if (input.prepDaysBefore !== undefined) updateData.prep_days_before = input.prepDaysBefore
  if (input.restDaysAfter !== undefined) updateData.rest_days_after = input.restDaysAfter
  if (input.blackoutDays !== undefined) updateData.blackout_days_json = input.blackoutDays

  const { error } = await db
    .from('chef_capacity_configs')
    .update(updateData)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[saturation] Failed to update capacity config:', error)
    throw new Error('Failed to update capacity configuration')
  }

  revalidatePath('/calendar')
  revalidatePath('/settings')
  revalidatePath('/scheduling')

  const config = await getOrCreateConfig(db, tenantId)
  return { success: true, config }
}

/**
 * Get warnings for overbooked or near-capacity days in a date range.
 */
export async function getSaturationWarnings(dateRange: {
  start: string
  end: string
}): Promise<SaturationWarning[]> {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = chef.tenantId!

  const config = await getOrCreateConfig(db, tenantId)
  const counts = await fetchEventCountsByDate(db, tenantId, dateRange.start, dateRange.end)

  const warnings: SaturationWarning[] = []

  // Check each day in range
  let current = dateRange.start
  while (current <= dateRange.end) {
    const count = counts.get(current) ?? 0
    const dayName = getDayName(current)
    const isBlocked = config.blackoutDays.includes(dayName)
    const max = config.maxEventsPerDay

    if (isBlocked && count > 0) {
      warnings.push({
        date: current,
        severity: 'warning',
        message: `${dayName} ${current} is a blackout day but has ${count} event${count > 1 ? 's' : ''} scheduled`,
        eventCount: count,
        maxEvents: max,
      })
    } else if (count > max) {
      warnings.push({
        date: current,
        severity: 'critical',
        message: `${dayName} ${current}: ${count} events exceeds daily max of ${max}`,
        eventCount: count,
        maxEvents: max,
      })
    } else if (count === max) {
      warnings.push({
        date: current,
        severity: 'warning',
        message: `${dayName} ${current} is at capacity (${count}/${max} events)`,
        eventCount: count,
        maxEvents: max,
      })
    } else if (max > 0 && count >= max * 0.75) {
      warnings.push({
        date: current,
        severity: 'info',
        message: `${dayName} ${current} is nearing capacity (${count}/${max} events)`,
        eventCount: count,
        maxEvents: max,
      })
    }

    current = addDays(current, 1)
  }

  // Check weekly totals too
  // Group days by their week (Mon-Sun)
  const weeklyTotals = new Map<string, number>()
  for (const [date, count] of counts) {
    const d = new Date(date + 'T00:00:00')
    const dow = d.getDay()
    const monOffset = dow === 0 ? -6 : 1 - dow
    const mon = new Date(d)
    mon.setDate(d.getDate() + monOffset)
    const weekKey = formatDate(mon)
    weeklyTotals.set(weekKey, (weeklyTotals.get(weekKey) ?? 0) + count)
  }

  for (const [weekStart, total] of weeklyTotals) {
    if (total > config.maxEventsPerWeek) {
      warnings.push({
        date: weekStart,
        severity: 'critical',
        message: `Week of ${weekStart}: ${total} events exceeds weekly max of ${config.maxEventsPerWeek}`,
        eventCount: total,
        maxEvents: config.maxEventsPerWeek,
      })
    } else if (total === config.maxEventsPerWeek) {
      warnings.push({
        date: weekStart,
        severity: 'warning',
        message: `Week of ${weekStart} is at weekly capacity (${total}/${config.maxEventsPerWeek})`,
        eventCount: total,
        maxEvents: config.maxEventsPerWeek,
      })
    }
  }

  // Sort by severity (critical first), then by date
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 }
  warnings.sort((a, b) => {
    const sev = (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9)
    if (sev !== 0) return sev
    return a.date.localeCompare(b.date)
  })

  return warnings
}

/**
 * Get historical saturation trends over the specified number of months
 * (looking backward from the current month).
 */
export async function getSaturationTrends(months: number = 6): Promise<SaturationTrends> {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = chef.tenantId!

  const config = await getOrCreateConfig(db, tenantId)
  const now = new Date()
  const points: SaturationTrendPoint[] = []

  const MONTH_LABELS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]

  for (let i = months - 1; i >= 0; i--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = targetDate.getFullYear()
    const month = targetDate.getMonth() + 1
    const lastDay = new Date(year, month, 0).getDate()

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const counts = await fetchEventCountsByDate(db, tenantId, startDate, endDate)

    let totalEvents = 0
    let availableDays = 0
    for (let day = 1; day <= lastDay; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayName = getDayName(dateStr)
      if (!config.blackoutDays.includes(dayName)) {
        availableDays++
      }
      totalEvents += counts.get(dateStr) ?? 0
    }

    const maxEvents = availableDays * config.maxEventsPerDay
    const percent = maxEvents > 0 ? clamp(Math.round((totalEvents / maxEvents) * 100), 0, 100) : 0

    points.push({
      year,
      month,
      label: `${MONTH_LABELS[month - 1]} ${year}`,
      totalEvents,
      availableDays,
      saturationPercent: percent,
      status: deriveStatus(percent),
    })
  }

  const avgSaturation =
    points.length > 0
      ? Math.round(points.reduce((sum, p) => sum + p.saturationPercent, 0) / points.length)
      : 0

  let peakMonth: SaturationTrendPoint | null = null
  let lowestMonth: SaturationTrendPoint | null = null
  for (const p of points) {
    if (!peakMonth || p.saturationPercent > peakMonth.saturationPercent) peakMonth = p
    if (!lowestMonth || p.saturationPercent < lowestMonth.saturationPercent) lowestMonth = p
  }

  return {
    points,
    averageSaturation: avgSaturation,
    peakMonth,
    lowestMonth,
  }
}
