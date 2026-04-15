/**
 * Q37: Embed Widget CORS and Atomicity
 *
 * The embed inquiry form lives on third-party chef websites. It must:
 *   - Accept cross-origin requests (CORS headers required)
 *   - Return valid preflight responses (OPTIONS)
 *   - Rate-limit to prevent spam/abuse
 *   - Validate input before creating any DB records
 *
 * Q17 covers atomicity (client + inquiry + event created together or not at
 * all). This question covers the HTTP contract: the route must be reachable
 * from external origins and must have anti-abuse gates that work without auth.
 *
 * Tests:
 *
 * 1. CORS HEADERS: app/api/embed/inquiry/route.ts sets
 *    Access-Control-Allow-Origin to allow cross-origin requests.
 *
 * 2. OPTIONS HANDLER: The route handles OPTIONS (preflight) requests.
 *
 * 3. RATE LIMITING: An IP-based rate limit gate exists before DB writes.
 *
 * 4. HONEYPOT FIELD: A honeypot field (e.g., website_url) is present to
 *    catch basic bots without CAPTCHA friction.
 *
 * 5. CHEF STATUS CHECK: The route validates the chef account is active
 *    before accepting inquiries (suspended chefs cannot receive new leads).
 *
 * 6. HTML STRIPPING: Free-text fields are sanitized before storage
 *    (no raw HTML stored from untrusted widget submissions).
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q37-embed-cors-atomicity.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const EMBED_ROUTE = resolve(process.cwd(), 'app/api/embed/inquiry/route.ts')

test.describe('Q37: Embed widget CORS and atomicity', () => {
  // -------------------------------------------------------------------------
  // Test 1: CORS headers allow cross-origin requests
  // -------------------------------------------------------------------------
  test('embed inquiry route sets Access-Control-Allow-Origin for cross-origin widgets', () => {
    expect(existsSync(EMBED_ROUTE), 'app/api/embed/inquiry/route.ts must exist').toBe(true)

    const src = readFileSync(EMBED_ROUTE, 'utf-8')

    expect(
      src.includes('Access-Control-Allow-Origin'),
      'embed route must set Access-Control-Allow-Origin header (widgets live on third-party domains)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: OPTIONS (preflight) handler present
  // -------------------------------------------------------------------------
  test('embed inquiry route handles OPTIONS preflight requests', () => {
    const src = readFileSync(EMBED_ROUTE, 'utf-8')

    expect(
      src.includes('OPTIONS') || src.includes('options'),
      'embed route must handle OPTIONS preflight requests (required for CORS)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Rate limiting gate before DB writes
  // -------------------------------------------------------------------------
  test('embed route has IP-based rate limiting to prevent inquiry spam', () => {
    const src = readFileSync(EMBED_ROUTE, 'utf-8')

    expect(
      src.includes('rateLimit') ||
        src.includes('rate_limit') ||
        src.includes('rate limit') ||
        src.includes('submissions') ||
        (src.includes('ip') && src.includes('limit')),
      'embed route must rate-limit by IP to prevent spam (no auth = must self-defend)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: Honeypot field to catch basic bots
  // -------------------------------------------------------------------------
  test('embed route has a honeypot field to block bot submissions', () => {
    const src = readFileSync(EMBED_ROUTE, 'utf-8')

    expect(
      src.includes('honeypot') ||
        src.includes('website_url') ||
        src.includes('bot') ||
        src.includes('trap'),
      'embed route must have a honeypot field (catches bots without CAPTCHA friction)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Chef account status validated before accepting inquiry
  // -------------------------------------------------------------------------
  test('embed route validates chef account is active before accepting new inquiries', () => {
    const src = readFileSync(EMBED_ROUTE, 'utf-8')

    expect(
      src.includes('suspended') ||
        src.includes('deletion_scheduled') ||
        src.includes('account_status'),
      'embed route must check chef account status (suspended chefs must not receive new leads)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6: Free-text fields sanitized (no raw HTML stored)
  // -------------------------------------------------------------------------
  test('embed route strips HTML from free-text fields before storage', () => {
    const src = readFileSync(EMBED_ROUTE, 'utf-8')

    expect(
      src.includes('strip') ||
        src.includes('sanitize') ||
        src.includes('replace(/<') ||
        src.includes('stripHtml') ||
        src.includes('sanitizeHtml'),
      'embed route must strip HTML from free-text inputs before writing to DB (prevents XSS in chef dashboard)'
    ).toBe(true)
  })
})
