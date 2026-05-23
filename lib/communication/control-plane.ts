'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  evaluateScheduledSmsPolicy,
  type SmsPolicyClient,
  type SmsPolicyDecision,
} from '@/lib/communication/sms-policy'
import { evaluateVendorCallLoop } from '@/lib/calling/vendor-action-extraction'
import {
  evaluateRemyCommunicationGuardrails,
  type RemyDraftSourceEvidence,
  type RemyMandatoryApprovalClass,
} from '@/lib/communication/remy-approval-guardrails'

export type CommunicationControlPlaneItem = {
  id: string
  type: 'draft' | 'scheduled_sms' | 'failed_send' | 'inbox' | 'vendor_call' | 'remy_draft'
  title: string
  detail: string
  status: 'pending' | 'allowed' | 'blocked' | 'delayed' | 'failed' | 'actionable'
  href: string
  proofLinks: Array<{ label: string; href: string }>
  policy?: SmsPolicyDecision
}

export type SmsComplianceClientState = {
  id: string
  name: string
  phone: string | null
  status: SmsPolicyDecision['status']
  reasons: string[]
  proof: SmsPolicyDecision['proof']
  href: string
}

export type SmsChannelHealth = {
  id: string
  label: string
  status: 'healthy' | 'attention' | 'blocked'
  detail: string
  href: string
}

export type SmsAuditLogItem = {
  id: string
  label: string
  status: 'allowed' | 'blocked' | 'delayed' | 'failed' | 'retried'
  detail: string
  href: string
}

export type CommunicationControlPlane = {
  counts: {
    pending: number
    blocked: number
    failed: number
    actionable: number
  }
  smsCompliance: {
    eligible: number
    blocked: number
    paused: number
    missingConsent: number
    invalidPhone: number
    quietHours: boolean
    clients: SmsComplianceClientState[]
  }
  channelHealth: SmsChannelHealth[]
  smsAuditLog: SmsAuditLogItem[]
  items: CommunicationControlPlaneItem[]
}

export type RemyCommunicationDraftPayload = {
  channel: 'sms' | 'email' | 'app' | 'phone'
  subject: string | null
  body: string
  trigger: string
  policyReason: string
  proposedNextAction: string
  approvalClasses: RemyMandatoryApprovalClass[]
  sourceEvidence: RemyDraftSourceEvidence[]
  recipientClientId: string | null
  contextType: 'inquiry' | 'event' | 'client' | null
  contextId: string | null
  revisionRequest?: string | null
  revisedAt?: string | null
  approvedScheduledMessageId?: string | null
}

export type RemyCommunicationApprovalRow = {
  id: string
  title: string
  preview: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'blocked' | 'failed' | 'sent'
  riskLevel: string
  confidenceScore: number
  reason: string
  createdAt: string
  reviewedAt: string | null
  rejectionReason: string | null
  draft: RemyCommunicationDraftPayload
}

export type RemyCommunicationApprovalWorkbench = {
  pending: RemyCommunicationApprovalRow[]
  audit: RemyCommunicationApprovalRow[]
}

export type RemyCommunicationDraftInput = {
  channel: 'sms' | 'email' | 'app' | 'phone'
  subject?: string | null
  body: string
  confidence: number
  trigger: string
  proposedNextAction: string
  sourceEvidence: RemyDraftSourceEvidence[]
  recipientClientId?: string | null
  contextType?: 'inquiry' | 'event' | 'client' | null
  contextId?: string | null
}

async function safeQuery<T>(label: string, query: Promise<{ data: T | null; error?: unknown }>) {
  try {
    const result = await query
    if (result.error) {
      console.error(`[communication-control-plane] ${label} failed:`, result.error)
      return null
    }
    return result.data
  } catch (error) {
    console.error(`[communication-control-plane] ${label} failed:`, error)
    return null
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'No date'
  return new Date(value).toLocaleString()
}

function normalizeRemyChannel(value: unknown): RemyCommunicationDraftPayload['channel'] {
  return value === 'email' || value === 'app' || value === 'phone' ? value : 'sms'
}

function isUuid(value: string | null | undefined) {
  return (
    !!value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
}

function remyEvidenceHref(evidence: RemyDraftSourceEvidence): string {
  if (evidence.href) return evidence.href
  switch (evidence.type) {
    case 'thread':
      return '/inbox'
    case 'event':
      return `/events/${evidence.id}`
    case 'client':
      return `/clients/${evidence.id}`
    case 'call':
    case 'vendor':
      return '/communication/vendor-actions'
    case 'lifecycle_trigger':
      return '/communication'
    case 'task':
      return '/tasks'
    default:
      return '/communication/remy-approvals'
  }
}

function remyDraftFromApprovalRow(row: any): RemyCommunicationDraftPayload {
  const payload =
    row?.draft?.payload &&
    typeof row.draft.payload === 'object' &&
    !Array.isArray(row.draft.payload)
      ? row.draft.payload
      : {}

  const sourceEvidence = Array.isArray(payload.sourceEvidence)
    ? payload.sourceEvidence.filter((item: any) => item?.id && item?.label && item?.type)
    : []

  return {
    channel: normalizeRemyChannel(payload.channel),
    subject: typeof payload.subject === 'string' ? payload.subject : null,
    body: typeof payload.body === 'string' ? payload.body : (row?.preview ?? ''),
    trigger: typeof payload.trigger === 'string' ? payload.trigger : (row?.action_type ?? 'remy'),
    policyReason:
      typeof payload.policyReason === 'string' ? payload.policyReason : (row?.reason ?? ''),
    proposedNextAction:
      typeof payload.proposedNextAction === 'string'
        ? payload.proposedNextAction
        : (row?.draft?.nextStepLabel ?? 'Review Remy draft'),
    approvalClasses: Array.isArray(payload.approvalClasses) ? payload.approvalClasses : [],
    sourceEvidence,
    recipientClientId:
      typeof payload.recipientClientId === 'string' ? payload.recipientClientId : null,
    contextType:
      payload.contextType === 'inquiry' ||
      payload.contextType === 'event' ||
      payload.contextType === 'client'
        ? payload.contextType
        : null,
    contextId: typeof payload.contextId === 'string' ? payload.contextId : null,
    revisionRequest: typeof payload.revisionRequest === 'string' ? payload.revisionRequest : null,
    revisedAt: typeof payload.revisedAt === 'string' ? payload.revisedAt : null,
    approvedScheduledMessageId:
      typeof payload.approvedScheduledMessageId === 'string'
        ? payload.approvedScheduledMessageId
        : null,
  }
}

function mapRemyApprovalRow(row: any): RemyCommunicationApprovalRow {
  return {
    id: row.id,
    title: row.title || 'Remy communication draft',
    preview: row.preview || '',
    status: row.status,
    riskLevel: row.risk_level,
    confidenceScore: Number(row.confidence_score ?? 0),
    reason: row.reason || '',
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at ?? null,
    rejectionReason: row.rejection_reason ?? null,
    draft: remyDraftFromApprovalRow(row),
  }
}

function mapRemyActionAuditRow(row: any): RemyCommunicationApprovalRow {
  const status: RemyCommunicationApprovalRow['status'] =
    row.status === 'executed'
      ? 'sent'
      : row.status === 'blocked'
        ? 'blocked'
        : row.status === 'failed'
          ? 'failed'
          : row.status === 'rejected'
            ? 'rejected'
            : row.status === 'approved'
              ? 'approved'
              : 'pending'

  return {
    id: row.id,
    title: row.title || 'Remy communication action',
    preview: row.draft?.preview || row.description || '',
    status,
    riskLevel: row.risk_level,
    confidenceScore: Number(row.confidence_score ?? 0),
    reason: row.error_message || row.approval_reason || row.description || '',
    createdAt: row.created_at,
    reviewedAt: row.executed_at ?? row.updated_at ?? null,
    rejectionReason: row.status === 'rejected' ? row.approval_reason : null,
    draft: remyDraftFromApprovalRow({
      ...row,
      preview: row.draft?.preview || row.description || '',
      reason: row.approval_reason || row.description || '',
    }),
  }
}

async function smsPolicyForClient(db: any, tenantId: string, clientId: string | null) {
  if (!clientId) {
    return evaluateScheduledSmsPolicy({ client: null })
  }

  const [client, preferences, recentSmsCount] = await Promise.all([
    safeQuery<any>(
      'remy sms recipient',
      db
        .from('clients')
        .select('id, phone, preferred_contact_method, communication_preference')
        .eq('id', clientId)
        .eq('tenant_id', tenantId)
        .maybeSingle()
    ),
    safeQuery<any>(
      'remy chef preferences',
      db
        .from('chef_preferences')
        .select(
          'notification_quiet_hours_enabled, notification_quiet_hours_start, notification_quiet_hours_end'
        )
        .eq('tenant_id', tenantId)
        .maybeSingle()
    ),
    safeQuery<any[]>(
      'remy recent sms sends',
      db
        .from('scheduled_messages')
        .select('id')
        .eq('chef_id', tenantId)
        .eq('recipient_id', clientId)
        .eq('channel', 'sms')
        .eq('status', 'sent')
        .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    ),
  ])

  return evaluateScheduledSmsPolicy({
    client: client as SmsPolicyClient | null,
    quietHours: {
      enabled: !!preferences?.notification_quiet_hours_enabled,
      startTime: preferences?.notification_quiet_hours_start ?? null,
      endTime: preferences?.notification_quiet_hours_end ?? null,
      timezone: 'America/New_York',
    },
    recentSmsCount24h: recentSmsCount?.length ?? 0,
  })
}

async function getScopedRemyApproval(db: any, approvalId: string, tenantId: string) {
  return safeQuery<any>(
    'scoped remy approval',
    db
      .from('approval_queue')
      .select('*')
      .eq('id', approvalId)
      .eq('tenant_id', tenantId)
      .eq('domain', 'communication')
      .like('action_type', 'communication.remy_%')
      .maybeSingle()
  )
}

function remyApprovalRevalidation() {
  revalidatePath('/communication')
  revalidatePath('/communication/remy-approvals')
}

async function updateClientSmsPreference(clientId: string, patch: Record<string, unknown>) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  const client = await safeQuery<any>(
    'client sms preference',
    db
      .from('clients')
      .select('id, communication_preference')
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
  )

  if (!client) return

  const current =
    client.communication_preference &&
    typeof client.communication_preference === 'object' &&
    !Array.isArray(client.communication_preference)
      ? client.communication_preference
      : {}

  await db
    .from('clients')
    .update({
      communication_preference: {
        ...current,
        ...patch,
      },
    })
    .eq('id', clientId)
    .eq('tenant_id', tenantId)

  revalidatePath('/communication')
}

export async function markSmsConsentSource(formData: FormData) {
  const clientId = String(formData.get('clientId') ?? '')
  if (!clientId) return

  await updateClientSmsPreference(clientId, {
    smsConsentStatus: 'opted_in',
    smsConsentSource: 'operator attestation',
    smsOptInAt: new Date().toISOString(),
    smsPaused: false,
  })
}

export async function pauseClientSmsChannel(formData: FormData) {
  const clientId = String(formData.get('clientId') ?? '')
  if (!clientId) return

  await updateClientSmsPreference(clientId, {
    smsPaused: true,
    smsPausedAt: new Date().toISOString(),
  })
}

export async function retrySmsVerification(formData: FormData) {
  const clientId = String(formData.get('clientId') ?? '')
  if (!clientId) return

  await updateClientSmsPreference(clientId, {
    smsVerificationRetriedAt: new Date().toISOString(),
    smsVerificationStatus: 'pending',
  })
}

export async function createRemyCommunicationDraft(input: RemyCommunicationDraftInput): Promise<{
  status: 'queued' | 'auto_ack_scheduled' | 'blocked'
  approvalId?: string
  actionId?: string
  error?: string
}> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })
  const channel = normalizeRemyChannel(input.channel)
  const body = input.body.trim()

  if (!body) {
    return { status: 'blocked', error: 'Remy communication draft body is required.' }
  }

  const smsPolicy =
    channel === 'sms'
      ? await smsPolicyForClient(db, tenantId, input.recipientClientId ?? null)
      : null
  const guardrail = evaluateRemyCommunicationGuardrails({
    confidence: input.confidence,
    trigger: input.trigger,
    channel,
    message: body,
    proposedNextAction: input.proposedNextAction,
    sourceEvidence: input.sourceEvidence,
    smsPolicy,
  })
  const now = new Date().toISOString()
  const title = input.subject?.trim() || `Remy ${channel.toUpperCase()} draft`
  const payload: RemyCommunicationDraftPayload = {
    channel,
    subject: input.subject?.trim() || null,
    body,
    trigger: input.trigger,
    policyReason: guardrail.policyReason,
    proposedNextAction: input.proposedNextAction,
    approvalClasses: guardrail.approvalClasses,
    sourceEvidence: input.sourceEvidence,
    recipientClientId: input.recipientClientId ?? null,
    contextType: input.contextType ?? null,
    contextId: input.contextId ?? null,
  }

  const draft = {
    summary: title,
    preview: body,
    payload,
    reversible: false,
    evidence: input.sourceEvidence.map((evidence) => ({
      label: evidence.label,
      value: evidence.id,
      source: `${evidence.type}:${evidence.id}`,
      confidence: input.confidence,
    })),
    nextStepLabel: guardrail.safeAutoAckAllowed ? 'Schedule safe auto-ack' : 'Review Remy draft',
  }
  const riskLevel =
    guardrail.status === 'blocked' ? 'restricted' : guardrail.requiresApproval ? 'high' : 'low'

  const { data: action, error: actionError } = await db
    .from('autonomy_actions')
    .insert({
      tenant_id: tenantId,
      domain: 'communication',
      action_type: guardrail.safeAutoAckAllowed
        ? 'communication.remy_safe_auto_ack'
        : 'communication.remy_external_send',
      title,
      description: guardrail.reason,
      risk_level: riskLevel,
      confidence_score: Math.max(0, Math.min(1, input.confidence)),
      draft_method: 'ai-enhanced',
      draft,
      source: 'remy_communication_guardrails',
      situation: {
        tenantId,
        domain: 'communication',
        source: 'remy_communication_guardrails',
        signalType: input.trigger,
        title,
        detail: body,
        urgency: riskLevel === 'restricted' ? 5 : riskLevel === 'high' ? 4 : 1,
        confidenceScore: Math.max(0, Math.min(1, input.confidence)),
        entityRefs: input.sourceEvidence.map((evidence) => ({
          type: evidence.type,
          id: evidence.id,
          label: evidence.label,
        })),
        payload,
        detectedAt: now,
      },
      entity_refs: input.sourceEvidence.map((evidence) => ({
        type: evidence.type,
        id: evidence.id,
        label: evidence.label,
      })),
      dedup_key: [
        tenantId,
        'communication.remy',
        input.trigger,
        input.contextId ?? input.recipientClientId ?? body.slice(0, 48),
      ].join(':'),
      status: guardrail.status === 'blocked' ? 'blocked' : 'drafted',
      approval_decision: guardrail.safeAutoAckAllowed ? 'auto_execute' : 'queue_for_approval',
      approval_reason: guardrail.reason,
      error_message: guardrail.status === 'blocked' ? guardrail.reason : null,
    })
    .select('id')
    .single()

  if (actionError || !action?.id) {
    return { status: 'blocked', error: actionError?.message ?? 'Failed to create Remy action.' }
  }

  if (guardrail.status === 'blocked') {
    remyApprovalRevalidation()
    return { status: 'blocked', actionId: action.id, error: guardrail.reason }
  }

  if (guardrail.safeAutoAckAllowed) {
    const scheduled = await scheduleApprovedRemyMessage(db, tenantId, payload)
    if (scheduled.error) {
      await db
        .from('autonomy_actions')
        .update({
          status: 'failed',
          error_message: scheduled.error,
          updated_at: now,
        })
        .eq('id', action.id)
        .eq('tenant_id', tenantId)

      remyApprovalRevalidation()
      return { status: 'blocked', actionId: action.id, error: scheduled.error }
    }

    await db
      .from('autonomy_actions')
      .update({
        status: 'executed',
        executed_at: now,
        updated_at: now,
      })
      .eq('id', action.id)
      .eq('tenant_id', tenantId)

    remyApprovalRevalidation()
    return { status: 'auto_ack_scheduled', actionId: action.id }
  }

  const { data: approval, error: approvalError } = await db
    .from('approval_queue')
    .insert({
      tenant_id: tenantId,
      autonomy_action_id: action.id,
      status: 'pending',
      domain: 'communication',
      action_type: 'communication.remy_external_send',
      title,
      preview: body,
      draft,
      risk_level: riskLevel,
      confidence_score: Math.max(0, Math.min(1, input.confidence)),
      reason: guardrail.reason,
      entity_refs: input.sourceEvidence.map((evidence) => ({
        type: evidence.type,
        id: evidence.id,
        label: evidence.label,
      })),
    })
    .select('id')
    .single()

  if (approvalError || !approval?.id) {
    await db
      .from('autonomy_actions')
      .update({
        status: 'failed',
        error_message: approvalError?.message ?? 'Failed to queue Remy approval.',
        updated_at: now,
      })
      .eq('id', action.id)
      .eq('tenant_id', tenantId)

    return {
      status: 'blocked',
      actionId: action.id,
      error: approvalError?.message ?? 'Failed to queue Remy approval.',
    }
  }

  await db
    .from('autonomy_actions')
    .update({ status: 'queued', updated_at: now })
    .eq('id', action.id)
    .eq('tenant_id', tenantId)

  remyApprovalRevalidation()
  return { status: 'queued', actionId: action.id, approvalId: approval.id }
}

export async function getRemyCommunicationApprovalWorkbench(): Promise<RemyCommunicationApprovalWorkbench> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  const [pending, audit, actionAudit] = await Promise.all([
    safeQuery<any[]>(
      'pending remy communication approvals',
      db
        .from('approval_queue')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('domain', 'communication')
        .like('action_type', 'communication.remy_%')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(40)
    ),
    safeQuery<any[]>(
      'remy communication approval audit',
      db
        .from('approval_queue')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('domain', 'communication')
        .like('action_type', 'communication.remy_%')
        .order('updated_at', { ascending: false })
        .limit(60)
    ),
    safeQuery<any[]>(
      'remy communication action audit',
      db
        .from('autonomy_actions')
        .select(
          'id, title, description, draft, risk_level, confidence_score, approval_reason, status, created_at, updated_at, executed_at, error_message'
        )
        .eq('tenant_id', tenantId)
        .eq('domain', 'communication')
        .like('action_type', 'communication.remy_%')
        .in('status', ['blocked', 'failed', 'executed'])
        .order('updated_at', { ascending: false })
        .limit(40)
    ),
  ])

  return {
    pending: (pending ?? []).map(mapRemyApprovalRow),
    audit: [
      ...(audit ?? []).map(mapRemyApprovalRow),
      ...(actionAudit ?? []).map(mapRemyActionAuditRow),
    ].sort(
      (a, b) =>
        new Date(b.reviewedAt ?? b.createdAt).getTime() -
        new Date(a.reviewedAt ?? a.createdAt).getTime()
    ),
  }
}

export async function approveRemyCommunicationDraft(formData: FormData) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })
  const approvalId = String(formData.get('approvalId') ?? '')
  if (!approvalId) return

  const approval = await getScopedRemyApproval(db, approvalId, tenantId)
  if (!approval || approval.status !== 'pending') return

  const draft = remyDraftFromApprovalRow(approval)
  const body = String(formData.get('body') ?? draft.body).trim()
  if (!body) return

  const editedDraft: RemyCommunicationDraftPayload = {
    ...draft,
    subject: String(formData.get('subject') ?? draft.subject ?? '').trim() || null,
    body,
  }

  const smsPolicy =
    editedDraft.channel === 'sms'
      ? await smsPolicyForClient(db, tenantId, editedDraft.recipientClientId)
      : null

  if (smsPolicy?.status === 'blocked') {
    const reason = `SMS blocked: ${smsPolicy.reasons.join('; ')}`
    await db
      .from('autonomy_actions')
      .update({
        status: 'blocked',
        error_message: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', approval.autonomy_action_id)
      .eq('tenant_id', tenantId)
    remyApprovalRevalidation()
    return
  }

  const scheduled = await scheduleApprovedRemyMessage(db, tenantId, editedDraft)
  if (scheduled.error) {
    await db
      .from('autonomy_actions')
      .update({
        status: 'failed',
        error_message: scheduled.error,
        updated_at: new Date().toISOString(),
      })
      .eq('id', approval.autonomy_action_id)
      .eq('tenant_id', tenantId)
    remyApprovalRevalidation()
    return
  }

  const reviewedAt = new Date().toISOString()
  const nextDraft = {
    ...(approval.draft ?? {}),
    preview: body,
    payload: {
      ...editedDraft,
      approvedScheduledMessageId: scheduled.messageId,
      policyReason: smsPolicy?.reasons.join('; ') ?? editedDraft.policyReason,
    },
    nextStepLabel: 'Scheduled by chef approval',
  }

  await Promise.all([
    db
      .from('approval_queue')
      .update({
        status: 'approved',
        reviewed_at: reviewedAt,
        reviewed_by: user.id,
        preview: body,
        draft: nextDraft,
      })
      .eq('id', approvalId)
      .eq('tenant_id', tenantId),
    db
      .from('autonomy_actions')
      .update({
        status: 'approved',
        draft: nextDraft,
        updated_at: reviewedAt,
      })
      .eq('id', approval.autonomy_action_id)
      .eq('tenant_id', tenantId),
  ])

  remyApprovalRevalidation()
}

export async function denyRemyCommunicationDraft(formData: FormData) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })
  const approvalId = String(formData.get('approvalId') ?? '')
  if (!approvalId) return

  const approval = await getScopedRemyApproval(db, approvalId, tenantId)
  if (!approval || approval.status !== 'pending') return

  const reviewedAt = new Date().toISOString()
  const rejectionReason = String(formData.get('reason') ?? 'Denied by chef.').trim()

  await Promise.all([
    db
      .from('approval_queue')
      .update({
        status: 'rejected',
        reviewed_at: reviewedAt,
        reviewed_by: user.id,
        rejection_reason: rejectionReason,
      })
      .eq('id', approvalId)
      .eq('tenant_id', tenantId),
    db
      .from('autonomy_actions')
      .update({
        status: 'rejected',
        approval_decision: 'manual_only',
        approval_reason: rejectionReason,
        updated_at: reviewedAt,
      })
      .eq('id', approval.autonomy_action_id)
      .eq('tenant_id', tenantId),
  ])

  remyApprovalRevalidation()
}

export async function requestRemyCommunicationRevision(formData: FormData) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })
  const approvalId = String(formData.get('approvalId') ?? '')
  if (!approvalId) return

  const approval = await getScopedRemyApproval(db, approvalId, tenantId)
  if (!approval || approval.status !== 'pending') return

  const request = String(formData.get('revisionRequest') ?? '').trim()
  const reviewedAt = new Date().toISOString()
  const draft = remyDraftFromApprovalRow(approval)
  const nextDraft = {
    ...(approval.draft ?? {}),
    payload: {
      ...draft,
      revisionRequest: request || 'Revise this draft before chef approval.',
      revisedAt: reviewedAt,
    },
    nextStepLabel: 'Revise Remy draft',
  }

  await Promise.all([
    db
      .from('approval_queue')
      .update({
        draft: nextDraft,
        reason: request ? `Revision requested: ${request}` : 'Revision requested by chef.',
      })
      .eq('id', approvalId)
      .eq('tenant_id', tenantId),
    db
      .from('autonomy_actions')
      .update({
        draft: nextDraft,
        status: 'queued',
        updated_at: reviewedAt,
      })
      .eq('id', approval.autonomy_action_id)
      .eq('tenant_id', tenantId),
  ])

  remyApprovalRevalidation()
}

async function scheduleApprovedRemyMessage(
  db: any,
  tenantId: string,
  draft: RemyCommunicationDraftPayload
): Promise<{ messageId?: string; error?: string }> {
  if (draft.channel === 'phone') {
    return { error: 'Remy phone calls cannot be approved as silent external sends.' }
  }

  if (draft.recipientClientId) {
    const scopedClient = await safeQuery<any>(
      'approved remy recipient scope',
      db
        .from('clients')
        .select('id')
        .eq('id', draft.recipientClientId)
        .eq('tenant_id', tenantId)
        .maybeSingle()
    )

    if (!scopedClient?.id) {
      return { error: 'Recipient client is not in this chef workspace.' }
    }
  }

  const scheduledFor = new Date(Date.now() + 60 * 1000).toISOString()
  const insertPayload: Record<string, unknown> = {
    chef_id: tenantId,
    recipient_id: draft.recipientClientId,
    channel: draft.channel,
    subject: draft.subject,
    body: draft.body,
    scheduled_for: scheduledFor,
    status: 'scheduled',
    context_type: draft.contextType,
    context_id: isUuid(draft.contextId) ? draft.contextId : null,
  }

  if (draft.channel === 'app') {
    insertPayload.status = 'failed'
    insertPayload.error_message = 'Remy app-channel delivery requires a domain executor.'
  }

  const { data, error } = await db
    .from('scheduled_messages')
    .insert(insertPayload)
    .select('id')
    .single()

  if (error || !data?.id) {
    return { error: error?.message ?? 'Failed to schedule approved Remy message.' }
  }

  return { messageId: data.id }
}

async function policyForScheduledSms(db: any, tenantId: string, message: any) {
  const [client, preferences, recentSmsCount] = await Promise.all([
    message.recipient_id
      ? safeQuery<any>(
          'sms recipient',
          db
            .from('clients')
            .select('id, phone, preferred_contact_method, communication_preference')
            .eq('id', message.recipient_id)
            .eq('tenant_id', tenantId)
            .maybeSingle()
        )
      : Promise.resolve(null),
    safeQuery<any>(
      'chef preferences',
      db
        .from('chef_preferences')
        .select(
          'notification_quiet_hours_enabled, notification_quiet_hours_start, notification_quiet_hours_end'
        )
        .eq('tenant_id', tenantId)
        .maybeSingle()
    ),
    safeQuery<any[]>(
      'recent sms sends',
      db
        .from('scheduled_messages')
        .select('id')
        .eq('chef_id', tenantId)
        .eq('recipient_id', message.recipient_id ?? '')
        .eq('channel', 'sms')
        .eq('status', 'sent')
        .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    ),
  ])

  return evaluateScheduledSmsPolicy({
    client: client as SmsPolicyClient | null,
    quietHours: {
      enabled: !!preferences?.notification_quiet_hours_enabled,
      startTime: preferences?.notification_quiet_hours_start ?? null,
      endTime: preferences?.notification_quiet_hours_end ?? null,
      timezone: 'America/New_York',
    },
    recentSmsCount24h: recentSmsCount?.length ?? 0,
  })
}

function countRecentSmsByRecipient(rows: any[] | null | undefined) {
  const counts = new Map<string, number>()
  for (const row of rows ?? []) {
    if (!row.recipient_id) continue
    counts.set(row.recipient_id, (counts.get(row.recipient_id) ?? 0) + 1)
  }
  return counts
}

function buildSmsChannelHealth(failedSends: any[] | null | undefined): SmsChannelHealth[] {
  const hasAccount = !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN
  const hasSender = !!(process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER)
  const smsFailures = (failedSends ?? []).filter((message) => message.channel === 'sms')
  const providerFailures = smsFailures.filter((message) =>
    String(message.error_message ?? '')
      .toLowerCase()
      .includes('not_configured')
  )

  return [
    {
      id: 'twilio-provider',
      label: 'Twilio provider',
      status: hasAccount ? 'healthy' : 'blocked',
      detail: hasAccount
        ? 'Account credentials are present for scheduled SMS sends.'
        : 'Twilio account credentials are missing, so SMS sends will be blocked.',
      href: '/settings/communication',
    },
    {
      id: 'sender-identity',
      label: 'Sender identity',
      status: hasSender ? 'healthy' : 'blocked',
      detail: hasSender
        ? 'A configured sender number is available for outbound SMS.'
        : 'No sender number is configured for outbound SMS.',
      href: '/settings/communication',
    },
    {
      id: 'delivery-failures',
      label: 'Delivery failures',
      status:
        providerFailures.length > 0 ? 'blocked' : smsFailures.length > 0 ? 'attention' : 'healthy',
      detail:
        smsFailures.length === 0
          ? 'No recent failed SMS delivery records are visible.'
          : `${smsFailures.length} failed SMS record${
              smsFailures.length === 1 ? '' : 's'
            } need recovery review.`,
      href: '/communication/drafts',
    },
  ]
}

function buildSmsAuditLog(messages: any[] | null | undefined): SmsAuditLogItem[] {
  return (messages ?? []).slice(0, 8).map((message) => {
    const error = String(message.error_message ?? '')
    const rawStatus = String(message.status ?? '')
    const status: SmsAuditLogItem['status'] =
      rawStatus === 'sent'
        ? 'allowed'
        : error.toLowerCase().includes('delayed')
          ? 'delayed'
          : error.toLowerCase().includes('retry')
            ? 'retried'
            : rawStatus === 'failed'
              ? 'failed'
              : 'blocked'

    return {
      id: `sms-audit-${message.id}`,
      label: message.subject || 'SMS policy event',
      status,
      detail: error || `${String(message.channel).toUpperCase()} ${rawStatus}`,
      href: '/communication/drafts',
    }
  })
}

function vendorLoopItemStatus(status: string): CommunicationControlPlaneItem['status'] {
  if (status === 'success') return 'actionable'
  if (status === 'exhausted' || status === 'escalated') return 'failed'
  if (status === 'outside_active_hours' || status === 'retry_waiting') return 'delayed'
  return 'actionable'
}

function vendorLoopDetail(prefix: string, source: any) {
  const decision = evaluateVendorCallLoop({
    callId: source.id,
    sourceType: source.sourceType,
    vendorName: source.vendorName,
    vendorId: source.vendorId ?? null,
    eventId: source.eventId ?? null,
    ingredientName: source.ingredientName ?? null,
    summary: source.summary,
    transcript: source.transcript,
    recordingUrl: source.recordingUrl ?? null,
    extractedData: source.extractedData ?? null,
    attemptedAt: source.createdAt ?? source.updatedAt ?? null,
    metadata: {
      status: source.status,
      callPlan: {
        vendorName: source.vendorName,
        vendorId: source.vendorId ?? null,
        purpose: source.ingredientName
          ? `Resolve ${source.ingredientName}`
          : source.subject || 'Resolve vendor call',
        ingredientName: source.ingredientName ?? source.subject ?? null,
        eventId: source.eventId ?? null,
        allowedRetries: 2,
        retrySpacingMinutes: 60,
        activeHours: {
          start: '08:00',
          end: '18:00',
          timezone: 'America/New_York',
        },
        escalationThreshold: 3,
      },
    },
  })

  const nextAttempt = decision.nextAttemptAt
    ? ` Next retry: ${formatDate(decision.nextAttemptAt)}.`
    : ''
  return `${prefix}: ${decision.reason} Attempts ${decision.attemptsUsed}/${
    decision.plan.allowedRetries + 1
  }.${nextAttempt}`
}

export async function getCommunicationControlPlane(): Promise<CommunicationControlPlane> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  const [
    drafts,
    scheduledSms,
    failedSends,
    inboxItems,
    supplierCalls,
    aiCalls,
    vendorActionApprovals,
    vendorActionTasks,
    remyCommunicationApprovals,
    remyCommunicationActions,
    smsClients,
    recentSmsRows,
    smsAuditRows,
    preferences,
  ] = await Promise.all([
    safeQuery<any[]>(
      'drafts',
      db
        .from('scheduled_messages')
        .select('id, channel, subject, body, scheduled_for, status, context_type, context_id')
        .eq('chef_id', tenantId)
        .in('status', ['draft', 'scheduled'])
        .is('sent_at', null)
        .order('scheduled_for', { ascending: true })
        .limit(12)
    ),
    safeQuery<any[]>(
      'scheduled sms',
      db
        .from('scheduled_messages')
        .select('id, recipient_id, channel, subject, body, scheduled_for, status')
        .eq('chef_id', tenantId)
        .eq('channel', 'sms')
        .eq('status', 'scheduled')
        .is('sent_at', null)
        .order('scheduled_for', { ascending: true })
        .limit(8)
    ),
    safeQuery<any[]>(
      'failed sends',
      db
        .from('scheduled_messages')
        .select(
          'id, channel, subject, body, scheduled_for, error_message, context_type, context_id'
        )
        .eq('chef_id', tenantId)
        .eq('status', 'failed')
        .order('updated_at', { ascending: false })
        .limit(8)
    ),
    safeQuery<any[]>(
      'inbox items',
      db
        .from('communication_inbox_items')
        .select('thread_id, communication_event_id, sender_identity, source, raw_content, tab')
        .eq('tenant_id', tenantId)
        .in('tab', ['unlinked', 'needs_attention'])
        .order('last_activity_at', { ascending: false })
        .limit(8)
    ),
    safeQuery<any[]>(
      'supplier calls',
      db
        .from('supplier_calls')
        .select(
          'id, vendor_id, vendor_name, ingredient_name, status, result, price_quoted, quantity_available, speech_transcript, recording_url, created_at, updated_at'
        )
        .eq('chef_id', tenantId)
        .in('status', ['completed', 'failed', 'no_answer', 'busy'])
        .order('created_at', { ascending: false })
        .limit(5)
    ),
    safeQuery<any[]>(
      'ai calls',
      db
        .from('ai_calls')
        .select(
          'id, role, contact_name, vendor_id, event_id, subject, status, result, full_transcript, extracted_data, action_log, recording_url, created_at, updated_at'
        )
        .eq('chef_id', tenantId)
        .in('status', ['completed', 'failed', 'no_answer', 'busy', 'voicemail'])
        .order('created_at', { ascending: false })
        .limit(5)
    ),
    safeQuery<any[]>(
      'vendor call action approvals',
      db
        .from('approval_queue')
        .select('id, action_type, title, preview, confidence_score, reason, created_at')
        .eq('tenant_id', tenantId)
        .eq('domain', 'vendor')
        .like('action_type', 'post_call_%')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(8)
    ),
    safeQuery<any[]>(
      'vendor call action tasks',
      db
        .from('tasks')
        .select('id, title, description, priority, status, due_date, notes, created_at')
        .eq('chef_id', tenantId)
        .like('auto_source', 'vendor-call-extraction:%')
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(8)
    ),
    safeQuery<any[]>(
      'remy communication approvals',
      db
        .from('approval_queue')
        .select(
          'id, action_type, title, preview, draft, risk_level, confidence_score, reason, status, created_at'
        )
        .eq('tenant_id', tenantId)
        .eq('domain', 'communication')
        .like('action_type', 'communication.remy_%')
        .in('status', ['pending', 'approved', 'rejected'])
        .order('created_at', { ascending: false })
        .limit(10)
    ),
    safeQuery<any[]>(
      'remy communication action audit',
      db
        .from('autonomy_actions')
        .select(
          'id, title, description, draft, risk_level, confidence_score, approval_reason, status, created_at, updated_at, executed_at, error_message'
        )
        .eq('tenant_id', tenantId)
        .eq('domain', 'communication')
        .like('action_type', 'communication.remy_%')
        .in('status', ['blocked', 'failed', 'executed'])
        .order('updated_at', { ascending: false })
        .limit(8)
    ),
    safeQuery<any[]>(
      'sms compliance clients',
      db
        .from('clients')
        .select('id, full_name, phone, preferred_contact_method, communication_preference')
        .eq('tenant_id', tenantId)
        .order('updated_at', { ascending: false })
        .limit(18)
    ),
    safeQuery<any[]>(
      'recent sms count rows',
      db
        .from('scheduled_messages')
        .select('id, recipient_id')
        .eq('chef_id', tenantId)
        .eq('channel', 'sms')
        .eq('status', 'sent')
        .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    ),
    safeQuery<any[]>(
      'sms audit rows',
      db
        .from('scheduled_messages')
        .select('id, recipient_id, channel, subject, status, error_message, scheduled_for, sent_at')
        .eq('chef_id', tenantId)
        .eq('channel', 'sms')
        .order('updated_at', { ascending: false })
        .limit(12)
    ),
    safeQuery<any>(
      'chef preferences for sms compliance',
      db
        .from('chef_preferences')
        .select(
          'notification_quiet_hours_enabled, notification_quiet_hours_start, notification_quiet_hours_end'
        )
        .eq('tenant_id', tenantId)
        .maybeSingle()
    ),
  ])

  const recentSmsCounts = countRecentSmsByRecipient(recentSmsRows)
  const quietHours = {
    enabled: !!preferences?.notification_quiet_hours_enabled,
    startTime: preferences?.notification_quiet_hours_start ?? null,
    endTime: preferences?.notification_quiet_hours_end ?? null,
    timezone: 'America/New_York',
  }

  const smsComplianceClients: SmsComplianceClientState[] = (smsClients ?? []).map((client) => {
    const policy = evaluateScheduledSmsPolicy({
      client: client as SmsPolicyClient,
      quietHours,
      recentSmsCount24h: recentSmsCounts.get(client.id) ?? 0,
    })

    return {
      id: client.id,
      name: client.full_name || 'Unnamed client',
      phone: client.phone ?? null,
      status: policy.status,
      reasons: policy.reasons,
      proof: policy.proof,
      href: `/clients/${client.id}`,
    }
  })

  const scheduledSmsItems = await Promise.all(
    (scheduledSms ?? []).map(async (message) => {
      const policy = await policyForScheduledSms(db, tenantId, message)
      return {
        id: `scheduled-sms-${message.id}`,
        type: 'scheduled_sms' as const,
        title: message.subject || 'Scheduled SMS',
        detail: `${formatDate(message.scheduled_for)} - ${policy.reasons.join('; ')}`,
        status: policy.status,
        href: '/communication/drafts',
        proofLinks: [{ label: 'Draft review', href: '/communication/drafts' }],
        policy,
      }
    })
  )

  const items: CommunicationControlPlaneItem[] = [
    ...(drafts ?? []).map((draft) => ({
      id: `draft-${draft.id}`,
      type: 'draft' as const,
      title: draft.subject || `${String(draft.channel).toUpperCase()} message awaiting review`,
      detail: `${String(draft.channel).toUpperCase()} scheduled for ${formatDate(draft.scheduled_for)}`,
      status: 'pending' as const,
      href: '/communication/drafts',
      proofLinks: [{ label: 'Draft review', href: '/communication/drafts' }],
    })),
    ...scheduledSmsItems,
    ...(failedSends ?? []).map((message) => ({
      id: `failed-${message.id}`,
      type: 'failed_send' as const,
      title: message.subject || `${String(message.channel).toUpperCase()} send failed`,
      detail: message.error_message || 'Delivery failed and needs recovery',
      status: 'failed' as const,
      href: '/communication/drafts',
      proofLinks: [{ label: 'Recovery queue', href: '/communication/drafts' }],
    })),
    ...(inboxItems ?? []).map((item) => ({
      id: `inbox-${item.communication_event_id}`,
      type: 'inbox' as const,
      title: item.sender_identity || 'Communication needs action',
      detail: item.raw_content || `${item.source} item needs triage`,
      status: 'actionable' as const,
      href: '/inbox',
      proofLinks: [{ label: 'Inbox thread', href: '/inbox' }],
    })),
    ...(vendorActionApprovals ?? []).map((item) => ({
      id: `vendor-action-approval-${item.id}`,
      type: 'vendor_call' as const,
      title: item.title || 'Vendor call action needs review',
      detail:
        item.reason ||
        item.preview ||
        `Confidence ${Math.round(Number(item.confidence_score ?? 0) * 100)}%`,
      status: 'pending' as const,
      href: '/communication/vendor-actions',
      proofLinks: [{ label: 'Review action', href: '/communication/vendor-actions' }],
    })),
    ...(vendorActionTasks ?? []).map((task) => ({
      id: `vendor-action-task-${task.id}`,
      type: 'vendor_call' as const,
      title: task.title || 'Vendor call task',
      detail: task.description || task.notes || 'Post-call vendor action with transcript proof',
      status: 'actionable' as const,
      href: '/communication/vendor-actions',
      proofLinks: [
        { label: 'Vendor actions', href: '/communication/vendor-actions' },
        { label: 'Task board', href: '/tasks' },
      ],
    })),
    ...(remyCommunicationApprovals ?? []).map((approval) => {
      const draft = remyDraftFromApprovalRow(approval)
      const primaryEvidence = draft.sourceEvidence[0]
      return {
        id: `remy-communication-${approval.id}`,
        type: 'remy_draft' as const,
        title: approval.title || 'Remy communication draft',
        detail:
          approval.reason ||
          `${draft.trigger}: ${draft.policyReason || 'Chef approval required before send.'}`,
        status:
          approval.status === 'pending'
            ? ('pending' as const)
            : approval.status === 'rejected'
              ? ('blocked' as const)
              : ('actionable' as const),
        href: '/communication/remy-approvals',
        proofLinks: [
          { label: 'Review Remy draft', href: '/communication/remy-approvals' },
          ...(primaryEvidence
            ? [{ label: primaryEvidence.label, href: remyEvidenceHref(primaryEvidence) }]
            : []),
        ],
      }
    }),
    ...(remyCommunicationActions ?? []).map((action) => {
      const audit = mapRemyActionAuditRow(action)
      const primaryEvidence = audit.draft.sourceEvidence[0]
      return {
        id: `remy-communication-action-${action.id}`,
        type: 'remy_draft' as const,
        title: audit.title,
        detail: audit.reason || audit.preview || 'Remy communication audit row',
        status:
          audit.status === 'blocked'
            ? ('blocked' as const)
            : audit.status === 'failed'
              ? ('failed' as const)
              : ('actionable' as const),
        href: '/communication/remy-approvals',
        proofLinks: [
          { label: 'Remy audit', href: '/communication/remy-approvals' },
          ...(primaryEvidence
            ? [{ label: primaryEvidence.label, href: remyEvidenceHref(primaryEvidence) }]
            : []),
        ],
      }
    }),
    ...(supplierCalls ?? []).map((call) => ({
      id: `supplier-call-${call.id}`,
      type: 'vendor_call' as const,
      title: `${call.vendor_name || 'Vendor'} call outcome`,
      detail: vendorLoopDetail(call.ingredient_name ?? 'Supplier call', {
        id: call.id,
        sourceType: 'supplier_call',
        vendorId: call.vendor_id,
        vendorName: call.vendor_name,
        ingredientName: call.ingredient_name,
        summary: [call.result, call.price_quoted, call.quantity_available, call.status]
          .filter(Boolean)
          .join('. '),
        transcript: call.speech_transcript,
        recordingUrl: call.recording_url,
        status: call.status,
        createdAt: call.created_at,
        updatedAt: call.updated_at,
        extractedData: {
          availability: call.result,
          price_quoted: call.price_quoted,
          quantity_available: call.quantity_available,
        },
      }),
      status: vendorLoopItemStatus(
        evaluateVendorCallLoop({
          callId: call.id,
          sourceType: 'supplier_call',
          vendorName: call.vendor_name,
          vendorId: call.vendor_id,
          ingredientName: call.ingredient_name,
          summary: [call.result, call.price_quoted, call.quantity_available, call.status]
            .filter(Boolean)
            .join('. '),
          transcript: call.speech_transcript,
          recordingUrl: call.recording_url,
          extractedData: {
            availability: call.result,
            price_quoted: call.price_quoted,
            quantity_available: call.quantity_available,
          },
          metadata: { status: call.status },
        }).status
      ),
      href: '/communication/vendor-actions',
      proofLinks: [
        { label: 'Extract actions', href: '/communication/vendor-actions' },
        ...(call.recording_url ? [{ label: 'Recording', href: call.recording_url }] : []),
      ],
    })),
    ...(aiCalls ?? []).map((call) => ({
      id: `ai-call-${call.id}`,
      type: 'vendor_call' as const,
      title: `${call.contact_name || call.role || 'Vendor'} call outcome`,
      detail: vendorLoopDetail(call.subject ?? 'AI vendor call', {
        id: call.id,
        sourceType: 'ai_call',
        vendorId: call.vendor_id,
        vendorName: call.contact_name,
        eventId: call.event_id,
        ingredientName: call.subject,
        summary: [call.result, call.status].filter(Boolean).join('. '),
        transcript: call.full_transcript,
        recordingUrl: call.recording_url,
        status: call.status,
        createdAt: call.created_at,
        updatedAt: call.updated_at,
        extractedData: call.extracted_data,
      }),
      status: vendorLoopItemStatus(
        evaluateVendorCallLoop({
          callId: call.id,
          sourceType: 'ai_call',
          vendorName: call.contact_name,
          vendorId: call.vendor_id,
          eventId: call.event_id,
          ingredientName: call.subject,
          summary: [call.result, call.status].filter(Boolean).join('. '),
          transcript: call.full_transcript,
          recordingUrl: call.recording_url,
          extractedData: call.extracted_data,
          metadata: { status: call.status },
        }).status
      ),
      href: '/communication/vendor-actions',
      proofLinks: [
        { label: 'Extract actions', href: '/communication/vendor-actions' },
        ...(call.recording_url ? [{ label: 'Recording', href: call.recording_url }] : []),
      ],
    })),
  ].slice(0, 36)

  return {
    counts: {
      pending: items.filter((item) => item.status === 'pending' || item.status === 'allowed')
        .length,
      blocked: items.filter((item) => item.status === 'blocked' || item.status === 'delayed')
        .length,
      failed: items.filter((item) => item.status === 'failed').length,
      actionable: items.filter((item) => item.status === 'actionable').length,
    },
    smsCompliance: {
      eligible: smsComplianceClients.filter((client) => client.status === 'allowed').length,
      blocked: smsComplianceClients.filter((client) => client.status === 'blocked').length,
      paused: smsComplianceClients.filter((client) => client.proof.channelPaused).length,
      missingConsent: smsComplianceClients.filter((client) => !client.proof.hasConsent).length,
      invalidPhone: smsComplianceClients.filter(
        (client) => !client.proof.hasPhone || !client.proof.phoneValid
      ).length,
      quietHours: smsComplianceClients.some((client) => client.proof.quietHoursActive),
      clients: smsComplianceClients,
    },
    channelHealth: buildSmsChannelHealth(failedSends),
    smsAuditLog: buildSmsAuditLog(smsAuditRows),
    items,
  }
}
