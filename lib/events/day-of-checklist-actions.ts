// Day-of Checklist for Events
// Pre-built checklist categories for farm dinner / off-site events.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

export interface ChecklistItem {
  id: string
  event_id: string
  label: string
  category: 'gear' | 'transport' | 'outfit' | 'mise' | 'docs' | 'other'
  checked: boolean
  sort_order: number
}

const DEFAULT_FARM_DINNER_CHECKLIST: Omit<ChecklistItem, 'id' | 'event_id' | 'sort_order'>[] = [
  // Gear
  { label: 'Chef knife roll', category: 'gear', checked: false },
  { label: 'Cutting boards (2)', category: 'gear', checked: false },
  { label: 'Portable burner + fuel', category: 'gear', checked: false },
  { label: 'Sheet pans', category: 'gear', checked: false },
  { label: 'Mixing bowls', category: 'gear', checked: false },
  { label: 'Tongs, spatulas, ladles', category: 'gear', checked: false },
  { label: 'Thermometer', category: 'gear', checked: false },
  { label: 'Towels (stack of 10)', category: 'gear', checked: false },
  { label: 'Serving platters/boards', category: 'gear', checked: false },
  { label: 'Trash bags + bus tubs', category: 'gear', checked: false },
  // Transport
  { label: 'Coolers packed with ice', category: 'transport', checked: false },
  { label: 'Dry goods box packed', category: 'transport', checked: false },
  { label: 'Equipment loaded', category: 'transport', checked: false },
  { label: 'GPS route checked', category: 'transport', checked: false },
  // Outfit
  { label: 'Clean chef coat', category: 'outfit', checked: false },
  { label: 'Apron', category: 'outfit', checked: false },
  { label: 'Non-slip shoes', category: 'outfit', checked: false },
  // Mise
  { label: 'All proteins portioned', category: 'mise', checked: false },
  { label: 'Sauces prepped and labeled', category: 'mise', checked: false },
  { label: 'Garnishes prepped', category: 'mise', checked: false },
  { label: 'Allergen items separated', category: 'mise', checked: false },
  // Docs
  { label: 'Guest list printed', category: 'docs', checked: false },
  { label: 'Menu cards printed', category: 'docs', checked: false },
  { label: 'Dietary notes sheet', category: 'docs', checked: false },
]

/**
 * Get the day-of checklist for an event.
 */
export async function getDayOfChecklist(eventId: string): Promise<ChecklistItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('event_day_of_checklist')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.entityId)
    .order('sort_order', { ascending: true })

  return data || []
}

/**
 * Initialize the checklist with defaults for a farm dinner.
 */
export async function initializeFarmDinnerChecklist(eventId: string): Promise<{
  success: boolean
  count: number
  error?: string
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Check if checklist already exists
  const { data: existing } = await db
    .from('event_day_of_checklist')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.entityId)
    .limit(1)

  if (existing && existing.length > 0) {
    return { success: false, count: 0, error: 'Checklist already exists' }
  }

  const rows = DEFAULT_FARM_DINNER_CHECKLIST.map((item, idx) => ({
    event_id: eventId,
    tenant_id: user.entityId,
    label: item.label,
    category: item.category,
    checked: false,
    sort_order: idx,
  }))

  const { error } = await db.from('event_day_of_checklist').insert(rows)
  if (error) return { success: false, count: 0, error: 'Failed to create checklist' }

  revalidatePath(`/events/${eventId}`)
  return { success: true, count: rows.length }
}

/**
 * Toggle a checklist item.
 */
export async function toggleChecklistItem(input: {
  itemId: string
  eventId: string
  checked: boolean
}): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()

  await db
    .from('event_day_of_checklist')
    .update({ checked: input.checked })
    .eq('id', input.itemId)
    .eq('tenant_id', user.entityId)

  revalidatePath(`/events/${input.eventId}`)
  return { success: true }
}

/**
 * Add a custom checklist item.
 */
export async function addChecklistItem(input: {
  eventId: string
  label: string
  category?: ChecklistItem['category']
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: maxItem } = await db
    .from('event_day_of_checklist')
    .select('sort_order')
    .eq('event_id', input.eventId)
    .eq('tenant_id', user.entityId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await db.from('event_day_of_checklist').insert({
    event_id: input.eventId,
    tenant_id: user.entityId,
    label: input.label.trim(),
    category: input.category || 'other',
    checked: false,
    sort_order: (maxItem?.sort_order ?? -1) + 1,
  })

  if (error) return { success: false, error: 'Failed to add item' }

  revalidatePath(`/events/${input.eventId}`)
  return { success: true }
}

/**
 * Remove a checklist item.
 */
export async function removeChecklistItem(input: {
  itemId: string
  eventId: string
}): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()

  await db
    .from('event_day_of_checklist')
    .delete()
    .eq('id', input.itemId)
    .eq('tenant_id', user.entityId)

  revalidatePath(`/events/${input.eventId}`)
  return { success: true }
}
