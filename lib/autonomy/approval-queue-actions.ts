'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { recordLearningSignal } from '@/lib/autonomy/learning'
import type {
  ApprovalQueueItem,
  AutonomyDomain,
  AutonomyDraft,
  AutonomyRiskLevel,
} from '@/lib/autonomy/types'

export async function getPendingApprovals(input?: {
  domain?: AutonomyDomain
  limit?: number
}): Promise<ApprovalQueueItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const limit = Math.min(Math.max(input?.limit ?? 50, 1), 100)

  let query = db
    .from('approval_queue')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (input?.domain) {
    query = query.eq('domain', input.domain)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch pending autonomy approvals: ${error.message}`)
  }

  return (data ?? []).map(mapApprovalQueueRow)
}

export async function approveAction(
  approvalId: string
): Promise<{ success: boolean; actionId?: string; message: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const approval = await getScopedApprovalRow(db, approvalId, user.tenantId!)
  if (!approval) {
    return { success: false, message: 'Approval request not found.' }
  }

  if (approval.status !== 'pending') {
    return {
      success: false,
      actionId: approval.autonomy_action_id,
      message: 'Approval already reviewed.',
    }
  }

  const reviewedAt = new Date().toISOString()

  const { error: approvalError } = await db
    .from('approval_queue')
    .update({
      status: 'approved',
      reviewed_at: reviewedAt,
      reviewed_by: user.id,
    })
    .eq('id', approvalId)
    .eq('tenant_id', user.tenantId!)

  if (approvalError) {
    throw new Error(`Failed to approve autonomy action: ${approvalError.message}`)
  }

  const { error: actionError } = await db
    .from('autonomy_actions')
    .update({
      status: 'approved',
      updated_at: reviewedAt,
    })
    .eq('id', approval.autonomy_action_id)
    .eq('tenant_id', user.tenantId!)

  if (actionError) {
    throw new Error(`Failed to mark autonomy action approved: ${actionError.message}`)
  }

  await recordLearningSignal({
    tenantId: user.tenantId!,
    actionId: approval.autonomy_action_id,
    approvalId,
    domain: approval.domain as AutonomyDomain,
    actionType: approval.action_type,
    outcome: 'approved',
    confidenceScore: Number(approval.confidence_score ?? 0),
  })

  return {
    success: true,
    actionId: approval.autonomy_action_id,
    message: 'Action approved and ready for its domain executor.',
  }
}

export async function rejectAction(
  approvalId: string,
  reason?: string
): Promise<{ success: boolean; actionId?: string; message: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const approval = await getScopedApprovalRow(db, approvalId, user.tenantId!)
  if (!approval) {
    return { success: false, message: 'Approval request not found.' }
  }

  if (approval.status !== 'pending') {
    return {
      success: false,
      actionId: approval.autonomy_action_id,
      message: 'Approval already reviewed.',
    }
  }

  const reviewedAt = new Date().toISOString()

  const { error: approvalError } = await db
    .from('approval_queue')
    .update({
      status: 'rejected',
      reviewed_at: reviewedAt,
      reviewed_by: user.id,
      rejection_reason: reason ?? null,
    })
    .eq('id', approvalId)
    .eq('tenant_id', user.tenantId!)

  if (approvalError) {
    throw new Error(`Failed to reject autonomy action: ${approvalError.message}`)
  }

  const { error: actionError } = await db
    .from('autonomy_actions')
    .update({
      status: 'rejected',
      updated_at: reviewedAt,
    })
    .eq('id', approval.autonomy_action_id)
    .eq('tenant_id', user.tenantId!)

  if (actionError) {
    throw new Error(`Failed to mark autonomy action rejected: ${actionError.message}`)
  }

  await recordLearningSignal({
    tenantId: user.tenantId!,
    actionId: approval.autonomy_action_id,
    approvalId,
    domain: approval.domain as AutonomyDomain,
    actionType: approval.action_type,
    outcome: 'rejected',
    confidenceScore: Number(approval.confidence_score ?? 0),
    metadata: { reason },
  })

  return {
    success: true,
    actionId: approval.autonomy_action_id,
    message: 'Action rejected.',
  }
}

export async function editAndApprove(
  approvalId: string,
  editedDraft: Partial<AutonomyDraft>
): Promise<{ success: boolean; actionId?: string; message: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const approval = await getScopedApprovalRow(db, approvalId, user.tenantId!)
  if (!approval) {
    return { success: false, message: 'Approval request not found.' }
  }

  if (approval.status !== 'pending') {
    return {
      success: false,
      actionId: approval.autonomy_action_id,
      message: 'Approval already reviewed.',
    }
  }

  const draft = {
    ...(approval.draft as AutonomyDraft),
    ...editedDraft,
    payload: {
      ...((approval.draft as AutonomyDraft).payload ?? {}),
      ...(editedDraft.payload ?? {}),
    },
  }
  const reviewedAt = new Date().toISOString()
  const editedFields = Object.keys(editedDraft)

  const { error: approvalError } = await db
    .from('approval_queue')
    .update({
      status: 'approved',
      reviewed_at: reviewedAt,
      reviewed_by: user.id,
      draft,
      preview: draft.preview,
    })
    .eq('id', approvalId)
    .eq('tenant_id', user.tenantId!)

  if (approvalError) {
    throw new Error(`Failed to edit autonomy approval: ${approvalError.message}`)
  }

  const { error: actionError } = await db
    .from('autonomy_actions')
    .update({
      status: 'approved',
      draft,
      updated_at: reviewedAt,
    })
    .eq('id', approval.autonomy_action_id)
    .eq('tenant_id', user.tenantId!)

  if (actionError) {
    throw new Error(`Failed to update edited autonomy action: ${actionError.message}`)
  }

  await recordLearningSignal({
    tenantId: user.tenantId!,
    actionId: approval.autonomy_action_id,
    approvalId,
    domain: approval.domain as AutonomyDomain,
    actionType: approval.action_type,
    outcome: editedFields.length > 0 ? 'approved_with_edits' : 'approved',
    confidenceScore: Number(approval.confidence_score ?? 0),
    editedFields,
  })

  return {
    success: true,
    actionId: approval.autonomy_action_id,
    message: 'Edited action approved and ready for its domain executor.',
  }
}

export async function getApprovalHistory(input?: {
  domain?: AutonomyDomain
  limit?: number
}): Promise<ApprovalQueueItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const limit = Math.min(Math.max(input?.limit ?? 50, 1), 100)

  let query = db
    .from('approval_queue')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .neq('status', 'pending')
    .order('reviewed_at', { ascending: false })
    .limit(limit)

  if (input?.domain) {
    query = query.eq('domain', input.domain)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch autonomy approval history: ${error.message}`)
  }

  return (data ?? []).map(mapApprovalQueueRow)
}

async function getScopedApprovalRow(
  db: any,
  approvalId: string,
  tenantId: string
): Promise<any | null> {
  const { data, error } = await db
    .from('approval_queue')
    .select('*')
    .eq('id', approvalId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) return null
  return data
}

function mapApprovalQueueRow(row: any): ApprovalQueueItem {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    autonomyActionId: row.autonomy_action_id,
    status: row.status,
    domain: row.domain,
    actionType: row.action_type,
    title: row.title,
    preview: row.preview,
    draft: row.draft,
    riskLevel: row.risk_level as AutonomyRiskLevel,
    confidenceScore: Number(row.confidence_score ?? 0),
    reason: row.reason,
    entityRefs: row.entity_refs ?? [],
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at ?? null,
    reviewedBy: row.reviewed_by ?? null,
    rejectionReason: row.rejection_reason ?? null,
  }
}
