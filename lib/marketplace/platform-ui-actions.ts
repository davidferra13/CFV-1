'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Status update actions ──────────────────────────────────────────────────

/**
 * Mark an inquiry as responded to on the external platform.
 */
export async function markPlatformResponded(inquiryId: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { error } = await db
    .from('platform_records')
    .update({
      status_on_platform: 'responded',
      next_action_required: 'Waiting for client reply',
      next_action_by: 'client',
      last_action_at: new Date().toISOString(),
    })
    .eq('inquiry_id', inquiryId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to mark responded: ${error.message}`)

  // Also update inquiry status
  await db
    .from('inquiries')
    .update({
      status: 'awaiting_client',
      next_action_required: 'Waiting for client reply on platform',
      next_action_by: 'client',
    })
    .eq('id', inquiryId)
    .eq('tenant_id', tenantId)

  await logPlatformAction(db, tenantId, inquiryId, 'responded', 'Marked as responded')
}

/**
 * Mark an inquiry as declined on the external platform.
 */
export async function markPlatformDeclined(inquiryId: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { error } = await db
    .from('platform_records')
    .update({
      status_on_platform: 'declined',
      next_action_required: null,
      next_action_by: null,
      last_action_at: new Date().toISOString(),
    })
    .eq('inquiry_id', inquiryId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to mark declined: ${error.message}`)

  await db
    .from('inquiries')
    .update({
      status: 'lost',
      next_action_required: null,
      next_action_by: null,
    })
    .eq('id', inquiryId)
    .eq('tenant_id', tenantId)

  await logPlatformAction(db, tenantId, inquiryId, 'declined', 'Declined inquiry')
}

/**
 * Mark an inquiry as booked on the external platform.
 */
export async function markPlatformBooked(inquiryId: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { error } = await db
    .from('platform_records')
    .update({
      status_on_platform: 'booked',
      next_action_required: 'Prepare for event',
      next_action_by: 'chef',
      last_action_at: new Date().toISOString(),
    })
    .eq('inquiry_id', inquiryId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to mark booked: ${error.message}`)

  await db
    .from('inquiries')
    .update({
      status: 'confirmed',
      next_action_required: 'Platform booking confirmed. Prepare for event.',
      next_action_by: 'chef',
    })
    .eq('id', inquiryId)
    .eq('tenant_id', tenantId)

  await logPlatformAction(db, tenantId, inquiryId, 'booked', 'Marked as booked')
}

/**
 * Mark an inquiry as proposal sent on the external platform.
 */
export async function markPlatformProposalSent(inquiryId: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { error } = await db
    .from('platform_records')
    .update({
      status_on_platform: 'proposal_sent',
      next_action_required: 'Waiting for client to accept proposal',
      next_action_by: 'client',
      last_action_at: new Date().toISOString(),
    })
    .eq('inquiry_id', inquiryId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to mark proposal sent: ${error.message}`)

  await db
    .from('inquiries')
    .update({
      status: 'quoted',
      next_action_required: 'Proposal sent on platform. Waiting for client.',
      next_action_by: 'client',
    })
    .eq('id', inquiryId)
    .eq('tenant_id', tenantId)

  await logPlatformAction(db, tenantId, inquiryId, 'proposal_sent', 'Proposal sent on platform')
}

/**
 * Log a custom action on a platform record.
 */
export async function logCustomPlatformAction(
  inquiryId: string,
  actionType: string,
  actionLabel: string,
  actionUrl?: string | null
) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  await logPlatformAction(db, tenantId, inquiryId, actionType, actionLabel, actionUrl)

  // Update last_action_at on the record
  await db
    .from('platform_records')
    .update({ last_action_at: new Date().toISOString() })
    .eq('inquiry_id', inquiryId)
    .eq('tenant_id', tenantId)
}

// ─── Internal ───────────────────────────────────────────────────────────────

async function logPlatformAction(
  db: any,
  tenantId: string,
  inquiryId: string,
  actionType: string,
  actionLabel: string,
  actionUrl?: string | null
) {
  // Get the platform_record_id
  const { data: record } = await db
    .from('platform_records')
    .select('id')
    .eq('inquiry_id', inquiryId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!record) return

  await db.from('platform_action_log').insert({
    tenant_id: tenantId,
    platform_record_id: record.id,
    inquiry_id: inquiryId,
    action_type: actionType,
    action_label: actionLabel,
    action_source: 'chef_flow',
    action_url: actionUrl || null,
  })
}
