import { createHash, randomBytes } from 'crypto'

export const CLIENT_PORTAL_TOKEN_TTL_DAYS = 30
const CLIENT_PORTAL_TOKEN_TTL_MS = CLIENT_PORTAL_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000

export function generateClientPortalTokenValue(): string {
  return randomBytes(32).toString('hex')
}

export function hashClientPortalToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function getClientPortalTokenExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + CLIENT_PORTAL_TOKEN_TTL_MS)
}

export function isClientPortalTokenExpired(
  expiresAt: string | Date | null | undefined,
  now: Date = new Date()
): boolean {
  if (!expiresAt) return true
  const parsed = expiresAt instanceof Date ? expiresAt : new Date(expiresAt)
  if (Number.isNaN(parsed.getTime())) return true
  return parsed.getTime() <= now.getTime()
}
