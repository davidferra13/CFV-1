// Staff Portal - Server Actions
// Read-heavy actions for staff members to view their tasks, assignments, station, and recipes.
// All actions call requireStaff() first and scope queries by staff_member_id AND chef_id (tenant).

'use server'

import { requireStaff } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { pgClient } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { dateToDateString } from '@/lib/utils/format'

// ============================================
// TYPES
// ============================================

export type StaffTask = {
  id: string
  chef_id: string
  title: string
  description: string | null
  assigned_to: string | null
  station_id: string | null
  event_id: string | null
  due_date: string
  due_time: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'done'
  notes: string | null
  completed_at: string | null
  created_at: string
  station?: { id: string; name: string } | null
  event_name?: string | null
  event_date?: string | null
  event_guest_count?: number | null
  client_name?: string | null
}

export type StaffAssignment = {
  id: string
  event_id: string
  staff_member_id: string
  role_override: string | null
  scheduled_hours: number | null
  actual_hours: number | null
  status: 'scheduled' | 'confirmed' | 'completed' | 'no_show'
  notes: string | null
  event?: {
    id: string
    occasion: string | null
    event_date: string
    serve_time: string | null
    departure_time: string | null
    status: string
  } | null
}

export type StaffStation = {
  id: string
  name: string
  description: string | null
  status: string
}

export type StaffRecipe = {
  id: string
  name: string
  description: string | null
  servings: number | null
  prep_time_minutes: number | null
  cook_time_minutes: number | null
  method: string | null
}

export type ActiveShift = {
  id: string
  station_id: string
  shift: string
  check_in_at: string
}

export type StaffProfile = {
  id: string
  name: string
  role: string
  phone: string | null
  email: string | null
}

// ============================================
// GET MY PROFILE
// ============================================

export async function getMyProfile(): Promise<StaffProfile | null> {
  const user = await requireStaff()
  const db: any = createServerClient({ admin: true })

  const { data, error } = await db
    .from('staff_members')
    .select('id, name, role, phone, email')
    .eq('id', user.staffMemberId)
    .eq('chef_id', user.tenantId)
    .single()

  if (error) {
    console.error('[getMyProfile] Error:', error)
    return null
  }

  return data as StaffProfile
}

// ============================================
// GET MY TASKS (filtered to this staff member)
// ============================================

export async function getMyTasks(date?: string): Promise<StaffTask[]> {
  const user = await requireStaff()

  try {
    let rows: any[]
    if (date) {
      rows = await pgClient`
        SELECT
          t.id, t.chef_id, t.title, t.description, t.assigned_to,
          t.station_id, t.event_id, t.due_date, t.due_time,
          t.priority, t.status, t.notes, t.completed_at, t.created_at,
          e.title AS event_name,
          e.date  AS event_date,
          e.guest_count AS event_guest_count,
          c.name AS client_name
        FROM tasks t
        LEFT JOIN events e ON e.id = t.event_id
        LEFT JOIN clients c ON c.id = e.client_id
        WHERE t.chef_id = ${user.tenantId}
          AND t.assigned_to = ${user.staffMemberId}
          AND t.due_date = ${date}
        ORDER BY t.due_date ASC, t.due_time ASC NULLS LAST, t.priority DESC
      `
    } else {
      rows = await pgClient`
        SELECT
          t.id, t.chef_id, t.title, t.description, t.assigned_to,
          t.station_id, t.event_id, t.due_date, t.due_time,
          t.priority, t.status, t.notes, t.completed_at, t.created_at,
          e.title AS event_name,
          e.date  AS event_date,
          e.guest_count AS event_guest_count,
          c.name AS client_name
        FROM tasks t
        LEFT JOIN events e ON e.id = t.event_id
        LEFT JOIN clients c ON c.id = e.client_id
        WHERE t.chef_id = ${user.tenantId}
          AND t.assigned_to = ${user.staffMemberId}
        ORDER BY t.due_date ASC, t.due_time ASC NULLS LAST, t.priority DESC
      `
    }
    return rows as unknown as StaffTask[]
  } catch (err) {
    console.error('[getMyTasks] Error:', err)
    return []
  }
}

// ============================================
// GET MY TASKS GROUPED BY DATE
// ============================================

export async function getMyTasksGroupedByDate(): Promise<Record<string, StaffTask[]>> {
  const user = await requireStaff()

  // Get upcoming tasks (today and future, plus recently overdue)
  const _waN = new Date()
  const _waD = new Date(_waN.getFullYear(), _waN.getMonth(), _waN.getDate() - 7)
  const weekAgo = `${_waD.getFullYear()}-${String(_waD.getMonth() + 1).padStart(2, '0')}-${String(_waD.getDate()).padStart(2, '0')}`

  try {
    const rows = await pgClient`
      SELECT
        t.id, t.chef_id, t.title, t.description, t.assigned_to,
        t.station_id, t.event_id, t.due_date, t.due_time,
        t.priority, t.status, t.notes, t.completed_at, t.created_at,
        e.title AS event_name,
        e.date  AS event_date,
        e.guest_count AS event_guest_count,
        c.name AS client_name
      FROM tasks t
      LEFT JOIN events e ON e.id = t.event_id
      LEFT JOIN clients c ON c.id = e.client_id
      WHERE t.chef_id = ${user.tenantId}
        AND t.assigned_to = ${user.staffMemberId}
        AND t.due_date >= ${weekAgo}
      ORDER BY t.due_date ASC, t.due_time ASC NULLS LAST, t.priority DESC
    `

    const tasks = rows as unknown as StaffTask[]
    const grouped: Record<string, StaffTask[]> = {}

    for (const task of tasks) {
      const dateKey = dateToDateString(task.due_date as Date | string)
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(task)
    }

    return grouped
  } catch (err) {
    console.error('[getMyTasksGroupedByDate] Error:', err)
    return {}
  }
}

// ============================================
// COMPLETE MY TASK (only if assigned to me)
// ============================================

export async function completeMyTask(taskId: string): Promise<{ success: boolean }> {
  const user = await requireStaff()
  const db: any = createServerClient({ admin: true })
  const now = new Date().toISOString()

  // Verify the task is assigned to this staff member and belongs to the tenant
  const { data: task, error: fetchError } = await db
    .from('tasks')
    .select('id, assigned_to')
    .eq('id', taskId)
    .eq('chef_id', user.tenantId)
    .eq('assigned_to', user.staffMemberId)
    .single()

  if (fetchError || !task) {
    throw new Error('Task not found or not assigned to you')
  }

  // Mark as done
  const { error: updateError } = await db
    .from('tasks')
    .update({
      status: 'done',
      completed_at: now,
      completed_by: user.staffMemberId,
    })
    .eq('id', taskId)
    .eq('chef_id', user.tenantId)

  if (updateError) {
    console.error('[completeMyTask] Error:', updateError)
    throw new Error('Failed to complete task')
  }

  // Log completion - non-blocking
  try {
    await db.from('task_completion_log').insert({
      chef_id: user.tenantId,
      task_id: taskId,
      staff_member_id: user.staffMemberId,
      completed_at: now,
    })
  } catch (err) {
    console.error('[completeMyTask] Completion log failed (non-blocking):', err)
  }

  revalidatePath('/staff-tasks')
  revalidatePath('/staff-dashboard')
  return { success: true }
}

// ============================================
// UNCOMPLETE MY TASK (reopen - only if assigned to me)
// ============================================

export async function uncompleteMyTask(taskId: string): Promise<{ success: boolean }> {
  const user = await requireStaff()
  const db: any = createServerClient({ admin: true })

  // Verify the task is assigned to this staff member
  const { data: task, error: fetchError } = await db
    .from('tasks')
    .select('id, assigned_to')
    .eq('id', taskId)
    .eq('chef_id', user.tenantId)
    .eq('assigned_to', user.staffMemberId)
    .single()

  if (fetchError || !task) {
    throw new Error('Task not found or not assigned to you')
  }

  const { error: updateError } = await db
    .from('tasks')
    .update({
      status: 'pending',
      completed_at: null,
      completed_by: null,
    })
    .eq('id', taskId)
    .eq('chef_id', user.tenantId)

  if (updateError) {
    console.error('[uncompleteMyTask] Error:', updateError)
    throw new Error('Failed to reopen task')
  }

  revalidatePath('/staff-tasks')
  revalidatePath('/staff-dashboard')
  return { success: true }
}

// ============================================
// GET MY ASSIGNMENTS (upcoming event assignments)
// ============================================

export async function getMyAssignments(): Promise<StaffAssignment[]> {
  const user = await requireStaff()
  const db: any = createServerClient({ admin: true })

  const { data, error } = await db
    .from('event_staff_assignments')
    .select(
      `
      id, event_id, staff_member_id, role_override, scheduled_hours, actual_hours, status, notes,
      event:events!event_staff_assignments_event_id_fkey (
        id, occasion, event_date, serve_time, departure_time, status
      )
    `
    )
    .eq('chef_id', user.tenantId)
    .eq('staff_member_id', user.staffMemberId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getMyAssignments] Error:', error)
    return []
  }

  return (data ?? []) as unknown as StaffAssignment[]
}

// ============================================
// GET MY UPCOMING ASSIGNMENTS (future events only)
// ============================================

export async function getMyUpcomingAssignments(): Promise<StaffAssignment[]> {
  const user = await requireStaff()
  const db: any = createServerClient({ admin: true })

  const _spa = new Date()
  const today = `${_spa.getFullYear()}-${String(_spa.getMonth() + 1).padStart(2, '0')}-${String(_spa.getDate()).padStart(2, '0')}`

  const { data, error } = await db
    .from('event_staff_assignments')
    .select(
      `
      id, event_id, staff_member_id, role_override, scheduled_hours, actual_hours, status, notes,
      event:events!event_staff_assignments_event_id_fkey (
        id, occasion, event_date, serve_time, departure_time, status
      )
    `
    )
    .eq('chef_id', user.tenantId)
    .eq('staff_member_id', user.staffMemberId)
    .in('status', ['scheduled', 'confirmed'])
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getMyUpcomingAssignments] Error:', error)
    return []
  }

  // Filter to events with date >= today (done client-side since join filtering is tricky)
  const assignments = (data ?? []) as unknown as StaffAssignment[]
  return assignments.filter((a) => {
    const eventDate = (a.event as any)?.date
    return eventDate && eventDate >= today
  })
}

// ============================================
// GET MY STATION(S) - find which station(s) this staff member is assigned to
// ============================================

export async function getMyStations(): Promise<StaffStation[]> {
  const user = await requireStaff()
  const db: any = createServerClient({ admin: true })

  // Find stations through shift_logs - staff who checked in most recently
  // Also check tasks assigned to the staff member that reference a station
  const { data: taskStations, error: taskError } = await db
    .from('tasks')
    .select('station_id')
    .eq('chef_id', user.tenantId)
    .eq('assigned_to', user.staffMemberId)
    .not('station_id', 'is', null)
    .limit(50)

  if (taskError) {
    console.error('[getMyStations] Task query error:', taskError)
  }

  // Also find from shift_logs
  const { data: shiftStations, error: shiftError } = await db
    .from('shift_logs')
    .select('station_id')
    .eq('chef_id', user.tenantId)
    .eq('staff_member_id', user.staffMemberId)
    .order('check_in_at', { ascending: false })
    .limit(20)

  if (shiftError) {
    console.error('[getMyStations] Shift query error:', shiftError)
  }

  // Collect unique station IDs
  const stationIds = new Set<string>()
  for (const t of taskStations ?? []) {
    if (t.station_id) stationIds.add(t.station_id)
  }
  for (const s of shiftStations ?? []) {
    if (s.station_id) stationIds.add(s.station_id)
  }

  if (stationIds.size === 0) {
    // If no specific assignment found, return all active stations for the tenant
    // so staff can still navigate to their station
    const { data: allStations, error: allError } = await db
      .from('stations')
      .select('id, name, description, status')
      .eq('chef_id', user.tenantId)
      .eq('status', 'active')
      .order('display_order', { ascending: true })

    if (allError) {
      console.error('[getMyStations] All stations query error:', allError)
      return []
    }

    return (allStations ?? []) as StaffStation[]
  }

  const { data: stations, error: stationsError } = await db
    .from('stations')
    .select('id, name, description, status')
    .eq('chef_id', user.tenantId)
    .in('id', Array.from(stationIds))
    .eq('status', 'active')
    .order('display_order', { ascending: true })

  if (stationsError) {
    console.error('[getMyStations] Stations query error:', stationsError)
    return []
  }

  return (stations ?? []) as StaffStation[]
}

// ============================================
// GET STATION CLIPBOARD (read-only for staff, editable for on_hand/waste)
// ============================================

export async function getStationClipboard(stationId: string, date: string) {
  const user = await requireStaff()
  const db: any = createServerClient({ admin: true })

  // Verify station belongs to tenant
  const { data: station, error: stationError } = await db
    .from('stations')
    .select('id, name, description')
    .eq('id', stationId)
    .eq('chef_id', user.tenantId)
    .single()

  if (stationError || !station) {
    throw new Error('Station not found')
  }

  // Get clipboard entries
  const { data: entries, error: entriesError } = await db
    .from('clipboard_entries')
    .select(
      `
      id, component_id, entry_date, on_hand, made, need_to_make, need_to_order,
      waste_qty, waste_reason_code, is_86d, eighty_sixed_at, location, notes,
      station_components (
        id, name, unit, par_level, par_unit, shelf_life_days, notes,
        station_menu_items (
          id, name
        )
      )
    `
    )
    .eq('station_id', stationId)
    .eq('chef_id', user.tenantId)
    .eq('entry_date', date)
    .order('created_at', { ascending: true })

  if (entriesError) {
    console.error('[getStationClipboard] Error:', entriesError)
    return { station, entries: [] }
  }

  return { station, entries: entries ?? [] }
}

// ============================================
// UPDATE CLIPBOARD ENTRY (staff can update on_hand and waste only)
// ============================================

export async function updateClipboardEntry(
  entryId: string,
  updates: {
    on_hand?: number
    waste_qty?: number
    waste_reason_code?: string | null
    notes?: string
  }
) {
  const user = await requireStaff()
  const db: any = createServerClient({ admin: true })

  // Verify entry belongs to tenant
  const { data: entry, error: fetchError } = await db
    .from('clipboard_entries')
    .select('id, chef_id')
    .eq('id', entryId)
    .eq('chef_id', user.tenantId)
    .single()

  if (fetchError || !entry) {
    throw new Error('Clipboard entry not found')
  }

  const updatePayload: Record<string, unknown> = {
    updated_by: user.staffMemberId,
  }
  if (updates.on_hand !== undefined) updatePayload.on_hand = updates.on_hand
  if (updates.waste_qty !== undefined) updatePayload.waste_qty = updates.waste_qty
  if (updates.waste_reason_code !== undefined)
    updatePayload.waste_reason_code = updates.waste_reason_code
  if (updates.notes !== undefined) updatePayload.notes = updates.notes

  const { error: updateError } = await db
    .from('clipboard_entries')
    .update(updatePayload)
    .eq('id', entryId)
    .eq('chef_id', user.tenantId)

  if (updateError) {
    console.error('[updateClipboardEntry] Error:', updateError)
    throw new Error('Failed to update clipboard entry')
  }

  revalidatePath('/staff-station')
  return { success: true }
}

// ============================================
// GET STATION RECIPES (recipes linked to the station's menu items)
// ============================================

export async function getStationRecipes(stationId: string): Promise<StaffRecipe[]> {
  const user = await requireStaff()
  const db: any = createServerClient({ admin: true })

  // Verify station belongs to tenant
  const { data: station, error: stationError } = await db
    .from('stations')
    .select('id')
    .eq('id', stationId)
    .eq('chef_id', user.tenantId)
    .single()

  if (stationError || !station) {
    throw new Error('Station not found')
  }

  // Step 1: find station_menu_items that have a real menu_item_id
  const { data: stationMenuItems, error: smiError } = await db
    .from('station_menu_items')
    .select('menu_item_id')
    .eq('station_id', stationId)
    .eq('chef_id', user.tenantId)
    .not('menu_item_id', 'is', null)

  if (smiError) {
    console.error('[getStationRecipes] station_menu_items query error:', smiError)
    return []
  }

  if (!stationMenuItems?.length) {
    // Station has no linked menu items - return honest empty result, no fallback
    return []
  }

  const menuItemIds = (stationMenuItems as any[]).map((smi) => smi.menu_item_id).filter(Boolean)

  if (menuItemIds.length === 0) return []

  // Step 2: fetch recipe_id from menu_items
  const { data: menuItemRows, error: miError } = await db
    .from('menu_items')
    .select('recipe_id')
    .in('id', menuItemIds)
    .not('recipe_id', 'is', null)

  if (miError) {
    console.error('[getStationRecipes] menu_items query error:', miError)
    return []
  }

  if (!menuItemRows?.length) {
    // Menu items exist but none have recipe_id set - honest empty result
    return []
  }

  const recipeIds = (menuItemRows as any[]).map((mi) => mi.recipe_id).filter(Boolean)

  if (recipeIds.length === 0) return []

  // Step 3: fetch the actual recipes using their real schema fields
  const { data: recipes, error: recipesError } = await db
    .from('recipes')
    .select('id, name, description, servings, prep_time_minutes, cook_time_minutes, method')
    .in('id', recipeIds)
    .eq('archived', false)
    .order('name')

  if (recipesError) {
    console.error('[getStationRecipes] recipes query error:', recipesError)
    return []
  }

  return (recipes ?? []) as StaffRecipe[]
}

// ============================================
// GET ALL RECIPES (for the general recipes view)
// ============================================

export async function getMyRecipes(): Promise<StaffRecipe[]> {
  const user = await requireStaff()
  const db: any = createServerClient({ admin: true })

  const { data, error } = await db
    .from('recipes')
    .select('id, name, description, servings, prep_time_minutes, cook_time_minutes, method')
    .eq('tenant_id', user.tenantId)
    .eq('archived', false)
    .order('name')

  if (error) {
    console.error('[getMyRecipes] Error:', error)
    return []
  }

  return (data ?? []) as StaffRecipe[]
}

// ============================================
// GET MY STATION DATA (station + active shift state)
// ============================================

export async function getMyStationData(stationId: string): Promise<{
  station: StaffStation | null
  activeShift: ActiveShift | null
}> {
  const user = await requireStaff()
  const db: any = createServerClient({ admin: true })

  const { data: station, error: stationError } = await db
    .from('stations')
    .select('id, name, description, status')
    .eq('id', stationId)
    .eq('chef_id', user.tenantId)
    .single()

  if (stationError || !station) {
    return { station: null, activeShift: null }
  }

  // Find an open shift for this staff member at this station (check_out_at is null)
  const { data: shift } = await db
    .from('shift_logs')
    .select('id, station_id, shift, check_in_at')
    .eq('chef_id', user.tenantId)
    .eq('staff_member_id', user.staffMemberId)
    .eq('station_id', stationId)
    .is('check_out_at', null)
    .order('check_in_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    station: station as StaffStation,
    activeShift: shift ? (shift as ActiveShift) : null,
  }
}

// ============================================
// SHIFT CHECK-IN (staff self-service)
// ============================================

export async function staffShiftCheckIn(stationId: string, shiftType: 'open' | 'mid' | 'close') {
  const user = await requireStaff()
  const db: any = createServerClient({ admin: true })

  // Verify station belongs to tenant
  const { data: station, error: stationError } = await db
    .from('stations')
    .select('id')
    .eq('id', stationId)
    .eq('chef_id', user.tenantId)
    .single()

  if (stationError || !station) {
    throw new Error('Station not found')
  }

  const { data: newShift, error: insertError } = await db
    .from('shift_logs')
    .insert({
      station_id: stationId,
      chef_id: user.tenantId,
      staff_member_id: user.staffMemberId,
      shift: shiftType,
    })
    .select('id, station_id, shift, check_in_at')
    .single()

  if (insertError) {
    console.error('[staffShiftCheckIn] Error:', insertError)
    throw new Error('Failed to check in')
  }

  revalidatePath('/staff-station')
  return { success: true, activeShift: newShift as ActiveShift }
}

// ============================================
// SHIFT CHECK-OUT (staff self-service)
// ============================================

export async function staffShiftCheckOut(shiftLogId: string, notes?: string) {
  const user = await requireStaff()
  const db: any = createServerClient({ admin: true })

  // Verify shift belongs to this staff member
  const { data: shift, error: fetchError } = await db
    .from('shift_logs')
    .select('id, staff_member_id')
    .eq('id', shiftLogId)
    .eq('chef_id', user.tenantId)
    .eq('staff_member_id', user.staffMemberId)
    .single()

  if (fetchError || !shift) {
    throw new Error('Shift not found or not yours')
  }

  const { error: updateError } = await db
    .from('shift_logs')
    .update({
      check_out_at: new Date().toISOString(),
      notes: notes ?? null,
    })
    .eq('id', shiftLogId)

  if (updateError) {
    console.error('[staffShiftCheckOut] Error:', updateError)
    throw new Error('Failed to check out')
  }

  revalidatePath('/staff-station')
  return { success: true }
}
