import test from 'node:test'
import assert from 'node:assert/strict'
import { guardPublicIntent } from '../../lib/security/public-intent-guard.js'

function jsonRequest(body: unknown, ip: string) {
  return new Request('http://localhost/public-intent-test', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
      host: 'localhost:3100',
    },
    body: JSON.stringify(body),
  })
}

test('public intent guard accepts clean public JSON submissions', async () => {
  const prefix = `guard-clean-${Date.now()}-${Math.random()}`
  const result = await guardPublicIntent<{ email: string; website_url?: string }>({
    action: 'unit-clean',
    request: jsonRequest({ email: 'casey@example.com', website_url: '' }, '203.0.113.10'),
    body: {
      maxBytes: 4096,
      invalidJsonMessage: 'Invalid body',
      payloadTooLargeMessage: 'Body too large',
    },
    rateLimit: {
      ip: { keyPrefix: `${prefix}:ip`, max: 2, windowMs: 60_000 },
      email: {
        keyPrefix: `${prefix}:email`,
        max: 2,
        windowMs: 60_000,
        getValue: (body) => body?.email,
      },
    },
    honeypot: { field: 'website_url' },
  })

  assert.equal(result.ok, true)
  assert.equal(result.metadata.ip, '203.0.113.10')
  assert.deepEqual(result.body, { email: 'casey@example.com', website_url: '' })
})

test('public intent guard rejects honeypot submissions without throwing', async () => {
  const result = await guardPublicIntent<{ email: string; website_url?: string }>({
    action: 'unit-honeypot',
    request: jsonRequest(
      { email: 'casey@example.com', website_url: 'https://spam.example' },
      '203.0.113.11'
    ),
    body: {
      maxBytes: 4096,
      invalidJsonMessage: 'Invalid body',
      payloadTooLargeMessage: 'Body too large',
    },
    honeypot: { field: 'website_url' },
  })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.error.code, 'honeypot')
  assert.equal(result.error.status, 200)
  assert.equal(result.error.message, 'Submission received.')
})

test('public intent guard rate limits repeated public submissions', async () => {
  const prefix = `guard-rate-${Date.now()}-${Math.random()}`
  const first = await guardPublicIntent({
    action: 'unit-rate',
    request: jsonRequest({ email: 'rate@example.com' }, '203.0.113.12'),
    body: { maxBytes: 4096 },
    rateLimit: {
      ip: {
        keyPrefix: `${prefix}:ip`,
        max: 1,
        windowMs: 60_000,
        message: 'Slow down',
      },
    },
  })
  assert.equal(first.ok, true)

  const second = await guardPublicIntent({
    action: 'unit-rate',
    request: jsonRequest({ email: 'rate@example.com' }, '203.0.113.12'),
    body: { maxBytes: 4096 },
    rateLimit: {
      ip: {
        keyPrefix: `${prefix}:ip`,
        max: 1,
        windowMs: 60_000,
        message: 'Slow down',
      },
    },
  })

  assert.equal(second.ok, false)
  if (second.ok) return
  assert.equal(second.error.code, 'rate_limited')
  assert.equal(second.error.status, 429)
  assert.equal(second.error.message, 'Slow down')
})
