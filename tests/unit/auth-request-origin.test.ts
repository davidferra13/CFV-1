import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveAuthCookieOptions, resolveAuthRequestOrigin } from '@/lib/auth/request-origin'

describe('resolveAuthRequestOrigin', () => {
  it('rebuilds the public origin from forwarded headers', () => {
    assert.equal(
      resolveAuthRequestOrigin({
        requestOrigin: 'https://0.0.0.0:3000',
        forwardedProto: 'https',
        forwardedHost: 'app.cheflowhq.com',
      }),
      'https://app.cheflowhq.com'
    )
  })

  it('falls back to the request origin when forwarded headers are missing', () => {
    assert.equal(
      resolveAuthRequestOrigin({
        requestOrigin: 'http://10.0.0.153:3000',
      }),
      'http://10.0.0.153:3000'
    )
  })
})

describe('resolveAuthCookieOptions', () => {
  it('uses a non-secure session cookie for local http access', () => {
    const options = resolveAuthCookieOptions({
      requestOrigin: 'http://10.0.0.153:3000',
    })

    assert.equal(options.useSecureCookies, false)
    assert.equal(options.sessionCookieName, 'authjs.session-token')
  })

  it('uses the secure auth cookie for https origins', () => {
    const options = resolveAuthCookieOptions({
      requestOrigin: 'https://app.cheflowhq.com',
    })

    assert.equal(options.useSecureCookies, true)
    assert.equal(options.sessionCookieName, '__Secure-authjs.session-token')
  })
})
