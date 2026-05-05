// SMS Verification Service
// Handles sending and verifying SMS codes for phone verification and SMS-based 2FA.
// Depends on Phase 1 (phone_numbers table, normalize.ts) and Phase 2 (mfa_challenges table).

import { pgClient } from '@/lib/db'
import { sendSMS } from '@/lib/sms/twilio-client'
import { checkRateLimit, incrementRateLimit } from '@/lib/security/durable-rate-limit'
import bcrypt from 'bcryptjs'

type VerificationPurpose = 'phone_verify' | 'mfa_login'

interface SendResult {
  success: boolean
  error?: string
}

interface VerifyResult {
  valid: boolean
  error?: string
}

const CODE_LENGTH = 6
const CODE_EXPIRY_SECONDS = 5 * 60 // 5 minutes
const SEND_RATE_LIMIT = { max: 3, windowSeconds: 10 * 60 } // 3 codes per 10 min
const VERIFY_RATE_LIMIT = { max: 5, windowSeconds: 10 * 60 } // 5 attempts per 10 min

/**
 * Generate a cryptographically random 6-digit code.
 */
function generateCode(): string {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  // Modulo 1_000_000 gives 0-999999, pad to 6 digits
  return String(array[0] % 1_000_000).padStart(CODE_LENGTH, '0')
}

/**
 * Send a verification code via SMS.
 * Rate limited to 3 sends per phone per 10 minutes.
 */
export async function sendVerificationCode(
  phoneE164: string,
  purpose: VerificationPurpose
): Promise<SendResult> {
  // Check send rate limit
  const rateLimitKey = `sms_send:${phoneE164}`
  const limit = await checkRateLimit(
    rateLimitKey,
    SEND_RATE_LIMIT.max,
    SEND_RATE_LIMIT.windowSeconds
  )

  if (!limit.allowed) {
    const waitSeconds = Math.ceil((limit.resetsAt.getTime() - Date.now()) / 1000)
    return {
      success: false,
      error: `Too many codes sent. Try again in ${waitSeconds} seconds.`,
    }
  }

  // Generate and hash the code
  const code = generateCode()
  const codeHash = await bcrypt.hash(code, 10)
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_SECONDS * 1000)

  if (purpose === 'phone_verify') {
    // Store in phone_numbers table (Phase 1 creates this table)
    await pgClient`
      UPDATE phone_numbers
      SET verification_code_hash = ${codeHash},
          verification_code_expires_at = ${expiresAt.toISOString()},
          verification_attempts = 0
      WHERE phone_e164 = ${phoneE164}
    `
  } else {
    // Store in mfa_challenges table (Phase 2 creates this table)
    // The challengeId should already exist; update it with the SMS code
    await pgClient`
      UPDATE mfa_challenges
      SET code_hash = ${codeHash},
          expires_at = ${expiresAt.toISOString()},
          attempts = 0
      WHERE phone_e164 = ${phoneE164}
        AND method = 'sms'
        AND status = 'pending'
    `
  }

  // Send via Twilio
  const smsResult = await sendSMS(phoneE164, `Your ChefFlow verification code is: ${code}`)

  if (!smsResult.success) {
    console.error('[verification] SMS send failed:', smsResult.error)
    return { success: false, error: 'Failed to send SMS. Please try again.' }
  }

  // Increment rate limit only on successful send
  await incrementRateLimit(rateLimitKey, SEND_RATE_LIMIT.windowSeconds)

  return { success: true }
}

/**
 * Verify a code submitted by the user.
 * Rate limited to 5 attempts per phone per 10 minutes.
 * On success: marks verified and clears the code.
 * On failure: increments attempt counter; locks after max attempts.
 */
export async function verifyCode(
  phoneE164: string,
  code: string,
  purpose: VerificationPurpose
): Promise<VerifyResult> {
  // Check verification attempt rate limit
  const rateLimitKey = `sms_verify:${phoneE164}`
  const limit = await checkRateLimit(
    rateLimitKey,
    VERIFY_RATE_LIMIT.max,
    VERIFY_RATE_LIMIT.windowSeconds
  )

  if (!limit.allowed) {
    return { valid: false, error: 'Too many attempts. Please request a new code.' }
  }

  // Increment attempt counter immediately (before checking)
  await incrementRateLimit(rateLimitKey, VERIFY_RATE_LIMIT.windowSeconds)

  let codeHash: string | null = null
  let expiresAt: string | null = null

  if (purpose === 'phone_verify') {
    const rows = await pgClient`
      SELECT verification_code_hash, verification_code_expires_at
      FROM phone_numbers
      WHERE phone_e164 = ${phoneE164}
      LIMIT 1
    `
    if (rows.length > 0) {
      codeHash = rows[0].verification_code_hash as string | null
      expiresAt = rows[0].verification_code_expires_at as string | null
    }
  } else {
    const rows = await pgClient`
      SELECT code_hash, expires_at
      FROM mfa_challenges
      WHERE phone_e164 = ${phoneE164}
        AND method = 'sms'
        AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
    `
    if (rows.length > 0) {
      codeHash = rows[0].code_hash as string | null
      expiresAt = rows[0].expires_at as string | null
    }
  }

  if (!codeHash || !expiresAt) {
    return { valid: false, error: 'No verification code found. Please request a new one.' }
  }

  // Check expiry
  if (new Date(expiresAt) < new Date()) {
    return { valid: false, error: 'Code expired. Please request a new one.' }
  }

  // Compare bcrypt hash
  const isValid = await bcrypt.compare(code, codeHash)

  if (!isValid) {
    return { valid: false, error: 'Invalid code.' }
  }

  // Success: mark verified and clear the code
  if (purpose === 'phone_verify') {
    await pgClient`
      UPDATE phone_numbers
      SET verified_at = now(),
          verification_code_hash = NULL,
          verification_code_expires_at = NULL,
          verification_attempts = 0
      WHERE phone_e164 = ${phoneE164}
    `
  } else {
    await pgClient`
      UPDATE mfa_challenges
      SET status = 'verified',
          verified_at = now(),
          code_hash = NULL
      WHERE phone_e164 = ${phoneE164}
        AND method = 'sms'
        AND status = 'pending'
    `
  }

  return { valid: true }
}
