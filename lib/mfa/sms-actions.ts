// SMS 2FA Actions
// Server actions for enabling/disabling SMS as an MFA method and handling SMS MFA challenges.
// Depends on Phase 1 (phone_numbers table) and Phase 2 (user_mfa_methods, mfa_challenges tables).

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'
import { sendVerificationCode, verifyCode } from '@/lib/phone/verification'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const EnableSmsSchema = z.object({
  phoneNumberId: z.string().uuid('Invalid phone number ID'),
})

const ChallengeIdSchema = z.object({
  challengeId: z.string().uuid('Invalid challenge ID'),
})

const VerifySchema = z.object({
  challengeId: z.string().uuid('Invalid challenge ID'),
  code: z
    .string()
    .length(6, 'Code must be 6 digits')
    .regex(/^\d{6}$/, 'Code must be numeric'),
})

const DisableSchema = z.object({
  verificationCode: z
    .string()
    .length(6, 'Code must be 6 digits')
    .regex(/^\d{6}$/, 'Code must be numeric'),
})

/**
 * Enable SMS as an MFA method.
 * Requires the phone number to already be verified.
 * Creates a user_mfa_methods row with type='sms'.
 */
export async function enableSmsMfa(phoneNumberId: string) {
  const user = await requireChef()
  const parsed = EnableSmsSchema.parse({ phoneNumberId })

  // Verify the phone number belongs to this user and is verified
  const phoneRows = await pgClient`
    SELECT id, phone_e164, verified_at
    FROM phone_numbers
    WHERE id = ${parsed.phoneNumberId}
      AND user_id = ${user.userId}
    LIMIT 1
  `

  if (phoneRows.length === 0) {
    return { success: false, error: 'Phone number not found.' }
  }

  const phone = phoneRows[0]
  if (!phone.verified_at) {
    return { success: false, error: 'Phone number must be verified before enabling SMS 2FA.' }
  }

  // Check if SMS MFA is already enabled for this user
  const existingRows = await pgClient`
    SELECT id FROM user_mfa_methods
    WHERE user_id = ${user.userId} AND method = 'sms' AND enabled = true
    LIMIT 1
  `

  if (existingRows.length > 0) {
    return { success: false, error: 'SMS 2FA is already enabled.' }
  }

  // Create the MFA method record
  await pgClient`
    INSERT INTO user_mfa_methods (user_id, method, phone_number_id, enabled)
    VALUES (${user.userId}, 'sms', ${parsed.phoneNumberId}, true)
  `

  revalidatePath('/settings')
  return { success: true }
}

/**
 * Send an SMS MFA code for an existing challenge.
 * Looks up the user's registered SMS MFA phone number and sends a code.
 */
export async function sendSmsMfaCode(challengeId: string) {
  const parsed = ChallengeIdSchema.parse({ challengeId })

  // Get the challenge and associated user's SMS MFA phone
  const challengeRows = await pgClient`
    SELECT mc.id, mc.user_id, mc.method, mc.status,
           umm.phone_number_id,
           pn.phone_e164
    FROM mfa_challenges mc
    JOIN user_mfa_methods umm ON umm.user_id = mc.user_id AND umm.method = 'sms' AND umm.enabled = true
    JOIN phone_numbers pn ON pn.id = umm.phone_number_id
    WHERE mc.id = ${parsed.challengeId}
      AND mc.method = 'sms'
      AND mc.status = 'pending'
    LIMIT 1
  `

  if (challengeRows.length === 0) {
    return { success: false, error: 'Challenge not found or SMS MFA not configured.' }
  }

  const challenge = challengeRows[0]
  const phoneE164 = challenge.phone_e164 as string

  // Update the challenge with the phone for later verification lookup
  await pgClient`
    UPDATE mfa_challenges
    SET phone_e164 = ${phoneE164}
    WHERE id = ${parsed.challengeId}
  `

  const result = await sendVerificationCode(phoneE164, 'mfa_login')
  return result
}

/**
 * Verify an SMS code for an MFA challenge.
 * On success, marks the challenge as verified.
 */
export async function verifySmsMfaCode(challengeId: string, code: string) {
  const parsed = VerifySchema.parse({ challengeId, code })

  // Get the phone number from the challenge
  const challengeRows = await pgClient`
    SELECT phone_e164, status
    FROM mfa_challenges
    WHERE id = ${parsed.challengeId}
      AND method = 'sms'
    LIMIT 1
  `

  if (challengeRows.length === 0) {
    return { valid: false, error: 'Challenge not found.' }
  }

  const challenge = challengeRows[0]
  if (challenge.status !== 'pending') {
    return { valid: false, error: 'Challenge already resolved.' }
  }

  const phoneE164 = challenge.phone_e164 as string
  if (!phoneE164) {
    return {
      valid: false,
      error: 'No phone number associated with this challenge. Send code first.',
    }
  }

  return verifyCode(phoneE164, parsed.code, 'mfa_login')
}

/**
 * Disable SMS MFA.
 * Requires the user to verify with a current SMS code before disabling (security measure).
 */
export async function disableSmsMfa(verificationCode: string) {
  const user = await requireChef()
  const parsed = DisableSchema.parse({ verificationCode })

  // Get the user's SMS MFA phone
  const mfaRows = await pgClient`
    SELECT umm.id, pn.phone_e164
    FROM user_mfa_methods umm
    JOIN phone_numbers pn ON pn.id = umm.phone_number_id
    WHERE umm.user_id = ${user.userId}
      AND umm.method = 'sms'
      AND umm.enabled = true
    LIMIT 1
  `

  if (mfaRows.length === 0) {
    return { success: false, error: 'SMS 2FA is not currently enabled.' }
  }

  const phoneE164 = mfaRows[0].phone_e164 as string
  const mfaMethodId = mfaRows[0].id as string

  // Verify the code against phone_verify purpose (user sends a code to their phone first)
  const result = await verifyCode(phoneE164, parsed.verificationCode, 'phone_verify')

  if (!result.valid) {
    return { success: false, error: result.error || 'Invalid verification code.' }
  }

  // Disable the MFA method
  await pgClient`
    UPDATE user_mfa_methods
    SET enabled = false, disabled_at = now()
    WHERE id = ${mfaMethodId}
  `

  revalidatePath('/settings')
  return { success: true }
}
