'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { recordLearningSignal } from '@/lib/autonomy/learning'
import {
  extractVendorCallActions,
  summarizeVendorExtractedAction,
  type VendorActionSourceType,
  type VendorCallActionExtractionInput,
  type VendorExtractedAction,
} from '@/lib/calling/vendor-action-extraction'

const AUTO_SOURCE_PREFIX = 'post_call_vendor_action_extraction'

export async function extractVendorActionsForCall(formData: FormData) {
  const sourceType = String(formData.get('sourceType') ?? '') as VendorActionSourceType
  const callId = String(formData.get('callId') ?? '')
  if (!callId || !['supplier_call', 'ai_call', 'scheduled_call'].includes(sourceType)) {
    return
  }

  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()
  const source = await getScopedVendorCallSource(db, tenantId, sourceType, callId)

  if (!source) {
    return
  }

  const actions = extractVendorCallActions(source)
  let created = 0
  let queued = 0
  let skipped = 0

  for (const action of actions) {
    if (await hasExistingExtraction(db, tenantId, action.idempotencyKey)) {
      skipped++
      continue
    }

    if (action.requiresApproval) {
      await queueActionForChefApproval(db, tenantId, action)
      queued++
    } else {
      await createTaskFromExtractedAction(db, tenantId, action)
      created++
    }
  }

  revalidatePath('/communication')
  revalidatePath('/communication/vendor-actions')
  revalidatePath('/tasks')

  void created
  void queued
  void skipped
}

export async function approveVendorExtractedAction(formData: FormData) {
  const approvalId = String(formData.get('approvalId') ?? '')
  if (!approvalId) return

  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()
  const approval = await getScopedApproval(db, tenantId, approvalId)
  if (!approval || approval.status !== 'pending') return

  const action = parseActionFromApproval(approval)
  if (!action) return

  const editedTitle = String(formData.get('taskTitle') ?? '').trim()
  const editedDetail = String(formData.get('taskDescription') ?? '').trim()
  const editedAction = {
    ...action,
    taskTitle: editedTitle || action.taskTitle,
    taskDescription: editedDetail || action.taskDescription,
  }

  const taskId = await createTaskFromExtractedAction(db, tenantId, editedAction)
  const reviewedAt = new Date().toISOString()

  await db
    .from('approval_queue')
    .update({
      status: 'approved',
      reviewed_at: reviewedAt,
      reviewed_by: user.id,
      draft: buildApprovalDraft(editedAction),
      preview: summarizeVendorExtractedAction(editedAction),
    })
    .eq('id', approvalId)
    .eq('tenant_id', tenantId)

  await db
    .from('autonomy_actions')
    .update({
      status: 'executed',
      executed_at: reviewedAt,
      updated_at: reviewedAt,
      draft: buildApprovalDraft(editedAction),
    })
    .eq('id', approval.autonomy_action_id)
    .eq('tenant_id', tenantId)

  await safeRecordLearning({
    tenantId,
    actionId: approval.autonomy_action_id,
    approvalId,
    actionType: approval.action_type,
    outcome: editedTitle || editedDetail ? ('approved_with_edits' as const) : ('approved' as const),
    confidenceScore: Number(approval.confidence_score ?? action.confidence),
    metadata: { createdTaskId: taskId, sourceCallId: action.evidence.callId },
  })

  revalidatePath('/communication')
  revalidatePath('/communication/vendor-actions')
  revalidatePath('/tasks')
}

export async function dismissVendorExtractedAction(formData: FormData) {
  const approvalId = String(formData.get('approvalId') ?? '')
  const reason = String(formData.get('reason') ?? '').trim()
  if (!approvalId) return

  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()
  const approval = await getScopedApproval(db, tenantId, approvalId)
  if (!approval || approval.status !== 'pending') return

  const reviewedAt = new Date().toISOString()
  await db
    .from('approval_queue')
    .update({
      status: 'rejected',
      reviewed_at: reviewedAt,
      reviewed_by: user.id,
      rejection_reason: reason || 'Dismissed from vendor action review.',
    })
    .eq('id', approvalId)
    .eq('tenant_id', tenantId)

  await db
    .from('autonomy_actions')
    .update({ status: 'rejected', updated_at: reviewedAt })
    .eq('id', approval.autonomy_action_id)
    .eq('tenant_id', tenantId)

  await safeRecordLearning({
    tenantId,
    actionId: approval.autonomy_action_id,
    approvalId,
    actionType: approval.action_type,
    outcome: 'rejected',
    confidenceScore: Number(approval.confidence_score ?? 0),
    metadata: { reason },
  })

  revalidatePath('/communication')
  revalidatePath('/communication/vendor-actions')
}

export async function mergeDuplicateVendorExtractedAction(formData: FormData) {
  const approvalId = String(formData.get('approvalId') ?? '')
  const duplicateOfTaskId = String(formData.get('duplicateOfTaskId') ?? '').trim()
  if (!approvalId) return

  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()
  const approval = await getScopedApproval(db, tenantId, approvalId)
  if (!approval || approval.status !== 'pending') return

  if (duplicateOfTaskId) {
    const { data: task } = await db
      .from('tasks')
      .select('id')
      .eq('id', duplicateOfTaskId)
      .eq('chef_id', tenantId)
      .maybeSingle()
    if (!task) return
  }

  const reviewedAt = new Date().toISOString()
  await db
    .from('approval_queue')
    .update({
      status: 'cancelled',
      reviewed_at: reviewedAt,
      reviewed_by: user.id,
      rejection_reason: duplicateOfTaskId
        ? `Merged into task ${duplicateOfTaskId}.`
        : 'Merged as duplicate extracted vendor action.',
    })
    .eq('id', approvalId)
    .eq('tenant_id', tenantId)

  await db
    .from('autonomy_actions')
    .update({
      status: 'blocked',
      updated_at: reviewedAt,
      error_message: duplicateOfTaskId
        ? `Merged into task ${duplicateOfTaskId}.`
        : 'Merged as duplicate.',
    })
    .eq('id', approval.autonomy_action_id)
    .eq('tenant_id', tenantId)

  await safeRecordLearning({
    tenantId,
    actionId: approval.autonomy_action_id,
    approvalId,
    actionType: approval.action_type,
    outcome: 'rejected',
    confidenceScore: Number(approval.confidence_score ?? 0),
    metadata: { duplicateOfTaskId: duplicateOfTaskId || null, mergeDuplicate: true },
  })

  revalidatePath('/communication')
  revalidatePath('/communication/vendor-actions')
}

export async function getVendorActionExtractionWorkbench() {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()
  const [sources, pendingApprovals, generatedTasks] = await Promise.all([
    listVendorCallSources(db, tenantId),
    listVendorExtractionApprovals(db, tenantId),
    listVendorExtractionTasks(db, tenantId),
  ])

  return {
    sources,
    pendingApprovals,
    generatedTasks,
  }
}

async function getScopedVendorCallSource(
  db: any,
  tenantId: string,
  sourceType: VendorActionSourceType,
  callId: string
): Promise<VendorCallActionExtractionInput | null> {
  if (sourceType === 'supplier_call') {
    const { data } = await db
      .from('supplier_calls')
      .select(
        'id, vendor_id, vendor_name, ingredient_name, result, price_quoted, quantity_available, speech_transcript, recording_url, status, error_message, created_at, updated_at'
      )
      .eq('id', callId)
      .eq('chef_id', tenantId)
      .maybeSingle()

    if (!data) return null
    return {
      callId: data.id,
      sourceType,
      vendorName: data.vendor_name,
      vendorId: data.vendor_id,
      ingredientName: data.ingredient_name,
      summary: [data.result, data.price_quoted, data.quantity_available, data.error_message]
        .filter(Boolean)
        .join('. '),
      transcript: data.speech_transcript,
      recordingUrl: data.recording_url,
      extractedData: {
        availability: data.result,
        price_quoted: data.price_quoted,
        quantity_available: data.quantity_available,
      },
      attemptedAt: data.updated_at ?? data.created_at,
      metadata: { status: data.status, createdAt: data.created_at, updatedAt: data.updated_at },
    }
  }

  if (sourceType === 'ai_call') {
    const { data } = await db
      .from('ai_calls')
      .select(
        'id, role, contact_name, contact_type, vendor_id, event_id, subject, status, result, full_transcript, extracted_data, action_log, recording_url, error_message, created_at, updated_at'
      )
      .eq('id', callId)
      .eq('chef_id', tenantId)
      .maybeSingle()

    if (!data) return null
    return {
      callId: data.id,
      sourceType,
      vendorName: data.contact_name,
      vendorId: data.vendor_id,
      eventId: data.event_id,
      ingredientName: data.subject,
      summary: [data.result, data.error_message].filter(Boolean).join('. '),
      transcript: data.full_transcript,
      recordingUrl: data.recording_url,
      extractedData: data.extracted_data,
      attemptedAt: data.updated_at ?? data.created_at,
      metadata: {
        role: data.role,
        contactType: data.contact_type,
        status: data.status,
        actionLog: data.action_log,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  }

  const { data } = await db
    .from('scheduled_calls')
    .select(
      'id, call_type, title, contact_name, contact_company, event_id, outcome_summary, call_notes, next_action, status, completed_at, updated_at'
    )
    .eq('id', callId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!data) return null
  return {
    callId: data.id,
    sourceType,
    vendorName: data.contact_company || data.contact_name,
    eventId: data.event_id,
    summary: [data.title, data.outcome_summary, data.next_action].filter(Boolean).join('. '),
    transcript: data.call_notes,
    attemptedAt: data.completed_at ?? data.updated_at,
    metadata: {
      callType: data.call_type,
      status: data.status,
      completedAt: data.completed_at,
      updatedAt: data.updated_at,
    },
  }
}

async function hasExistingExtraction(db: any, tenantId: string, idempotencyKey: string) {
  const [taskResult, actionResult] = await Promise.all([
    db
      .from('tasks')
      .select('id')
      .eq('chef_id', tenantId)
      .eq('auto_source', idempotencyKey)
      .maybeSingle(),
    db
      .from('autonomy_actions')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('dedup_key', idempotencyKey)
      .maybeSingle(),
  ])

  return !!taskResult.data || !!actionResult.data
}

async function createTaskFromExtractedAction(
  db: any,
  tenantId: string,
  action: VendorExtractedAction
) {
  const { data: existing } = await db
    .from('tasks')
    .select('id')
    .eq('chef_id', tenantId)
    .eq('auto_source', action.idempotencyKey)
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const { data, error } = await db
    .from('tasks')
    .insert({
      chef_id: tenantId,
      title: action.taskTitle,
      description: action.taskDescription,
      due_date: action.suggestedDueDate,
      due_time: null,
      priority: action.priority,
      status: 'pending',
      notes: buildTaskEvidenceNotes(action),
      recurring_rule: null,
      time_estimate_minutes: 15,
      auto_source: action.idempotencyKey,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create vendor action task: ${error.message}`)
  }

  return data.id as string
}

async function queueActionForChefApproval(
  db: any,
  tenantId: string,
  action: VendorExtractedAction
) {
  const draft = buildApprovalDraft(action)
  const entityRefs = buildEntityRefs(action)
  const { data: existing } = await db
    .from('autonomy_actions')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('dedup_key', action.idempotencyKey)
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const { data: autonomyAction, error: actionError } = await db
    .from('autonomy_actions')
    .insert({
      tenant_id: tenantId,
      domain: 'vendor',
      action_type: `post_call_${action.actionType}`,
      title: action.title,
      description: action.detail,
      risk_level: action.conflictDetected ? 'high' : 'medium',
      confidence_score: action.confidence,
      draft_method: 'formula',
      draft,
      source: AUTO_SOURCE_PREFIX,
      situation: {
        source: AUTO_SOURCE_PREFIX,
        signalType: action.actionType,
        payload: action.payload,
        evidence: action.evidence,
      },
      entity_refs: entityRefs,
      dedup_key: action.idempotencyKey,
      status: 'queued',
      approval_decision: 'queue_for_approval',
      approval_reason: action.conflictDetected
        ? 'Conflicting vendor call extraction requires chef review.'
        : 'Low-confidence vendor call extraction requires chef review.',
    })
    .select('id')
    .single()

  if (actionError) {
    throw new Error(`Failed to queue vendor action: ${actionError.message}`)
  }

  const { error: approvalError } = await db.from('approval_queue').insert({
    tenant_id: tenantId,
    autonomy_action_id: autonomyAction.id,
    status: 'pending',
    domain: 'vendor',
    action_type: `post_call_${action.actionType}`,
    title: action.title,
    preview: summarizeVendorExtractedAction(action),
    draft,
    risk_level: action.conflictDetected ? 'high' : 'medium',
    confidence_score: action.confidence,
    reason: action.conflictDetected
      ? 'Transcript contains conflicting vendor outcome signals.'
      : 'Extraction confidence is below the safe task-creation threshold.',
    entity_refs: entityRefs,
  })

  if (approvalError) {
    throw new Error(`Failed to queue vendor approval: ${approvalError.message}`)
  }

  return autonomyAction.id as string
}

function buildTaskEvidenceNotes(action: VendorExtractedAction) {
  const evidence = action.evidence
  return [
    'Post-call vendor action extraction.',
    `Action: ${action.actionType}`,
    `Confidence: ${action.confidence.toFixed(2)}`,
    `Source call: ${evidence.sourceType}:${evidence.callId}`,
    evidence.recordingUrl ? `Recording: ${evidence.recordingUrl}` : 'Recording: not available',
    `Transcript evidence: ${evidence.transcriptSegment}`,
    `Source proof: ${JSON.stringify({
      callId: evidence.callId,
      sourceType: evidence.sourceType,
      vendorId: evidence.vendorId,
      vendorName: evidence.vendorName,
      eventId: evidence.eventId,
      menuId: evidence.menuId,
      ingredientId: evidence.ingredientId,
      ingredientName: evidence.ingredientName,
      callMetadata: evidence.callMetadata,
      payload: action.payload,
    })}`,
  ].join('\n')
}

function buildApprovalDraft(action: VendorExtractedAction) {
  return {
    summary: action.title,
    preview: summarizeVendorExtractedAction(action),
    payload: {
      extractedAction: action,
      taskTitle: action.taskTitle,
      taskDescription: action.taskDescription,
    },
    reversible: true,
    evidence: [
      {
        label: 'Transcript segment',
        value: action.evidence.transcriptSegment,
        confidence: action.confidence,
      },
      { label: 'Source call', value: `${action.evidence.sourceType}:${action.evidence.callId}` },
      ...(action.evidence.recordingUrl
        ? [{ label: 'Recording', value: action.evidence.recordingUrl }]
        : []),
    ],
    nextStepLabel: 'Create reviewed task',
  }
}

function buildEntityRefs(action: VendorExtractedAction) {
  return [
    { type: action.evidence.sourceType, id: action.evidence.callId, label: 'Source call' },
    action.evidence.vendorId
      ? {
          type: 'vendor',
          id: action.evidence.vendorId,
          label: action.evidence.vendorName ?? 'Vendor',
        }
      : null,
    action.evidence.eventId ? { type: 'event', id: action.evidence.eventId, label: 'Event' } : null,
    action.evidence.ingredientId
      ? {
          type: 'ingredient',
          id: action.evidence.ingredientId,
          label: action.evidence.ingredientName ?? 'Ingredient',
        }
      : null,
  ].filter(Boolean)
}

function parseActionFromApproval(approval: any): VendorExtractedAction | null {
  const action = approval?.draft?.payload?.extractedAction
  if (!action?.idempotencyKey || !action?.evidence?.callId) return null
  return action as VendorExtractedAction
}

async function getScopedApproval(db: any, tenantId: string, approvalId: string) {
  const { data } = await db
    .from('approval_queue')
    .select('*')
    .eq('id', approvalId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  return data ?? null
}

async function listVendorCallSources(db: any, tenantId: string) {
  const [supplier, aiCalls, scheduled] = await Promise.all([
    db
      .from('supplier_calls')
      .select('id, vendor_name, ingredient_name, status, result, created_at, recording_url')
      .eq('chef_id', tenantId)
      .in('status', ['completed', 'failed', 'no_answer', 'busy'])
      .order('created_at', { ascending: false })
      .limit(10),
    db
      .from('ai_calls')
      .select('id, role, contact_name, subject, status, event_id, created_at, recording_url')
      .eq('chef_id', tenantId)
      .in('status', ['completed', 'failed', 'no_answer', 'busy', 'voicemail'])
      .order('created_at', { ascending: false })
      .limit(10),
    db
      .from('scheduled_calls')
      .select(
        'id, title, contact_name, contact_company, call_type, status, completed_at, updated_at'
      )
      .eq('tenant_id', tenantId)
      .eq('call_type', 'vendor_supplier')
      .eq('status', 'completed')
      .order('updated_at', { ascending: false })
      .limit(10),
  ])

  return [
    ...((supplier.data ?? []) as any[]).map((call) => ({
      id: call.id,
      sourceType: 'supplier_call' as const,
      label: `${call.vendor_name || 'Vendor'} - ${call.ingredient_name || 'supplier call'}`,
      detail: `${call.status}${call.result ? ` / ${call.result}` : ''}`,
      createdAt: call.created_at,
      hasRecording: !!call.recording_url,
    })),
    ...((aiCalls.data ?? []) as any[]).map((call) => ({
      id: call.id,
      sourceType: 'ai_call' as const,
      label: `${call.contact_name || call.role || 'Vendor'} - ${call.subject || 'call'}`,
      detail: call.status,
      createdAt: call.created_at,
      hasRecording: !!call.recording_url,
    })),
    ...((scheduled.data ?? []) as any[]).map((call) => ({
      id: call.id,
      sourceType: 'scheduled_call' as const,
      label: `${call.contact_company || call.contact_name || 'Vendor'} - ${call.title || 'scheduled call'}`,
      detail: call.status,
      createdAt: call.completed_at ?? call.updated_at,
      hasRecording: false,
    })),
  ]
    .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
    .slice(0, 18)
}

async function listVendorExtractionApprovals(db: any, tenantId: string) {
  const { data } = await db
    .from('approval_queue')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('domain', 'vendor')
    .like('action_type', 'post_call_%')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20)

  return data ?? []
}

async function listVendorExtractionTasks(db: any, tenantId: string) {
  const { data } = await db
    .from('tasks')
    .select('id, title, description, priority, status, due_date, notes, created_at')
    .eq('chef_id', tenantId)
    .like('auto_source', 'vendor-call-extraction:%')
    .order('created_at', { ascending: false })
    .limit(20)

  return data ?? []
}

async function safeRecordLearning(input: {
  tenantId: string
  actionId: string
  approvalId: string
  actionType: string
  outcome: 'approved' | 'approved_with_edits' | 'rejected'
  confidenceScore: number
  metadata?: Record<string, unknown>
}) {
  try {
    await recordLearningSignal({
      tenantId: input.tenantId,
      actionId: input.actionId,
      approvalId: input.approvalId,
      domain: 'vendor',
      actionType: input.actionType,
      outcome: input.outcome,
      confidenceScore: input.confidenceScore,
      metadata: input.metadata,
    })
  } catch (error) {
    console.error('[vendor-action-extraction] learning signal failed:', error)
  }
}
