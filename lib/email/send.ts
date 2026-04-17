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

// ── I2: In-memory suppression cache (warm on first check, TTL 5 min) ──
const suppressionCache = new Set<string>()
let suppressionCacheLoadedAt = 0
const SUPPRESSION_CACHE_TTL_MS = 5 * 60_000

/**
 * Check if an email is suppressed (bounced/invalid).
 * Uses in-memory cache backed by DB table.
 */
async function isEmailSuppressed(email: string): Promise<boolean> {
  const normalized = email.toLowerCase().trim()

  // Fast path: check in-memory cache
  if (
    suppressionCache.has(normalized) &&
    Date.now() - suppressionCacheLoadedAt < SUPPRESSION_CACHE_TTL_MS
  ) {
    return true
  }

  // Refresh cache if stale
  if (Date.now() - suppressionCacheLoadedAt >= SUPPRESSION_CACHE_TTL_MS) {
    try {
      const { createAdminClient } = await import('@/lib/db/admin')
      const db: any = createAdminClient()
      const { data } = await db.from('email_suppressions').select('email').limit(10000)

      suppressionCache.clear()
      if (data) {
        for (const row of data) {
          suppressionCache.add((row.email as string).toLowerCase().trim())
        }
      }
      suppressionCacheLoadedAt = Date.now()
    } catch (err) {
      // Non-blocking: if DB check fails, allow the send
      console.error('[sendEmail] Suppression check failed (non-blocking):', err)
      return false
    }
  }

  return suppressionCache.has(normalized)
}

/**
 * Add an email to the suppression list (called on hard bounce/invalid).
 */
async function suppressEmail(email: string, reason: string): Promise<void> {
  const normalized = email.toLowerCase().trim()
  suppressionCache.add(normalized)

  try {
    const { createAdminClient } = await import('@/lib/db/admin')
    const db: any = createAdminClient()
    await db
      .from('email_suppressions')
      .upsert({ email: normalized, reason, source: 'resend' }, { onConflict: 'email' })
  } catch (err) {
    console.error('[sendEmail] Failed to persist suppression (non-blocking):', err)
  }
}

/**
 * Check if a Resend error indicates a hard bounce or invalid address.
 */
function isBounceError(error: any): boolean {
  const msg = (error?.message || error?.name || '').toLowerCase()
  return (
    msg.includes('bounce') ||
    msg.includes('invalid') ||
    msg.includes('not found') ||
    msg.includes('does not exist') ||
    msg.includes('rejected') ||
    msg.includes('undeliverable')
  )
}

/**
 * Check if a Resend error is transient (worth retrying).
 * 5xx, timeout, and network errors are retryable. 4xx are not.
 */
function isTransientError(error: any): boolean {
  const statusCode = error?.statusCode || error?.status
  if (statusCode && statusCode >= 400 && statusCode < 500) return false
  if (statusCode && statusCode >= 500) return true
  const msg = (error?.message || '').toLowerCase()
  return (
    msg.includes('timeout') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('network') ||
    msg.includes('socket') ||
    msg.includes('rate limit')
  )
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
  for (const addr of recipients) {
    if (await isEmailSuppressed(addr)) {
      console.info(`[sendEmail] Suppressed (bounced/invalid): "${subject}" skipped`)
      return false
    }
  }

  const attemptSend = async (): Promise<{ sent: boolean; error?: any }> => {
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
        return { sent: false, error }
      }

      return { sent: true }
    } catch (err) {
      return { sent: false, error: err }
    }
  }

  // First attempt
  let result = await attemptSend()

  // I1: Retry once on transient failure (1s backoff)
  if (!result.sent && result.error && isTransientError(result.error)) {
    console.warn('[sendEmail] Transient failure, retrying in 1s...')
    await new Promise((r) => setTimeout(r, 1000))
    result = await attemptSend()
  }

  if (!result.sent) {
    console.error('[sendEmail] Failed:', result.error)

    // I2: If bounce/invalid error, suppress future sends to this address
    if (result.error && isBounceError(result.error)) {
      for (const addr of recipients) {
        await suppressEmail(addr, 'hard_bounce')
      }
    }

    return false
  }

  // Log subject only - never log recipient email addresses (PII)
  const recipientCount = recipients.length
  console.log(`[sendEmail] Sent: "${subject}" → ${recipientCount} recipient(s)`)
  return true
}
