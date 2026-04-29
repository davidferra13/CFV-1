'use server'

// Admin Audit Log - append-only record of sensitive platform actions
// Writes to admin_audit_log table (protected by a no-delete rule)

import { createAdminClient } from '@/lib/db/admin'
import { requireAdmin } from '@/lib/auth/admin'

type AuditActionType =
  | 'account_created'
  | 'account_deactivated'
  | 'account_reactivated'
  | 'password_reset_sent'
  | 'role_assigned'
  | 'admin_viewed_chef'
  | 'admin_viewed_client'
  | 'admin_viewed_live_presence'
  | 'admin_viewed_conversation_transcript'
  | 'admin_sent_email'
  | 'admin_broadcast_email'
  | 'admin_set_announcement'
  | 'admin_cleared_announcement'
  | 'admin_toggled_flag'
  | 'admin_bulk_flag'
  | 'developer_tools_enabled'
  | 'developer_tools_disabled'
  | 'cannabis_tier_granted'
  | 'cannabis_tier_revoked'
  | 'cannabis_invite_approved'
  | 'cannabis_invite_rejected'
  | 'cannabis_invite_revoked'
  | 'cannabis_invite_token_regenerated'
  | 'cannabis_agreement_signed'
  | 'cannabis_control_packet_generated'
  | 'cannabis_evidence_uploaded'
  | 'cannabis_evidence_deleted'
  | 'cannabis_reconciliation_saved'
  | 'cannabis_packet_finalized'
  | 'cannabis_guest_profile_updated'
  | 'admin_moderated_chat_message'
  | 'admin_moderated_hub_message'
  | 'admin_moderated_social_post'
  | 'admin_moderated_hub_group'
  | 'admin_viewed_hub_transcript'
  | 'admin_preview_enabled'
  | 'admin_preview_disabled'

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

// Cannabis audit logging for chef-level actions (no admin auth required).
// Non-blocking: logs errors but never throws.
export async function logCannabisAudit({
  actorUserId,
  actorEmail,
  actionType,
  targetId,
  targetType,
  details,
}: {
  actorUserId: string
  actorEmail?: string
  actionType: AuditActionType
  targetId?: string
  targetType?: string
  details?: Record<string, unknown>
}) {
  try {
    const db: any = createAdminClient()
    await db.from('admin_audit_log').insert({
      actor_email: actorEmail ?? 'chef',
      actor_user_id: actorUserId,
      action_type: actionType,
      target_id: targetId ?? null,
      target_type: targetType ?? null,
      details: (details ?? null) as any,
      ip_address: null,
    })
  } catch (err) {
    console.error('[CANNABIS_AUDIT] Failed to write audit log entry:', err)
  }
}
