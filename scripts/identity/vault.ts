import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'

const ALG = 'aes-256-gcm'
const KEY_LEN = 32
const VAULT_PATH = join('system', 'identity-claims', 'vault.enc.json')

export type IdentityInputs = {
  email: string
  password: string
  phone: string
}

export type VaultCredential = {
  platformId: string
  platformName: string
  username: string | null
  email: string
  phone: string
  password: string
  capturedAt: string
  status: string
}

type VaultFile = {
  version: 1
  credentials: Record<string, VaultCredential>
}

function key(): Buffer {
  const secret = process.env.CHEFFLOW_IDENTITY_VAULT_KEY
  if (!isUsableSecret(secret) || secret.length < 16) {
    throw new Error(
      'CHEFFLOW_IDENTITY_VAULT_KEY must be set to a real value at least 16 characters long'
    )
  }
  return scryptSync(secret, 'chefflow-identity-vault', KEY_LEN)
}

function isUsableSecret(value: string | undefined): value is string {
  return Boolean(value && value.trim() && !value.includes('REPLACE_ME'))
}

function encrypt(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALG, key(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':')
}

function decrypt(ciphertext: string): string {
  const [ivHex, tagHex, encHex] = ciphertext.split(':')
  if (!ivHex || !tagHex || !encHex) throw new Error('Invalid vault format')
  const decipher = createDecipheriv(ALG, key(), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return decipher.update(Buffer.from(encHex, 'hex')).toString('utf8') + decipher.final('utf8')
}

export function readIdentityInputs(): IdentityInputs | null {
  const email = process.env.CHEFFLOW_IDENTITY_EMAIL?.trim()
  const password = process.env.CHEFFLOW_IDENTITY_PASSWORD?.trim()
  const phone = process.env.CHEFFLOW_IDENTITY_PHONE?.trim()
  if (!email || !isUsableSecret(password) || !phone) return null
  return { email, password, phone }
}

function loadVault(): VaultFile {
  if (!existsSync(VAULT_PATH)) return { version: 1, credentials: {} }
  return JSON.parse(decrypt(readFileSync(VAULT_PATH, 'utf8'))) as VaultFile
}

function saveVault(vault: VaultFile): void {
  mkdirSync(dirname(VAULT_PATH), { recursive: true })
  writeFileSync(VAULT_PATH, encrypt(JSON.stringify(vault, null, 2)))
}

export function storeCredential(credential: VaultCredential): void {
  const vault = loadVault()
  vault.credentials[credential.platformId] = credential
  saveVault(vault)
}
