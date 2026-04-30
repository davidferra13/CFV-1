import { hasVoiceAgentOptOutRequest } from '@/lib/calling/voice-agent-contract'
import { buildPostCallExecutionPlan } from '@/lib/calling/post-call-execution'
import type { VoiceCallLike, VoiceSessionEventDraft } from '@/lib/calling/voice-ops-types'

export function buildVoiceSessionLedger(call: VoiceCallLike): VoiceSessionEventDraft[] {
  const now = new Date().toISOString()
  const events: VoiceSessionEventDraft[] = []
  const transcript = call.fullTranscript ?? call.speechTranscript ?? ''
  const postCallPlan = buildPostCallExecutionPlan(call)

  push(events, now, 'call_started', {
    callId: call.id,
    aiCallId: call.aiCallId,
    supplierCallId: call.supplierCallId,
    role: call.role,
    direction: call.direction,
    contactPhone: call.contactPhone,
    subject: call.subject,
  })

  push(events, now, 'identity_disclosed', {
    required: true,
    assumedFromVoiceContract: true,
  })

  push(events, now, 'recording_disclosed', {
    required: true,
    recordingUrlPresent: !!call.recordingUrl,
  })

  if (transcript) {
    push(events, now, 'caller_turn_recorded', {
      transcriptExcerpt: compact(transcript),
    })
  }

  if (postCallPlan.decision) {
    push(events, now, 'voice_decision_recorded', {
      decision: postCallPlan.decision,
    })
  }

  if (hasVoiceAgentOptOutRequest(transcript) || postCallPlan.decision?.type === 'opt_out') {
    push(events, now, 'opt_out_recorded', {
      contactPhone: call.contactPhone,
    })
  }

  for (const action of postCallPlan.actions) {
    push(events, now, 'post_call_action_planned', {
      action,
    })
  }

  if (call.recordingUrl) {
    push(events, now, 'recording_attached', {
      recordingUrl: call.recordingUrl,
    })
  }

  push(events, now, terminalEventType(call.status), {
    status: call.status,
    result: call.result,
    professionalRisk: postCallPlan.professionalRisk,
  })

  return events.map((event, index) => ({ ...event, sequence: index + 1 }))
}

function push(
  events: VoiceSessionEventDraft[],
  occurredAt: string,
  eventType: string,
  payload: Record<string, unknown>
): void {
  events.push({
    eventType,
    sequence: events.length + 1,
    occurredAt,
    payload,
  })
}

function terminalEventType(status: string | null | undefined): string {
  if (status === 'failed' || status === 'busy' || status === 'no_answer') return 'call_failed'
  return 'call_completed'
}

function compact(value: string): string {
  const text = value.replace(/\s+/g, ' ').trim()
  if (text.length <= 420) return text
  return `${text.slice(0, 417).trim()}...`
}
