import { isVoiceAgentDecision, type VoiceAgentDecision } from '@/lib/calling/voice-agent-contract'
import { scoreHangupRisk } from '@/lib/calling/hangup-risk'
import { coordinateMenuCall } from '@/lib/calling/menu-call-coordinator'
import type {
  VoiceCallLike,
  VoicePostCallAction,
  VoicePostCallPlan,
  VoiceProfessionalRiskLevel,
} from '@/lib/calling/voice-ops-types'

export function buildPostCallExecutionPlan(call: VoiceCallLike): VoicePostCallPlan {
  const decision = extractVoiceAgentDecision(call.extractedData)
  const transcript = call.fullTranscript ?? call.speechTranscript ?? ''
  const risk = scoreHangupRisk({
    transcript,
    identityDisclosed: true,
    recordingDisclosed: !!call.recordingUrl || call.status !== 'completed',
  })

  const actions: VoicePostCallAction[] = [
    {
      type: 'link_call_record',
      label: 'Link call record',
      detail: 'Keep the call attached to the Voice Hub log and related records.',
      urgency: 'standard',
      status: 'planned',
      metadata: { callId: call.id, role: call.role },
    },
  ]

  if (call.recordingUrl) {
    actions.push({
      type: 'attach_recording',
      label: 'Recording attached',
      detail: 'A recording URL is present for review.',
      urgency: 'standard',
      status: 'completed',
    })
  } else if (call.status === 'completed' || call.status === 'voicemail') {
    actions.push({
      type: 'attach_recording',
      label: 'Recording missing',
      detail: 'The call finished but no recording URL is available yet.',
      urgency: 'review',
      status: 'needs_review',
    })
  }

  if (decision) addDecisionActions(actions, decision, call)
  addStatusActions(actions, call)
  addMenuActions(actions, transcript)

  if (risk.level !== 'low') {
    actions.push({
      type: 'send_chef_alert',
      label: 'Review professionalism risk',
      detail: risk.recommendedAdjustment,
      urgency: risk.level === 'high' ? 'urgent' : 'review',
      status: 'needs_review',
      metadata: { reasons: risk.reasons, score: risk.score },
    })
  }

  return {
    callId: call.id,
    decision,
    professionalRisk: risk.level,
    actions: dedupeActions(actions),
    reportLine: summarizePlan(call, risk.level, actions),
  }
}

function extractVoiceAgentDecision(
  data: Record<string, unknown> | null | undefined
): VoiceAgentDecision | null {
  const decision = data?.voice_agent_decision
  return isVoiceAgentDecision(decision) ? decision : null
}

function addDecisionActions(
  actions: VoicePostCallAction[],
  decision: VoiceAgentDecision,
  call: VoiceCallLike
): void {
  if (decision.type === 'opt_out') {
    actions.push({
      type: 'mark_ai_call_opt_out',
      label: 'Mark AI call opt-out',
      detail: 'Persist the caller preference before any future AI assistant call.',
      urgency: 'review',
      status: 'planned',
      metadata: { phone: call.contactPhone },
    })
    return
  }

  if (decision.category === 'booking') {
    actions.push({
      type: 'create_inquiry',
      label: 'Create or link inquiry',
      detail: 'Convert the booking intake into a reviewable inquiry for the chef.',
      urgency: 'standard',
      status: 'planned',
    })
  }

  if (decision.category === 'menu' || decision.category === 'recipe') {
    actions.push({
      type: 'review_menu',
      label: decision.category === 'recipe' ? 'Restricted creative request' : 'Menu review',
      detail: 'Chef must review before any menu, recipe, or dish change.',
      urgency: 'review',
      status: 'needs_review',
    })
  }

  if (decision.category === 'dietary') {
    actions.push({
      type: 'review_dietary_safety',
      label: 'Dietary safety review',
      detail: 'Allergy or dietary details require chef review before confirmation.',
      urgency: 'urgent',
      status: 'needs_review',
    })
  }

  if (decision.category === 'pricing') {
    actions.push({
      type: 'review_pricing',
      label: 'Pricing review',
      detail: 'Review scope before sending quote or price guidance.',
      urgency: 'review',
      status: 'needs_review',
    })
  }

  if (decision.category === 'human') {
    actions.push({
      type: 'schedule_human_callback',
      label: 'Human callback requested',
      detail: 'Caller asked for a person or chef follow-up.',
      urgency: 'review',
      status: 'planned',
    })
  }

  actions.push({
    type: 'create_quick_note',
    label: 'Create call note',
    detail: decision.followUpPrompt || decision.answer,
    urgency: decision.category === 'dietary' ? 'urgent' : 'standard',
    status: 'planned',
  })
}

function addStatusActions(actions: VoicePostCallAction[], call: VoiceCallLike): void {
  if (call.status === 'failed' || call.status === 'busy' || call.status === 'no_answer') {
    actions.push({
      type: 'create_task',
      label: 'Call did not connect',
      detail: 'Review whether to retry manually or choose another contact.',
      urgency: 'review',
      status: 'planned',
    })
  }
}

function addMenuActions(actions: VoicePostCallAction[], transcript: string): void {
  const menu = coordinateMenuCall(transcript)
  if (menu.category === 'not_menu_related') return

  if (menu.category === 'dietary_review') {
    actions.push({
      type: 'review_dietary_safety',
      label: 'Menu dietary review',
      detail: menu.followUpPrompt,
      urgency: 'urgent',
      status: 'needs_review',
    })
    return
  }

  actions.push({
    type: 'review_menu',
    label:
      menu.category === 'restricted_creative_request'
        ? 'Restricted menu request'
        : 'Menu follow-up',
    detail: menu.response,
    urgency: menu.urgency,
    status: menu.allowedToHandleByVoice ? 'planned' : 'needs_review',
  })
}

function dedupeActions(actions: VoicePostCallAction[]): VoicePostCallAction[] {
  const seen = new Set<string>()
  return actions.filter((action) => {
    const key = `${action.type}:${action.label}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function summarizePlan(
  call: VoiceCallLike,
  risk: VoiceProfessionalRiskLevel,
  actions: VoicePostCallAction[]
): string {
  const reviewCount = actions.filter((action) => action.status === 'needs_review').length
  const contact = call.contactName || call.contactPhone || 'Unknown contact'
  if (reviewCount > 0)
    return `${contact}: ${reviewCount} review item${reviewCount === 1 ? '' : 's'} after call.`
  if (risk !== 'low') return `${contact}: professional risk needs review.`
  return `${contact}: call captured with follow-up plan.`
}
