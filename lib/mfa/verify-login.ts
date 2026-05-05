'use server'

/**
 * MFA login verification server action.
 *
 * Called from the /auth/mfa-verify page after the user enters their
 * TOTP code or recovery code. Verifies the challenge and triggers a
 * session update to clear the mfaPending flag.
 */
import { auth } from '@/lib/auth'
import { verifyMfaChallenge } from './challenge'

export async function verifyMfaLogin(
  challengeId: string,
  code: string,
  isRecoveryCode: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Session expired. Please sign in again.' }
  }

  if (!challengeId) {
    return { success: false, error: 'No MFA challenge found. Please sign in again.' }
  }

  const result = await verifyMfaChallenge(challengeId, code, isRecoveryCode)

  if (!result.success) {
    return { success: false, error: result.error }
  }

  // The session update is triggered client-side via useSession().update()
  // which fires the jwt callback with trigger='update', clearing mfaPending.
  return { success: true }
}
