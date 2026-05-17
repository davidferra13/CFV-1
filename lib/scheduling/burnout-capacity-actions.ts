'use server'

// Burnout Capacity & Boundary Actions
// Complements saturation-actions.ts. Saturation = how busy. This = boundaries + burnout risk.
// Auth-gated via requireChef(), tenant-scoped.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type {
  CapacityBoundaries,
  CapacityBoundariesInput,
  BlockedDate,
  BurnoutRiskAssessment,
  BurnoutFactor,
} from './burnout-capacity-types'

// ── Helpers ──────────────────────────────────────────────────────────────────────

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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function deriveBurnoutLevel(score: number): 'low' | 'moderate' | 'high' | 'critical' {
  if (score >= 80) return 'critical'
  if (score >= 55) return 'high'
  if (score >= 30) return 'moderate'
  return 'low'
}

const DEFAULT_BOUNDARIES = {
  max_events_per_week: 7,
  max_guests_per_event: 20,
  min_rest_days: 1,
  max_consecutive_days: 5,
}

// ── Internal: get or create boundaries row ──────────────────────────────────────

async function getOrCreateBoundaries(db: any, tenantId: string): Promise<CapacityBoundaries> {
  const { data, error } = await db
    .from('chef_burnout_boundaries')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) {
    console.error('[burnout] Failed to load boundaries:', error)
    throw new Error('Failed to load burnout boundaries')
  }

  if (data) {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      maxEventsPerWeek: data.max_events_per_week,
      maxGuestsPerEvent: data.max_guests_per_event,
      minRestDays: data.min_rest_days,
      maxConsecutiveDays: data.max_consecutive_days,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  }

  // Create defaults
  const { data: created, error: insertError } = await db
    .from('chef_burnout_boundaries')
    .insert({
      tenant_id: tenantId,
      ...DEFAULT_BOUNDARIES,
    })
    .select()
    .single()

  if (insertError) {
    console.error('[burnout] Failed to create default boundaries:', insertError)
    throw new Error('Failed to create default burnout boundaries')
  }

  return {
    id: created.id,
    tenantId: created.tenant_id,
    maxEventsPerWeek: created.max_events_per_week,
    maxGuestsPerEvent: created.max_guests_per_event,
    minRestDays: created.min_rest_days,
    maxConsecutiveDays: created.max_consecutive_days,
    createdAt: created.created_at,
    updatedAt: created.updated_at,
  }
}

// ── Internal: fetch events with guest counts for a date range ───────────────────

async function fetchEventsInRange(
  db: any,
  tenantId: string,
  start: string,
  end: string
): Promise<Array<{ event_date: string; guest_count: number | null }>> {
  const { data: events } = await db
    .from('events')
    .select('event_date, guest_count')
    .eq('tenant_id', tenantId)
    .gte('event_date', start)
    .lte('event_date', end)
    .not('status', 'in', '("cancelled","draft")')
    .eq('is_demo', false)

  return events ?? []
}

// ── Public Actions ──────────────────────────────────────────────────────────────

/**
 * Set capacity boundaries for burnout prevention.
 * Only provided fields are updated; others remain unchanged.
 */
export async function setCapacityBoundaries(
  input: CapacityBoundariesInput
): Promise<{ success: boolean; boundaries: CapacityBoundaries }> {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = chef.tenantId!

  // Ensure row exists
  await getOrCreateBoundaries(db, tenantId)

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (input.maxEventsPerWeek !== undefined) updateData.max_events_per_week = input.maxEventsPerWeek
  if (input.maxGuestsPerEvent !== undefined)
    updateData.max_guests_per_event = input.maxGuestsPerEvent
  if (input.minRestDays !== undefined) updateData.min_rest_days = input.minRestDays
  if (input.maxConsecutiveDays !== undefined)
    updateData.max_consecutive_days = input.maxConsecutiveDays

  const { error } = await db
    .from('chef_burnout_boundaries')
    .update(updateData)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[burnout] Failed to update boundaries:', error)
    throw new Error('Failed to update burnout boundaries')
  }

  revalidatePath('/scheduling')

  const boundaries = await getOrCreateBoundaries(db, tenantId)
  return { success: true, boundaries }
}

/**
 * Retrieve current capacity boundaries.
 * Creates defaults if none exist.
 */
export async function getCapacityBoundaries(): Promise<CapacityBoundaries> {
  const chef = await requireChef()
  const db: any = createServerClient()
  return getOrCreateBoundaries(db, chef.tenantId!)
}

/**
 * Analyze upcoming schedule against boundaries.
 * Returns a risk score (0-100) with contributing factors.
 * Defaults to next 14 days if no date range specified.
 */
export async function getBurnoutRiskAssessment(dateRange?: {
  start: string
  end: string
}): Promise<BurnoutRiskAssessment> {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = chef.tenantId!

  const now = new Date()
  const range = dateRange ?? {
    start: formatDate(now),
    end: formatDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 13)),
  }

  const boundaries = await getOrCreateBoundaries(db, tenantId)
  const events = await fetchEventsInRange(db, tenantId, range.start, range.end)

  // Fetch blocked dates in range
  const { data: blockedRows } = await db
    .from('chef_blocked_dates')
    .select('blocked_date')
    .eq('tenant_id', tenantId)
    .gte('blocked_date', range.start)
    .lte('blocked_date', range.end)

  const blockedSet = new Set((blockedRows ?? []).map((r: any) => r.blocked_date))

  // Build daily event map
  const dailyEvents = new Map<string, number>()
  const dailyGuests = new Map<string, number>()
  for (const e of events) {
    dailyEvents.set(e.event_date, (dailyEvents.get(e.event_date) ?? 0) + 1)
    dailyGuests.set(e.event_date, (dailyGuests.get(e.event_date) ?? 0) + (e.guest_count ?? 0))
  }

  const factors: BurnoutFactor[] = []

  // Factor 1: Consecutive working days
  let maxConsecutive = 0
  let currentStreak = 0
  let cursor = range.start
  while (cursor <= range.end) {
    if ((dailyEvents.get(cursor) ?? 0) > 0) {
      currentStreak++
      if (currentStreak > maxConsecutive) maxConsecutive = currentStreak
    } else {
      currentStreak = 0
    }
    cursor = addDays(cursor, 1)
  }
  const consecutiveScore =
    boundaries.maxConsecutiveDays > 0
      ? clamp(Math.round((maxConsecutive / boundaries.maxConsecutiveDays) * 100), 0, 100)
      : 0
  factors.push({
    name: 'consecutive_days',
    score: consecutiveScore,
    description: `${maxConsecutive} consecutive working days (limit: ${boundaries.maxConsecutiveDays})`,
  })

  // Factor 2: Guest density (max guests in a single event vs boundary)
  let maxGuestsInOneEvent = 0
  for (const e of events) {
    const gc = e.guest_count ?? 0
    if (gc > maxGuestsInOneEvent) maxGuestsInOneEvent = gc
  }
  const guestDensityScore =
    boundaries.maxGuestsPerEvent > 0
      ? clamp(Math.round((maxGuestsInOneEvent / boundaries.maxGuestsPerEvent) * 100), 0, 100)
      : 0
  factors.push({
    name: 'guest_density',
    score: guestDensityScore,
    description: `Peak event has ${maxGuestsInOneEvent} guests (limit: ${boundaries.maxGuestsPerEvent})`,
  })

  // Factor 3: Weekly event load (check each 7-day window)
  let worstWeeklyRatio = 0
  let worstWeekEvents = 0
  cursor = range.start
  while (cursor <= range.end) {
    let weekTotal = 0
    for (let i = 0; i < 7; i++) {
      const d = addDays(cursor, i)
      if (d > range.end) break
      weekTotal += dailyEvents.get(d) ?? 0
    }
    const ratio = boundaries.maxEventsPerWeek > 0 ? weekTotal / boundaries.maxEventsPerWeek : 0
    if (ratio > worstWeeklyRatio) {
      worstWeeklyRatio = ratio
      worstWeekEvents = weekTotal
    }
    cursor = addDays(cursor, 7)
  }
  const weeklyLoadScore = clamp(Math.round(worstWeeklyRatio * 100), 0, 100)
  factors.push({
    name: 'weekly_event_load',
    score: weeklyLoadScore,
    description: `Busiest week has ${worstWeekEvents} events (limit: ${boundaries.maxEventsPerWeek}/week)`,
  })

  // Factor 4: Rest day violations (events on blocked dates)
  const blockedViolations = Array.from(blockedSet).filter(
    (d) => (dailyEvents.get(d as string) ?? 0) > 0
  ).length
  const blockedTotal = blockedSet.size
  const restScore =
    blockedTotal > 0 ? clamp(Math.round((blockedViolations / blockedTotal) * 100), 0, 100) : 0
  factors.push({
    name: 'rest_day_violations',
    score: restScore,
    description:
      blockedTotal > 0
        ? `${blockedViolations} of ${blockedTotal} blocked dates have events scheduled`
        : 'No blocked dates in range',
  })

  // Factor 5: Variety score (how many days have multiple event types / back-to-back)
  // Simplified: ratio of event-days to total days (density)
  const totalDaysInRange = Math.max(
    1,
    Math.round(
      (new Date(range.end + 'T00:00:00').getTime() -
        new Date(range.start + 'T00:00:00').getTime()) /
        86400000
    ) + 1
  )
  const eventDayCount = dailyEvents.size
  const densityRatio = eventDayCount / totalDaysInRange
  const varietyScore = clamp(Math.round(densityRatio * 100), 0, 100)
  factors.push({
    name: 'schedule_density',
    score: varietyScore,
    description: `${eventDayCount} of ${totalDaysInRange} days have events scheduled`,
  })

  // Overall score: weighted average
  const weights: Record<string, number> = {
    consecutive_days: 0.3,
    guest_density: 0.15,
    weekly_event_load: 0.25,
    rest_day_violations: 0.2,
    schedule_density: 0.1,
  }
  let overallScore = 0
  for (const f of factors) {
    overallScore += f.score * (weights[f.name] ?? 0)
  }
  overallScore = clamp(Math.round(overallScore), 0, 100)

  // Recommendations
  const recommendations: string[] = []
  if (consecutiveScore >= 80) {
    recommendations.push(
      `Schedule a rest day: ${maxConsecutive} consecutive days exceeds your ${boundaries.maxConsecutiveDays}-day limit`
    )
  }
  if (guestDensityScore >= 80) {
    recommendations.push(
      `Consider reducing guest count: ${maxGuestsInOneEvent} guests exceeds your ${boundaries.maxGuestsPerEvent}-guest limit`
    )
  }
  if (weeklyLoadScore >= 80) {
    recommendations.push(
      `Spread events across weeks: ${worstWeekEvents} events in one week exceeds your ${boundaries.maxEventsPerWeek}-event limit`
    )
  }
  if (blockedViolations > 0) {
    recommendations.push(
      `${blockedViolations} blocked date(s) have events; move or cancel to protect rest time`
    )
  }
  if (overallScore < 30) {
    recommendations.push('Schedule looks sustainable. Keep it up.')
  }

  return {
    overallScore,
    level: deriveBurnoutLevel(overallScore),
    factors,
    dateRange: range,
    recommendations,
  }
}

/**
 * Get dates the chef has blocked off for rest/personal in a given month.
 * Defaults to current month if none specified.
 */
export async function getBlockedDates(month?: {
  year: number
  month: number
}): Promise<BlockedDate[]> {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = chef.tenantId!

  const now = new Date()
  const y = month?.year ?? now.getFullYear()
  const m = month?.month ?? now.getMonth() + 1
  const lastDay = new Date(y, m, 0).getDate()

  const start = `${y}-${String(m).padStart(2, '0')}-01`
  const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data, error } = await db
    .from('chef_blocked_dates')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('blocked_date', start)
    .lte('blocked_date', end)
    .order('blocked_date', { ascending: true })

  if (error) {
    console.error('[burnout] Failed to load blocked dates:', error)
    throw new Error('Failed to load blocked dates')
  }

  return (data ?? []).map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    blockedDate: r.blocked_date,
    reason: r.reason,
    createdAt: r.created_at,
  }))
}

/**
 * Block a specific date for rest/personal time.
 * Idempotent: if already blocked, returns existing record.
 */
export async function setBlockedDate(
  date: string,
  reason?: string
): Promise<{ success: boolean; blockedDate: BlockedDate }> {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = chef.tenantId!

  // Check for existing
  const { data: existing } = await db
    .from('chef_blocked_dates')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('blocked_date', date)
    .maybeSingle()

  if (existing) {
    return {
      success: true,
      blockedDate: {
        id: existing.id,
        tenantId: existing.tenant_id,
        blockedDate: existing.blocked_date,
        reason: existing.reason,
        createdAt: existing.created_at,
      },
    }
  }

  const { data: created, error } = await db
    .from('chef_blocked_dates')
    .insert({
      tenant_id: tenantId,
      blocked_date: date,
      reason: reason ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('[burnout] Failed to block date:', error)
    throw new Error('Failed to block date')
  }

  revalidatePath('/scheduling')

  return {
    success: true,
    blockedDate: {
      id: created.id,
      tenantId: created.tenant_id,
      blockedDate: created.blocked_date,
      reason: created.reason,
      createdAt: created.created_at,
    },
  }
}

/**
 * Unblock a previously blocked date.
 * No-op if date is not blocked.
 */
export async function removeBlockedDate(date: string): Promise<{ success: boolean }> {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = chef.tenantId!

  const { error } = await db
    .from('chef_blocked_dates')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('blocked_date', date)

  if (error) {
    console.error('[burnout] Failed to unblock date:', error)
    throw new Error('Failed to unblock date')
  }

  revalidatePath('/scheduling')

  return { success: true }
}
