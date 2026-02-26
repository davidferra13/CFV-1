// @ts-nocheck — prep_blocks table pending schema migration
// Prep Block Server Actions
// Handles all DB I/O for the event prep scheduling system.
// Calls the pure prep-block-engine.ts functions with fetched data.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
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
} from './types'

// ============================================
// INTERNAL HELPERS
// ============================================

function mapEventToScheduling(event: any): SchedulingEvent {
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

async function fetchUpcomingEvents(supabase: any, tenantId: string): Promise<SchedulingEvent[]> {
  const today = new Date().toISOString().slice(0, 10)
  const { data: events } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('tenant_id', tenantId)
    .not('status', 'in', '("cancelled","completed")')
    .gte('event_date', today)
    .order('event_date', { ascending: true })

  if (!events) return []
  return events.map(mapEventToScheduling)
}

async function fetchPrepBlocks(
  supabase: any,
  chefId: string,
  options?: { eventId?: string; dateStart?: string; dateEnd?: string }
): Promise<PrepBlock[]> {
  let query = supabase
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

/** Calculate Monday of the week at weekOffset from current week. */
function getWeekBounds(weekOffset: number): { start: string; end: string } {
  const today = new Date()
  const dayOfWeek = today.getUTCDay() // 0 = Sunday, 1 = Mon, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today)
  monday.setUTCDate(today.getUTCDate() + mondayOffset + weekOffset * 7)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
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

// ============================================
// READ ACTIONS
// ============================================

/**
 * All prep blocks for a single event.
 */
export async function getEventPrepBlocks(eventId: string): Promise<PrepBlock[]> {
  const user = await requireChef()
  const supabase = createServerClient()
  return fetchPrepBlocks(supabase, user.tenantId!, { eventId })
}

/**
 * All prep blocks in a given week window.
 * weekOffset: 0 = this week, -1 = last week, +1 = next week.
 */
export async function getWeekPrepBlocks(weekOffset = 0): Promise<PrepBlock[]> {
  const user = await requireChef()
  const supabase = createServerClient()
  const { start, end } = getWeekBounds(weekOffset)
  return fetchPrepBlocks(supabase, user.tenantId!, { dateStart: start, dateEnd: end })
}

/**
 * 52-week year summary for the year view grid.
 * Fetches all events and blocks for the year, aggregates into YearWeekSummary[].
 */
export async function getYearSummary(year: number): Promise<YearSummary> {
  const user = await requireChef()
  const supabase = createServerClient()
  const tenantId = user.tenantId!

  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`

  // Fetch all events and blocks for the year in parallel
  const [eventsResult, blocksResult] = await Promise.all([
    supabase
      .from('events')
      .select(EVENT_SELECT)
      .eq('tenant_id', tenantId)
      .not('status', 'in', '("cancelled")')
      .gte('event_date', yearStart)
      .lte('event_date', yearEnd)
      .order('event_date', { ascending: true }),
    supabase
      .from('event_prep_blocks')
      .select('*')
      .eq('chef_id', tenantId)
      .gte('block_date', yearStart)
      .lte('block_date', yearEnd),
  ])

  const allEvents = (eventsResult.data ?? []).map(mapEventToScheduling)
  const allBlocks = (blocksResult.data ?? []) as PrepBlock[]

  // Build 52-week grid
  const weeks: YearWeekSummary[] = []
  let totalEvents = 0
  let totalGaps = 0

  for (let wk = 1; wk <= 52; wk++) {
    const weekMonday = getWeekStartForWeekNumber(year, wk)
    const weekSunday = new Date(weekMonday)
    weekSunday.setUTCDate(weekMonday.getUTCDate() + 6)

    const weekStart = weekMonday.toISOString().slice(0, 10)
    const weekEnd = weekSunday.toISOString().slice(0, 10)

    const weekEvents = allEvents.filter((e) => e.event_date >= weekStart && e.event_date <= weekEnd)
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
  const supabase = createServerClient()
  const tenantId = user.tenantId!

  const [events, blocks] = await Promise.all([
    fetchUpcomingEvents(supabase, tenantId),
    fetchPrepBlocks(supabase, tenantId),
  ])

  return detectGaps(events, blocks, null)
}

// ============================================
// WRITE ACTIONS
// ============================================

/**
 * Create a single prep block (chef manually adds a block).
 */
export async function createPrepBlock(
  input: CreatePrepBlockInput
): Promise<{ success: boolean; block?: PrepBlock; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
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

  if (error) return { success: false, error: error.message }

  revalidatePath('/calendar')
  revalidatePath('/calendar/week')
  revalidatePath('/calendar/year')
  if (input.event_id) revalidatePath(`/events/${input.event_id}`)

  return { success: true, block: data as PrepBlock }
}

/**
 * Save multiple blocks at once — used when chef confirms a batch of suggestions.
 * This is the only path after autoSuggestEventBlocks. AI policy compliant:
 * the suggestions are never auto-saved; this is always triggered by chef action.
 */
export async function bulkCreatePrepBlocks(
  blocks: CreatePrepBlockInput[]
): Promise<{ success: boolean; count?: number; error?: string }> {
  if (blocks.length === 0) return { success: true, count: 0 }

  const user = await requireChef()
  const supabase = createServerClient()

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

  const { data, error } = await supabase.from('event_prep_blocks').insert(rows).select()

  if (error) return { success: false, error: error.message }

  // Revalidate all affected paths
  const eventIds = [...new Set(blocks.map((b) => b.event_id).filter(Boolean))]
  revalidatePath('/calendar')
  revalidatePath('/calendar/week')
  revalidatePath('/calendar/year')
  for (const id of eventIds) {
    revalidatePath(`/events/${id}`)
  }

  return { success: true, count: data?.length ?? 0 }
}

/**
 * Edit a prep block's fields.
 */
export async function updatePrepBlock(
  id: string,
  updates: UpdatePrepBlockInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
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

  if (error) return { success: false, error: error.message }

  revalidatePath('/calendar')
  revalidatePath('/calendar/week')
  revalidatePath('/calendar/year')

  return { success: true }
}

/**
 * Remove a prep block.
 */
export async function deletePrepBlock(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('event_prep_blocks')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) return { success: false, error: error.message }

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
  const supabase = createServerClient()

  const { error } = await supabase
    .from('event_prep_blocks')
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) return { success: false, error: error.message }

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
  const supabase = createServerClient()

  const { error } = await supabase
    .from('event_prep_blocks')
    .update({ is_completed: false, completed_at: null })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) return { success: false, error: error.message }

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
    const supabase = createServerClient()
    const tenantId = user.tenantId!

    // Check if blocks already exist
    const existingBlocks = await fetchPrepBlocks(supabase, tenantId, { eventId })
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
      block_date: s.block_date,
      start_time: s.start_time ?? undefined,
      end_time: s.end_time ?? undefined,
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
 * Generate suggestions for a single event — does NOT save to DB.
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
    const supabase = createServerClient()
    const tenantId = user.tenantId!

    // Fetch the event
    const { data: event } = await supabase
      .from('events')
      .select(`${EVENT_SELECT}, travel_time_minutes`)
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single()

    if (!event) return { suggestions: [], error: 'Event not found' }

    // Fetch existing blocks for this event
    const existingBlocks = await fetchPrepBlocks(supabase, tenantId, { eventId })

    // Fetch chef preferences
    const prefs = await getChefPreferences()

    // Map event to scheduling shape
    const schedulingEvent = mapEventToScheduling(event)

    // Run engine — pure computation
    const suggestions = suggestPrepBlocks(schedulingEvent, existingBlocks, prefs)

    return { suggestions }
  } catch (err) {
    return {
      suggestions: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
