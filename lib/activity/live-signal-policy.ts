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

export function getLiveSignalConfidenceCopy(hasSignal: boolean): string {
  return hasSignal
    ? 'This is a real client signal shared by their current privacy controls.'
    : 'No live signal is available. The client may not be active, or they may be browsing privately.'
}
