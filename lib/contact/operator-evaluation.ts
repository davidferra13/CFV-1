export const CONTACT_INTAKE_LANES = {
  GENERAL_CONTACT: 'general_contact',
  OPERATOR_WALKTHROUGH: 'operator_walkthrough',
} as const

export type ContactIntakeLane = (typeof CONTACT_INTAKE_LANES)[keyof typeof CONTACT_INTAKE_LANES]

export const OPERATOR_EVALUATION_STATUSES = [
  'new',
  'qualified',
  'replied',
  'scheduled',
  'pilot',
  'not_fit',
] as const

export type OperatorEvaluationStatus = (typeof OPERATOR_EVALUATION_STATUSES)[number]

export type OperatorEvaluationStatusTone = 'default' | 'success' | 'warning' | 'error' | 'info'

export const OPERATOR_EVALUATION_STATUS_META: Record<
  OperatorEvaluationStatus,
  { label: string; tone: OperatorEvaluationStatusTone }
> = {
  new: { label: 'New', tone: 'info' },
  qualified: { label: 'Qualified', tone: 'success' },
  replied: { label: 'Replied', tone: 'default' },
  scheduled: { label: 'Scheduled', tone: 'warning' },
  pilot: { label: 'Pilot', tone: 'success' },
  not_fit: { label: 'Not fit', tone: 'error' },
}

const WALKTHROUGH_MARKER = 'Operator walkthrough request'
const PRIVACY_DATA_REQUEST_SUBJECT_PREFIX = 'Data Request:'
export const PRIVACY_DATA_REQUEST_SOURCE_PAGE = '/data-request'
export const PRIVACY_DATA_REQUEST_SOURCE_CTA = 'privacy_request_form'

type ParseOperatorWalkthroughInput = {
  subject?: string | null
  message?: string | null
  sourceCta?: string | null
  sourcePage?: string | null
}

export type ParsedOperatorWalkthroughSubmission = {
  intakeLane: ContactIntakeLane
  businessName: string | null
  operatorType: string | null
  workflowStack: string | null
  helpRequest: string | null
  sourcePage: string | null
  sourceCta: string | null
}

function normalizeValue(value?: string | null) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function extractSingleLineValue(message: string, label: string) {
  const pattern = new RegExp(`^${label}:\\s*(.+)\\r?$`, 'im')
  return normalizeValue(message.match(pattern)?.[1] ?? null)
}

function extractMultilineSection(message: string, startLabel: string, endLabel: string) {
  const escapedStart = startLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escapedEnd = endLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(
    `${escapedStart}:\\s*\\r?\\n([\\s\\S]*?)\\r?\\n\\r?\\n${escapedEnd}:`,
    'i'
  )

  return normalizeValue(message.match(pattern)?.[1] ?? null)
}

export function isOperatorWalkthroughSubmission(input: ParseOperatorWalkthroughInput) {
  const subject = normalizeValue(input.subject)
  const message = normalizeValue(input.message)

  return (
    subject?.startsWith(WALKTHROUGH_MARKER) === true ||
    message?.startsWith(WALKTHROUGH_MARKER) === true
  )
}

export function isPrivacyDataRequestSubmission(input: ParseOperatorWalkthroughInput) {
  const subject = normalizeValue(input.subject)
  const sourcePage = normalizeValue(input.sourcePage)
  const sourceCta = normalizeValue(input.sourceCta)

  return (
    subject?.startsWith(PRIVACY_DATA_REQUEST_SUBJECT_PREFIX) === true ||
    sourcePage === PRIVACY_DATA_REQUEST_SOURCE_PAGE ||
    sourceCta === PRIVACY_DATA_REQUEST_SOURCE_CTA
  )
}

export function detectContactIntakeLane(
  requestedLane?: ContactIntakeLane | null,
  input?: ParseOperatorWalkthroughInput
): ContactIntakeLane {
  if (requestedLane === CONTACT_INTAKE_LANES.OPERATOR_WALKTHROUGH) {
    return requestedLane
  }

  if (input && isOperatorWalkthroughSubmission(input)) {
    return CONTACT_INTAKE_LANES.OPERATOR_WALKTHROUGH
  }

  return CONTACT_INTAKE_LANES.GENERAL_CONTACT
}

export function parseOperatorWalkthroughSubmission(
  input: ParseOperatorWalkthroughInput
): ParsedOperatorWalkthroughSubmission | null {
  if (!isOperatorWalkthroughSubmission(input)) {
    return null
  }

  const message = normalizeValue(input.message) ?? ''

  return {
    intakeLane: CONTACT_INTAKE_LANES.OPERATOR_WALKTHROUGH,
    businessName: extractSingleLineValue(message, 'Business name'),
    operatorType: extractSingleLineValue(message, 'Operator type'),
    workflowStack: extractMultilineSection(
      message,
      'Current workflow or tool stack',
      'What they want help with'
    ),
    helpRequest: extractMultilineSection(message, 'What they want help with', 'Source page'),
    sourcePage:
      normalizeValue(input.sourcePage) ??
      extractSingleLineValue(message, 'Source page') ??
      'direct',
    sourceCta:
      normalizeValue(input.sourceCta) ?? extractSingleLineValue(message, 'Source CTA') ?? 'direct',
  }
}
