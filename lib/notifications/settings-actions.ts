'use server'
// Notification Settings - Server Actions
// Reads and writes per-category channel preferences and SMS setup.
// All mutations are scoped to the authenticated chef's own user.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type {
  CategoryPreference,
  NotificationExperienceSettings,
  SmsSettings,
} from './settings-types'
import type { NotificationCategory } from './types'

const VALID_NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  'inquiry',
  'quote',
  'event',
  'payment',
  'chat',
  'client',
  'loyalty',
  'goals',
  'lead',
  'protection',
  'wellbeing',
  'review',
  'ops',
  'system',
]

type CategoryPreferenceBatchInput = {
  category: NotificationCategory
  email_enabled: boolean | null
  push_enabled: boolean | null
  sms_enabled: boolean | null
}

const E164_PHONE_PATTERN = /^\+[1-9]\d{1,14}$/

function isValidE164Phone(phone: string): boolean {
  return E164_PHONE_PATTERN.test(phone)
}

/**
 * Get all category-level channel preferences for the current chef.
 * Returns one entry per category; missing rows are treated as null (inherit tier default).
 */
export async function getNotificationPreferences(): Promise<CategoryPreference[]> {
  const user = await requireChef()
  if (!user.tenantId) throw new Error('No tenant context')
  const db: any = createServerClient()

  const { data, error } = await db
    .from('notification_preferences')
    .select('category, email_enabled, push_enabled, sms_enabled')
    .eq('tenant_id', user.tenantId)
    .eq('auth_user_id', user.id)

  if (error) {
    console.error('[getNotificationPreferences] Query failed:', error)
    throw new Error('Failed to load notification preferences')
  }

  return (data ?? []) as CategoryPreference[]
}

/**
 * Upsert a channel preference override for a single category.
 * Pass null for a channel to revert to tier default.
 */
export async function upsertCategoryPreference(
  category: NotificationCategory,
  channels: {
    email_enabled?: boolean | null
    push_enabled?: boolean | null
    sms_enabled?: boolean | null
  }
): Promise<{ error: string | null }> {
  const user = await requireChef()
  if (!user.tenantId) return { error: 'No tenant context' }
  const db: any = createServerClient()

  const { error } = await db.from('notification_preferences').upsert(
    {
      tenant_id: user.tenantId,
      auth_user_id: user.id,
      category,
      ...channels,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'auth_user_id,category' }
  )

  if (error) {
    console.error('[upsertCategoryPreference] Upsert failed:', error)
    return { error: error.message }
  }

  revalidatePath('/settings/notifications')
  return { error: null }
}

/**
 * Upsert complete channel preference rows for multiple categories in one request.
 * Missing rows are created for the authenticated chef only.
 */
export async function upsertCategoryPreferencesBatch(
  preferences: unknown
): Promise<{ error: string | null }> {
  const user = await requireChef()
  if (!user.tenantId) return { error: 'No tenant context' }

  const parsed = parseCategoryPreferenceBatch(preferences)
  if ('error' in parsed) return { error: parsed.error }

  const db: any = createServerClient()
  const updatedAt = new Date().toISOString()
  const rows = parsed.preferences.map((preference) => ({
    tenant_id: user.tenantId,
    auth_user_id: user.id,
    category: preference.category,
    email_enabled: preference.email_enabled,
    push_enabled: preference.push_enabled,
    sms_enabled: preference.sms_enabled,
    updated_at: updatedAt,
  }))

  const { error } = await db
    .from('notification_preferences')
    .upsert(rows, { onConflict: 'auth_user_id,category' })

  if (error) {
    console.error('[upsertCategoryPreferencesBatch] Upsert failed:', error)
    return { error: 'Failed to save notification preferences' }
  }

  revalidatePath('/settings/notifications')
  return { error: null }
}

function parseCategoryPreferenceBatch(
  preferences: unknown
): { preferences: CategoryPreferenceBatchInput[] } | { error: string } {
  if (!Array.isArray(preferences)) {
    return { error: 'Invalid notification preference changes' }
  }

  if (preferences.length === 0) {
    return { error: 'No notification preference changes to save' }
  }

  if (preferences.length > VALID_NOTIFICATION_CATEGORIES.length) {
    return { error: 'Too many notification preference changes' }
  }

  const seen = new Set<NotificationCategory>()
  const parsed: CategoryPreferenceBatchInput[] = []

  for (const preference of preferences) {
    if (!preference || typeof preference !== 'object' || Array.isArray(preference)) {
      return { error: 'Invalid notification preference change' }
    }

    const candidate = preference as Record<string, unknown>
    const category = candidate.category

    if (
      typeof category !== 'string' ||
      !VALID_NOTIFICATION_CATEGORIES.includes(category as NotificationCategory)
    ) {
      return { error: 'Invalid notification category' }
    }

    const typedCategory = category as NotificationCategory
    if (seen.has(typedCategory)) {
      return { error: 'Duplicate notification category changes' }
    }

    for (const channel of ['email_enabled', 'push_enabled', 'sms_enabled']) {
      if (!(channel in candidate)) {
        return { error: 'Missing notification channel setting' }
      }

      const value = candidate[channel]
      if (value !== null && typeof value !== 'boolean') {
        return { error: 'Invalid notification channel setting' }
      }
    }

    seen.add(typedCategory)
    parsed.push({
      category: typedCategory,
      email_enabled: candidate.email_enabled as boolean | null,
      push_enabled: candidate.push_enabled as boolean | null,
      sms_enabled: candidate.sms_enabled as boolean | null,
    })
  }

  return { preferences: parsed }
}

/**
 * Get the current SMS notification settings for the chef.
 */
export async function getSmsSettings(): Promise<SmsSettings> {
  const user = await requireChef()
  if (!user.tenantId) throw new Error('No tenant context')
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_preferences')
    .select('sms_opt_in, sms_notify_phone')
    .eq('tenant_id', user.tenantId)
    .maybeSingle()

  if (error) {
    console.error('[getSmsSettings] Query failed:', error)
    throw new Error('Failed to load SMS settings')
  }

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
export async function updateSmsSettings(settings: SmsSettings): Promise<{ error: string | null }> {
  const user = await requireChef()
  if (!user.tenantId) return { error: 'No tenant context' }
  const db: any = createServerClient()
  const smsOptIn = Boolean(settings.sms_opt_in)
  const smsNotifyPhone =
    typeof settings.sms_notify_phone === 'string' && settings.sms_notify_phone.trim()
      ? settings.sms_notify_phone.trim()
      : null

  if (smsOptIn && (!smsNotifyPhone || !isValidE164Phone(smsNotifyPhone))) {
    return { error: 'Enter a valid E.164 phone number before enabling SMS alerts' }
  }

  const update: Record<string, unknown> = {
    sms_opt_in: smsOptIn,
    sms_notify_phone: smsNotifyPhone,
  }

  if (smsOptIn) {
    const { data: existing, error: existingError } = await db
      .from('chef_preferences')
      .select('sms_opt_in_at')
      .eq('tenant_id', user.tenantId)
      .maybeSingle()

    if (existingError) {
      console.error('[updateSmsSettings] Existing opt-in lookup failed:', existingError)
      return { error: 'Failed to save SMS settings' }
    }

    if (!existing?.sms_opt_in_at) {
      update.sms_opt_in_at = new Date().toISOString()
    }
  } else {
    update.sms_opt_in_at = null
  }

  const { error } = await db.from('chef_preferences').update(update).eq('tenant_id', user.tenantId)

  if (error) {
    console.error('[updateSmsSettings] Update failed:', error)
    return { error: error.message }
  }

  revalidatePath('/settings/notifications')
  return { error: null }
}

export async function getNotificationExperienceSettings(): Promise<NotificationExperienceSettings> {
  const user = await requireChef()
  if (!user.tenantId) throw new Error('No tenant context')
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_preferences')
    .select(
      'notification_quiet_hours_enabled, notification_quiet_hours_start, notification_quiet_hours_end, notification_digest_enabled, notification_digest_interval_minutes'
    )
    .eq('tenant_id', user.tenantId)
    .maybeSingle()

  if (error) {
    console.error('[getNotificationExperienceSettings] Query failed:', error)
    throw new Error('Failed to load notification timing settings')
  }

  return {
    quiet_hours_enabled: Boolean((data as any)?.notification_quiet_hours_enabled),
    quiet_hours_start:
      typeof (data as any)?.notification_quiet_hours_start === 'string'
        ? ((data as any).notification_quiet_hours_start as string).slice(0, 5)
        : null,
    quiet_hours_end:
      typeof (data as any)?.notification_quiet_hours_end === 'string'
        ? ((data as any).notification_quiet_hours_end as string).slice(0, 5)
        : null,
    digest_enabled: Boolean((data as any)?.notification_digest_enabled),
    digest_interval_minutes:
      typeof (data as any)?.notification_digest_interval_minutes === 'number'
        ? Math.min(120, Math.max(5, (data as any).notification_digest_interval_minutes))
        : 15,
  }
}

export async function updateNotificationExperienceSettings(
  settings: NotificationExperienceSettings
): Promise<{ error: string | null }> {
  const user = await requireChef()
  if (!user.tenantId) return { error: 'No tenant context' }
  const db: any = createServerClient()

  const quietHoursEnabled = Boolean(settings.quiet_hours_enabled)
  const digestInterval = Math.min(120, Math.max(5, Number(settings.digest_interval_minutes || 15)))

  const { error } = await db
    .from('chef_preferences')
    .update({
      notification_quiet_hours_enabled: quietHoursEnabled,
      notification_quiet_hours_start:
        quietHoursEnabled && settings.quiet_hours_start ? settings.quiet_hours_start : null,
      notification_quiet_hours_end:
        quietHoursEnabled && settings.quiet_hours_end ? settings.quiet_hours_end : null,
      notification_digest_enabled: Boolean(settings.digest_enabled),
      notification_digest_interval_minutes: digestInterval,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('tenant_id', user.tenantId)

  if (error) {
    console.error('[updateNotificationExperienceSettings] Update failed:', error)
    return { error: error.message }
  }

  revalidatePath('/settings/notifications')
  return { error: null }
}
