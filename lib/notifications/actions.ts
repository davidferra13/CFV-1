// Notification Server Actions
// CRUD operations for notifications and preferences

'use server'

import { requireAuth } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type { Json } from '@/types/database'
import type { NotificationCategory, NotificationAction, Notification } from './types'
import { routeNotification } from './channel-router'
import { DEFAULT_TIER_MAP } from './tier-config'
import { resolveOwnerAuthUserId } from '@/lib/platform/owner-account'
import { broadcastInsert } from '@/lib/realtime/broadcast'
import {
  buildInterruptionAuditMetadata,
  type EventDayFocusContext,
  type InterruptionAuditMetadata,
} from './interruption-policy'

let founderRecipientCache: { recipientId: string | null; expiresAt: number } | null = null
const FOUNDER_CACHE_TTL_MS = 60_000
const NON_MIRRORED_NOTIFICATION_ACTIONS = new Set<NotificationAction>(['account_access_alert'])
const EVENT_DAY_FOCUS_STATUSES = ['accepted', 'paid', 'confirmed', 'in_progress'] as const

async function getFounderNotificationRecipientId(db: any): Promise<string | null> {
  const now = Date.now()
  if (founderRecipientCache && now < founderRecipientCache.expiresAt) {
    return founderRecipientCache.recipientId
  }

  const recipientId = await resolveOwnerAuthUserId(db)
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
  const db = createServerClient({ admin: true })
  const resolvedActionUrl = deriveNotificationActionUrl({
    action,
    actionUrl,
    eventId,
    inquiryId,
    clientId,
    metadata,
  })

  // Sanitize title and body - strip control characters (newlines, tabs, carriage returns)
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
  const hapticAudit = buildInterruptionAuditMetadata({
    action,
    category,
    metadata,
    eventId: eventId ?? null,
    inquiryId: inquiryId ?? null,
    clientId: clientId ?? null,
    actionUrl: resolvedActionUrl,
  })
  const enrichedMetadata = withHapticAudit(metadata, hapticAudit)

  // Dedup guard: skip if an identical notification was created in the last 60 seconds.
  // Prevents double-click, retry storms, and concurrent side effects from spamming.
  {
    const { data: recent } = await db
      .from('notifications')
      .select('id')
      .eq('recipient_id', recipientId)
      .eq('action', action)
      .eq('event_id', eventId ?? null)
      .eq('inquiry_id', inquiryId ?? null)
      .gte('created_at', new Date(Date.now() - 60_000).toISOString())
      .limit(1)

    if (recent && recent.length > 0) {
      return recent[0] as any
    }
  }

  const { data: notification, error } = await db
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
      metadata: enrichedMetadata as unknown as Json,
    })
    .select('*')
    .single()

  if (error || !notification) {
    console.error('[createNotification] Insert failed:', error)
    // I3 fix: return null instead of throwing. This function is called as a
    // non-blocking side effect; throwing crashes the parent operation (webhooks, transitions).
    return null as any
  }

  broadcastInsert('notifications', recipientId, notification)

  // Founder mirror feed (in-app only): copy notifications across tenants
  // so the owner account can monitor platform activity from one inbox.
  // Out-of-app channels (email/push/sms) are intentionally not mirrored here.
  try {
    const founderRecipientId = await getFounderNotificationRecipientId(db)
    if (
      founderRecipientId &&
      founderRecipientId !== recipientId &&
      !NON_MIRRORED_NOTIFICATION_ACTIONS.has(action)
    ) {
      const mirrorMetadata = {
        ...enrichedMetadata,
        _founder_mirror: true,
        _original_recipient_id: recipientId,
        _original_tenant_id: tenantId,
      }

      const { data: mirroredNotification } = await db
        .from('notifications')
        .insert({
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
        .select('*')
        .single()

      if (mirroredNotification) {
        broadcastInsert('notifications', founderRecipientId, mirroredNotification)
      }
    }
  } catch (mirrorErr) {
    console.error('[createNotification] Founder mirror failed (non-blocking):', mirrorErr)
  }

  // Fire out-of-app channels (email, push, SMS) as a non-blocking side effect.
  // routeNotification never throws - all errors are caught and logged internally.
  routeNotification({
    notificationId: notification.id,
    tenantId,
    recipientId,
    action,
    title: sanitizedTitle,
    body: sanitizedBody ?? undefined,
    actionUrl: resolvedActionUrl,
    eventId: eventId ?? null,
    inquiryId: inquiryId ?? null,
    clientId: clientId ?? null,
    metadata: enrichedMetadata,
  }).catch((err) => {
    console.error('[createNotification] routeNotification fire failed:', err)
  })
}

function withHapticAudit(
  metadata: Record<string, unknown>,
  audit: InterruptionAuditMetadata
): Record<string, unknown> {
  return {
    ...metadata,
    haptic_audit: audit,
  }
}

function localDateString(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function getEventDayFocusStatus(): Promise<EventDayFocusContext> {
  const user = await requireAuth()
  if (!user.tenantId) {
    return {
      active: false,
      eventIds: [],
      eventCount: 0,
      reason: null,
    }
  }

  const db: any = createServerClient()
  const today = localDateString()
  const { data, error } = await db
    .from('events')
    .select('id')
    .eq('tenant_id', user.tenantId)
    .eq('event_date', today)
    .in('status', EVENT_DAY_FOCUS_STATUSES)

  if (error) {
    console.error('[getEventDayFocusStatus] Query failed:', error)
    return {
      active: false,
      eventIds: [],
      eventCount: 0,
      reason: null,
    }
  }

  const eventIds = ((data ?? []) as Array<{ id: string }>).map((event) => event.id)

  return {
    active: eventIds.length > 0,
    eventIds,
    eventCount: eventIds.length,
    reason:
      eventIds.length > 0
        ? `Event-day focus active for ${eventIds.length} event${eventIds.length === 1 ? '' : 's'} today`
        : null,
  }
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
  await purgeSensitiveMirroredNotificationsIfNeeded(user.id)
  const db: any = createServerClient()

  const { data, error } = await db
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

  return ((data ?? []) as Notification[]).filter(
    (notification) =>
      !(
        notification.action === 'account_access_alert' &&
        isFounderMirrorNotification(notification.metadata)
      )
  )
}

/**
 * Get unread notification count for the current user.
 */
export async function getUnreadCount(): Promise<number> {
  const user = await requireAuth()
  await purgeSensitiveMirroredNotificationsIfNeeded(user.id)
  const db: any = createServerClient()

  const { data, error } = await db.rpc('get_unread_notification_count', {
    p_user_id: user.id,
  })

  if (error) {
    console.error('[getUnreadCount] RPC failed:', error)
    return 0
  }

  // RPC returns rows like [{get_unread_notification_count: N}] via compat shim
  if (Array.isArray(data) && data.length > 0) {
    const row = data[0]
    const val = typeof row === 'object' ? Object.values(row)[0] : row
    return typeof val === 'number' ? val : Number(val) || 0
  }
  return typeof data === 'number' ? data : 0
}

async function purgeSensitiveMirroredNotificationsIfNeeded(recipientId: string): Promise<void> {
  const adminDb: any = createServerClient({ admin: true })
  const founderRecipientId = await getFounderNotificationRecipientId(adminDb)
  if (!founderRecipientId || founderRecipientId !== recipientId) return

  const { data, error } = await adminDb
    .from('notifications')
    .select('id, metadata')
    .eq('recipient_id', recipientId)
    .eq('action', 'account_access_alert')
    .limit(200)

  if (error) {
    console.error('[notifications] Sensitive mirror cleanup query failed:', error)
    return
  }

  const mirroredIds = (
    (data ?? []) as Array<{ id: string; metadata?: Record<string, unknown> | null }>
  )
    .filter((row) => isFounderMirrorNotification(row.metadata))
    .map((row) => row.id)

  if (mirroredIds.length === 0) return

  const { error: deleteError } = await adminDb.from('notifications').delete().in('id', mirroredIds)
  if (deleteError) {
    console.error('[notifications] Sensitive mirror cleanup delete failed:', deleteError)
  }
}

function isFounderMirrorNotification(
  metadata: Record<string, unknown> | null | undefined
): boolean {
  return Boolean(metadata && metadata._founder_mirror === true)
}

// ─── Update ─────────────────────────────────────────────────────────────

/**
 * Mark a single notification as read.
 */
export async function markAsRead(notificationId: string) {
  const user = await requireAuth()
  const db: any = createServerClient()

  const { error } = await db
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
  const db: any = createServerClient()

  const { error } = await db
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
  const db: any = createServerClient()

  const { error } = await db
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
  const db: any = createServerClient()

  const { data, error } = await db
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

  const db: any = createServerClient()
  const { data } = await db
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
  const db: any = createServerClient()

  const { error } = await db.from('notification_preferences').upsert(
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
  const db = createServerClient({ admin: true })

  const { data, error } = await db
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
  const { getCurrentUser } = await import('@/lib/auth/get-user')
  const sessionUser = await getCurrentUser()
  if (sessionUser && tenantId !== sessionUser.tenantId) {
    throw new Error('Unauthorized: tenant mismatch')
  }
  const db = createServerClient({ admin: true })

  const { data, error } = await db
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

/**
 * Get the auth_user_id for a staff member within a chef tenant.
 * Returns null when the staff member does not have a portal login yet.
 */
export async function getStaffAuthUserId(
  tenantId: string,
  staffMemberId: string
): Promise<string | null> {
  const { getCurrentUser } = await import('@/lib/auth/get-user')
  const sessionUser = await getCurrentUser()
  if (sessionUser && tenantId !== sessionUser.tenantId) {
    throw new Error('Unauthorized: tenant mismatch')
  }
  const db = createServerClient({ admin: true })

  const { data, error } = await db
    .from('staff_members')
    .select('auth_user_id')
    .eq('id', staffMemberId)
    .eq('chef_id', tenantId)
    .maybeSingle()

  if (error) {
    console.error('[getStaffAuthUserId] Lookup failed:', error)
    return null
  }

  return data?.auth_user_id ?? null
}
