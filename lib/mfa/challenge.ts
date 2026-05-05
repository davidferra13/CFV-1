/**
 * MFA challenge lifecycle: create, verify, complete.
 *
 * During login, if MFA is enabled, a challenge row is created instead of
 * completing the session. The user must verify the challenge (TOTP or
 * recovery code) before the session is fully activated.
 */
import { db } from '@/lib/db'
import { mfaChallenges, userMfaMethods } from '@/lib/db/schema/security'
import { eq, and, gt } from 'drizzle-orm'
import { verifyTotpCode, decryptSecret } from './totp'
import { useRecoveryCode } from './recovery'

const CHALLENGE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_ATTEMPTS = 5

/**
 * Check if a user has MFA enabled.
 */
export async function userHasMfaEnabled(authUserId: string): Promise<boolean> {
  const [method] = await db
    .select({ id: userMfaMethods.id })
    .from(userMfaMethods)
    .where(and(eq(userMfaMethods.authUserId, authUserId), eq(userMfaMethods.enabled, true)))
    .limit(1)

  return !!method
}

/**
 * Get the enabled MFA method type for a user.
 */
export async function getMfaMethodType(authUserId: string): Promise<'totp' | 'sms' | null> {
  const [method] = await db
    .select({ type: userMfaMethods.type })
    .from(userMfaMethods)
    .where(and(eq(userMfaMethods.authUserId, authUserId), eq(userMfaMethods.enabled, true)))
    .limit(1)

  return (method?.type as 'totp' | 'sms') ?? null
}

/**
 * Create a new MFA challenge for a user during login.
 */
export async function createMfaChallenge(
  authUserId: string,
  challengeType: string
): Promise<{ challengeId: string }> {
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS)

  const [row] = await db
    .insert(mfaChallenges)
    .values({
      authUserId,
      challengeType,
      expiresAt,
    })
    .returning({ id: mfaChallenges.id })

  return { challengeId: row.id }
}

/**
 * Verify an MFA challenge with a TOTP code or recovery code.
 *
 * Returns the authUserId on success so the caller can complete the login.
 * Increments attempt count and rejects if max attempts exceeded or expired.
 */
export async function verifyMfaChallenge(
  challengeId: string,
  code: string,
  isRecoveryCode: boolean = false
): Promise<{ success: boolean; authUserId?: string; error?: string }> {
  const now = new Date()

  // Fetch the challenge
  const [challenge] = await db
    .select()
    .from(mfaChallenges)
    .where(
      and(
        eq(mfaChallenges.id, challengeId),
        eq(mfaChallenges.verified, false),
        gt(mfaChallenges.expiresAt, now)
      )
    )
    .limit(1)

  if (!challenge) {
    return { success: false, error: 'Challenge expired or not found. Please sign in again.' }
  }

  if ((challenge.attempts ?? 0) >= MAX_ATTEMPTS) {
    return { success: false, error: 'Too many attempts. Please sign in again.' }
  }

  // Increment attempts
  await db
    .update(mfaChallenges)
    .set({ attempts: (challenge.attempts ?? 0) + 1 })
    .where(eq(mfaChallenges.id, challengeId))

  let verified = false

  if (isRecoveryCode) {
    verified = await useRecoveryCode(challenge.authUserId, code)
  } else {
    // Fetch the user's TOTP secret
    const [method] = await db
      .select({ secretEncrypted: userMfaMethods.secretEncrypted })
      .from(userMfaMethods)
      .where(
        and(
          eq(userMfaMethods.authUserId, challenge.authUserId),
          eq(userMfaMethods.type, 'totp'),
          eq(userMfaMethods.enabled, true)
        )
      )
      .limit(1)

    if (!method?.secretEncrypted) {
      return { success: false, error: 'MFA method not configured' }
    }

    const secret = decryptSecret(method.secretEncrypted)
    verified = verifyTotpCode(secret, code)
  }

  if (!verified) {
    const remaining = MAX_ATTEMPTS - ((challenge.attempts ?? 0) + 1)
    return {
      success: false,
      error:
        remaining > 0
          ? `Invalid code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Too many attempts. Please sign in again.',
    }
  }

  // Mark challenge as verified and update last_used_at on the MFA method
  await db.update(mfaChallenges).set({ verified: true }).where(eq(mfaChallenges.id, challengeId))

  await db
    .update(userMfaMethods)
    .set({ lastUsedAt: new Date() })
    .where(
      and(eq(userMfaMethods.authUserId, challenge.authUserId), eq(userMfaMethods.enabled, true))
    )

  return { success: true, authUserId: challenge.authUserId }
}
