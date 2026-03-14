// Availability & Waitlist Management — Server Actions
// Chefs can block dates, view monthly availability, and manage a waitlist.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  detectSessionEventConflicts,
  type PlannedSessionForConflict,
} from '@/lib/availability/session-conflicts'

// ============================================
// SCHEMAS
// ============================================

const BlockDateSchema = z.object({
  block_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  block_type: z.enum(['full_day', 'partial']).default('full_day'),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  reason: z.string().optional(),
})

const WaitlistEntrySchema = z.object({
  requested_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  requested_date_end: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  client_id: z.string().uuid().nullable().optional(),
  occasion: z.string().optional(),
  guest_count_estimate: z.number().int().positive().nullable().optional(),
  notes: z.string().optional(),
  expires_at: z.string().nullable().optional(),
})

export type BlockDateInput = z.infer<typeof BlockDateSchema>
export type WaitlistEntryInput = z.infer<typeof WaitlistEntrySchema>

// ============================================
// AVAILABILITY BLOCK ACTIONS
// ============================================

export async function blockDate(input: BlockDateInput) {
  const user = await requireChef()
  const validated = BlockDateSchema.parse(input)
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('chef_availability_blocks')
    .insert({
      chef_id: user.tenantId!,
      ...validated,
      is_event_auto: false,
    })
    .select()
    .single()

  if (error) {
    console.error('[blockDate] Error:', error)
    throw new Error('Failed to block date')
  }

  revalidatePath('/calendar')
  return data
}

export async function unblockDate(blockId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('chef_availability_blocks')
    .delete()
    .eq('id', blockId)
    .eq('chef_id', user.tenantId!)
    .eq('is_event_auto', false) // cannot manually delete auto-blocks

  if (error) throw new Error('Failed to remove block')
  revalidatePath('/calendar')
}

/**
 * Auto-block a date when an event is confirmed.
 * Called from the event transition logic.
 */
export async function autoBlockEventDate(eventId: string, chefId: string, eventDate: string) {
  const supabase: any = createServerClient()

  // Idempotent: skip if already blocked for this event
  const { data: existing } = await supabase
    .from('chef_availability_blocks')
    .select('id')
    .eq('chef_id', chefId)
    .eq('event_id', eventId)
    .maybeSingle()

  if (existing) return

  await supabase.from('chef_availability_blocks').insert({
    chef_id: chefId,
    block_date: eventDate,
    block_type: 'full_day',
    is_event_auto: true,
    event_id: eventId,
    reason: 'Confirmed event',
  })
}

/**
 * Remove auto-block when an event is cancelled.
 */
export async function removeEventAutoBlock(eventId: string) {
  const supabase: any = createServerClient()
  await supabase
    .from('chef_availability_blocks')
    .delete()
    .eq('event_id', eventId)
    .eq('is_event_auto', true)
}

/**
 * Get availability for a month.
 * Returns an object keyed by ISO date string with type: 'event' | 'blocked' | 'free'
 */
export async function getAvailabilityForMonth(
  year: number,
  month: number // 1-12
): Promise<Record<string, 'event_auto' | 'blocked' | 'free'>> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0] // last day of month

  const { data: blocks } = await supabase
    .from('chef_availability_blocks')
    .select('block_date, is_event_auto')
    .eq('chef_id', user.tenantId!)
    .gte('block_date', startDate)
    .lte('block_date', endDate)

  const result: Record<string, 'event_auto' | 'blocked' | 'free'> = {}
  for (const block of blocks ?? []) {
    result[block.block_date] = block.is_event_auto ? 'event_auto' : 'blocked'
  }
  return result
}

export async function isDateAvailable(date: string): Promise<boolean> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('chef_availability_blocks')
    .select('id')
    .eq('chef_id', user.tenantId!)
    .eq('block_date', date)
    .maybeSingle()

  return !data
}

export type DateConflictResult = {
  hasManualBlock: boolean
  existingEvents: { id: string; title: string; status: string }[]
  isHardBlocked: boolean // full-day manual block — strongest signal
  warnings: string[]
}

export type SeriesSessionConflict = {
  session_date: string
  meal_slot: string
  reason: string
}

export type SeriesSessionConflictCheckResult = {
  hasConflicts: boolean
  conflicts: SeriesSessionConflict[]
}

function parseTimeToMinutes(value: string | null): number | null {
  if (!value) return null
  const parts = value.split(':')
  if (parts.length < 2) return null
  const hours = Number.parseInt(parts[0] || '0', 10)
  const minutes = Number.parseInt(parts[1] || '0', 10)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return hours * 60 + minutes
}

function buildWindowMinutes(
  start: string | null,
  end: string | null,
  fallbackMinutes: number
): { start: number; end: number } | null {
  const startMinutes = parseTimeToMinutes(start)
  if (startMinutes == null) return null
  const endMinutes = parseTimeToMinutes(end)
  if (endMinutes == null || endMinutes <= startMinutes) {
    return { start: startMinutes, end: startMinutes + fallbackMinutes }
  }
  return { start: startMinutes, end: endMinutes }
}

function overlapsWindowMinutes(
  a: { start: number; end: number },
  b: { start: number; end: number }
): boolean {
  return a.start < b.end && b.start < a.end
}

/**
 * Check if a proposed event date conflicts with existing blocks or events.
 * Returns warnings (soft) or hard block signal — does NOT prevent creation.
 * Pass excludeEventId when checking in edit mode to skip the event being edited.
 */
export async function checkDateConflicts(
  date: string,
  excludeEventId?: string
): Promise<DateConflictResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Parallel: availability blocks + existing events on same date
  const [blocksResult, eventsResult] = await Promise.all([
    supabase
      .from('chef_availability_blocks')
      .select('id, block_type, reason, is_event_auto')
      .eq('chef_id', user.tenantId!)
      .eq('block_date', date),
    supabase
      .from('events')
      .select('id, occasion, status')
      .eq('tenant_id', user.tenantId!)
      .eq('event_date', date)
      .neq('status', 'cancelled'),
  ])

  const blocks: any[] = blocksResult.data ?? []
  let events: any[] = eventsResult.data ?? []

  if (excludeEventId) {
    events = events.filter((e: any) => e.id !== excludeEventId)
  }

  const manualBlocks = blocks.filter((b: any) => !b.is_event_auto)
  const autoBlocks = blocks.filter((b: any) => b.is_event_auto)
  const hasManualBlock = manualBlocks.length > 0
  const isHardBlocked = manualBlocks.some((b: any) => b.block_type === 'full_day')

  const existingEvents = events.map((e: any) => ({
    id: e.id,
    title: e.occasion || 'Untitled event',
    status: e.status,
  }))

  const warnings: string[] = []
  if (hasManualBlock) {
    const reason = manualBlocks[0]?.reason
    warnings.push(
      reason
        ? `This date is manually blocked: "${reason}".`
        : 'This date has been manually blocked.'
    )
  }
  if (autoBlocks.length > 0) {
    warnings.push('A confirmed event already blocks this date.')
  }
  if (existingEvents.length > 0) {
    const names = existingEvents.map((e) => `"${e.title}" (${e.status})`).join(', ')
    warnings.push(`Existing event(s) on this date: ${names}.`)
  }

  // Merge in scheduling rules validation (non-blocking if rules table doesn't exist yet)
  try {
    const { validateDateAgainstRules } = await import('@/lib/availability/rules-actions')
    const rulesResult = await validateDateAgainstRules(date, excludeEventId)
    if (rulesResult.blockers.length > 0) {
      warnings.push(...rulesResult.blockers.map((b) => `[Rule] ${b}`))
    }
    if (rulesResult.warnings.length > 0) {
      warnings.push(...rulesResult.warnings.map((w) => `[Rule] ${w}`))
    }
  } catch {
    // Rules table may not exist yet — silently skip
  }

  return { hasManualBlock, existingEvents, isHardBlocked, warnings }
}

/**
 * Validate a set of planned sessions against existing events, manual blocks,
 * and booking notice rules before materializing a multi-day series.
 */
export async function checkSeriesSessionConflicts(
  sessions: PlannedSessionForConflict[]
): Promise<SeriesSessionConflictCheckResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  if (sessions.length === 0) {
    return { hasConflicts: false, conflicts: [] }
  }

  const dates = [...new Set(sessions.map((session) => session.session_date))].sort()
  const rangeStart = dates[0]
  const rangeEnd = dates[dates.length - 1]
  if (!rangeStart || !rangeEnd) return { hasConflicts: false, conflicts: [] }

  const [{ data: chef }, { data: blocks }, { data: events }] = await Promise.all([
    supabase.from('chefs').select('booking_min_notice_days').eq('id', user.tenantId!).single(),
    supabase
      .from('chef_availability_blocks')
      .select('block_date, block_type, start_time, end_time, reason, is_event_auto')
      .eq('chef_id', user.tenantId!)
      .gte('block_date', rangeStart)
      .lte('block_date', rangeEnd),
    supabase
      .from('events')
      .select('id, event_date, status, occasion, serve_time, arrival_time, departure_time')
      .eq('tenant_id', user.tenantId!)
      .in('status', ['confirmed', 'in_progress', 'paid', 'accepted'])
      .gte('event_date', rangeStart)
      .lte('event_date', `${rangeEnd}T23:59:59Z`),
  ])

  const conflicts: SeriesSessionConflict[] = []
  const minNoticeDays = Number(chef?.booking_min_notice_days || 0)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const manualBlocksByDate = new Map<
    string,
    Array<{
      block_type: string
      reason: string | null
      start_time: string | null
      end_time: string | null
    }>
  >()

  for (const block of blocks || []) {
    if (block.is_event_auto) continue
    const date = block.block_date as string
    const existing = manualBlocksByDate.get(date) || []
    existing.push({
      block_type: block.block_type,
      reason: block.reason,
      start_time: block.start_time,
      end_time: block.end_time,
    })
    manualBlocksByDate.set(date, existing)
  }

  for (const session of sessions) {
    const sessionDate = session.session_date
    const sessionDateValue = new Date(`${sessionDate}T00:00:00.000Z`)
    const daysAhead = Math.floor(
      (sessionDateValue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysAhead < minNoticeDays) {
      conflicts.push({
        session_date: sessionDate,
        meal_slot: session.meal_slot,
        reason: `Date violates minimum notice (${daysAhead}d ahead, requires ${minNoticeDays}d)`,
      })
    }

    const blockConflicts = manualBlocksByDate.get(sessionDate) || []
    for (const block of blockConflicts) {
      if (block.block_type === 'full_day') {
        conflicts.push({
          session_date: sessionDate,
          meal_slot: session.meal_slot,
          reason: block.reason
            ? `Date is manually blocked: ${block.reason}`
            : 'Date is manually blocked',
        })
      } else {
        const sessionWindow = buildWindowMinutes(session.start_time, session.end_time, 240)
        const blockWindow = buildWindowMinutes(block.start_time, block.end_time, 240)

        if (!sessionWindow) {
          conflicts.push({
            session_date: sessionDate,
            meal_slot: session.meal_slot,
            reason:
              'Date has a partial availability block. Add session times to check overlap accurately.',
          })
          continue
        }

        if (!blockWindow || overlapsWindowMinutes(sessionWindow, blockWindow)) {
          conflicts.push({
            session_date: sessionDate,
            meal_slot: session.meal_slot,
            reason: block.reason
              ? `Session overlaps partial availability block: ${block.reason}`
              : 'Session overlaps a partial availability block',
          })
        }
      }
    }
  }

  const eventConflicts = detectSessionEventConflicts({
    sessions,
    events: (events || []).map((event: any) => ({
      id: event.id,
      event_date: String(event.event_date),
      status: String(event.status),
      occasion: event.occasion ?? null,
      serve_time: event.serve_time ?? null,
      arrival_time: event.arrival_time ?? null,
      departure_time: event.departure_time ?? null,
    })),
  })

  for (const conflict of eventConflicts) {
    conflicts.push({
      session_date: conflict.session_date,
      meal_slot: conflict.meal_slot,
      reason: conflict.reason,
    })
  }

  const deduped = new Map<string, SeriesSessionConflict>()
  for (const conflict of conflicts) {
    const key = `${conflict.session_date}|${conflict.meal_slot}|${conflict.reason}`
    if (!deduped.has(key)) deduped.set(key, conflict)
  }

  return {
    hasConflicts: deduped.size > 0,
    conflicts: Array.from(deduped.values()).sort((a, b) => {
      const dateCompare = a.session_date.localeCompare(b.session_date)
      if (dateCompare !== 0) return dateCompare
      return a.meal_slot.localeCompare(b.meal_slot)
    }),
  }
}

// ============================================
// WAITLIST ACTIONS
// ============================================

export async function addToWaitlist(input: WaitlistEntryInput) {
  const user = await requireChef()
  const validated = WaitlistEntrySchema.parse(input)
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('waitlist_entries')
    .insert({
      chef_id: user.tenantId!,
      ...validated,
      status: 'waiting',
    })
    .select()
    .single()

  if (error) {
    console.error('[addToWaitlist] Error:', error)
    throw new Error('Failed to add to waitlist')
  }

  revalidatePath('/waitlist')
  return data
}

export async function contactWaitlistEntry(entryId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  await supabase
    .from('waitlist_entries')
    .update({ status: 'contacted', contacted_at: new Date().toISOString() })
    .eq('id', entryId)
    .eq('chef_id', user.tenantId!)

  revalidatePath('/waitlist')
}

export async function convertWaitlistEntry(entryId: string, eventId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  await supabase
    .from('waitlist_entries')
    .update({ status: 'converted', converted_event_id: eventId })
    .eq('id', entryId)
    .eq('chef_id', user.tenantId!)

  revalidatePath('/waitlist')
}

export async function expireWaitlistEntry(entryId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  await supabase
    .from('waitlist_entries')
    .update({ status: 'expired' })
    .eq('id', entryId)
    .eq('chef_id', user.tenantId!)

  revalidatePath('/waitlist')
}

export async function getWaitlistEntries(status?: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('waitlist_entries')
    .select(
      `
      *,
      clients (id, full_name, email, phone)
    `
    )
    .eq('chef_id', user.tenantId!)
    .order('requested_date', { ascending: true })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw new Error('Failed to load waitlist')
  return data ?? []
}

export async function getWaitlistForDate(date: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('waitlist_entries')
    .select(
      `
      *,
      clients (id, full_name, email, phone)
    `
    )
    .eq('chef_id', user.tenantId!)
    .eq('requested_date', date)
    .eq('status', 'waiting')
    .order('created_at')

  return data ?? []
}
