import { resendEmailProvider } from './resend-adapter'
import type { EmailProvider, EmailProviderName, EmailProviderSendResult } from './types'

export * from './types'
export * from './resend-adapter'
export * from './resend-events'

export const EMAIL_TRANSPORT_PROVIDER_ENV = 'EMAIL_TRANSPORT_PROVIDER'
export const DEFAULT_EMAIL_TRANSPORT_PROVIDER: EmailProviderName = 'resend'

export function getConfiguredEmailProviderName(): EmailProviderName {
  const configured = process.env[EMAIL_TRANSPORT_PROVIDER_ENV]?.trim().toLowerCase()

  if (!configured || configured === DEFAULT_EMAIL_TRANSPORT_PROVIDER) {
    return DEFAULT_EMAIL_TRANSPORT_PROVIDER
  }

  console.warn(
    `[email-provider] Unsupported ${EMAIL_TRANSPORT_PROVIDER_ENV}="${configured}". Falling back to resend.`
  )
  return DEFAULT_EMAIL_TRANSPORT_PROVIDER
}

export function getEmailProvider(): EmailProvider {
  switch (getConfiguredEmailProviderName()) {
    case 'resend':
    default:
      return resendEmailProvider
  }
}

export function getLegacyResendMessageId(result: EmailProviderSendResult): string | null {
  return result.message.legacyResendMessageId
}
