// Email Sending - Server-side utility
// Non-blocking: errors are logged, never thrown to callers
// All email sends are fire-and-forget side effects

import { FROM_EMAIL, FROM_NAME } from './resend-client'
import { getEmailProvider } from './provider'
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
  /** When true, bypass complaint-based suppression (spam complaints).
   *  Hard bounces (invalid/nonexistent addresses) are still honored.
   *  Use for: password resets, payment confirmations, security alerts. */
  isTransactional?: boolean
}

// ── I2: In-memory suppression cache (warm on first check, TTL 5 min) ──
// Maps email -> reason so transactional emails can bypass complaint-only suppressions
const suppressionCache = new Map<string, string>()
let suppressionCacheLoadedAt = 0
const SUPPRESSION_CACHE_TTL_MS = 5 * 60_000

// Reasons that indicate the address genuinely cannot receive mail
const HARD_SUPPRESS_REASONS = new Set(['hard_bounce', 'invalid', 'not_found', 'undeliverable'])

/**
 * Check if an email is suppressed.
 * When `allowTransactional` is true, only hard bounces block; complaint-based
 * suppressions are bypassed so critical emails (password resets, payment
 * confirmations) still reach the recipient.
 */
async function isEmailSuppressed(email: string, allowTransactional = false): Promise<boolean> {
  const normalized = email.toLowerCase().trim()

  // Refresh cache if stale
  if (Date.now() - suppressionCacheLoadedAt >= SUPPRESSION_CACHE_TTL_MS) {
    try {
      const { createAdminClient } = await import('@/lib/db/admin')
      const db: any = createAdminClient()
      const { data } = await db.from('email_suppressions').select('email, reason').limit(10000)

      suppressionCache.clear()
      if (data) {
        for (const row of data) {
          suppressionCache.set(
            (row.email as string).toLowerCase().trim(),
            (row.reason as string) || 'unknown'
          )
        }
      }
      suppressionCacheLoadedAt = Date.now()
    } catch (err) {
      // Non-blocking: if DB check fails, allow the send
      console.error('[sendEmail] Suppression check failed (non-blocking):', err)
      return false
    }
  }

  const reason = suppressionCache.get(normalized)
  if (!reason) return false

  // Transactional emails bypass complaint-only suppressions (spam_complaint, complaint, manual)
  // but still honor hard bounces (address genuinely unreachable)
  if (allowTransactional && !HARD_SUPPRESS_REASONS.has(reason)) {
    return false
  }

  return true
}

/**
 * Add an email to the suppression list (called on hard bounce/invalid).
 */
async function suppressEmail(email: string, reason: string, source = 'resend'): Promise<void> {
  const normalized = email.toLowerCase().trim()
  suppressionCache.set(normalized, reason)

  try {
    const { createAdminClient } = await import('@/lib/db/admin')
    const db: any = createAdminClient()
    await db
      .from('email_suppressions')
      .upsert({ email: normalized, reason, source }, { onConflict: 'email' })
  } catch (err) {
    console.error('[sendEmail] Failed to persist suppression (non-blocking):', err)
  }
}

/**
 * Send a transactional email via Resend.
 * Non-blocking: logs errors but never throws.
 * Returns true if sent successfully, false otherwise.
 *
 * I1: Retries once on transient failure (1s backoff).
 * I2: Checks suppression list before sending; adds bounced addresses.
 */
export async function sendEmail({
  to,
  subject,
  react,
  from,
  replyTo,
  attachments,
  isTransactional,
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

  // I2: Check suppression list - skip bounced/invalid addresses
  // Transactional emails bypass complaint-only suppressions but still honor hard bounces
  for (const addr of recipients) {
    if (await isEmailSuppressed(addr, isTransactional)) {
      console.info(`[sendEmail] Suppressed (bounced/invalid): "${subject}" skipped`)
      return false
    }
  }

  const provider = getEmailProvider()

  const attemptSend = async (): Promise<{ sent: boolean; error?: any }> => {
    try {
      // Circuit breaker: trips after 5 consecutive Resend failures (60s reset)
      await breakers.resend.execute(() =>
        provider.send({
          kind: 'transactional',
          from: from || `${FROM_NAME} <${FROM_EMAIL}>`,
          to,
          subject,
          react,
          replyTo,
          attachments,
        })
      )

      return { sent: true }
    } catch (err) {
      return { sent: false, error: err }
    }
  }

  // First attempt
  let result = await attemptSend()

  // I1: Retry once on transient failure (1s backoff)
  const firstFailureClassification =
    !result.sent && result.error ? provider.classifyError(result.error) : null

  if (!result.sent && result.error && firstFailureClassification?.retry === 'retryable') {
    console.warn('[sendEmail] Transient failure, retrying in 1s...')
    await new Promise((r) => setTimeout(r, 1000))
    result = await attemptSend()
  }

  if (!result.sent) {
    console.error('[sendEmail] Failed:', result.error)
    const classification = result.error ? provider.classifyError(result.error) : null

    // FC-G25: Queue failed emails for retry (dead-letter queue)
    // Transient failures (circuit breaker, 5xx, network) get queued for later retry.
    // Hard bounces do NOT get queued (they get suppressed instead).
    if (
      result.error &&
      classification?.retry === 'retryable' &&
      classification.suppression === 'none'
    ) {
      try {
        const { createAdminClient } = await import('@/lib/db/admin')
        const db: any = createAdminClient()
        await db.from('email_dead_letter_queue').insert({
          to_addresses: recipients,
          subject,
          template_name: (typeof react?.type === 'function' ? react.type.name : null) || 'unknown',
          from_address: from || `${FROM_NAME} <${FROM_EMAIL}>`,
          reply_to: replyTo || null,
          error_message: classification.message || 'Unknown transient error',
          retry_count: 0,
          max_retries: 3,
          next_retry_at: new Date(Date.now() + 5 * 60_000).toISOString(), // 5 min
        })
        console.info(`[sendEmail] Queued for retry: "${subject}"`)
      } catch (queueErr) {
        console.error('[sendEmail] Dead-letter queue insert failed (non-blocking):', queueErr)
      }
    }

    // I2: If bounce/invalid error, suppress future sends to this address
    if (result.error && classification && classification.suppression !== 'none') {
      for (const addr of recipients) {
        await suppressEmail(addr, classification.suppression, provider.name)
      }
    }

    return false
  }

  // Log subject only - never log recipient email addresses (PII)
  const recipientCount = recipients.length
  console.log(`[sendEmail] Sent: "${subject}" → ${recipientCount} recipient(s)`)
  return true
}
