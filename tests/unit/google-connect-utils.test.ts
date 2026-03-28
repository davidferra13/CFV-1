import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildGoogleConnectEntryUrl } from '@/lib/google/connect-entry'
import { resolveGoogleConnectOrigin } from '@/lib/google/connect-server'
import {
  buildGoogleConnectResultPath,
  sanitizeGoogleConnectReturnTo,
} from '@/lib/google/connect-shared'

describe('sanitizeGoogleConnectReturnTo', () => {
  it('keeps same-origin relative paths', () => {
    assert.equal(sanitizeGoogleConnectReturnTo('/onboarding?step=5'), '/onboarding?step=5')
  })

  it('rejects protocol-relative and absolute URLs', () => {
    assert.equal(sanitizeGoogleConnectReturnTo('//evil.example.com'), null)
    assert.equal(sanitizeGoogleConnectReturnTo('https://evil.example.com/onboarding'), null)
  })
})

describe('buildGoogleConnectEntryUrl', () => {
  it('builds a same-origin route with deduped scopes and return path', () => {
    const url = buildGoogleConnectEntryUrl(
      [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
      ],
      { returnTo: '/onboarding' }
    )

    const parsed = new URL(url, 'https://app.cheflowhq.com')
    assert.equal(parsed.pathname, '/api/auth/google/connect')
    assert.deepEqual(parsed.searchParams.getAll('scope'), [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
    ])
    assert.equal(parsed.searchParams.get('returnTo'), '/onboarding')
  })
})

describe('resolveGoogleConnectOrigin', () => {
  it('uses the active request origin in development', () => {
    assert.equal(
      resolveGoogleConnectOrigin({
        siteUrl: 'https://app.cheflowhq.com',
        requestOrigin: 'http://localhost:3100',
        nodeEnv: 'development',
      }),
      'http://localhost:3100'
    )
  })

  it('prefers the configured site URL in production', () => {
    assert.equal(
      resolveGoogleConnectOrigin({
        siteUrl: 'https://app.cheflowhq.com',
        requestOrigin: 'http://localhost:3100',
        nodeEnv: 'production',
      }),
      'https://app.cheflowhq.com'
    )
  })
})

describe('buildGoogleConnectResultPath', () => {
  it('adds callback results to the provided return path', () => {
    assert.equal(
      buildGoogleConnectResultPath({
        returnTo: '/onboarding?step=5',
        key: 'error',
        value: 'Google authorization was denied',
      }),
      '/onboarding?step=5&error=Google+authorization+was+denied'
    )
  })
})
