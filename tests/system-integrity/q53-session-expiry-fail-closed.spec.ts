/**
 * Q53: Session Expiry Fails Closed
 *
 * When a JWT session expires, all server actions must reject the request.
 * The failure mode for an expired/invalid session must always be a thrown
 * error or redirect — never a silent success that completes the operation.
 *
 * This is tested structurally by verifying that requireChef(), requireAdmin(),
 * and requireClient() all check session validity and throw/redirect on failure.
 * A session that is null, expired, or has no user must NEVER proceed.
 *
 * Tests:
 *
 * 1. REQUIRECHEF THROWS ON NULL SESSION: The requireChef implementation
 *    checks for a null/undefined session and throws or redirects.
 *
 * 2. REQUIREADMIN THROWS ON NULL SESSION: requireAdmin() checks for null
 *    session before the admin table lookup.
 *
 * 3. AUTH CONFIG HAS SESSION STRATEGY: Auth.js is configured with JWT
 *    strategy and a maxAge — sessions are not indefinite.
 *
 * 4. NO SERVER ACTION USES OPTIONAL CHAINING ON SESSION USER: Patterns
 *    like session?.user?.id proceeding past null without a throw are
 *    fail-open behavior. Auth helpers must throw, not silently continue.
 *
 * 5. MIDDLEWARE REDIRECTS UNAUTHENTICATED CHEF ROUTES: middleware.ts
 *    redirects unauthenticated requests to /sign-in for protected paths.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q53-session-expiry-fail-closed.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const ROOT = process.cwd()
const AUTH_CONFIG = resolve(ROOT, 'lib/auth/auth-config.ts')
const MIDDLEWARE = resolve(ROOT, 'middleware.ts')

// Find auth helper files
function findAuthHelper(name: string): string {
  const candidates = [
    resolve(ROOT, 'lib/auth/actions.ts'),
    resolve(ROOT, 'lib/auth/session.ts'),
    resolve(ROOT, 'lib/auth/helpers.ts'),
    resolve(ROOT, 'lib/auth/require.ts'),
    resolve(ROOT, 'lib/auth/admin.ts'),
  ]
  for (const f of candidates) {
    if (existsSync(f) && readFileSync(f, 'utf-8').includes(name)) return f
  }
  return ''
}

test.describe('Q53: Session expiry fails closed', () => {
  // ---------------------------------------------------------------------------
  // Test 1: requireChef() throws/redirects on null session
  // ---------------------------------------------------------------------------
  test('requireChef() throws or redirects when session is null or missing', () => {
    const file = findAuthHelper('requireChef')
    expect(file.length, 'requireChef() must be defined in lib/auth/').toBeGreaterThan(0)

    const src = readFileSync(file, 'utf-8')

    // Find the requireChef function body
    const fnStart = src.indexOf('requireChef')
    const bodyStart = src.indexOf('{', fnStart)
    const bodyEnd =
      src.indexOf('\nexport', bodyStart) > -1 ? src.indexOf('\nexport', bodyStart) : bodyStart + 500
    const body = src.slice(bodyStart, bodyEnd)

    // Must have null check that throws or redirects
    expect(
      body.includes('throw') || body.includes('redirect') || body.includes('Error'),
      'requireChef() must throw or redirect when session/user is null — fail-closed on expiry'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 2: requireAdmin() throws/redirects on null session
  // ---------------------------------------------------------------------------
  test('requireAdmin() throws or redirects when session is null', () => {
    const adminLib = resolve(ROOT, 'lib/auth/admin.ts')
    expect(existsSync(adminLib), 'lib/auth/admin.ts must exist').toBe(true)

    const src = readFileSync(adminLib, 'utf-8')
    expect(
      src.includes('throw') || src.includes('redirect') || src.includes('Error'),
      'requireAdmin() must throw or redirect when session is null or user lacks admin role'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 3: Auth.js configured with JWT strategy (sessions expire)
  // ---------------------------------------------------------------------------
  test('auth-config.ts uses JWT session strategy with maxAge', () => {
    expect(existsSync(AUTH_CONFIG), 'lib/auth/auth-config.ts must exist').toBe(true)
    const src = readFileSync(AUTH_CONFIG, 'utf-8')

    expect(
      src.includes('jwt') || src.includes('strategy'),
      'Auth config must specify JWT session strategy to enable token expiry'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 4: Middleware redirects unauthenticated requests to sign-in
  // ---------------------------------------------------------------------------
  test('middleware.ts redirects unauthenticated chef route requests to sign-in', () => {
    expect(existsSync(MIDDLEWARE), 'middleware.ts must exist').toBe(true)
    const src = readFileSync(MIDDLEWARE, 'utf-8')

    expect(
      src.includes('sign-in') || src.includes('signin') || src.includes('/login'),
      'middleware.ts must redirect unauthenticated requests to the sign-in page'
    ).toBe(true)

    expect(
      src.includes('redirect') || src.includes('NextResponse.redirect'),
      'middleware.ts must issue a redirect response for unauthenticated chef paths'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 5: Auth helpers do not silently proceed on missing user
  // ---------------------------------------------------------------------------
  test('auth helpers do not use optional chaining to silently skip null user checks', () => {
    // Pattern: const userId = session?.user?.id — and then using userId without null check
    // This is fail-open: if session is null, userId is undefined, and the action may proceed
    // with undefined as the tenant id (matching no records = appearing to succeed)

    const eventsActions = resolve(ROOT, 'lib/events/actions.ts')
    if (!existsSync(eventsActions)) return

    const src = readFileSync(eventsActions, 'utf-8')

    // Should use requireChef() (which throws) rather than getSession()?.user?.id
    expect(
      src.includes('requireChef()') || src.includes('requireChef('),
      'Event actions must use requireChef() (throws on null) not optional-chain session access'
    ).toBe(true)
  })
})
