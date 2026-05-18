// Leftover Tracking Actions
// Manages event_leftovers records for packaging, labeling, and distribution.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type { EventLeftover, LeftoverInput } from './departure-types'

/**
 * Get all leftovers for an event.
 */
export async function getLeftovers(
  eventId: string
): Promise<{ success: boolean; data: EventLeftover[]; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_leftovers')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.entityId)
    .order('created_at', { ascending: true })

  if (error) return { success: false, data: [], error: 'Failed to load leftovers' }
  return { success: true, data: data || [] }
}

/**
 * Add a leftover record.
 */
export async function addLeftover(
  eventId: string,
  input: LeftoverInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!input.item_description?.trim()) {
    return { success: false, error: 'Item description is required' }
  }

  const { error } = await db.from('event_leftovers').insert({
    event_id: eventId,
    tenant_id: user.entityId,
    item_description: input.item_description.trim(),
    quantity: input.quantity?.trim() || null,
    packaging_type: input.packaging_type || null,
    labeled: input.labeled ?? false,
    label_text: input.label_text?.trim() || null,
    given_to: input.given_to?.trim() || null,
    storage_instructions: input.storage_instructions?.trim() || null,
  })

  if (error) return { success: false, error: 'Failed to add leftover' }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

/**
 * Update an existing leftover record.
 */
export async function updateLeftover(
  id: string,
  eventId: string,
  input: Partial<LeftoverInput>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const updates: Record<string, any> = {}
  if (input.item_description !== undefined) updates.item_description = input.item_description.trim()
  if (input.quantity !== undefined) updates.quantity = input.quantity?.trim() || null
  if (input.packaging_type !== undefined) updates.packaging_type = input.packaging_type || null
  if (input.labeled !== undefined) updates.labeled = input.labeled
  if (input.label_text !== undefined) updates.label_text = input.label_text?.trim() || null
  if (input.given_to !== undefined) updates.given_to = input.given_to?.trim() || null
  if (input.storage_instructions !== undefined)
    updates.storage_instructions = input.storage_instructions?.trim() || null

  if (Object.keys(updates).length === 0) return { success: true }

  const { error } = await db
    .from('event_leftovers')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', user.entityId)

  if (error) return { success: false, error: 'Failed to update leftover' }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

/**
 * Remove a leftover record.
 */
export async function removeLeftover(
  id: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('event_leftovers')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.entityId)

  if (error) return { success: false, error: 'Failed to remove leftover' }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

/**
 * Mark a leftover as labeled with the given text.
 */
export async function markLeftoverLabeled(
  id: string,
  eventId: string,
  labelText: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('event_leftovers')
    .update({ labeled: true, label_text: labelText.trim() || null })
    .eq('id', id)
    .eq('tenant_id', user.entityId)

  if (error) return { success: false, error: 'Failed to mark leftover labeled' }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}
