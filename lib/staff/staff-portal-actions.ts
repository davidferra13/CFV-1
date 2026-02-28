// Staff Portal — Server Actions
// Read-heavy actions for staff members to view their tasks, assignments, station, and recipes.
// All actions call requireStaff() first and scope queries by staff_member_id AND chef_id (tenant).

'use server'

import { requireStaff } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
  due_date: string
  due_time: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'done'
  notes: string | null
  completed_at: string | null
  created_at: string
  station?: { id: string; name: string } | null
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
    title: string
    date: string
    start_time: string | null
    end_time: string | null
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
  title: string
  description: string | null
  servings: number | null
  prep_time_minutes: number | null
  cook_time_minutes: number | null
  instructions: string | null
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
  const supabase: any = createServerClient({ admin: true })

  const { data, error } = await supabase
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
  const supabase: any = createServerClient({ admin: true })

  let query = supabase
    .from('tasks')
    .select(
      'id, chef_id, title, description, assigned_to, station_id, due_date, due_time, priority, status, notes, completed_at, created_at'
    )
    .eq('chef_id', user.tenantId)
    .eq('assigned_to', user.staffMemberId)
    .order('due_date', { ascending: true })
    .order('due_time', { ascending: true, nullsFirst: false })
    .order('priority', { ascending: false })

  if (date) {
    query = query.eq('due_date', date)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getMyTasks] Error:', error)
    return []
  }

  return (data ?? []) as StaffTask[]
}

// ============================================
// GET MY TASKS GROUPED BY DATE
// ============================================

export async function getMyTasksGroupedByDate(): Promise<Record<string, StaffTask[]>> {
  const user = await requireStaff()
  const supabase: any = createServerClient({ admin: true })

  // Get upcoming tasks (today and future, plus recently overdue)
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('tasks')
    .select(
      'id, chef_id, title, description, assigned_to, station_id, due_date, due_time, priority, status, notes, completed_at, created_at'
    )
    .eq('chef_id', user.tenantId)
    .eq('assigned_to', user.staffMemberId)
    .gte('due_date', weekAgo)
    .order('due_date', { ascending: true })
    .order('due_time', { ascending: true, nullsFirst: false })
    .order('priority', { ascending: false })

  if (error) {
    console.error('[getMyTasksGroupedByDate] Error:', error)
    return {}
  }

  const tasks = (data ?? []) as StaffTask[]
  const grouped: Record<string, StaffTask[]> = {}

  for (const task of tasks) {
    const dateKey = task.due_date
    if (!grouped[dateKey]) {
      grouped[dateKey] = []
    }
    grouped[dateKey].push(task)
  }

  return grouped
}

// ============================================
// COMPLETE MY TASK (only if assigned to me)
// ============================================

export async function completeMyTask(taskId: string): Promise<{ success: boolean }> {
  const user = await requireStaff()
  const supabase: any = createServerClient({ admin: true })
  const now = new Date().toISOString()

  // Verify the task is assigned to this staff member and belongs to the tenant
  const { data: task, error: fetchError } = await supabase
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
  const { error: updateError } = await supabase
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

  // Log completion — non-blocking
  try {
    await supabase.from('task_completion_log').insert({
      chef_id: user.tenantId,
      task_id: taskId,
      completed_by: user.staffMemberId,
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
// UNCOMPLETE MY TASK (reopen — only if assigned to me)
// ============================================

export async function uncompleteMyTask(taskId: string): Promise<{ success: boolean }> {
  const user = await requireStaff()
  const supabase: any = createServerClient({ admin: true })

  // Verify the task is assigned to this staff member
  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('id, assigned_to')
    .eq('id', taskId)
    .eq('chef_id', user.tenantId)
    .eq('assigned_to', user.staffMemberId)
    .single()

  if (fetchError || !task) {
    throw new Error('Task not found or not assigned to you')
  }

  const { error: updateError } = await supabase
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
  const supabase: any = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('event_staff_assignments')
    .select(
      `
      id, event_id, staff_member_id, role_override, scheduled_hours, actual_hours, status, notes,
      event:events!event_staff_assignments_event_id_fkey (
        id, title, date, start_time, end_time, status
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
  const supabase: any = createServerClient({ admin: true })

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('event_staff_assignments')
    .select(
      `
      id, event_id, staff_member_id, role_override, scheduled_hours, actual_hours, status, notes,
      event:events!event_staff_assignments_event_id_fkey (
        id, title, date, start_time, end_time, status
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
// GET MY STATION(S) — find which station(s) this staff member is assigned to
// ============================================

export async function getMyStations(): Promise<StaffStation[]> {
  const user = await requireStaff()
  const supabase: any = createServerClient({ admin: true })

  // Find stations through shift_logs — staff who checked in most recently
  // Also check tasks assigned to the staff member that reference a station
  const { data: taskStations, error: taskError } = await supabase
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
  const { data: shiftStations, error: shiftError } = await supabase
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
    const { data: allStations, error: allError } = await supabase
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

  const { data: stations, error: stationsError } = await supabase
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
  const supabase: any = createServerClient({ admin: true })

  // Verify station belongs to tenant
  const { data: station, error: stationError } = await supabase
    .from('stations')
    .select('id, name, description')
    .eq('id', stationId)
    .eq('chef_id', user.tenantId)
    .single()

  if (stationError || !station) {
    throw new Error('Station not found')
  }

  // Get clipboard entries
  const { data: entries, error: entriesError } = await supabase
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
  const supabase: any = createServerClient({ admin: true })

  // Verify entry belongs to tenant
  const { data: entry, error: fetchError } = await supabase
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

  const { error: updateError } = await supabase
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
  const supabase: any = createServerClient({ admin: true })

  // Verify station belongs to tenant
  const { data: station, error: stationError } = await supabase
    .from('stations')
    .select('id')
    .eq('id', stationId)
    .eq('chef_id', user.tenantId)
    .single()

  if (stationError || !station) {
    throw new Error('Station not found')
  }

  // Get menu items for this station that have a menu_item_id (linked to menu_items table)
  const { data: stationMenuItems, error: smiError } = await supabase
    .from('station_menu_items')
    .select('menu_item_id, name')
    .eq('station_id', stationId)
    .eq('chef_id', user.tenantId)
    .not('menu_item_id', 'is', null)

  if (smiError || !stationMenuItems?.length) {
    // No linked menu items — try to get all recipes for the tenant instead
    const { data: allRecipes, error: recipesError } = await supabase
      .from('recipes')
      .select(
        'id, title, description, servings, prep_time_minutes, cook_time_minutes, instructions'
      )
      .eq('chef_id', user.tenantId)
      .order('title')
      .limit(50)

    if (recipesError) {
      console.error('[getStationRecipes] Error loading recipes:', recipesError)
      return []
    }
    return (allRecipes ?? []) as StaffRecipe[]
  }

  // Get recipes linked to these menu items (via menu_item_id)
  const menuItemIds = stationMenuItems.map((smi) => smi.menu_item_id).filter(Boolean) as string[]

  // Recipes are linked to menu items through menu_items.recipe_id or similar.
  // Fallback: return all recipes for the tenant, filtered to limit
  const { data: recipes, error: recipesError } = await supabase
    .from('recipes')
    .select('id, title, description, servings, prep_time_minutes, cook_time_minutes, instructions')
    .eq('chef_id', user.tenantId)
    .order('title')
    .limit(50)

  if (recipesError) {
    console.error('[getStationRecipes] Error loading recipes:', recipesError)
    return []
  }

  return (recipes ?? []) as StaffRecipe[]
}

// ============================================
// GET ALL RECIPES (for the general recipes view)
// ============================================

export async function getMyRecipes(): Promise<StaffRecipe[]> {
  const user = await requireStaff()
  const supabase: any = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('recipes')
    .select('id, title, description, servings, prep_time_minutes, cook_time_minutes, instructions')
    .eq('chef_id', user.tenantId)
    .order('title')

  if (error) {
    console.error('[getMyRecipes] Error:', error)
    return []
  }

  return (data ?? []) as StaffRecipe[]
}

// ============================================
// SHIFT CHECK-IN (staff self-service)
// ============================================

export async function staffShiftCheckIn(stationId: string, shiftType: 'open' | 'mid' | 'close') {
  const user = await requireStaff()
  const supabase: any = createServerClient({ admin: true })

  // Verify station belongs to tenant
  const { data: station, error: stationError } = await supabase
    .from('stations')
    .select('id')
    .eq('id', stationId)
    .eq('chef_id', user.tenantId)
    .single()

  if (stationError || !station) {
    throw new Error('Station not found')
  }

  const { error: insertError } = await supabase.from('shift_logs').insert({
    station_id: stationId,
    chef_id: user.tenantId,
    staff_member_id: user.staffMemberId,
    shift: shiftType,
  })

  if (insertError) {
    console.error('[staffShiftCheckIn] Error:', insertError)
    throw new Error('Failed to check in')
  }

  revalidatePath('/staff-station')
  return { success: true }
}

// ============================================
// SHIFT CHECK-OUT (staff self-service)
// ============================================

export async function staffShiftCheckOut(shiftLogId: string, notes?: string) {
  const user = await requireStaff()
  const supabase: any = createServerClient({ admin: true })

  // Verify shift belongs to this staff member
  const { data: shift, error: fetchError } = await supabase
    .from('shift_logs')
    .select('id, staff_member_id')
    .eq('id', shiftLogId)
    .eq('chef_id', user.tenantId)
    .eq('staff_member_id', user.staffMemberId)
    .single()

  if (fetchError || !shift) {
    throw new Error('Shift not found or not yours')
  }

  const { error: updateError } = await supabase
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
