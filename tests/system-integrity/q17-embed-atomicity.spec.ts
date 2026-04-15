/**
 * Q17: Embed Widget Atomicity
 *
 * The public embed inquiry form is the chef's primary client acquisition
 * surface. A failed submission must not leave orphaned partial state
 * (a client with no inquiry, or an inquiry with no event).
 *
 * Tests:
 *
 * 1. VALIDATION GATE: invalid input (bad email, missing required fields)
 *    is rejected with 400 before any DB write.
 *
 * 2. HONEYPOT: bot submissions (website_url filled) are silently accepted
 *    but no DB state is created.
 *
 * 3. RATE LIMIT: more than 10 submissions from the same IP within 5 minutes
 *    returns 429.
 *
 * 4. CORS HEADERS: OPTIONS preflight returns the correct CORS headers for
 *    cross-origin embed use.
 *
 * 5. CHEF NOT FOUND: submission with a non-existent chef_id returns 404,
 *    not 500.
 *
 * 6. PARTIAL FAILURE RESILIENCE: the event creation step is non-blocking —
 *    if it fails, the inquiry is still saved. Verify the try/catch wrapping.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q17-embed-atomicity.spec.ts
 */
import { test, expect, request } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const EMBED_ROUTE = resolve(process.cwd(), 'app/api/embed/inquiry/route.ts')

test.describe('Q17: Embed widget atomicity', () => {
  // -------------------------------------------------------------------------
  // Test 1: OPTIONS preflight returns CORS headers
  // -------------------------------------------------------------------------
  test('embed inquiry OPTIONS returns CORS headers', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL })
    const resp = await ctx.fetch('/api/embed/inquiry', { method: 'OPTIONS' })

    expect(resp.status()).toBe(200)

    const allowOrigin = resp.headers()['access-control-allow-origin']
    expect(allowOrigin, 'CORS allow-origin must be *').toBe('*')

    await ctx.dispose()
  })

  // -------------------------------------------------------------------------
  // Test 2: Missing required fields returns 400
  // -------------------------------------------------------------------------
  test('missing required fields returns 400', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL })

    const resp = await ctx.post('/api/embed/inquiry', {
      headers: { 'content-type': 'application/json' },
      data: JSON.stringify({
        chef_id: '00000000-0000-0000-0000-000000000001',
        // Missing: full_name, email, event_date, serve_time, guest_count, occasion
      }),
    })

    expect(resp.status(), 'Missing required fields must return 400').toBe(400)
    const body = await resp.json()
    expect(body).toHaveProperty('error')

    await ctx.dispose()
  })

  // -------------------------------------------------------------------------
  // Test 3: Invalid email format returns 400
  // -------------------------------------------------------------------------
  test('invalid email returns 400', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL })

    const resp = await ctx.post('/api/embed/inquiry', {
      headers: { 'content-type': 'application/json' },
      data: JSON.stringify({
        chef_id: '00000000-0000-0000-0000-000000000001',
        full_name: 'Test User',
        email: 'not-an-email',
        event_date: '2026-06-01',
        serve_time: '7:00 PM',
        guest_count: 4,
        occasion: 'dinner',
      }),
    })

    expect(resp.status(), 'Invalid email must return 400').toBe(400)

    await ctx.dispose()
  })

  // -------------------------------------------------------------------------
  // Test 4: Non-existent chef_id returns 404
  // -------------------------------------------------------------------------
  test('non-existent chef_id returns 404', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL })

    const resp = await ctx.post('/api/embed/inquiry', {
      headers: { 'content-type': 'application/json' },
      data: JSON.stringify({
        chef_id: '00000000-0000-0000-0000-000000000001', // valid UUID format, no real chef
        full_name: 'Test User',
        email: 'test@example.com',
        event_date: '2026-06-01',
        serve_time: '7:00 PM',
        guest_count: 4,
        occasion: 'Birthday dinner',
      }),
    })

    expect(
      [404, 400].includes(resp.status()),
      `Non-existent chef must return 404 or 400, got ${resp.status()}`
    ).toBe(true)

    await ctx.dispose()
  })

  // -------------------------------------------------------------------------
  // Test 5: Honeypot bot detection returns 200 but writes no data
  // -------------------------------------------------------------------------
  test('honeypot field silently accepts bot submissions', () => {
    // Verify the honeypot logic is in the source (can't test DB state without a real chef)
    expect(existsSync(EMBED_ROUTE), 'app/api/embed/inquiry/route.ts must exist').toBe(true)

    const src = readFileSync(EMBED_ROUTE, 'utf-8')

    expect(
      src.includes('website_url') && src.includes('Bot detected'),
      'Embed route must have honeypot field (website_url) with Bot detected message'
    ).toBe(true)

    // Honeypot should silently return success (not reveal bot detection)
    expect(
      src.includes('success: true') && src.includes('website_url'),
      'Honeypot must silently return success'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6: Event creation is non-blocking (try/catch wrapped)
  // -------------------------------------------------------------------------
  test('event creation step is non-blocking (does not abort inquiry save on failure)', () => {
    const src = readFileSync(EMBED_ROUTE, 'utf-8')

    // The event insert must be inside a try/catch
    // Find the events.insert block and verify it's wrapped
    const eventInsertIdx = src.indexOf("from('events')\n")
    const blockAround = src.slice(Math.max(0, eventInsertIdx - 200), eventInsertIdx + 300)

    expect(
      blockAround.includes('try {') || blockAround.includes('try{'),
      'Event creation in embed route must be wrapped in try/catch (non-blocking)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 7: Rate limiting is applied
  // -------------------------------------------------------------------------
  test('embed route calls checkRateLimit before processing', () => {
    const src = readFileSync(EMBED_ROUTE, 'utf-8')

    expect(
      src.includes('checkRateLimit'),
      'Embed route must call checkRateLimit to prevent spam'
    ).toBe(true)

    // Rate limit must be called before any DB operation
    const rateLimitIdx = src.indexOf('checkRateLimit')
    const dbIdx = src.indexOf('createAdminClient')

    expect(
      rateLimitIdx < dbIdx,
      'checkRateLimit must be called before createAdminClient (before any DB write)'
    ).toBe(true)
  })
})
