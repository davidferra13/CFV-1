// Client Notification Actions
// Helper for creating in-app notifications targeted at client recipients.
// Extends the existing notification system without touching the chef flow.
// All functions are non-blocking - errors are logged, never thrown.

'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createNotification } from './actions'
import type { NotificationCategory, NotificationAction } from './types'

// ─── Resolve client auth user ────────────────────────────────────────────────

/**
 * Get the auth_user_id for a client (from user_roles table).
 * Returns null if the client has no portal account (guest/imported contact).
 */
export async function getClientAuthUserId(clientId: string): Promise<string | null> {
  const supabase = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('user_roles')
    .select('auth_user_id')
    .eq('entity_id', clientId)
    .eq('role', 'client')
    .single()

  if (error || !data) {
    // No portal account - silently return null (common for chef-imported contacts)
    return null
  }

  return data.auth_user_id
}

// ─── Create client notification ──────────────────────────────────────────────

/**
 * Create an in-app notification targeting a client's bell/panel.
 *
 * Design notes:
 * - Uses the admin client (bypasses RLS) - safe from server actions, crons, and webhooks.
 * - Non-blocking: logs errors, never throws. Caller should wrap in try/catch if needed.
 * - If the client has no portal account, silently skips (no error).
 * - recipient_role = 'client' discriminates from chef notifications in the same table.
 */
export async function createClientNotification(params: {
  tenantId: string
  clientId: string
  category: NotificationCategory
  action: NotificationAction
  title: string
  body?: string
  actionUrl?: string
  eventId?: string
  inquiryId?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    const authUserId = await getClientAuthUserId(params.clientId)

    if (!authUserId) {
      // Client has no portal account - skip silently
      return
    }

    await createNotification({
      tenantId: params.tenantId,
      recipientId: authUserId,
      category: params.category,
      action: params.action,
      title: params.title,
      body: params.body,
      actionUrl: params.actionUrl,
      eventId: params.eventId,
      inquiryId: params.inquiryId,
      clientId: params.clientId,
      metadata: {
        ...(params.metadata ?? {}),
        recipient_role: 'client',
      },
    })
  } catch (err) {
    console.error('[createClientNotification] Failed (non-fatal):', err)
  }
}
