// Chef Notification Actions
// Helper for creating in-app notifications targeted at collaborating chefs.
// Mirrors client-actions.ts pattern: resolves chef_id (entity_id) to auth_user_id.
// All functions are non-blocking: errors are logged, never thrown.

'use server'

import { createServerClient } from '@/lib/db/server'
import { createNotification } from './actions'
import type { NotificationCategory, NotificationAction } from './types'

// ─── Resolve chef auth user ─────────────────────────────────────────────────

/**
 * Get the auth_user_id for a chef/tenant (from user_roles table).
 * Returns null if no matching account found.
 */
export async function getChefAuthUserId(chefId: string): Promise<string | null> {
  const db = createServerClient({ admin: true })

  const { data, error } = await db
    .from('user_roles')
    .select('auth_user_id')
    .eq('entity_id', chefId)
    .eq('role', 'chef')
    .single()

  if (error || !data) {
    return null
  }

  return data.auth_user_id
}

// ─── Create chef notification ───────────────────────────────────────────────

/**
 * Create an in-app notification targeting a chef's bell/panel.
 *
 * Used for collaborator/co-host notifications where the recipient is
 * identified by chef_id (tenant_id), not auth_user_id.
 *
 * Non-blocking: logs errors, never throws.
 */
export async function createChefNotification(params: {
  tenantId: string
  category: NotificationCategory
  action: NotificationAction
  title: string
  body?: string
  actionUrl?: string
  eventId?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    const authUserId = await getChefAuthUserId(params.tenantId)

    if (!authUserId) {
      // No matching auth account; skip silently
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
      metadata: {
        ...(params.metadata ?? {}),
        recipient_role: 'chef',
      },
    })
  } catch (err) {
    console.error('[createChefNotification] Failed (non-fatal):', err)
  }
}
