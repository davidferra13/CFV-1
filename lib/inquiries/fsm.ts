/**
 * Inquiry FSM - Pure workflow rules
 *
 * Shared by server actions and tests so status transitions stay consistent.
 */

export type InquiryStatus =
  | 'new'
  | 'awaiting_client'
  | 'awaiting_chef'
  | 'quoted'
  | 'confirmed'
  | 'declined'
  | 'expired'

export const ALL_INQUIRY_STATUSES: InquiryStatus[] = [
  'new',
  'awaiting_client',
  'awaiting_chef',
  'quoted',
  'confirmed',
  'declined',
  'expired',
]

export const TERMINAL_INQUIRY_STATES: InquiryStatus[] = ['confirmed', 'declined']

export const INQUIRY_TRANSITION_RULES: Record<InquiryStatus, InquiryStatus[]> = {
  new: ['awaiting_client', 'quoted', 'declined'],
  awaiting_client: ['awaiting_chef', 'quoted', 'declined', 'expired'],
  awaiting_chef: ['quoted', 'declined'],
  quoted: ['confirmed', 'declined', 'expired'],
  confirmed: [],
  declined: [],
  expired: ['new'],
}

export function isValidInquiryTransition(from: InquiryStatus, to: InquiryStatus): boolean {
  return INQUIRY_TRANSITION_RULES[from]?.includes(to) ?? false
}

export function getAllowedInquiryTransitions(from: InquiryStatus): InquiryStatus[] {
  return INQUIRY_TRANSITION_RULES[from] ?? []
}

export function isTerminalInquiryState(status: InquiryStatus): boolean {
  return TERMINAL_INQUIRY_STATES.includes(status)
}

export function shouldSyncInquiryToQuotedFromQuoteSend(status: InquiryStatus): boolean {
  return ['new', 'awaiting_client', 'awaiting_chef'].includes(status)
}
