'use server'

// Task Dependency Actions
// CRUD for task dependencies with cycle detection.
// Uses deterministic graph algorithms (no AI).

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { calculateCriticalPath, wouldCreateCycle } from '@/lib/formulas/critical-path'
import type { TaskNode, CriticalPathResult } from '@/lib/formulas/critical-path'

// ── Types ──────────────────────────────────────────────────────────────────

export type TaskDependency = {
  id: string
  task_id: string
  depends_on_task_id: string
  dependency_type: 'finish_to_start' | 'start_to_start'
  created_at: string
}

export type TaskWithDeps = {
  id: string
  // title is the current schema field name for the task label
  title: string
  due_date: string | null
  due_time: string | null
  // completed is derived from status === 'done' since there is no boolean 'completed' column
  completed: boolean
  // estimated_minutes is not in the tasks schema; a heuristic default is applied at query time
  estimated_minutes: number | null
  dependencies: string[] // IDs of tasks this depends on
  dependents: string[] // IDs of tasks that depend on this
}

// ── getTasksWithDependencies ───────────────────────────────────────────────

/**
 * Fetches all tasks for a chef with their dependency relationships.
 * Used to build the Gantt view.
 * NOTE: estimated_minutes is not in the tasks schema. The field is null for all tasks;
 * callers that need a duration heuristic should apply a default (e.g. 30 min) explicitly.
 */
export async function getTasksWithDependencies(options?: {
  dateFilter?: string // ISO date to filter by due_date
}): Promise<TaskWithDeps[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Select current schema fields: title and status (not the stale text/completed/estimated_minutes)
  let query = db
    .from('tasks')
    .select('id, title, due_date, due_time, status')
    .eq('chef_id', user.tenantId!)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('due_time', { ascending: true, nullsFirst: false })

  if (options?.dateFilter) {
    query = query.eq('due_date', options.dateFilter)
  }

  const { data: tasks, error: taskError } = await query

  if (taskError) {
    console.error('[getTasksWithDependencies] Task fetch error:', taskError)
    return []
  }

  if (!tasks?.length) return []

  const taskIds = tasks.map((t: any) => t.id)

  // Fetch dependencies for these tasks
  const { data: deps, error: depError } = await db
    .from('task_dependencies')
    .select('task_id, depends_on_task_id')
    .eq('chef_id', user.tenantId!)
    .or(`task_id.in.(${taskIds.join(',')}),depends_on_task_id.in.(${taskIds.join(',')})`)

  if (depError) {
    console.error('[getTasksWithDependencies] Dependency fetch error:', depError)
  }

  // Build dependency maps
  const dependsOn: Record<string, string[]> = {}
  const dependents: Record<string, string[]> = {}

  for (const dep of deps ?? []) {
    if (!dependsOn[dep.task_id]) dependsOn[dep.task_id] = []
    dependsOn[dep.task_id].push(dep.depends_on_task_id)

    if (!dependents[dep.depends_on_task_id]) dependents[dep.depends_on_task_id] = []
    dependents[dep.depends_on_task_id].push(dep.task_id)
  }

  return tasks.map((t: any) => ({
    id: t.id,
    title: t.title,
    due_date: t.due_date,
    due_time: t.due_time,
    // Derive completed from status since there is no boolean 'completed' column in tasks
    completed: t.status === 'done',
    // No duration column in tasks schema; expose as null so callers apply their own heuristic
    estimated_minutes: null,
    dependencies: dependsOn[t.id] ?? [],
    dependents: dependents[t.id] ?? [],
  }))
}

// ── addDependency ──────────────────────────────────────────────────────────

/**
 * Adds a dependency between two tasks.
 * Validates that adding the dependency won't create a cycle.
 */
export async function addDependency(input: {
  taskId: string
  dependsOnTaskId: string
  dependencyType?: 'finish_to_start' | 'start_to_start'
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (input.taskId === input.dependsOnTaskId) {
    return { success: false, error: 'A task cannot depend on itself' }
  }

  // Verify both tasks belong to this chef using current schema fields
  const { data: tasks } = await db
    .from('tasks')
    .select('id, title')
    .eq('chef_id', user.tenantId!)
    .in('id', [input.taskId, input.dependsOnTaskId])

  if (!tasks || tasks.length !== 2) {
    return { success: false, error: 'One or both tasks not found' }
  }

  // Fetch all existing dependencies to check for cycles
  const { data: allDeps } = await db
    .from('task_dependencies')
    .select('task_id, depends_on_task_id')
    .eq('chef_id', user.tenantId!)

  // Fetch all tasks for cycle detection
  const { data: allTasks } = await db
    .from('tasks')
    .select('id, title')
    .eq('chef_id', user.tenantId!)

  // Build TaskNode array for cycle detection
  // Use 30-minute heuristic duration since tasks schema has no estimated_minutes column
  const taskNodes: TaskNode[] = (allTasks ?? []).map((t: any) => ({
    id: t.id,
    name: t.title,
    durationMinutes: 30, // heuristic: no duration column in current schema
    dependsOn: (allDeps ?? [])
      .filter((d: any) => d.task_id === t.id)
      .map((d: any) => d.depends_on_task_id),
  }))

  // Check if adding this dependency would create a cycle
  if (wouldCreateCycle(taskNodes, input.taskId, input.dependsOnTaskId)) {
    return {
      success: false,
      error: 'Adding this dependency would create a circular reference',
    }
  }

  // Insert the dependency
  const { error } = await db.from('task_dependencies').insert({
    chef_id: user.tenantId!,
    task_id: input.taskId,
    depends_on_task_id: input.dependsOnTaskId,
    dependency_type: input.dependencyType ?? 'finish_to_start',
  })

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'This dependency already exists' }
    }
    console.error('[addDependency] Error:', error)
    return { success: false, error: 'Failed to add dependency' }
  }

  revalidatePath('/tasks')
  revalidatePath('/tasks/gantt')
  return { success: true }
}

// ── removeDependency ───────────────────────────────────────────────────────

/**
 * Removes a dependency between two tasks by stable task pair.
 * The UI passes the two task ids directly (not a dependency record id).
 */
export async function removeDependency(input: {
  taskId: string
  dependsOnTaskId: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('task_dependencies')
    .delete()
    .eq('chef_id', user.tenantId!)
    .eq('task_id', input.taskId)
    .eq('depends_on_task_id', input.dependsOnTaskId)

  if (error) {
    console.error('[removeDependency] Error:', error)
    return { success: false, error: 'Failed to remove dependency' }
  }

  revalidatePath('/tasks')
  revalidatePath('/tasks/gantt')
  return { success: true }
}

// ── getCriticalPath ────────────────────────────────────────────────────────

/**
 * Computes the critical path for tasks on a given date (or all tasks).
 * Returns scheduling information for Gantt chart rendering.
 * NOTE: task duration uses a 30-minute heuristic because the tasks schema
 * does not carry an estimated_minutes column. Gantt bar widths are proportional
 * but not authoritative time estimates.
 */
export async function getCriticalPath(options?: {
  dateFilter?: string
}): Promise<CriticalPathResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch tasks using current schema fields
  let query = db
    .from('tasks')
    .select('id, title, status')
    .eq('chef_id', user.tenantId!)
    .neq('status', 'done')

  if (options?.dateFilter) {
    query = query.eq('due_date', options.dateFilter)
  }

  const { data: tasks, error: taskError } = await query

  if (taskError || !tasks?.length) {
    return {
      criticalPath: [],
      totalDurationMinutes: 0,
      taskSchedule: {},
      hasCycle: false,
    }
  }

  const taskIds = tasks.map((t: any) => t.id)

  // Fetch dependencies
  const { data: deps } = await db
    .from('task_dependencies')
    .select('task_id, depends_on_task_id')
    .eq('chef_id', user.tenantId!)
    .in('task_id', taskIds)

  // Build dependency map
  const depMap: Record<string, string[]> = {}
  for (const dep of deps ?? []) {
    if (!depMap[dep.task_id]) depMap[dep.task_id] = []
    depMap[dep.task_id].push(dep.depends_on_task_id)
  }

  // Build task nodes with explicit 30-min heuristic duration
  const taskNodes: TaskNode[] = tasks.map((t: any) => ({
    id: t.id,
    name: t.title,
    durationMinutes: 30, // heuristic: 30 min default since tasks schema has no duration column
    dependsOn: (depMap[t.id] ?? []).filter((d) => taskIds.includes(d)),
  }))

  return calculateCriticalPath(taskNodes)
}
