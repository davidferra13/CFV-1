// Notification Server Actions
// CRUD operations for notifications and preferences

'use server'

import { requireAuth } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Json } from '@/types/database'
import type { NotificationCategory, NotificationAction, Notification } from './types'

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

  const { error } = await supabase.from('notifications').insert({
    tenant_id: tenantId,
    recipient_id: recipientId,
    category,
    action,
    title,
    body: body ?? null,
    action_url: actionUrl ?? null,
    event_id: eventId ?? null,
    inquiry_id: inquiryId ?? null,
    client_id: clientId ?? null,
    metadata: metadata as unknown as Json,
  })

  if (error) {
    console.error('[createNotification] Insert failed:', error)
    throw new Error('Failed to create notification')
  }
}

// ─── Read ───────────────────────────────────────────────────────────────

/**
 * Get notifications for the current user. Non-archived, newest first.
 */
export async function getNotifications(limit = 20, offset = 0): Promise<Notification[]> {
  const user = await requireAuth()
  const supabase = createServerClient()

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
  const supabase = createServerClient()

  const { data, error } = await supabase
    .rpc('get_unread_notification_count', { p_user_id: user.id })

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
  const supabase = createServerClient()

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
  const supabase = createServerClient()

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
  const supabase = createServerClient()

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

/**
 * Get notification preferences for the current user.
 * Missing rows = toast enabled by default.
 */
export async function getNotificationPreferences(): Promise<NotificationPreference[]> {
  const user = await requireAuth()
  const supabase = createServerClient()

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

/**
 * Update a notification preference (upsert).
 */
export async function updateNotificationPreference(
  category: NotificationCategory,
  toastEnabled: boolean,
) {
  const user = await requireAuth()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('notification_preferences')
    .upsert(
      {
        tenant_id: user.tenantId!,
        auth_user_id: user.id,
        category,
        toast_enabled: toastEnabled,
      },
      { onConflict: 'auth_user_id,category' },
    )

  if (error) {
    console.error('[updateNotificationPreference] Upsert failed:', error)
  }
}

// ─── Helper for resolving chef recipient ────────────────────────────────

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
