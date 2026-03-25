'use server'

// Capacity Planning - Server Actions
// Time-block-based capacity management for private chefs.
// Accounts for prep, travel, shopping, cleanup, and buffer time
// that standard service businesses don't need.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ── Types ───────────────────────────────────────────────────────────────────────

export type CapacityPlanningSettings = {
  id: string
  tenant_id: string
  max_events_per_day: number
  max_events_per_week: number
  default_prep_hours: number
  default_travel_minutes: number
  default_shopping_hours: number
  default_cleanup_hours: number
  buffer_between_events_minutes: number
  blocked_days: string[]
}

export type TimeBlock = {
  label: string
  start_minutes: number // minutes from midnight
  end_minutes: number
  type: 'shopping' | 'prep' | 'travel' | 'service' | 'cleanup' | 'buffer'
  event_id: string
  event_title?: string
}

export type DayAvailability = {
  date: string
  day_name: string
  events_booked: number
  max_events: number
  is_blocked_day: boolean
  time_blocks: TimeBlock[]
  total_committed_hours: number
  remaining_capacity_hours: number
  conflicts: string[]
  status: 'available' | 'busy' | 'at_capacity' | 'blocked'
}

export type BookingConflictResult = {
  canBook: boolean
  conflicts: Array<{
    event_id: string
    event_date: string
    serve_time: string
    client_name?: string
    overlap_reason: string
  }>
  reason?: string
}

export type MonthDayCapacity = {
  date: string
  event_count: number
  max_events: number
  is_blocked: boolean
  status: 'available' | 'busy' | 'at_capacity' | 'blocked'
}

export type CapacityUtilization = {
  total_days: number
  days_with_events: number
  total_events: number
  avg_events_per_working_day: number
  utilization_percent: number
  busiest_day: string | null
  busiest_day_count: number
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function timeToMinutes(timeStr: string): number {
  // Accepts "HH:MM" or "HH:MM:SS"
  const parts = timeStr.split(':')
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return formatDate(d)
}

function getDayName(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return DAY_NAMES[d.getDay()]
}

function getWeekRange(dateStr: string): { start: string; end: string } {
  const d = new Date(dateStr + 'T00:00:00')
  const dayOfWeek = d.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(d)
  monday.setDate(d.getDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: formatDate(monday), end: formatDate(sunday) }
}

/** Build time blocks for one event given capacity settings */
function buildTimeBlocks(
  event: { id: string; serve_time: string; guest_count: number; occasion?: string | null },
  settings: CapacityPlanningSettings
): TimeBlock[] {
  const serveMinutes = timeToMinutes(event.serve_time)
  // Estimate service duration: ~30 min per course, min 90 min, scale with guests
  const baseDuration = Math.max(90, Math.min(240, event.guest_count * 15))
  const blocks: TimeBlock[] = []
  const title = event.occasion || undefined

  // Shopping (morning before, not overlapping prep)
  const shoppingMinutes = settings.default_shopping_hours * 60
  const shoppingStart = Math.max(
    480,
    serveMinutes - settings.default_prep_hours * 60 - shoppingMinutes - 60
  )
  blocks.push({
    label: 'Shopping',
    start_minutes: shoppingStart,
    end_minutes: shoppingStart + shoppingMinutes,
    type: 'shopping',
    event_id: event.id,
    event_title: title,
  })

  // Prep
  const prepMinutes = settings.default_prep_hours * 60
  const prepStart = serveMinutes - prepMinutes
  blocks.push({
    label: 'Prep',
    start_minutes: prepStart,
    end_minutes: serveMinutes - settings.default_travel_minutes,
    type: 'prep',
    event_id: event.id,
    event_title: title,
  })

  // Travel to venue
  blocks.push({
    label: 'Travel',
    start_minutes: serveMinutes - settings.default_travel_minutes,
    end_minutes: serveMinutes,
    type: 'travel',
    event_id: event.id,
    event_title: title,
  })

  // Service
  blocks.push({
    label: 'Service',
    start_minutes: serveMinutes,
    end_minutes: serveMinutes + baseDuration,
    type: 'service',
    event_id: event.id,
    event_title: title,
  })

  // Cleanup
  const cleanupMinutes = settings.default_cleanup_hours * 60
  blocks.push({
    label: 'Cleanup',
    start_minutes: serveMinutes + baseDuration,
    end_minutes: serveMinutes + baseDuration + cleanupMinutes,
    type: 'cleanup',
    event_id: event.id,
    event_title: title,
  })

  // Buffer after
  if (settings.buffer_between_events_minutes > 0) {
    const bufferStart = serveMinutes + baseDuration + cleanupMinutes
    blocks.push({
      label: 'Buffer',
      start_minutes: bufferStart,
      end_minutes: bufferStart + settings.buffer_between_events_minutes,
      type: 'buffer',
      event_id: event.id,
      event_title: title,
    })
  }

  return blocks
}

function detectConflicts(blocks: TimeBlock[]): string[] {
  const conflicts: string[] = []
  const sorted = [...blocks].sort((a, b) => a.start_minutes - b.start_minutes)

  for (let i = 0; i < sorted.length - 1; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[i].event_id === sorted[j].event_id) continue
      if (sorted[i].end_minutes > sorted[j].start_minutes) {
        conflicts.push(
          `${sorted[i].label} (${sorted[i].event_title || 'event'}) overlaps with ${sorted[j].label} (${sorted[j].event_title || 'event'})`
        )
      }
    }
  }
  return conflicts
}

// ── Get or Create Default Settings ──────────────────────────────────────────────

export async function getCapacityPlanningSettings(): Promise<CapacityPlanningSettings> {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = chef.tenantId!

  const { data, error } = await (db as any)
    .from('chef_capacity_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) {
    console.error('[getCapacityPlanningSettings]', error)
    throw new Error('Failed to load capacity settings')
  }

  if (data) {
    return {
      id: data.id,
      tenant_id: data.tenant_id,
      max_events_per_day: data.max_events_per_day,
      max_events_per_week: data.max_events_per_week,
      default_prep_hours: Number(data.default_prep_hours),
      default_travel_minutes: data.default_travel_minutes,
      default_shopping_hours: Number(data.default_shopping_hours),
      default_cleanup_hours: Number(data.default_cleanup_hours),
      buffer_between_events_minutes: data.buffer_between_events_minutes,
      blocked_days: data.blocked_days ?? [],
    }
  }

  // Create defaults
  const { data: created, error: insertError } = await (db as any)
    .from('chef_capacity_settings')
    .insert({ tenant_id: tenantId })
    .select()
    .single()

  if (insertError) {
    console.error('[getCapacityPlanningSettings] insert default', insertError)
    throw new Error('Failed to create default capacity settings')
  }

  return {
    id: created.id,
    tenant_id: created.tenant_id,
    max_events_per_day: created.max_events_per_day,
    max_events_per_week: created.max_events_per_week,
    default_prep_hours: Number(created.default_prep_hours),
    default_travel_minutes: created.default_travel_minutes,
    default_shopping_hours: Number(created.default_shopping_hours),
    default_cleanup_hours: Number(created.default_cleanup_hours),
    buffer_between_events_minutes: created.buffer_between_events_minutes,
    blocked_days: created.blocked_days ?? [],
  }
}

// ── Update Settings ─────────────────────────────────────────────────────────────

export async function updateCapacityPlanningSettings(input: {
  max_events_per_day?: number
  max_events_per_week?: number
  default_prep_hours?: number
  default_travel_minutes?: number
  default_shopping_hours?: number
  default_cleanup_hours?: number
  buffer_between_events_minutes?: number
  blocked_days?: string[]
}): Promise<{ success: boolean }> {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = chef.tenantId!

  // Ensure row exists first
  await getCapacityPlanningSettings()

  const updateData: Record<string, unknown> = {}
  if (input.max_events_per_day !== undefined)
    updateData.max_events_per_day = input.max_events_per_day
  if (input.max_events_per_week !== undefined)
    updateData.max_events_per_week = input.max_events_per_week
  if (input.default_prep_hours !== undefined)
    updateData.default_prep_hours = input.default_prep_hours
  if (input.default_travel_minutes !== undefined)
    updateData.default_travel_minutes = input.default_travel_minutes
  if (input.default_shopping_hours !== undefined)
    updateData.default_shopping_hours = input.default_shopping_hours
  if (input.default_cleanup_hours !== undefined)
    updateData.default_cleanup_hours = input.default_cleanup_hours
  if (input.buffer_between_events_minutes !== undefined)
    updateData.buffer_between_events_minutes = input.buffer_between_events_minutes
  if (input.blocked_days !== undefined) updateData.blocked_days = input.blocked_days

  if (Object.keys(updateData).length === 0) return { success: true }

  const { error } = await (db as any)
    .from('chef_capacity_settings')
    .update(updateData)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[updateCapacityPlanningSettings]', error)
    throw new Error('Failed to update capacity settings')
  }

  revalidatePath('/scheduling')
  revalidatePath('/settings')
  return { success: true }
}

// ── Date Availability ───────────────────────────────────────────────────────────

export async function getDateAvailability(date: string): Promise<DayAvailability> {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = chef.tenantId!

  const settings = await getCapacityPlanningSettings()
  const dayName = getDayName(date)
  const isBlocked = settings.blocked_days.includes(dayName)

  // Fetch events on this date
  const { data: events } = await (db as any)
    .from('events')
    .select('id, serve_time, guest_count, occasion, status')
    .eq('tenant_id', tenantId)
    .eq('event_date', date)
    .not('status', 'in', '("cancelled","draft")')

  const eventList = events ?? []

  // Build time blocks for all events
  const allBlocks: TimeBlock[] = []
  for (const ev of eventList) {
    allBlocks.push(...buildTimeBlocks(ev, settings))
  }

  const conflicts = detectConflicts(allBlocks)

  // Calculate total committed time
  const totalMinutes = allBlocks
    .filter((b) => b.type !== 'buffer')
    .reduce((sum, b) => sum + (b.end_minutes - b.start_minutes), 0)
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10

  // Available waking hours (roughly 8am to 10pm = 14 hours)
  const wakingHours = 14
  const remaining = Math.max(0, wakingHours - totalHours)

  let status: DayAvailability['status'] = 'available'
  if (isBlocked) {
    status = 'blocked'
  } else if (eventList.length >= settings.max_events_per_day) {
    status = 'at_capacity'
  } else if (eventList.length > 0) {
    status = 'busy'
  }

  return {
    date,
    day_name: dayName,
    events_booked: eventList.length,
    max_events: settings.max_events_per_day,
    is_blocked_day: isBlocked,
    time_blocks: allBlocks,
    total_committed_hours: totalHours,
    remaining_capacity_hours: remaining,
    conflicts,
    status,
  }
}

// ── Week Availability ───────────────────────────────────────────────────────────

export async function getWeekAvailability(weekStart: string): Promise<DayAvailability[]> {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = chef.tenantId!

  const settings = await getCapacityPlanningSettings()
  const weekEnd = addDays(weekStart, 6)

  // Fetch all events in the week range
  const { data: events } = await (db as any)
    .from('events')
    .select('id, event_date, serve_time, guest_count, occasion, status')
    .eq('tenant_id', tenantId)
    .gte('event_date', weekStart)
    .lte('event_date', weekEnd)
    .not('status', 'in', '("cancelled","draft")')

  const eventList = events ?? []

  const days: DayAvailability[] = []
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i)
    const dayName = getDayName(date)
    const isBlocked = settings.blocked_days.includes(dayName)
    const dayEvents = eventList.filter((e: any) => e.event_date === date)

    const allBlocks: TimeBlock[] = []
    for (const ev of dayEvents) {
      allBlocks.push(...buildTimeBlocks(ev, settings))
    }

    const conflicts = detectConflicts(allBlocks)
    const totalMinutes = allBlocks
      .filter((b) => b.type !== 'buffer')
      .reduce((sum, b) => sum + (b.end_minutes - b.start_minutes), 0)
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10
    const remaining = Math.max(0, 14 - totalHours)

    let status: DayAvailability['status'] = 'available'
    if (isBlocked) {
      status = 'blocked'
    } else if (dayEvents.length >= settings.max_events_per_day) {
      status = 'at_capacity'
    } else if (dayEvents.length > 0) {
      status = 'busy'
    }

    days.push({
      date,
      day_name: dayName,
      events_booked: dayEvents.length,
      max_events: settings.max_events_per_day,
      is_blocked_day: isBlocked,
      time_blocks: allBlocks,
      total_committed_hours: totalHours,
      remaining_capacity_hours: remaining,
      conflicts,
      status,
    })
  }

  return days
}

// ── Month Capacity ──────────────────────────────────────────────────────────────

export async function getMonthCapacity(year: number, month: number): Promise<MonthDayCapacity[]> {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = chef.tenantId!

  const settings = await getCapacityPlanningSettings()

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  // Fetch event counts grouped by date
  const { data: events } = await (db as any)
    .from('events')
    .select('event_date')
    .eq('tenant_id', tenantId)
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .not('status', 'in', '("cancelled","draft")')

  const eventList = events ?? []

  // Count events per date
  const countsByDate = new Map<string, number>()
  for (const e of eventList) {
    const d = e.event_date as string
    countsByDate.set(d, (countsByDate.get(d) ?? 0) + 1)
  }

  const days: MonthDayCapacity[] = []
  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dayName = getDayName(dateStr)
    const isBlocked = settings.blocked_days.includes(dayName)
    const count = countsByDate.get(dateStr) ?? 0

    let status: MonthDayCapacity['status'] = 'available'
    if (isBlocked) {
      status = 'blocked'
    } else if (count >= settings.max_events_per_day) {
      status = 'at_capacity'
    } else if (count > 0) {
      status = 'busy'
    }

    days.push({
      date: dateStr,
      event_count: count,
      max_events: settings.max_events_per_day,
      is_blocked: isBlocked,
      status,
    })
  }

  return days
}

// ── Booking Conflict Check ──────────────────────────────────────────────────────

export async function checkBookingConflict(
  proposedDate: string,
  proposedTime: string,
  estimatedDurationMinutes: number
): Promise<BookingConflictResult> {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = chef.tenantId!

  const settings = await getCapacityPlanningSettings()

  // Check blocked day
  const dayName = getDayName(proposedDate)
  if (settings.blocked_days.includes(dayName)) {
    return {
      canBook: false,
      conflicts: [],
      reason: `${dayName} is a blocked day. You have this day off.`,
    }
  }

  // Fetch existing events on this date
  const { data: events } = await (db as any)
    .from('events')
    .select('id, event_date, serve_time, guest_count, occasion, status, client_id')
    .eq('tenant_id', tenantId)
    .eq('event_date', proposedDate)
    .not('status', 'in', '("cancelled","draft")')

  const eventList = events ?? []

  // Check daily limit
  if (eventList.length >= settings.max_events_per_day) {
    return {
      canBook: false,
      conflicts: eventList.map((e: any) => ({
        event_id: e.id,
        event_date: e.event_date,
        serve_time: e.serve_time,
        overlap_reason: 'Daily event limit reached',
      })),
      reason: `Daily limit of ${settings.max_events_per_day} events already reached.`,
    }
  }

  // Check weekly limit
  const week = getWeekRange(proposedDate)
  const { count: weekCount } = await (db as any)
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('event_date', week.start)
    .lte('event_date', week.end)
    .not('status', 'in', '("cancelled","draft")')

  if ((weekCount ?? 0) >= settings.max_events_per_week) {
    return {
      canBook: false,
      conflicts: [],
      reason: `Weekly limit of ${settings.max_events_per_week} events already reached for this week.`,
    }
  }

  // Check time block overlaps
  const proposedServe = timeToMinutes(proposedTime)
  const proposedBlocks = buildTimeBlocks(
    { id: 'proposed', serve_time: proposedTime, guest_count: 8, occasion: 'Proposed event' },
    settings
  )

  const existingBlocks: TimeBlock[] = []
  for (const ev of eventList) {
    existingBlocks.push(...buildTimeBlocks(ev, settings))
  }

  const conflicts: BookingConflictResult['conflicts'] = []
  for (const existing of existingBlocks) {
    for (const proposed of proposedBlocks) {
      if (
        proposed.end_minutes > existing.start_minutes &&
        proposed.start_minutes < existing.end_minutes
      ) {
        // Only report each event once
        if (!conflicts.find((c) => c.event_id === existing.event_id)) {
          const matchingEvent = eventList.find((e: any) => e.id === existing.event_id)
          conflicts.push({
            event_id: existing.event_id,
            event_date: proposedDate,
            serve_time: matchingEvent?.serve_time ?? '',
            overlap_reason: `Time conflict: your ${proposed.label.toLowerCase()} overlaps with existing ${existing.label.toLowerCase()}`,
          })
        }
        break
      }
    }
  }

  if (conflicts.length > 0) {
    return {
      canBook: false,
      conflicts,
      reason: 'Time block conflicts detected with existing events.',
    }
  }

  return { canBook: true, conflicts: [] }
}

// ── Capacity Utilization ────────────────────────────────────────────────────────

export async function getCapacityUtilization(dateRange: {
  start: string
  end: string
}): Promise<CapacityUtilization> {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = chef.tenantId!

  const settings = await getCapacityPlanningSettings()

  const { data: events } = await (db as any)
    .from('events')
    .select('event_date')
    .eq('tenant_id', tenantId)
    .gte('event_date', dateRange.start)
    .lte('event_date', dateRange.end)
    .not('status', 'in', '("cancelled","draft")')

  const eventList = events ?? []

  // Count total non-blocked days in range
  let totalDays = 0
  const countsByDate = new Map<string, number>()

  let current = dateRange.start
  while (current <= dateRange.end) {
    const dayName = getDayName(current)
    if (!settings.blocked_days.includes(dayName)) {
      totalDays++
    }
    current = addDays(current, 1)
  }

  for (const e of eventList) {
    const d = e.event_date as string
    countsByDate.set(d, (countsByDate.get(d) ?? 0) + 1)
  }

  const daysWithEvents = countsByDate.size
  const totalEvents = eventList.length

  let busiestDay: string | null = null
  let busiestCount = 0
  for (const [date, count] of countsByDate) {
    if (count > busiestCount) {
      busiestCount = count
      busiestDay = date
    }
  }

  const maxPossible = totalDays * settings.max_events_per_day
  const utilization = maxPossible > 0 ? Math.round((totalEvents / maxPossible) * 100) : 0

  return {
    total_days: totalDays,
    days_with_events: daysWithEvents,
    total_events: totalEvents,
    avg_events_per_working_day:
      daysWithEvents > 0 ? Math.round((totalEvents / daysWithEvents) * 10) / 10 : 0,
    utilization_percent: utilization,
    busiest_day: busiestDay,
    busiest_day_count: busiestCount,
  }
}
