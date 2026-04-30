import { buildPostCallExecutionPlan } from '@/lib/calling/post-call-execution'
import type {
  VoiceCallLike,
  VoiceOpsReport,
  VoicePostCallAction,
} from '@/lib/calling/voice-ops-types'

const ACTIVE_STATUSES = new Set(['queued', 'ringing', 'in_progress'])
const FAILED_STATUSES = new Set(['failed', 'busy', 'no_answer'])

export function buildVoiceOpsReport(rawCalls: unknown[]): VoiceOpsReport {
  const calls = rawCalls.map(normalizeVoiceCall).filter((call): call is VoiceCallLike => !!call)
  const plans = calls.map(buildPostCallExecutionPlan)
  const topNextActions = plans
    .flatMap((plan) => plan.actions)
    .filter((action) => action.type !== 'link_call_record')
    .sort(compareActionPriority)
    .slice(0, 6)

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
