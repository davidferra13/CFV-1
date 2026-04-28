// Tenant-explicit notification helpers for API v2 routes.
// These functions accept tenantId directly instead of calling requireChef(),
// making them safe for API-key contexts where no browser session exists.
//
// Portal server actions (settings-actions.ts, tier-actions.ts) should delegate
// to these helpers after calling requireChef().

import { createServerClient } from '@/lib/db/server'
import { DEFAULT_TIER_MAP, type NotificationTier } from './tier-config'
import { NOTIFICATION_CONFIG, type NotificationAction, type NotificationCategory } from './types'
import type {
  CategoryPreference,
  SmsSettings,
  NotificationExperienceSettings,
} from './settings-types'
import type { TierMapEntry } from './tier-actions'

// ── Identity resolution ────────────────────────────────────────────────────

/**
 * Resolve the auth_user_id for a chef tenant.
 * This is the correct value for notifications.recipient_id (FK to users.id).
 */
export async function resolveChefAuthUserId(tenantId: string): Promise<string> {
  const db: any = createServerClient({ admin: true })
  const { data: chef } = await db.from('chefs').select('auth_user_id').eq('id', tenantId).single()

  if (!chef) throw new Error(`Chef not found for tenant ${tenantId}`)
  return chef.auth_user_id
}

/**
 * Resolve a client's auth_user_id for notification delivery.
 * Returns null if the client has no portal account (auth_user_id is nullable).
 */
export async function resolveClientAuthUserId(
  tenantId: string,
  clientId: string
): Promise<string | null> {
  const db: any = createServerClient({ admin: true })
  const { data: client } = await db
    .from('clients')
    .select('auth_user_id')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (!client) return null
  return client.auth_user_id
}

// ── Notification CRUD ──────────────────────────────────────────────────────

export type CreateNotificationInput = {
  recipientRole: 'chef' | 'client'
  clientId?: string
  title: string
  body: string
  category: string
  action?: string
  actionUrl?: string
  eventId?: string
  metadata?: Record<string, unknown>
}

/**
 * Create a notification with correct recipient_id resolution.
 * - Chef notifications: recipient_id = chefs.auth_user_id
 * - Client notifications: recipient_id = clients.auth_user_id (must be non-null)
 */
export async function createNotificationForTenant(
  tenantId: string,
  input: CreateNotificationInput
): Promise<{ data: any; error: string | null }> {
  const db: any = createServerClient({ admin: true })

  let recipientId: string

  if (input.recipientRole === 'client' && input.clientId) {
    const clientAuthUserId = await resolveClientAuthUserId(tenantId, input.clientId)
    if (!clientAuthUserId) {
      return { data: null, error: 'recipient_unavailable' }
    }
    recipientId = clientAuthUserId
  } else {
    recipientId = await resolveChefAuthUserId(tenantId)
  }

  // Validate tenant-owned foreign keys
  if (input.clientId) {
    const { data: clientCheck } = await db
      .from('clients')
      .select('id')
      .eq('id', input.clientId)
      .eq('tenant_id', tenantId)
      .single()
    if (!clientCheck) return { data: null, error: 'client_not_found' }
  }

  if (input.eventId) {
    const { data: eventCheck } = await db
      .from('events')
      .select('id')
      .eq('id', input.eventId)
      .eq('tenant_id', tenantId)
      .single()
    if (!eventCheck) return { data: null, error: 'event_not_found' }
  }

  const insertPayload: Record<string, unknown> = {
    tenant_id: tenantId,
    recipient_id: recipientId,
    recipient_role: input.recipientRole,
    title: input.title,
    body: input.body,
    category: input.category,
  }

  if (input.clientId) insertPayload.client_id = input.clientId
  if (input.eventId) insertPayload.event_id = input.eventId
  if (input.action) insertPayload.action = input.action
  if (input.actionUrl) insertPayload.action_url = input.actionUrl
  if (input.metadata) insertPayload.metadata = input.metadata

  const { data, error } = await db.from('notifications').insert(insertPayload).select().single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

/**
 * Mark a notification as read, scoped to the tenant owner's auth user.
 */
export async function markNotificationReadForTenant(
  tenantId: string,
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  const db: any = createServerClient({ admin: true })
  const authUserId = await resolveChefAuthUserId(tenantId)

  const { data: notification } = await db
    .from('notifications')
    .select('id')
    .eq('id', notificationId)
    .eq('recipient_id', authUserId)
    .single()

  if (!notification) return { success: false, error: 'not_found' }

  const { error } = await db
    .from('notifications')
    .update({ read_at: new Date().toISOString() } as any)
    .eq('id', notificationId)
    .eq('recipient_id', authUserId)
    .is('read_at', null)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ── Preferences ────────────────────────────────────────────────────────────

export async function getPreferencesForTenant(authUserId: string): Promise<CategoryPreference[]> {
  const db: any = createServerClient({ admin: true })

  const { data, error } = await db
    .from('notification_preferences')
    .select('category, email_enabled, push_enabled, sms_enabled')
    .eq('auth_user_id', authUserId)

  if (error) {
    console.error('[store.getPreferencesForTenant] Query failed:', error)
    return []
  }

  return (data ?? []) as CategoryPreference[]
}

export async function upsertPreferenceForTenant(
  tenantId: string,
  authUserId: string,
  category: NotificationCategory,
  channels: {
    email_enabled?: boolean | null
    push_enabled?: boolean | null
    sms_enabled?: boolean | null
  }
): Promise<{ error: string | null }> {
  const db: any = createServerClient({ admin: true })

  const { error } = await db.from('notification_preferences').upsert(
    {
      tenant_id: tenantId,
      auth_user_id: authUserId,
      category,
      ...channels,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'auth_user_id,category' }
  )

  if (error) return { error: error.message }
  return { error: null }
}

// ── SMS Settings ───────────────────────────────────────────────────────────

export async function getSmsSettingsForTenant(tenantId: string): Promise<SmsSettings> {
  const db: any = createServerClient({ admin: true })

  const { data } = await db
    .from('chef_preferences')
    .select('sms_opt_in, sms_notify_phone')
    .eq('tenant_id', tenantId)
    .single()

  return {
    sms_opt_in: data?.sms_opt_in ?? false,
    sms_notify_phone: data?.sms_notify_phone ?? null,
  }
}

export async function updateSmsSettingsForTenant(
  tenantId: string,
  settings: SmsSettings
): Promise<{ error: string | null }> {
  const db: any = createServerClient({ admin: true })

  const update: Record<string, unknown> = {
    sms_opt_in: settings.sms_opt_in,
    sms_notify_phone: settings.sms_notify_phone || null,
  }

  if (settings.sms_opt_in) {
    const { data: existing } = await db
      .from('chef_preferences')
      .select('sms_opt_in_at')
      .eq('tenant_id', tenantId)
      .single()

    if (!existing?.sms_opt_in_at) {
      update.sms_opt_in_at = new Date().toISOString()
    }
  } else {
    update.sms_opt_in_at = null
  }

  const { error } = await db.from('chef_preferences').update(update).eq('tenant_id', tenantId)
  if (error) return { error: error.message }
  return { error: null }
}

// ── Experience Settings ────────────────────────────────────────────────────

export async function getExperienceSettingsForTenant(
  tenantId: string
): Promise<NotificationExperienceSettings> {
  const db: any = createServerClient({ admin: true })

  const { data } = await db
    .from('chef_preferences')
    .select(
      'notification_quiet_hours_enabled, notification_quiet_hours_start, notification_quiet_hours_end, notification_digest_enabled, notification_digest_interval_minutes'
    )
    .eq('tenant_id', tenantId)
    .single()

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

export async function updateExperienceSettingsForTenant(
  tenantId: string,
  settings: NotificationExperienceSettings
): Promise<{ error: string | null }> {
  const db: any = createServerClient({ admin: true })

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
    .eq('tenant_id', tenantId)

  if (error) return { error: error.message }
  return { error: null }
}

// ── Tier Overrides ─────────────────────────────────────────────────────────

export function buildDefaultTierEntries(): TierMapEntry[] {
  return (Object.entries(DEFAULT_TIER_MAP) as [NotificationAction, NotificationTier][]).map(
    ([action, defaultTier]) => ({
      action,
      category: NOTIFICATION_CONFIG[action].category,
      currentTier: defaultTier,
      defaultTier,
      isOverridden: false,
    })
  )
}

export async function getTierMapForTenant(tenantId: string): Promise<TierMapEntry[]> {
  const db: any = createServerClient({ admin: true })

  const { data: overrides, error } = await db
    .from('chef_notification_tier_overrides' as any)
    .select('action, tier')
    .eq('chef_id', tenantId)

  if (error) {
    console.error('[store.getTierMapForTenant] Query failed:', error)
    return buildDefaultTierEntries()
  }

  const overrideMap = new Map<string, NotificationTier>()
  for (const row of overrides ?? []) {
    overrideMap.set(row.action, row.tier as NotificationTier)
  }

  const entries: TierMapEntry[] = []
  for (const [action, defaultTier] of Object.entries(DEFAULT_TIER_MAP) as [
    NotificationAction,
    NotificationTier,
  ][]) {
    const override = overrideMap.get(action)
    entries.push({
      action,
      category: NOTIFICATION_CONFIG[action].category,
      currentTier: override ?? defaultTier,
      defaultTier,
      isOverridden: override !== undefined && override !== defaultTier,
    })
  }

  return entries
}

export async function updateTierForTenant(
  tenantId: string,
  action: string,
  tier: 'critical' | 'alert' | 'info'
): Promise<{ error: string | null }> {
  if (!(action in DEFAULT_TIER_MAP)) {
    return { error: `Unknown notification action: ${action}` }
  }

  const validTiers = ['critical', 'alert', 'info']
  if (!validTiers.includes(tier)) {
    return { error: `Invalid tier: ${tier}` }
  }

  const defaultTier = DEFAULT_TIER_MAP[action as NotificationAction]

  if (tier === defaultTier) {
    return resetTierForTenant(tenantId, action)
  }

  const db: any = createServerClient({ admin: true })

  const { error } = await db.from('chef_notification_tier_overrides' as any).upsert(
    {
      chef_id: tenantId,
      action,
      tier,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'chef_id,action' }
  )

  if (error) return { error: error.message }
  return { error: null }
}

export async function resetTierForTenant(
  tenantId: string,
  action: string
): Promise<{ error: string | null }> {
  const db: any = createServerClient({ admin: true })

  const { error } = await db
    .from('chef_notification_tier_overrides' as any)
    .delete()
    .eq('chef_id', tenantId)
    .eq('action', action)

  if (error) return { error: error.message }
  return { error: null }
}

export async function resetAllTiersForTenant(tenantId: string): Promise<{ error: string | null }> {
  const db: any = createServerClient({ admin: true })

  const { error } = await db
    .from('chef_notification_tier_overrides' as any)
    .delete()
    .eq('chef_id', tenantId)

  if (error) return { error: error.message }
  return { error: null }
}
