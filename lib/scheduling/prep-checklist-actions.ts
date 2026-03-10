'use server'

// Prep Checklist Actions
// Fetches make-ahead components for an event's menu and tracks
// completion state via the existing dop_task_completions table
// using a `prep_component_{componentId}` key format.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface PrepItem {
  componentId: string
  componentName: string
  dishName: string
  courseName: string
  category: string
  storageNotes: string | null
  executionNotes: string | null
  makeAheadWindowHours: number | null
  sortOrder: number
}

export interface PrepProgress {
  completed: number
  total: number
}

/**
 * Fetch all make-ahead components for an event's menu,
 * sorted by lead time (longest first), then by course order.
 */
export async function getPrepChecklist(eventId: string): Promise<PrepItem[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get menus for this event
  const { data: menus } = await supabase
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)

  if (!menus || menus.length === 0) return []

  const menuIds = menus.map((m: { id: string }) => m.id)

  // Get dishes for these menus
  const { data: dishes } = await supabase
    .from('dishes')
    .select('id, name, course_name, course_number, menu_id')
    .in('menu_id', menuIds)
    .eq('tenant_id', user.tenantId!)
    .order('course_number', { ascending: true })

  if (!dishes || dishes.length === 0) return []

  const dishIds = dishes.map((d: { id: string }) => d.id)
  const dishMap = new Map(
    dishes.map((d: any) => [
      d.id,
      { name: d.name, courseName: d.course_name, courseNumber: d.course_number },
    ])
  )

  // Get make-ahead components
  const { data: components } = await supabase
    .from('components')
    .select(
      'id, name, dish_id, category, storage_notes, execution_notes, make_ahead_window_hours, sort_order'
    )
    .in('dish_id', dishIds)
    .eq('tenant_id', user.tenantId!)
    .eq('is_make_ahead', true)
    .order('make_ahead_window_hours', { ascending: false, nullsFirst: false })
    .order('sort_order', { ascending: true })

  if (!components || components.length === 0) return []

  return components.map((c: any) => {
    const dish = dishMap.get(c.dish_id) || {
      name: 'Unknown dish',
      courseName: 'Other',
      courseNumber: 99,
    }
    return {
      componentId: c.id,
      componentName: c.name,
      dishName: dish.name || 'Untitled dish',
      courseName: dish.courseName || 'Other',
      category: c.category,
      storageNotes: c.storage_notes,
      executionNotes: c.execution_notes,
      makeAheadWindowHours: c.make_ahead_window_hours,
      sortOrder: c.sort_order,
    }
  })
}

/**
 * Toggle completion state for a prep component.
 * Uses dop_task_completions with key format `prep_component_{componentId}`.
 */
export async function togglePrepItem(
  eventId: string,
  componentId: string
): Promise<{ completed: boolean }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const taskKey = `prep_component_${componentId}`

  const { data: existing } = await supabase
    .from('dop_task_completions')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .eq('task_key', taskKey)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('dop_task_completions')
      .delete()
      .eq('id', existing.id)
      .eq('tenant_id', user.tenantId!)

    revalidatePath(`/events/${eventId}`)
    revalidatePath(`/events/${eventId}/prep`)
    return { completed: false }
  } else {
    await supabase.from('dop_task_completions').insert({
      event_id: eventId,
      tenant_id: user.tenantId!,
      task_key: taskKey,
    })

    revalidatePath(`/events/${eventId}`)
    revalidatePath(`/events/${eventId}/prep`)
    return { completed: true }
  }
}

/**
 * Get prep completion progress for an event.
 */
export async function getPrepProgress(eventId: string): Promise<PrepProgress> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Total make-ahead components
  const items = await getPrepChecklist(eventId)
  const total = items.length

  if (total === 0) return { completed: 0, total: 0 }

  // Count completions
  const { data: completions } = await supabase
    .from('dop_task_completions')
    .select('task_key')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .like('task_key', 'prep_component_%')

  return {
    completed: completions?.length ?? 0,
    total,
  }
}

/**
 * Get all completed prep component keys for an event.
 * Returns a Set of component IDs (without the prefix).
 */
export async function getPrepCompletionKeys(eventId: string): Promise<Set<string>> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('dop_task_completions')
    .select('task_key')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .like('task_key', 'prep_component_%')

  if (!data) return new Set()
  return new Set(data.map((r: { task_key: string }) => r.task_key.replace('prep_component_', '')))
}

/**
 * Mark all prep as complete by setting prep_completed_at on the event.
 */
export async function markAllPrepComplete(eventId: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('events')
    .update({ prep_completed_at: new Date().toISOString() })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    throw new Error('Failed to mark prep as complete')
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/prep`)
  revalidatePath('/dashboard')
  revalidatePath('/queue')
  revalidatePath('/briefing')
}
