import { getResendClient } from '../resend-client'
import type {
  EmailOutboundRequest,
  EmailProvider,
  EmailProviderErrorClassification,
  EmailProviderName,
  EmailProviderSendResult,
} from './types'

type ResendClient = ReturnType<typeof getResendClient>
type ResendClientFactory = () => ResendClient
type ResendSendPayload = Parameters<ResendClient['emails']['send']>[0]

function readErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message

  if (typeof error === 'object' && error !== null) {
    const maybeMessage = (error as { message?: unknown; name?: unknown }).message
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) return maybeMessage

    const maybeName = (error as { name?: unknown }).name
    if (typeof maybeName === 'string' && maybeName.trim()) return maybeName
  }

  return String(error ?? 'Unknown error')
}

function readStatusCode(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) return null

  const value = (error as { statusCode?: unknown; status?: unknown }).statusCode ??
    (error as { status?: unknown }).status

  return typeof value === 'number' ? value : null
}

function isHardBounceMessage(message: string): boolean {
  return (
    message.includes('bounce') ||
    message.includes('invalid') ||
    message.includes('not found') ||
    message.includes('does not exist') ||
    message.includes('rejected') ||
    message.includes('undeliverable')
  )
}

function isComplaintMessage(message: string): boolean {
  return message.includes('complaint') || message.includes('spam')
}

function isTransientMessage(message: string): boolean {
  return (
    message.includes('timeout') ||
    message.includes('econnreset') ||
    message.includes('econnrefused') ||
    message.includes('network') ||
    message.includes('socket') ||
    message.includes('rate limit')
  )
}

function buildResendPayload(request: EmailOutboundRequest): ResendSendPayload {
  if (!request.from) {
    throw new Error('Resend adapter requires a from address')
  }

  if (!request.react && !request.html && !request.text) {
    throw new Error('Resend adapter requires react, html, or text content')
  }

  const payload: Record<string, unknown> = {
    from: request.from,
    to: request.to,
    subject: request.subject,
  }

  if (request.replyTo) payload.replyTo = request.replyTo
  if (request.cc) payload.cc = request.cc
  if (request.bcc) payload.bcc = request.bcc
  if (request.react) payload.react = request.react
  if (request.html) payload.html = request.html
  if (request.text) payload.text = request.text
  if (request.attachments?.length) payload.attachments = request.attachments

  return payload as unknown as ResendSendPayload
}

export function toLegacyResendMessageId(
  provider: EmailProviderName,
  providerMessageId: string | null
): string | null {
  if (provider !== 'resend') return null
  return providerMessageId
}

export function classifyResendError(error: unknown): EmailProviderErrorClassification {
  const message = readErrorMessage(error)
  const normalized = message.toLowerCase()
  const statusCode = readStatusCode(error)

  if (isComplaintMessage(normalized)) {
    return {
      retry: 'permanent',
      suppression: 'spam_complaint',
      category: 'complaint',
      message,
    }
  }

  if (isHardBounceMessage(normalized)) {
    const suppression = normalized.includes('invalid')
      ? 'invalid'
      : normalized.includes('not found')
        ? 'not_found'
        : normalized.includes('undeliverable')
          ? 'undeliverable'
          : 'hard_bounce'

    return {
      retry: 'permanent',
      suppression,
      category: 'hard_bounce',
      message,
    }
  }

  if (statusCode && statusCode >= 400 && statusCode < 500) {
    return {
      retry: 'permanent',
      suppression: 'none',
      category: 'permanent',
      message,
    }
  }

  if ((statusCode && statusCode >= 500) || isTransientMessage(normalized)) {
    return {
      retry: 'retryable',
      suppression: 'none',
      category: 'transient',
      message,
    }
  }

  return {
    retry: 'permanent',
    suppression: 'none',
    category: 'permanent',
    message,
  }
}

export function createResendEmailProvider(
  getClient: ResendClientFactory = getResendClient
): EmailProvider {
  return {
    name: 'resend',
    async send(request: EmailOutboundRequest): Promise<EmailProviderSendResult> {
      const resend = getClient()
      const { data, error } = await resend.emails.send(buildResendPayload(request))

      if (error) {
        throw error
      }

      const providerMessageId =
        data && typeof data === 'object' && 'id' in data && typeof data.id === 'string'
          ? data.id
          : null

      return {
        provider: 'resend',
        kind: request.kind,
        acceptedAt: new Date().toISOString(),
        message: {
          provider: 'resend',
          providerMessageId,
          legacyResendMessageId: toLegacyResendMessageId('resend', providerMessageId),
        },
      }
    },
    classifyError: classifyResendError,
  }
}

export const resendEmailProvider = createResendEmailProvider()
