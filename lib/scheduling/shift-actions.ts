'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// SHIFT TEMPLATES
// ============================================

export async function getShiftTemplates() {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { data, error } = await supabase
    .from('shift_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('start_time', { ascending: true })

  if (error) throw new Error(`Failed to load shift templates: ${error.message}`)
  return data ?? []
}

export async function createShiftTemplate(input: {
  name: string
  start_time: string
  end_time: string
  break_minutes?: number
  color?: string
}) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { data, error } = await supabase
    .from('shift_templates')
    .insert({
      tenant_id: tenantId,
      name: input.name,
      start_time: input.start_time,
      end_time: input.end_time,
      break_minutes: input.break_minutes ?? 0,
      color: input.color ?? '#3B82F6',
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create shift template: ${error.message}`)
  revalidatePath('/scheduling/shifts')
  return data
}

export async function updateShiftTemplate(
  id: string,
  input: Partial<{
    name: string
    start_time: string
    end_time: string
    break_minutes: number
    color: string
  }>
) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { error } = await supabase
    .from('shift_templates')
    .update(input)
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to update shift template: ${error.message}`)
  revalidatePath('/scheduling/shifts')
}

export async function deleteShiftTemplate(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { error } = await supabase
    .from('shift_templates')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to delete shift template: ${error.message}`)
  revalidatePath('/scheduling/shifts')
}

// ============================================
// SCHEDULED SHIFTS
// ============================================

export async function createShift(input: {
  staff_member_id: string
  template_id?: string | null
  shift_date: string
  start_time: string
  end_time: string
  break_minutes?: number
  role?: string | null
  notes?: string | null
}) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { data, error } = await supabase
    .from('scheduled_shifts')
    .insert({
      tenant_id: tenantId,
      staff_member_id: input.staff_member_id,
      template_id: input.template_id ?? null,
      shift_date: input.shift_date,
      start_time: input.start_time,
      end_time: input.end_time,
      break_minutes: input.break_minutes ?? 0,
      role: input.role ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create shift: ${error.message}`)
  revalidatePath('/scheduling/shifts')
  return data
}

export async function updateShift(
  id: string,
  input: Partial<{
    staff_member_id: string
    template_id: string | null
    shift_date: string
    start_time: string
    end_time: string
    break_minutes: number
    role: string | null
    status: string
    notes: string | null
  }>
) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { error } = await supabase
    .from('scheduled_shifts')
    .update(input)
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to update shift: ${error.message}`)
  revalidatePath('/scheduling/shifts')
}

export async function deleteShift(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { error } = await supabase
    .from('scheduled_shifts')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to delete shift: ${error.message}`)
  revalidatePath('/scheduling/shifts')
}

export async function getWeeklySchedule(weekStart: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // weekStart is a Monday date string (YYYY-MM-DD)
  const startDate = new Date(weekStart)
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 6)
  const weekEnd = endDate.toISOString().slice(0, 10)

  const { data: shifts, error } = await supabase
    .from('scheduled_shifts')
    .select('*, staff_members!inner(id, name, hourly_rate_cents)')
    .eq('tenant_id', tenantId)
    .gte('shift_date', weekStart)
    .lte('shift_date', weekEnd)
    .order('shift_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) throw new Error(`Failed to load weekly schedule: ${error.message}`)

  // Group by date, then by staff
  const grouped: Record<string, Record<string, any[]>> = {}
  for (const shift of shifts ?? []) {
    const date = shift.shift_date
    if (!grouped[date]) grouped[date] = {}
    const staffId = shift.staff_member_id
    if (!grouped[date][staffId]) grouped[date][staffId] = []
    grouped[date][staffId].push(shift)
  }

  return { shifts: shifts ?? [], grouped }
}

export async function getStaffSchedule(staffMemberId: string, weekStart: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const startDate = new Date(weekStart)
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 6)
  const weekEnd = endDate.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('scheduled_shifts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('staff_member_id', staffMemberId)
    .gte('shift_date', weekStart)
    .lte('shift_date', weekEnd)
    .order('shift_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) throw new Error(`Failed to load staff schedule: ${error.message}`)
  return data ?? []
}

export async function publishWeek(weekStart: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const startDate = new Date(weekStart)
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 6)
  const weekEnd = endDate.toISOString().slice(0, 10)

  const { error } = await supabase
    .from('scheduled_shifts')
    .update({ status: 'confirmed' })
    .eq('tenant_id', tenantId)
    .eq('status', 'scheduled')
    .gte('shift_date', weekStart)
    .lte('shift_date', weekEnd)

  if (error) throw new Error(`Failed to publish week: ${error.message}`)
  revalidatePath('/scheduling/shifts')
}

export async function copyWeekSchedule(fromWeek: string, toWeek: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const fromStart = new Date(fromWeek)
  const fromEnd = new Date(fromStart)
  fromEnd.setDate(fromEnd.getDate() + 6)

  // Fetch source week shifts
  const { data: sourceShifts, error: fetchError } = await supabase
    .from('scheduled_shifts')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('shift_date', fromWeek)
    .lte('shift_date', fromEnd.toISOString().slice(0, 10))

  if (fetchError) throw new Error(`Failed to copy week: ${fetchError.message}`)
  if (!sourceShifts || sourceShifts.length === 0) return { copied: 0 }

  // Calculate day offset between weeks
  const toStart = new Date(toWeek)
  const dayOffset = Math.round((toStart.getTime() - fromStart.getTime()) / (1000 * 60 * 60 * 24))

  const newShifts = sourceShifts.map((shift: any) => {
    const originalDate = new Date(shift.shift_date)
    originalDate.setDate(originalDate.getDate() + dayOffset)
    return {
      tenant_id: tenantId,
      staff_member_id: shift.staff_member_id,
      template_id: shift.template_id,
      shift_date: originalDate.toISOString().slice(0, 10),
      start_time: shift.start_time,
      end_time: shift.end_time,
      break_minutes: shift.break_minutes,
      role: shift.role,
      notes: shift.notes,
      status: 'scheduled',
    }
  })

  const { error: insertError } = await supabase.from('scheduled_shifts').insert(newShifts)

  if (insertError) throw new Error(`Failed to copy week: ${insertError.message}`)
  revalidatePath('/scheduling/shifts')
  return { copied: newShifts.length }
}

export async function autoFillWeek(weekStart: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Get all active staff
  const { data: staffMembers, error: staffErr } = await supabase
    .from('staff_members')
    .select('id, name')
    .eq('chef_id', tenantId)
    .eq('status', 'active')

  if (staffErr) throw new Error(`Failed to load staff: ${staffErr.message}`)
  if (!staffMembers || staffMembers.length === 0) return { created: 0 }

  // Get all availability
  const { data: availability, error: availErr } = await supabase
    .from('staff_availability')
    .select('*')
    .eq('tenant_id', tenantId)

  if (availErr) throw new Error(`Failed to load availability: ${availErr.message}`)

  // Get templates (use first one as default)
  const { data: templates, error: tplErr } = await supabase
    .from('shift_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('start_time', { ascending: true })
    .limit(1)

  if (tplErr) throw new Error(`Failed to load templates: ${tplErr.message}`)

  const defaultTemplate = templates?.[0]
  const defaultStart = defaultTemplate?.start_time ?? '09:00'
  const defaultEnd = defaultTemplate?.end_time ?? '17:00'
  const defaultBreak = defaultTemplate?.break_minutes ?? 30

  // Build availability map: staffId -> dayOfWeek -> availability record
  const availMap: Record<string, Record<number, any>> = {}
  for (const a of availability ?? []) {
    if (!availMap[a.staff_member_id]) availMap[a.staff_member_id] = {}
    availMap[a.staff_member_id][a.day_of_week] = a
  }

  // Check existing shifts this week to avoid duplicates
  const startDate = new Date(weekStart)
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 6)

  const { data: existingShifts } = await supabase
    .from('scheduled_shifts')
    .select('staff_member_id, shift_date')
    .eq('tenant_id', tenantId)
    .gte('shift_date', weekStart)
    .lte('shift_date', endDate.toISOString().slice(0, 10))

  const existingSet = new Set(
    (existingShifts ?? []).map((s: any) => `${s.staff_member_id}:${s.shift_date}`)
  )

  const newShifts: any[] = []

  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + dayIdx)
    const dateStr = date.toISOString().slice(0, 10)
    const dayOfWeek = date.getDay() // 0=Sunday

    for (const staff of staffMembers) {
      // Skip if shift already exists for this staff+date
      if (existingSet.has(`${staff.id}:${dateStr}`)) continue

      const staffAvail = availMap[staff.id]?.[dayOfWeek]

      // If explicit availability set and marked unavailable, skip
      if (staffAvail && !staffAvail.available) continue

      // Use preferred times if set, otherwise template defaults
      const shiftStart = staffAvail?.preferred_start ?? defaultStart
      const shiftEnd = staffAvail?.preferred_end ?? defaultEnd

      newShifts.push({
        tenant_id: tenantId,
        staff_member_id: staff.id,
        template_id: defaultTemplate?.id ?? null,
        shift_date: dateStr,
        start_time: shiftStart,
        end_time: shiftEnd,
        break_minutes: defaultBreak,
        status: 'scheduled',
      })
    }
  }

  if (newShifts.length === 0) return { created: 0 }

  const { error: insertError } = await supabase.from('scheduled_shifts').insert(newShifts)

  if (insertError) throw new Error(`Failed to auto-fill: ${insertError.message}`)
  revalidatePath('/scheduling/shifts')
  return { created: newShifts.length }
}

// ============================================
// STAFF AVAILABILITY
// ============================================

export async function setAvailability(input: {
  staff_member_id: string
  day_of_week: number
  available: boolean
  preferred_start?: string | null
  preferred_end?: string | null
  notes?: string | null
}) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { error } = await supabase.from('staff_availability').upsert(
    {
      tenant_id: tenantId,
      staff_member_id: input.staff_member_id,
      day_of_week: input.day_of_week,
      available: input.available,
      preferred_start: input.preferred_start ?? null,
      preferred_end: input.preferred_end ?? null,
      notes: input.notes ?? null,
    },
    { onConflict: 'tenant_id,staff_member_id,day_of_week' }
  )

  if (error) throw new Error(`Failed to set availability: ${error.message}`)
  revalidatePath('/scheduling/availability')
}

export async function getAvailability(staffMemberId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { data, error } = await supabase
    .from('staff_availability')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('staff_member_id', staffMemberId)
    .order('day_of_week', { ascending: true })

  if (error) throw new Error(`Failed to load availability: ${error.message}`)
  return data ?? []
}

export async function getAllAvailability() {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { data, error } = await supabase
    .from('staff_availability')
    .select('*, staff_members!inner(id, name)')
    .eq('tenant_id', tenantId)
    .order('staff_member_id', { ascending: true })
    .order('day_of_week', { ascending: true })

  if (error) throw new Error(`Failed to load all availability: ${error.message}`)
  return data ?? []
}

// ============================================
// SHIFT SWAP REQUESTS
// ============================================

export async function requestSwap(shiftId: string, reason?: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Get the shift to find the requesting staff member
  const { data: shift, error: shiftErr } = await supabase
    .from('scheduled_shifts')
    .select('id, staff_member_id')
    .eq('id', shiftId)
    .eq('tenant_id', tenantId)
    .single()

  if (shiftErr || !shift) throw new Error('Shift not found')

  // Mark the shift as swap_requested
  await supabase
    .from('scheduled_shifts')
    .update({ status: 'swap_requested' })
    .eq('id', shiftId)
    .eq('tenant_id', tenantId)

  const { data, error } = await supabase
    .from('shift_swap_requests')
    .insert({
      tenant_id: tenantId,
      shift_id: shiftId,
      requesting_staff_id: shift.staff_member_id,
      reason: reason ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to request swap: ${error.message}`)
  revalidatePath('/scheduling/swaps')
  revalidatePath('/scheduling/shifts')
  return data
}

export async function claimSwap(swapId: string, coveringStaffId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { error } = await supabase
    .from('shift_swap_requests')
    .update({
      covering_staff_id: coveringStaffId,
      status: 'claimed',
    })
    .eq('id', swapId)
    .eq('tenant_id', tenantId)
    .eq('status', 'open')

  if (error) throw new Error(`Failed to claim swap: ${error.message}`)
  revalidatePath('/scheduling/swaps')
}

export async function approveSwap(swapId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Get the swap request
  const { data: swap, error: fetchErr } = await supabase
    .from('shift_swap_requests')
    .select('*, scheduled_shifts!inner(id)')
    .eq('id', swapId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchErr || !swap) throw new Error('Swap request not found')
  if (!swap.covering_staff_id) throw new Error('No covering staff assigned yet')

  // Update the swap status
  const { error: updateErr } = await supabase
    .from('shift_swap_requests')
    .update({ status: 'approved' })
    .eq('id', swapId)
    .eq('tenant_id', tenantId)

  if (updateErr) throw new Error(`Failed to approve swap: ${updateErr.message}`)

  // Transfer the shift to the covering staff member and mark as covered
  const { error: shiftErr } = await supabase
    .from('scheduled_shifts')
    .update({
      staff_member_id: swap.covering_staff_id,
      status: 'covered',
    })
    .eq('id', swap.shift_id)
    .eq('tenant_id', tenantId)

  if (shiftErr) throw new Error(`Failed to update shift: ${shiftErr.message}`)

  revalidatePath('/scheduling/swaps')
  revalidatePath('/scheduling/shifts')
}

export async function denySwap(swapId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Get the swap to restore the shift status
  const { data: swap, error: fetchErr } = await supabase
    .from('shift_swap_requests')
    .select('shift_id')
    .eq('id', swapId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchErr || !swap) throw new Error('Swap request not found')

  const { error } = await supabase
    .from('shift_swap_requests')
    .update({ status: 'denied' })
    .eq('id', swapId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to deny swap: ${error.message}`)

  // Restore shift to scheduled
  await supabase
    .from('scheduled_shifts')
    .update({ status: 'scheduled' })
    .eq('id', swap.shift_id)
    .eq('tenant_id', tenantId)

  revalidatePath('/scheduling/swaps')
  revalidatePath('/scheduling/shifts')
}

export async function getOpenSwaps() {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { data, error } = await supabase
    .from('shift_swap_requests')
    .select(
      `
      *,
      scheduled_shifts!inner(id, shift_date, start_time, end_time, role),
      requesting_staff:staff_members!shift_swap_requests_requesting_staff_id_fkey(id, name),
      covering_staff:staff_members!shift_swap_requests_covering_staff_id_fkey(id, name)
    `
    )
    .eq('tenant_id', tenantId)
    .in('status', ['open', 'claimed'])
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load open swaps: ${error.message}`)
  return data ?? []
}

// ============================================
// LABOR COST (deterministic math, no AI)
// ============================================

export async function getWeeklyLaborCost(weekStart: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const startDate = new Date(weekStart)
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 6)
  const weekEnd = endDate.toISOString().slice(0, 10)

  const { data: shifts, error } = await supabase
    .from('scheduled_shifts')
    .select('*, staff_members!inner(id, name, hourly_rate_cents)')
    .eq('tenant_id', tenantId)
    .gte('shift_date', weekStart)
    .lte('shift_date', weekEnd)
    .neq('status', 'cancelled')

  if (error) throw new Error(`Failed to calculate labor cost: ${error.message}`)

  // Calculate hours and cost per staff member
  const staffCosts: Record<
    string,
    {
      staffId: string
      staffName: string
      totalHours: number
      totalCostCents: number
      shiftCount: number
    }
  > = {}

  let totalCostCents = 0
  let totalHours = 0

  for (const shift of shifts ?? []) {
    const startParts = shift.start_time.split(':').map(Number)
    const endParts = shift.end_time.split(':').map(Number)
    const startMinutes = startParts[0] * 60 + startParts[1]
    const endMinutes = endParts[0] * 60 + endParts[1]
    const workedMinutes = Math.max(0, endMinutes - startMinutes - (shift.break_minutes ?? 0))
    const hours = workedMinutes / 60

    const rateCents = shift.staff_members?.hourly_rate_cents ?? 0
    const costCents = Math.round(hours * rateCents)

    const staffId = shift.staff_member_id
    if (!staffCosts[staffId]) {
      staffCosts[staffId] = {
        staffId,
        staffName: shift.staff_members?.name ?? 'Unknown',
        totalHours: 0,
        totalCostCents: 0,
        shiftCount: 0,
      }
    }

    staffCosts[staffId].totalHours += hours
    staffCosts[staffId].totalCostCents += costCents
    staffCosts[staffId].shiftCount += 1

    totalCostCents += costCents
    totalHours += hours
  }

  return {
    totalCostCents,
    totalHours: Math.round(totalHours * 100) / 100,
    staffBreakdown: Object.values(staffCosts),
  }
}

export async function getLaborCostByDay(weekStart: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const startDate = new Date(weekStart)
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 6)
  const weekEnd = endDate.toISOString().slice(0, 10)

  const { data: shifts, error } = await supabase
    .from('scheduled_shifts')
    .select('*, staff_members!inner(id, name, hourly_rate_cents)')
    .eq('tenant_id', tenantId)
    .gte('shift_date', weekStart)
    .lte('shift_date', weekEnd)
    .neq('status', 'cancelled')

  if (error) throw new Error(`Failed to calculate daily labor cost: ${error.message}`)

  const dailyCosts: Record<
    string,
    { date: string; totalCostCents: number; totalHours: number; shiftCount: number }
  > = {}

  // Initialize all 7 days
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    dailyCosts[dateStr] = { date: dateStr, totalCostCents: 0, totalHours: 0, shiftCount: 0 }
  }

  for (const shift of shifts ?? []) {
    const startParts = shift.start_time.split(':').map(Number)
    const endParts = shift.end_time.split(':').map(Number)
    const startMinutes = startParts[0] * 60 + startParts[1]
    const endMinutes = endParts[0] * 60 + endParts[1]
    const workedMinutes = Math.max(0, endMinutes - startMinutes - (shift.break_minutes ?? 0))
    const hours = workedMinutes / 60

    const rateCents = shift.staff_members?.hourly_rate_cents ?? 0
    const costCents = Math.round(hours * rateCents)

    const dateStr = shift.shift_date
    if (dailyCosts[dateStr]) {
      dailyCosts[dateStr].totalCostCents += costCents
      dailyCosts[dateStr].totalHours += Math.round(hours * 100) / 100
      dailyCosts[dateStr].shiftCount += 1
    }
  }

  return Object.values(dailyCosts)
}

// ============================================
// STAFF LIST (helper for UI dropdowns)
// ============================================

export async function getActiveStaff() {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { data, error } = await supabase
    .from('staff_members')
    .select('id, name, role, hourly_rate_cents')
    .eq('chef_id', tenantId)
    .eq('status', 'active')
    .order('name', { ascending: true })

  if (error) throw new Error(`Failed to load staff: ${error.message}`)
  return data ?? []
}
