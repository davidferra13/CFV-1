'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/require-chef'

// Apple Pay / Google Pay toggle per chef.
// Stripe Checkout already supports these automatically — this toggle
// allows chefs to selectively disable payment methods they don't want.

export async function getPaymentMethodSettings() {
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })

  const { data } = await supabase
    .from('chefs')
    .select('apple_pay_enabled, google_pay_enabled')
    .eq('id', user.entityId)
    .single()

  return {
    applePayEnabled: data?.apple_pay_enabled ?? true,
    googlePayEnabled: data?.google_pay_enabled ?? true,
  }
}

export async function updatePaymentMethodSettings(input: {
  applePayEnabled?: boolean
  googlePayEnabled?: boolean
}) {
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })

  const updates: Record<string, boolean> = {}
  if (input.applePayEnabled !== undefined) updates.apple_pay_enabled = input.applePayEnabled
  if (input.googlePayEnabled !== undefined) updates.google_pay_enabled = input.googlePayEnabled

  if (Object.keys(updates).length === 0) return { success: true }

  const { error } = await supabase.from('chefs').update(updates).eq('id', user.entityId)

  if (error) throw new Error(`Failed to update payment settings: ${error.message}`)

  return { success: true }
}
