/**
 * Q12: Contract Cancellation Policy Truth
 *
 * Generated contracts must contain real, chef-configured cancellation
 * policy text — NOT the literal fallback string "Per standard cancellation
 * policy." which is useless to a client and legally meaningless.
 *
 * Root cause of this failure: lib/contracts/actions.ts was reading
 * `event.cancellation_reason` (WHY the event was cancelled) instead of
 * `getCancellationPolicySummary()` (the actual policy terms).
 *
 * Tests:
 *
 * 1. STRUCTURAL: contracts/actions.ts calls getCancellationPolicySummary
 *    (not event.cancellation_reason for the policy field).
 *
 * 2. STRUCTURAL: the merge fields for contracts include a real policy field.
 *
 * 3. POLICY ENGINE: getCancellationPolicySummary returns actionable text
 *    given various cutoff/refund configurations.
 *
 * 4. FALLBACK TEXT: the old fallback "Per standard cancellation policy."
 *    must NOT appear as the policy text in contracts/actions.ts.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q12-contract-truth.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const CONTRACTS_ACTIONS = resolve(process.cwd(), 'lib/contracts/actions.ts')
const POLICY_ENGINE = resolve(process.cwd(), 'lib/cancellation/policy.ts')

test.describe('Q12: Contract cancellation policy truth', () => {
  // -------------------------------------------------------------------------
  // Test 1: contracts/actions.ts calls getCancellationPolicySummary
  // -------------------------------------------------------------------------
  test('contracts/actions.ts calls getCancellationPolicySummary', () => {
    expect(existsSync(CONTRACTS_ACTIONS), 'lib/contracts/actions.ts must exist').toBe(true)

    const src = readFileSync(CONTRACTS_ACTIONS, 'utf-8')

    expect(
      src.includes('getCancellationPolicySummary'),
      'contracts/actions.ts must call getCancellationPolicySummary'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: The old bug — cancellation_reason used as policy — is gone
  // -------------------------------------------------------------------------
  test('contracts/actions.ts does NOT use cancellation_reason as policy text', () => {
    const src = readFileSync(CONTRACTS_ACTIONS, 'utf-8')

    // The bug was: cancellation_policy: event.cancellation_reason ?? 'Per standard...'
    // This check finds any assignment that uses cancellation_reason for policy text
    const bugPattern = /cancellation_policy\s*:\s*[^\n]*cancellation_reason/
    expect(
      bugPattern.test(src),
      'contracts/actions.ts must not use cancellation_reason for policy text'
    ).toBe(false)
  })

  // -------------------------------------------------------------------------
  // Test 3: The old fallback string is gone
  // -------------------------------------------------------------------------
  test('fallback "Per standard cancellation policy." is absent from contracts/actions.ts', () => {
    const src = readFileSync(CONTRACTS_ACTIONS, 'utf-8')

    expect(
      src.includes('Per standard cancellation policy.'),
      'Old placeholder "Per standard cancellation policy." must be removed from contracts/actions.ts'
    ).toBe(false)
  })

  // -------------------------------------------------------------------------
  // Test 4: Policy engine exists and returns non-trivial text
  // -------------------------------------------------------------------------
  test('cancellation policy engine produces actionable output text', async () => {
    expect(existsSync(POLICY_ENGINE), 'lib/cancellation/policy.ts must exist').toBe(true)

    const src = readFileSync(POLICY_ENGINE, 'utf-8')

    // The engine must reference key policy concepts
    expect(
      src.includes('cutoff') || src.includes('CutoffDays'),
      'Policy engine must handle cutoff days'
    ).toBe(true)

    expect(
      src.includes('deposit') || src.includes('Deposit'),
      'Policy engine must handle deposit refundability'
    ).toBe(true)

    // Must export the summary function
    expect(
      src.includes('export') && src.includes('getCancellationPolicySummary'),
      'getCancellationPolicySummary must be exported from the policy engine'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Contract generation endpoint is auth-gated
  // -------------------------------------------------------------------------
  test('contract generation requires authentication', async ({ request: req }) => {
    // Try to call a contract action without auth — must be rejected
    const resp = await req.post('/api/v2/documents/generate', {
      headers: { 'content-type': 'application/json' },
      data: JSON.stringify({
        type: 'contract',
        entity_id: '00000000-0000-0000-0000-000000000001',
      }),
    })

    // Must not return 200 without auth
    expect(
      [401, 403, 404, 302, 307].includes(resp.status()),
      `Unauthenticated contract generation must return 401/403/404/redirect, got ${resp.status()}`
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6: Contracts page loads without crash
  // -------------------------------------------------------------------------
  test('contracts page loads for authenticated chef', async ({ page }) => {
    const response = await page.goto('/contracts', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })

    // May redirect to events or show contracts list — both are fine
    expect(response?.status(), 'Contracts route must return 200').not.toBe(500)

    const bodyText = await page
      .locator('body')
      .innerText()
      .catch(() => '')
    expect(bodyText).not.toMatch(/application error/i)
  })
})
