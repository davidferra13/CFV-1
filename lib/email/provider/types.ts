import type { ReactElement } from 'react'

export const EMAIL_PROVIDER_NAMES = ['resend'] as const
export type EmailProviderName = (typeof EMAIL_PROVIDER_NAMES)[number]

export const EMAIL_MESSAGE_KINDS = ['transactional', 'marketing', 'operational'] as const
export type EmailMessageKind = (typeof EMAIL_MESSAGE_KINDS)[number]

export type EmailAddressList = string | string[]

export type EmailAttachment = {
  filename: string
  content: Buffer | string
  contentType?: string
}

export interface EmailOutboundRequest {
  kind: EmailMessageKind
  to: EmailAddressList
  subject: string
  from?: string
  replyTo?: string
  cc?: EmailAddressList
  bcc?: EmailAddressList
  react?: ReactElement
  html?: string
  text?: string
  attachments?: EmailAttachment[]
}

export interface EmailProviderMessageIdentity {
  provider: EmailProviderName
  providerMessageId: string | null
  legacyResendMessageId: string | null
}

export interface EmailProviderSendResult {
  provider: EmailProviderName
  kind: EmailMessageKind
  acceptedAt: string
  message: EmailProviderMessageIdentity
}

export const EMAIL_RETRY_CLASSIFICATIONS = ['retryable', 'permanent'] as const
export type EmailRetryClassification = (typeof EMAIL_RETRY_CLASSIFICATIONS)[number]

export const EMAIL_SUPPRESSION_OUTCOMES = [
  'none',
  'hard_bounce',
  'invalid',
  'not_found',
  'undeliverable',
  'spam_complaint',
] as const
export type EmailSuppressionOutcome = (typeof EMAIL_SUPPRESSION_OUTCOMES)[number]

export const EMAIL_ERROR_CATEGORIES = [
  'transient',
  'hard_bounce',
  'complaint',
  'permanent',
] as const
export type EmailErrorCategory = (typeof EMAIL_ERROR_CATEGORIES)[number]

export interface EmailProviderErrorClassification {
  retry: EmailRetryClassification
  suppression: EmailSuppressionOutcome
  category: EmailErrorCategory
  message: string
}

export const NORMALIZED_EMAIL_EVENT_KINDS = [
  'accepted',
  'delivered',
  'opened',
  'clicked',
  'bounced',
  'complained',
  'unsubscribed',
] as const
export type NormalizedEmailEventKind = (typeof NORMALIZED_EMAIL_EVENT_KINDS)[number]

export interface NormalizedEmailEvent {
  provider: EmailProviderName
  kind: NormalizedEmailEventKind
  providerEventType: string
  occurredAt: string
  message: EmailProviderMessageIdentity
  recipients: string[]
  suppression: EmailSuppressionOutcome
  raw: unknown
}

export interface EmailProvider {
  readonly name: EmailProviderName
  send(request: EmailOutboundRequest): Promise<EmailProviderSendResult>
  classifyError(error: unknown): EmailProviderErrorClassification
}
