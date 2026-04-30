import { buildPostCallExecutionPlan } from '@/lib/calling/post-call-execution'
import { buildVoiceSessionLedger } from '@/lib/calling/voice-session-ledger'
import { normalizeVoiceCall } from '@/lib/calling/voice-ops-report'
import type { VoiceCallLike, VoicePostCallAction } from '@/lib/calling/voice-ops-types'

export interface VoiceOpsRecordResult {
  success: boolean
  eventCount: number
  actionCount: number
  error?: string
}

export async function recordVoiceOpsForAiCallWithDb(params: {
  db: any
  chefId: string
  aiCallId: string
  source?: string
}): Promise<VoiceOpsRecordResult> {
  if (!params.aiCallId?.trim()) {
    return { success: false, eventCount: 0, actionCount: 0, error: 'AI call id is required.' }
  }

  const { data: aiCall, error: callError } = await params.db
    .from('ai_calls')
    .select(
      'id, direction, role, contact_phone, contact_name, contact_type, subject, status, result, full_transcript, extracted_data, action_log, recording_url, duration_seconds, created_at, supplier_call_id'
    )
    .eq('id', params.aiCallId)
    .eq('chef_id', params.chefId)
    .single()

  if (callError || !aiCall) {
    return {
      success: false,
      eventCount: 0,
      actionCount: 0,
      error: callError?.message ?? 'AI call not found.',
    }
  }

  const call = normalizeVoiceCall(aiCall)
  if (!call) {
    return {
      success: false,
      eventCount: 0,
      actionCount: 0,
      error: 'AI call data could not be normalized.',
    }
  }

  const source = params.source ?? 'manual_record_action'
  const eventCount = await insertMissingSessionEvents(
    params.db,
    params.chefId,
    params.aiCallId,
    call,
    source
  )
  const actionCount = await insertMissingPostCallActions(
    params.db,
    params.chefId,
    params.aiCallId,
    call,
    source
  )

  return { success: true, eventCount, actionCount }
}

async function insertMissingSessionEvents(
  db: any,
  chefId: string,
  aiCallId: string,
  call: VoiceCallLike,
  source: string
): Promise<number> {
  const { data: existingEvents, error: existingError } = await db
    .from('voice_session_events')
    .select('event_type')
    .eq('chef_id', chefId)
    .eq('ai_call_id', aiCallId)

  if (existingError) throw existingError

  const existingTypes = new Set((existingEvents ?? []).map((event: any) => event.event_type))
  const ledger = buildVoiceSessionLedger(call).filter(
    (event) => !existingTypes.has(event.eventType)
  )
  if (ledger.length === 0) return 0

  const { error } = await db.from('voice_session_events').insert(
    ledger.map((event) => ({
      chef_id: chefId,
      ai_call_id: aiCallId,
      supplier_call_id: call.supplierCallId ?? null,
      event_type: event.eventType,
      sequence: event.sequence,
      occurred_at: event.occurredAt,
      payload: {
        ...event.payload,
        voiceOpsSource: source,
      },
    }))
  )

  if (error) throw error
  return ledger.length
}

async function insertMissingPostCallActions(
  db: any,
  chefId: string,
  aiCallId: string,
  call: VoiceCallLike,
  source: string
): Promise<number> {
  const { data: existingActions, error: existingError } = await db
    .from('voice_post_call_actions')
    .select('action_type, label')
    .eq('chef_id', chefId)
    .eq('ai_call_id', aiCallId)

  if (existingError) throw existingError

  const existingKeys = new Set(
    (existingActions ?? []).map((action: any) => `${action.action_type}:${action.label}`)
  )
  const actionable = buildPostCallExecutionPlan(call).actions.filter(
    (action) =>
      action.type !== 'link_call_record' && !existingKeys.has(`${action.type}:${action.label}`)
  )
  if (actionable.length === 0) return 0

  const { error } = await db.from('voice_post_call_actions').insert(
    actionable.map((action: VoicePostCallAction) => ({
      chef_id: chefId,
      ai_call_id: aiCallId,
      supplier_call_id: call.supplierCallId ?? null,
      action_type: action.type,
      status: action.status === 'needs_review' ? 'needs_review' : 'planned',
      urgency: action.urgency,
      label: action.label,
      detail: action.detail,
      target_type: action.targetType ?? null,
      target_id: action.targetId ?? null,
      metadata: {
        ...(action.metadata ?? {}),
        duplicateKey: `${action.type}:${action.label}`,
        evidenceReason: action.detail,
        voiceOpsSource: source,
      },
    }))
  )

  if (error) throw error
  return actionable.length
}
