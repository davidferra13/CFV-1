import {
  buildDefaultAutonomyPreferences,
  normalizeConfidence,
} from '@/lib/autonomy/approval-router'
import { detectSituation, routeToApproval } from '@/lib/autonomy/engine'
import type {
  ApprovalGate,
  AutonomyAction,
  AutonomyDraft,
  AutonomyEntityRef,
  AutonomyEvidence,
  AutonomyPreferences,
  AutonomyRiskLevel,
  AutonomySituation,
} from '@/lib/autonomy/types'

export const COMMUNICATION_ACTION_TYPES = {
  inquiryFollowUp: 'communication.inquiry_follow_up',
  eventConfirmation: 'communication.event_confirmation',
  paymentReminder: 'communication.payment_reminder',
  rebookingOutreach: 'communication.rebooking_outreach',
  postEventThankYou: 'communication.post_event_thank_you',
} as const

export type CommunicationActionType =
  (typeof COMMUNICATION_ACTION_TYPES)[keyof typeof COMMUNICATION_ACTION_TYPES]

export type CommunicationSignalType =
  | 'inquiry_follow_up'
  | 'event_confirmation'
  | 'payment_reminder'
  | 'rebooking_outreach'
  | 'post_event_thank_you'

export type CommunicationChannel = 'email' | 'sms' | 'phone' | 'in_app'

export type CommunicationRoutingClass =
  | 'logistics'
  | 'standard_reminder'
  | 'client_outreach'
  | 'financial'

export interface CommunicationContact {
  id?: string
  name?: string
  email?: string
  phone?: string
}

export interface CommunicationChefProfile {
  name?: string
  businessName?: string
  replyToEmail?: string
}

export interface CommunicationEventContext {
  id?: string
  title?: string
  eventType?: string
  date?: string
  time?: string
  location?: string
  guestCount?: number
  menuName?: string
}

export interface CommunicationInquiryContext {
  id?: string
  eventType?: string
  requestedDate?: string
  guestCount?: number
  budget?: string
  notes?: string
}

export interface CommunicationPaymentContext {
  id?: string
  amountDue?: string
  dueDate?: string
  invoiceNumber?: string
  invoiceUrl?: string
}

export interface CommunicationSignalInput {
  tenantId: string
  signalType: CommunicationSignalType
  source?: string
  channel?: CommunicationChannel
  confidenceScore?: number
  urgency?: number
  recipient?: CommunicationContact
  chef?: CommunicationChefProfile
  inquiry?: CommunicationInquiryContext
  event?: CommunicationEventContext
  previousEvent?: CommunicationEventContext
  payment?: CommunicationPaymentContext
  entityRefs?: AutonomyEntityRef[]
  payload?: Record<string, unknown>
}

export interface CommunicationDraftPayload {
  tenantId: string
  actionType: CommunicationActionType
  signalType: CommunicationSignalType
  routingClass: CommunicationRoutingClass
  channel: CommunicationChannel
  subject: string
  body: string
  recipient: CommunicationContact
  chef: CommunicationChefProfile
  inquiry?: CommunicationInquiryContext
  event?: CommunicationEventContext
  previousEvent?: CommunicationEventContext
  payment?: CommunicationPaymentContext
  metadata: Record<string, unknown>
}

export interface CommunicationSignalResult {
  situation: AutonomySituation
  action: AutonomyAction
  gate: ApprovalGate
}

interface CommunicationTemplateResult {
  subject: string
  body: string
  summary: string
  preview: string
  nextStepLabel: string
}

const ACTION_TYPE_BY_SIGNAL: Record<CommunicationSignalType, CommunicationActionType> = {
  inquiry_follow_up: COMMUNICATION_ACTION_TYPES.inquiryFollowUp,
  event_confirmation: COMMUNICATION_ACTION_TYPES.eventConfirmation,
  payment_reminder: COMMUNICATION_ACTION_TYPES.paymentReminder,
  rebooking_outreach: COMMUNICATION_ACTION_TYPES.rebookingOutreach,
  post_event_thank_you: COMMUNICATION_ACTION_TYPES.postEventThankYou,
}

const ROUTING_CLASS_BY_SIGNAL: Record<CommunicationSignalType, CommunicationRoutingClass> = {
  inquiry_follow_up: 'client_outreach',
  event_confirmation: 'logistics',
  payment_reminder: 'financial',
  rebooking_outreach: 'client_outreach',
  post_event_thank_you: 'client_outreach',
}

const RISK_BY_SIGNAL: Record<CommunicationSignalType, AutonomyRiskLevel> = {
  inquiry_follow_up: 'medium',
  event_confirmation: 'low',
  payment_reminder: 'high',
  rebooking_outreach: 'medium',
  post_event_thank_you: 'medium',
}

const DEFAULT_CONFIDENCE_BY_SIGNAL: Record<CommunicationSignalType, number> = {
  inquiry_follow_up: 0.82,
  event_confirmation: 0.9,
  payment_reminder: 0.86,
  rebooking_outreach: 0.8,
  post_event_thank_you: 0.84,
}

export function buildDefaultCommunicationAutonomyPreferences(
  tenantId: string
): AutonomyPreferences {
  const defaults = buildDefaultAutonomyPreferences(requireTenantId(tenantId))
  const communicationActionTypes = new Set<string>(Object.values(COMMUNICATION_ACTION_TYPES))

  return {
    ...defaults,
    domainModes: {
      ...defaults.domainModes,
      communication: 'approval',
      logistics: 'auto',
    },
    actionPolicies: [
      ...defaults.actionPolicies.filter(
        (policy) => !communicationActionTypes.has(policy.actionType)
      ),
      {
        actionType: COMMUNICATION_ACTION_TYPES.eventConfirmation,
        mode: 'auto',
        minConfidence: 0.85,
        maxRiskLevel: 'low',
      },
      {
        actionType: COMMUNICATION_ACTION_TYPES.inquiryFollowUp,
        mode: 'approval',
        minConfidence: 0.8,
        maxRiskLevel: 'medium',
      },
      {
        actionType: COMMUNICATION_ACTION_TYPES.rebookingOutreach,
        mode: 'approval',
        minConfidence: 0.8,
        maxRiskLevel: 'medium',
      },
      {
        actionType: COMMUNICATION_ACTION_TYPES.postEventThankYou,
        mode: 'approval',
        minConfidence: 0.8,
        maxRiskLevel: 'medium',
      },
      {
        actionType: COMMUNICATION_ACTION_TYPES.paymentReminder,
        mode: 'approval',
        minConfidence: 0.85,
        maxRiskLevel: 'high',
      },
    ],
  }
}

export function getDefaultCommunicationAutonomyPreferences(tenantId: string): AutonomyPreferences {
  return buildDefaultCommunicationAutonomyPreferences(tenantId)
}

export function processCommunicationSignal(
  input: CommunicationSignalInput,
  options: { preferences?: AutonomyPreferences } = {}
): CommunicationSignalResult {
  const action = draftCommunicationAction(input)
  const gate = routeToApproval(
    action,
    options.preferences ?? buildDefaultCommunicationAutonomyPreferences(action.tenantId)
  )

  return {
    situation: action.situation,
    action,
    gate,
  }
}

export function draftCommunicationAction(input: CommunicationSignalInput): AutonomyAction {
  const tenantId = requireTenantId(input.tenantId)
  const actionType = ACTION_TYPE_BY_SIGNAL[input.signalType]
  const routingClass = ROUTING_CLASS_BY_SIGNAL[input.signalType]
  const channel = input.channel ?? 'email'
  const confidenceScore = normalizeConfidence(
    input.confidenceScore ?? DEFAULT_CONFIDENCE_BY_SIGNAL[input.signalType]
  )
  const template = buildTemplate(input, channel)
  const situation = detectSituation({
    tenantId,
    domain: 'communication',
    source: input.source ?? 'communication_autonomy_adapter',
    signalType: actionType,
    title: template.summary,
    detail: template.preview,
    urgency: input.urgency ?? defaultUrgency(input.signalType),
    confidenceScore,
    entityRefs: buildEntityRefs(input),
    payload: {
      tenantId,
      signalType: input.signalType,
      actionType,
      routingClass,
      channel,
      ...(input.payload ?? {}),
    },
  })

  const draftPayload: CommunicationDraftPayload = {
    tenantId,
    actionType,
    signalType: input.signalType,
    routingClass,
    channel,
    subject: template.subject,
    body: template.body,
    recipient: input.recipient ?? {},
    chef: input.chef ?? {},
    inquiry: input.inquiry,
    event: input.event,
    previousEvent: input.previousEvent,
    payment: input.payment,
    metadata: input.payload ?? {},
  }

  const draft: AutonomyDraft = {
    summary: template.summary,
    preview: template.preview,
    payload: draftPayload as unknown as Record<string, unknown>,
    reversible: true,
    evidence: buildEvidence(input, routingClass),
    nextStepLabel: template.nextStepLabel,
  }

  return {
    tenantId,
    domain: 'communication',
    actionType,
    title: template.summary,
    description: template.preview,
    riskLevel: RISK_BY_SIGNAL[input.signalType],
    confidenceScore,
    draftMethod: 'template',
    draft,
    source: situation.source,
    situation,
    entityRefs: situation.entityRefs,
    dedupKey: buildCommunicationDedupKey(input, actionType),
    status: 'drafted',
    createdAt: new Date().toISOString(),
  }
}

function buildTemplate(
  input: CommunicationSignalInput,
  channel: CommunicationChannel
): CommunicationTemplateResult {
  switch (input.signalType) {
    case 'inquiry_follow_up':
      return buildInquiryFollowUpTemplate(input, channel)
    case 'event_confirmation':
      return buildEventConfirmationTemplate(input, channel)
    case 'payment_reminder':
      return buildPaymentReminderTemplate(input, channel)
    case 'rebooking_outreach':
      return buildRebookingOutreachTemplate(input, channel)
    case 'post_event_thank_you':
      return buildPostEventThankYouTemplate(input, channel)
  }
}

function buildInquiryFollowUpTemplate(
  input: CommunicationSignalInput,
  channel: CommunicationChannel
): CommunicationTemplateResult {
  const clientName = firstName(input.recipient?.name)
  const eventLabel = eventLabelFrom(input.inquiry, input.event)
  const details = compactLines([
    input.inquiry?.requestedDate ? `Requested date: ${input.inquiry.requestedDate}` : undefined,
    input.inquiry?.guestCount ? `Guest count: ${input.inquiry.guestCount}` : undefined,
    input.inquiry?.budget ? `Budget notes: ${input.inquiry.budget}` : undefined,
    input.inquiry?.notes ? `Notes: ${input.inquiry.notes}` : undefined,
  ])
  const body = compactLines([
    `Hi ${clientName},`,
    '',
    `Thanks again for reaching out about ${eventLabel}. I wanted to follow up and confirm the remaining details so I can give you a clear next step.`,
    details ? ['', 'What I have so far:', details].join('\n') : undefined,
    '',
    'If you can reply with any remaining preferences, timing, or budget notes, I can turn this around from there.',
    '',
    signoff(input.chef),
  ]).join('\n')

  return {
    subject: `Following up on your ${eventLabel} inquiry`,
    body,
    summary: `Draft inquiry follow-up for ${recipientLabel(input.recipient)}`,
    preview: previewFor(channel, body),
    nextStepLabel: 'Review client follow-up',
  }
}

function buildEventConfirmationTemplate(
  input: CommunicationSignalInput,
  channel: CommunicationChannel
): CommunicationTemplateResult {
  const clientName = firstName(input.recipient?.name)
  const eventLabel = input.event?.title ?? input.event?.eventType ?? 'your event'
  const details = compactLines([
    input.event?.date ? `Date: ${input.event.date}` : undefined,
    input.event?.time ? `Time: ${input.event.time}` : undefined,
    input.event?.location ? `Location: ${input.event.location}` : undefined,
    input.event?.guestCount ? `Guest count: ${input.event.guestCount}` : undefined,
    input.event?.menuName ? `Menu: ${input.event.menuName}` : undefined,
  ])
  const body = compactLines([
    `Hi ${clientName},`,
    '',
    `I have ${eventLabel} confirmed on my calendar.`,
    details ? ['', 'Current details:', details].join('\n') : undefined,
    '',
    'Please reply if anything has changed. Otherwise I will keep preparing from these details.',
    '',
    signoff(input.chef),
  ]).join('\n')

  return {
    subject: `Confirming ${eventLabel}`,
    body,
    summary: `Draft event confirmation for ${eventLabel}`,
    preview: previewFor(channel, body),
    nextStepLabel: 'Send logistics confirmation',
  }
}

function buildPaymentReminderTemplate(
  input: CommunicationSignalInput,
  channel: CommunicationChannel
): CommunicationTemplateResult {
  const clientName = firstName(input.recipient?.name)
  const eventLabel = input.event?.title ?? input.event?.eventType ?? 'your event'
  const invoiceLabel = input.payment?.invoiceNumber
    ? `invoice ${input.payment.invoiceNumber}`
    : 'the invoice'
  const details = compactLines([
    input.payment?.amountDue ? `Amount due: ${input.payment.amountDue}` : undefined,
    input.payment?.dueDate ? `Due date: ${input.payment.dueDate}` : undefined,
    input.payment?.invoiceUrl ? `Payment link: ${input.payment.invoiceUrl}` : undefined,
  ])
  const body = compactLines([
    `Hi ${clientName},`,
    '',
    `This is a quick reminder that ${invoiceLabel} for ${eventLabel} is still awaiting payment.`,
    details ? ['', details].join('\n') : undefined,
    '',
    'Please let me know if you have any questions or need the invoice resent.',
    '',
    signoff(input.chef),
  ]).join('\n')

  return {
    subject: `Payment reminder for ${eventLabel}`,
    body,
    summary: `Draft payment reminder for ${eventLabel}`,
    preview: previewFor(channel, body),
    nextStepLabel: 'Review financial message',
  }
}

function buildRebookingOutreachTemplate(
  input: CommunicationSignalInput,
  channel: CommunicationChannel
): CommunicationTemplateResult {
  const clientName = firstName(input.recipient?.name)
  const previousEventLabel =
    input.previousEvent?.title ??
    input.previousEvent?.eventType ??
    input.event?.title ??
    'last time'
  const body = compactLines([
    `Hi ${clientName},`,
    '',
    `I was thinking about ${previousEventLabel} and wanted to see if you would like to get another date on the calendar.`,
    '',
    'If you have a season, occasion, or guest count in mind, send it over and I can help shape a few options.',
    '',
    signoff(input.chef),
  ]).join('\n')

  return {
    subject: 'Would you like to get another date on the calendar?',
    body,
    summary: `Draft rebooking outreach for ${recipientLabel(input.recipient)}`,
    preview: previewFor(channel, body),
    nextStepLabel: 'Review rebooking outreach',
  }
}

function buildPostEventThankYouTemplate(
  input: CommunicationSignalInput,
  channel: CommunicationChannel
): CommunicationTemplateResult {
  const clientName = firstName(input.recipient?.name)
  const eventLabel = input.event?.title ?? input.event?.eventType ?? 'your event'
  const body = compactLines([
    `Hi ${clientName},`,
    '',
    `Thank you again for having me for ${eventLabel}. I appreciated the chance to cook for you and your guests.`,
    '',
    'If anything stood out or there is feedback you want me to keep in mind for next time, I would be glad to hear it.',
    '',
    signoff(input.chef),
  ]).join('\n')

  return {
    subject: `Thank you for ${eventLabel}`,
    body,
    summary: `Draft post-event thank you for ${eventLabel}`,
    preview: previewFor(channel, body),
    nextStepLabel: 'Review thank you note',
  }
}

function buildEvidence(
  input: CommunicationSignalInput,
  routingClass: CommunicationRoutingClass
): AutonomyEvidence[] {
  const evidence: AutonomyEvidence[] = [
    {
      label: 'Routing class',
      value: routingClass,
    },
    {
      label: 'Signal type',
      value: input.signalType,
    },
  ]

  if (input.event?.id) {
    evidence.push({
      label: 'Event',
      value: input.event.title ?? input.event.id,
      source: `events:${input.event.id}`,
    })
  }

  if (input.inquiry?.id) {
    evidence.push({
      label: 'Inquiry',
      value: input.inquiry.eventType ?? input.inquiry.id,
      source: `inquiries:${input.inquiry.id}`,
    })
  }

  if (input.payment?.id) {
    evidence.push({
      label: 'Payment',
      value: input.payment.invoiceNumber ?? input.payment.id,
      source: `payments:${input.payment.id}`,
    })
  }

  return evidence
}

function buildEntityRefs(input: CommunicationSignalInput): AutonomyEntityRef[] {
  const refs = [...(input.entityRefs ?? [])]

  if (input.recipient?.id) {
    refs.push({
      type: 'client',
      id: input.recipient.id,
      label: input.recipient.name,
    })
  }

  if (input.event?.id) {
    refs.push({
      type: 'event',
      id: input.event.id,
      label: input.event.title,
    })
  }

  if (input.previousEvent?.id) {
    refs.push({
      type: 'event',
      id: input.previousEvent.id,
      label: input.previousEvent.title,
    })
  }

  if (input.inquiry?.id) {
    refs.push({
      type: 'inquiry',
      id: input.inquiry.id,
      label: input.inquiry.eventType,
    })
  }

  if (input.payment?.id) {
    refs.push({
      type: 'payment',
      id: input.payment.id,
      label: input.payment.invoiceNumber,
    })
  }

  return dedupeEntityRefs(refs)
}

function buildCommunicationDedupKey(
  input: CommunicationSignalInput,
  actionType: CommunicationActionType
): string {
  const scopedIds = [
    input.tenantId,
    actionType,
    input.recipient?.id,
    input.event?.id,
    input.previousEvent?.id,
    input.inquiry?.id,
    input.payment?.id,
  ]
    .filter(Boolean)
    .join(':')

  return scopedIds || `${input.tenantId}:${actionType}:${recipientLabel(input.recipient)}`
}

function dedupeEntityRefs(refs: AutonomyEntityRef[]): AutonomyEntityRef[] {
  const seen = new Set<string>()

  return refs.filter((ref) => {
    const key = `${ref.type}:${ref.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function defaultUrgency(signalType: CommunicationSignalType): number {
  if (signalType === 'payment_reminder') return 4
  if (signalType === 'event_confirmation') return 3
  return 2
}

function eventLabelFrom(
  inquiry: CommunicationInquiryContext | undefined,
  event: CommunicationEventContext | undefined
): string {
  return event?.title ?? inquiry?.eventType ?? event?.eventType ?? 'private event'
}

function recipientLabel(recipient: CommunicationContact | undefined): string {
  return recipient?.name ?? recipient?.email ?? recipient?.phone ?? 'client'
}

function firstName(name: string | undefined): string {
  const cleanName = name?.trim()
  if (!cleanName) return 'there'
  return cleanName.split(/\s+/)[0] ?? 'there'
}

function signoff(chef: CommunicationChefProfile | undefined): string {
  return chef?.name ?? chef?.businessName ?? 'Chef'
}

function previewFor(channel: CommunicationChannel, body: string): string {
  if (channel !== 'sms') return body
  return body.replace(/\s+/g, ' ').trim().slice(0, 320)
}

function compactLines(lines: Array<string | undefined>): string[] {
  return lines.filter((line): line is string => typeof line === 'string' && line.length > 0)
}

function requireTenantId(tenantId: string): string {
  const cleanTenantId = tenantId.trim()
  if (!cleanTenantId) {
    throw new Error('Communication autonomy input requires tenantId.')
  }

  return cleanTenantId
}
