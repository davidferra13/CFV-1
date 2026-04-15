import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALG = 'aes-256-gcm'
const KEY_LEN = 32

function deriveKey(): Buffer {
  const secret = process.env.COMMS_ENCRYPTION_KEY
  if (!secret) throw new Error('COMMS_ENCRYPTION_KEY is not set')
  return scryptSync(secret, 'cf-comms-salt', KEY_LEN)
}

export function encryptCredential(plaintext: string): string {
  const key = deriveKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALG, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':')
}

export function decryptCredential(ciphertext: string): string {
  const [ivHex, tagHex, encHex] = ciphertext.split(':')
  if (!ivHex || !tagHex || !encHex) throw new Error('Invalid encrypted credential format')
  const key = deriveKey()
  const decipher = createDecipheriv(ALG, key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return decipher.update(Buffer.from(encHex, 'hex')).toString('utf8') + decipher.final('utf8')
}
