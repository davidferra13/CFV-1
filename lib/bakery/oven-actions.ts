'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ---- Types ----

export type OvenType = 'deck' | 'convection' | 'combi' | 'rotary' | 'proofer' | 'other'
export type BakeStatus = 'scheduled' | 'preheating' | 'baking' | 'cooling' | 'done'

export type BakeryOven = {
  id: string
  tenant_id: string
  name: string
  oven_type: OvenType
  max_temp_f: number | null
  capacity_trays: number | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type BakeScheduleEntry = {
  id: string
  tenant_id: string
  oven_id: string
  batch_id: string | null
  product_name: string
  planned_start: string
  duration_minutes: number
  temp_f: number
  trays_used: number
  status: BakeStatus
  actual_start: string | null
  actual_end: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type BakeScheduleWithOven = BakeScheduleEntry & {
  bakery_ovens?: { name: string; oven_type: OvenType } | null
}

export type CreateOvenInput = {
  name: string
  oven_type: OvenType
  max_temp_f?: number | null
  capacity_trays?: number | null
  notes?: string | null
}

export type UpdateOvenInput = Partial<CreateOvenInput> & { is_active?: boolean }

export type CreateBakeInput = {
  oven_id: string
  batch_id?: string | null
  product_name: string
  planned_start: string
  duration_minutes: number
  temp_f: number
  trays_used?: number
  notes?: string | null
}

export type UpdateBakeInput = Partial<CreateBakeInput> & { status?: BakeStatus }

// ---- Oven CRUD ----

export async function getOvens(): Promise<BakeryOven[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('bakery_ovens')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('name')

  if (error) throw new Error(`Failed to load ovens: ${error.message}`)
  return (data ?? []) as BakeryOven[]
}

export async function createOven(input: CreateOvenInput): Promise<BakeryOven> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('bakery_ovens')
    .insert({
      tenant_id: user.tenantId!,
      name: input.name,
      oven_type: input.oven_type,
      max_temp_f: input.max_temp_f ?? null,
      capacity_trays: input.capacity_trays ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create oven: ${error.message}`)
  revalidatePath('/bakery/oven-schedule')
  return data as BakeryOven
}

export async function updateOven(id: string, input: UpdateOvenInput): Promise<BakeryOven> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('bakery_ovens')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to update oven: ${error.message}`)
  revalidatePath('/bakery/oven-schedule')
  return data as BakeryOven
}

export async function deleteOven(id: string): Promise<void> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('bakery_ovens')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete oven: ${error.message}`)
  revalidatePath('/bakery/oven-schedule')
}

// ---- Bake Schedule CRUD ----

export async function getScheduleForDate(
  date: string
): Promise<Record<string, BakeScheduleWithOven[]>> {
  const user = await requireChef()
  const supabase = createServerClient()

  const dayStart = `${date}T00:00:00Z`
  const dayEnd = `${date}T23:59:59Z`

  const { data, error } = await supabase
    .from('bake_schedule')
    .select('*, bakery_ovens(name, oven_type)')
    .eq('tenant_id', user.tenantId!)
    .gte('planned_start', dayStart)
    .lte('planned_start', dayEnd)
    .order('planned_start')

  if (error) throw new Error(`Failed to load schedule: ${error.message}`)

  const entries = (data ?? []) as BakeScheduleWithOven[]
  const grouped: Record<string, BakeScheduleWithOven[]> = {}
  for (const entry of entries) {
    if (!grouped[entry.oven_id]) grouped[entry.oven_id] = []
    grouped[entry.oven_id].push(entry)
  }
  return grouped
}

export async function createBake(input: CreateBakeInput): Promise<BakeScheduleEntry> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Check for conflicts before inserting
  const conflict = await checkConflicts(input.oven_id, input.planned_start, input.duration_minutes)
  if (conflict.hasConflict) {
    throw new Error(`Scheduling conflict: ${conflict.conflictWith}`)
  }

  const { data, error } = await supabase
    .from('bake_schedule')
    .insert({
      tenant_id: user.tenantId!,
      oven_id: input.oven_id,
      batch_id: input.batch_id ?? null,
      product_name: input.product_name,
      planned_start: input.planned_start,
      duration_minutes: input.duration_minutes,
      temp_f: input.temp_f,
      trays_used: input.trays_used ?? 1,
      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create bake: ${error.message}`)
  revalidatePath('/bakery/oven-schedule')
  return data as BakeScheduleEntry
}

export async function updateBake(id: string, input: UpdateBakeInput): Promise<BakeScheduleEntry> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('bake_schedule')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to update bake: ${error.message}`)
  revalidatePath('/bakery/oven-schedule')
  return data as BakeScheduleEntry
}

export async function deleteBake(id: string): Promise<void> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('bake_schedule')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete bake: ${error.message}`)
  revalidatePath('/bakery/oven-schedule')
}

// ---- Schedule Utilities ----

export async function getOvenAvailability(
  ovenId: string,
  date: string
): Promise<{ start: string; end: string }[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const dayStart = new Date(`${date}T00:00:00Z`)
  const dayEnd = new Date(`${date}T23:59:59Z`)

  const { data, error } = await supabase
    .from('bake_schedule')
    .select('planned_start, duration_minutes')
    .eq('tenant_id', user.tenantId!)
    .eq('oven_id', ovenId)
    .gte('planned_start', dayStart.toISOString())
    .lte('planned_start', dayEnd.toISOString())
    .order('planned_start')

  if (error) throw new Error(`Failed to load availability: ${error.message}`)

  // Build busy slots, then invert to free slots
  const busy = (data ?? []).map((d) => {
    const s = new Date(d.planned_start)
    const e = new Date(s.getTime() + d.duration_minutes * 60_000)
    return { start: s, end: e }
  })

  const free: { start: string; end: string }[] = []
  let cursor = dayStart

  for (const slot of busy) {
    if (cursor < slot.start) {
      free.push({ start: cursor.toISOString(), end: slot.start.toISOString() })
    }
    if (slot.end > cursor) cursor = slot.end
  }
  if (cursor < dayEnd) {
    free.push({ start: cursor.toISOString(), end: dayEnd.toISOString() })
  }

  return free
}

export async function checkConflicts(
  ovenId: string,
  startTime: string,
  durationMin: number
): Promise<{ hasConflict: boolean; conflictWith?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const start = new Date(startTime)
  const end = new Date(start.getTime() + durationMin * 60_000)

  // Find any bakes that overlap: existing.start < newEnd AND existing.end > newStart
  const { data, error } = await supabase
    .from('bake_schedule')
    .select('id, product_name, planned_start, duration_minutes')
    .eq('tenant_id', user.tenantId!)
    .eq('oven_id', ovenId)
    .lt('planned_start', end.toISOString())

  if (error) throw new Error(`Failed to check conflicts: ${error.message}`)

  for (const entry of data ?? []) {
    const existingStart = new Date(entry.planned_start)
    const existingEnd = new Date(existingStart.getTime() + entry.duration_minutes * 60_000)
    if (existingEnd > start) {
      return { hasConflict: true, conflictWith: entry.product_name }
    }
  }

  return { hasConflict: false }
}

export async function startBake(scheduleId: string): Promise<BakeScheduleEntry> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('bake_schedule')
    .update({
      status: 'baking',
      actual_start: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', scheduleId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to start bake: ${error.message}`)
  revalidatePath('/bakery/oven-schedule')
  return data as BakeScheduleEntry
}

export async function completeBake(scheduleId: string): Promise<BakeScheduleEntry> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('bake_schedule')
    .update({
      status: 'done',
      actual_end: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', scheduleId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to complete bake: ${error.message}`)
  revalidatePath('/bakery/oven-schedule')
  return data as BakeScheduleEntry
}

export async function getOvenUtilization(date: string): Promise<Record<string, number>> {
  const user = await requireChef()
  const supabase = createServerClient()

  const dayStart = `${date}T00:00:00Z`
  const dayEnd = `${date}T23:59:59Z`

  // Get all bakes for the day
  const { data, error } = await supabase
    .from('bake_schedule')
    .select('oven_id, duration_minutes')
    .eq('tenant_id', user.tenantId!)
    .gte('planned_start', dayStart)
    .lte('planned_start', dayEnd)

  if (error) throw new Error(`Failed to load utilization: ${error.message}`)

  const totalDayMinutes = 24 * 60
  const utilization: Record<string, number> = {}

  for (const entry of data ?? []) {
    if (!utilization[entry.oven_id]) utilization[entry.oven_id] = 0
    utilization[entry.oven_id] += entry.duration_minutes
  }

  // Convert to percentages
  for (const ovenId of Object.keys(utilization)) {
    utilization[ovenId] = Math.round((utilization[ovenId] / totalDayMinutes) * 100)
  }

  return utilization
}
