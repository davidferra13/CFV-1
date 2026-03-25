'use server'

// Admin Audit Log - append-only record of sensitive platform actions
// Writes to admin_audit_log table (protected by a no-delete rule)

import { createAdminClient } from '@/lib/db/admin'
import { requireAdmin } from '@/lib/auth/admin'

export type AuditActionType =
  | 'account_created'
  | 'account_deactivated'
  | 'account_reactivated'
  | 'password_reset_sent'
  | 'role_assigned'
  | 'admin_viewed_chef'
  | 'admin_viewed_client'
  | 'admin_sent_email'
  | 'admin_broadcast_email'
  | 'admin_set_announcement'
  | 'admin_cleared_announcement'
  | 'admin_toggled_flag'
  | 'admin_bulk_flag'
  | 'cannabis_tier_granted'
  | 'cannabis_tier_revoked'
  | 'cannabis_invite_approved'
  | 'cannabis_invite_rejected'
  | 'admin_moderated_chat_message'
  | 'admin_moderated_social_post'
  | 'admin_moderated_hub_group'

export async function logAdminAction({
  actorEmail,
  actorUserId,
  actionType,
  targetId,
  targetType,
  details,
  ipAddress,
}: {
  actorEmail: string
  actorUserId: string
  actionType: AuditActionType
  targetId?: string
  targetType?: string
  details?: Record<string, unknown>
  ipAddress?: string
}) {
  try {
    await requireAdmin()
    const db: any = createAdminClient()
    await db.from('admin_audit_log').insert({
      actor_email: actorEmail,
      actor_user_id: actorUserId,
      action_type: actionType,
      target_id: targetId ?? null,
      target_type: targetType ?? null,
      details: (details ?? null) as any,
      ip_address: ipAddress ?? null,
    })
  } catch (err) {
    // Audit log failures are non-fatal - log to console but don't throw
    console.error('[AUDIT] Failed to write audit log entry:', err)
  }
}
