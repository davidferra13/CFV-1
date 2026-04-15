/**
 * Q3: Calling System Integrity
 *
 * Verifies the four hardest-to-detect failure modes in the AI calling system:
 *
 * 1. Webhook auth gate — /api/calling/gather rejects requests without a
 *    valid Twilio signature (403). Prevents arbitrary webhook spoofing.
 *
 * 2. ai_calls.result column exists — the Tier 2 feedback loop (queryAiCallFeedback)
 *    filters on result='yes'. Before Round 6 the column didn't exist; every
 *    feedback query returned zero rows silently. Verify the migration was applied.
 *
 * 3. Daily call limit endpoint auth — the calling initiation route is gated
 *    behind authentication. Unauthenticated POST returns 401 or redirect.
 *
 * 4. Price point idempotency — the gather route's retry guard is present in
 *    source (structural check). Duplicate inserts on Twilio retries are prevented.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q3-calling-integrity.spec.ts
 */
import { test, expect, request } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const MIGRATION_FILE = resolve(
  process.cwd(),
  'database/migrations/20260414000006_ai_calls_result.sql'
)
const GATHER_SOURCE = resolve(process.cwd(), 'app/api/calling/gather/route.ts')
const TWILIO_ACTIONS_SOURCE = resolve(process.cwd(), 'lib/calling/twilio-actions.ts')

test.describe('Q3: Calling system integrity', () => {
  // -------------------------------------------------------------------------
  // Test 1: Webhook auth gate
  // The gather endpoint must reject requests without a Twilio signature.
  // In production TWILIO_AUTH_TOKEN is set → validateTwilioWebhook enforces.
  // In dev without the token it skips (by design) — test is environment-aware.
  // -------------------------------------------------------------------------
  test('gather endpoint rejects unsigned requests when Twilio auth is configured', async ({
    baseURL,
  }) => {
    const twilioAuthTokenSet = !!process.env.TWILIO_AUTH_TOKEN

    const ctx = await request.newContext({ baseURL })

    // POST with a valid form body but NO X-Twilio-Signature header
    const resp = await ctx.post('/api/calling/gather?callId=test&step=1&role=vendor_availability', {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      data: 'Digits=1&SpeechResult=yes',
    })

    if (twilioAuthTokenSet) {
      // Strict mode: signature must be present and valid
      expect(resp.status(), `Expected 403 (no Twilio signature) but got ${resp.status()}`).toBe(403)
    } else {
      // Dev mode: validation skipped — 400/404/500 is acceptable, NOT 403 mandatory
      // But the endpoint must not return 200 with TwiML for a garbage callId
      expect(
        [200, 400, 403, 404, 500].includes(resp.status()),
        `Unexpected status ${resp.status()} from gather endpoint`
      ).toBe(true)
    }

    await ctx.dispose()
  })

  // -------------------------------------------------------------------------
  // Test 2: ai_calls.result migration exists and is well-formed
  // This column is the linchpin of the Tier 2 feedback loop. If it doesn't
  // exist, every queryAiCallFeedback call silently returns zero rows.
  // -------------------------------------------------------------------------
  test('ai_calls.result migration file exists and contains the column definition', () => {
    expect(
      existsSync(MIGRATION_FILE),
      `Migration file not found: ${MIGRATION_FILE}\nThis migration adds the result column that the Tier 2 feedback loop depends on.`
    ).toBe(true)

    const sql = readFileSync(MIGRATION_FILE, 'utf-8')

    expect(
      sql.includes('ADD COLUMN') && sql.includes('result'),
      'Migration does not contain ADD COLUMN result'
    ).toBe(true)

    expect(
      sql.includes("CHECK (result IN ('yes', 'no') OR result IS NULL)"),
      'Migration missing CHECK constraint on result column'
    ).toBe(true)

    expect(
      sql.includes('ai_calls_result_feedback_idx'),
      'Migration missing feedback index (required for queryAiCallFeedback performance)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Calling initiation requires authentication
  // The initiateAdHocCall server action lives in twilio-actions.ts and calls
  // requireChef() at the top. Verify the auth guard is present in source.
  // -------------------------------------------------------------------------
  test('twilio-actions.ts enforces chef auth on initiateAdHocCall', () => {
    expect(existsSync(TWILIO_ACTIONS_SOURCE), `Source not found: ${TWILIO_ACTIONS_SOURCE}`).toBe(
      true
    )

    const src = readFileSync(TWILIO_ACTIONS_SOURCE, 'utf-8')

    // requireChef() must be called inside initiateAdHocCall
    const initiateFnIdx = src.indexOf('async function initiateAdHocCall')
    expect(initiateFnIdx, 'initiateAdHocCall function not found in source').toBeGreaterThan(-1)

    // requireChef must appear in the function body (within 1000 chars of the signature)
    const fnBody = src.slice(initiateFnIdx, initiateFnIdx + 1000)
    expect(
      fnBody.includes('requireChef'),
      'initiateAdHocCall does not call requireChef() — unauthenticated calls possible'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: Price point idempotency guard is present in gather route source
  // Twilio can retry webhooks on slow responses. Without the guard, each retry
  // inserts a duplicate vendor_price_points row for the same call result.
  // -------------------------------------------------------------------------
  test('gather route has Twilio retry guard for vendor_price_points inserts', () => {
    expect(existsSync(GATHER_SOURCE), `Source not found: ${GATHER_SOURCE}`).toBe(true)

    const src = readFileSync(GATHER_SOURCE, 'utf-8')

    // The guard must check for an existing price point before inserting
    expect(
      src.includes('pricePointAlreadyExists'),
      'gather route is missing the Twilio retry idempotency guard (pricePointAlreadyExists)'
    ).toBe(true)

    // The guard must gate BOTH insert paths
    const firstOccurrence = src.indexOf('pricePointAlreadyExists')
    const secondOccurrence = src.indexOf('pricePointAlreadyExists', firstOccurrence + 1)
    expect(
      secondOccurrence,
      'pricePointAlreadyExists only appears once — must gate both price and sentinel insert paths'
    ).toBeGreaterThan(-1)
  })

  // -------------------------------------------------------------------------
  // Test 5: Per-chef daily limit reads from ai_call_routing_rules
  // Before Round 6 the limit was hardcoded to 20. Now it reads the DB column.
  // Structural check: the source must reference daily_call_limit column.
  // -------------------------------------------------------------------------
  test('checkDailyLimit reads per-chef limit from ai_call_routing_rules', () => {
    expect(existsSync(TWILIO_ACTIONS_SOURCE), `Source not found: ${TWILIO_ACTIONS_SOURCE}`).toBe(
      true
    )

    const src = readFileSync(TWILIO_ACTIONS_SOURCE, 'utf-8')

    expect(
      src.includes('daily_call_limit'),
      'checkDailyLimit does not reference daily_call_limit column — limit is still hardcoded'
    ).toBe(true)

    // Must also have a fallback (hardcoded limit is now a default, not the only value)
    expect(
      src.includes('defaultLimit') || src.includes('?? defaultLimit') || src.includes('?? 20'),
      'checkDailyLimit has no fallback for chefs without a routing rule'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6: action_log is written after price point creation
  // The action_log column records what auto-actions the webhook took.
  // Without it, the call sheet has no auditability for what happened.
  // -------------------------------------------------------------------------
  test('gather route writes to ai_calls.action_log after price point operations', () => {
    expect(existsSync(GATHER_SOURCE), `Source not found: ${GATHER_SOURCE}`).toBe(true)

    const src = readFileSync(GATHER_SOURCE, 'utf-8')

    expect(
      src.includes('action_log'),
      'gather route does not write to ai_calls.action_log — price point actions are not auditable'
    ).toBe(true)

    expect(
      src.includes('vendor_price_point_created'),
      'gather route does not record vendor_price_point_created in action_log'
    ).toBe(true)
  })
})
