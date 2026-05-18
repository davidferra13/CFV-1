// Departure Checklist Actions
// Manages the post-service departure category of the day-of checklist.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type { DepartureChecklistItem } from './departure-types'

const DEFAULT_DEPARTURE_ITEMS: string[] = [
  'All personal equipment packed',
  'Kitchen returned to original state',
  'Counters and surfaces wiped',
  'Trash taken out',
  'Nothing left in fridge',
  'Nothing left in oven/stovetop',
  'Check all rooms used',
  'Client walkthrough/sign-off',
]

/**
 * Get all departure-category checklist items for an event.
 */
export async function getDepartureChecklist(
  eventId: string
): Promise<{ success: boolean; data: DepartureChecklistItem[]; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_day_of_checklist')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.entityId)
    .eq('category', 'departure')
    .order('sort_order', { ascending: true })

  if (error) return { success: false, data: [], error: 'Failed to load departure checklist' }
  return { success: true, data: data || [] }
}

/**
 * Seed default departure checklist items if none exist for this event.
 */
export async function seedDepartureDefaults(
  eventId: string
): Promise<{ success: boolean; count: number; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Check if departure items already exist
  const { data: existing } = await db
    .from('event_day_of_checklist')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.entityId)
    .eq('category', 'departure')
    .limit(1)

  if (existing && existing.length > 0) {
    return { success: false, count: 0, error: 'Departure checklist already exists' }
  }

  // Find highest sort_order across all categories for this event
  const { data: maxItem } = await db
    .from('event_day_of_checklist')
    .select('sort_order')
    .eq('event_id', eventId)
    .eq('tenant_id', user.entityId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const startOrder = (maxItem?.sort_order ?? -1) + 1

  const rows = DEFAULT_DEPARTURE_ITEMS.map((label, idx) => ({
    event_id: eventId,
    tenant_id: user.entityId,
    label,
    category: 'departure',
    checked: false,
    sort_order: startOrder + idx,
  }))

  const { error } = await db.from('event_day_of_checklist').insert(rows)
  if (error) return { success: false, count: 0, error: 'Failed to seed departure checklist' }

  revalidatePath(`/events/${eventId}`)
  return { success: true, count: rows.length }
}

/**
 * Toggle a checklist item's checked state.
 */
export async function toggleDepartureItem(
  itemId: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get current state
  const { data: item } = await db
    .from('event_day_of_checklist')
    .select('checked')
    .eq('id', itemId)
    .eq('tenant_id', user.entityId)
    .maybeSingle()

  if (!item) return { success: false, error: 'Item not found' }

  const { error } = await db
    .from('event_day_of_checklist')
    .update({ checked: !item.checked })
    .eq('id', itemId)
    .eq('tenant_id', user.entityId)

  if (error) return { success: false, error: 'Failed to toggle item' }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

/**
 * Add a custom checklist item to the departure or leftover category.
 */
export async function addDepartureChecklistItem(
  eventId: string,
  label: string,
  category: 'departure' | 'leftover' = 'departure'
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!label.trim()) return { success: false, error: 'Label is required' }

  const { data: maxItem } = await db
    .from('event_day_of_checklist')
    .select('sort_order')
    .eq('event_id', eventId)
    .eq('tenant_id', user.entityId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await db.from('event_day_of_checklist').insert({
    event_id: eventId,
    tenant_id: user.entityId,
    label: label.trim(),
    category,
    checked: false,
    sort_order: (maxItem?.sort_order ?? -1) + 1,
  })

  if (error) return { success: false, error: 'Failed to add item' }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}
