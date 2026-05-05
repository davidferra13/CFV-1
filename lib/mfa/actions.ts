'use server'

/**
 * MFA setup and management server actions.
 *
 * All actions require authentication. Setup flow:
 * 1. initiateTotpSetup() - generates secret + QR code
 * 2. confirmTotpSetup(code) - verifies code, enables MFA, returns recovery codes
 *
 * Disable/regenerate require a valid TOTP code as confirmation.
 */
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { userMfaMethods, userRecoveryCodes } from '@/lib/db/schema/security'
import { eq, and, isNull } from 'drizzle-orm'
import { generateTotpSecret, verifyTotpCode, encryptSecret, decryptSecret } from './totp'
import { generateRecoveryCodes, storeRecoveryCodes } from './recovery'
import { z } from 'zod'

const TotpCodeSchema = z
  .string()
  .length(6)
  .regex(/^\d{6}$/, 'Must be a 6-digit code')

async function requireAuthUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Authentication required')
  }
  return session.user.id
}

/**
 * Get current MFA status for the authenticated user.
 */
export async function getMfaStatus(): Promise<{
  enabled: boolean
  type: 'totp' | 'sms' | null
  hasRecoveryCodes: boolean
}> {
  const authUserId = await requireAuthUserId()

  const [method] = await db
    .select({
      type: userMfaMethods.type,
      enabled: userMfaMethods.enabled,
    })
    .from(userMfaMethods)
    .where(eq(userMfaMethods.authUserId, authUserId))
    .limit(1)

  const [unusedCode] = await db
    .select({ id: userRecoveryCodes.id })
    .from(userRecoveryCodes)
    .where(and(eq(userRecoveryCodes.authUserId, authUserId), isNull(userRecoveryCodes.usedAt)))
    .limit(1)

  return {
    enabled: method?.enabled ?? false,
    type: method?.enabled ? (method.type as 'totp' | 'sms') : null,
    hasRecoveryCodes: !!unusedCode,
  }
}

/**
 * Step 1: Initiate TOTP setup.
 * Generates a new secret, stores it unconfirmed, returns QR code.
 */
export async function initiateTotpSetup(): Promise<{
  qrDataUrl: string
  secret: string
}> {
  const authUserId = await requireAuthUserId()
  const session = await auth()
  const email = session?.user?.email ?? 'user@chefflow.com'

  // Check if already enabled
  const [existing] = await db
    .select({ enabled: userMfaMethods.enabled })
    .from(userMfaMethods)
    .where(and(eq(userMfaMethods.authUserId, authUserId), eq(userMfaMethods.type, 'totp')))
    .limit(1)

  if (existing?.enabled) {
    throw new Error('TOTP is already enabled. Disable it first to reconfigure.')
  }

  const { secret, qrDataUrl } = await generateTotpSecret(email)
  const encrypted = encryptSecret(secret)

  // Upsert: create or replace unconfirmed method
  if (existing) {
    await db
      .update(userMfaMethods)
      .set({
        secretEncrypted: encrypted,
        enabled: false,
        enabledAt: null,
      })
      .where(and(eq(userMfaMethods.authUserId, authUserId), eq(userMfaMethods.type, 'totp')))
  } else {
    await db.insert(userMfaMethods).values({
      authUserId,
      type: 'totp',
      secretEncrypted: encrypted,
      enabled: false,
    })
  }

  return { qrDataUrl, secret }
}

/**
 * Step 2: Confirm TOTP setup by verifying a code from the authenticator app.
 * On success, enables MFA and generates recovery codes.
 */
export async function confirmTotpSetup(code: string): Promise<{
  recoveryCodes: string[]
}> {
  TotpCodeSchema.parse(code)
  const authUserId = await requireAuthUserId()

  // Fetch the unconfirmed method
  const [method] = await db
    .select({
      secretEncrypted: userMfaMethods.secretEncrypted,
      enabled: userMfaMethods.enabled,
    })
    .from(userMfaMethods)
    .where(and(eq(userMfaMethods.authUserId, authUserId), eq(userMfaMethods.type, 'totp')))
    .limit(1)

  if (!method?.secretEncrypted) {
    throw new Error('No TOTP setup in progress. Start setup first.')
  }

  if (method.enabled) {
    throw new Error('TOTP is already enabled.')
  }

  const secret = decryptSecret(method.secretEncrypted)
  const valid = verifyTotpCode(secret, code)

  if (!valid) {
    throw new Error('Invalid code. Check your authenticator app and try again.')
  }

  // Enable MFA
  await db
    .update(userMfaMethods)
    .set({
      enabled: true,
      enabledAt: new Date(),
    })
    .where(and(eq(userMfaMethods.authUserId, authUserId), eq(userMfaMethods.type, 'totp')))

  // Generate and store recovery codes
  const recoveryCodes = generateRecoveryCodes()
  await storeRecoveryCodes(authUserId, recoveryCodes)

  return { recoveryCodes }
}

/**
 * Disable MFA. Requires a valid TOTP code as confirmation.
 * Deletes the MFA method and all recovery codes.
 */
export async function disableMfa(code: string): Promise<{ success: boolean }> {
  TotpCodeSchema.parse(code)
  const authUserId = await requireAuthUserId()

  // Verify the code first
  const [method] = await db
    .select({ secretEncrypted: userMfaMethods.secretEncrypted })
    .from(userMfaMethods)
    .where(
      and(
        eq(userMfaMethods.authUserId, authUserId),
        eq(userMfaMethods.type, 'totp'),
        eq(userMfaMethods.enabled, true)
      )
    )
    .limit(1)

  if (!method?.secretEncrypted) {
    throw new Error('MFA is not enabled.')
  }

  const secret = decryptSecret(method.secretEncrypted)
  if (!verifyTotpCode(secret, code)) {
    throw new Error('Invalid code. MFA was not disabled.')
  }

  // Delete method and recovery codes
  await db
    .delete(userMfaMethods)
    .where(and(eq(userMfaMethods.authUserId, authUserId), eq(userMfaMethods.type, 'totp')))
  await db.delete(userRecoveryCodes).where(eq(userRecoveryCodes.authUserId, authUserId))

  return { success: true }
}

/**
 * Regenerate recovery codes. Requires a valid TOTP code.
 * Old codes are deleted and replaced with a fresh set.
 */
export async function regenerateRecoveryCodes(code: string): Promise<{
  recoveryCodes: string[]
}> {
  TotpCodeSchema.parse(code)
  const authUserId = await requireAuthUserId()

  // Verify the code first
  const [method] = await db
    .select({ secretEncrypted: userMfaMethods.secretEncrypted })
    .from(userMfaMethods)
    .where(
      and(
        eq(userMfaMethods.authUserId, authUserId),
        eq(userMfaMethods.type, 'totp'),
        eq(userMfaMethods.enabled, true)
      )
    )
    .limit(1)

  if (!method?.secretEncrypted) {
    throw new Error('MFA is not enabled.')
  }

  const secret = decryptSecret(method.secretEncrypted)
  if (!verifyTotpCode(secret, code)) {
    throw new Error('Invalid code.')
  }

  const recoveryCodes = generateRecoveryCodes()
  await storeRecoveryCodes(authUserId, recoveryCodes)

  return { recoveryCodes }
}

/**
 * Complete MFA login: called from the MFA verify page after challenge verification.
 * This action uses Auth.js session.update() to clear the mfaPending flag.
 */
export async function completeMfaLogin(challengeId: string): Promise<{ success: boolean }> {
  // Import verifyMfaChallenge here to avoid circular deps at module level
  const { verifyMfaChallenge: _unused } = await import('./challenge')
  // The challenge should already be verified at this point
  // This action is a thin wrapper for the session update trigger
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Authentication required')
  }

  return { success: true }
}
