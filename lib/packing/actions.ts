// Packing State Server Actions
// Handles the car_packed flag and packing_list_ready flag on events
// Interactive packing check-off is localStorage-only (no roundtrip per checkbox)
// Server state is only updated when the chef marks the car fully packed

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type PackingStatus = {
  carPacked: boolean
  carPackedAt: string | null
  packingListReady: boolean
}

/**
 * Mark the car as packed for this event.
 * Sets car_packed = true and packing_list_ready = true.
 */
export async function markCarPacked(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
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
  revalidatePath(`/events/${eventId}/pack`)
  revalidatePath('/dashboard')
  revalidatePath('/queue')
  revalidatePath('/briefing')
  return { success: true }
}

/**
 * Reset packing status — for corrections before departure.
 * Clears car_packed and car_packed_at so the chef can re-check.
 */
export async function resetPackingStatus(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
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
  revalidatePath(`/events/${eventId}/pack`)
  revalidatePath('/dashboard')
  revalidatePath('/queue')
  revalidatePath('/briefing')
  return { success: true }
}

/**
 * Get the current packing status for an event.
 */
export async function getPackingStatus(eventId: string): Promise<PackingStatus> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: event } = await supabase
    .from('events')
    .select('car_packed, car_packed_at, packing_list_ready')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

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
 * Fire-and-forget: the packing-list-client calls this in background while
 * localStorage provides instant feedback.
 */
export async function togglePackingConfirmation(
  eventId: string,
  itemKey: string,
  confirmed: boolean
): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  if (confirmed) {
    await supabase
      .from('packing_confirmations')
      .upsert(
        { event_id: eventId, tenant_id: user.tenantId!, item_key: itemKey },
        { onConflict: 'event_id,item_key' }
      )
  } else {
    await supabase
      .from('packing_confirmations')
      .delete()
      .eq('event_id', eventId)
      .eq('tenant_id', user.tenantId!)
      .eq('item_key', itemKey)
  }
}

/**
 * Get the count of confirmed items for an event.
 * Used for progress reporting on the event detail page.
 */
export async function getPackingConfirmationCount(eventId: string): Promise<number> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { count } = await supabase
    .from('packing_confirmations')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)

  return count ?? 0
}
