// Operational Load Heatmap - Core Calculation Engine
// Computes daily stress scores (0-100) from events, prep, components, staff, travel, and shopping.
// Deterministic. Zero AI dependency.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ---- Types ----------------------------------------------------------------

export type LoadLevel = 'empty' | 'light' | 'moderate' | 'heavy' | 'overloaded'

export interface DayLoadBreakdown {
  events: number
  prepTasks: number
  components: number
  staffGap: number
  travelMinutes: number
  shoppingTasks: number
}

export interface DayLoad {
  date: string // ISO YYYY-MM-DD
  score: number // 0-100
  level: LoadLevel
  breakdown: DayLoadBreakdown
}

export interface WeekLoadSummary {
  days: DayLoad[]
  totalEvents: number
  totalComponents: number
  heaviestDay: DayLoad | null
  averageScore: number
}

export interface LoadForecast {
  days: DayLoad[]
  trend: 'increasing' | 'decreasing' | 'stable'
  peakDay: DayLoad | null
  averageScore: number
}

// ---- Score Weights ---------------------------------------------------------

const WEIGHT_EVENT_DINNER = 25
const WEIGHT_EVENT_TASTING = 20
const WEIGHT_EVENT_COCKTAIL = 18
const WEIGHT_EVENT_BUFFET = 22
const WEIGHT_EVENT_OTHER = 15
const WEIGHT_EVENT_CONSULTATION = 8
const WEIGHT_EVENT_DRAFT = 5

const WEIGHT_PREP_TASK = 6
const WEIGHT_COMPONENT_BASE = 1.5
const WEIGHT_COMPONENT_CAP = 30

const WEIGHT_STAFF_GAP = 10
const WEIGHT_TRAVEL_PER_30MIN = 5
const WEIGHT_SHOPPING_TASK = 4

// ---- Helpers ---------------------------------------------------------------

function localDateISO(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function scoreToLevel(score: number): LoadLevel {
  if (score === 0) return 'empty'
  if (score <= 25) return 'light'
  if (score <= 50) return 'moderate'
  if (score <= 75) return 'heavy'
  return 'overloaded'
}

function eventWeight(serviceStyle: string | null, status: string): number {
  if (['draft', 'proposed'].includes(status)) return WEIGHT_EVENT_DRAFT
  switch (serviceStyle) {
    case 'plated':
    case 'family_style':
      return WEIGHT_EVENT_DINNER
    case 'tasting_menu':
      return WEIGHT_EVENT_TASTING
    case 'cocktail':
      return WEIGHT_EVENT_COCKTAIL
    case 'buffet':
      return WEIGHT_EVENT_BUFFET
    default:
      return WEIGHT_EVENT_OTHER
  }
}

// ---- Core Calculation ------------------------------------------------------

export async function calculateDayLoad(
  tenantId: string,
  date: string
): Promise<DayLoad> {
  const db: any = createServerClient()

  // Run all queries in parallel
  const [eventsResult, prepBlocksResult, componentsResult, staffResult] = await Promise.all([
    // Events on this day
    db
      .from('events')
      .select('id, service_style, status, time_travel_minutes, time_shopping_minutes, guest_count')
      .eq('tenant_id', tenantId)
      .eq('event_date', date)
      .not('status', 'eq', 'cancelled'),

    // Prep blocks on this day
    db
      .from('event_prep_blocks' as any)
      .select('id, block_type, is_completed, event_id')
      .eq('chef_id', tenantId)
      .eq('block_date', date) as any,

    // Components for events on this day (via menus -> dishes -> components)
    db
      .from('events')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('event_date', date)
      .not('status', 'in', '("cancelled","completed")'),

    // Staff requirements: check if events have staff assigned
    db
      .from('events')
      .select('id, guest_count')
      .eq('tenant_id', tenantId)
      .eq('event_date', date)
      .not('status', 'in', '("cancelled","completed")'),
  ])

  const events = eventsResult.data ?? []
  const prepBlocks = prepBlocksResult.data ?? []

  // Calculate event score
  let eventScore = 0
  let totalTravelMinutes = 0
  let shoppingTasks = 0

  for (const event of events) {
    eventScore += eventWeight(event.service_style, event.status)
    totalTravelMinutes += event.time_travel_minutes || 0
    if (event.time_shopping_minutes && event.time_shopping_minutes > 0) {
      shoppingTasks++
    }
  }

  // Prep tasks (incomplete only count as load)
  const incompletePrepCount = prepBlocks.filter((b: any) => !b.is_completed).length

  // Count components for events on this day
  let componentCount = 0
  const eventIds = (componentsResult.data ?? []).map((e: any) => e.id)

  if (eventIds.length > 0) {
    // Get menus for these events
    const { data: menus } = await db
      .from('menus')
      .select('id')
      .in('event_id', eventIds)
      .eq('tenant_id', tenantId)

    if (menus && menus.length > 0) {
      const menuIds = menus.map((m: any) => m.id)
      const { data: dishes } = await db
        .from('dishes')
        .select('id')
        .in('menu_id', menuIds)

      if (dishes && dishes.length > 0) {
        const dishIds = dishes.map((d: any) => d.id)
        const { data: components, count } = await db
          .from('components')
          .select('id', { count: 'exact' })
          .in('dish_id', dishIds)

        componentCount = count ?? (components?.length ?? 0)
      }
    }
  }

  // Staff gap: rough heuristic based on guest count vs staff assignments
  let staffGap = 0
  const staffEvents = staffResult.data ?? []
  if (staffEvents.length > 0) {
    for (const event of staffEvents) {
      const guestCount = event.guest_count || 0
      // Rough rule: 1 staff per 10 guests, chef always counts as 1
      const neededStaff = Math.max(Math.ceil(guestCount / 10) - 1, 0)
      if (neededStaff > 0) {
        // Check actual staff assignments
        const { data: assignments } = await db
          .from('event_staff_assignments' as any)
          .select('id', { count: 'exact' })
          .eq('event_id', event.id) as any

        const assignedCount = assignments?.length ?? 0
        staffGap += Math.max(neededStaff - assignedCount, 0)
      }
    }
  }

  // Calculate final score
  const prepScore = Math.min(incompletePrepCount * WEIGHT_PREP_TASK, 30)
  const componentScore = Math.min(componentCount * WEIGHT_COMPONENT_BASE, WEIGHT_COMPONENT_CAP)
  const staffScore = staffGap * WEIGHT_STAFF_GAP
  const travelScore = Math.floor(totalTravelMinutes / 30) * WEIGHT_TRAVEL_PER_30MIN
  const shoppingScore = shoppingTasks * WEIGHT_SHOPPING_TASK

  const rawScore = eventScore + prepScore + componentScore + staffScore + travelScore + shoppingScore
  const score = Math.min(Math.round(rawScore), 100)

  return {
    date,
    score,
    level: scoreToLevel(score),
    breakdown: {
      events: events.length,
      prepTasks: incompletePrepCount,
      components: componentCount,
      staffGap,
      travelMinutes: totalTravelMinutes,
      shoppingTasks,
    },
  }
}

// ---- Batch: Week -----------------------------------------------------------

export async function calculateWeekLoad(
  tenantId: string,
  weekStart: string
): Promise<DayLoad[]> {
  const startDate = new Date(weekStart + 'T00:00:00')
  const dates: string[] = []

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    dates.push(localDateISO(d))
  }

  // Run all 7 days in parallel
  const results = await Promise.all(
    dates.map((date) => calculateDayLoad(tenantId, date))
  )

  return results
}

// ---- Batch: Month ----------------------------------------------------------

export async function calculateMonthLoad(
  tenantId: string,
  month: number,
  year: number
): Promise<DayLoad[]> {
  const daysInMonth = new Date(year, month, 0).getDate()
  const dates: string[] = []

  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(
      `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    )
  }

  // Batch in groups of 7 to avoid overwhelming the database
  const results: DayLoad[] = []
  for (let i = 0; i < dates.length; i += 7) {
    const batch = dates.slice(i, i + 7)
    const batchResults = await Promise.all(
      batch.map((date) => calculateDayLoad(tenantId, date))
    )
    results.push(...batchResults)
  }

  return results
}

// ---- Forecast --------------------------------------------------------------

export async function getLoadForecast(
  tenantId: string,
  days: number
): Promise<LoadForecast> {
  const today = new Date()
  const dates: string[] = []

  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    dates.push(localDateISO(d))
  }

  // Batch in groups of 7
  const allResults: DayLoad[] = []
  for (let i = 0; i < dates.length; i += 7) {
    const batch = dates.slice(i, i + 7)
    const batchResults = await Promise.all(
      batch.map((date) => calculateDayLoad(tenantId, date))
    )
    allResults.push(...batchResults)
  }

  // Determine trend from first half vs second half
  const midpoint = Math.floor(allResults.length / 2)
  const firstHalf = allResults.slice(0, midpoint)
  const secondHalf = allResults.slice(midpoint)

  const firstAvg =
    firstHalf.length > 0
      ? firstHalf.reduce((s, d) => s + d.score, 0) / firstHalf.length
      : 0
  const secondAvg =
    secondHalf.length > 0
      ? secondHalf.reduce((s, d) => s + d.score, 0) / secondHalf.length
      : 0

  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
  if (secondAvg > firstAvg + 5) trend = 'increasing'
  else if (secondAvg < firstAvg - 5) trend = 'decreasing'

  const peakDay = allResults.reduce(
    (max, d) => (d.score > (max?.score ?? 0) ? d : max),
    null as DayLoad | null
  )

  const averageScore =
    allResults.length > 0
      ? Math.round(allResults.reduce((s, d) => s + d.score, 0) / allResults.length)
      : 0

  return { days: allResults, trend, peakDay, averageScore }
}

// ---- Week Summary ----------------------------------------------------------

export function buildWeekSummary(days: DayLoad[]): WeekLoadSummary {
  const totalEvents = days.reduce((s, d) => s + d.breakdown.events, 0)
  const totalComponents = days.reduce((s, d) => s + d.breakdown.components, 0)
  const heaviestDay = days.reduce(
    (max, d) => (d.score > (max?.score ?? 0) ? d : max),
    null as DayLoad | null
  )
  const averageScore =
    days.length > 0
      ? Math.round(days.reduce((s, d) => s + d.score, 0) / days.length)
      : 0

  return { days, totalEvents, totalComponents, heaviestDay, averageScore }
}
