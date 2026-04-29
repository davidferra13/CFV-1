'use server'

// DOP Task Completion Actions
// Lets chefs manually mark Day-Of Protocol tasks as complete.
// These are tasks that can't be auto-detected from system state
// (e.g., "kitchen clean before dessert", "receipt photo taken at store").

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

function getDbErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return 'Unknown database error'
}

function throwDbError(operation: string, error: unknown): never {
  throw new Error(`Failed to ${operation} DOP task completion: ${getDbErrorMessage(error)}`)
}

function assertNonEmpty(value: string, label: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is required`)
  }
}

/**
 * Get manually-completed DOP task keys for an event.
 * Returns a Set of task_key strings for fast lookup.
 */
export async function getDOPManualCompletions(eventId: string): Promise<Set<string>> {
  assertNonEmpty(eventId, 'Event ID')

  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('dop_task_completions')
    .select('task_key')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    throwDbError('load', error)
  }

  if (!data) return new Set()
  return new Set(data.map((r: { task_key: string }) => r.task_key))
}

/**
 * Toggle a DOP task's manual completion state.
 * If already completed: removes the record. If not: inserts it.
 */
export async function toggleDOPTaskCompletion(
  eventId: string,
  taskKey: string,
  notes?: string
): Promise<{ success: true; completed: boolean }> {
  assertNonEmpty(eventId, 'Event ID')
  assertNonEmpty(taskKey, 'Task key')

  const user = await requireChef()
  const db: any = createServerClient()

  // Check if already completed
  const { data: existing, error: existingError } = await db
    .from('dop_task_completions')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .eq('task_key', taskKey)
    .maybeSingle()

  if (existingError) {
    throwDbError('read', existingError)
  }

  if (existing) {
    // Un-mark (delete)
    const { error: deleteError } = await db
      .from('dop_task_completions')
      .delete()
      .eq('id', existing.id)
      .eq('tenant_id', user.tenantId!)
      .select('id')
      .single()

    if (deleteError) {
      throwDbError('delete', deleteError)
    }

    revalidatePath(`/events/${eventId}`)
    revalidatePath(`/events/${eventId}/schedule`)
    revalidatePath('/dashboard')
    return { success: true, completed: false }
  } else {
    // Mark complete
    const { error: insertError } = await db
      .from('dop_task_completions')
      .insert({
        event_id: eventId,
        tenant_id: user.tenantId!,
        task_key: taskKey,
        notes: notes ?? null,
      })
      .select('id')
      .single()

    if (insertError) {
      throwDbError('insert', insertError)
    }

    revalidatePath(`/events/${eventId}`)
    revalidatePath(`/events/${eventId}/schedule`)
    revalidatePath('/dashboard')
    return { success: true, completed: true }
  }
}
