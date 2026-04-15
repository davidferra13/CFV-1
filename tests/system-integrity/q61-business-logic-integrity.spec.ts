/**
 * Q61-Q70: Core Business Logic Integrity
 *
 * Verifies structural safeguards in events, menus, ledger, quotes,
 * inquiries, clients, and Stripe webhook handling.
 *
 * Tests:
 *
 * Q61: Event creation warns on past dates (log, not hard block).
 * Q62: Event FSM has readiness gate engine with hard blocks.
 * Q63: Quote acceptance pre-flight checks expiry before RPC.
 * Q64: Ledger append validates integer, positive, max cap.
 * Q65: Menu sharing/locking requires at least one dish.
 * Q66: Stripe webhook logs amount mismatch warnings.
 * Q67: Inquiry creation validates via Zod schema (client_name required).
 * Q68: Yield-based scaling falls back to guestCount (no div-by-zero).
 * Q69: Client deletion blocked when active events exist.
 * Q70: UpdateEvent uses Zod whitelist (tenant_id/client_id not in schema).
 */

import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8')
}

// Q61: Past-date event creation warning
test('Q61: createEvent logs warning for past-date events', () => {
  const src = readFile('lib/events/actions.ts')
  expect(src).toContain('isPastDate')
  expect(src).toMatch(/past date/i)
})

// Q62: Event FSM has readiness gate engine
test('Q62: transitionEvent evaluates readiness gates before transition', () => {
  const src = readFile('lib/events/transitions.ts')
  expect(src).toContain('evaluateReadinessForTransition')
  expect(src).toContain('hardBlocked')
  expect(src).toContain('Readiness Gate Check')
})

test('Q62b: readiness engine has hard-block anaphylaxis gate', () => {
  const src = readFile('lib/events/readiness.ts')
  expect(src).toContain('allergies_verified')
  expect(src).toContain('isHardBlock')
  expect(src).toContain('deposit_collected')
})

// Q63: Quote acceptance pre-flight checks expiry
test('Q63: acceptQuote checks valid_until before calling RPC', () => {
  const src = readFile('lib/quotes/client-actions.ts')
  expect(src).toContain('valid_until')
  expect(src).toMatch(/expired/i)
  // Also checks status !== 'sent'
  expect(src).toContain("preCheck.status !== 'sent'")
})

// Q64: Ledger append validates amount
test('Q64: appendLedgerEntryInternal validates integer amounts', () => {
  const src = readFile('lib/ledger/append-internal.ts')
  expect(src).toContain('Number.isInteger(input.amount_cents)')
  expect(src).toContain('amount_cents <= 0')
  expect(src).toContain('MAX_ENTRY_CENTS')
})

// Q65: Empty menu sharing guard
test('Q65: transitionMenu blocks sharing/locking menus with no dishes', () => {
  const src = readFile('lib/menus/actions.ts')
  expect(src).toContain('menu_dishes')
  expect(src).toMatch(/no dishes/i)
  // Must check before status update, not after
  const dishCheckIdx = src.indexOf('menu_dishes')
  const statusUpdateIdx = src.indexOf('status: toStatus')
  expect(dishCheckIdx).toBeLessThan(statusUpdateIdx)
})

// Q66: Stripe amount reconciliation warning
test('Q66: Stripe webhook logs amount mismatch between payment and event pricing', () => {
  const src = readFile('app/api/webhooks/stripe/route.ts')
  expect(src).toContain('Amount mismatch')
  expect(src).toContain('quoted_price_cents')
  expect(src).toContain('deposit_amount_cents')
})

// Q67: Inquiry creation requires client_name via Zod
test('Q67: CreateInquirySchema requires client_name', () => {
  const src = readFile('lib/inquiries/actions.ts')
  expect(src).toMatch(/client_name.*min\(1/)
  expect(src).toContain('CreateInquirySchema.parse')
})

// Q68: Yield scaling uses fallback to prevent division by zero
test('Q68: yield_quantity fallback prevents division by zero in menu costing', () => {
  const menuActions = readFile('lib/menus/actions.ts')
  // yield_quantity || guestCount ensures never zero
  expect(menuActions).toMatch(/yield_quantity\s*\|\|\s*guestCount/)

  const estimateActions = readFile('lib/menus/estimate-actions.ts')
  expect(estimateActions).toMatch(/yield_quantity\s*\|\|\s*guestCount/)
})

// Q69: Client deletion blocked with active events
test('Q69: deleteClient checks for active events before soft-delete', () => {
  const src = readFile('lib/clients/actions.ts')
  const fn = src.slice(src.indexOf('async function deleteClient'))
  expect(fn).toContain('activeEvents')
  expect(fn).toMatch(/Cannot delete.*active events/i)
  // Soft delete (not hard delete)
  expect(fn).toContain('deleted_at')
  expect(fn).not.toMatch(/\.delete\(\)/)
})

// Q70: UpdateEvent uses Zod whitelist - tenant_id/client_id not updatable
test('Q70: UpdateEventSchema does not allow tenant_id or client_id changes', () => {
  const src = readFile('lib/events/actions.ts')
  // Extract the UpdateEventSchema definition
  const schemaStart = src.indexOf('const UpdateEventSchema')
  const schemaEnd = src.indexOf('})', schemaStart) + 2
  const schema = src.slice(schemaStart, schemaEnd)

  expect(schema).not.toContain('tenant_id')
  expect(schema).not.toContain('client_id')
  // Confirm it's validated via .parse()
  expect(src).toContain('UpdateEventSchema.parse(input)')
})
