'use server'

// DOP Task Completion Actions
// Lets chefs manually mark Day-Of Protocol tasks as complete.
// These are tasks that can't be auto-detected from system state
// (e.g., "kitchen clean before dessert", "receipt photo taken at store").

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Get manually-completed DOP task keys for an event.
 * Returns a Set of task_key strings for fast lookup.
 */
export async function getDOPManualCompletions(eventId: string): Promise<Set<string>> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data } = await supabase
    .from('dop_task_completions')
    .select('task_key')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)

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
): Promise<{ completed: boolean }> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Check if already completed
  const { data: existing } = await supabase
    .from('dop_task_completions')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .eq('task_key', taskKey)
    .maybeSingle()

  if (existing) {
    // Un-mark (delete)
    await supabase
      .from('dop_task_completions')
      .delete()
      .eq('id', existing.id)
      .eq('tenant_id', user.tenantId!)

    revalidatePath(`/events/${eventId}`)
    revalidatePath(`/events/${eventId}/schedule`)
    revalidatePath('/dashboard')
    return { completed: false }
  } else {
    // Mark complete
    await supabase.from('dop_task_completions').insert({
      event_id: eventId,
      tenant_id: user.tenantId!,
      task_key: taskKey,
      notes: notes ?? null,
    })

    revalidatePath(`/events/${eventId}`)
    revalidatePath(`/events/${eventId}/schedule`)
    revalidatePath('/dashboard')
    return { completed: true }
  }
}
