/**
 * Unit tests for Cloudflare Turnstile verification in lib/security/turnstile.ts.
 */

import { afterEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { verifyTurnstileToken } from '../../lib/security/turnstile.js'
import { TURNSTILE_TEST_SECRET_KEY } from '../../lib/security/turnstile-constants.js'

const originalFetch = global.fetch
const originalSecret = process.env.TURNSTILE_SECRET_KEY

afterEach(() => {
  global.fetch = originalFetch
  if (originalSecret === undefined) {
    delete process.env.TURNSTILE_SECRET_KEY
  } else {
    process.env.TURNSTILE_SECRET_KEY = originalSecret
  }
})

describe('security/turnstile - verification behavior', () => {
  it('bypasses verification when secret key is not configured', async () => {
    delete process.env.TURNSTILE_SECRET_KEY
    const result = await verifyTurnstileToken('')
    assert.deepEqual(result, { success: true })
  })

  it('rejects missing token when secret key exists', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret'
    const result = await verifyTurnstileToken('')
    assert.equal(result.success, false)
    assert.equal(result.error, 'Missing CAPTCHA verification. Please try again.')
  })

  it('allows through when Cloudflare returns non-OK status', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret'
    global.fetch = async () =>
      ({
        ok: false,
        status: 502,
      }) as any

    const result = await verifyTurnstileToken('tok_123')
    assert.deepEqual(result, { success: true })
  })

  it('returns success when Cloudflare payload success=true', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret'
    global.fetch = async (_input, init) => {
      assert.equal(init?.method, 'POST')
      assert.ok(String(init?.body).includes('secret=secret'))
      assert.ok(String(init?.body).includes('response=tok_123'))
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as any
    }

    const result = await verifyTurnstileToken('tok_123')
    assert.deepEqual(result, { success: true })
  })

  it('uses Cloudflare test secret on localhost in non-production', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret'
    global.fetch = async (_input, init) => {
      assert.ok(String(init?.body).includes(`secret=${TURNSTILE_TEST_SECRET_KEY}`))
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as any
    }

    const result = await verifyTurnstileToken('tok_123', { host: 'localhost:3100' })
    assert.deepEqual(result, { success: true })
  })

  it('returns human-readable error when Cloudflare says failure', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret'
    global.fetch = async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
      }) as any

    const result = await verifyTurnstileToken('tok_123')
    assert.equal(result.success, false)
    assert.equal(result.error, 'CAPTCHA verification failed. Please refresh and try again.')
  })

  it('allows through on fetch/network exception', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret'
    global.fetch = async () => {
      throw new Error('network down')
    }

    const result = await verifyTurnstileToken('tok_123')
    assert.deepEqual(result, { success: true })
  })
})
