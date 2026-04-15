// Station Clipboard System - Daily Clipboard Operations
// Chef-only. Manages daily clipboard entries, shift check-in/out, and snapshots.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { notifyLowStock } from '@/lib/notifications/triggers'

// ============================================
// SCHEMAS
// ============================================

const UpdateClipboardEntrySchema = z.object({
  on_hand: z.number().min(0).optional(),
  made: z.number().min(0).optional(),
  made_at: z.string().optional(), // timestamp for shelf life calculation
  need_to_make: z.number().min(0).optional(),
  need_to_order: z.number().min(0).optional(),
  waste_qty: z.number().min(0).optional(),
  waste_reason_code: z
    .enum(['expired', 'over_production', 'dropped', 'contamination', 'quality', 'other'])
    .nullable()
    .optional(),
  location: z.enum(['line', 'backup']).optional(),
  notes: z.string().optional(),
  updated_by: z.string().uuid().optional(), // staff_member_id - who initialed this update
})

const ShiftCheckInSchema = z.object({
  station_id: z.string().uuid(),
  staff_member_id: z.string().uuid().nullable().optional(),
  shift_type: z.enum(['open', 'mid', 'close']),
})

const ShiftCheckOutSchema = z.object({
  station_id: z.string().uuid(),
  shift_log_id: z.string().uuid(),
  staff_member_id: z.string().uuid().nullable().optional(),
  notes: z.string().optional(),
})

export type UpdateClipboardEntryInput = z.infer<typeof UpdateClipboardEntrySchema>
export type ShiftCheckInInput = z.infer<typeof ShiftCheckInSchema>
export type ShiftCheckOutInput = z.infer<typeof ShiftCheckOutSchema>

// ============================================
// CLIPBOARD ENTRIES
// ============================================

/**
 * Get clipboard entries for a station on a specific date.
 * If no entries exist yet, auto-generates them from station components with default values.
 */
export async function getClipboardForDate(stationId: string, date: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Try to load existing entries
  const { data: existing, error } = await db
    .from('clipboard_entries')
    .select(
      `
      *,
      station_components (
        id,
        name,
        unit,
        par_level,
        par_unit,
        shelf_life_days,
        notes,
        station_menu_items (
          id,
          name
        )
      )
    `
    )
    .eq('station_id', stationId)
    .eq('chef_id', user.tenantId!)
    .eq('entry_date', date)
    .order('created_at')

  if (error) {
    console.error('[getClipboardForDate] Error:', error)
    throw new Error('Failed to load clipboard entries')
  }

  // If entries already exist, return them
  if (existing && existing.length > 0) {
    return existing
  }

  // Auto-generate entries from station components
  const { data: menuItems } = await db
    .from('station_menu_items')
    .select(
      `
      id,
      name,
      station_components (
        id,
        name,
        unit,
        par_level,
        par_unit,
        shelf_life_days,
        notes
      )
    `
    )
    .eq('station_id', stationId)
    .eq('chef_id', user.tenantId!)

  if (!menuItems || menuItems.length === 0) {
    return []
  }

  // Build insert rows for each component
  const insertRows: any[] = []
  for (const mi of menuItems) {
    for (const comp of (mi as any).station_components ?? []) {
      insertRows.push({
        chef_id: user.tenantId!,
        station_id: stationId,
        component_id: comp.id,
        entry_date: date,
        on_hand: 0,
        made: 0,
        need_to_make: 0,
        need_to_order: 0,
        waste_qty: 0,
        waste_reason_code: null,
        is_86d: false,
        eighty_sixed_at: null,
        location: 'line',
        notes: null,
      })
    }
  }

  if (insertRows.length === 0) {
    return []
  }

  const { data: created, error: insertError } = await db
    .from('clipboard_entries')
    .insert(insertRows).select(`
      *,
      station_components (
        id,
        name,
        unit,
        par_level,
        par_unit,
        shelf_life_days,
        notes,
        station_menu_items (
          id,
          name
        )
      )
    `)

  if (insertError) {
    console.error('[getClipboardForDate] Insert error:', insertError)
    throw new Error('Failed to generate clipboard entries')
  }

  return created ?? []
}

/**
 * Update a single clipboard entry (on_hand, made, etc.)
 */
export async function updateClipboardEntry(entryId: string, updates: UpdateClipboardEntryInput) {
  const user = await requireChef()
  const validated = UpdateClipboardEntrySchema.parse(updates)
  const db: any = createServerClient()

  const updatePayload: Record<string, unknown> = {}
  if (validated.on_hand !== undefined) updatePayload.on_hand = validated.on_hand
  if (validated.made !== undefined) {
    updatePayload.made = validated.made
    // Auto-set made_at timestamp when "made" is updated (for shelf life tracking)
    if (validated.made > 0) updatePayload.made_at = validated.made_at ?? new Date().toISOString()
  }
  if (validated.need_to_make !== undefined) updatePayload.need_to_make = validated.need_to_make
  if (validated.need_to_order !== undefined) updatePayload.need_to_order = validated.need_to_order
  if (validated.waste_qty !== undefined) updatePayload.waste_qty = validated.waste_qty
  if (validated.waste_reason_code !== undefined)
    updatePayload.waste_reason_code = validated.waste_reason_code
  if (validated.location !== undefined) updatePayload.location = validated.location
  if (validated.notes !== undefined) updatePayload.notes = validated.notes

  // ACCOUNTABILITY: Always record who made this update + when
  updatePayload.updated_by = validated.updated_by ?? null
  updatePayload.updated_at = new Date().toISOString()

  const { data, error } = await db
    .from('clipboard_entries')
    .update(updatePayload)
    .eq('id', entryId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateClipboardEntry] Error:', error)
    throw new Error('Failed to update clipboard entry')
  }

  // Non-blocking notification - check for low stock when on_hand was explicitly updated
  if (validated.on_hand !== undefined && data) {
    try {
      // Look up the component's par_level, name, and station name
      const { data: comp } = await db
        .from('station_components')
        .select('name, par_level, stations(name)')
        .eq('id', data.component_id)
        .single()

      if (comp && comp.par_level && comp.par_level > 0) {
        const onHand = validated.on_hand
        const parLevel = comp.par_level
        // Trigger if on_hand is below 50% of par_level
        if (onHand < parLevel * 0.5) {
          const stationName = (comp.stations as any)?.name ?? 'Unknown station'
          const componentName = comp.name ?? 'Unknown component'
          try {
            await notifyLowStock(user.tenantId!, stationName, componentName, onHand, parLevel)
          } catch (err) {
            console.error(
              '[updateClipboardEntry] Low stock notification inner failed (non-blocking):',
              err
            )
          }
        }
      }
    } catch (err) {
      console.error('[updateClipboardEntry] Low stock notification failed (non-fatal):', err)
    }
  }

  return data
}

/**
 * Batch-update multiple clipboard entries at once.
 * Accepts an array of { id, updates } pairs.
 */
export async function batchUpdateClipboard(
  entries: Array<{ id: string; updates: UpdateClipboardEntryInput }>,
  updatedBy?: string // staff_member_id - who is saving this batch (initials/accountability)
) {
  const user = await requireChef()
  const db: any = createServerClient()
  const now = new Date().toISOString()

  const results: any[] = []
  for (const entry of entries) {
    const validated = UpdateClipboardEntrySchema.parse(entry.updates)
    const updatePayload: Record<string, unknown> = {}
    if (validated.on_hand !== undefined) updatePayload.on_hand = validated.on_hand
    if (validated.made !== undefined) {
      updatePayload.made = validated.made
      if (validated.made > 0) updatePayload.made_at = validated.made_at ?? now
    }
    if (validated.need_to_make !== undefined) updatePayload.need_to_make = validated.need_to_make
    if (validated.need_to_order !== undefined) updatePayload.need_to_order = validated.need_to_order
    if (validated.waste_qty !== undefined) updatePayload.waste_qty = validated.waste_qty
    if (validated.waste_reason_code !== undefined)
      updatePayload.waste_reason_code = validated.waste_reason_code
    if (validated.location !== undefined) updatePayload.location = validated.location
    if (validated.notes !== undefined) updatePayload.notes = validated.notes

    // ACCOUNTABILITY: Record who saved this + when
    updatePayload.updated_by = updatedBy ?? validated.updated_by ?? null
    updatePayload.updated_at = now

    const { data, error } = await db
      .from('clipboard_entries')
      .update(updatePayload)
      .eq('id', entry.id)
      .eq('chef_id', user.tenantId!)
      .select()
      .single()

    if (error) {
      console.error('[batchUpdateClipboard] Error on entry:', entry.id, error)
      throw new Error(`Failed to update entry ${entry.id}`)
    }
    results.push(data)
  }

  revalidatePath('/stations')
  return results
}

/**
 * Mark a clipboard entry as 86'd (unavailable).
 */
export async function markAs86(entryId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('clipboard_entries')
    .update({
      is_86d: true,
      eighty_sixed_at: new Date().toISOString(),
    })
    .eq('id', entryId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[markAs86] Error:', error)
    throw new Error("Failed to mark item as 86'd")
  }

  revalidatePath('/stations')
  return data
}

/**
 * Unmark a clipboard entry from 86'd status.
 */
export async function unmark86(entryId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('clipboard_entries')
    .update({
      is_86d: false,
      eighty_sixed_at: null,
    })
    .eq('id', entryId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[unmark86] Error:', error)
    throw new Error("Failed to unmark 86'd status")
  }

  revalidatePath('/stations')
  return data
}

// ============================================
// SHIFT LOG
// ============================================

/**
 * Create a shift check-in entry for a station.
 */
export async function shiftCheckIn(input: ShiftCheckInInput) {
  const user = await requireChef()
  const validated = ShiftCheckInSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('shift_logs')
    .insert({
      chef_id: user.tenantId!,
      station_id: validated.station_id,
      staff_member_id: validated.staff_member_id ?? null,
      shift_type: validated.shift_type,
      check_in_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('[shiftCheckIn] Error:', error)
    throw new Error('Failed to check in')
  }

  revalidatePath(`/stations/${validated.station_id}`)
  return data
}

/**
 * Close out a shift - snapshot the current clipboard state and save handoff notes.
 */
export async function shiftCheckOut(input: ShiftCheckOutInput) {
  const user = await requireChef()
  const validated = ShiftCheckOutSchema.parse(input)
  const db: any = createServerClient()

  // Build snapshot of current clipboard state
  const _cba = new Date()
  const today = `${_cba.getFullYear()}-${String(_cba.getMonth() + 1).padStart(2, '0')}-${String(_cba.getDate()).padStart(2, '0')}`
  const { data: clipboardState } = await db
    .from('clipboard_entries')
    .select('*')
    .eq('station_id', validated.station_id)
    .eq('chef_id', user.tenantId!)
    .eq('entry_date', today)

  const snapshot = {
    captured_at: new Date().toISOString(),
    entries: clipboardState ?? [],
  }

  const { data, error } = await db
    .from('shift_logs')
    .update({
      check_out_at: new Date().toISOString(),
      notes: validated.notes ?? null,
      snapshot,
    })
    .eq('id', validated.shift_log_id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[shiftCheckOut] Error:', error)
    throw new Error('Failed to check out')
  }

  revalidatePath(`/stations/${validated.station_id}`)
  return data
}

/**
 * Get shift log for a station within a date range.
 */
export async function getShiftLog(stationId: string, startDate: string, endDate: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('shift_logs')
    .select('*')
    .eq('station_id', stationId)
    .eq('chef_id', user.tenantId!)
    .gte('check_in_at', `${startDate}T00:00:00`)
    .lte('check_in_at', `${endDate}T23:59:59`)
    .order('check_in_at', { ascending: false })

  if (error) {
    console.error('[getShiftLog] Error:', error)
    throw new Error('Failed to load shift log')
  }

  return data ?? []
}

/**
 * Get the most recent completed shift log for a station (for displaying last handoff).
 */
export async function getLastShiftHandoff(stationId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('shift_logs')
    .select('*')
    .eq('station_id', stationId)
    .eq('chef_id', user.tenantId!)
    .not('check_out_at', 'is', null)
    .order('check_out_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found - that's fine
    console.error('[getLastShiftHandoff] Error:', error)
  }

  return data ?? null
}

/**
 * Get all currently 86'd items across ALL stations for this chef.
 */
export async function getAll86dItems() {
  const user = await requireChef()
  const db: any = createServerClient()

  const _cba = new Date()
  const today = `${_cba.getFullYear()}-${String(_cba.getMonth() + 1).padStart(2, '0')}-${String(_cba.getDate()).padStart(2, '0')}`

  const { data, error } = await db
    .from('clipboard_entries')
    .select(
      `
      *,
      stations (id, name),
      station_components (id, name, unit)
    `
    )
    .eq('chef_id', user.tenantId!)
    .eq('entry_date', today)
    .eq('is_86d', true)
    .order('eighty_sixed_at', { ascending: false })

  if (error) {
    console.error('[getAll86dItems] Error:', error)
    throw new Error("Failed to load 86'd items")
  }

  return data ?? []
}
