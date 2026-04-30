import type { ActivityEventType } from './types'

export type LiveSignalPriority = 'quiet' | 'standard' | 'high'

export type LiveSignalPolicy = {
  eventType: ActivityEventType
  priority: LiveSignalPriority
  activityLabel: string
  alertTitle: (clientName: string) => string
  alertMessage: (clientName: string) => string
  followUpCopy: string
}

const DEFAULT_POLICY: Omit<LiveSignalPolicy, 'eventType'> = {
  priority: 'standard',
  activityLabel: 'is active in ChefFlow',
  alertTitle: (clientName) => `${clientName} is active in ChefFlow`,
  alertMessage: (clientName) =>
    `${clientName} is active in ChefFlow. Send a helpful check-in only if it fits the moment.`,
  followUpCopy: 'Wanted to check whether you had any questions.',
}

export const LIVE_SIGNAL_POLICIES: Partial<Record<ActivityEventType, LiveSignalPolicy>> = {
  portal_login: {
    eventType: 'portal_login',
    priority: 'standard',
    activityLabel: 'opened the client portal',
    alertTitle: (clientName) => `${clientName} opened the client portal`,
    alertMessage: (clientName) =>
      `${clientName} opened the client portal. If a response is due, send a helpful check-in.`,
    followUpCopy: 'Wanted to check whether there is anything I can clarify for you.',
  },
  payment_page_visited: {
    eventType: 'payment_page_visited',
    priority: 'high',
    activityLabel: 'opened the payment page',
    alertTitle: (clientName) => `Payment signal: ${clientName}`,
    alertMessage: (clientName) =>
      `${clientName} opened the payment page. A short, helpful payment note may be appropriate.`,
    followUpCopy: 'Wanted to check whether the payment page is clear or if anything needs help.',
  },
  proposal_viewed: {
    eventType: 'proposal_viewed',
    priority: 'high',
    activityLabel: 'reviewed a proposal',
    alertTitle: (clientName) => `Proposal signal: ${clientName}`,
    alertMessage: (clientName) =>
      `${clientName} reviewed a proposal. Follow up with context, not with surveillance wording.`,
    followUpCopy: 'Wanted to check whether you had any questions about the proposal.',
  },
  quote_viewed: {
    eventType: 'quote_viewed',
    priority: 'high',
    activityLabel: 'reviewed a quote',
    alertTitle: (clientName) => `Quote signal: ${clientName}`,
    alertMessage: (clientName) =>
      `${clientName} reviewed a quote. Follow up with context, not with surveillance wording.`,
    followUpCopy: 'Wanted to check whether you had any questions about the quote.',
  },
  public_profile_viewed: {
    eventType: 'public_profile_viewed',
    priority: 'standard',
    activityLabel: 'viewed your public profile',
    alertTitle: (clientName) => `${clientName} viewed your profile`,
    alertMessage: (clientName) =>
      `${clientName} viewed your public profile. Use normal outreach language if you follow up.`,
    followUpCopy: 'Wanted to see if you had any questions about working together.',
  },
}

export const DEFAULT_ALERTABLE_EVENTS: ActivityEventType[] = [
  'portal_login',
  'payment_page_visited',
  'proposal_viewed',
  'quote_viewed',
  'public_profile_viewed',
]

export function getLiveSignalPolicy(eventType: ActivityEventType): LiveSignalPolicy {
  return (
    LIVE_SIGNAL_POLICIES[eventType] ?? {
      ...DEFAULT_POLICY,
      eventType,
    }
  )
}

export function getPrivacyAwareFollowUpCopy(eventType: ActivityEventType): string {
  return getLiveSignalPolicy(eventType).followUpCopy
}

export function getLivePrivacySignalLabel(eventType: ActivityEventType): string {
  switch (eventType) {
    case 'proposal_viewed':
      return 'Proposal viewed'
    case 'quote_viewed':
      return 'Quote viewed'
    case 'invoice_viewed':
      return 'Invoice opened'
    case 'chat_opened':
      return 'Messages opened'
    case 'payment_page_visited':
      return 'Payment page opened'
    case 'document_downloaded':
      return 'Document downloaded'
    case 'session_heartbeat':
      return 'Active-now heartbeat'
    case 'portal_login':
      return 'Portal opened'
    case 'chat_message_sent':
      return 'Message sent'
    case 'form_submitted':
      return 'Form submitted'
    case 'rsvp_submitted':
      return 'RSVP submitted'
    default:
      return eventType.replace(/_/g, ' ')
  }
}

export function getLiveSignalConfidenceCopy(hasSignal: boolean): string {
  return hasSignal
    ? 'This is a real client signal shared by their current privacy controls.'
    : 'No live signal is available. The client may not be active, or they may be browsing privately.'
}

export type LiveSignalDigestInput = {
  eventType: ActivityEventType
  clientId?: string | null
  privateMode?: boolean
}

export type LiveSignalDigest = {
  proposalReviews: number
  paymentPageVisits: number
  messagesSent: number
  privateSignals: number
  highIntentSignals: number
  totalSignals: number
}

export function summarizeLiveSignals(events: LiveSignalDigestInput[]): LiveSignalDigest {
  const digest: LiveSignalDigest = {
    proposalReviews: 0,
    paymentPageVisits: 0,
    messagesSent: 0,
    privateSignals: 0,
    highIntentSignals: 0,
    totalSignals: events.length,
  }

  for (const event of events) {
    if (event.privateMode) {
      digest.privateSignals += 1
      continue
    }

    if (event.eventType === 'proposal_viewed' || event.eventType === 'quote_viewed') {
      digest.proposalReviews += 1
    }

    if (event.eventType === 'payment_page_visited') {
      digest.paymentPageVisits += 1
    }

    if (event.eventType === 'chat_message_sent') {
      digest.messagesSent += 1
    }

    if (getLiveSignalPolicy(event.eventType).priority === 'high') {
      digest.highIntentSignals += 1
    }
  }

  return digest
}

export function shouldPromoteLiveSignal(input: {
  eventType: ActivityEventType
  privateMode?: boolean
  duplicateCountInWindow?: number
}): boolean {
  if (input.privateMode) return false
  if (input.duplicateCountInWindow && input.duplicateCountInWindow > 0) return false
  return getLiveSignalPolicy(input.eventType).priority === 'high'
}
