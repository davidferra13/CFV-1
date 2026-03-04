import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeAuthEmail,
  normalizeWebsiteSignupErrorMessage,
  validateWebsiteSignupInput,
} from '@/lib/auth/website-signup'

describe('normalizeAuthEmail', () => {
  it('trims and lowercases email addresses', () => {
    assert.equal(normalizeAuthEmail('  User@Example.COM '), 'user@example.com')
  })
})

describe('validateWebsiteSignupInput', () => {
  it('rejects malformed email', () => {
    const result = validateWebsiteSignupInput({
      email: 'bad-email',
      password: 'Password123!',
    })
    assert.equal(result, 'Please enter a valid email address.')
  })

  it('rejects short passwords', () => {
    const result = validateWebsiteSignupInput({
      email: 'chef@example.com',
      password: 'short',
    })
    assert.equal(result, 'Password must be at least 8 characters.')
  })

  it('rejects blank full name when required', () => {
    const result = validateWebsiteSignupInput({
      email: 'client@example.com',
      password: 'Password123!',
      fullName: '   ',
    })
    assert.equal(result, 'Full name is required.')
  })

  it('rejects invitation email mismatch', () => {
    const result = validateWebsiteSignupInput({
      email: 'other@example.com',
      password: 'Password123!',
      fullName: 'Client User',
      invitationEmail: 'invitee@example.com',
    })
    assert.equal(result, 'Please use the same email address that received the invitation.')
  })

  it('accepts valid payload', () => {
    const result = validateWebsiteSignupInput({
      email: 'Chef@Example.com',
      password: 'Password123!',
      fullName: 'Chef User',
    })
    assert.equal(result, null)
  })
})

describe('normalizeWebsiteSignupErrorMessage', () => {
  it('maps network errors to a user-friendly message', () => {
    const message = normalizeWebsiteSignupErrorMessage('Failed to fetch')
    assert.equal(
      message,
      'Connection issue while creating your account. Please check your network and try again.'
    )
  })

  it('maps invitation mismatch errors', () => {
    const message = normalizeWebsiteSignupErrorMessage('Email does not match invitation')
    assert.equal(message, 'Please use the same email address that received the invitation.')
  })

  it('returns fallback for empty unknown messages', () => {
    const message = normalizeWebsiteSignupErrorMessage('')
    assert.equal(message, 'Account creation failed. Please try again.')
  })
})
