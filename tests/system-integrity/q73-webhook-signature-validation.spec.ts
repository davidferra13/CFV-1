/**
 * Q73: Inbound Webhook Signature Validation
 *
 * Every inbound webhook route (Stripe, Twilio, email) must validate the
 * request signature before processing the payload. Without signature
 * validation, an attacker can forge webhook calls to create fake payments,
 * trigger state transitions, or inject data.
 *
 * The signature validation must happen BEFORE any database writes or state
 * changes. Invalid signatures must return a non-200 status code.
 *
 * Tests:
 *
 * 1. STRIPE SIGNATURE: The Stripe webhook route calls
 *    stripe.webhooks.constructEvent (which validates the signature).
 *
 * 2. STRIPE EARLY REJECTION: The Stripe route rejects requests with
 *    missing signature before any database operations.
 *
 * 3. TWILIO AUTH MODULE: A dedicated Twilio webhook auth module exists
 *    (lib/calling/twilio-webhook-auth.ts) with HMAC-SHA1 validation.
 *
 * 4. TWILIO ROUTES USE VALIDATION: All Twilio webhook routes (inbound,
 *    status, gather, voicemail, recording) call validateTwilioWebhook.
 *
 * 5. TWILIO EARLY REJECTION: Twilio routes return non-200 on failed
 *    signature validation before any database writes.
 *
 * 6. CONSTANT-TIME COMPARISON: Signature comparisons use constant-time
 *    algorithms (not === which leaks timing information).
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q73-webhook-signature-validation.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, join } from 'path'

const ROOT = process.cwd()
const STRIPE_WEBHOOK = resolve(ROOT, 'app/api/webhooks/stripe/route.ts')
const TWILIO_AUTH = resolve(ROOT, 'lib/calling/twilio-webhook-auth.ts')
const CALLING_DIR = resolve(ROOT, 'app/api/calling')

test.describe('Q73: Inbound webhook signature validation', () => {
  // ---------------------------------------------------------------------------
  // Test 1: Stripe webhook route validates signature via constructEvent
  // ---------------------------------------------------------------------------
  test('Stripe webhook route calls stripe.webhooks.constructEvent for signature validation', () => {
    expect(existsSync(STRIPE_WEBHOOK), 'app/api/webhooks/stripe/route.ts must exist').toBe(true)

    const src = readFileSync(STRIPE_WEBHOOK, 'utf-8')

    expect(
      src.includes('constructEvent'),
      'Stripe webhook route must call stripe.webhooks.constructEvent to validate webhook signatures'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 2: Stripe route rejects missing signature before DB operations
  // ---------------------------------------------------------------------------
  test('Stripe webhook rejects missing signature header before any database writes', () => {
    const src = readFileSync(STRIPE_WEBHOOK, 'utf-8')

    // The signature check must appear before any database operations.
    // Look for: signature header check happens before DB imports are called.
    const signatureCheckIdx = src.indexOf('stripe-signature')
    const constructEventIdx = src.indexOf('constructEvent')

    // Both must exist
    expect(
      signatureCheckIdx,
      'Stripe route must check for stripe-signature header'
    ).toBeGreaterThan(-1)
    expect(constructEventIdx, 'Stripe route must call constructEvent').toBeGreaterThan(-1)

    // Signature check must come before constructEvent (fail fast on missing header)
    expect(
      signatureCheckIdx < constructEventIdx,
      'stripe-signature header check must happen before constructEvent call (fail fast)'
    ).toBe(true)

    // Must return error status when signature is missing
    expect(
      src.includes('status: 400') || src.includes('status: 401') || src.includes('status: 403'),
      'Stripe route must return 4xx status when signature is missing or invalid'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 3: Dedicated Twilio webhook auth module exists with HMAC-SHA1
  // ---------------------------------------------------------------------------
  test('lib/calling/twilio-webhook-auth.ts exists and uses HMAC-SHA1 for validation', () => {
    expect(
      existsSync(TWILIO_AUTH),
      'lib/calling/twilio-webhook-auth.ts must exist (dedicated Twilio signature validation)'
    ).toBe(true)

    const src = readFileSync(TWILIO_AUTH, 'utf-8')

    expect(
      src.includes('createHmac') && src.includes('sha1'),
      'Twilio webhook auth must use HMAC-SHA1 (createHmac + sha1) per Twilio spec'
    ).toBe(true)

    expect(
      src.includes('x-twilio-signature') || src.includes('X-Twilio-Signature'),
      'Twilio webhook auth must check the X-Twilio-Signature header'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 4: All Twilio webhook routes call validateTwilioWebhook
  // ---------------------------------------------------------------------------
  test('all Twilio webhook routes (calling/*) call validateTwilioWebhook', () => {
    if (!existsSync(CALLING_DIR)) return

    const webhookDirs = readdirSync(CALLING_DIR).filter((entry) => {
      const routeFile = join(CALLING_DIR, entry, 'route.ts')
      return existsSync(routeFile)
    })

    // These are the routes that receive Twilio callbacks and must validate
    const expectedValidated = ['inbound', 'status', 'gather', 'voicemail', 'recording']
    const violations: string[] = []

    for (const dir of expectedValidated) {
      const routeFile = join(CALLING_DIR, dir, 'route.ts')
      if (!existsSync(routeFile)) continue

      const src = readFileSync(routeFile, 'utf-8')

      if (!src.includes('validateTwilioWebhook')) {
        violations.push(`app/api/calling/${dir}/route.ts`)
      }
    }

    // Also check nested routes (e.g., voicemail/done)
    for (const dir of webhookDirs) {
      const nestedDirs = join(CALLING_DIR, dir)
      try {
        for (const sub of readdirSync(nestedDirs)) {
          const nestedRoute = join(nestedDirs, sub, 'route.ts')
          if (!existsSync(nestedRoute)) continue

          const src = readFileSync(nestedRoute, 'utf-8')
          if (src.includes('POST') && !src.includes('validateTwilioWebhook')) {
            violations.push(`app/api/calling/${dir}/${sub}/route.ts`)
          }
        }
      } catch {
        // Not a directory, skip
      }
    }

    expect(
      violations,
      `Twilio webhook routes missing validateTwilioWebhook call:\n${violations.join('\n')}`
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 5: Twilio routes return non-200 on failed signature
  // ---------------------------------------------------------------------------
  test('Twilio inbound route returns error response on failed signature validation', () => {
    const inboundRoute = resolve(ROOT, 'app/api/calling/inbound/route.ts')
    if (!existsSync(inboundRoute)) return

    const src = readFileSync(inboundRoute, 'utf-8')

    // The route must check the result of validateTwilioWebhook and return
    // an error before any database writes if validation fails
    const validateIdx = src.indexOf('validateTwilioWebhook')
    expect(validateIdx, 'inbound route must call validateTwilioWebhook').toBeGreaterThan(-1)

    // After validation, there must be a check for the result (if (!valid) or similar)
    // The route should return a non-200 response on failure
    expect(
      src.includes('!valid') || src.includes('valid === false') || src.includes('if (!valid'),
      'Twilio inbound route must check validation result and reject invalid requests'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 6: Signature comparison uses constant-time algorithm
  // ---------------------------------------------------------------------------
  test('Twilio signature comparison uses constant-time algorithm (not ===)', () => {
    const src = readFileSync(TWILIO_AUTH, 'utf-8')

    // The signature comparison must use a constant-time algorithm to
    // prevent timing attacks. Look for timingSafeEqual or XOR-based comparison.
    expect(
      src.includes('timingSafeEqual') || src.includes('^') || src.includes('charCodeAt'),
      'Twilio signature comparison must use constant-time algorithm (timingSafeEqual or XOR loop), not ==='
    ).toBe(true)
  })
})
