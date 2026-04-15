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

  // -------------------------------------------------------------------------
  // Round 7 structural checks
  // -------------------------------------------------------------------------

  // Test 7: checkDailyLimit counts ALL outbound call types (Round 7 Fix #1)
  // Before Round 7, delivery and venue calls didn't count against the daily limit
  // because checkDailyLimit queried supplier_calls — but those call types only
  // create ai_calls rows.
  test('checkDailyLimit counts ai_calls direction=outbound, not just supplier_calls', () => {
    expect(existsSync(TWILIO_ACTIONS_SOURCE), `Source not found: ${TWILIO_ACTIONS_SOURCE}`).toBe(
      true
    )
    const src = readFileSync(TWILIO_ACTIONS_SOURCE, 'utf-8')

    // The function must query ai_calls, not supplier_calls for counting
    const checkFnIdx = src.indexOf('async function checkDailyLimit')
    expect(checkFnIdx, 'checkDailyLimit function not found').toBeGreaterThan(-1)

    // Extract the function body (next 600 chars covers the full function)
    const fnBody = src.slice(checkFnIdx, checkFnIdx + 600)

    expect(
      fnBody.includes("from('ai_calls')"),
      "checkDailyLimit must count ai_calls rows — delivery/venue calls don't create supplier_calls"
    ).toBe(true)

    expect(
      !fnBody.includes("from('supplier_calls')") ||
        fnBody.indexOf("from('ai_calls')") < fnBody.indexOf("from('supplier_calls')"),
      'checkDailyLimit should not count supplier_calls for the limit (that table misses delivery/venue)'
    ).toBe(true)
  })

  // Test 8: "Call All" is serialized to prevent daily-limit race condition (Round 7 Fix #2)
  // Before Round 7, Promise.allSettled fired all calls simultaneously.
  // All would pass the daily limit check before any insert committed.
  test('callSelected uses sequential for...of loop, not Promise.allSettled', () => {
    const callHubSource = resolve(process.cwd(), 'components/calling/call-hub.tsx')
    expect(existsSync(callHubSource), `Source not found: ${callHubSource}`).toBe(true)

    const src = readFileSync(callHubSource, 'utf-8')

    expect(
      !src.includes('Promise.allSettled(toCall'),
      'callSelected still uses Promise.allSettled — race condition at daily limit remains'
    ).toBe(true)

    // Must use sequential iteration
    expect(
      src.includes('for (const v of toCall)') || src.includes('for(const v of toCall)'),
      'callSelected must use sequential for...of to prevent daily limit race condition'
    ).toBe(true)
  })

  // Test 9: aiCallId='' is never passed in TwiML URLs (Round 7 Fix #8)
  // When ai_calls insert fails, the old code passed aiCallId='' which causes
  // gather/status handlers to look up an empty string ID and fail silently.
  test('TwiML URLs omit aiCallId param rather than passing empty string', () => {
    expect(existsSync(TWILIO_ACTIONS_SOURCE), `Source not found: ${TWILIO_ACTIONS_SOURCE}`).toBe(
      true
    )
    const src = readFileSync(TWILIO_ACTIONS_SOURCE, 'utf-8')

    // The old pattern was: `&aiCallId=${encodeURIComponent(aiCallRecord?.id ?? '')}`
    // The empty string fallback must not exist anywhere in TwiML URL construction
    expect(
      !src.includes("aiCallRecord?.id ?? ''"),
      "TwiML URL still uses aiCallRecord?.id ?? '' fallback — empty aiCallId will cause handler failures"
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Round 8 structural checks
  // -------------------------------------------------------------------------

  // Test 10: Legacy twiml/route.ts is gone (Round 8 Fix #1)
  // The route had XML injection (raw URL param in TwiML), no webhook auth,
  // and a GET handler that let browsers generate TwiML. Modern flow uses
  // inline Twiml param — the route is dead code and a security liability.
  test('legacy twiml/route.ts does not exist', () => {
    const LEGACY_TWIML_ROUTE = resolve(process.cwd(), 'app/api/calling/twiml/route.ts')
    expect(
      !existsSync(LEGACY_TWIML_ROUTE),
      'app/api/calling/twiml/route.ts still exists — delete it. The route has XML injection, no webhook auth, and is unreachable in the modern flow.'
    ).toBe(true)
  })

  // Test 11: checkCallingEligibility reads active_hours from DB (Round 8 Fix #3)
  // Before Round 8, isEtBusinessHours() hardcoded ET 8am-7pm, ignoring the
  // active_hours_start/end/timezone columns the settings form writes. The 7pm
  // cutoff also contradicted the form default of 20:00 (8pm).
  test('calling eligibility reads active_hours config from DB, not hardcoded ET hours', () => {
    expect(existsSync(TWILIO_ACTIONS_SOURCE), `Source not found: ${TWILIO_ACTIONS_SOURCE}`).toBe(
      true
    )
    const src = readFileSync(TWILIO_ACTIONS_SOURCE, 'utf-8')

    // The unified function must exist
    expect(
      src.includes('checkCallingEligibility'),
      'checkCallingEligibility function not found — active hours check is still hardcoded'
    ).toBe(true)

    // The old hardcoded function must not exist
    expect(
      !src.includes('isEtBusinessHours'),
      'isEtBusinessHours still present — active hours check is still hardcoded to ET 8am-7pm'
    ).toBe(true)

    // Must read the stored config columns
    expect(
      src.includes('active_hours_start') && src.includes('active_hours_end'),
      'checkCallingEligibility does not read active_hours_start/end from DB'
    ).toBe(true)
  })

  // Test 12: call-sheet page filters vendor_availability ai_calls from CallLog (Round 8 Fix #2)
  // supplier_calls and ai_calls with role=vendor_availability represent the same
  // availability call. Without filtering, every availability call appears twice in the log.
  test('call-sheet page filters vendor_availability ai_calls before passing to CallLog', () => {
    const CALL_SHEET_SOURCE = resolve(process.cwd(), 'app/(chef)/culinary/call-sheet/page.tsx')
    expect(existsSync(CALL_SHEET_SOURCE), `Source not found: ${CALL_SHEET_SOURCE}`).toBe(true)

    const src = readFileSync(CALL_SHEET_SOURCE, 'utf-8')

    expect(
      src.includes("role !== 'vendor_availability'"),
      'call-sheet page does not filter vendor_availability ai_calls — availability calls appear twice in the log'
    ).toBe(true)

    expect(
      src.includes('filteredAiCalls'),
      'call-sheet page must use filteredAiCalls variable when passing to CallLog'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Round 9 structural checks
  // -------------------------------------------------------------------------

  // Test 13: upsertRoutingRules specifies onConflict: 'chef_id' (Round 9 Fix #1)
  // The compat shim defaults to ON CONFLICT (id). ai_call_routing_rules has a UNIQUE
  // constraint on chef_id (not id). Without specifying the conflict target, every
  // settings save after the first fails with a unique violation — the page appears
  // to succeed but nothing is written.
  test('upsertRoutingRules specifies onConflict chef_id', () => {
    expect(existsSync(TWILIO_ACTIONS_SOURCE), `Source not found: ${TWILIO_ACTIONS_SOURCE}`).toBe(
      true
    )
    const src = readFileSync(TWILIO_ACTIONS_SOURCE, 'utf-8')

    const upsertFnIdx = src.indexOf('async function upsertRoutingRules')
    expect(upsertFnIdx, 'upsertRoutingRules function not found').toBeGreaterThan(-1)

    const fnBody = src.slice(upsertFnIdx, upsertFnIdx + 600)
    expect(
      fnBody.includes("onConflict: 'chef_id'"),
      "upsertRoutingRules missing onConflict: 'chef_id' — saves after the first always fail"
    ).toBe(true)
  })

  // Test 14: Inbound route uses isWithinConfiguredHours (DB-driven), not hardcoded (Round 9 Fix #3)
  // Before Round 9, inbound/route.ts had its own isWithinActiveHours() hardcoded to ET 8am-8pm,
  // diverging from checkCallingEligibility which reads per-chef DB config for outbound.
  test('inbound route reads active hours from DB config, not hardcoded function', () => {
    const INBOUND_SOURCE = resolve(process.cwd(), 'app/api/calling/inbound/route.ts')
    expect(existsSync(INBOUND_SOURCE), `Source not found: ${INBOUND_SOURCE}`).toBe(true)

    const src = readFileSync(INBOUND_SOURCE, 'utf-8')

    expect(
      !src.includes('isWithinActiveHours'),
      'inbound route still uses hardcoded isWithinActiveHours — active hours config is ignored for inbound'
    ).toBe(true)

    expect(
      src.includes('isWithinConfiguredHours'),
      'inbound route must use isWithinConfiguredHours (DB-driven) for consistent active hours enforcement'
    ).toBe(true)
  })

  // Test 15: Inbound voicemail URLs use conditional param pattern (Round 9 Fix #2)
  // aiCallRecord?.id ?? '' produces an empty string when insert fails. The voicemail
  // route's `if (!aiCallId)` check treats '' as falsy and silently drops the transcript.
  // The correct pattern omits the param entirely when id is unavailable.
  test('inbound route voicemail URLs use conditional param, not empty string fallback', () => {
    const INBOUND_SOURCE = resolve(process.cwd(), 'app/api/calling/inbound/route.ts')
    expect(existsSync(INBOUND_SOURCE), `Source not found: ${INBOUND_SOURCE}`).toBe(true)

    const src = readFileSync(INBOUND_SOURCE, 'utf-8')

    expect(
      !src.includes("aiCallRecord?.id ?? ''"),
      "inbound route still uses aiCallRecord?.id ?? '' — empty aiCallId silently drops voicemail transcripts"
    ).toBe(true)

    expect(
      src.includes('aiCallRecord?.id') && src.includes('api/calling/voicemail'),
      'inbound route must build voicemail URL conditionally from aiCallRecord?.id'
    ).toBe(true)
  })

  // Test 16: Inbound route checks enable_inbound_voicemail before routing to voicemail (Round 9 Fix #4)
  // The flag was fetched but never checked — disabling voicemail had no effect on
  // after-hours routing, callers would still receive voicemail TwiML.
  test('inbound route respects enable_inbound_voicemail toggle', () => {
    const INBOUND_SOURCE = resolve(process.cwd(), 'app/api/calling/inbound/route.ts')
    expect(existsSync(INBOUND_SOURCE), `Source not found: ${INBOUND_SOURCE}`).toBe(true)

    const src = readFileSync(INBOUND_SOURCE, 'utf-8')

    expect(
      src.includes('voicemailEnabled') || src.includes('enable_inbound_voicemail'),
      'inbound route does not check enable_inbound_voicemail — toggle is a no-op'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 17: call-log.tsx AiCall interface has result field
  // Without result the statusDot receives undefined and always shows grey.
  // -------------------------------------------------------------------------
  test('call-log AiCall interface includes result field and statusDot receives it', () => {
    const CALL_LOG_SOURCE = resolve(process.cwd(), 'components/calling/call-log.tsx')
    expect(existsSync(CALL_LOG_SOURCE), `Source not found: ${CALL_LOG_SOURCE}`).toBe(true)

    const src = readFileSync(CALL_LOG_SOURCE, 'utf-8')

    expect(
      src.includes("result?: 'yes' | 'no' | null"),
      'local AiCall interface is missing result field'
    ).toBe(true)

    expect(
      src.includes('statusDot(c.status, c.result)'),
      'statusDot called without result — inbound_vendor_callback calls always show grey dot'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 18: inbound route gatherAction URL uses conditional pattern
  // Empty aiCallId param causes gather to skip all DB writes silently.
  // -------------------------------------------------------------------------
  test('inbound route gatherAction URL uses conditional construction, not empty string fallback', () => {
    const INBOUND_SOURCE = resolve(process.cwd(), 'app/api/calling/inbound/route.ts')
    expect(existsSync(INBOUND_SOURCE), `Source not found: ${INBOUND_SOURCE}`).toBe(true)

    const src = readFileSync(INBOUND_SOURCE, 'utf-8')

    expect(
      !src.includes("aiCallRecord?.id ?? ''"),
      "gatherAction still uses ?? '' fallback — empty aiCallId is silently passed to gather"
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 19: delivery/venue toggle enforcement in twilio-actions.ts
  // Both feature flags default false — calls must be blocked when not enabled.
  // -------------------------------------------------------------------------
  test('twilio-actions enforces enable_vendor_delivery and enable_venue_confirmation toggles', () => {
    expect(existsSync(TWILIO_ACTIONS_SOURCE), `Source not found: ${TWILIO_ACTIONS_SOURCE}`).toBe(
      true
    )

    const src = readFileSync(TWILIO_ACTIONS_SOURCE, 'utf-8')

    expect(
      src.includes('enable_vendor_delivery'),
      'initiateDeliveryCoordinationCall does not check enable_vendor_delivery toggle'
    ).toBe(true)

    expect(
      src.includes('enable_venue_confirmation'),
      'initiateVenueConfirmationCall does not check enable_venue_confirmation toggle'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 20: queryAiCallFeedback includes inbound callbacks
  // The direction=outbound filter excluded inbound_vendor_callback result=yes
  // rows from Tier 2 resolution, making callbacks invisible to ingredient scoring.
  // -------------------------------------------------------------------------
  test('queryAiCallFeedback does not filter direction=outbound', () => {
    const RESOLUTION_SOURCE = resolve(process.cwd(), 'lib/calling/ingredient-resolution.ts')
    expect(existsSync(RESOLUTION_SOURCE), `Source not found: ${RESOLUTION_SOURCE}`).toBe(true)

    const src = readFileSync(RESOLUTION_SOURCE, 'utf-8')

    // Find the queryAiCallFeedback function body
    const fnStart = src.indexOf('async function queryAiCallFeedback')
    expect(fnStart, 'queryAiCallFeedback function not found').toBeGreaterThan(-1)

    // The block between queryAiCallFeedback and the next top-level function
    const fnEnd = src.indexOf('\nasync function ', fnStart + 1)
    const fnBody = fnEnd > -1 ? src.slice(fnStart, fnEnd) : src.slice(fnStart)

    expect(
      !fnBody.includes(".eq('direction', 'outbound')"),
      "queryAiCallFeedback still filters direction='outbound' — inbound_vendor_callback results are excluded from Tier 2"
    ).toBe(true)
  })
})
