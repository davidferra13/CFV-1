// Compliance Temperature & Cleaning Log Actions
// Daily food-safety forms for restaurant archetype.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Constants ───────────────────────────────────────────────────

export const TEMPERATURE_LOCATIONS = [
  { id: 'walk_in_cooler', label: 'Walk-in Cooler', minF: 33, maxF: 40 },
  { id: 'walk_in_freezer', label: 'Walk-in Freezer', minF: -10, maxF: 0 },
  { id: 'prep_fridge', label: 'Prep Fridge', minF: 33, maxF: 40 },
  { id: 'hot_holding', label: 'Hot Holding', minF: 135, maxF: 165 },
  { id: 'cold_holding', label: 'Cold Holding', minF: 33, maxF: 40 },
  { id: 'dish_machine', label: 'Dish Machine Final Rinse', minF: 180, maxF: 220 },
] as const

export const DEFAULT_CLEANING_TASKS = {
  kitchen: [
    'Sanitize cutting boards',
    'Clean prep surfaces',
    'Degrease range hood',
    'Clean fryers',
    'Sanitize sinks',
    'Clean floor drains',
  ],
  foh: [
    'Wipe tables and chairs',
    'Clean bar top',
    'Sanitize menus',
    'Clean glass/mirrors',
    'Vacuum/sweep/mop',
  ],
  restroom: [
    'Clean toilets',
    'Restock supplies',
    'Sanitize surfaces',
    'Mop floors',
    'Check soap/towels',
  ],
  storage: ['Organize walk-in', 'FIFO check', 'Check expiry dates', 'Clean shelving'],
} as const

// ─── Types ───────────────────────────────────────────────────────

export type TempLogEntry = {
  id: string
  logDate: string
  location: string
  locationLabel: string | null
  temperatureF: number
  targetMinF: number | null
  targetMaxF: number | null
  isInRange: boolean | null
  correctiveAction: string | null
  recordedBy: string | null
  recordedAt: string
}

export type CleaningLogEntry = {
  id: string
  logDate: string
  taskName: string
  area: string
  completed: boolean
  completedBy: string | null
  completedAt: string | null
  notes: string | null
}

export type ComplianceSummary = {
  totalTempChecks: number
  outOfRangeCount: number
  cleaningTasksTotal: number
  cleaningTasksCompleted: number
  cleaningCompletionRate: number
}

// ─── Temperature Log Actions ─────────────────────────────────────

export async function recordTemperature(input: {
  logDate?: string
  location: string
  locationLabel?: string
  temperatureF: number
  targetMinF?: number
  targetMaxF?: number
  correctiveAction?: string
  recordedBy?: string
}): Promise<TempLogEntry> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const logDate = input.logDate || new Date().toISOString().split('T')[0]

  // Auto-fill targets from defaults if not provided
  let targetMinF = input.targetMinF ?? null
  let targetMaxF = input.targetMaxF ?? null
  if (targetMinF === null || targetMaxF === null) {
    const preset = TEMPERATURE_LOCATIONS.find((l) => l.id === input.location)
    if (preset) {
      targetMinF = targetMinF ?? preset.minF
      targetMaxF = targetMaxF ?? preset.maxF
    }
  }

  // Compute in-range
  let isInRange: boolean | null = null
  if (targetMinF !== null && targetMaxF !== null) {
    isInRange = input.temperatureF >= targetMinF && input.temperatureF <= targetMaxF
  }

  const { data, error } = await supabase
    .from('compliance_temp_logs')
    .insert({
      chef_id: user.tenantId!,
      log_date: logDate,
      location: input.location,
      location_label: input.locationLabel ?? null,
      temperature_f: input.temperatureF,
      target_min_f: targetMinF,
      target_max_f: targetMaxF,
      is_in_range: isInRange,
      corrective_action: input.correctiveAction ?? null,
      recorded_by: input.recordedBy ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to record temperature: ${error.message}`)

  revalidatePath('/compliance/daily')
  return mapTempLog(data)
}

export async function getTemperatureLogs(date: string): Promise<TempLogEntry[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('compliance_temp_logs')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('log_date', date)
    .order('recorded_at', { ascending: false })

  if (error) throw new Error(`Failed to load temperature logs: ${error.message}`)
  return (data ?? []).map(mapTempLog)
}

export async function getTemperatureAlerts(date?: string): Promise<TempLogEntry[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('compliance_temp_logs')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('is_in_range', false)
    .order('recorded_at', { ascending: false })
    .limit(50)

  if (date) {
    query = query.eq('log_date', date)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load temperature alerts: ${error.message}`)
  return (data ?? []).map(mapTempLog)
}

// ─── Cleaning Log Actions ────────────────────────────────────────

export async function getCleaningChecklist(date: string): Promise<CleaningLogEntry[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Load existing logs for this date
  const { data: existing, error } = await supabase
    .from('compliance_cleaning_logs')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('log_date', date)
    .order('area')
    .order('task_name')

  if (error) throw new Error(`Failed to load cleaning checklist: ${error.message}`)

  // If no logs exist for this date, seed with defaults
  if (!existing || existing.length === 0) {
    const rows: any[] = []
    for (const [area, tasks] of Object.entries(DEFAULT_CLEANING_TASKS)) {
      for (const taskName of tasks) {
        rows.push({
          chef_id: user.tenantId!,
          log_date: date,
          task_name: taskName,
          area,
          completed: false,
        })
      }
    }

    const { data: seeded, error: seedError } = await supabase
      .from('compliance_cleaning_logs')
      .insert(rows)
      .select()

    if (seedError) throw new Error(`Failed to seed cleaning checklist: ${seedError.message}`)
    return (seeded ?? []).map(mapCleaningLog)
  }

  return (existing ?? []).map(mapCleaningLog)
}

export async function toggleCleaningTask(
  taskId: string,
  completedBy?: string
): Promise<CleaningLogEntry> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get current state
  const { data: current, error: fetchError } = await supabase
    .from('compliance_cleaning_logs')
    .select('*')
    .eq('id', taskId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (fetchError || !current) throw new Error('Cleaning task not found')

  const nowCompleted = !current.completed
  const { data, error } = await supabase
    .from('compliance_cleaning_logs')
    .update({
      completed: nowCompleted,
      completed_by: nowCompleted ? (completedBy ?? null) : null,
      completed_at: nowCompleted ? new Date().toISOString() : null,
    })
    .eq('id', taskId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to toggle cleaning task: ${error.message}`)

  revalidatePath('/compliance/daily')
  return mapCleaningLog(data)
}

// ─── Summary ─────────────────────────────────────────────────────

export async function getComplianceSummary(
  startDate: string,
  endDate: string
): Promise<ComplianceSummary> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const [tempResult, cleaningResult] = await Promise.all([
    supabase
      .from('compliance_temp_logs')
      .select('id, is_in_range')
      .eq('chef_id', user.tenantId!)
      .gte('log_date', startDate)
      .lte('log_date', endDate),
    supabase
      .from('compliance_cleaning_logs')
      .select('id, completed')
      .eq('chef_id', user.tenantId!)
      .gte('log_date', startDate)
      .lte('log_date', endDate),
  ])

  if (tempResult.error) throw new Error(`Failed to load temp summary: ${tempResult.error.message}`)
  if (cleaningResult.error)
    throw new Error(`Failed to load cleaning summary: ${cleaningResult.error.message}`)

  const tempLogs = tempResult.data ?? []
  const cleaningLogs = cleaningResult.data ?? []

  const totalTempChecks = tempLogs.length
  const outOfRangeCount = tempLogs.filter((l: any) => l.is_in_range === false).length
  const cleaningTasksTotal = cleaningLogs.length
  const cleaningTasksCompleted = cleaningLogs.filter((l: any) => l.completed).length
  const cleaningCompletionRate =
    cleaningTasksTotal > 0 ? Math.round((cleaningTasksCompleted / cleaningTasksTotal) * 100) : 0

  return {
    totalTempChecks,
    outOfRangeCount,
    cleaningTasksTotal,
    cleaningTasksCompleted,
    cleaningCompletionRate,
  }
}

// ─── Mappers ─────────────────────────────────────────────────────

function mapTempLog(row: any): TempLogEntry {
  return {
    id: row.id,
    logDate: row.log_date,
    location: row.location,
    locationLabel: row.location_label,
    temperatureF: Number(row.temperature_f),
    targetMinF: row.target_min_f != null ? Number(row.target_min_f) : null,
    targetMaxF: row.target_max_f != null ? Number(row.target_max_f) : null,
    isInRange: row.is_in_range,
    correctiveAction: row.corrective_action,
    recordedBy: row.recorded_by,
    recordedAt: row.recorded_at,
  }
}

function mapCleaningLog(row: any): CleaningLogEntry {
  return {
    id: row.id,
    logDate: row.log_date,
    taskName: row.task_name,
    area: row.area,
    completed: row.completed,
    completedBy: row.completed_by,
    completedAt: row.completed_at,
    notes: row.notes,
  }
}
