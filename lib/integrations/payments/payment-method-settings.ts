'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'

// Apple Pay / Google Pay toggle per chef.
// Stripe Checkout already supports these automatically - this toggle
// allows chefs to selectively disable payment methods they don't want.

export async function getPaymentMethodSettings() {
  await requirePro('integrations')
  const user = await requireChef()
  const db = createServerClient({ admin: true })

  const { data } = await db
    .from('chefs')
    .select('apple_pay_enabled, google_pay_enabled, ach_enabled')
    .eq('id', user.entityId)
    .single()

  return {
    applePayEnabled: data?.apple_pay_enabled ?? true,
    googlePayEnabled: data?.google_pay_enabled ?? true,
    achEnabled: (data as any)?.ach_enabled ?? false,
  }
}

export async function updatePaymentMethodSettings(input: {
  applePayEnabled?: boolean
  googlePayEnabled?: boolean
  achEnabled?: boolean
}) {
  await requirePro('integrations')
  const user = await requireChef()
  const db = createServerClient({ admin: true })

  const updates: Record<string, boolean> = {}
  if (input.applePayEnabled !== undefined) updates.apple_pay_enabled = input.applePayEnabled
  if (input.googlePayEnabled !== undefined) updates.google_pay_enabled = input.googlePayEnabled
  if (input.achEnabled !== undefined) updates.ach_enabled = input.achEnabled

  if (Object.keys(updates).length === 0) return { success: true }

  const { error } = await db.from('chefs').update(updates).eq('id', user.entityId)

  if (error) throw new Error(`Failed to update payment settings: ${error.message}`)

  return { success: true }
}
