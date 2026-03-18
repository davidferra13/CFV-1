// Token encryption/decryption for integration OAuth tokens.
// Wraps lib/social/oauth/crypto.ts (AES-256-GCM).
// Gracefully degrades: if SOCIAL_TOKEN_ENCRYPTION_KEY is not set,
// stores/reads tokens in plaintext with a console warning.

import { encryptToken, decryptToken } from '@/lib/social/oauth/crypto'

let warned = false

function hasKey(): boolean {
  return !!process.env.SOCIAL_TOKEN_ENCRYPTION_KEY
}

export function encryptOAuthToken(plaintext: string): string {
  if (!hasKey()) {
    // In production, refuse to store tokens in plaintext - fail closed
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SOCIAL_TOKEN_ENCRYPTION_KEY is required in production. ' +
          "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
      )
    }
    if (!warned) {
      console.warn(
        '[integration-crypto] SOCIAL_TOKEN_ENCRYPTION_KEY not set - tokens stored in plaintext. ' +
          'Set a 32-byte base64 key to enable encryption.'
      )
      warned = true
    }
    return plaintext
  }
  return encryptToken(plaintext)
}

export function decryptOAuthToken(ciphertext: string): string {
  if (!hasKey()) return ciphertext

  // Detect if the value is encrypted (format: iv:authTag:ciphertext, all base64)
  const parts = ciphertext.split(':')
  if (parts.length !== 3) {
    // Plaintext token (pre-encryption migration) - return as-is
    return ciphertext
  }

  try {
    return decryptToken(ciphertext)
  } catch {
    // If decryption fails, it's likely a plaintext token - return as-is
    return ciphertext
  }
}
