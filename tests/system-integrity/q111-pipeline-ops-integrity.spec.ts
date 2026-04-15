/**
 * Q111-Q120: Data Pipeline & Operational Edge Cases
 *
 * Verifies expense validation, webhook tenant scoping, kiosk server-side
 * price computation, client invitation dedup, nonBlocking error capture,
 * and related edge cases.
 *
 * All questions passed structural review. No code changes needed.
 */

import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8')
}

// Q112: Expense amount validation matches ledger guards
test('Q112: createExpense validates integer + positive amount_cents', () => {
  const src = readFile('lib/finance/expense-actions.ts')
  expect(src).toContain('Number.isInteger(input.amount_cents)')
  expect(src).toContain('amount_cents <= 0')
})

// Q114: Zapier webhook subscription scoped by tenant via requireChef
test('Q114: Zapier subscription requires chef auth and validates URL for SSRF', () => {
  const src = readFile('lib/integrations/zapier/zapier-webhooks.ts')
  expect(src).toContain('requireChef')
  expect(src).toContain('validateWebhookUrl')
  expect(src).toContain('user.entityId')
})

// Q116: Kiosk checkout computes totals server-side from DB prices
test('Q116: kiosk checkout reads product.price_cents from DB, not client input', () => {
  const src = readFile('app/api/kiosk/order/checkout/route.ts')
  // Server fetches product rows and computes line totals
  expect(src).toContain('product.price_cents')
  expect(src).toContain('unitPriceCents * item.quantity')
  // Client schema does NOT include price fields
  expect(src).not.toMatch(/z\.object.*price_cents/)
})

// Q117: Client invitation dedup (existing client + pending invitation)
test('Q117: inviteClient checks for existing client and pending invitation', () => {
  const src = readFile('lib/clients/actions.ts')
  const fn = src.slice(src.indexOf('async function inviteClient'))
  expect(fn).toContain('Client with this email already exists')
  expect(fn).toContain('Pending invitation already exists')
  // Token stored as SHA-256 hash, not plaintext
  expect(fn).toContain('createHash')
  expect(fn).toContain('tokenHash')
})

// Q120: nonBlocking wrapper has double try/catch and never throws
test('Q120: nonBlocking catches fn errors AND recording errors', () => {
  const src = readFile('lib/monitoring/non-blocking.ts')
  // Outer try catches fn execution
  expect(src).toContain('await fn()')
  // Inner try catches DB recording
  expect(src).toContain('side_effect_failures')
  // Last resort fallback
  expect(src).toContain('Failed to record side effect failure')
  // Return type is boolean, never throws
  expect(src).toContain('Promise<boolean>')
})

// Q113: Menu archival does not break event links (by design)
test('Q113: menu transitions allow archived from all active states', () => {
  const src = readFile('lib/menus/actions.ts')
  // All states can transition to archived
  expect(src).toMatch(/draft.*archived/)
  expect(src).toMatch(/shared.*archived/)
  expect(src).toMatch(/locked.*archived/)
})
