'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { addDays } from 'date-fns'

// ─── Types ───────────────────────────────────────────────────────

export type MaintenanceType = 'routine' | 'calibration' | 'repair' | 'inspection'

export type MaintenanceLogEntry = {
  id: string
  equipmentId: string
  equipmentName: string
  maintenanceType: MaintenanceType
  notes: string | null
  costCents: number
  performedAt: string
  performedBy: string | null
  createdAt: string
}

export type EquipmentMaintenanceStatus = {
  id: string
  name: string
  category: string
  maintenanceIntervalDays: number | null
  lastMaintainedAt: string | null
  nextMaintenanceDue: string | null
  calibrationRequired: boolean
  status: 'ok' | 'due_soon' | 'overdue' | 'no_schedule'
  daysUntilDue: number | null
}

// ─── Schemas ─────────────────────────────────────────────────────

const LogMaintenanceSchema = z.object({
  maintenanceType: z.enum(['routine', 'calibration', 'repair', 'inspection']),
  notes: z.string().optional(),
  costCents: z.number().int().min(0).default(0),
  performedAt: z.string().optional(), // ISO date string, defaults to now
  performedBy: z.string().optional(),
})

export type LogMaintenanceInput = z.infer<typeof LogMaintenanceSchema>

// ─── Actions ─────────────────────────────────────────────────────

/**
 * Get all equipment with their maintenance status, sorted by urgency.
 * Items overdue come first, then due soon, then OK, then no schedule.
 */
export async function getMaintenanceSchedule(): Promise<EquipmentMaintenanceStatus[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('equipment_items')
    .select(
      'id, name, category, maintenance_interval_days, last_maintained_at, next_maintenance_due, calibration_required, status'
    )
    .eq('chef_id', user.tenantId!)
    .eq('status', 'owned')
    .order('next_maintenance_due', { ascending: true, nullsFirst: false })

  if (error) throw new Error('Failed to load maintenance schedule')

  const now = new Date()
  const sevenDaysFromNow = addDays(now, 7)

  return (data ?? [])
    .map((item: any) => {
      let status: EquipmentMaintenanceStatus['status'] = 'no_schedule'
      let daysUntilDue: number | null = null

      if (item.next_maintenance_due) {
        const dueDate = new Date(item.next_maintenance_due)
        daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        if (dueDate <= now) {
          status = 'overdue'
        } else if (dueDate <= sevenDaysFromNow) {
          status = 'due_soon'
        } else {
          status = 'ok'
        }
      } else if (item.maintenance_interval_days && !item.last_maintained_at) {
        // Has an interval but never maintained = overdue
        status = 'overdue'
        daysUntilDue = 0
      }

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        maintenanceIntervalDays: item.maintenance_interval_days,
        lastMaintainedAt: item.last_maintained_at,
        nextMaintenanceDue: item.next_maintenance_due,
        calibrationRequired: item.calibration_required ?? false,
        status,
        daysUntilDue,
      }
    })
    .sort((a: EquipmentMaintenanceStatus, b: EquipmentMaintenanceStatus) => {
      const priority: Record<string, number> = { overdue: 0, due_soon: 1, ok: 2, no_schedule: 3 }
      return (priority[a.status] ?? 3) - (priority[b.status] ?? 3)
    })
}

/**
 * Log a maintenance event for an equipment item.
 * Updates last_maintained_at and computes next_maintenance_due.
 */
export async function logMaintenance(
  equipmentId: string,
  input: LogMaintenanceInput
): Promise<MaintenanceLogEntry> {
  const user = await requireChef()
  const validated = LogMaintenanceSchema.parse(input)
  const db: any = createServerClient()

  const performedAt = validated.performedAt || new Date().toISOString()

  // Insert the maintenance log entry
  const { data: logEntry, error: logError } = await db
    .from('equipment_maintenance_log')
    .insert({
      equipment_id: equipmentId,
      chef_id: user.tenantId!,
      maintenance_type: validated.maintenanceType,
      notes: validated.notes || null,
      cost_cents: validated.costCents,
      performed_at: performedAt,
      performed_by: validated.performedBy || null,
    })
    .select()
    .single()

  if (logError) throw new Error('Failed to log maintenance event')

  // Fetch the equipment item to compute next due date
  const { data: equipment } = await db
    .from('equipment_items')
    .select('maintenance_interval_days')
    .eq('id', equipmentId)
    .eq('chef_id', user.tenantId!)
    .single()

  // Update equipment item: last_maintained_at and next_maintenance_due
  const updateData: Record<string, any> = {
    last_maintained_at: performedAt,
  }

  if (equipment?.maintenance_interval_days) {
    updateData.next_maintenance_due = addDays(
      new Date(performedAt),
      equipment.maintenance_interval_days
    ).toISOString()
  } else {
    updateData.next_maintenance_due = null
  }

  const { error: updateError } = await db
    .from('equipment_items')
    .update(updateData)
    .eq('id', equipmentId)
    .eq('chef_id', user.tenantId!)

  if (updateError) {
    console.error('[non-blocking] Failed to update equipment maintenance date', updateError)
  }

  revalidatePath('/operations/equipment')

  return {
    id: logEntry.id,
    equipmentId: logEntry.equipment_id,
    equipmentName: '',
    maintenanceType: logEntry.maintenance_type,
    notes: logEntry.notes,
    costCents: logEntry.cost_cents,
    performedAt: logEntry.performed_at,
    performedBy: logEntry.performed_by,
    createdAt: logEntry.created_at,
  }
}

/**
 * Get maintenance history for a specific equipment item.
 */
export async function getMaintenanceHistory(equipmentId: string): Promise<MaintenanceLogEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('equipment_maintenance_log')
    .select('*, equipment_items(name)')
    .eq('equipment_id', equipmentId)
    .eq('chef_id', user.tenantId!)
    .order('performed_at', { ascending: false })

  if (error) throw new Error('Failed to load maintenance history')

  return (data ?? []).map((row: any) => ({
    id: row.id,
    equipmentId: row.equipment_id,
    equipmentName: row.equipment_items?.name || '',
    maintenanceType: row.maintenance_type,
    notes: row.notes,
    costCents: row.cost_cents,
    performedAt: row.performed_at,
    performedBy: row.performed_by,
    createdAt: row.created_at,
  }))
}

/**
 * Get all equipment items that are past their maintenance due date.
 */
export async function getOverdueEquipment(): Promise<EquipmentMaintenanceStatus[]> {
  const schedule = await getMaintenanceSchedule()
  return schedule.filter((item) => item.status === 'overdue')
}

/**
 * Get count of overdue equipment items (for badge display).
 */
export async function getOverdueCount(): Promise<number> {
  const overdue = await getOverdueEquipment()
  return overdue.length
}
