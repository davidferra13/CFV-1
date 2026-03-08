// Email sending - server-side utility
// Non-blocking: errors are logged, never thrown to callers.

import type { ReactElement } from 'react'
import { breakers } from '@/lib/resilience/circuit-breaker'
import { getResendClient, FROM_EMAIL, FROM_NAME } from './resend-client'

type SendEmailParams = {
  to: string | string[]
  subject: string
  react: ReactElement
  replyTo?: string
  /** Override the sender display name. Defaults to FROM_NAME ('CheFlow'). */
  fromName?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

export type SendEmailResult = {
  success: boolean
  error?: string
  skipped?: boolean
  messageId?: string
}

/**
 * Send a transactional email via Resend.
 * Non-blocking: logs errors but never throws.
 * Returns a structured result so callers can surface the real failure reason.
 */
export async function sendEmail({
  to,
  subject,
  react,
  replyTo,
  fromName,
  attachments,
}: SendEmailParams): Promise<SendEmailResult> {
  if (!process.env.RESEND_API_KEY) {
    console.log('[sendEmail] RESEND_API_KEY not configured, skipping email')
    return {
      success: false,
      skipped: true,
      error: 'RESEND_API_KEY is not configured',
    }
  }

  try {
    const resend = getResendClient()
    const senderName = fromName || FROM_NAME
    const response: any = await breakers.resend.execute(() =>
      resend.emails.send({
        from: `${senderName} <${FROM_EMAIL}>`,
        to,
        subject,
        react,
        replyTo,
        attachments,
      })
    )

    if (response?.error) {
      const errorMessage =
        typeof response.error === 'string'
          ? response.error
          : response.error?.message || 'Resend returned an unknown error'
      console.error('[sendEmail] Resend error:', response.error)
      return {
        success: false,
        error: errorMessage,
      }
    }

    const recipientCount = Array.isArray(to) ? to.length : 1
    console.log(`[sendEmail] Sent: "${subject}" -> ${recipientCount} recipient(s)`)
    return {
      success: true,
      messageId: response?.data?.id,
    }
  } catch (err) {
    console.error('[sendEmail] Failed:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
