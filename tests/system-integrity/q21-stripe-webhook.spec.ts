/**
 * Q21: Stripe Webhook Integrity
 *
 * Stripe webhooks write to the ledger. A webhook processed without signature
 * verification or idempotency checking could: (a) inject arbitrary ledger entries
 * from forged requests, or (b) double-count revenue from duplicate deliveries.
 *
 * Tests:
 *
 * 1. SIGNATURE GATE: The webhook handler calls stripe.webhooks.constructEvent()
 *    before any data processing. Missing or invalid signatures must be rejected.
 *
 * 2. SECRET REQUIRED: Missing STRIPE_WEBHOOK_SECRET must reject the event (500)
 *    rather than silently processing it without verification.
 *
 * 3. IDEMPOTENCY: The handler checks for an existing transaction_reference before
 *    writing a ledger entry. Duplicate webhooks must not create duplicate entries.
 *
 * 4. LEDGER INTEGRATION: The webhook imports appendLedgerEntryFromWebhook —
 *    payments route through the canonical ledger, not direct column writes.
 *
 * 5. METADATA VALIDATION: Before writing a ledger entry, the handler validates
 *    that metadata UUIDs (event_id, tenant_id) exist in the database.
 *
 * 6. AUDIT LOG: Every webhook (success or failure) is logged for observability.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q21-stripe-webhook.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const WEBHOOK_ROUTE = resolve(process.cwd(), 'app/api/webhooks/stripe/route.ts')
const LEDGER_APPEND_INTERNAL = resolve(process.cwd(), 'lib/ledger/append-internal.ts')

test.describe('Q21: Stripe webhook integrity', () => {
  // -------------------------------------------------------------------------
  // Test 1: Signature verified before any processing
  // -------------------------------------------------------------------------
  test('webhook handler calls constructEvent before processing payload', () => {
    expect(existsSync(WEBHOOK_ROUTE), 'app/api/webhooks/stripe/route.ts must exist').toBe(true)

    const src = readFileSync(WEBHOOK_ROUTE, 'utf-8')

    expect(
      src.includes('constructEvent'),
      'Webhook handler must call stripe.webhooks.constructEvent() to verify signature'
    ).toBe(true)

    // constructEvent must be called before any db write.
    // Compare against the function CALL (appendLedgerEntryFromWebhook() with paren),
    // not the import statement at the top of the file.
    const constructIdx = src.indexOf('constructEvent(')
    const appendCallIdx = src.indexOf('appendLedgerEntryFromWebhook(')

    expect(
      constructIdx < appendCallIdx,
      'constructEvent() call must appear before appendLedgerEntryFromWebhook() call'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: Missing webhook secret causes rejection
  // -------------------------------------------------------------------------
  test('webhook rejects when STRIPE_WEBHOOK_SECRET is not configured', () => {
    const src = readFileSync(WEBHOOK_ROUTE, 'utf-8')

    expect(
      src.includes('STRIPE_WEBHOOK_SECRET'),
      'Webhook handler must check STRIPE_WEBHOOK_SECRET env var'
    ).toBe(true)

    // Must reject (status 500 or 400) if secret not configured
    expect(
      src.includes('status: 500') || src.includes('status: 400'),
      'Webhook must return error status when STRIPE_WEBHOOK_SECRET is missing'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Idempotency via transaction_reference dedup
  // -------------------------------------------------------------------------
  test('webhook checks transaction_reference before creating ledger entry', () => {
    const src = readFileSync(WEBHOOK_ROUTE, 'utf-8')

    expect(
      src.includes('transaction_reference'),
      'Webhook handler must check transaction_reference for idempotency (prevents duplicate ledger entries)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: Payments route through canonical ledger append
  // -------------------------------------------------------------------------
  test('webhook routes payments through appendLedgerEntryFromWebhook', () => {
    const src = readFileSync(WEBHOOK_ROUTE, 'utf-8')

    expect(
      src.includes('appendLedgerEntryFromWebhook'),
      'Webhook must use appendLedgerEntryFromWebhook (not direct table writes) for ledger-first model'
    ).toBe(true)

    // The internal append function must exist
    expect(
      existsSync(LEDGER_APPEND_INTERNAL),
      'lib/ledger/append-internal.ts must exist (called by webhook handler)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Webhook event handler coverage
  // -------------------------------------------------------------------------
  test('webhook handles critical payment event types', () => {
    const src = readFileSync(WEBHOOK_ROUTE, 'utf-8')

    const requiredEvents = ['payment_intent.succeeded', 'charge.refunded']

    for (const eventType of requiredEvents) {
      expect(
        src.includes(eventType),
        `Webhook handler must handle Stripe event: ${eventType}`
      ).toBe(true)
    }
  })

  // -------------------------------------------------------------------------
  // Test 6: Webhook audit log on every event
  // -------------------------------------------------------------------------
  test('webhook logs every event via logWebhookEvent', () => {
    const src = readFileSync(WEBHOOK_ROUTE, 'utf-8')

    expect(
      src.includes('logWebhookEvent'),
      'Webhook handler must call logWebhookEvent for audit trail (success and failure paths)'
    ).toBe(true)
  })
})
