// Prep Block Server Actions
// Handles all DB I/O for the event prep scheduling system.
// Calls the pure prep-block-engine.ts functions with fetched data.
//
// NOTE: event_prep_blocks table is not yet in types/database.ts.
// Database queries use `.from('event_prep_blocks' as never)` to bypass
// the typed client until the migration is reflected in the generated types.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { dateToDateString } from '@/lib/utils/format'
import { getChefPreferences } from '@/lib/chef/actions'
import { suggestPrepBlocks, detectGaps } from './prep-block-engine'
import type {
  PrepBlock,
  PrepBlockSuggestion,
  SchedulingGap,
  YearSummary,
  YearWeekSummary,
  CreatePrepBlockInput,
  UpdatePrepBlockInput,
  SchedulingEvent,
  MenuComponent,
  PrepBlockConflict,
} from './types'

// ============================================
// INTERNAL HELPERS
// ============================================

/**
 * Detect overlapping prep blocks on the same date.
 * Two blocks conflict when their time windows overlap.
 * Blocks without start/end times (date-only) are treated as
 * spanning the whole day, so they conflict with everything on that date.
 */
function detectTimeOverlap(
  aStart: string | null,
  aEnd: string | null,
  bStart: string | null,
  bEnd: string | null
): boolean {
  // If either block is date-only (no times), they overlap by definition
  if (!aStart || !aEnd || !bStart || !bEnd) return true
  // HH:MM string comparison works for time overlap check
  return aStart < bEnd && bStart < aEnd
}

async function detectPrepBlockConflicts(
  db: ReturnType<typeof createServerClient>,
  chefId: string,
  blockDate: string,
  startTime: string | null,
  endTime: string | null,
  excludeBlockId?: string
): Promise<PrepBlockConflict[]> {
  // Fetch all blocks on this date
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db as any)
    .from('event_prep_blocks')
    .select('id, title, event_id, block_date, start_time, end_time')
    .eq('chef_id', chefId)
    .eq('block_date', blockDate)

  if (excludeBlockId) {
    query = query.neq('id', excludeBlockId)
  }

  const { data: existing } = await query
  if (!existing || existing.length === 0) return []

  const conflicts: PrepBlockConflict[] = []
  for (const block of existing as any[]) {
    if (detectTimeOverlap(startTime, endTime, block.start_time, block.end_time)) {
      // Look up event occasion if the conflicting block has an event_id
      let eventOccasion: string | null = null
      if (block.event_id) {
        const { data: ev } = await db
          .from('events')
          .select('occasion')
          .eq('id', block.event_id)
          .maybeSingle()
        eventOccasion = (ev as any)?.occasion ?? null
      }
      conflicts.push({
        blockId: block.id,
        blockTitle: block.title,
        eventId: block.event_id,
        eventOccasion,
        blockDate: block.block_date,
        startTime: block.start_time,
        endTime: block.end_time,
      })
    }
  }
  return conflicts
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEventToScheduling(event: Record<string, any>): SchedulingEvent {
  return {
    id: event.id,
    occasion: event.occasion,
    event_date: event.event_date,
    serve_time: event.serve_time,
    arrival_time: event.arrival_time,
    travel_time_minutes: event.travel_time_minutes ?? null,
    guest_count: event.guest_count,
    status: event.status,
    location_address: event.location_address,
    location_city: event.location_city,
    grocery_list_ready: event.grocery_list_ready,
    prep_list_ready: event.prep_list_ready,
    packing_list_ready: event.packing_list_ready,
    equipment_list_ready: event.equipment_list_ready,
    timeline_ready: event.timeline_ready,
    execution_sheet_ready: event.execution_sheet_ready,
    non_negotiables_checked: event.non_negotiables_checked,
    car_packed: event.car_packed,
    shopping_completed_at: event.shopping_completed_at,
    prep_completed_at: event.prep_completed_at,
    aar_filed: event.aar_filed,
    reset_complete: event.reset_complete,
    follow_up_sent: event.follow_up_sent,
    financially_closed: event.financially_closed,
    client: event.client as { full_name: string } | null,
    menuComponentCount: event._componentCount ?? 0,
    hasAlcohol: event._hasAlcohol ?? false,
  }
}

const EVENT_SELECT = `
  id, occasion, event_date, serve_time, arrival_time, travel_time_minutes,
  guest_count, status,
  location_address, location_city,
  grocery_list_ready, prep_list_ready, packing_list_ready,
  equipment_list_ready, timeline_ready, execution_sheet_ready,
  non_negotiables_checked, car_packed,
  shopping_completed_at, prep_completed_at,
  aar_filed, reset_complete, follow_up_sent, financially_closed,
  client:clients(full_name)
`

async function fetchUpcomingEvents(
  db: ReturnType<typeof createServerClient>,
  tenantId: string
): Promise<SchedulingEvent[]> {
  const _d = new Date()
  const today = [
    _d.getFullYear(),
    String(_d.getMonth() + 1).padStart(2, '0'),
    String(_d.getDate()).padStart(2, '0'),
  ].join('-')
  const { data: events } = await db
    .from('events')
    .select(EVENT_SELECT)
    .eq('tenant_id', tenantId)
    .not('status', 'in', '("cancelled","completed")')
    .gte('event_date', today)
    .order('event_date', { ascending: true })

  if (!events) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (events as Record<string, any>[]).map(mapEventToScheduling)
}

async function fetchPrepBlocks(
  db: ReturnType<typeof createServerClient>,
  chefId: string,
  options?: { eventId?: string; dateStart?: string; dateEnd?: string }
): Promise<PrepBlock[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db as any)
    .from('event_prep_blocks')
    .select('*')
    .eq('chef_id', chefId)
    .order('block_date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: false })

  if (options?.eventId) {
    query = query.eq('event_id', options.eventId)
  }
  if (options?.dateStart) {
    query = query.gte('block_date', options.dateStart)
  }
  if (options?.dateEnd) {
    query = query.lte('block_date', options.dateEnd)
  }

  const { data } = await query
  return (data ?? []) as PrepBlock[]
}

function _localDateISO(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function shiftDateByDays(date: string, days: number): string {
  const current = new Date(`${date}T12:00:00`)
  current.setDate(current.getDate() + days)
  return _localDateISO(current)
}

function daysBetweenDates(fromDate: string, toDate: string): number {
  const from = new Date(`${fromDate}T12:00:00`)
  const to = new Date(`${toDate}T12:00:00`)
  return Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000))
}

/** Calculate Monday of the week at weekOffset from current week. */
function getWeekBounds(weekOffset: number): { start: string; end: string } {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Mon, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + mondayOffset + weekOffset * 7
  )
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  return {
    start: _localDateISO(monday),
    end: _localDateISO(sunday),
  }
}

/** Calculate the Monday of week N within a year (ISO week approximation). */
function getWeekStartForWeekNumber(year: number, weekNum: number): Date {
  // Jan 4 is always in ISO week 1
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOfWeek = jan4.getUTCDay() || 7 // Mon=1 ... Sun=7
  const isoWeek1Monday = new Date(jan4)
  isoWeek1Monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1)
  const result = new Date(isoWeek1Monday)
  result.setUTCDate(isoWeek1Monday.getUTCDate() + (weekNum - 1) * 7)
  return result
}

/**
 * Fetch make-ahead menu components for an event.
 * Joins events → menus → dishes → components, with recipe prep time.
 * Returns only is_make_ahead = true components.
 */
async function fetchMenuComponents(
  db: ReturnType<typeof createServerClient>,
  tenantId: string,
  eventId: string
): Promise<MenuComponent[]> {
  // Use raw SQL via compat shim for the multi-table join
  const { data: components } = await (db as any)
    .from('components')
    .select(
      `
      id, name, prep_day_offset, make_ahead_window_hours,
      prep_time_of_day, prep_station, storage_notes, recipe_id,
      dish:dishes!inner(menu:menus!inner(event_id)),
      recipe:recipes(prep_time_minutes, peak_hours_min, peak_hours_max, safety_hours_max)
    `
    )
    .eq('tenant_id', tenantId)
    .eq('is_make_ahead', true)
    .eq('dish.menu.event_id', eventId)

  if (!components || components.length === 0) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (components as any[]).map((c) => ({
    id: c.id,
    name: c.name,
    prep_day_offset: c.prep_day_offset ?? null,
    make_ahead_window_hours: c.make_ahead_window_hours ?? null,
    prep_time_of_day: c.prep_time_of_day ?? null,
    prep_station: c.prep_station ?? null,
    storage_notes: c.storage_notes ?? null,
    recipe_prep_time_minutes: c.recipe?.prep_time_minutes ?? null,
    recipe_peak_hours_min: c.recipe?.peak_hours_min ?? null,
    recipe_peak_hours_max: c.recipe?.peak_hours_max ?? null,
    recipe_safety_hours_max: c.recipe?.safety_hours_max ?? null,
  }))
}

// ============================================
// READ ACTIONS
// ============================================

/**
 * All prep blocks for a single event.
 */
export async function getEventPrepBlocks(eventId: string): Promise<PrepBlock[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const ownBlocks = await fetchPrepBlocks(db, user.tenantId!, { eventId })

  // Also fetch collaborator chef blocks for this event (non-blocking)
  try {
    const { data: collabs } = await db
      .from('event_collaborators')
      .select('chef_id')
      .eq('event_id', eventId)
      .neq('chef_id', user.tenantId!)
    if (collabs && collabs.length > 0) {
      const collabBlocks = await Promise.all(
        collabs.map((c: any) => fetchPrepBlocks(db, c.chef_id, { eventId }))
      )
      const merged = [...ownBlocks, ...collabBlocks.flat()]
      merged.sort((a, b) => {
        const dateCompare = a.block_date.localeCompare(b.block_date)
        if (dateCompare !== 0) return dateCompare
        return (a.start_time || '').localeCompare(b.start_time || '')
      })
      return merged
    }
  } catch (err) {
    console.error('[non-blocking] Collaborator prep block lookup failed', err)
  }

  return ownBlocks
}

/**
 * All prep blocks in a given week window.
 * weekOffset: 0 = this week, -1 = last week, +1 = next week.
 */
export async function getWeekPrepBlocks(weekOffset = 0): Promise<PrepBlock[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const { start, end } = getWeekBounds(weekOffset)
  return fetchPrepBlocks(db, user.tenantId!, { dateStart: start, dateEnd: end })
}

/**
 * 52-week year summary for the year view grid.
 * Fetches all events and blocks for the year, aggregates into YearWeekSummary[].
 */
export async function getYearSummary(year: number): Promise<YearSummary> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`

  // Fetch all events and blocks for the year in parallel
  const [eventsResult, blocksResult] = await Promise.all([
    db
      .from('events')
      .select(EVENT_SELECT)
      .eq('tenant_id', tenantId)
      .not('status', 'in', '("cancelled")')
      .gte('event_date', yearStart)
      .lte('event_date', yearEnd)
      .order('event_date', { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any)
      .from('event_prep_blocks')
      .select('*')
      .eq('chef_id', tenantId)
      .gte('block_date', yearStart)
      .lte('block_date', yearEnd),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allEvents = (eventsResult.data ?? ([] as Record<string, any>[])).map(mapEventToScheduling)
  const allBlocks = (blocksResult.data ?? []) as PrepBlock[]

  // Build 52-week grid
  const weeks: YearWeekSummary[] = []
  let totalEvents = 0
  let totalGaps = 0

  for (let wk = 1; wk <= 52; wk++) {
    const weekMonday = getWeekStartForWeekNumber(year, wk)
    const weekSunday = new Date(weekMonday)
    weekSunday.setUTCDate(weekMonday.getUTCDate() + 6)

    const weekStart = _localDateISO(weekMonday)
    const weekEnd = _localDateISO(weekSunday)

    const weekEvents = allEvents.filter(
      (e: any) =>
        dateToDateString(e.event_date as Date | string) >= weekStart &&
        dateToDateString(e.event_date as Date | string) <= weekEnd
    )
    const weekBlocks = allBlocks.filter((b) => b.block_date >= weekStart && b.block_date <= weekEnd)

    // Run gap detection for just this week's events against ALL blocks
    // (blocks might be on adjacent days)
    const weekGaps = detectGaps(weekEvents, allBlocks, null)

    totalEvents += weekEvents.length
    totalGaps += weekGaps.length

    weeks.push({
      week_number: wk,
      week_start: weekStart,
      week_end: weekEnd,
      event_count: weekEvents.length,
      scheduled_block_count: weekBlocks.length,
      gap_count: weekGaps.length,
      has_gaps: weekGaps.length > 0,
    })
  }

  return { year, weeks, total_events: totalEvents, total_gaps: totalGaps }
}

/**
 * Scan all upcoming events for missing required blocks.
 * Used for the dashboard gap banner and week planner alerts.
 */
export async function getSchedulingGaps(): Promise<SchedulingGap[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const [events, blocks] = await Promise.all([
    fetchUpcomingEvents(db, tenantId),
    fetchPrepBlocks(db, tenantId),
  ])

  return detectGaps(events, blocks, null)
}

// ============================================
// WRITE ACTIONS
// ============================================

/**
 * Create a single prep block (chef manually adds a block).
 */
export async function createPrepBlock(input: CreatePrepBlockInput): Promise<{
  success: boolean
  block?: PrepBlock
  conflicts?: PrepBlockConflict[]
  error?: string
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Check for cross-event conflicts before creating (advisory, not blocking)
  const conflicts = await detectPrepBlockConflicts(
    db,
    user.tenantId!,
    input.block_date,
    input.start_time ?? null,
    input.end_time ?? null
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('event_prep_blocks')
    .insert({
      chef_id: user.tenantId!,
      event_id: input.event_id ?? null,
      block_date: input.block_date,
      start_time: input.start_time ?? null,
      end_time: input.end_time ?? null,
      block_type: input.block_type,
      title: input.title,
      notes: input.notes ?? null,
      store_name: input.store_name ?? null,
      store_address: input.store_address ?? null,
      estimated_duration_minutes: input.estimated_duration_minutes ?? null,
      is_system_generated: input.is_system_generated ?? false,
    })
    .select()
    .single()

  if (error) return { success: false, error: (error as { message: string }).message }

  revalidatePath('/calendar')
  revalidatePath('/calendar/week')
  revalidatePath('/calendar/year')
  if (input.event_id) revalidatePath(`/events/${input.event_id}`)

  return {
    success: true,
    block: data as PrepBlock,
    conflicts: conflicts.length > 0 ? conflicts : undefined,
  }
}

/**
 * Check all prep blocks within a date range for cross-event time conflicts.
 * Returns a flat list of conflicts (each pair reported once).
 * Useful for the calendar/week view to highlight overlapping blocks.
 */
export async function getPrepBlockConflicts(
  dateStart: string,
  dateEnd: string
): Promise<PrepBlockConflict[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const blocks = await fetchPrepBlocks(db, user.tenantId!, { dateStart, dateEnd })

  const conflicts: PrepBlockConflict[] = []
  const seen = new Set<string>()

  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i]
      const b = blocks[j]
      if (a.block_date !== b.block_date) continue
      if (!detectTimeOverlap(a.start_time, a.end_time, b.start_time, b.end_time)) continue

      const pairKey = [a.id, b.id].sort().join(':')
      if (seen.has(pairKey)) continue
      seen.add(pairKey)

      // Report the second block as the conflicting one
      conflicts.push({
        blockId: b.id,
        blockTitle: b.title,
        eventId: b.event_id,
        eventOccasion: null, // caller can enrich if needed
        blockDate: b.block_date,
        startTime: b.start_time,
        endTime: b.end_time,
      })
    }
  }
  return conflicts
}

/**
 * Save multiple blocks at once - used when chef confirms a batch of suggestions.
 * This is the only path after autoSuggestEventBlocks. AI policy compliant:
 * the suggestions are never auto-saved; this is always triggered by chef action.
 */
export async function bulkCreatePrepBlocks(
  blocks: CreatePrepBlockInput[]
): Promise<{ success: boolean; count?: number; error?: string }> {
  if (blocks.length === 0) return { success: true, count: 0 }

  const user = await requireChef()
  const db: any = createServerClient()

  const rows = blocks.map((input) => ({
    chef_id: user.tenantId!,
    event_id: input.event_id ?? null,
    block_date: input.block_date,
    start_time: input.start_time ?? null,
    end_time: input.end_time ?? null,
    block_type: input.block_type,
    title: input.title,
    notes: input.notes ?? null,
    store_name: input.store_name ?? null,
    store_address: input.store_address ?? null,
    estimated_duration_minutes: input.estimated_duration_minutes ?? null,
    is_system_generated: input.is_system_generated ?? false,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any).from('event_prep_blocks').insert(rows).select()

  if (error) return { success: false, error: (error as { message: string }).message }

  // Revalidate all affected paths
  const eventIds = [...new Set(blocks.map((b) => b.event_id).filter(Boolean))]
  revalidatePath('/calendar')
  revalidatePath('/calendar/week')
  revalidatePath('/calendar/year')
  for (const id of eventIds) {
    revalidatePath(`/events/${id}`)
  }

  return { success: true, count: (data as unknown[] | null)?.length ?? 0 }
}

/**
 * Edit a prep block's fields.
 */
export async function updatePrepBlock(
  id: string,
  updates: UpdatePrepBlockInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from('event_prep_blocks')
    .update({
      ...(updates.block_date !== undefined && { block_date: updates.block_date }),
      ...(updates.start_time !== undefined && { start_time: updates.start_time }),
      ...(updates.end_time !== undefined && { end_time: updates.end_time }),
      ...(updates.block_type !== undefined && { block_type: updates.block_type }),
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.notes !== undefined && { notes: updates.notes }),
      ...(updates.store_name !== undefined && { store_name: updates.store_name }),
      ...(updates.store_address !== undefined && { store_address: updates.store_address }),
      ...(updates.estimated_duration_minutes !== undefined && {
        estimated_duration_minutes: updates.estimated_duration_minutes,
      }),
      ...(updates.actual_duration_minutes !== undefined && {
        actual_duration_minutes: updates.actual_duration_minutes,
      }),
    })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) return { success: false, error: (error as { message: string }).message }

  revalidatePath('/calendar')
  revalidatePath('/calendar/week')
  revalidatePath('/calendar/year')

  return { success: true }
}

/**
 * Move every prep block for an event by the same day offset as an event reschedule.
 * This preserves the chef's manual timing decisions while keeping prep relative to service day.
 */
export async function moveEventPrepBlocks(
  eventId: string,
  fromDate: string,
  toDate: string
): Promise<{ success: boolean; moved?: number; error?: string }> {
  const user = await requireChef()

  if (!eventId.trim()) {
    return { success: false, error: 'Event is required' }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
    return { success: false, error: 'Invalid move date' }
  }

  const dayOffset = daysBetweenDates(fromDate, toDate)
  if (dayOffset === 0) return { success: true, moved: 0 }

  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: event, error: eventError } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (eventError) {
    console.error('[moveEventPrepBlocks] Event lookup failed:', eventError)
    return { success: false, error: 'Failed to verify event ownership' }
  }
  if (!event) {
    return { success: false, error: 'Event not found' }
  }

  const { data: blocks, error: blocksError } = await (db as any)
    .from('event_prep_blocks')
    .select('id, block_date')
    .eq('event_id', eventId)
    .eq('chef_id', tenantId)

  if (blocksError) {
    console.error('[moveEventPrepBlocks] Block lookup failed:', blocksError)
    return { success: false, error: 'Failed to load prep blocks' }
  }

  const rows = (blocks ?? []) as { id: string; block_date: string }[]
  for (const block of rows) {
    const { error } = await (db as any)
      .from('event_prep_blocks')
      .update({ block_date: shiftDateByDays(block.block_date, dayOffset) })
      .eq('id', block.id)
      .eq('chef_id', tenantId)

    if (error) {
      console.error('[moveEventPrepBlocks] Block move failed:', error)
      return { success: false, error: 'Failed to move every prep block' }
    }
  }

  revalidatePath('/calendar')
  revalidatePath('/calendar/week')
  revalidatePath('/calendar/year')
  revalidatePath(`/events/${eventId}`)

  return { success: true, moved: rows.length }
}

/**
 * Remove a prep block.
 */
export async function deletePrepBlock(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from('event_prep_blocks')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) return { success: false, error: (error as { message: string }).message }

  revalidatePath('/calendar')
  revalidatePath('/calendar/week')
  revalidatePath('/calendar/year')

  return { success: true }
}

/**
 * Mark a prep block as done.
 */
export async function completePrepBlock(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from('event_prep_blocks')
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) return { success: false, error: (error as { message: string }).message }

  revalidatePath('/calendar')
  revalidatePath('/calendar/week')
  revalidatePath('/calendar/year')

  return { success: true }
}

/**
 * Uncomplete a prep block (allow correction).
 */
export async function uncompletePrepBlock(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from('event_prep_blocks')
    .update({ is_completed: false, completed_at: null })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) return { success: false, error: (error as { message: string }).message }

  revalidatePath('/calendar')
  revalidatePath('/calendar/week')

  return { success: true }
}

// ============================================
// AUTO-PLACEMENT ACTION
// ============================================

/**
 * Auto-place prep blocks for an event.
 * Uses the deterministic rule-based engine (NOT AI output).
 * Skips if blocks already exist for this event (idempotent).
 * Called non-blocking after the paid→confirmed transition.
 */
export async function autoPlacePrepBlocks(eventId: string): Promise<{
  success: boolean
  placed: number
  skipped: boolean
  error?: string
}> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()
    const tenantId = user.tenantId!

    // Check if blocks already exist
    const existingBlocks = await fetchPrepBlocks(db, tenantId, { eventId })
    if (existingBlocks.length > 0) {
      return { success: true, placed: 0, skipped: true }
    }

    // Generate suggestions via rule-based engine
    const { suggestions } = await autoSuggestEventBlocks(eventId)
    if (suggestions.length === 0) {
      return { success: true, placed: 0, skipped: false }
    }

    // Map suggestions to CreatePrepBlockInput and persist
    const inputs: CreatePrepBlockInput[] = suggestions.map((s) => ({
      event_id: eventId,
      block_date: s.suggested_date,
      start_time: s.suggested_start_time ?? undefined,
      block_type: s.block_type,
      title: s.title,
      notes: s.notes ?? undefined,
      estimated_duration_minutes: s.estimated_duration_minutes ?? undefined,
      is_system_generated: true,
    }))

    const result = await bulkCreatePrepBlocks(inputs)
    if (!result.success) {
      return { success: false, placed: 0, skipped: false, error: result.error }
    }

    return { success: true, placed: result.count ?? 0, skipped: false }
  } catch (err) {
    return {
      success: false,
      placed: 0,
      skipped: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

// ============================================
// SUGGESTION ACTION (AI POLICY COMPLIANT)
// ============================================

/**
 * Generate suggestions for a single event - does NOT save to DB.
 * The caller shows these to the chef for review.
 * Only bulkCreatePrepBlocks() (triggered by explicit chef action) persists them.
 *
 * AI policy: generate only. Chef confirms. Then save.
 */
export async function autoSuggestEventBlocks(eventId: string): Promise<{
  suggestions: PrepBlockSuggestion[]
  error?: string
}> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()
    const tenantId = user.tenantId!

    // Fetch the event
    const { data: event } = await db
      .from('events')
      .select(`${EVENT_SELECT}, travel_time_minutes`)
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single()

    if (!event) return { suggestions: [], error: 'Event not found' }

    // Fetch existing blocks, chef preferences, and menu components in parallel
    const [existingBlocks, prefs, menuComponents] = await Promise.all([
      fetchPrepBlocks(db, tenantId, { eventId }),
      getChefPreferences(),
      fetchMenuComponents(db, tenantId, eventId),
    ])

    // Map event to scheduling shape
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schedulingEvent = mapEventToScheduling(event as Record<string, any>)

    // Run engine - pure computation, now with component awareness
    const suggestions = suggestPrepBlocks(schedulingEvent, existingBlocks, prefs, menuComponents)

    return { suggestions }
  } catch (err) {
    return {
      suggestions: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
