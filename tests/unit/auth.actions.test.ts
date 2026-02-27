/**
 * Unit tests for auth server-action logic extracted from lib/auth/actions.ts.
 *
 * Covers:
 * - signup/signin schema validation
 * - business name fallback behavior
 * - signin error mapping
 * - password reset redirect path assembly
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { z } from 'zod'

const ChefSignupSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  business_name: z.string().optional(),
  phone: z.string().optional(),
})

const SignInSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
  rememberMe: z.boolean().optional().default(true),
})

const PasswordResetRequestSchema = z.object({
  email: z.string().email('Valid email required'),
})

const UpdatePasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

function deriveBusinessName(email: string, businessName?: string): string {
  return businessName?.trim() || email.split('@')[0]
}

function normalizeSignInEmail(email: string): string {
  return email.trim().toLowerCase()
}

type SignInErrorLike = { code?: string; message?: string; status?: number }

function mapSignInError(error: SignInErrorLike): string {
  const errorCode = String(error?.code || '')
  const errorMessage = String(error?.message || '').toLowerCase()
  const errorStatus = Number(error?.status || 0)

  if (errorCode === 'email_not_confirmed') {
    return 'Your email is not confirmed. Please use Forgot password or create a new account.'
  }

  const invalidCredentials =
    errorCode === 'invalid_credentials' ||
    errorMessage.includes('invalid login credentials') ||
    errorMessage.includes('invalid email or password') ||
    errorMessage.includes('invalid grant')
  if (invalidCredentials) {
    return 'Invalid email or password'
  }

  const serviceUnavailable =
    errorStatus >= 500 ||
    errorMessage.includes('fetch failed') ||
    errorMessage.includes('network') ||
    errorMessage.includes('timed out') ||
    errorMessage.includes('temporarily unavailable')
  if (serviceUnavailable) {
    return 'Sign-in service is temporarily unavailable. Please try again.'
  }

  return 'Sign-in failed. Please try again or reset your password.'
}

function mapRateLimitFailure(error: unknown): string {
  const message = String((error as any)?.message || '').toLowerCase()
  if (message.includes('too many attempts')) {
    return String((error as any)?.message || 'Too many attempts. Please try again later.')
  }
  return 'Sign-in service is temporarily unavailable. Please try again.'
}

function passwordResetRedirect(siteUrl: string): string {
  return `${siteUrl}/auth/callback?next=/auth/reset-password`
}

describe('auth/actions - signup and signin validation', () => {
  it('accepts valid chef signup payload', () => {
    const parsed = ChefSignupSchema.parse({
      email: 'chef@example.com',
      password: 'supersecure1',
      business_name: 'Chef Flow LLC',
      phone: '+1 617 555 1212',
    })
    assert.equal(parsed.email, 'chef@example.com')
  })

  it('rejects invalid chef signup email', () => {
    assert.throws(
      () =>
        ChefSignupSchema.parse({
          email: 'bad-email',
          password: 'supersecure1',
        }),
      /Valid email required/
    )
  })

  it('rejects short signup password', () => {
    assert.throws(
      () =>
        ChefSignupSchema.parse({
          email: 'chef@example.com',
          password: 'short',
        }),
      /at least 8 characters/
    )
  })

  it('defaults rememberMe=true when omitted', () => {
    const parsed = SignInSchema.parse({
      email: 'CHEF@EXAMPLE.COM',
      password: 'x',
    })
    assert.equal(parsed.rememberMe, true)
  })

  it('normalizes signin email with trim + lowercase', () => {
    assert.equal(normalizeSignInEmail('  CHEF@EXAMPLE.COM '), 'chef@example.com')
  })
})

describe('auth/actions - business naming and password flows', () => {
  it('uses trimmed business_name when provided', () => {
    assert.equal(deriveBusinessName('chef@example.com', '  My Kitchen  '), 'My Kitchen')
  })

  it('falls back to email local-part when business_name empty', () => {
    assert.equal(deriveBusinessName('hello.world@example.com', '   '), 'hello.world')
  })

  it('validates password reset request email', () => {
    assert.equal(PasswordResetRequestSchema.parse({ email: 'a@b.com' }).email, 'a@b.com')
    assert.throws(() => PasswordResetRequestSchema.parse({ email: 'oops' }), /Valid email required/)
  })

  it('validates update password minimum length', () => {
    assert.equal(UpdatePasswordSchema.parse({ password: '12345678' }).password, '12345678')
    assert.throws(() => UpdatePasswordSchema.parse({ password: '123' }), /at least 8 characters/)
  })

  it('builds reset redirect URL correctly', () => {
    assert.equal(
      passwordResetRedirect('https://chef.example'),
      'https://chef.example/auth/callback?next=/auth/reset-password'
    )
  })
})

describe('auth/actions - signin error handling map', () => {
  it('maps email_not_confirmed code', () => {
    const message = mapSignInError({ code: 'email_not_confirmed', message: 'x', status: 400 })
    assert.equal(
      message,
      'Your email is not confirmed. Please use Forgot password or create a new account.'
    )
  })

  it('maps invalid credential signatures', () => {
    assert.equal(mapSignInError({ code: 'invalid_credentials' }), 'Invalid email or password')
    assert.equal(
      mapSignInError({ message: 'Invalid login credentials' }),
      'Invalid email or password'
    )
    assert.equal(mapSignInError({ message: 'invalid grant' }), 'Invalid email or password')
  })

  it('maps network/server failures to service unavailable', () => {
    assert.equal(
      mapSignInError({ status: 503, message: 'temporary issue' }),
      'Sign-in service is temporarily unavailable. Please try again.'
    )
    assert.equal(
      mapSignInError({ message: 'fetch failed' }),
      'Sign-in service is temporarily unavailable. Please try again.'
    )
  })

  it('maps unknown auth errors to generic signin failure', () => {
    assert.equal(
      mapSignInError({ message: 'unexpected upstream auth exception', status: 400 }),
      'Sign-in failed. Please try again or reset your password.'
    )
  })

  it('preserves explicit too-many-attempts rate limit failures', () => {
    const message = mapRateLimitFailure(new Error('Too many attempts. Please try again later.'))
    assert.equal(message, 'Too many attempts. Please try again later.')
  })

  it('maps unknown rate limit failures to temporary outage message', () => {
    const message = mapRateLimitFailure(new Error('redis timeout'))
    assert.equal(message, 'Sign-in service is temporarily unavailable. Please try again.')
  })
})
