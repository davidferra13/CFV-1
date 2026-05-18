import { createServerClient } from '@/lib/db/server'
import {
  buildDefaultAutonomyPreferences,
  inferRiskLevel,
  normalizeConfidence,
  normalizeUrgency,
  resolveApprovalGate,
} from '@/lib/autonomy/approval-router'
import { recordLearningSignal } from '@/lib/autonomy/learning'
import type {
  ApprovalGate,
  AutonomyAction,
  AutonomyDraft,
  AutonomyExecutor,
  AutonomyPreferences,
  AutonomySituation,
  DetectSituationInput,
  ExecutionResult,
  LearningOutcome,
  ProcessSituationOptions,
} from '@/lib/autonomy/types'

export function detectSituation(input: DetectSituationInput): AutonomySituation {
  const urgency = normalizeUrgency(input.urgency ?? 1)
  const confidenceScore = normalizeConfidence(input.confidenceScore ?? 0.75)

  return {
    tenantId: input.tenantId,
    domain: input.domain ?? 'general',
    source: input.source,
    signalType: input.signalType,
    title: input.title.trim(),
    detail: input.detail.trim(),
    urgency,
    confidenceScore,
    entityRefs: input.entityRefs ?? [],
    payload: input.payload ?? {},
    detectedAt: new Date().toISOString(),
  }
}

export function draftAction(situation: AutonomySituation): AutonomyAction {
  const riskLevel = inferRiskLevel({
    domain: situation.domain,
    signalType: situation.signalType,
    urgency: situation.urgency,
    actionType: situation.signalType,
    reversible: true,
  })

  const draft: AutonomyDraft = {
    summary: situation.title,
    preview: buildDeterministicPreview(situation),
    payload: {
      ...situation.payload,
      signalType: situation.signalType,
      source: situation.source,
    },
    reversible: riskLevel === 'low',
    evidence: [
      {
        label: 'Source',
        value: situation.source,
      },
      {
        label: 'Confidence',
        value: situation.confidenceScore.toFixed(2),
        confidence: situation.confidenceScore,
      },
    ],
    nextStepLabel: riskLevel === 'low' ? 'Execute action' : 'Review action',
  }

  return {
    tenantId: situation.tenantId,
    domain: situation.domain,
    actionType: situation.signalType,
    title: situation.title,
    description: situation.detail,
    riskLevel,
    confidenceScore: situation.confidenceScore,
    draftMethod: 'template',
    draft,
    source: situation.source,
    situation,
    entityRefs: situation.entityRefs,
    dedupKey: buildDedupKey(situation),
    status: 'drafted',
    createdAt: new Date().toISOString(),
  }
}

export function draftActionWithAiEnhancementPlaceholder(
  situation: AutonomySituation
): AutonomyAction {
  return draftAction(situation)
}

export function routeToApproval(
  action: AutonomyAction,
  preferences: AutonomyPreferences
): ApprovalGate {
  return resolveApprovalGate(action, preferences)
}

export async function processSituation(
  input: DetectSituationInput,
  options: ProcessSituationOptions = {}
): Promise<ExecutionResult> {
  const situation = detectSituation(input)
  const action = draftAction(situation)
  const preferences = options.preferences ?? buildDefaultAutonomyPreferences(situation.tenantId)
  const gate = routeToApproval(action, preferences)
  const persistedAction = await persistAction(action, gate)

  if (gate.decision === 'block' || gate.decision === 'manual_only') {
    await updateActionStatus(persistedAction.id as string, persistedAction.tenantId, 'blocked')
    await recordOutcome(persistedAction, gate.decision === 'block' ? 'failed' : 'rejected', {
      gateReason: gate.reason,
    })

    return {
      status: 'blocked',
      actionId: persistedAction.id,
      message: gate.reason,
      gate,
    }
  }

  if (gate.decision === 'queue_for_approval') {
    const approvalId = await queueForApproval(persistedAction, gate)
    await updateActionStatus(persistedAction.id as string, persistedAction.tenantId, 'queued')

    return {
      status: 'queued_for_approval',
      actionId: persistedAction.id,
      approvalId,
      message: 'Action queued for chef approval.',
      gate,
    }
  }

  return executeAction(persistedAction, gate, options.executor)
}

export async function executeAction(
  action: AutonomyAction,
  gate: ApprovalGate,
  executor?: AutonomyExecutor
): Promise<ExecutionResult> {
  if (!action.id) {
    throw new Error('Cannot execute an autonomy action before it is persisted.')
  }

  if (!executor) {
    await updateActionStatus(action.id, action.tenantId, 'awaiting_executor')
    return {
      status: 'awaiting_executor',
      actionId: action.id,
      message: 'Action passed autonomy gates but no domain executor was registered.',
      gate,
    }
  }

  const result = await executor.execute(action)

  if (!result.success) {
    await updateActionStatus(action.id, action.tenantId, 'failed', result.error)
    await recordOutcome(action, 'failed', { error: result.error })

    return {
      status: 'failed',
      actionId: action.id,
      message: result.message,
      error: result.error,
      gate,
    }
  }

  await updateActionStatus(action.id, action.tenantId, 'executed')
  await recordOutcome(action, 'auto_executed')

  return {
    status: 'executed',
    actionId: action.id,
    message: result.message,
    gate,
  }
}

export async function recordOutcome(
  action: AutonomyAction,
  outcome: LearningOutcome,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  await recordLearningSignal({
    tenantId: action.tenantId,
    actionId: action.id,
    domain: action.domain,
    actionType: action.actionType,
    outcome,
    confidenceScore: action.confidenceScore,
    metadata,
  })
}

async function persistAction(action: AutonomyAction, gate: ApprovalGate): Promise<AutonomyAction> {
  const db: any = createServerClient()

  const { data, error } = await db
    .from('autonomy_actions')
    .insert({
      tenant_id: action.tenantId,
      domain: action.domain,
      action_type: action.actionType,
      title: action.title,
      description: action.description,
      risk_level: action.riskLevel,
      confidence_score: action.confidenceScore,
      draft_method: action.draftMethod,
      draft: action.draft,
      source: action.source,
      situation: action.situation,
      entity_refs: action.entityRefs,
      dedup_key: action.dedupKey,
      status: action.status,
      approval_decision: gate.decision,
      approval_reason: gate.reason,
    })
    .select('id, created_at')
    .single()

  if (error) {
    throw new Error(`Failed to persist autonomy action: ${error.message}`)
  }

  return {
    ...action,
    id: data.id,
    createdAt: data.created_at ?? action.createdAt,
  }
}

async function queueForApproval(action: AutonomyAction, gate: ApprovalGate): Promise<string> {
  if (!action.id) {
    throw new Error('Cannot queue an autonomy action before it is persisted.')
  }

  const db: any = createServerClient()
  const { data, error } = await db
    .from('approval_queue')
    .insert({
      tenant_id: action.tenantId,
      autonomy_action_id: action.id,
      status: 'pending',
      domain: action.domain,
      action_type: action.actionType,
      title: action.title,
      preview: action.draft.preview,
      draft: action.draft,
      risk_level: action.riskLevel,
      confidence_score: action.confidenceScore,
      reason: gate.reason,
      entity_refs: action.entityRefs,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to queue autonomy approval: ${error.message}`)
  }

  return data.id
}

async function updateActionStatus(
  actionId: string,
  tenantId: string,
  status: AutonomyAction['status'],
  errorMessage?: string
): Promise<void> {
  const db: any = createServerClient()
  const payload: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === 'executed') payload.executed_at = new Date().toISOString()
  if (errorMessage) payload.error_message = errorMessage

  const { error } = await db
    .from('autonomy_actions')
    .update(payload)
    .eq('id', actionId)
    .eq('tenant_id', tenantId)

  if (error) {
    throw new Error(`Failed to update autonomy action status: ${error.message}`)
  }
}

function buildDeterministicPreview(situation: AutonomySituation): string {
  const entityLabels = situation.entityRefs
    .map((entity) => entity.label ?? `${entity.type}:${entity.id}`)
    .filter(Boolean)
    .join(', ')

  const scope = entityLabels ? ` Related records: ${entityLabels}.` : ''
  return `${situation.detail}${scope}`
}

function buildDedupKey(situation: AutonomySituation): string {
  const entities = situation.entityRefs
    .map((entity) => `${entity.type}:${entity.id}`)
    .sort()
    .join('|')

  return [situation.domain, situation.source, situation.signalType, entities || 'none'].join(':')
}
