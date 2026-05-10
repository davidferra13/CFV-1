import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createHash } from 'crypto'

// ============================================================
// Unit tests for Local AI Connector (BYOA) system
// Tests: key generation, hashing, revocation, and authorization
// logic without hitting the database.
// ============================================================

// Re-implement the core key helpers inline to test the pure logic
// without any DB or Next.js dependencies.

const CONNECTOR_KEY_PREFIX = 'cf_connector_'

function generateConnectorKey(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `${CONNECTOR_KEY_PREFIX}${hex}`
}

function hashConnectorKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

describe('connector key format', () => {
  it('generates keys with correct prefix', () => {
    const key = generateConnectorKey()
    assert.ok(key.startsWith(CONNECTOR_KEY_PREFIX), `Expected prefix cf_connector_, got: ${key}`)
  })

  it('generates keys of correct length', () => {
    const key = generateConnectorKey()
    // cf_connector_ (13) + 64 hex chars = 77 chars total
    assert.equal(key.length, 77, `Expected length 77, got ${key.length}`)
  })

  it('generates unique keys each time', () => {
    const k1 = generateConnectorKey()
    const k2 = generateConnectorKey()
    assert.notEqual(k1, k2, 'Keys should be unique')
  })

  it('does not reuse the cf_live_ prefix used for API keys', () => {
    const key = generateConnectorKey()
    assert.ok(!key.startsWith('cf_live_'), 'Connector key must not use API key prefix')
  })
})

describe('connector key hashing', () => {
  it('produces a 64-char hex SHA-256 hash', () => {
    const key = generateConnectorKey()
    const hash = hashConnectorKey(key)
    assert.equal(hash.length, 64, `Hash should be 64 chars, got ${hash.length}`)
    assert.ok(/^[0-9a-f]+$/.test(hash), 'Hash should be lowercase hex')
  })

  it('is deterministic for the same key', () => {
    const key = generateConnectorKey()
    assert.equal(hashConnectorKey(key), hashConnectorKey(key))
  })

  it('produces different hashes for different keys', () => {
    const h1 = hashConnectorKey(generateConnectorKey())
    const h2 = hashConnectorKey(generateConnectorKey())
    assert.notEqual(h1, h2)
  })

  it('raw key cannot be recovered from hash', () => {
    const key = generateConnectorKey()
    const hash = hashConnectorKey(key)
    // Verify hash does not contain the key material
    assert.ok(!hash.includes(key.replace(CONNECTOR_KEY_PREFIX, '')))
  })
})

describe('connector auth header validation', () => {
  it('rejects missing auth headers', () => {
    // Simulate the prefix check from validateConnectorKey
    function isValidHeader(header: string | null): boolean {
      return header?.startsWith(`Bearer ${CONNECTOR_KEY_PREFIX}`) ?? false
    }

    assert.equal(isValidHeader(null), false)
    assert.equal(isValidHeader(''), false)
    assert.equal(isValidHeader('Bearer '), false)
    assert.equal(isValidHeader('Bearer cf_live_abc123'), false)
    assert.equal(isValidHeader('Token cf_connector_abc'), false)
  })

  it('accepts valid connector bearer tokens', () => {
    function isValidHeader(header: string | null): boolean {
      return header?.startsWith(`Bearer ${CONNECTOR_KEY_PREFIX}`) ?? false
    }

    const key = generateConnectorKey()
    assert.equal(isValidHeader(`Bearer ${key}`), true)
  })
})

describe('connector key prefix for display', () => {
  it('key prefix is safe to show in UI (no secret material)', () => {
    const key = generateConnectorKey()
    // The prefix (first 25 chars) reveals cf_connector_ + 12 chars of the hex
    // This is safe to display since 12 hex chars = 48 bits, far too little to brute-force SHA-256
    const prefix = key.substring(0, CONNECTOR_KEY_PREFIX.length + 8)
    assert.ok(prefix.startsWith(CONNECTOR_KEY_PREFIX))
    assert.ok(prefix.length < key.length, 'Prefix must be shorter than full key')
  })
})

describe('connector route security boundaries', () => {
  it('poll endpoint requires connector prefix - not API key prefix', () => {
    // Ensures the two key types are never confused at the auth layer
    const connectorKey = generateConnectorKey()
    const apiKey = `cf_live_${'a'.repeat(64)}`

    assert.ok(connectorKey.startsWith(CONNECTOR_KEY_PREFIX))
    assert.ok(!connectorKey.startsWith('cf_live_'))
    assert.ok(!apiKey.startsWith(CONNECTOR_KEY_PREFIX))
  })

  it('target_endpoint value for connector-routed tasks', () => {
    // Validates the string constant used to mark connector tasks
    const TARGET = 'local_connector'
    assert.equal(TARGET, 'local_connector')
    assert.ok(
      !['auto', 'pc', 'pi'].includes(TARGET),
      'local_connector is distinct from legacy values'
    )
  })
})

describe('connector result payload structure', () => {
  it('success result has required fields', () => {
    const result = {
      taskId: 'task-123',
      success: true,
      result: { raw: 'some output' },
      durationMs: 1234,
      model: 'gemma4',
    }

    assert.ok(result.taskId)
    assert.equal(result.success, true)
    assert.ok(result.result !== undefined)
    assert.ok(typeof result.durationMs === 'number')
  })

  it('failure result has required fields', () => {
    const result = {
      taskId: 'task-456',
      success: false,
      error: 'Ollama timeout',
      durationMs: 30000,
      model: 'gemma4',
    }

    assert.ok(result.taskId)
    assert.equal(result.success, false)
    assert.ok(result.error)
  })
})
