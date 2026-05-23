import type { SmsPolicyDecision } from '@/lib/communication/sms-policy'
import {
  brokerRemySensitiveBoundary,
  classifyBoundarySensitivity as classifyRemySensitiveBoundaryClasses,
  type RemyBoundaryOutputChannel,
  type RemyBoundarySensitivity,
  type RemyBoundaryUserRole,
  type RemySensitiveBoundaryDecision,
} from '@/lib/remy/sensitive-boundary-broker'

export const REMY_MANDATORY_APPROVAL_CLASSES = [
  'low_confidence',
  'money',
  'dietary',
  'schedule_change',
  'cancellation',
  'client_conflict',
  'legal_compliance',
  'vendor_commitment',
  'private_fact_boundary',
  'external_send_side_effect',
] as const

export type RemyMandatoryApprovalClass = (typeof REMY_MANDATORY_APPROVAL_CLASSES)[number]
export type RemyOutputAudience = 'chef_private' | 'client' | 'public' | 'staff' | 'vendor'

export type RemyDraftSourceEvidence = {
  type: 'thread' | 'event' | 'client' | 'call' | 'lifecycle_trigger' | 'vendor' | 'task' | 'other'
  id: string
  label: string
  href?: string
}

export type RemyCommunicationGuardrailInput = {
  confidence: number
  trigger: string
  channel: 'sms' | 'email' | 'app' | 'phone'
  message: string
  proposedNextAction: string
  sourceEvidence: RemyDraftSourceEvidence[]
  smsPolicy?: SmsPolicyDecision | null
  outputAudience?: RemyOutputAudience
}

export type RemyCommunicationGuardrailDecision = {
  approvalClasses: RemyMandatoryApprovalClass[]
  requiresApproval: boolean
  safeAutoAckAllowed: boolean
  status: 'pending_approval' | 'auto_ack_allowed' | 'blocked'
  policyReason: string
  reason: string
  boundary: {
    outputAudience: RemyOutputAudience
    sensitivityClasses: RemyBoundarySensitivity[]
    safeAlternative: string | null
  }
}

const LOW_CONFIDENCE_THRESHOLD = 0.75
const SAFE_AUTO_ACK_CONFIDENCE_THRESHOLD = 0.8

const APPROVAL_PATTERNS: Array<{
  approvalClass: Exclude<RemyMandatoryApprovalClass, 'low_confidence' | 'external_send_side_effect'>
  pattern: RegExp
}> = [
  {
    approvalClass: 'money',
    pattern:
      /\b(price|pricing|cost|budget|quote|invoice|deposit|payment|refund|discount|fee|rate|charge|balance|past due)\b/i,
  },
  {
    approvalClass: 'dietary',
    pattern:
      /\b(allergy|allergic|allergen|dietary|vegan|vegetarian|gluten|dairy|kosher|halal|celiac|restriction|intolerance)\b/i,
  },
  {
    approvalClass: 'schedule_change',
    pattern:
      /\b(reschedule|schedule change|change the date|change date|new date|postpone|move the event|different time|arrival time|start time)\b/i,
  },
  {
    approvalClass: 'cancellation',
    pattern: /\b(cancel|cancellation|cancelled|terminate|called off)\b/i,
  },
  {
    approvalClass: 'client_conflict',
    pattern:
      /\b(complaint|angry|upset|dispute|conflict|issue with|problem with|bad experience|unhappy|frustrated)\b/i,
  },
  {
    approvalClass: 'legal_compliance',
    pattern:
      /\b(contract|legal|liability|insurance|permit|compliance|policy|terms|privacy|refund policy|signature)\b/i,
  },
  {
    approvalClass: 'vendor_commitment',
    pattern:
      /\b(vendor|supplier|venue|commit|committed|confirmed order|purchase order|minimum order|delivery window|substitution)\b/i,
  },
]

const AUTO_ACK_PATTERN =
  /\b(received|got your message|thanks for reaching out|will review|will follow up|status update|checking on it|no action needed)\b/i
const COMMITMENT_PATTERN =
  /\b(confirmed|guarantee|guaranteed|booked|reserved|approved|paid|refund|changed|cancelled|ordered|purchased|contracted|available for sure)\b/i

export function evaluateRemyCommunicationGuardrails(
  input: RemyCommunicationGuardrailInput
): RemyCommunicationGuardrailDecision {
  const approvalClasses = new Set<RemyMandatoryApprovalClass>()
  const confidence = normalizeConfidence(input.confidence)
  const text = [input.trigger, input.message, input.proposedNextAction].join(' ')
  const outputAudience = input.outputAudience ?? inferOutputAudience(input.channel)
  const boundaryDecision = brokerRemySensitiveBoundary({
    userRole: mapAudienceToBoundaryRole(outputAudience),
    requestedOutputChannel: mapAudienceToBoundaryChannel(outputAudience),
    requestText: [input.trigger, input.proposedNextAction].join(' '),
    draftOutput: input.message,
    sourceFacts: [],
  })
  const sensitivityClasses = boundaryDecision.sensitivityClasses
  const unsafeBoundary =
    outputAudience !== 'chef_private' &&
    boundaryDecision.requiresChefApproval &&
    sensitivityClasses.length > 0
  const policyReason = input.smsPolicy?.reasons.join('; ') ?? 'No channel policy required'
  const policyBlocks = input.smsPolicy?.status === 'blocked'
  const policyDelays = input.smsPolicy?.status === 'delayed'

  if (confidence < LOW_CONFIDENCE_THRESHOLD) {
    approvalClasses.add('low_confidence')
  }

  for (const { approvalClass, pattern } of APPROVAL_PATTERNS) {
    if (pattern.test(text)) approvalClasses.add(approvalClass)
  }

  if (unsafeBoundary) {
    approvalClasses.add('private_fact_boundary')
  }

  const externalSendSideEffect =
    input.channel === 'sms' ||
    input.channel === 'email' ||
    input.channel === 'phone' ||
    /\b(send|text|sms|email|call|notify|message|reply|contact)\b/i.test(input.proposedNextAction)

  const safeAutoAckAllowed =
    confidence >= SAFE_AUTO_ACK_CONFIDENCE_THRESHOLD &&
    externalSendSideEffect &&
    input.sourceEvidence.length > 0 &&
    AUTO_ACK_PATTERN.test(input.message) &&
    !COMMITMENT_PATTERN.test(input.message) &&
    !policyBlocks &&
    !policyDelays &&
    [...approvalClasses].every((approvalClass) => approvalClass === 'external_send_side_effect')

  if (externalSendSideEffect && !safeAutoAckAllowed) {
    approvalClasses.add('external_send_side_effect')
  }

  if (policyBlocks) {
    return {
      approvalClasses: [...approvalClasses],
      requiresApproval: true,
      safeAutoAckAllowed: false,
      status: 'blocked',
      policyReason,
      reason: `Remy draft blocked by channel policy: ${policyReason}`,
      boundary: buildBoundaryDecision(outputAudience, boundaryDecision),
    }
  }

  if (outputAudience === 'public' && unsafeBoundary) {
    return {
      approvalClasses: [...approvalClasses],
      requiresApproval: true,
      safeAutoAckAllowed: false,
      status: 'blocked',
      policyReason,
      reason:
        'Remy draft blocked because private ChefFlow facts cannot be sent to a public audience.',
      boundary: buildBoundaryDecision(outputAudience, boundaryDecision),
    }
  }

  const requiresApproval = approvalClasses.size > 0 || policyDelays

  if (!requiresApproval && safeAutoAckAllowed) {
    return {
      approvalClasses: [],
      requiresApproval: false,
      safeAutoAckAllowed: true,
      status: 'auto_ack_allowed',
      policyReason,
      reason: 'Safe auto-ack allowed: no commitment beyond receipt or status.',
      boundary: buildBoundaryDecision(outputAudience, boundaryDecision),
    }
  }

  return {
    approvalClasses: [...approvalClasses],
    requiresApproval: true,
    safeAutoAckAllowed: false,
    status: 'pending_approval',
    policyReason,
    reason:
      approvalClasses.size > 0
        ? `Chef approval required for ${[...approvalClasses].join(', ')}.`
        : `Chef approval required because channel policy is ${input.smsPolicy?.status ?? 'review'}.`,
    boundary: buildBoundaryDecision(outputAudience, boundaryDecision),
  }
}

export function classifyBoundarySensitivity(text: string): RemyBoundarySensitivity[] {
  return classifyRemySensitiveBoundaryClasses(text)
}

function inferOutputAudience(
  channel: RemyCommunicationGuardrailInput['channel']
): RemyOutputAudience {
  return channel === 'app' ? 'chef_private' : 'client'
}

function buildBoundaryDecision(
  outputAudience: RemyOutputAudience,
  decision: RemySensitiveBoundaryDecision
): RemyCommunicationGuardrailDecision['boundary'] {
  const safeAlternative =
    outputAudience === 'chef_private' || decision.sensitivityClasses.length === 0
      ? null
      : (decision.safeAlternative ??
        'Use a neutral status update that omits private ChefFlow facts and asks the chef to approve any external wording.')

  return {
    outputAudience,
    sensitivityClasses: decision.sensitivityClasses,
    safeAlternative,
  }
}

function mapAudienceToBoundaryChannel(
  outputAudience: RemyOutputAudience
): RemyBoundaryOutputChannel {
  if (outputAudience === 'client') return 'client_message'
  if (outputAudience === 'public') return 'public_profile'
  if (outputAudience === 'staff') return 'staff_briefing'
  if (outputAudience === 'vendor') return 'vendor_message'
  return 'chef_private'
}

function mapAudienceToBoundaryRole(outputAudience: RemyOutputAudience): RemyBoundaryUserRole {
  if (outputAudience === 'chef_private') return 'chef'
  return outputAudience
}

function normalizeConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}
