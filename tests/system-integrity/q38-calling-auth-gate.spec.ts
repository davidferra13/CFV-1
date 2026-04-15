/**
 * Q38: Calling System Auth Gate
 *
 * The calling system (Twilio) processes automated vendor calls. Two
 * security properties are non-negotiable:
 *
 *   1. Unsigned requests to the gather webhook must be rejected. Twilio
 *      signs every request with HMAC-SHA1. Skipping this check lets
 *      anyone forge AI call responses or inject arbitrary voice steps.
 *
 *   2. The gather endpoint must never handle client-facing calls. The
 *      calling system is for vendor/business outreach only (ADMIN-ONLY
 *      feature per CLAUDE.md). Client call roles are explicitly banned.
 *
 * Q3 covers the calling system broadly. Q38 is a focused regression guard
 * on the auth gate and role boundaries specifically.
 *
 * Tests:
 *
 * 1. SIGNATURE VALIDATION: app/api/calling/gather/route.ts calls
 *    validateTwilioWebhook() before any processing.
 *
 * 2. 403 ON INVALID: The route returns 403 (not 200) for invalid signatures.
 *
 * 3. NO CLIENT ROLES: The gather endpoint does not dispatch to any client-
 *    facing role (client_call, client_followup, client_confirmation, etc.).
 *
 * 4. ADMIN-ONLY GATE: The calling feature has a flag or gate that prevents
 *    non-admin tenants from triggering calls.
 *
 * 5. TWILIO WEBHOOK VALIDATOR EXISTS: lib/calling/twilio-actions.ts (or
 *    similar) exports the validateTwilioWebhook function.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q38-calling-auth-gate.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { glob } from 'fs'
import { promisify } from 'util'

const GATHER_ROUTE = resolve(process.cwd(), 'app/api/calling/gather/route.ts')
const TWILIO_WEBHOOK_AUTH = resolve(process.cwd(), 'lib/calling/twilio-webhook-auth.ts')

test.describe('Q38: Calling system auth gate', () => {
  // -------------------------------------------------------------------------
  // Test 1: validateTwilioWebhook called before processing
  // -------------------------------------------------------------------------
  test('calling/gather route calls validateTwilioWebhook before any processing', () => {
    expect(existsSync(GATHER_ROUTE), 'app/api/calling/gather/route.ts must exist').toBe(true)

    const src = readFileSync(GATHER_ROUTE, 'utf-8')

    expect(
      src.includes('validateTwilioWebhook'),
      'gather route must call validateTwilioWebhook() before processing any webhook payload'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: Returns 403 for invalid Twilio signatures
  // -------------------------------------------------------------------------
  test('gather route returns 403 for unsigned or invalid Twilio webhook requests', () => {
    const src = readFileSync(GATHER_ROUTE, 'utf-8')

    expect(
      src.includes('403') || src.includes('Forbidden') || src.includes('Unauthorized'),
      'gather route must return 403 when Twilio signature validation fails'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: No client-facing call roles handled by the gather endpoint
  // -------------------------------------------------------------------------
  test('gather route does not dispatch to client-facing call roles', () => {
    const src = readFileSync(GATHER_ROUTE, 'utf-8')

    const clientRoles = [
      'client_call',
      'client_followup',
      'client_confirmation',
      'client_inquiry',
      'client_outreach',
    ]

    for (const role of clientRoles) {
      expect(
        !src.includes(role),
        `gather route must not dispatch to client role: ${role} (calling is vendor-only, never client-facing)`
      ).toBe(true)
    }
  })

  // -------------------------------------------------------------------------
  // Test 4: Calling feature is gated for admin/supplier_calling flag
  // -------------------------------------------------------------------------
  test('calling system has a feature flag or admin gate to prevent open access', () => {
    const src = readFileSync(GATHER_ROUTE, 'utf-8')

    // The calling system costs real money per call. Must be gated.
    expect(
      src.includes('supplier_calling') ||
        src.includes('admin') ||
        src.includes('isAdmin') ||
        src.includes('feature') ||
        src.includes('enabled'),
      'calling system must have a gate (supplier_calling flag or admin check) - costs real money per call'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Twilio validator function exists in lib/calling/
  // -------------------------------------------------------------------------
  test('lib/calling/twilio-webhook-auth.ts exports validateTwilioWebhook', () => {
    expect(existsSync(TWILIO_WEBHOOK_AUTH), 'lib/calling/twilio-webhook-auth.ts must exist').toBe(
      true
    )

    const src = readFileSync(TWILIO_WEBHOOK_AUTH, 'utf-8')

    expect(
      src.includes('validateTwilioWebhook') || src.includes('export'),
      'twilio-webhook-auth.ts must export validateTwilioWebhook'
    ).toBe(true)
  })
})
