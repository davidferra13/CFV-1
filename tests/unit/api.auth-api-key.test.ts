/**
 * Unit tests for API key logic from lib/api/auth-api-key.ts.
 *
 * Directly tests pure exports and extracted validation decision rules.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { generateApiKey, hashApiKey } from '../../lib/api/auth-api-key.js'

type ApiKeyRow = {
  id: string
  tenant_id: string
  scopes: string[] | null
  is_active: boolean
  expires_at: string | null
}

function parseBearerApiKey(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer cf_live_')) return null
  return authHeader.replace('Bearer ', '').trim()
}

function mapValidatedRowToContext(
  row: ApiKeyRow | null,
  now: Date
): { tenantId: string; scopes: string[]; keyId: string } | null {
  if (!row || !row.is_active) return null
  if (row.expires_at && new Date(row.expires_at) < now) return null
  return { tenantId: row.tenant_id, scopes: row.scopes || [], keyId: row.id }
}

describe('api/auth-api-key - hashApiKey', () => {
  it('returns deterministic sha256 hash', () => {
    const first = hashApiKey('cf_live_example')
    const second = hashApiKey('cf_live_example')
    assert.equal(first, second)
    assert.match(first, /^[a-f0-9]{64}$/)
  })

  it('produces different hashes for different keys', () => {
    assert.notEqual(hashApiKey('cf_live_a'), hashApiKey('cf_live_b'))
  })
})

describe('api/auth-api-key - generateApiKey', () => {
  it('returns expected prefix and 32-byte hex body', () => {
    const key = generateApiKey()
    assert.match(key, /^cf_live_[a-f0-9]{64}$/)
    assert.equal(key.length, 72)
  })

  it('generates unique keys on repeated calls', () => {
    const a = generateApiKey()
    const b = generateApiKey()
    assert.notEqual(a, b)
  })
})

describe('api/auth-api-key - extracted validateApiKey flow rules', () => {
  it('parses valid bearer API key header', () => {
    const key = parseBearerApiKey('Bearer cf_live_abc')
    assert.equal(key, 'cf_live_abc')
  })

  it('rejects null header or wrong prefix', () => {
    assert.equal(parseBearerApiKey(null), null)
    assert.equal(parseBearerApiKey('Bearer sk_test_abc'), null)
    assert.equal(parseBearerApiKey('Basic xyz'), null)
  })

  it('maps active non-expired row to context', () => {
    const context = mapValidatedRowToContext(
      {
        id: 'k1',
        tenant_id: 't1',
        scopes: ['events:read'],
        is_active: true,
        expires_at: '2026-03-01T00:00:00.000Z',
      },
      new Date('2026-02-27T00:00:00.000Z')
    )
    assert.deepEqual(context, {
      tenantId: 't1',
      scopes: ['events:read'],
      keyId: 'k1',
    })
  })

  it('returns null for inactive keys', () => {
    const context = mapValidatedRowToContext(
      {
        id: 'k2',
        tenant_id: 't1',
        scopes: [],
        is_active: false,
        expires_at: null,
      },
      new Date('2026-02-27T00:00:00.000Z')
    )
    assert.equal(context, null)
  })

  it('returns null for expired keys', () => {
    const context = mapValidatedRowToContext(
      {
        id: 'k3',
        tenant_id: 't1',
        scopes: [],
        is_active: true,
        expires_at: '2026-02-01T00:00:00.000Z',
      },
      new Date('2026-02-27T00:00:00.000Z')
    )
    assert.equal(context, null)
  })

  it('defaults scopes to empty array when null', () => {
    const context = mapValidatedRowToContext(
      {
        id: 'k4',
        tenant_id: 't2',
        scopes: null,
        is_active: true,
        expires_at: null,
      },
      new Date('2026-02-27T00:00:00.000Z')
    )
    assert.deepEqual(context, {
      tenantId: 't2',
      scopes: [],
      keyId: 'k4',
    })
  })
})
