// Email Sending - Server-side utility
// Non-blocking: errors are logged, never thrown to callers
// All email sends are fire-and-forget side effects

import { getResendClient, FROM_EMAIL, FROM_NAME } from './resend-client'
import { breakers } from '@/lib/resilience/circuit-breaker'
import type { ReactElement } from 'react'

type SendEmailParams = {
  to: string | string[]
  subject: string
  react: ReactElement
  from?: string
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
  from,
  replyTo,
  attachments,
}: SendEmailParams): Promise<boolean> {
  // Guard against header injection via newline characters in email fields
  const hasNewline = (v: string) => /[\r\n]/.test(v)
  const recipients = Array.isArray(to) ? to : [to]
  if (recipients.some(hasNewline) || hasNewline(subject) || (replyTo && hasNewline(replyTo))) {
    console.error('[sendEmail] Rejected: newline detected in email headers')
    return false
  }

  // Skip if Resend is not configured (dev environments without key)
  if (!process.env.RESEND_API_KEY) {
    console.warn('[sendEmail] RESEND_API_KEY not configured. Email NOT sent:', subject)
    return false
  }

  try {
    const resend = getResendClient()

    // Circuit breaker: trips after 5 consecutive Resend failures (60s reset)
    const { error } = await breakers.resend.execute(() =>
      resend.emails.send({
        from: from || `${FROM_NAME} <${FROM_EMAIL}>`,
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

    // Log subject only - never log recipient email addresses (PII)
    const recipientCount = Array.isArray(to) ? to.length : 1
    console.log(`[sendEmail] Sent: "${subject}" → ${recipientCount} recipient(s)`)
    return true
  } catch (err) {
    console.error('[sendEmail] Failed:', err)
    return false
  }
}
