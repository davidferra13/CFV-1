import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveGoogleOAuthCallbackUrl } from '../../lib/supabase/client'

describe('resolveGoogleOAuthCallbackUrl', () => {
  it('prefers configured NEXT_PUBLIC_SITE_URL origin over browser origin', () => {
    const callback = resolveGoogleOAuthCallbackUrl('/auth/role-selection', {
      siteUrl: 'http://localhost:3100',
      browserOrigin: 'http://localhost:3200',
    })

    assert.equal(callback, 'http://localhost:3100/auth/callback?next=%2Fauth%2Frole-selection')
  })

  it('keeps query params in next path', () => {
    const callback = resolveGoogleOAuthCallbackUrl('/auth/role-selection?ref=beta', {
      siteUrl: 'https://beta.cheflowhq.com',
      browserOrigin: 'https://temporary-tunnel.example.com',
    })

    assert.equal(
      callback,
      'https://beta.cheflowhq.com/auth/callback?next=%2Fauth%2Frole-selection%3Fref%3Dbeta'
    )
  })

  it('falls back to browser origin when site URL is missing', () => {
    const callback = resolveGoogleOAuthCallbackUrl(undefined, {
      browserOrigin: 'https://app.cheflowhq.com',
    })

    assert.equal(callback, 'https://app.cheflowhq.com/auth/callback')
  })

  it('throws when site URL is invalid', () => {
    assert.throws(
      () =>
        resolveGoogleOAuthCallbackUrl(undefined, {
          siteUrl: 'ftp://cheflowhq.com',
          browserOrigin: 'https://app.cheflowhq.com',
        }),
      /Invalid NEXT_PUBLIC_SITE_URL/
    )
  })

  it('throws when neither site URL nor browser origin is usable', () => {
    assert.throws(
      () =>
        resolveGoogleOAuthCallbackUrl(undefined, {
          siteUrl: undefined,
          browserOrigin: 'also-not-a-url',
        }),
      /Unable to determine OAuth callback origin/
    )
  })

  it('throws in production when site URL is missing', () => {
    const previousEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    try {
      assert.throws(
        () =>
          resolveGoogleOAuthCallbackUrl(undefined, {
            browserOrigin: 'https://app.cheflowhq.com',
            siteUrl: undefined,
          }),
        /NEXT_PUBLIC_SITE_URL must be set/
      )
    } finally {
      process.env.NODE_ENV = previousEnv
    }
  })
})
