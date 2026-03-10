'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ---- Types ----

export type MaintenanceType =
  | 'oil_change'
  | 'tire_rotation'
  | 'brake_service'
  | 'engine'
  | 'electrical'
  | 'body_work'
  | 'inspection'
  | 'cleaning'
  | 'other'

export type MaintenanceEntry = {
  id: string
  tenant_id: string
  vehicle_name: string
  maintenance_type: MaintenanceType
  description: string
  date_performed: string
  next_due_date: string | null
  next_due_mileage: number | null
  cost_cents: number
  vendor_name: string | null
  odometer_reading: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type CreateMaintenanceInput = {
  vehicle_name?: string
  maintenance_type: MaintenanceType
  description: string
  date_performed: string
  next_due_date?: string | null
  next_due_mileage?: number | null
  cost_cents?: number
  vendor_name?: string | null
  odometer_reading?: number | null
  notes?: string | null
}

export type UpdateMaintenanceInput = Partial<CreateMaintenanceInput>

// ---- Helpers ----

const MAINTENANCE_PATH = '/food-truck/maintenance'

const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  oil_change: 'Oil Change',
  tire_rotation: 'Tire Rotation',
  brake_service: 'Brake Service',
  engine: 'Engine',
  electrical: 'Electrical',
  body_work: 'Body Work',
  inspection: 'Inspection',
  cleaning: 'Cleaning',
  other: 'Other',
}

export function getMaintenanceTypeLabel(type: MaintenanceType): string {
  return MAINTENANCE_TYPE_LABELS[type] ?? type
}

function sanitizeMaintenanceInput(input: CreateMaintenanceInput) {
  return {
    vehicle_name: input.vehicle_name?.trim() || 'Primary Truck',
    maintenance_type: input.maintenance_type,
    description: input.description.trim(),
    date_performed: input.date_performed,
    next_due_date: input.next_due_date || null,
    next_due_mileage: input.next_due_mileage ?? null,
    cost_cents: input.cost_cents ?? 0,
    vendor_name: input.vendor_name?.trim() || null,
    odometer_reading: input.odometer_reading ?? null,
    notes: input.notes?.trim() || null,
  }
}

// ---- CRUD ----

export async function createMaintenanceEntry(
  input: CreateMaintenanceInput
): Promise<MaintenanceEntry> {
  const user = await requireChef()
  const supabase = createServerClient()
  const data = sanitizeMaintenanceInput(input)

  const { data: entry, error } = await (supabase as any)
    .from('vehicle_maintenance')
    .insert({
      tenant_id: user.tenantId!,
      ...data,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create maintenance entry: ${error.message}`)
  revalidatePath(MAINTENANCE_PATH)
  return entry as MaintenanceEntry
}

export async function updateMaintenanceEntry(
  id: string,
  input: UpdateMaintenanceInput
): Promise<MaintenanceEntry> {
  const user = await requireChef()
  const supabase = createServerClient()

  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  if (input.vehicle_name !== undefined)
    updates.vehicle_name = input.vehicle_name?.trim() || 'Primary Truck'
  if (input.maintenance_type !== undefined) updates.maintenance_type = input.maintenance_type
  if (input.description !== undefined) updates.description = input.description.trim()
  if (input.date_performed !== undefined) updates.date_performed = input.date_performed
  if (input.next_due_date !== undefined) updates.next_due_date = input.next_due_date || null
  if (input.next_due_mileage !== undefined) updates.next_due_mileage = input.next_due_mileage
  if (input.cost_cents !== undefined) updates.cost_cents = input.cost_cents
  if (input.vendor_name !== undefined) updates.vendor_name = input.vendor_name?.trim() || null
  if (input.odometer_reading !== undefined) updates.odometer_reading = input.odometer_reading
  if (input.notes !== undefined) updates.notes = input.notes?.trim() || null

  const { data: entry, error } = await (supabase as any)
    .from('vehicle_maintenance')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to update maintenance entry: ${error.message}`)
  revalidatePath(MAINTENANCE_PATH)
  return entry as MaintenanceEntry
}

export async function deleteMaintenanceEntry(id: string): Promise<void> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await (supabase as any)
    .from('vehicle_maintenance')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete maintenance entry: ${error.message}`)
  revalidatePath(MAINTENANCE_PATH)
}

// ---- Queries ----

export async function getMaintenanceHistory(vehicleName?: string): Promise<MaintenanceEntry[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = (supabase as any)
    .from('vehicle_maintenance')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('date_performed', { ascending: false })

  if (vehicleName) {
    query = query.eq('vehicle_name', vehicleName)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to load maintenance history: ${error.message}`)
  return (data ?? []) as MaintenanceEntry[]
}

export async function getUpcomingMaintenance(): Promise<MaintenanceEntry[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await (supabase as any)
    .from('vehicle_maintenance')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .not('next_due_date', 'is', null)
    .gte('next_due_date', today)
    .order('next_due_date', { ascending: true })

  if (error) throw new Error(`Failed to load upcoming maintenance: ${error.message}`)
  return (data ?? []) as MaintenanceEntry[]
}

export async function getOverdueMaintenance(): Promise<MaintenanceEntry[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await (supabase as any)
    .from('vehicle_maintenance')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .not('next_due_date', 'is', null)
    .lt('next_due_date', today)
    .order('next_due_date', { ascending: true })

  if (error) throw new Error(`Failed to load overdue maintenance: ${error.message}`)
  return (data ?? []) as MaintenanceEntry[]
}

export async function getMaintenanceCostSummary(year?: number): Promise<{
  totalCents: number
  byType: Record<MaintenanceType, number>
  count: number
}> {
  const user = await requireChef()
  const supabase = createServerClient()
  const targetYear = year ?? new Date().getFullYear()

  const startDate = `${targetYear}-01-01`
  const endDate = `${targetYear}-12-31`

  const { data, error } = await (supabase as any)
    .from('vehicle_maintenance')
    .select('maintenance_type, cost_cents')
    .eq('tenant_id', user.tenantId!)
    .gte('date_performed', startDate)
    .lte('date_performed', endDate)

  if (error) throw new Error(`Failed to load maintenance costs: ${error.message}`)

  const entries = (data ?? []) as Array<{ maintenance_type: MaintenanceType; cost_cents: number }>
  const byType: Record<string, number> = {}
  let totalCents = 0

  for (const e of entries) {
    const cost = e.cost_cents ?? 0
    totalCents += cost
    byType[e.maintenance_type] = (byType[e.maintenance_type] ?? 0) + cost
  }

  return {
    totalCents,
    byType: byType as Record<MaintenanceType, number>,
    count: entries.length,
  }
}

export async function getCurrentOdometer(): Promise<{
  reading: number | null
  asOf: string | null
}> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('vehicle_maintenance')
    .select('odometer_reading, date_performed')
    .eq('tenant_id', user.tenantId!)
    .not('odometer_reading', 'is', null)
    .order('date_performed', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to load odometer: ${error.message}`)
  }

  return {
    reading: data?.odometer_reading ?? null,
    asOf: data?.date_performed ?? null,
  }
}
