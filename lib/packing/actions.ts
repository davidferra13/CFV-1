// Packing State Server Actions
// Handles the car_packed flag and packing_list_ready flag on events
// Interactive packing check-off uses optimistic local state plus persisted confirmations.
// Server state is only updated when the chef marks the car fully packed

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

export type PackingStatus = {
  carPacked: boolean
  carPackedAt: string | null
  packingListReady: boolean
}

function validatePackingInput(eventId: string, itemKey?: string): string | null {
  if (!eventId.trim()) return 'Event ID is required'
  if (itemKey !== undefined && !itemKey.trim()) return 'Item key is required'
  return null
}

/**
 * Mark the car as packed for this event.
 * Sets car_packed = true and packing_list_ready = true.
 */
export async function markCarPacked(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const validationError = validatePackingInput(eventId)
  if (validationError) return { success: false, error: validationError }

  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('events')
    .update({
      car_packed: true,
      car_packed_at: new Date().toISOString(),
      packing_list_ready: true,
    })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[packing/actions] markCarPacked error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

/**
 * Reset packing status - for corrections before departure.
 * Clears car_packed and car_packed_at so the chef can re-check.
 */
export async function resetPackingStatus(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const validationError = validatePackingInput(eventId)
  if (validationError) return { success: false, error: validationError }

  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('events')
    .update({
      car_packed: false,
      car_packed_at: null,
      packing_list_ready: false,
    })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[packing/actions] resetPackingStatus error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

/**
 * Get the current packing status for an event.
 */
export async function getPackingStatus(eventId: string): Promise<PackingStatus> {
  const validationError = validatePackingInput(eventId)
  if (validationError) {
    throw new Error(validationError)
  }

  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event, error } = await db
    .from('events')
    .select('car_packed, car_packed_at, packing_list_ready')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) {
    throw new Error(`Failed to load packing status: ${error.message}`)
  }

  return {
    carPacked: event?.car_packed ?? false,
    carPackedAt: event?.car_packed_at ?? null,
    packingListReady: event?.packing_list_ready ?? false,
  }
}

// ─── Per-item packing confirmations ───────────────────────────────────────────

/**
 * Toggle a single packing item confirmation.
 * Upsert on confirm, delete on un-confirm.
 */
export async function togglePackingConfirmation(
  eventId: string,
  itemKey: string,
  confirmed: boolean
): Promise<{ success: boolean; confirmed: boolean; error?: string }> {
  const validationError = validatePackingInput(eventId, itemKey)
  if (validationError) {
    return { success: false, confirmed: !confirmed, error: validationError }
  }

  const user = await requireChef()
  const db: any = createServerClient()

  if (confirmed) {
    const { error } = await db
      .from('packing_confirmations')
      .upsert(
        { event_id: eventId, tenant_id: user.tenantId!, item_key: itemKey },
        { onConflict: 'event_id,item_key' }
      )

    if (error) {
      console.error('[packing/actions] togglePackingConfirmation upsert error:', error)
      return { success: false, confirmed: false, error: error.message }
    }
  } else {
    const { error } = await db
      .from('packing_confirmations')
      .delete()
      .eq('event_id', eventId)
      .eq('tenant_id', user.tenantId!)
      .eq('item_key', itemKey)

    if (error) {
      console.error('[packing/actions] togglePackingConfirmation delete error:', error)
      return { success: false, confirmed: true, error: error.message }
    }
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true, confirmed }
}

/**
 * Get the count of confirmed items for an event.
 * Used for progress reporting on the event detail page.
 */
export async function getPackingConfirmationCount(eventId: string): Promise<number> {
  const validationError = validatePackingInput(eventId)
  if (validationError) {
    throw new Error(validationError)
  }

  const user = await requireChef()
  const db: any = createServerClient()

  const { count, error } = await db
    .from('packing_confirmations')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    throw new Error(`Failed to load packing confirmation count: ${error.message}`)
  }

  return count ?? 0
}
