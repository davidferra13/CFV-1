/**
 * TOTP (Time-based One-Time Password) core utilities.
 *
 * Generates secrets, verifies codes, encrypts/decrypts secrets at rest.
 * Uses otpauth for TOTP and Node crypto for AES-256-GCM encryption.
 */
import { TOTP } from 'otpauth'
import crypto from 'crypto'
import QRCode from 'qrcode'

const ISSUER = 'ChefFlow'
const ALGORITHM = 'SHA1'
const DIGITS = 6
const PERIOD = 30

/**
 * Derive a 32-byte encryption key from AUTH_SECRET or MFA_ENCRYPTION_KEY.
 * Uses HKDF to stretch the env variable into a proper AES-256 key.
 */
function getEncryptionKey(): Buffer {
  const raw = process.env.MFA_ENCRYPTION_KEY || process.env.AUTH_SECRET
  if (!raw) {
    throw new Error('MFA_ENCRYPTION_KEY or AUTH_SECRET must be set for MFA encryption')
  }
  return crypto.createHash('sha256').update(raw).digest()
}

/**
 * Generate a new TOTP secret, otpauth URI, and QR code data URL.
 */
export async function generateTotpSecret(userEmail: string): Promise<{
  secret: string
  uri: string
  qrDataUrl: string
}> {
  const secretBytes = crypto.randomBytes(20)
  const secret = base32Encode(secretBytes)

  const totp = new TOTP({
    issuer: ISSUER,
    label: userEmail,
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
    secret,
  })

  const uri = totp.toString()
  const qrDataUrl = await QRCode.toDataURL(uri, { width: 256, margin: 2 })

  return { secret, uri, qrDataUrl }
}

/**
 * Verify a TOTP code against a secret with a 1-step window tolerance.
 */
export function verifyTotpCode(secret: string, code: string): boolean {
  const totp = new TOTP({
    issuer: ISSUER,
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
    secret,
  })

  // delta returns null if invalid, or the time step difference
  const delta = totp.validate({ token: code, window: 1 })
  return delta !== null
}

/**
 * Encrypt a TOTP secret using AES-256-GCM.
 * Output format: base64(iv + authTag + ciphertext)
 */
export function encryptSecret(secret: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  // Pack: 12-byte IV + 16-byte auth tag + ciphertext
  const packed = Buffer.concat([iv, authTag, encrypted])
  return packed.toString('base64')
}

/**
 * Decrypt a TOTP secret from AES-256-GCM encrypted format.
 */
export function decryptSecret(encrypted: string): string {
  const key = getEncryptionKey()
  const packed = Buffer.from(encrypted, 'base64')

  const iv = packed.subarray(0, 12)
  const authTag = packed.subarray(12, 28)
  const ciphertext = packed.subarray(28)

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return decrypted.toString('utf8')
}

/**
 * RFC 4648 base32 encoding (no padding).
 */
function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = 0
  let value = 0
  let output = ''

  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 0x1f]
      bits -= 5
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 0x1f]
  }

  return output
}
