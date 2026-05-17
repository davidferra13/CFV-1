'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { estimatePrepMinutes } from './prep-time-estimator'
import type {
  PrepSchedule,
  PrepTask,
  PrepTimeline,
  ComponentPrepInfo,
  CreatePrepTaskInput,
  UpdatePrepTaskInput,
} from './prep-schedule-types'

// ============================================
// INTERNAL HELPERS
// ============================================

/**
 * Fetch make-ahead components for an event via the menu chain.
 * events -> menus -> dishes -> components, with recipe prep_time_minutes.
 */
async function fetchEventComponents(
  db: ReturnType<typeof createServerClient>,
  tenantId: string,
  eventId: string
): Promise<ComponentPrepInfo[]> {
  const { data: components } = await (db as any)
    .from('components')
    .select(
      `
      id, name, category, prep_day_offset, make_ahead_window_hours,
      prep_time_of_day, prep_station, storage_notes,
      scale_factor, portion_quantity,
      dish:dishes!inner(menu:menus!inner(event_id)),
      recipe:recipes(prep_time_minutes)
    `
    )
    .eq('tenant_id', tenantId)
    .eq('dish.menu.event_id', eventId)

  if (!components || components.length === 0) return []

  return (components as any[]).map((c) => {
    const quantity = c.portion_quantity ? parseFloat(c.portion_quantity) : 1
    const recipePrepMinutes = c.recipe?.prep_time_minutes ?? null

    return {
      component_id: c.id,
      component_name: c.name,
      category: c.category ?? 'other',
      technique: null, // components table does not store technique directly
      quantity,
      estimated_minutes: estimatePrepMinutes({
        recipe_prep_time_minutes: recipePrepMinutes,
        category: c.category ?? 'other',
        quantity,
      }),
      prep_day_offset: c.prep_day_offset ?? null,
      make_ahead_window_hours: c.make_ahead_window_hours ?? null,
      prep_time_of_day: c.prep_time_of_day ?? null,
      prep_station: c.prep_station ?? null,
      storage_notes: c.storage_notes ?? null,
    }
  })
}

function revalidatePrepPaths(eventId: string) {
  revalidatePath(`/events/${eventId}`)
  revalidatePath('/calendar')
  revalidatePath('/calendar/week')
}

// ============================================
// READ ACTIONS
// ============================================

/**
 * Get the current prep schedule and its tasks for an event.
 * Returns null if no schedule exists yet.
 */
export async function getPrepSchedule(eventId: string): Promise<PrepTimeline | null> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Fetch the schedule
  const { data: schedule } = await (db as any)
    .from('event_prep_schedules')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!schedule) return null

  // Fetch tasks for this schedule
  const { data: tasks } = await (db as any)
    .from('prep_tasks')
    .select('*')
    .eq('schedule_id', schedule.id)
    .order('sequence_order', { ascending: true })

  const taskList: PrepTask[] = (tasks ?? []) as PrepTask[]
  const completedCount = taskList.filter((t) => t.completed_at != null).length
  const totalEstimated = taskList.reduce((sum, t) => sum + t.estimated_minutes, 0)
  const totalActual = taskList.every((t) => t.actual_minutes != null)
    ? taskList.reduce((sum, t) => sum + (t.actual_minutes ?? 0), 0)
    : null

  return {
    schedule: schedule as PrepSchedule,
    tasks: taskList,
    total_estimated_minutes: totalEstimated,
    total_actual_minutes: totalActual,
    completed_count: completedCount,
    total_count: taskList.length,
  }
}

/**
 * Get prep workload across events in a date range.
 * Returns all schedules with their task counts and total estimated time.
 */
export async function getPrepLoadForDateRange(
  start: string,
  end: string
): Promise<
  Array<{
    event_id: string
    schedule_id: string
    status: string
    task_count: number
    completed_count: number
    total_estimated_minutes: number
  }>
> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Get schedules for events within the date range
  const { data: schedules } = await (db as any)
    .from('event_prep_schedules')
    .select('id, event_id, status, event:events!inner(event_date)')
    .eq('tenant_id', tenantId)
    .gte('event.event_date', start)
    .lte('event.event_date', end)

  if (!schedules || schedules.length === 0) return []

  // Fetch tasks for all schedules
  const scheduleIds = (schedules as any[]).map((s) => s.id)
  const { data: allTasks } = await (db as any)
    .from('prep_tasks')
    .select('schedule_id, estimated_minutes, completed_at')
    .in('schedule_id', scheduleIds)

  const tasksBySchedule = new Map<string, any[]>()
  for (const task of (allTasks ?? []) as any[]) {
    const existing = tasksBySchedule.get(task.schedule_id) ?? []
    existing.push(task)
    tasksBySchedule.set(task.schedule_id, existing)
  }

  return (schedules as any[]).map((s) => {
    const tasks = tasksBySchedule.get(s.id) ?? []
    return {
      event_id: s.event_id,
      schedule_id: s.id,
      status: s.status,
      task_count: tasks.length,
      completed_count: tasks.filter((t: any) => t.completed_at != null).length,
      total_estimated_minutes: tasks.reduce(
        (sum: number, t: any) => sum + (t.estimated_minutes ?? 0),
        0
      ),
    }
  })
}

// ============================================
// WRITE ACTIONS
// ============================================

/**
 * Auto-generate a prep schedule from an event's menu components.
 * Creates the schedule container and populates tasks from component data.
 * Idempotent: if a schedule already exists, returns it without regenerating.
 */
export async function generatePrepSchedule(eventId: string): Promise<{
  success: boolean
  timeline?: PrepTimeline
  error?: string
}> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()
    const tenantId = user.tenantId!

    // Check if a schedule already exists
    const existing = await getPrepSchedule(eventId)
    if (existing) {
      return { success: true, timeline: existing }
    }

    // Verify event belongs to this tenant
    const { data: event } = await db
      .from('events')
      .select('id, event_date')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (!event) {
      return { success: false, error: 'Event not found' }
    }

    // Fetch components for the event
    const componentInfos = await fetchEventComponents(db, tenantId, eventId)

    // Create the schedule
    const { data: schedule, error: schedError } = await (db as any)
      .from('event_prep_schedules')
      .insert({
        event_id: eventId,
        tenant_id: tenantId,
        status: 'draft',
        generated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (schedError || !schedule) {
      return {
        success: false,
        error: schedError?.message ?? 'Failed to create schedule',
      }
    }

    // Generate tasks from components
    const tasks: Array<{
      schedule_id: string
      component_id: string | null
      description: string
      estimated_minutes: number
      sequence_order: number
      start_time: string | null
      due_time: string | null
      notes: string | null
    }> = []

    const eventDate = new Date((event as any).event_date)

    for (let i = 0; i < componentInfos.length; i++) {
      const comp = componentInfos[i]

      // Build description with station info
      const descParts = [comp.component_name]
      if (comp.prep_station) descParts.push(`(${comp.prep_station})`)
      const description = descParts.join(' ')

      // Calculate start_time from prep_day_offset or make_ahead_window_hours
      let startTime: string | null = null
      if (comp.prep_day_offset != null && comp.prep_day_offset < 0) {
        const prepDate = new Date(eventDate)
        prepDate.setDate(prepDate.getDate() + comp.prep_day_offset)
        startTime = prepDate.toISOString()
      } else if (comp.make_ahead_window_hours != null && comp.make_ahead_window_hours > 0) {
        const prepDate = new Date(eventDate)
        prepDate.setHours(prepDate.getHours() - comp.make_ahead_window_hours)
        startTime = prepDate.toISOString()
      }

      // Due time is always event date
      const dueTime = eventDate.toISOString()

      // Notes from storage and station
      const noteParts: string[] = []
      if (comp.storage_notes) noteParts.push(comp.storage_notes)
      if (comp.prep_time_of_day) noteParts.push(`Preferred time: ${comp.prep_time_of_day}`)

      tasks.push({
        schedule_id: (schedule as any).id,
        component_id: comp.component_id,
        description,
        estimated_minutes: comp.estimated_minutes,
        sequence_order: i,
        start_time: startTime,
        due_time: dueTime,
        notes: noteParts.length > 0 ? noteParts.join('. ') : null,
      })
    }

    // Insert tasks if any
    if (tasks.length > 0) {
      const { error: taskError } = await (db as any)
        .from('prep_tasks')
        .insert(tasks)

      if (taskError) {
        return {
          success: false,
          error: taskError.message ?? 'Failed to create prep tasks',
        }
      }
    }

    // Fetch the complete timeline
    const timeline = await getPrepSchedule(eventId)
    revalidatePrepPaths(eventId)

    return { success: true, timeline: timeline ?? undefined }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Update a prep task (mark done, adjust times, edit notes).
 */
export async function updatePrepTask(
  taskId: string,
  updates: UpdatePrepTaskInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Verify task belongs to this tenant via schedule
  const { data: task } = await (db as any)
    .from('prep_tasks')
    .select('id, schedule_id, schedule:event_prep_schedules!inner(tenant_id, event_id)')
    .eq('id', taskId)
    .maybeSingle()

  if (!task || (task as any).schedule?.tenant_id !== tenantId) {
    return { success: false, error: 'Task not found' }
  }

  const updatePayload: Record<string, any> = {}
  if (updates.description !== undefined) updatePayload.description = updates.description
  if (updates.estimated_minutes !== undefined)
    updatePayload.estimated_minutes = updates.estimated_minutes
  if (updates.actual_minutes !== undefined) updatePayload.actual_minutes = updates.actual_minutes
  if (updates.sequence_order !== undefined) updatePayload.sequence_order = updates.sequence_order
  if (updates.start_time !== undefined) updatePayload.start_time = updates.start_time
  if (updates.due_time !== undefined) updatePayload.due_time = updates.due_time
  if (updates.notes !== undefined) updatePayload.notes = updates.notes
  if (updates.completed_at !== undefined) updatePayload.completed_at = updates.completed_at

  if (Object.keys(updatePayload).length === 0) {
    return { success: true }
  }

  const { error } = await (db as any)
    .from('prep_tasks')
    .update(updatePayload)
    .eq('id', taskId)

  if (error) return { success: false, error: error.message }

  const eventId = (task as any).schedule?.event_id
  if (eventId) revalidatePrepPaths(eventId)

  return { success: true }
}

/**
 * Add a custom prep task to an existing schedule.
 */
export async function addCustomPrepTask(
  eventId: string,
  input: CreatePrepTaskInput
): Promise<{ success: boolean; task?: PrepTask; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Find the schedule for this event
  const { data: schedule } = await (db as any)
    .from('event_prep_schedules')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!schedule) {
    return { success: false, error: 'No prep schedule exists for this event. Generate one first.' }
  }

  // Determine sequence_order: append to end if not specified
  let sequenceOrder = input.sequence_order
  if (sequenceOrder == null) {
    const { data: maxTask } = await (db as any)
      .from('prep_tasks')
      .select('sequence_order')
      .eq('schedule_id', (schedule as any).id)
      .order('sequence_order', { ascending: false })
      .limit(1)
      .maybeSingle()
    sequenceOrder = maxTask ? (maxTask as any).sequence_order + 1 : 0
  }

  const { data: task, error } = await (db as any)
    .from('prep_tasks')
    .insert({
      schedule_id: (schedule as any).id,
      component_id: input.component_id ?? null,
      description: input.description,
      estimated_minutes: input.estimated_minutes ?? 60,
      sequence_order: sequenceOrder,
      start_time: input.start_time ?? null,
      due_time: input.due_time ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePrepPaths(eventId)

  return { success: true, task: task as PrepTask }
}

/**
 * Reorder prep tasks within a schedule.
 * taskIds must be the complete list of task IDs in the desired order.
 */
export async function reorderPrepTasks(
  eventId: string,
  taskIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Find the schedule for this event
  const { data: schedule } = await (db as any)
    .from('event_prep_schedules')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!schedule) {
    return { success: false, error: 'No prep schedule exists for this event' }
  }

  // Update sequence_order for each task
  const updates = taskIds.map((taskId, index) =>
    (db as any)
      .from('prep_tasks')
      .update({ sequence_order: index })
      .eq('id', taskId)
      .eq('schedule_id', (schedule as any).id)
  )

  const results = await Promise.all(updates)
  const firstError = results.find((r: any) => r.error)
  if (firstError?.error) {
    return { success: false, error: firstError.error.message }
  }

  revalidatePrepPaths(eventId)

  return { success: true }
}
