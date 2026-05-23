export type RemyBoundaryUserRole =
  | 'chef'
  | 'client'
  | 'staff'
  | 'public'
  | 'vendor'
  | 'partner'
  | 'admin'
  | 'developer'

export type RemyBoundaryOutputChannel =
  | 'chef_private'
  | 'client_message'
  | 'public_profile'
  | 'staff_briefing'
  | 'vendor_message'
  | 'internal_note'

export type RemyBoundaryRequestContext =
  | 'client_safe_scheduling'
  | 'public_profile_copy'
  | 'staff_briefing'
  | 'chef_only_analysis'
  | 'vendor_coordination'
  | 'general'

export type RemyFactVisibility =
  | 'chef_private'
  | 'tenant_private'
  | 'client_safe'
  | 'staff_safe'
  | 'vendor_safe'
  | 'public'

export type RemyBoundarySensitivity =
  | 'chef_health'
  | 'chef_family'
  | 'chef_finance'
  | 'client_private'
  | 'staff_private'
  | 'vendor_private'
  | 'legal_compliance'
  | 'crisis_recovery'

export type RemyBoundaryDecisionKind = 'allow' | 'approval_required' | 'block'

export type RemyBoundarySourceFact = {
  id: string
  label: string
  text: string
  visibility: RemyFactVisibility
  sensitivityClasses?: RemyBoundarySensitivity[]
}

export type RemySourceFactVisibilityDecision = {
  id: string
  label: string
  visibility: RemyFactVisibility
  sensitivityClasses: RemyBoundarySensitivity[]
  allowed: boolean
  redactionReason: string | null
}

export type RemySensitiveBoundaryInput = {
  userRole: RemyBoundaryUserRole
  requestText: string
  draftOutput?: string
  requestedOutputChannel?: RemyBoundaryOutputChannel
  sourceFacts?: RemyBoundarySourceFact[]
}

export type RemySensitiveBoundaryDecision = {
  requestContext: RemyBoundaryRequestContext
  userRole: RemyBoundaryUserRole
  requestedOutputChannel: RemyBoundaryOutputChannel | null
  allowedOutputChannel: RemyBoundaryOutputChannel
  decision: RemyBoundaryDecisionKind
  requiresChefApproval: boolean
  sensitivityClasses: RemyBoundarySensitivity[]
  sourceFactVisibility: RemySourceFactVisibilityDecision[]
  originalOutput: string
  redactedOutput: string | null
  redactionReason: string | null
  safeAlternative: string | null
}

type SensitivityPattern = {
  sensitivity: RemyBoundarySensitivity
  pattern: RegExp
}

const SENSITIVITY_PATTERNS: SensitivityPattern[] = [
  {
    sensitivity: 'chef_health',
    pattern:
      /\b(health|medical|doctor|therapy|therapist|medication|injury|panic|burnout|migraine|sick|illness|hospital)\b/gi,
  },
  {
    sensitivity: 'chef_family',
    pattern:
      /\b(child|children|spouse|partner|divorce|family emergency|caretaking|childcare|custody)\b/gi,
  },
  {
    sensitivity: 'chef_finance',
    pattern:
      /\b(runway|cash flow|debt|tax|behind on bills|rent|payroll|margin problem|revenue gap|financial hardship)\b/gi,
  },
  {
    sensitivity: 'client_private',
    pattern:
      /\b(client notes?|household|address|gate code|allergy history|private preference|family member|guest list|dietary file)\b/gi,
  },
  {
    sensitivity: 'staff_private',
    pattern:
      /\b(staff performance|discipline|termination|pay rate|background check|personal conflict)\b/gi,
  },
  {
    sensitivity: 'vendor_private',
    pattern:
      /\b(vendor reliability|vendor incident|supplier dispute|account on hold|credit terms)\b/gi,
  },
  {
    sensitivity: 'legal_compliance',
    pattern:
      /\b(legal|liability|insurance|permit|compliance|contract|privacy|terms|license|inspection)\b/gi,
  },
  {
    sensitivity: 'crisis_recovery',
    pattern:
      /\b(crisis|recovery|incident|complaint|refund threat|chargeback|safety issue|emergency)\b/gi,
  },
]

const PRIVATE_SENSITIVITIES = new Set<RemyBoundarySensitivity>([
  'chef_health',
  'chef_family',
  'chef_finance',
  'client_private',
  'staff_private',
  'vendor_private',
  'legal_compliance',
  'crisis_recovery',
])

export function brokerRemySensitiveBoundary(
  input: RemySensitiveBoundaryInput
): RemySensitiveBoundaryDecision {
  const sourceFacts = input.sourceFacts ?? []
  const originalOutput = input.draftOutput ?? ''
  const requestContext = classifyRemyBoundaryRequestContext(input)
  const requestedOutputChannel = input.requestedOutputChannel ?? null
  const allowedOutputChannel = chooseAllowedOutputChannel(input, requestContext)
  const sourceFactVisibility = sourceFacts.map((fact) =>
    classifySourceFactVisibility(fact, input.userRole, allowedOutputChannel)
  )
  const sourceSensitivity = sourceFactVisibility.flatMap((fact) => fact.sensitivityClasses)
  const textSensitivity = classifyBoundarySensitivity([input.requestText, originalOutput].join(' '))
  const sensitivityClasses = uniqueSensitivity([...sourceSensitivity, ...textSensitivity])
  const blockedFacts = sourceFactVisibility.filter((fact) => !fact.allowed)
  const forbiddenFactAppears = blockedFacts.some((fact) =>
    sourceFacts.some(
      (sourceFact) =>
        sourceFact.id === fact.id &&
        sourceFact.text &&
        textIncludesFact(originalOutput, sourceFact.text)
    )
  )
  const externalSensitiveOutput =
    allowedOutputChannel !== 'chef_private' &&
    sensitivityClasses.some((sensitivity) => PRIVATE_SENSITIVITIES.has(sensitivity))
  const publicPrivateOutput = allowedOutputChannel === 'public_profile' && externalSensitiveOutput
  const coercedPrivate =
    !requestedOutputChannel &&
    allowedOutputChannel === 'chef_private' &&
    input.userRole !== 'chef' &&
    sensitivityClasses.length > 0

  let decision: RemyBoundaryDecisionKind = 'allow'
  if (publicPrivateOutput) {
    decision = 'block'
  } else if (forbiddenFactAppears || externalSensitiveOutput || coercedPrivate) {
    decision = 'approval_required'
  }

  const redactionReason = buildRedactionReason({
    blockedFacts,
    forbiddenFactAppears,
    externalSensitiveOutput,
    coercedPrivate,
    sensitivityClasses,
  })
  const redactedOutput =
    originalOutput && decision !== 'allow'
      ? redactSensitiveBoundaryText(originalOutput, blockedFacts, sourceFacts, sensitivityClasses)
      : originalOutput || null

  return {
    requestContext,
    userRole: input.userRole,
    requestedOutputChannel,
    allowedOutputChannel,
    decision,
    requiresChefApproval: decision !== 'allow',
    sensitivityClasses,
    sourceFactVisibility,
    originalOutput,
    redactedOutput,
    redactionReason,
    safeAlternative: buildSafeAlternative(requestContext, allowedOutputChannel, decision),
  }
}

export function classifyRemyBoundaryRequestContext(
  input: Pick<
    RemySensitiveBoundaryInput,
    'requestText' | 'requestedOutputChannel' | 'userRole' | 'draftOutput'
  >
): RemyBoundaryRequestContext {
  const text = [input.requestText, input.draftOutput ?? ''].join(' ')

  if (
    input.requestedOutputChannel === 'client_message' ||
    (/\b(client|guest)\b/i.test(text) &&
      /\b(schedule|scheduling|arrival|timing|reschedule|delay|late|start time)\b/i.test(text))
  ) {
    return 'client_safe_scheduling'
  }

  if (
    input.requestedOutputChannel === 'public_profile' ||
    /\b(public profile|profile copy|public copy|bio|showcase|listing)\b/i.test(text)
  ) {
    return 'public_profile_copy'
  }

  if (
    input.requestedOutputChannel === 'staff_briefing' ||
    /\b(staff|team briefing|crew)\b/i.test(text)
  ) {
    return 'staff_briefing'
  }

  if (
    input.requestedOutputChannel === 'vendor_message' ||
    /\b(vendor|supplier|venue)\b/i.test(text)
  ) {
    return 'vendor_coordination'
  }

  if (
    input.userRole === 'chef' ||
    input.requestedOutputChannel === 'chef_private' ||
    /\b(private|privately|chef-only|internal analysis)\b/i.test(text)
  ) {
    return 'chef_only_analysis'
  }

  return 'general'
}

export function classifyBoundarySensitivity(text: string): RemyBoundarySensitivity[] {
  const matches: RemyBoundarySensitivity[] = []

  for (const { sensitivity, pattern } of SENSITIVITY_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags)
    if (regex.test(text)) {
      matches.push(sensitivity)
    }
  }

  return uniqueSensitivity(matches)
}

export function redactSensitiveBoundaryText(
  text: string,
  blockedFacts: Array<Pick<RemySourceFactVisibilityDecision, 'id'>>,
  sourceFacts: RemyBoundarySourceFact[],
  sensitivityClasses: RemyBoundarySensitivity[] = classifyBoundarySensitivity(text)
): string {
  let redacted = text
  const blockedIds = new Set(blockedFacts.map((fact) => fact.id))

  for (const fact of sourceFacts) {
    if (!blockedIds.has(fact.id) || !fact.text.trim()) continue
    redacted = replaceLiteral(redacted, fact.text.trim(), '[private detail omitted]')
  }

  for (const { sensitivity, pattern } of SENSITIVITY_PATTERNS) {
    if (!sensitivityClasses.includes(sensitivity)) continue
    redacted = redacted.replace(pattern, '[private detail omitted]')
  }

  return redacted.replace(/\s{2,}/g, ' ').trim()
}

function classifySourceFactVisibility(
  fact: RemyBoundarySourceFact,
  userRole: RemyBoundaryUserRole,
  outputChannel: RemyBoundaryOutputChannel
): RemySourceFactVisibilityDecision {
  const sensitivityClasses = uniqueSensitivity([
    ...(fact.sensitivityClasses ?? []),
    ...classifyBoundarySensitivity([fact.label, fact.text].join(' ')),
  ])
  const allowed = canUseFactVisibility(fact.visibility, userRole, outputChannel)

  return {
    id: fact.id,
    label: fact.label,
    visibility: fact.visibility,
    sensitivityClasses,
    allowed,
    redactionReason: allowed
      ? null
      : `${fact.visibility} source fact is not allowed in ${outputChannel} for ${userRole}.`,
  }
}

function canUseFactVisibility(
  visibility: RemyFactVisibility,
  userRole: RemyBoundaryUserRole,
  outputChannel: RemyBoundaryOutputChannel
): boolean {
  if (userRole === 'developer' || userRole === 'admin') return outputChannel === 'internal_note'
  if (userRole === 'chef' && outputChannel === 'chef_private') return true

  if (outputChannel === 'public_profile') return visibility === 'public'
  if (outputChannel === 'client_message')
    return visibility === 'public' || visibility === 'client_safe'
  if (outputChannel === 'staff_briefing')
    return visibility === 'public' || visibility === 'staff_safe'
  if (outputChannel === 'vendor_message')
    return visibility === 'public' || visibility === 'vendor_safe'
  if (outputChannel === 'internal_note') {
    return userRole === 'chef' || userRole === 'staff'
  }

  return false
}

function chooseAllowedOutputChannel(
  input: RemySensitiveBoundaryInput,
  requestContext: RemyBoundaryRequestContext
): RemyBoundaryOutputChannel {
  const requested = input.requestedOutputChannel
  const sensitivityClasses = classifyBoundarySensitivity(
    [input.requestText, input.draftOutput ?? ''].join(' ')
  )
  const sensitive = sensitivityClasses.length > 0

  if (!requested && sensitive && input.userRole !== 'chef') return 'chef_private'
  if (requested) return requested

  if (input.userRole === 'chef') return 'chef_private'
  if (requestContext === 'client_safe_scheduling') return 'client_message'
  if (requestContext === 'public_profile_copy') return 'public_profile'
  if (requestContext === 'staff_briefing') return 'staff_briefing'
  if (requestContext === 'vendor_coordination') return 'vendor_message'

  return 'chef_private'
}

function buildRedactionReason(input: {
  blockedFacts: RemySourceFactVisibilityDecision[]
  forbiddenFactAppears: boolean
  externalSensitiveOutput: boolean
  coercedPrivate: boolean
  sensitivityClasses: RemyBoundarySensitivity[]
}): string | null {
  const reasons: string[] = []

  if (input.blockedFacts.length > 0) {
    reasons.push(
      `blocked source facts: ${input.blockedFacts
        .map((fact) => `${fact.label} (${fact.visibility})`)
        .join(', ')}`
    )
  }

  if (input.forbiddenFactAppears)
    reasons.push('draft output used a source fact outside its visibility')
  if (input.externalSensitiveOutput) {
    reasons.push(
      `sensitive classes require chef-only handling: ${input.sensitivityClasses.join(', ')}`
    )
  }
  if (input.coercedPrivate) reasons.push('sensitive request defaulted to chef-private review')

  return reasons.length > 0 ? reasons.join('; ') : null
}

function buildSafeAlternative(
  requestContext: RemyBoundaryRequestContext,
  outputChannel: RemyBoundaryOutputChannel,
  decision: RemyBoundaryDecisionKind
): string | null {
  if (decision === 'allow') return null

  if (requestContext === 'client_safe_scheduling') {
    return 'Use a neutral status update about timing: the schedule needs a small adjustment, and the chef will confirm the updated timing shortly.'
  }

  if (requestContext === 'public_profile_copy') {
    return 'Use public-facing copy focused on services, cuisine, availability, and guest experience without private business, client, health, family, compliance, or crisis context.'
  }

  if (requestContext === 'staff_briefing') {
    return 'Share only operational details staff need to execute the event, and keep private chef, client, financial, compliance, or crisis facts in a chef-only note.'
  }

  if (outputChannel === 'chef_private') {
    return 'Keep this as chef-private analysis until the chef approves any client, public, staff, or vendor wording.'
  }

  return 'Use neutral wording that omits private ChefFlow facts and asks the chef to approve any external wording.'
}

function textIncludesFact(text: string, factText: string): boolean {
  return text.toLowerCase().includes(factText.toLowerCase())
}

function replaceLiteral(text: string, literal: string, replacement: string): string {
  const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(escaped, 'gi'), replacement)
}

function uniqueSensitivity(values: RemyBoundarySensitivity[]): RemyBoundarySensitivity[] {
  return [...new Set(values)]
}
