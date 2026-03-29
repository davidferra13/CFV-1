// Outreach ref encryption/decryption utilities
// Separate from 'use server' file to avoid Next.js server action constraints

import crypto from 'crypto'

const OUTREACH_HASH_SECRET =
  process.env.OUTREACH_HASH_SECRET || process.env.AUTH_SECRET || 'dev-secret-do-not-use'

function deriveKeyAndIv(listingId: string): { key: Buffer; iv: Buffer } {
  const keyMaterial = crypto.createHash('sha256').update(OUTREACH_HASH_SECRET).digest()
  const iv = crypto.createHash('md5').update(listingId).digest()
  return { key: keyMaterial, iv }
}

export function encryptRef(listingId: string): string {
  const { key, iv } = deriveKeyAndIv(listingId)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(listingId, 'utf8', 'base64url')
  encrypted += cipher.final('base64url')
  return encrypted
}

export function decryptRef(ref: string): string | null {
  try {
    const keyMaterial = crypto.createHash('sha256').update(OUTREACH_HASH_SECRET).digest()
    const raw = Buffer.from(ref, 'base64url')
    if (raw.length < 17) return null
    const iv = raw.subarray(0, 16)
    const ciphertext = raw.subarray(16)
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyMaterial, iv)
    let decrypted = decipher.update(ciphertext, undefined, 'utf8')
    decrypted += decipher.final('utf8')
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decrypted)) {
      return decrypted
    }
    return null
  } catch {
    return null
  }
}

export function createOutreachRef(listingId: string): string {
  const keyMaterial = crypto.createHash('sha256').update(OUTREACH_HASH_SECRET).digest()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', keyMaterial, iv)
  let encrypted = cipher.update(listingId, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return Buffer.concat([iv, encrypted]).toString('base64url')
}
