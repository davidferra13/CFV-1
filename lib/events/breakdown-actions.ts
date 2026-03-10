// Post-Event Breakdown Checklist Actions
// Server actions for structured teardown/cleanup after events.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export interface BreakdownItem {
  key: string
  label: string
  category: BreakdownCategory
}

export type BreakdownCategory = 'equipment' | 'cleanup' | 'venue' | 'rentals' | 'staff' | 'admin'

export interface BreakdownItemStatus {
  key: string
  label: string
  category: BreakdownCategory
  completed: boolean
  completedAt: string | null
  notes: string | null
}

export interface BreakdownProgress {
  completed: number
  total: number
  byCategory: Record<BreakdownCategory, { completed: number; total: number }>
}

// ============================================
// DEFAULT CHECKLIST
// ============================================

const DEFAULT_BREAKDOWN_ITEMS: BreakdownItem[] = [
  // Equipment
  { key: 'equip_count', label: 'Count all equipment', category: 'equipment' },
  { key: 'equip_chafing', label: 'Pack chafing dishes', category: 'equipment' },
  { key: 'equip_serving', label: 'Pack serving utensils', category: 'equipment' },
  { key: 'equip_specialty', label: 'Pack specialty items', category: 'equipment' },
  { key: 'equip_verify', label: 'Verify nothing left behind', category: 'equipment' },

  // Cleanup
  { key: 'clean_surfaces', label: 'Wipe down all surfaces', category: 'cleanup' },
  { key: 'clean_floors', label: 'Sweep and mop floors', category: 'cleanup' },
  { key: 'clean_ovens', label: 'Clean ovens and stoves', category: 'cleanup' },
  { key: 'clean_trash', label: 'Empty all trash', category: 'cleanup' },
  { key: 'clean_boards', label: 'Sanitize cutting boards', category: 'cleanup' },

  // Venue
  { key: 'venue_walkthrough', label: 'Walk-through inspection', category: 'venue' },
  { key: 'venue_restore', label: 'Return venue items to original position', category: 'venue' },
  { key: 'venue_damages', label: 'Check for damages', category: 'venue' },
  { key: 'venue_lock', label: 'Lock up if required', category: 'venue' },
  { key: 'venue_keys', label: 'Return keys or access cards', category: 'venue' },

  // Rentals
  { key: 'rental_count', label: 'Count rental items', category: 'rentals' },
  { key: 'rental_separate', label: 'Separate items for return', category: 'rentals' },
  { key: 'rental_damages', label: 'Note any damages', category: 'rentals' },
  { key: 'rental_pickup', label: 'Schedule return pickup', category: 'rentals' },

  // Staff
  { key: 'staff_timesheets', label: 'Collect staff time sheets', category: 'staff' },
  { key: 'staff_tips', label: 'Distribute tips', category: 'staff' },
  { key: 'staff_debrief', label: 'Debrief team', category: 'staff' },
  { key: 'staff_next', label: 'Confirm next event assignments', category: 'staff' },

  // Admin
  { key: 'admin_feedback', label: 'Collect client feedback', category: 'admin' },
  { key: 'admin_aar_notes', label: 'Note special requests for AAR', category: 'admin' },
  { key: 'admin_photos', label: 'Photograph final setup', category: 'admin' },
  { key: 'admin_receipts', label: 'Save receipts', category: 'admin' },
]

const CATEGORY_LABELS: Record<BreakdownCategory, string> = {
  equipment: 'Equipment',
  cleanup: 'Cleanup',
  venue: 'Venue',
  rentals: 'Rentals',
  staff: 'Staff',
  admin: 'Admin',
}

export { CATEGORY_LABELS }

// ============================================
// ACTIONS
// ============================================

/**
 * Get the full breakdown checklist with completion status for an event.
 */
export async function getBreakdownChecklist(
  eventId: string
): Promise<{ items: BreakdownItemStatus[]; categories: BreakdownCategory[] }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get all breakdown completions for this event
  const { data: completions } = await supabase
    .from('dop_task_completions')
    .select('task_key, notes, created_at')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .like('task_key', 'breakdown_%')

  const completionMap = new Map<string, { created_at: string; notes: string | null }>()
  for (const c of completions ?? []) {
    const itemKey = c.task_key.replace('breakdown_', '')
    completionMap.set(itemKey, { created_at: c.created_at, notes: c.notes })
  }

  const items: BreakdownItemStatus[] = DEFAULT_BREAKDOWN_ITEMS.map((item) => {
    const completion = completionMap.get(item.key)
    return {
      key: item.key,
      label: item.label,
      category: item.category,
      completed: !!completion,
      completedAt: completion?.created_at ?? null,
      notes: completion?.notes ?? null,
    }
  })

  // Ordered unique categories
  const categories: BreakdownCategory[] = [
    'equipment',
    'cleanup',
    'venue',
    'rentals',
    'staff',
    'admin',
  ]

  return { items, categories }
}

/**
 * Toggle a breakdown checklist item's completion status.
 */
export async function toggleBreakdownItem(
  eventId: string,
  itemKey: string,
  notes?: string
): Promise<{ completed: boolean }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Validate item key
  if (!DEFAULT_BREAKDOWN_ITEMS.some((item) => item.key === itemKey)) {
    throw new Error('Invalid breakdown item key')
  }

  const taskKey = `breakdown_${itemKey}`

  // Check if already completed
  const { data: existing } = await supabase
    .from('dop_task_completions')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .eq('task_key', taskKey)
    .maybeSingle()

  if (existing) {
    // Un-mark
    await supabase
      .from('dop_task_completions')
      .delete()
      .eq('id', existing.id)
      .eq('tenant_id', user.tenantId!)

    revalidatePath(`/events/${eventId}/breakdown`)
    revalidatePath(`/events/${eventId}`)
    return { completed: false }
  } else {
    // Mark complete
    await supabase.from('dop_task_completions').insert({
      event_id: eventId,
      tenant_id: user.tenantId!,
      task_key: taskKey,
      notes: notes ?? null,
    })

    revalidatePath(`/events/${eventId}/breakdown`)
    revalidatePath(`/events/${eventId}`)
    return { completed: true }
  }
}

/**
 * Get breakdown progress summary.
 */
export async function getBreakdownProgress(eventId: string): Promise<BreakdownProgress> {
  const { items, categories } = await getBreakdownChecklist(eventId)

  const byCategory = {} as Record<BreakdownCategory, { completed: number; total: number }>
  for (const cat of categories) {
    const catItems = items.filter((i) => i.category === cat)
    byCategory[cat] = {
      completed: catItems.filter((i) => i.completed).length,
      total: catItems.length,
    }
  }

  return {
    completed: items.filter((i) => i.completed).length,
    total: items.length,
    byCategory,
  }
}

/**
 * Mark the entire breakdown as complete (final sign-off).
 * Only succeeds if all items are checked.
 */
export async function markBreakdownComplete(eventId: string): Promise<{ success: boolean }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify all items are complete
  const progress = await getBreakdownProgress(eventId)
  if (progress.completed < progress.total) {
    throw new Error(`Cannot sign off: ${progress.total - progress.completed} items remaining`)
  }

  // Record sign-off
  const taskKey = 'breakdown_signoff'
  const { data: existing } = await supabase
    .from('dop_task_completions')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .eq('task_key', taskKey)
    .maybeSingle()

  if (!existing) {
    await supabase.from('dop_task_completions').insert({
      event_id: eventId,
      tenant_id: user.tenantId!,
      task_key: taskKey,
      notes: `Signed off at ${new Date().toISOString()}`,
    })
  }

  revalidatePath(`/events/${eventId}/breakdown`)
  revalidatePath(`/events/${eventId}`)
  return { success: true }
}
