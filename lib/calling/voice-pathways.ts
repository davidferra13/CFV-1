import {
  VOICE_AGENT_CONTRACT,
  type VoiceAgentRole,
  isAllowedVoiceAgentRole,
} from '@/lib/calling/voice-agent-contract'

export type VoicePathwayId =
  | 'inbound_booking_intake'
  | 'inbound_vendor_callback'
  | 'inbound_unknown_message'
  | 'vendor_availability'
  | 'vendor_delivery'
  | 'venue_confirmation'
  | 'client_follow_up'
  | 'opt_out'
  | 'human_handoff'

export type VoicePathwayAction =
  | 'create_inquiry'
  | 'create_task'
  | 'create_quick_note'
  | 'link_call_record'
  | 'mark_ai_call_opt_out'
  | 'send_chef_alert'
  | 'store_transcript'
  | 'update_call_record'
  | 'draft_follow_up_for_approval'
  | 'check_deterministic_availability'
  | 'confirm_vendor_delivery_window'

export interface VoicePathway {
  id: VoicePathwayId
  label: string
  entryRoles: VoiceAgentRole[]
  requiredDisclosures: Array<'identity' | 'recording' | 'opt_out'>
  allowedActions: VoicePathwayAction[]
  handoffTriggers: string[]
  successCondition: string
  failureCondition: string
}

const STANDARD_DISCLOSURES: VoicePathway['requiredDisclosures'] = [
  'identity',
  'recording',
  'opt_out',
]

const STANDARD_SAFE_ACTIONS: VoicePathwayAction[] = [
  'create_task',
  'create_quick_note',
  'link_call_record',
  'send_chef_alert',
  'store_transcript',
  'update_call_record',
]

export const BLOCKED_VOICE_PATHWAY_ACTIONS = [
  'create_recipe',
  'update_recipe',
  'add_ingredient',
  'generate_menu',
  'send_binding_quote',
  'charge_payment_method',
  'delete_record',
] as const

export const VOICE_PATHWAYS: Record<VoicePathwayId, VoicePathway> = {
  inbound_booking_intake: {
    id: 'inbound_booking_intake',
    label: 'Inbound booking intake',
    entryRoles: ['inbound_unknown'],
    requiredDisclosures: STANDARD_DISCLOSURES,
    allowedActions: [...STANDARD_SAFE_ACTIONS, 'create_inquiry'],
    handoffTriggers: VOICE_AGENT_CONTRACT.handoffTriggers,
    successCondition: 'A linked inquiry or chef review task exists with caller details.',
    failureCondition: 'Caller intent is unclear after recovery or caller asks for a human.',
  },
  inbound_vendor_callback: {
    id: 'inbound_vendor_callback',
    label: 'Inbound vendor callback',
    entryRoles: ['inbound_vendor_callback'],
    requiredDisclosures: STANDARD_DISCLOSURES,
    allowedActions: STANDARD_SAFE_ACTIONS,
    handoffTriggers: VOICE_AGENT_CONTRACT.handoffTriggers,
    successCondition: 'Vendor message is captured and routed to the call sheet inbox.',
    failureCondition: 'Vendor asks for negotiation, payment, or a human callback.',
  },
  inbound_unknown_message: {
    id: 'inbound_unknown_message',
    label: 'Inbound unknown message',
    entryRoles: ['inbound_unknown', 'inbound_voicemail'],
    requiredDisclosures: STANDARD_DISCLOSURES,
    allowedActions: STANDARD_SAFE_ACTIONS,
    handoffTriggers: VOICE_AGENT_CONTRACT.handoffTriggers,
    successCondition: 'Caller message is captured with a clear chef next step.',
    failureCondition: 'Caller provides no usable message after recovery attempts.',
  },
  vendor_availability: {
    id: 'vendor_availability',
    label: 'Vendor availability',
    entryRoles: ['vendor_availability'],
    requiredDisclosures: STANDARD_DISCLOSURES,
    allowedActions: STANDARD_SAFE_ACTIONS,
    handoffTriggers: VOICE_AGENT_CONTRACT.handoffTriggers,
    successCondition: 'Availability, unit, and quoted vendor facts are captured for chef review.',
    failureCondition: 'Vendor cannot answer, disputes the request, or asks for a human.',
  },
  vendor_delivery: {
    id: 'vendor_delivery',
    label: 'Vendor delivery confirmation',
    entryRoles: ['vendor_delivery'],
    requiredDisclosures: STANDARD_DISCLOSURES,
    allowedActions: [...STANDARD_SAFE_ACTIONS, 'confirm_vendor_delivery_window'],
    handoffTriggers: VOICE_AGENT_CONTRACT.handoffTriggers,
    successCondition: 'Delivery window or delivery exception is captured.',
    failureCondition: 'Delivery answer conflicts with event constraints or needs chef judgment.',
  },
  venue_confirmation: {
    id: 'venue_confirmation',
    label: 'Venue logistics confirmation',
    entryRoles: ['venue_confirmation'],
    requiredDisclosures: STANDARD_DISCLOSURES,
    allowedActions: STANDARD_SAFE_ACTIONS,
    handoffTriggers: VOICE_AGENT_CONTRACT.handoffTriggers,
    successCondition: 'Venue logistics facts are captured and linked to the event review task.',
    failureCondition: 'Venue reports a constraint that changes scope, timing, cost, or safety.',
  },
  client_follow_up: {
    id: 'client_follow_up',
    label: 'Client follow-up',
    entryRoles: [],
    requiredDisclosures: STANDARD_DISCLOSURES,
    allowedActions: [...STANDARD_SAFE_ACTIONS, 'draft_follow_up_for_approval'],
    handoffTriggers: VOICE_AGENT_CONTRACT.handoffTriggers,
    successCondition: 'Follow-up draft or task is created for chef approval.',
    failureCondition: 'Client asks for quote, menu, payment, allergy, or dispute handling.',
  },
  opt_out: {
    id: 'opt_out',
    label: 'AI call opt-out',
    entryRoles: [],
    requiredDisclosures: ['identity'],
    allowedActions: ['mark_ai_call_opt_out', 'store_transcript', 'update_call_record'],
    handoffTriggers: [],
    successCondition: 'Number is marked as opted out of future AI assistant calls.',
    failureCondition: 'Opt-out could not be persisted.',
  },
  human_handoff: {
    id: 'human_handoff',
    label: 'Human handoff',
    entryRoles: [],
    requiredDisclosures: STANDARD_DISCLOSURES,
    allowedActions: STANDARD_SAFE_ACTIONS,
    handoffTriggers: VOICE_AGENT_CONTRACT.handoffTriggers,
    successCondition: 'Chef receives a task or alert with transcript and exact caller ask.',
    failureCondition: 'No actionable handoff record can be created.',
  },
}

const DEFAULT_PATHWAY_BY_ROLE: Record<VoiceAgentRole, VoicePathwayId> = {
  vendor_availability: 'vendor_availability',
  vendor_delivery: 'vendor_delivery',
  venue_confirmation: 'venue_confirmation',
  inbound_vendor_callback: 'inbound_vendor_callback',
  inbound_unknown: 'inbound_unknown_message',
  inbound_voicemail: 'inbound_unknown_message',
}

export function getDefaultVoicePathwayId(role: string): VoicePathwayId | null {
  if (!isAllowedVoiceAgentRole(role)) return null
  return DEFAULT_PATHWAY_BY_ROLE[role]
}

export function getVoicePathway(id: string): VoicePathway | null {
  if (!isVoicePathwayId(id)) return null
  return VOICE_PATHWAYS[id]
}

export function getVoicePathwayForRole(role: string): VoicePathway | null {
  const id = getDefaultVoicePathwayId(role)
  return id ? VOICE_PATHWAYS[id] : null
}

export function isVoicePathwayActionAllowed(params: {
  pathwayId: string
  action: string
}): boolean {
  const pathway = getVoicePathway(params.pathwayId)
  if (!pathway) return false
  if (BLOCKED_VOICE_PATHWAY_ACTIONS.some((blocked) => blocked === params.action)) return false
  return pathway.allowedActions.some((action) => action === params.action)
}

export function assertEveryVoiceRoleHasDefaultPathway(): void {
  const missingRoles = VOICE_AGENT_CONTRACT.allowedRoles.filter(
    (role) => !DEFAULT_PATHWAY_BY_ROLE[role]
  )

  if (missingRoles.length > 0) {
    throw new Error(`Voice roles missing default pathway: ${missingRoles.join(', ')}`)
  }
}

function isVoicePathwayId(value: string): value is VoicePathwayId {
  return Object.prototype.hasOwnProperty.call(VOICE_PATHWAYS, value)
}
