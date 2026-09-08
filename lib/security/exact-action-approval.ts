import 'server-only'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  assertPreviewIntegrity,
  createExactActionPreview,
  fingerprintExactAction,
  type ExactAction,
  type ExactActionPreview,
} from '@/lib/security/exact-action-approval-core'

export type ExactApprovalRequest = {
  approvalId: string
  preview: ExactActionPreview
}

export type VerifiedProviderReceipt = {
  verified: boolean
  receiptId?: string
  providerState: string
}

export class ExactApprovalError extends Error {
  readonly code: string

  constructor(code: string) {
    super(code)
    this.name = 'ExactApprovalError'
    this.code = code
  }
}
export async function requestExactActionApproval(
  action: ExactAction
): Promise<ExactApprovalRequest> {
  const user = await requireChef()
  if (user.tenantId !== action.tenantId || user.id !== action.actorId) {
    throw new ExactApprovalError('approval_actor_scope_mismatch')
  }

  const preview = createExactActionPreview(action)
  const db: any = createServerClient()
  const { data, error } = await db
    .from('exact_action_approvals')
    .insert({
      tenant_id: action.tenantId,
      actor_id: action.actorId,
      preview_id: preview.previewId,
      action_hash: preview.actionHash,
      action_payload: preview.action,
      preview_payload: preview,
      category: action.category,
      operation: action.operation,
      provider: action.toolName.split('.')[0],
      environment: action.environment,
      context_version: action.contextVersion,
      status: 'pending',
      preview_expires_at: preview.expiresAt,
    })
    .select('id')
    .single()

  if (error || !data?.id) {
    throw new ExactApprovalError(`approval_request_failed:${error?.message ?? 'unknown'}`)
  }
  await appendAudit({
    approvalId: data.id,
    action,
    eventType: 'preview_created',
    metadata: { previewId: preview.previewId },
  })

  return { approvalId: data.id, preview }
}

export async function approveExactActionRequest(input: {
  approvalId: string
  displayedActionHash: string
}): Promise<{ approved: true; expiresAt: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString()

  const { data, error } = await db
    .from('exact_action_approvals')
    .update({
      status: 'approved',
      approved_at: now.toISOString(),
      approval_expires_at: expiresAt,
    })
    .eq('id', input.approvalId)
    .eq('tenant_id', user.tenantId!)
    .eq('actor_id', user.id)
    .eq('status', 'pending')
    .eq('action_hash', input.displayedActionHash)
    .gt('preview_expires_at', now.toISOString())
    .select('id, action_payload')
    .single()
  if (error || !data) throw new ExactApprovalError('approval_not_pending_or_payload_mismatch')

  await appendAudit({
    approvalId: input.approvalId,
    action: data.action_payload as ExactAction,
    eventType: 'approved',
    metadata: { source: 'explicit_user_action', expiresAt },
  })

  return { approved: true, expiresAt }
}

type ExecuteInput<T> = {
  approvalId: string
  action: ExactAction
  invoke: () => Promise<T>
  verify: (result: T) => Promise<VerifiedProviderReceipt>
}

export async function executeExactApprovedAction<T>(
  input: ExecuteInput<T>
): Promise<{ result: T; receipt: VerifiedProviderReceipt }> {
  const user = await requireChef()
  if (user.tenantId !== input.action.tenantId || user.id !== input.action.actorId) {
    throw new ExactApprovalError('approval_actor_scope_mismatch')
  }

  const actionHash = fingerprintExactAction(input.action)
  const db: any = createServerClient()
  const { data, error } = await db.rpc('consume_exact_action_approval', {
    p_approval_id: input.approvalId,
    p_tenant_id: input.action.tenantId,
    p_actor_id: input.action.actorId,
    p_action_hash: actionHash,
  })

  if (error || !data) {
    throw new ExactApprovalError(
      error?.message ? `approval_consume_failed:${error.message}` : 'approval_not_active'
    )
  }

  await appendAudit({
    approvalId: input.approvalId,
    action: input.action,
    eventType: 'approval_consumed',
    metadata: { automaticRetry: false },
  })

  let result: T
  try {
    result = await input.invoke()
  } catch (error) {
    await lockIncident(input.approvalId, input.action, 'provider_outcome_unknown', error)
    throw new ExactApprovalError(
      'provider_outcome_unknown_reconcile_read_only_before_any_new_action'
    )
  }

  let receipt: VerifiedProviderReceipt
  try {
    receipt = await input.verify(result)
  } catch (error) {
    await lockIncident(input.approvalId, input.action, 'provider_verification_failed', error)
    throw new ExactApprovalError('provider_verification_failed_reconcile_read_only')
  }

  if (!receipt.verified || !receipt.receiptId) {
    await lockIncident(input.approvalId, input.action, 'provider_receipt_unverified')
    throw new ExactApprovalError('provider_receipt_required')
  }

  const { error: updateError } = await db
    .from('exact_action_approvals')
    .update({
      execution_state: 'confirmed',
      provider_receipt: receipt,
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', input.approvalId)
    .eq('status', 'consumed')

  if (updateError) {
    await lockIncident(input.approvalId, input.action, 'receipt_persistence_failed', updateError)
    throw new ExactApprovalError('receipt_persistence_failed_reconcile_read_only')
  }

  await appendAudit({
    approvalId: input.approvalId,
    action: input.action,
    eventType: 'execution_confirmed',
    metadata: {
      receiptId: receipt.receiptId,
      providerState: receipt.providerState,
    },
  })

  return { result, receipt }
}

export async function loadExactApprovalAction(
  approvalId: string
): Promise<{ action: ExactAction; preview: ExactActionPreview }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const { data, error } = await db
    .from('exact_action_approvals')
    .select('action_payload, preview_payload')
    .eq('id', approvalId)
    .eq('tenant_id', user.tenantId!)
    .eq('actor_id', user.id)
    .single()

  if (error || !data) throw new ExactApprovalError('approval_not_found')
  const preview = data.preview_payload as ExactActionPreview
  assertPreviewIntegrity(preview)
  return { action: data.action_payload as ExactAction, preview }
}

async function lockIncident(
  approvalId: string,
  action: ExactAction,
  reason: string,
  error?: unknown
): Promise<void> {
  const db: any = createServerClient()
  await db
    .from('exact_action_approvals')
    .update({
      status: 'incident_locked',
      execution_state: 'unknown',
      incident_locked_at: new Date().toISOString(),
      incident_reason: reason,
    })
    .eq('id', approvalId)

  await appendAudit({
    approvalId,
    action,
    eventType: 'incident_locked',
    metadata: {
      reason,
      automaticRetry: false,
      errorType: error instanceof Error ? error.name : null,
    },
  })
}

async function appendAudit(input: {
  approvalId: string
  action: ExactAction
  eventType: string
  metadata: Record<string, unknown>
}): Promise<void> {
  const db: any = createServerClient()
  const { error } = await db.from('exact_action_audit').insert({
    tenant_id: input.action.tenantId,
    approval_id: input.approvalId,
    action_id: input.action.actionId,
    action_hash: fingerprintExactAction(input.action),
    event_type: input.eventType,
    metadata: input.metadata,
  })
  if (error) throw new ExactApprovalError(`approval_audit_failed:${error.message}`)
}
