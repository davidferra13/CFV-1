// Notification Send - Convenience dispatch wrapper
// Central notification system: wraps side effects in try/catch (non-blocking).
// This module provides a simplified interface for firing notifications from
// anywhere in the codebase. All calls are non-blocking - if a notification
// fails to create, the error is logged but never thrown.
//
// Currently supports: in-app notifications (database + realtime), email, push, SMS
// via the existing createNotification → routeNotification pipeline.

'use server'

import { createNotification } from './actions'
import type { NotificationCategory, NotificationAction } from './types'

// ─── Types ───────────────────────────────────────────────────────────────

export type SendNotificationInput = {
  /** Tenant (chef) ID for scoping */
  tenantId: string
  /** auth_user_id of the recipient - or staff_member_id resolved to auth_user_id */
  recipientId: string
  /** Notification action type */
  type: NotificationAction
  /** Short title for the notification */
  title: string
  /** Longer description body */
  message: string
  /** In-app navigation link (e.g., /events/uuid) */
  link?: string
  /** Arbitrary metadata for context */
  metadata?: Record<string, unknown>
  /** Optional event reference */
  eventId?: string
  /** Optional inquiry reference */
  inquiryId?: string
  /** Optional client reference */
  clientId?: string
}

// ─── Category resolver ───────────────────────────────────────────────────

import { NOTIFICATION_CONFIG } from './types'

/**
 * Resolve the category for a given action type from the config map.
 * Falls back to 'system' if the action is somehow not in the config.
 */
function resolveCategory(action: NotificationAction): NotificationCategory {
  return NOTIFICATION_CONFIG[action]?.category ?? 'system'
}

// ─── Send ────────────────────────────────────────────────────────────────

/**
 * Send a notification. This is ALWAYS non-blocking - wrap in try/catch,
 * log failures, never throw. The main operation that calls this will
 * succeed regardless of whether the notification was created.
 *
 * Usage:
 *   try {
 *     await sendNotification({ ... })
 *   } catch (err) {
 *     console.error('[non-blocking] Notification failed', err)
 *   }
 *
 * Or simply call it without awaiting for fire-and-forget:
 *   sendNotification({ ... }).catch(() => {})
 */
export async function sendNotification(input: SendNotificationInput): Promise<void> {
  try {
    const category = resolveCategory(input.type)

    await createNotification({
      tenantId: input.tenantId,
      recipientId: input.recipientId,
      category,
      action: input.type,
      title: input.title,
      body: input.message,
      actionUrl: input.link,
      eventId: input.eventId,
      inquiryId: input.inquiryId,
      clientId: input.clientId,
      metadata: input.metadata ?? {},
    })
  } catch (err) {
    // Non-blocking: log and swallow. The caller's main operation must not fail
    // because a notification could not be created.
    console.error('[sendNotification] Failed (non-fatal):', err)
  }
}
