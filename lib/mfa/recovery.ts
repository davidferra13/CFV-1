/**
 * Recovery code generation, hashing, and verification.
 *
 * Recovery codes are one-time-use backup codes for MFA bypass.
 * Format: XXXX-XXXX (8 alphanumeric chars with hyphen separator).
 * Stored as bcrypt hashes; plaintext shown once at generation.
 */
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { userRecoveryCodes } from '@/lib/db/schema/security'
import { eq, and, isNull } from 'drizzle-orm'

const CODE_LENGTH = 8
const DEFAULT_CODE_COUNT = 8
const BCRYPT_ROUNDS = 10

/**
 * Generate human-readable recovery codes in XXXX-XXXX format.
 */
export function generateRecoveryCodes(count: number = DEFAULT_CODE_COUNT): string[] {
  const codes: string[] = []
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I, O, 0, 1 for readability

  for (let i = 0; i < count; i++) {
    const bytes = crypto.randomBytes(CODE_LENGTH)
    let code = ''
    for (let j = 0; j < CODE_LENGTH; j++) {
      code += chars[bytes[j] % chars.length]
    }
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`)
  }

  return codes
}

/**
 * Hash a single recovery code with bcrypt.
 */
export async function hashRecoveryCode(code: string): Promise<string> {
  const normalized = code.replace(/-/g, '').toUpperCase()
  return bcrypt.hash(normalized, BCRYPT_ROUNDS)
}

/**
 * Verify a recovery code against a bcrypt hash.
 */
export async function verifyRecoveryCode(code: string, hash: string): Promise<boolean> {
  const normalized = code.replace(/-/g, '').toUpperCase()
  return bcrypt.compare(normalized, hash)
}

/**
 * Store recovery codes for a user.
 * Deletes any existing codes first, then inserts new hashed codes.
 */
export async function storeRecoveryCodes(authUserId: string, codes: string[]): Promise<void> {
  // Delete old codes
  await db.delete(userRecoveryCodes).where(eq(userRecoveryCodes.authUserId, authUserId))

  // Hash and insert new codes
  const rows = await Promise.all(
    codes.map(async (code) => ({
      authUserId,
      codeHash: await hashRecoveryCode(code),
    }))
  )

  if (rows.length > 0) {
    await db.insert(userRecoveryCodes).values(rows)
  }
}

/**
 * Attempt to use a recovery code.
 * Finds the first unused code that matches, marks it as used.
 * Returns true if a valid code was consumed, false otherwise.
 */
export async function useRecoveryCode(authUserId: string, code: string): Promise<boolean> {
  // Fetch all unused codes for this user
  const unusedCodes = await db
    .select({ id: userRecoveryCodes.id, codeHash: userRecoveryCodes.codeHash })
    .from(userRecoveryCodes)
    .where(and(eq(userRecoveryCodes.authUserId, authUserId), isNull(userRecoveryCodes.usedAt)))

  // Try each one (bcrypt compare is intentionally slow, but we only have 8 codes)
  for (const row of unusedCodes) {
    const matches = await verifyRecoveryCode(code, row.codeHash)
    if (matches) {
      await db
        .update(userRecoveryCodes)
        .set({ usedAt: new Date() })
        .where(eq(userRecoveryCodes.id, row.id))
      return true
    }
  }

  return false
}
