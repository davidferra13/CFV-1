'use server'

// Admin Audit Log — append-only record of sensitive platform actions
// Writes to admin_audit_log table (protected by a no-delete rule)

import { createAdminClient } from '@/lib/supabase/admin'

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = createAdminClient()
    await supabase.from('admin_audit_log').insert({
      actor_email: actorEmail,
      actor_user_id: actorUserId,
      action_type: actionType,
      target_id: targetId ?? null,
      target_type: targetType ?? null,
      details: details ?? null,
      ip_address: ipAddress ?? null,
    })
  } catch (err) {
    // Audit log failures are non-fatal — log to console but don't throw
    console.error('[AUDIT] Failed to write audit log entry:', err)
  }
}
