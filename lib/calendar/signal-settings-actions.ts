// Availability Signal Settings — Server Actions
// Manages chef opt-in to show target_booking signals on their public profile,
// and client opt-out from receiving signal notifications.

'use server'

import { requireChef, requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ──────────────────────────────────────────────
// CHEF: toggle public availability signal display
// ──────────────────────────────────────────────

export async function getAvailabilitySignalSetting(): Promise<boolean> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data } = await (supabase as any)
    .from('chefs')
    .select('show_availability_signals')
    .eq('id', user.tenantId!)
    .single()

  return data?.show_availability_signals ?? false
}

export async function setAvailabilitySignalSetting(enabled: boolean) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await (supabase as any)
    .from('chefs')
    .update({ show_availability_signals: enabled })
    .eq('id', user.tenantId!)

  if (error) {
    console.error('[setAvailabilitySignalSetting] Error:', error)
    throw new Error('Failed to update availability signal setting')
  }

  revalidatePath('/settings')
  revalidatePath('/calendar')
}

// ──────────────────────────────────────────────
// CLIENT: opt-in/out of signal notifications
// ──────────────────────────────────────────────

export async function getClientSignalNotificationPref(): Promise<boolean> {
  const user = await requireClient()
  const supabase = createServerClient()

  const { data } = await (supabase as any)
    .from('clients')
    .select('availability_signal_notifications')
    .eq('id', user.entityId)
    .single()

  return data?.availability_signal_notifications ?? true
}

export async function setClientSignalNotificationPref(enabled: boolean) {
  const user = await requireClient()
  const supabase = createServerClient()

  const { error } = await (supabase as any)
    .from('clients')
    .update({ availability_signal_notifications: enabled })
    .eq('id', user.entityId)

  if (error) {
    console.error('[setClientSignalNotificationPref] Error:', error)
    throw new Error('Failed to update notification preference')
  }

  revalidatePath('/my-profile')
}
