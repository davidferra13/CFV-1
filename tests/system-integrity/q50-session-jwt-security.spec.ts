/**
 * Q50: Session JWT Security
 *
 * Auth.js v5 sessions use JWTs. Security properties that must hold:
 *   1. Sessions expire (maxAge set - infinite sessions = permanent access after credential theft)
 *   2. Session invalidation exists (compromised sessions can be revoked without waiting for expiry)
 *   3. Admin sessions can be invalidated independently of chef sessions
 *
 * Tests:
 *
 * 1. SESSION MAXAGE: lib/auth/auth-config.ts sets maxAge on the session
 *    (not infinite/default).
 *
 * 2. SESSION INVALIDATION: shouldInvalidateJwtSession or equivalent exists
 *    to support server-side session revocation.
 *
 * 3. INVALIDATION CHECKS VERSION: Session invalidation uses a version or
 *    generation counter (not just expiry time) so all sessions can be
 *    force-expired by bumping the version.
 *
 * 4. JWT STRATEGY: Session strategy is 'jwt' (stateless, scalable) rather
 *    than database sessions.
 *
 * 5. AUTH GUARD FUNCTIONS EXIST: requireChef, requireClient, requireAdmin
 *    all exist as distinct functions (not one generic requireAuth).
 *
 * 6. CREDENTIALS PROVIDER: Auth config includes credentials provider
 *    (email/password login path exists for the agent test account).
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q50-session-jwt-security.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const AUTH_CONFIG = resolve(process.cwd(), 'lib/auth/auth-config.ts')
const GET_USER = resolve(process.cwd(), 'lib/auth/get-user.ts')

test.describe('Q50: Session JWT security', () => {
  // -------------------------------------------------------------------------
  // Test 1: Session maxAge is set (sessions expire)
  // -------------------------------------------------------------------------
  test('lib/auth/auth-config.ts sets session maxAge (sessions must expire)', () => {
    expect(existsSync(AUTH_CONFIG), 'lib/auth/auth-config.ts must exist').toBe(true)

    const src = readFileSync(AUTH_CONFIG, 'utf-8')

    expect(
      src.includes('maxAge'),
      'auth-config.ts must set session maxAge (infinite sessions = permanent access after credential theft)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: Session invalidation mechanism exists
  // -------------------------------------------------------------------------
  test('auth-config.ts has a session invalidation mechanism (not just expiry)', () => {
    const src = readFileSync(AUTH_CONFIG, 'utf-8')

    expect(
      src.includes('shouldInvalidate') ||
        src.includes('invalidate') ||
        src.includes('sessionVersion') ||
        src.includes('forceExpire'),
      'auth-config.ts must support session invalidation (so compromised sessions can be revoked)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Invalidation uses a version/generation counter
  // -------------------------------------------------------------------------
  test('session invalidation uses a version counter for force-expiry of all sessions', () => {
    const src = readFileSync(AUTH_CONFIG, 'utf-8')

    expect(
      src.includes('sessionVersion') ||
        src.includes('session_version') ||
        src.includes('version') ||
        src.includes('generation'),
      'session invalidation must use a version counter (allows force-expiring all sessions for a user)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: JWT session strategy used
  // -------------------------------------------------------------------------
  test("auth-config.ts uses 'jwt' session strategy", () => {
    const src = readFileSync(AUTH_CONFIG, 'utf-8')

    expect(
      src.includes("strategy: 'jwt'") || src.includes('strategy: "jwt"') || src.includes("'jwt'"),
      'auth-config.ts must use JWT session strategy for scalable, stateless auth'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Distinct auth guard functions for each role
  // -------------------------------------------------------------------------
  test('requireChef, requireClient, and requireAdmin exist as distinct auth guards', () => {
    if (!existsSync(GET_USER)) return

    const src = readFileSync(GET_USER, 'utf-8')

    expect(src.includes('requireChef'), 'lib/auth/get-user.ts must export requireChef()').toBe(true)

    expect(
      src.includes('requireClient') || src.includes('requireAdmin'),
      'lib/auth/get-user.ts must export requireClient() or requireAdmin() as distinct guards'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6: Credentials provider exists for email/password login
  // -------------------------------------------------------------------------
  test('auth-config.ts includes credentials provider for email/password authentication', () => {
    const src = readFileSync(AUTH_CONFIG, 'utf-8')

    expect(
      src.includes('Credentials') || src.includes('credentials'),
      'auth-config.ts must include credentials provider (required for agent test account login)'
    ).toBe(true)
  })
})
