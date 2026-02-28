// Email Sending — Server-side utility
// Non-blocking: errors are logged, never thrown to callers
// All email sends are fire-and-forget side effects

import { getResendClient, FROM_EMAIL, FROM_NAME } from './resend-client'
import { breakers } from '@/lib/resilience/circuit-breaker'
import type { ReactElement } from 'react'

type SendEmailParams = {
  to: string | string[]
  subject: string
  react: ReactElement
  replyTo?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

/**
 * Send a transactional email via Resend.
 * Non-blocking: logs errors but never throws.
 * Returns true if sent successfully, false otherwise.
 */
export async function sendEmail({
  to,
  subject,
  react,
  replyTo,
  attachments,
}: SendEmailParams): Promise<boolean> {
  // Skip if Resend is not configured (dev environments without key)
  if (!process.env.RESEND_API_KEY) {
    console.log('[sendEmail] RESEND_API_KEY not configured, skipping email')
    return false
  }

  try {
    const resend = getResendClient()

    // Circuit breaker: trips after 5 consecutive Resend failures (60s reset)
    const { error } = await breakers.resend.execute(() =>
      resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to,
        subject,
        react,
        replyTo,
        attachments,
      })
    )

    if (error) {
      console.error('[sendEmail] Resend error:', error)
      return false
    }

    console.log('[sendEmail] Sent:', subject, '→', to)
    return true
  } catch (err) {
    console.error('[sendEmail] Failed:', err)
    return false
  }
}
