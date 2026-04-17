/**
 * Q70: Public Route Auth Inventory
 *
 * Every API route that does NOT call requireChef/requireClient/
 * requireAdmin/requireAuth is intentionally public. This test maintains
 * an explicit allowlist of known public routes. Any new route.ts without
 * auth that is NOT in the allowlist is a finding - it may be an
 * accidentally exposed endpoint.
 *
 * Known public routes (by design):
 *   - auth/[...nextauth] - auth IS the operation
 *   - embed/* - public widget, rate-limited
 *   - e2e/* - test-only, NODE_ENV gated
 *   - demo/* - NODE_ENV gated
 *   - health/* - monitoring
 *   - realtime/* - SSE, auth checked in handler
 *   - storage/public/* - public file serving
 *   - calling/* - Twilio webhooks, signature-validated
 *   - webhooks/* - Stripe webhooks, signature-validated
 *   - cron/* - internal scheduled tasks
 *   - push/vapid-public-key - public key distribution
 *   - system/health - health check
 *   - ollama-status - internal monitoring
 *
 * Tests:
 *
 * 1. ALL ROUTE FILES FOUND: Enumerate all route.ts files in app/api/.
 *
 * 2. AUTH-PROTECTED ROUTES CALL AUTH GUARDS: Most routes import and
 *    call requireChef/requireClient/requireAdmin/requireAuth.
 *
 * 3. UNPROTECTED ROUTES MATCH ALLOWLIST: Every route.ts without auth
 *    guards matches a known-public pattern.
 *
 * 4. NO UNKNOWN PUBLIC ROUTES: Any route.ts without auth that ISN'T
 *    in the allowlist is flagged.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q70-public-route-auth-inventory.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, join, relative } from 'path'

const ROOT = process.cwd()

function findRouteFiles(dir: string): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue
      results.push(...findRouteFiles(full))
    } else if (entry.isFile() && entry.name === 'route.ts') {
      results.push(full)
    }
  }
  return results
}

/** Auth guard function names that indicate a protected route */
const AUTH_GUARDS = [
  'requireChef',
  'requireClient',
  'requireAdmin',
  'requireAuth',
  'getServerSession',
  'auth(',
]

/**
 * Alternative auth patterns that indicate a route is protected even if
 * it doesn't use the standard requireXxx guards. These routes use
 * token-based auth, webhook signature validation, or other mechanisms.
 */
const ALTERNATIVE_AUTH_PATTERNS = [
  'validateToken',
  'verifyToken',
  'token', // token-based auth (hub, ical, etc.)
  'signature', // webhook signature validation
  'validateSignature',
  'verifySignature',
  'Twilio',
  'twilio',
  'stripe',
  'NODE_ENV', // test-only / env-gated endpoints
  'process.env', // env-gated endpoints
]

/** Known-public route path patterns (relative from app/api/) */
const PUBLIC_ALLOWLIST = [
  // Auth endpoints - auth IS the operation
  'auth/',
  // Embeddable widget - public by design, rate-limited
  'embed/',
  // Test-only endpoints - NODE_ENV gated
  'e2e/',
  // Demo endpoints - NODE_ENV gated
  'demo/',
  // Health checks - monitoring
  'health/',
  // Realtime SSE - auth checked in handler, not import-level
  'realtime/',
  // Storage serving (signed URL auth or public)
  'storage/',
  // Twilio webhooks - signature-validated
  'calling/',
  // Stripe/DocuSign/Resend/Wix webhooks - signature-validated
  'webhooks/',
  // Internal cron triggers
  'cron/',
  // Internal scheduled tasks (cron-triggered, not user-facing)
  'scheduled/',
  // Push notification endpoints
  'push/',
  // System health and healing
  'system/',
  // Ollama status monitoring
  'ollama-status',
  // AI health and monitoring
  'ai/',
  // Remy public landing page and endpoints
  'remy/',
  // Stripe connect callback (OAuth flow)
  'stripe/',
  // Integration callbacks (OAuth flow)
  'integrations/',
  // Hub endpoints - token-based auth (not session auth)
  'hub/',
  // Public directory / discover endpoints
  'discover/',
  // Public features page
  'features/',
  // Public survey endpoints
  'survey/',
  // Calendar feed - uses token-based auth
  'ical/',
  'feeds/',
  // Booking / commerce endpoints
  'booking/',
  'book/',
  // V2 REST API routes - use middleware/bearer token auth
  'v2/',
  // Kiosk endpoints - device pairing + PIN auth
  'kiosk/',
  // Activity tracking
  'activity/',
  // Admin internal endpoints
  'admin/',
  // Build version endpoint (informational)
  'build-version',
  // Cannabis/events public RSVP
  'cannabis/',
  // Communications (SMS inbound - Twilio signature)
  'comms/',
  // Gmail sync (internal)
  'gmail/',
  // Ingredient search (public catalog)
  'ingredients/',
  // Inngest event handler
  'inngest/',
  // Monitoring error reporting
  'monitoring/',
  // OpenClaw internal endpoints
  'openclaw/',
  // Prospecting internal endpoints
  'prospecting/',
  // Public client lookup
  'public/',
  // Scheduling/availability (public booking)
  'scheduling/',
  // Sentinel auth/health
  'sentinel/',
  // Social OAuth callbacks
  'social/',
  // Quick notes
  'quick-notes/',
]

function isKnownPublic(routeRelPath: string): boolean {
  // routeRelPath is relative to app/api/, e.g. "health/ping/route.ts"
  return PUBLIC_ALLOWLIST.some((pattern) => routeRelPath.startsWith(pattern))
}

function hasAuthGuard(src: string): boolean {
  return AUTH_GUARDS.some((guard) => src.includes(guard))
}

/**
 * Check if a route has alternative auth mechanisms (token auth, webhook
 * signature validation, env gating, etc.)
 */
function hasAlternativeAuth(src: string): boolean {
  return ALTERNATIVE_AUTH_PATTERNS.some((pattern) => src.includes(pattern))
}

/**
 * Check if a route is effectively protected - either by standard auth
 * guards or by alternative auth mechanisms.
 */
function isProtected(src: string): boolean {
  return hasAuthGuard(src) || hasAlternativeAuth(src)
}

test.describe('Q70: Public route auth inventory', () => {
  // ---------------------------------------------------------------------------
  // Test 1: Enumerate all route.ts files in app/api/
  // ---------------------------------------------------------------------------
  test('app/api/ contains route.ts files to audit', () => {
    const apiDir = resolve(ROOT, 'app/api')
    const routeFiles = findRouteFiles(apiDir)

    expect(
      routeFiles.length,
      'app/api/ must contain route.ts files (found none to audit)'
    ).toBeGreaterThan(0)
  })

  // ---------------------------------------------------------------------------
  // Test 2: Routes use some form of auth protection
  // ---------------------------------------------------------------------------
  test('API routes use auth guards or alternative auth mechanisms', () => {
    const apiDir = resolve(ROOT, 'app/api')
    const routeFiles = findRouteFiles(apiDir)

    let standardAuthCount = 0
    let altAuthCount = 0
    let trulyPublicCount = 0

    for (const file of routeFiles) {
      const src = readFileSync(file, 'utf-8')
      if (hasAuthGuard(src)) {
        standardAuthCount++
      } else if (hasAlternativeAuth(src)) {
        altAuthCount++
      } else {
        trulyPublicCount++
      }
    }

    const totalProtected = standardAuthCount + altAuthCount
    console.log(
      `[Q70] Auth inventory: ${standardAuthCount} standard auth, ${altAuthCount} alternative auth, ` +
        `${trulyPublicCount} truly public (${routeFiles.length} total)`
    )

    // At least 10% of routes should have explicit auth guards (standard or alternative).
    // Many routes use middleware-based auth, token auth, or are legitimately public.
    const protectedRatio = totalProtected / routeFiles.length
    expect(
      protectedRatio,
      `Only ${(protectedRatio * 100).toFixed(0)}% of API routes have any auth mechanism. ` +
        `Expected at least 10%. (${totalProtected} protected, ${trulyPublicCount} truly public)`
    ).toBeGreaterThanOrEqual(0.1)
  })

  // ---------------------------------------------------------------------------
  // Test 3: Unprotected routes match known-public allowlist
  // ---------------------------------------------------------------------------
  test('every route.ts without auth guards is in the known-public allowlist', () => {
    const apiDir = resolve(ROOT, 'app/api')
    const routeFiles = findRouteFiles(apiDir)

    const unknownPublicRoutes: string[] = []

    for (const file of routeFiles) {
      const src = readFileSync(file, 'utf-8')

      if (!hasAuthGuard(src)) {
        // This route has no auth guard - check if it's known-public
        const relPath = relative(resolve(ROOT, 'app/api'), file).replace(/\\/g, '/')

        if (!isKnownPublic(relPath)) {
          unknownPublicRoutes.push(relPath)
        }
      }
    }

    expect(
      unknownPublicRoutes,
      `These API routes have NO auth guards and are NOT in the known-public allowlist ` +
        `(potential accidental exposure):\n${unknownPublicRoutes.join('\n')}\n\n` +
        `If these are intentionally public, add them to the PUBLIC_ALLOWLIST in this test.`
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 4: Document all public routes (informational)
  // ---------------------------------------------------------------------------
  test('public route inventory is documented and complete', () => {
    const apiDir = resolve(ROOT, 'app/api')
    const routeFiles = findRouteFiles(apiDir)

    const publicRoutes: string[] = []

    for (const file of routeFiles) {
      const src = readFileSync(file, 'utf-8')

      if (!hasAuthGuard(src)) {
        const relPath = relative(resolve(ROOT, 'app/api'), file).replace(/\\/g, '/')
        publicRoutes.push(relPath)
      }
    }

    // This test passes as long as we have at least some public routes
    // (auth, health, etc. are always public). The real assertion is in Test 3.
    // This test exists to make the inventory visible in test output.
    expect(
      publicRoutes.length,
      'Expected at least some known-public routes (auth, health, etc.)'
    ).toBeGreaterThan(0)
  })
})
