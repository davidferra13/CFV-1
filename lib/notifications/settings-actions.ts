'use server'
// Notification Settings — Server Actions
// Reads and writes per-category channel preferences and SMS setup.
// All mutations are scoped to the authenticated chef's own user.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import type { NotificationCategory } from './types'

export type CategoryPreference = {
  category: NotificationCategory
  email_enabled: boolean | null   // null = inherit tier default
  push_enabled: boolean | null
  sms_enabled: boolean | null
}

export type SmsSettings = {
  sms_opt_in: boolean
  sms_notify_phone: string | null
}

/**
 * Get all category-level channel preferences for the current chef.
 * Returns one entry per category; missing rows are treated as null (inherit tier default).
 */
export async function getNotificationPreferences(): Promise<CategoryPreference[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('category, email_enabled, push_enabled, sms_enabled')
    .eq('auth_user_id', user.id)

  if (error) {
    console.error('[getNotificationPreferences] Query failed:', error)
    return []
  }

  return (data ?? []) as CategoryPreference[]
}

/**
 * Upsert a channel preference override for a single category.
 * Pass null for a channel to revert to tier default.
 */
export async function upsertCategoryPreference(
  category: NotificationCategory,
  channels: { email_enabled?: boolean | null; push_enabled?: boolean | null; sms_enabled?: boolean | null },
): Promise<{ error: string | null }> {
  const user = await requireChef()
  if (!user.tenantId) return { error: 'No tenant context' }
  const supabase = createServerClient()

  const { error } = await supabase
    .from('notification_preferences')
    .upsert(
      {
        tenant_id: user.tenantId,
        auth_user_id: user.id,
        category,
        ...channels,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'auth_user_id,category' },
    )

  if (error) {
    console.error('[upsertCategoryPreference] Upsert failed:', error)
    return { error: error.message }
  }
  return { error: null }
}

/**
 * Get the current SMS notification settings for the chef.
 */
export async function getSmsSettings(): Promise<SmsSettings> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data } = await supabase
    .from('chef_preferences')
    .select('sms_opt_in, sms_notify_phone')
    .eq('tenant_id', user.tenantId!)
    .single()

  return {
    sms_opt_in: data?.sms_opt_in ?? false,
    sms_notify_phone: data?.sms_notify_phone ?? null,
  }
}

/**
 * Update SMS notification settings.
 * Setting sms_opt_in = true sets sms_opt_in_at to now if not already set.
 * Setting sms_opt_in = false clears the opt-in timestamp.
 */
export async function updateSmsSettings(
  settings: SmsSettings,
): Promise<{ error: string | null }> {
  const user = await requireChef()
  if (!user.tenantId) return { error: 'No tenant context' }
  const supabase = createServerClient()

  const update: Record<string, unknown> = {
    sms_opt_in: settings.sms_opt_in,
    sms_notify_phone: settings.sms_notify_phone || null,
  }

  if (settings.sms_opt_in) {
    // Only set opt_in_at if opting in for the first time
    const { data: existing } = await supabase
      .from('chef_preferences')
      .select('sms_opt_in_at')
      .eq('tenant_id', user.tenantId)
      .single()

    if (!existing?.sms_opt_in_at) {
      update.sms_opt_in_at = new Date().toISOString()
    }
  } else {
    update.sms_opt_in_at = null
  }

  const { error } = await supabase
    .from('chef_preferences')
    .update(update)
    .eq('tenant_id', user.tenantId)

  if (error) {
    console.error('[updateSmsSettings] Update failed:', error)
    return { error: error.message }
  }
  return { error: null }
}
