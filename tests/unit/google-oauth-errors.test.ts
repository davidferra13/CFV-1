import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isGoogleAuthButtonEnabled,
  normalizeGoogleOAuthErrorMessage,
} from '@/lib/auth/google-oauth-errors'

describe('normalizeGoogleOAuthErrorMessage', () => {
  it('maps callback misconfiguration errors to user-safe fallback', () => {
    const result = normalizeGoogleOAuthErrorMessage(
      'Invalid NEXT_PUBLIC_SITE_URL. Expected a valid http(s) URL.'
    )

    assert.equal(
      result,
      'Google sign-in is temporarily unavailable. Please use email and password.'
    )
  })

  it('maps network errors to actionable guidance', () => {
    const result = normalizeGoogleOAuthErrorMessage('Failed to fetch')
    assert.equal(
      result,
      'Connection issue while reaching Google sign-in. Please check your network and try again.'
    )
  })

  it('falls back to original message for unknown errors', () => {
    const result = normalizeGoogleOAuthErrorMessage('Something unusual happened')
    assert.equal(result, 'Something unusual happened')
  })
})

describe('isGoogleAuthButtonEnabled', () => {
  it('defaults to enabled', () => {
    assert.equal(isGoogleAuthButtonEnabled(undefined), true)
    assert.equal(isGoogleAuthButtonEnabled(''), true)
  })

  it('disables for falsey flag values', () => {
    assert.equal(isGoogleAuthButtonEnabled('false'), false)
    assert.equal(isGoogleAuthButtonEnabled('0'), false)
    assert.equal(isGoogleAuthButtonEnabled('off'), false)
  })

  it('enables for truthy flag values', () => {
    assert.equal(isGoogleAuthButtonEnabled('true'), true)
    assert.equal(isGoogleAuthButtonEnabled('1'), true)
  })
})
