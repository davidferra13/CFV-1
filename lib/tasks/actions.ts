// Task Management — Core CRUD Server Actions
// Chef-only. Manages daily tasks, assignments, and completion tracking.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { notifyTaskAssigned } from '@/lib/notifications/triggers'

// ============================================
// SCHEMAS
// ============================================

const RecurringRuleSchema = z
  .object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    days_of_week: z.array(z.number().min(0).max(6)).optional(), // 0=Sun, 6=Sat
    day_of_month: z.number().min(1).max(31).optional(),
    end_date: z.string().optional(), // ISO date
  })
  .nullable()
  .optional()

const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  station_id: z.string().uuid().nullable().optional(),
  due_date: z.string().min(1, 'Due date is required'), // ISO date string
  due_time: z.string().nullable().optional(), // HH:MM format
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  notes: z.string().optional(),
  recurring_rule: RecurringRuleSchema,
})

const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  station_id: z.string().uuid().nullable().optional(),
  due_date: z.string().optional(),
  due_time: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['pending', 'in_progress', 'done']).optional(),
  notes: z.string().nullable().optional(),
  recurring_rule: RecurringRuleSchema,
})

const ListTasksFilterSchema = z
  .object({
    status: z.enum(['pending', 'in_progress', 'done']).optional(),
    assigned_to: z.string().uuid().optional(),
    due_date: z.string().optional(),
    station_id: z.string().uuid().optional(),
  })
  .optional()

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>
export type ListTasksFilter = z.infer<typeof ListTasksFilterSchema>
export type RecurringRule = z.infer<typeof RecurringRuleSchema>

export type Task = {
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
  recurring_rule: RecurringRule | null
  template_id: string | null
  completed_at: string | null
  completed_by: string | null
  created_at: string
  updated_at: string
  staff_member?: { id: string; name: string; role: string } | null
  station?: { id: string; name: string } | null
}

// ============================================
// HELPER: Fetch active staff for dropdowns
// ============================================

export async function getActiveStaff() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('staff_members')
    .select('id, name, role')
    .eq('chef_id', user.tenantId!)
    .eq('status', 'active')
    .order('name')

  if (error) {
    console.error('[getActiveStaff] Error:', error)
    return []
  }
  return data ?? []
}

// ============================================
// HELPER: Fetch active stations for dropdowns
// ============================================

export async function getActiveStations() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('stations')
    .select('id, name')
    .eq('chef_id', user.tenantId!)
    .eq('status', 'active')
    .order('name')

  if (error) {
    // stations table may not exist yet — return empty
    console.error('[getActiveStations] Error:', error)
    return []
  }
  return data ?? []
}

// ============================================
// CREATE TASK
// ============================================

export async function createTask(input: CreateTaskInput) {
  const user = await requireChef()
  const validated = CreateTaskSchema.parse(input)
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      chef_id: user.tenantId!,
      title: validated.title,
      description: validated.description ?? null,
      assigned_to: validated.assigned_to ?? null,
      station_id: validated.station_id ?? null,
      due_date: validated.due_date,
      due_time: validated.due_time ?? null,
      priority: validated.priority,
      status: 'pending',
      notes: validated.notes ?? null,
      recurring_rule: validated.recurring_rule ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('[createTask] Error:', error)
    throw new Error('Failed to create task')
  }

  // Non-blocking notification — notify chef when a task is assigned to a staff member
  if (data.assigned_to) {
    try {
      // Look up the staff member name for the notification
      const { data: staffRow } = await supabase
        .from('staff_members')
        .select('name')
        .eq('id', data.assigned_to)
        .single()
      const staffName = staffRow?.name ?? 'Unknown'
      try {
        await notifyTaskAssigned(user.tenantId!, staffName, validated.title, validated.due_date)
      } catch {}
    } catch (err) {
      console.error('[createTask] Task notification failed (non-fatal):', err)
    }
  }

  revalidatePath('/tasks')
  return data
}

// ============================================
// UPDATE TASK
// ============================================

export async function updateTask(id: string, input: UpdateTaskInput) {
  const user = await requireChef()
  const validated = UpdateTaskSchema.parse(input)
  const supabase = createServerClient()

  // Build update payload — only include fields that were explicitly provided
  const updatePayload: Record<string, unknown> = {}
  if (validated.title !== undefined) updatePayload.title = validated.title
  if (validated.description !== undefined) updatePayload.description = validated.description
  if (validated.assigned_to !== undefined) updatePayload.assigned_to = validated.assigned_to
  if (validated.station_id !== undefined) updatePayload.station_id = validated.station_id
  if (validated.due_date !== undefined) updatePayload.due_date = validated.due_date
  if (validated.due_time !== undefined) updatePayload.due_time = validated.due_time
  if (validated.priority !== undefined) updatePayload.priority = validated.priority
  if (validated.status !== undefined) updatePayload.status = validated.status
  if (validated.notes !== undefined) updatePayload.notes = validated.notes
  if (validated.recurring_rule !== undefined)
    updatePayload.recurring_rule = validated.recurring_rule

  const { data, error } = await supabase
    .from('tasks')
    .update(updatePayload)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateTask] Error:', error)
    throw new Error('Failed to update task')
  }

  revalidatePath('/tasks')
  return data
}

// ============================================
// DELETE TASK
// ============================================

export async function deleteTask(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase.from('tasks').delete().eq('id', id).eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[deleteTask] Error:', error)
    throw new Error('Failed to delete task')
  }

  revalidatePath('/tasks')
}

// ============================================
// LIST TASKS (with optional filters)
// ============================================

export async function listTasks(filters?: ListTasksFilter) {
  const user = await requireChef()
  const parsed = ListTasksFilterSchema.parse(filters)
  const supabase = createServerClient()

  let query = supabase
    .from('tasks')
    .select('*, staff_member:staff_members!tasks_assigned_to_fkey(id, name, role)')
    .eq('chef_id', user.tenantId!)
    .order('due_date', { ascending: true })
    .order('due_time', { ascending: true, nullsFirst: false })
    .order('priority', { ascending: false })

  if (parsed?.status) {
    query = query.eq('status', parsed.status)
  }
  if (parsed?.assigned_to) {
    query = query.eq('assigned_to', parsed.assigned_to)
  }
  if (parsed?.due_date) {
    query = query.eq('due_date', parsed.due_date)
  }
  if (parsed?.station_id) {
    query = query.eq('station_id', parsed.station_id)
  }

  const { data, error } = await query

  if (error) {
    console.error('[listTasks] Error:', error)
    throw new Error('Failed to load tasks')
  }

  return (data ?? []) as Task[]
}

// ============================================
// GET TASKS BY DATE (grouped by assigned staff)
// ============================================

export async function getTasksByDate(date: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('tasks')
    .select('*, staff_member:staff_members!tasks_assigned_to_fkey(id, name, role)')
    .eq('chef_id', user.tenantId!)
    .eq('due_date', date)
    .order('due_time', { ascending: true, nullsFirst: false })
    .order('priority', { ascending: false })

  if (error) {
    console.error('[getTasksByDate] Error:', error)
    throw new Error('Failed to load tasks for date')
  }

  const tasks = (data ?? []) as Task[]

  // Group by assigned_to
  const grouped: Record<string, { staffName: string; staffRole: string; tasks: Task[] }> = {}
  const unassigned: Task[] = []

  for (const task of tasks) {
    if (!task.assigned_to) {
      unassigned.push(task)
      continue
    }

    const staffId = task.assigned_to
    if (!grouped[staffId]) {
      const sm = task.staff_member as any
      grouped[staffId] = {
        staffName: sm?.name ?? 'Unknown',
        staffRole: sm?.role ?? '',
        tasks: [],
      }
    }
    grouped[staffId].tasks.push(task)
  }

  return { grouped, unassigned }
}

// ============================================
// COMPLETE TASK
// ============================================

export async function completeTask(
  id: string,
  staffMemberId?: string,
  durationMinutes?: number,
  notes?: string
) {
  const user = await requireChef()
  const supabase = createServerClient()
  const now = new Date().toISOString()

  // Update task status
  const { data: task, error: updateError } = await supabase
    .from('tasks')
    .update({
      status: 'done',
      completed_at: now,
      completed_by: staffMemberId ?? user.entityId,
    })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (updateError) {
    console.error('[completeTask] Error updating task:', updateError)
    throw new Error('Failed to complete task')
  }

  // Log completion in task_completion_log
  try {
    await supabase.from('task_completion_log').insert({
      chef_id: user.tenantId!,
      task_id: id,
      completed_by: staffMemberId ?? user.entityId,
      completed_at: now,
      duration_minutes: durationMinutes ?? null,
      notes: notes ?? null,
    })
  } catch (err) {
    // Non-blocking — log failures don't prevent task completion
    console.error('[completeTask] Completion log failed:', err)
  }

  revalidatePath('/tasks')
  return task
}

// ============================================
// REOPEN TASK
// ============================================

export async function reopenTask(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('tasks')
    .update({
      status: 'pending',
      completed_at: null,
      completed_by: null,
    })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[reopenTask] Error:', error)
    throw new Error('Failed to reopen task')
  }

  revalidatePath('/tasks')
  return data
}
