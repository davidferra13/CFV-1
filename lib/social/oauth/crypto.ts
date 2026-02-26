// AES-256-GCM encryption for OAuth tokens stored in social_platform_credentials.
// Key is a 32-byte secret provided via SOCIAL_TOKEN_ENCRYPTION_KEY (base64-encoded).
// Encrypted format: "<iv_b64>:<authTag_b64>:<ciphertext_b64>" — all three segments base64.

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const keyB64 = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY
  if (!keyB64) {
    throw new Error(
      'SOCIAL_TOKEN_ENCRYPTION_KEY is not set. Generate a 32-byte key with: ' +
        "node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    )
  }
  const key = Buffer.from(keyB64, 'base64')
  if (key.length !== 32) {
    throw new Error(
      `SOCIAL_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes, got ${key.length}`
    )
  }
  return key
}

export function encryptToken(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(12) // 96-bit IV for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`
}

export function decryptToken(ciphertext: string): string {
  const key = getKey()
  const parts = ciphertext.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format — expected iv:authTag:ciphertext')
  }
  const [ivB64, authTagB64, encB64] = parts
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const encrypted = Buffer.from(encB64, 'base64')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}
