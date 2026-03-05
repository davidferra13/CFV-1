// Notification Server Actions
// CRUD operations for notifications and preferences

'use server'

import { requireAuth } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Json } from '@/types/database'
import type { NotificationCategory, NotificationAction, Notification } from './types'
import { routeNotification } from './channel-router'
import { DEFAULT_TIER_MAP } from './tier-config'
import { FOUNDER_EMAIL } from '@/lib/platform/owner-account'

let founderRecipientCache: { recipientId: string | null; expiresAt: number } | null = null
const FOUNDER_CACHE_TTL_MS = 60_000

async function getFounderNotificationRecipientId(supabase: any): Promise<string | null> {
  const now = Date.now()
  if (founderRecipientCache && now < founderRecipientCache.expiresAt) {
    return founderRecipientCache.recipientId
  }

  const { data: founderChef } = await supabase
    .from('chefs')
    .select('id')
    .ilike('email', FOUNDER_EMAIL)
    .maybeSingle()

  if (!founderChef?.id) {
    founderRecipientCache = { recipientId: null, expiresAt: now + FOUNDER_CACHE_TTL_MS }
    return null
  }

  const { data: founderRole } = await supabase
    .from('user_roles')
    .select('auth_user_id')
    .eq('entity_id', founderChef.id)
    .eq('role', 'chef')
    .maybeSingle()

  const recipientId = founderRole?.auth_user_id ?? null
  founderRecipientCache = { recipientId, expiresAt: now + FOUNDER_CACHE_TTL_MS }
  return recipientId
}

// ─── Create ─────────────────────────────────────────────────────────────

/**
 * Create a notification. Called as a non-blocking side effect from other actions.
 * Uses admin client to bypass RLS (notifications may be created from webhooks
 * or system transitions where the actor is not the recipient).
 */
export async function createNotification({
  tenantId,
  recipientId,
  category,
  action,
  title,
  body,
  actionUrl,
  eventId,
  inquiryId,
  clientId,
  metadata = {},
}: {
  tenantId: string
  recipientId: string
  category: NotificationCategory
  action: NotificationAction
  title: string
  body?: string
  actionUrl?: string
  eventId?: string
  inquiryId?: string
  clientId?: string
  metadata?: Record<string, unknown>
}) {
  const supabase = createServerClient({ admin: true })
  const resolvedActionUrl = deriveNotificationActionUrl({
    action,
    actionUrl,
    eventId,
    inquiryId,
    clientId,
    metadata,
  })

  // Sanitize title and body — strip control characters (newlines, tabs, carriage returns)
  // to prevent misleading multi-line SMS/push notifications from user-controlled data
  // (e.g., crafted event names or client names).
  const sanitizedTitle = title
    .replace(/[\r\n\t]/g, ' ')
    .trim()
    .slice(0, 200)
  const sanitizedBody =
    body
      ?.replace(/[\r\n\t]/g, ' ')
      .trim()
      .slice(0, 500) ?? null

  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({
      tenant_id: tenantId,
      recipient_id: recipientId,
      category,
      action,
      title: sanitizedTitle,
      body: sanitizedBody,
      action_url: resolvedActionUrl,
      event_id: eventId ?? null,
      inquiry_id: inquiryId ?? null,
      client_id: clientId ?? null,
      metadata: metadata as unknown as Json,
    })
    .select('id')
    .single()

  if (error || !notification) {
    console.error('[createNotification] Insert failed:', error)
    throw new Error('Failed to create notification')
  }

  // Founder mirror feed (in-app only): copy notifications across tenants
  // so the owner account can monitor platform activity from one inbox.
  // Out-of-app channels (email/push/sms) are intentionally not mirrored here.
  try {
    const founderRecipientId = await getFounderNotificationRecipientId(supabase)
    if (founderRecipientId && founderRecipientId !== recipientId) {
      const mirrorMetadata = {
        ...metadata,
        _founder_mirror: true,
        _original_recipient_id: recipientId,
        _original_tenant_id: tenantId,
      }

      await supabase.from('notifications').insert({
        tenant_id: tenantId,
        recipient_id: founderRecipientId,
        category,
        action,
        title: sanitizedTitle,
        body: sanitizedBody,
        action_url: resolvedActionUrl,
        event_id: eventId ?? null,
        inquiry_id: inquiryId ?? null,
        client_id: clientId ?? null,
        metadata: mirrorMetadata as unknown as Json,
      })
    }
  } catch (mirrorErr) {
    console.error('[createNotification] Founder mirror failed (non-blocking):', mirrorErr)
  }

  // Fire out-of-app channels (email, push, SMS) as a non-blocking side effect.
  // routeNotification never throws — all errors are caught and logged internally.
  routeNotification({
    notificationId: notification.id,
    tenantId,
    recipientId,
    action,
    title: sanitizedTitle,
    body: sanitizedBody ?? undefined,
    actionUrl: resolvedActionUrl,
  }).catch((err) => {
    console.error('[createNotification] routeNotification fire failed:', err)
  })
}

function deriveNotificationActionUrl(input: {
  action: NotificationAction
  actionUrl?: string
  eventId?: string
  inquiryId?: string
  clientId?: string
  metadata?: Record<string, unknown>
}): string {
  if (input.actionUrl && input.actionUrl.trim().length > 0) return input.actionUrl

  const metadataQuoteId =
    typeof input.metadata?.quote_id === 'string'
      ? input.metadata.quote_id
      : typeof input.metadata?.quoteId === 'string'
        ? input.metadata.quoteId
        : null

  if (metadataQuoteId) return `/quotes/${metadataQuoteId}`
  if (input.eventId) return `/events/${input.eventId}`
  if (input.inquiryId) return `/inquiries/${input.inquiryId}`
  if (input.clientId) return `/clients/${input.clientId}`
  if (DEFAULT_TIER_MAP[input.action] === 'critical') return '/inbox'
  return '/dashboard'
}

// ─── Read ───────────────────────────────────────────────────────────────

/**
 * Get notifications for the current user. Non-archived, newest first.
 */
export async function getNotifications(limit = 20, offset = 0): Promise<Notification[]> {
  const user = await requireAuth()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', user.id)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[getNotifications] Query failed:', error)
    return []
  }

  return (data ?? []) as Notification[]
}

/**
 * Get unread notification count for the current user.
 */
export async function getUnreadCount(): Promise<number> {
  const user = await requireAuth()
  const supabase: any = createServerClient()

  const { data, error } = await supabase.rpc('get_unread_notification_count', {
    p_user_id: user.id,
  })

  if (error) {
    console.error('[getUnreadCount] RPC failed:', error)
    return 0
  }

  return data ?? 0
}

// ─── Update ─────────────────────────────────────────────────────────────

/**
 * Mark a single notification as read.
 */
export async function markAsRead(notificationId: string) {
  const user = await requireAuth()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('recipient_id', user.id)
    .is('read_at', null)

  if (error) {
    console.error('[markAsRead] Update failed:', error)
  }
}

/**
 * Mark all unread notifications as read for the current user.
 */
export async function markAllAsRead() {
  const user = await requireAuth()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', user.id)
    .is('read_at', null)
    .is('archived_at', null)

  if (error) {
    console.error('[markAllAsRead] Update failed:', error)
  }

  revalidatePath('/', 'layout')
}

/**
 * Archive a single notification (soft remove from list).
 */
export async function archiveNotification(notificationId: string) {
  const user = await requireAuth()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('notifications')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('recipient_id', user.id)

  if (error) {
    console.error('[archiveNotification] Update failed:', error)
  }
}

// ─── Preferences ────────────────────────────────────────────────────────

export type NotificationPreference = {
  category: string
  toast_enabled: boolean
}

export type NotificationRuntimeSettings = {
  quietHoursEnabled: boolean
  quietHoursStart: string | null
  quietHoursEnd: string | null
  digestEnabled: boolean
  digestIntervalMinutes: number
}

/**
 * Get notification preferences for the current user.
 * Missing rows = toast enabled by default.
 */
export async function getNotificationPreferences(): Promise<NotificationPreference[]> {
  const user = await requireAuth()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('category, toast_enabled')
    .eq('auth_user_id', user.id)

  if (error) {
    console.error('[getNotificationPreferences] Query failed:', error)
    return []
  }

  return data ?? []
}

export async function getNotificationRuntimeSettings(): Promise<NotificationRuntimeSettings> {
  const user = await requireAuth()
  if (!user.tenantId) {
    return {
      quietHoursEnabled: false,
      quietHoursStart: null,
      quietHoursEnd: null,
      digestEnabled: false,
      digestIntervalMinutes: 15,
    }
  }

  const supabase: any = createServerClient()
  const { data } = await supabase
    .from('chef_preferences')
    .select(
      'notification_quiet_hours_enabled, notification_quiet_hours_start, notification_quiet_hours_end, notification_digest_enabled, notification_digest_interval_minutes'
    )
    .eq('tenant_id', user.tenantId)
    .single()

  return {
    quietHoursEnabled: Boolean((data as any)?.notification_quiet_hours_enabled),
    quietHoursStart:
      typeof (data as any)?.notification_quiet_hours_start === 'string'
        ? ((data as any).notification_quiet_hours_start as string).slice(0, 5)
        : null,
    quietHoursEnd:
      typeof (data as any)?.notification_quiet_hours_end === 'string'
        ? ((data as any).notification_quiet_hours_end as string).slice(0, 5)
        : null,
    digestEnabled: Boolean((data as any)?.notification_digest_enabled),
    digestIntervalMinutes:
      typeof (data as any)?.notification_digest_interval_minutes === 'number'
        ? Math.min(120, Math.max(5, (data as any).notification_digest_interval_minutes))
        : 15,
  }
}

/**
 * Update a notification preference (upsert).
 */
export async function updateNotificationPreference(
  category: NotificationCategory,
  toastEnabled: boolean
) {
  const user = await requireAuth()
  const supabase: any = createServerClient()

  const { error } = await supabase.from('notification_preferences').upsert(
    {
      tenant_id: user.tenantId!,
      auth_user_id: user.id,
      category,
      toast_enabled: toastEnabled,
    },
    { onConflict: 'auth_user_id,category' }
  )

  if (error) {
    console.error('[updateNotificationPreference] Upsert failed:', error)
  }
}

// ─── Helpers for resolving chef recipient ────────────────────────────────

/**
 * Get the chef's email and business name for a given tenant.
 * Used when sending out-of-app emails in the multi-channel router.
 */
export async function getChefProfile(
  tenantId: string
): Promise<{ email: string; name: string } | null> {
  const supabase = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('chefs')
    .select('email, business_name')
    .eq('id', tenantId)
    .single()

  if (error || !data) {
    console.error('[getChefProfile] Lookup failed:', error)
    return null
  }

  return { email: data.email, name: data.business_name }
}

/**
 * Get the auth_user_id for a chef (tenant).
 * Used when creating notifications from webhooks where we only have tenant_id.
 */
export async function getChefAuthUserId(tenantId: string): Promise<string | null> {
  const supabase = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('user_roles')
    .select('auth_user_id')
    .eq('entity_id', tenantId)
    .eq('role', 'chef')
    .single()

  if (error || !data) {
    console.error('[getChefAuthUserId] Lookup failed:', error)
    return null
  }

  return data.auth_user_id
}
