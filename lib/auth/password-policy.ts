/**
 * Centralized password policy for ChefFlow.
 *
 * All signup, reset, and change-password flows MUST use this module.
 * Never duplicate password rules in individual Zod schemas.
 *
 * Policy (April 2026, OWASP/NIST aligned):
 *   - Minimum 12 characters (OWASP recommendation for password-only auth)
 *   - Maximum 72 bytes effective (bcrypt input limit; we reject multi-byte overflows)
 *   - No composition rules (no "must include uppercase/number" requirements)
 *   - Common/compromised passwords rejected via blocklist
 *   - Unicode allowed, whitespace allowed
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_BYTES = 72 // bcrypt silently truncates at 72 bytes

// ---------------------------------------------------------------------------
// Common password blocklist (top leaked/common passwords)
// Phase 1: local blocklist. Phase 2: k-anonymity breach check via HIBP API.
// ---------------------------------------------------------------------------

const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password12',
  'password123',
  'password1234',
  '123456789',
  '1234567890',
  '12345678901',
  '123456789012',
  'qwerty123456',
  'letmein123456',
  'welcome123456',
  'admin12345678',
  'passw0rd1234',
  'sunshine1234',
  'princess1234',
  'dragon123456',
  'iloveyou1234',
  'football1234',
  'monkey123456',
  'baseball1234',
  'superman1234',
  'batman123456',
  'master123456',
  'shadow123456',
  'michael12345',
  'jessica12345',
  'thomas123456',
  'charlie12345',
  'startrek1234',
  'starwars1234',
  'abcdefghijkl',
  'qwertyuiop12',
  'asdfghjkl123',
  'zxcvbnm12345',
  '000000000000',
  '111111111111',
  '222222222222',
  '333333333333',
  '444444444444',
  '555555555555',
  '666666666666',
  '777777777777',
  '888888888888',
  '999999999999',
  'aaaaaaaaaaaa',
  'bbbbbbbbbbbb',
  'cccccccccccc',
  'trustno11234',
  'hello1234567',
])

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Returns the byte length of a UTF-8 string.
 * bcrypt operates on bytes, not characters, so multi-byte characters count more.
 */
function utf8ByteLength(str: string): number {
  return new TextEncoder().encode(str).length
}

/**
 * Validate a password against the current policy.
 * Returns undefined on success, or a user-facing error string on failure.
 */
export function validatePassword(password: string): string | undefined {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
  }

  const byteLen = utf8ByteLength(password)
  if (byteLen > PASSWORD_MAX_BYTES) {
    return `Password is too long (contains characters that exceed the allowed byte limit - try using only ASCII characters or a shorter passphrase)`
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return 'This password is too common. Please choose something more unique.'
  }

  return undefined
}

// ---------------------------------------------------------------------------
// Zod schema fragment - reuse this in all auth schemas
// ---------------------------------------------------------------------------

export const passwordPolicySchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .refine(
    (val) => utf8ByteLength(val) <= PASSWORD_MAX_BYTES,
    'Password is too long for the characters used'
  )
  .refine(
    (val) => !COMMON_PASSWORDS.has(val.toLowerCase()),
    'This password is too common. Please choose something more unique.'
  )
