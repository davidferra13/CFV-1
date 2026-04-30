import { buildPostCallExecutionPlan } from '@/lib/calling/post-call-execution'
import type {
  VoiceCallLike,
  VoiceOpsReport,
  VoicePostCallAction,
  VoicePostCallActionEvidence,
} from '@/lib/calling/voice-ops-types'

const ACTIVE_STATUSES = new Set(['queued', 'ringing', 'in_progress'])
const FAILED_STATUSES = new Set(['failed', 'busy', 'no_answer'])

export function buildVoiceOpsReport(
  rawCalls: unknown[],
  rawActions: unknown[] = [],
  rawEvents: unknown[] = []
): VoiceOpsReport {
  const calls = rawCalls.map(normalizeVoiceCall).filter((call): call is VoiceCallLike => !!call)
  const plans = calls.map(buildPostCallExecutionPlan)
  const events = rawEvents
    .map(normalizeVoiceSessionEvent)
    .filter((event): event is VoiceSessionEventLike => !!event)
  const persistedActions = rawActions
    .map((action) => normalizeVoicePostCallAction(action, events))
    .filter((action): action is VoicePostCallAction => !!action)
  const actionSource =
    persistedActions.length > 0
      ? persistedActions
      : plans.flatMap((plan) => plan.actions).filter((action) => action.type !== 'link_call_record')
  const topNextActions = actionSource.sort(compareActionPriority).slice(0, 6)

  const totalCalls = calls.length
  const completedCalls = calls.filter(
    (call) => call.status === 'completed' || call.status === 'voicemail'
  ).length
  const failedCalls = calls.filter((call) => FAILED_STATUSES.has(call.status ?? '')).length
  const activeCalls = calls.filter((call) => ACTIVE_STATUSES.has(call.status ?? '')).length
  const answeredCalls = calls.filter(
    (call) => call.status === 'completed' || call.result === 'yes' || call.result === 'no'
  ).length
  const finishedCalls = calls.filter((call) => !ACTIVE_STATUSES.has(call.status ?? '')).length

  return {
    totalCalls,
    activeCalls,
    completedCalls,
    failedCalls,
    recordingCount: calls.filter((call) => !!call.recordingUrl).length,
    missingRecordingCount: calls.filter(
      (call) => (call.status === 'completed' || call.status === 'voicemail') && !call.recordingUrl
    ).length,
    optOutCount: topNextActions.filter((action) => action.type === 'mark_ai_call_opt_out').length,
    urgentReviewCount: plans.filter((plan) =>
      plan.actions.some((action) => action.urgency === 'urgent')
    ).length,
    menuReviewCount: plans.filter((plan) =>
      plan.actions.some((action) => action.type === 'review_menu')
    ).length,
    pricingReviewCount: plans.filter((plan) =>
      plan.actions.some((action) => action.type === 'review_pricing')
    ).length,
    unresolvedDecisionCount: plans.filter((plan) =>
      plan.actions.some((action) => action.status === 'needs_review')
    ).length,
    answerRate: finishedCalls > 0 ? Math.round((answeredCalls / finishedCalls) * 100) : 0,
    topNextActions,
    professionalRisks: plans
      .filter((plan) => plan.professionalRisk !== 'low')
      .map((plan) => ({
        callId: plan.callId,
        level: plan.professionalRisk,
        reason: plan.reportLine,
      })),
  }
}

export function normalizeVoicePostCallAction(
  value: unknown,
  events: VoiceSessionEventLike[] = []
): VoicePostCallAction | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const type = stringValue(record.type) ?? stringValue(record.action_type)
  const label = stringValue(record.label)
  const detail = stringValue(record.detail)
  const urgency = stringValue(record.urgency)
  const status = stringValue(record.status)
  if (!type || !label || !detail || !urgency || !status) return null

  const metadata = recordValue(record.metadata) ?? undefined
  const aiCallId = stringValue(record.aiCallId) ?? stringValue(record.ai_call_id) ?? undefined
  const supplierCallId =
    stringValue(record.supplierCallId) ?? stringValue(record.supplier_call_id) ?? undefined
  const createdAt = stringValue(record.createdAt) ?? stringValue(record.created_at) ?? undefined
  const completedAt =
    stringValue(record.completedAt) ?? stringValue(record.completed_at) ?? undefined
  const targetType = stringValue(record.targetType) ?? stringValue(record.target_type) ?? undefined
  const targetId = stringValue(record.targetId) ?? stringValue(record.target_id) ?? undefined

  const action: VoicePostCallAction = {
    id: stringValue(record.id) ?? undefined,
    type: type as VoicePostCallAction['type'],
    label,
    detail,
    urgency: urgency as VoicePostCallAction['urgency'],
    status: status as VoicePostCallAction['status'],
    targetType,
    targetId,
    createdAt,
    completedAt,
    metadata,
  }
  return {
    ...action,
    evidence: buildActionEvidence(action, {
      aiCallId,
      supplierCallId,
      targetType,
      targetId,
      events,
    }),
  }
}

export function normalizeVoiceCall(value: unknown): VoiceCallLike | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const id = stringValue(record.id)
  if (!id) return null

  return {
    id,
    aiCallId: stringValue(record.aiCallId) ?? stringValue(record.ai_call_id),
    supplierCallId: stringValue(record.supplierCallId) ?? stringValue(record.supplier_call_id),
    direction: stringValue(record.direction),
    role: stringValue(record.role),
    contactPhone:
      stringValue(record.contactPhone) ??
      stringValue(record.contact_phone) ??
      stringValue(record.vendor_phone),
    contactName:
      stringValue(record.contactName) ??
      stringValue(record.contact_name) ??
      stringValue(record.vendor_name),
    contactType: stringValue(record.contactType) ?? stringValue(record.contact_type),
    subject: stringValue(record.subject) ?? stringValue(record.ingredient_name),
    status: stringValue(record.status),
    result: stringValue(record.result),
    fullTranscript: stringValue(record.fullTranscript) ?? stringValue(record.full_transcript),
    speechTranscript: stringValue(record.speechTranscript) ?? stringValue(record.speech_transcript),
    extractedData: recordValue(record.extractedData) ?? recordValue(record.extracted_data),
    actionLog: record.actionLog ?? record.action_log,
    recordingUrl: stringValue(record.recordingUrl) ?? stringValue(record.recording_url),
    durationSeconds: numberValue(record.durationSeconds) ?? numberValue(record.duration_seconds),
    createdAt: stringValue(record.createdAt) ?? stringValue(record.created_at),
  }
}

function compareActionPriority(a: VoicePostCallAction, b: VoicePostCallAction): number {
  const priority = { urgent: 0, review: 1, standard: 2 }
  const urgency = priority[a.urgency] - priority[b.urgency]
  if (urgency !== 0) return urgency
  if (a.status === 'needs_review' && b.status !== 'needs_review') return -1
  if (b.status === 'needs_review' && a.status !== 'needs_review') return 1
  return a.label.localeCompare(b.label)
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function recordValue(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

interface VoiceSessionEventLike {
  eventType: string
  aiCallId?: string
  supplierCallId?: string
  payload?: Record<string, unknown>
  occurredAt?: string
}

function normalizeVoiceSessionEvent(value: unknown): VoiceSessionEventLike | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const eventType = stringValue(record.eventType) ?? stringValue(record.event_type)
  if (!eventType) return null
  return {
    eventType,
    aiCallId: stringValue(record.aiCallId) ?? stringValue(record.ai_call_id) ?? undefined,
    supplierCallId:
      stringValue(record.supplierCallId) ?? stringValue(record.supplier_call_id) ?? undefined,
    payload: recordValue(record.payload) ?? undefined,
    occurredAt: stringValue(record.occurredAt) ?? stringValue(record.occurred_at) ?? undefined,
  }
}

function buildActionEvidence(
  action: VoicePostCallAction,
  context: {
    aiCallId?: string
    supplierCallId?: string
    targetType?: string
    targetId?: string
    events: VoiceSessionEventLike[]
  }
): VoicePostCallActionEvidence {
  const metadata = action.metadata ?? {}
  const relatedEvents = context.events.filter(
    (event) =>
      (!!context.aiCallId && event.aiCallId === context.aiCallId) ||
      (!!context.supplierCallId && event.supplierCallId === context.supplierCallId)
  )
  const eventTypes = Array.from(new Set(relatedEvents.map((event) => event.eventType)))
  const source =
    stringValue(metadata.voiceOpsSource) ??
    stringValue(metadata.source) ??
    'post_call_execution_plan'
  const scriptQuality = recordValue(metadata.scriptQuality)

  return {
    source,
    reason: stringValue(metadata.evidenceReason) ?? action.detail,
    hapticReason:
      stringValue(metadata.hapticReason) ??
      stringValue(metadata.interruptionReason) ??
      'No haptic decision was recorded for this action.',
    duplicatePolicy:
      stringValue(metadata.duplicatePolicy) ??
      'Actions are de-duplicated by action type and label before insert.',
    aiCallId: context.aiCallId,
    supplierCallId: context.supplierCallId,
    target:
      context.targetType && context.targetId
        ? `${context.targetType}: ${context.targetId}`
        : undefined,
    createdAt: action.createdAt,
    completedAt: action.completedAt,
    closeoutIntent: stringValue(metadata.closeoutIntent) ?? undefined,
    snoozedUntil: stringValue(metadata.snoozedUntil) ?? undefined,
    eventTypes,
    complianceSignals: buildComplianceSignals(eventTypes),
    scriptQuality: scriptQuality
      ? {
          allowedToLaunch: booleanValue(scriptQuality.allowedToLaunch) ?? undefined,
          level: stringValue(scriptQuality.level) ?? undefined,
          score: numberValue(scriptQuality.score) ?? undefined,
          requiredFixes: arrayOfStrings(scriptQuality.requiredFixes),
        }
      : undefined,
  }
}

function buildComplianceSignals(eventTypes: string[]): string[] {
  const signals: string[] = []
  if (eventTypes.includes('identity_disclosed')) signals.push('Identity disclosure ledger event')
  if (eventTypes.includes('recording_disclosed')) signals.push('Recording disclosure ledger event')
  if (eventTypes.includes('opt_out_recorded')) signals.push('Opt-out ledger event')
  if (eventTypes.includes('recording_attached')) signals.push('Recording attachment ledger event')
  return signals
}

function booleanValue(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function arrayOfStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}
