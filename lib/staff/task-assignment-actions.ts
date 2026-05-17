'use server'

// Staff Task Assignment, Workload Tracking, and Shift Management
// Chef-only. Kanban-style task board + shift scheduling.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type {
  TaskPriority,
  TaskStatus,
  StaffTask,
  StaffWorkload,
  ShiftAssignment,
  TaskBoard,
} from './task-assignment-types'

// Re-export types for consumer convenience
export type { TaskPriority, TaskStatus, StaffTask, StaffWorkload, ShiftAssignment, TaskBoard }

// ============================================
// 1. createTask
// ============================================

export async function createTask(input: {
  title: string
  description?: string
  eventId?: string
  assigneeId?: string
  assigneeName?: string
  priority?: TaskPriority
  dueAt?: string
  category?: string
}): Promise<StaffTask> {
  const user = await requireChef()
  const db: any = createServerClient()

  const status: TaskStatus = input.assigneeId ? 'assigned' : 'unassigned'

  const { data, error } = await (db as any)
    .from('staff_tasks')
    .insert({
      tenant_id: user.tenantId!,
      title: input.title,
      description: input.description || null,
      event_id: input.eventId || null,
      assignee_id: input.assigneeId || null,
      assignee_name: input.assigneeName || null,
      priority: input.priority || 'normal',
      status,
      due_at: input.dueAt || null,
      category: input.category || 'general',
    })
    .select()
    .single()

  if (error) {
    console.error('[createTask] Error:', error)
    throw new Error('Failed to create task')
  }

  revalidatePath('/staff')
  revalidatePath('/dashboard')
  return mapTask(data)
}

// ============================================
// 2. assignTask
// ============================================

export async function assignTask(
  taskId: string,
  assigneeId: string,
  assigneeName: string
): Promise<StaffTask> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await (db as any)
    .from('staff_tasks')
    .update({
      assignee_id: assigneeId,
      assignee_name: assigneeName,
      status: 'assigned',
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[assignTask] Error:', error)
    throw new Error('Failed to assign task')
  }

  revalidatePath('/staff')
  return mapTask(data)
}

// ============================================
// 3. updateTaskStatus
// ============================================

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<StaffTask> {
  const user = await requireChef()
  const db: any = createServerClient()

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString()
  }

  const { data, error } = await (db as any)
    .from('staff_tasks')
    .update(updateData)
    .eq('id', taskId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateTaskStatus] Error:', error)
    throw new Error('Failed to update task status')
  }

  revalidatePath('/staff')
  revalidatePath('/dashboard')
  return mapTask(data)
}

// ============================================
// 4. getTaskBoard
// ============================================

export async function getTaskBoard(eventId?: string): Promise<TaskBoard> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = (db as any)
    .from('staff_tasks')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (eventId) {
    query = query.eq('event_id', eventId)
  }

  const { data, error } = await query
  if (error) {
    console.error('[getTaskBoard] Error:', error)
    throw new Error('Failed to load task board')
  }

  const tasks: StaffTask[] = (data ?? []).map(mapTask)

  return {
    unassigned: tasks.filter((t) => t.status === 'unassigned' || t.status === 'assigned'),
    inProgress: tasks.filter((t) => t.status === 'in_progress'),
    completed: tasks.filter((t) => t.status === 'completed'),
    blocked: tasks.filter((t) => t.status === 'blocked'),
  }
}

// ============================================
// 5. getStaffWorkloads
// ============================================

export async function getStaffWorkloads(): Promise<StaffWorkload[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all staff members for this tenant
  const { data: staffRows, error: staffError } = await (db as any)
    .from('staff_members')
    .select('id, first_name, last_name')
    .eq('chef_id', user.tenantId!)

  if (staffError) {
    console.error('[getStaffWorkloads] staff error:', staffError)
    throw new Error('Failed to load staff workloads')
  }

  if (!staffRows || staffRows.length === 0) return []

  // Get all non-completed tasks for this tenant
  const { data: taskRows, error: taskError } = await (db as any)
    .from('staff_tasks')
    .select('assignee_id, status, completed_at')
    .eq('tenant_id', user.tenantId!)

  if (taskError) {
    console.error('[getStaffWorkloads] task error:', taskError)
    throw new Error('Failed to load task data')
  }

  // Get shift assignments
  const { data: shiftRows, error: shiftError } = await (db as any)
    .from('shift_assignments')
    .select('staff_id, start_time, end_time, event_id')
    .eq('tenant_id', user.tenantId!)

  if (shiftError) {
    console.error('[getStaffWorkloads] shift error:', shiftError)
    throw new Error('Failed to load shift data')
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayStr = todayStart.toISOString()

  const workloads: StaffWorkload[] = staffRows.map((s: any) => {
    const staffTasks = (taskRows ?? []).filter((t: any) => t.assignee_id === s.id)
    const activeTasks = staffTasks.filter(
      (t: any) => t.status !== 'completed' && t.status !== 'unassigned'
    ).length
    const completedToday = staffTasks.filter(
      (t: any) => t.status === 'completed' && t.completed_at && t.completed_at >= todayStr
    ).length

    const staffShifts = (shiftRows ?? []).filter((sh: any) => sh.staff_id === s.id)
    const upcomingEventIds = new Set(
      staffShifts.filter((sh: any) => sh.start_time >= todayStr).map((sh: any) => sh.event_id)
    )

    let hoursScheduled = 0
    for (const sh of staffShifts) {
      if (sh.start_time && sh.end_time) {
        const diff = new Date(sh.end_time).getTime() - new Date(sh.start_time).getTime()
        if (diff > 0) hoursScheduled += diff / (1000 * 60 * 60)
      }
    }

    return {
      staffId: s.id,
      staffName: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unnamed',
      activeTasks,
      completedToday,
      upcomingEvents: upcomingEventIds.size,
      hoursScheduled: Math.round(hoursScheduled * 10) / 10,
    }
  })

  return workloads
}

// ============================================
// 6. createShiftAssignment
// ============================================

export async function createShiftAssignment(input: {
  staffId: string
  eventId: string
  role: string
  startTime: string
  endTime: string
}): Promise<ShiftAssignment> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await (db as any)
    .from('shift_assignments')
    .insert({
      tenant_id: user.tenantId!,
      staff_id: input.staffId,
      event_id: input.eventId,
      role: input.role,
      start_time: input.startTime,
      end_time: input.endTime,
    })
    .select()
    .single()

  if (error) {
    console.error('[createShiftAssignment] Error:', error)
    throw new Error('Failed to create shift assignment')
  }

  revalidatePath('/staff')
  return mapShift(data)
}

// ============================================
// 7. getEventShifts
// ============================================

export async function getEventShifts(eventId: string): Promise<ShiftAssignment[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await (db as any)
    .from('shift_assignments')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('event_id', eventId)
    .order('start_time', { ascending: true })

  if (error) {
    console.error('[getEventShifts] Error:', error)
    throw new Error('Failed to load event shifts')
  }

  return (data ?? []).map(mapShift)
}

// ============================================
// 8. confirmShift
// ============================================

export async function confirmShift(shiftId: string): Promise<ShiftAssignment> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await (db as any)
    .from('shift_assignments')
    .update({ confirmed: true })
    .eq('id', shiftId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[confirmShift] Error:', error)
    throw new Error('Failed to confirm shift')
  }

  revalidatePath('/staff')
  return mapShift(data)
}

// ============================================
// Row mappers (snake_case DB -> camelCase TS)
// ============================================

function mapTask(row: any): StaffTask {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id ?? null,
    assigneeId: row.assignee_id ?? null,
    assigneeName: row.assignee_name ?? null,
    title: row.title,
    description: row.description ?? null,
    priority: row.priority ?? 'normal',
    status: row.status ?? 'unassigned',
    dueAt: row.due_at ?? null,
    completedAt: row.completed_at ?? null,
    category: row.category ?? 'general',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapShift(row: any): ShiftAssignment {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    staffId: row.staff_id,
    eventId: row.event_id,
    role: row.role ?? 'assistant',
    startTime: row.start_time,
    endTime: row.end_time,
    confirmed: row.confirmed ?? false,
    notes: row.notes ?? null,
  }
}
