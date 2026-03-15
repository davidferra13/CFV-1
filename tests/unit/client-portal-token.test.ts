import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CLIENT_PORTAL_TOKEN_TTL_DAYS,
  generateClientPortalTokenValue,
  getClientPortalTokenExpiry,
  hashClientPortalToken,
  isClientPortalTokenExpired,
} from '../../lib/client-portal/token.js'

test('generateClientPortalTokenValue returns a 64-character hex token', () => {
  const token = generateClientPortalTokenValue()
  assert.match(token, /^[a-f0-9]{64}$/)
})

test('hashClientPortalToken is deterministic and does not equal the raw token', () => {
  const token = 'a'.repeat(64)
  const hash = hashClientPortalToken(token)
  assert.equal(hash, hashClientPortalToken(token))
  assert.notEqual(hash, token)
  assert.match(hash, /^[a-f0-9]{64}$/)
})

test('getClientPortalTokenExpiry uses the configured TTL window', () => {
  const start = new Date('2026-03-15T12:00:00.000Z')
  const expiry = getClientPortalTokenExpiry(start)
  assert.equal(
    expiry.toISOString(),
    new Date(start.getTime() + CLIENT_PORTAL_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
  )
})

test('isClientPortalTokenExpired treats missing, invalid, past, and future dates correctly', () => {
  const now = new Date('2026-03-15T12:00:00.000Z')
  assert.equal(isClientPortalTokenExpired(null, now), true)
  assert.equal(isClientPortalTokenExpired('not-a-date', now), true)
  assert.equal(isClientPortalTokenExpired('2026-03-15T11:59:59.000Z', now), true)
  assert.equal(isClientPortalTokenExpired('2026-03-15T12:00:01.000Z', now), false)
})
